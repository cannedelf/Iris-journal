// One-click backups — your own local copy, just in case. Two flavours:
//   • data backup — just sunnyside.json (instant; the irreplaceable, hand-curated part)
//   • full backup — a .zip of sunnyside.json + every photo, for safe keeping
//
// The ZIP is written here with a tiny dependency-free encoder (store/no-compression)
// so the app stays build-step-free.

import { store } from './store.js';

const enc = new TextEncoder();
const strBytes = (s) => enc.encode(s);
const today = () => new Date().toISOString().slice(0, 10);

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- just the data ----
export function downloadData() {
  const json = JSON.stringify(store.data, null, 2);
  triggerDownload(new Blob([json], { type: 'application/json' }), `sunnyside-backup-${today()}.json`);
}

// ---- CRC32 (needed by the ZIP format) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---- minimal ZIP writer (store method, no compression) ----
// files: [{ name, bytes: Uint8Array }]
export function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = strBytes(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); // local file header sig
    lh.setUint16(4, 20, true);         // version needed
    lh.setUint16(6, 0, true);          // flags
    lh.setUint16(8, 0, true);          // method 0 = store
    lh.setUint16(10, 0, true);         // mod time
    lh.setUint16(12, 0x21, true);      // mod date (1980-01-01)
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), nameBytes, f.bytes);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); // central dir header sig
    ch.setUint16(4, 20, true);         // version made by
    ch.setUint16(6, 20, true);         // version needed
    ch.setUint16(8, 0, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true);
    ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, nameBytes.length, true);
    ch.setUint16(30, 0, true);         // extra len
    ch.setUint16(32, 0, true);         // comment len
    ch.setUint16(34, 0, true);         // disk #
    ch.setUint16(36, 0, true);         // internal attrs
    ch.setUint32(38, 0, true);         // external attrs
    ch.setUint32(42, offset, true);    // offset of local header
    central.push({ header: new Uint8Array(ch.buffer), name: nameBytes });
    offset += 30 + nameBytes.length + size;
  }
  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { chunks.push(c.header, c.name); centralSize += c.header.length + c.name.length; }

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); // end of central dir sig
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, files.length, true);
  eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralStart, true);
  eocd.setUint16(20, 0, true);
  chunks.push(new Uint8Array(eocd.buffer));

  return new Blob(chunks, { type: 'application/zip' });
}

// Read a photo's bytes, whether it's a repo path or an inline data: URL.
async function fetchBytes(src) {
  if (src.startsWith('data:')) {
    const bin = atob(src.split(',')[1] || '');
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  const res = await fetch('./' + src.replace(/^\.?\//, '') + '?_=' + Date.now());
  if (!res.ok) throw new Error(`fetch ${src} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// ---- everything: data + photos, zipped ----
export async function downloadFull(onProgress) {
  const files = [{ name: 'sunnyside.json', bytes: strBytes(JSON.stringify(store.data, null, 2)) }];

  const srcs = new Set();
  [...(store.data.people || []), ...(store.data.pets || [])].forEach(n => {
    if (n.photo) srcs.add(n.photo);
    (n.gallery || []).forEach(g => g.src && srcs.add(g.src));
  });
  const list = [...srcs];

  let done = 0, failed = 0, inline = 0;
  for (const src of list) {
    try {
      const bytes = await fetchBytes(src);
      const name = src.startsWith('data:') ? `photos/inline-${inline++}.bin` : src.replace(/^\.?\//, '');
      files.push({ name, bytes });
    } catch (_) { failed++; }
    done++;
    onProgress && onProgress(done, list.length, failed);
  }

  triggerDownload(buildZip(files), `sunnyside-backup-${today()}.zip`);
  return { photos: list.length, saved: list.length - failed, failed };
}
