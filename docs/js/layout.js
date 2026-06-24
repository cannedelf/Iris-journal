// 🏠 Cottage Extension Planner — a per-household floor-plan tool.
// Each household has a settable lot size (in tiles) and a list of polygon rooms.
// Rooms snap to grid points; edges between non-aligned points give diagonal walls,
// so L-shapes, bay windows and octagons all work. Desktop / mouse only.

import { store } from './store.js';

const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TILE = 22; // pixels per tile
const ROOM_COLOURS = ['#e6a91f', '#d97aa0', '#6f9e5e', '#5aa6d0', '#b07d52', '#9a7bc8', '#cf6b5a', '#5bb0a8'];
const STATUSES = [{ key: 'existing', label: 'Existing' }, { key: 'planned', label: 'Planned' }, { key: 'building', label: 'Building 🔨' }];

let S = null;            // session: { h, wrap, editor, sel }
let saveTimer = null;

const snap = (v) => Math.round(v);
const clampX = (x) => Math.max(0, Math.min(S.h.layout.cols, x));
const clampY = (y) => Math.max(0, Math.min(S.h.layout.rows, y));

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { store.commit(`Update ${S.h.name} layout`); }, 600);
}

function evtToTile(e) {
  const svg = S.wrap.querySelector('svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [loc.x, loc.y];
}

function draw() {
  const { cols, rows, rooms } = S.h.layout;
  let grid = '';
  for (let x = 0; x <= cols; x++) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${rows}" class="lay-grid"/>`;
  for (let y = 0; y <= rows; y++) grid += `<line x1="0" y1="${y}" x2="${cols}" y2="${y}" class="lay-grid"/>`;
  const roomsSvg = rooms.map((r, i) => {
    const pts = r.points.map(p => p.join(',')).join(' ');
    const sel = i === S.sel;
    const cx = r.points.reduce((a, p) => a + p[0], 0) / r.points.length;
    const cy = r.points.reduce((a, p) => a + p[1], 0) / r.points.length;
    const forName = r.forId ? (store.person(r.forId)?.display || store.person(r.forId)?.name || '') : '';
    const label = r.name ? `<text x="${cx}" y="${cy}" class="lay-label" font-size="1">${esc(r.name)}${forName ? ` <tspan font-size="0.8" fill="#7c6f5e">(${esc(forName)})</tspan>` : ''}</text>` : '';
    const handles = sel ? r.points.map((p, vi) => `<circle cx="${p[0]}" cy="${p[1]}" r="0.42" class="lay-handle" data-room="${i}" data-vert="${vi}"/>`).join('') : '';
    return `<polygon points="${pts}" class="lay-room ${r.status || 'existing'}${sel ? ' sel' : ''}" data-room="${i}" style="--rc:${r.colour || '#e6a91f'}"/>${label}${handles}`;
  }).join('');
  S.wrap.innerHTML = `<svg class="layout-svg" width="${cols * TILE}" height="${rows * TILE}" viewBox="0 0 ${cols} ${rows}">
    <rect class="lay-bg" x="0" y="0" width="${cols}" height="${rows}"/>
    ${grid}
    <rect class="lay-lot-border" x="0" y="0" width="${cols}" height="${rows}"/>
    ${roomsSvg}
  </svg>`;
}

function wire() {
  const svg = S.wrap.querySelector('svg');
  svg.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('lay-bg') || e.target.classList.contains('lay-grid')) {
      if (S.sel !== null) { S.sel = null; draw(); wire(); renderEditor(); }
    }
  });
  svg.querySelectorAll('.lay-room').forEach(poly => {
    poly.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const i = Number(poly.dataset.room);
      if (S.sel !== i) { S.sel = i; draw(); wire(); renderEditor(); }
      startRoomDrag(i, e);
    });
    poly.addEventListener('dblclick', (e) => addCornerNearestEdge(Number(poly.dataset.room), evtToTile(e)));
  });
  svg.querySelectorAll('.lay-handle').forEach(hd => {
    hd.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); startVertexDrag(Number(hd.dataset.room), Number(hd.dataset.vert)); });
    hd.addEventListener('contextmenu', (e) => { e.preventDefault(); deleteVertex(Number(hd.dataset.room), Number(hd.dataset.vert)); });
  });
}

function startRoomDrag(i, e) {
  const start = evtToTile(e);
  const orig = S.h.layout.rooms[i].points.map(p => p.slice());
  const move = (ev) => {
    const now = evtToTile(ev);
    let dx = snap(now[0] - start[0]), dy = snap(now[1] - start[1]);
    const xs = orig.map(p => p[0]), ys = orig.map(p => p[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    dx = Math.max(-minx, Math.min(S.h.layout.cols - maxx, dx));
    dy = Math.max(-miny, Math.min(S.h.layout.rows - maxy, dy));
    S.h.layout.rooms[i].points = orig.map(p => [p[0] + dx, p[1] + dy]);
    draw();
  };
  const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); wire(); save(); };
  document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
}

function startVertexDrag(i, vi) {
  const move = (ev) => {
    const [x, y] = evtToTile(ev);
    S.h.layout.rooms[i].points[vi] = [clampX(snap(x)), clampY(snap(y))];
    draw();
  };
  const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); wire(); save(); };
  document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
}

function deleteVertex(i, vi) {
  const r = S.h.layout.rooms[i];
  if (r.points.length <= 3) return;
  r.points.splice(vi, 1);
  draw(); wire(); save();
}

// Insert a corner on whichever edge is nearest the click — lands on the edge so you
// can then drag it out into a diagonal.
function addCornerNearestEdge(i, pt) {
  const pts = S.h.layout.rooms[i].points;
  const projOnSeg = (p, a, b) => {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const len2 = vx * vx + vy * vy || 1;
    let t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    return [a[0] + t * vx, a[1] + t * vy];
  };
  let best = 0, bestD = Infinity, bestProj = null;
  for (let k = 0; k < pts.length; k++) {
    const proj = projOnSeg(pt, pts[k], pts[(k + 1) % pts.length]);
    const d = (proj[0] - pt[0]) ** 2 + (proj[1] - pt[1]) ** 2;
    if (d < bestD) { bestD = d; best = k; bestProj = proj; }
  }
  pts.splice(best + 1, 0, [clampX(snap(bestProj[0])), clampY(snap(bestProj[1]))]);
  S.sel = i; draw(); wire(); save();
}

function addRoom() {
  const L = S.h.layout;
  const w = Math.min(6, L.cols), h = Math.min(5, L.rows);
  L.rooms.push({
    points: [[1, 1], [1 + w, 1], [1 + w, 1 + h], [1, 1 + h]],
    name: 'New room', colour: ROOM_COLOURS[L.rooms.length % ROOM_COLOURS.length], status: 'planned'
  });
  S.sel = L.rooms.length - 1;
  draw(); wire(); renderEditor(); save();
}

function clampRooms() {
  const L = S.h.layout;
  L.rooms.forEach(r => r.points = r.points.map(p => [Math.max(0, Math.min(L.cols, p[0])), Math.max(0, Math.min(L.rows, p[1]))]));
}

function renderEditor() {
  const ed = S.editor;
  const r = S.sel != null ? S.h.layout.rooms[S.sel] : null;
  if (!r) {
    const n = S.h.layout.rooms.length;
    ed.innerHTML = `<p class="muted">Click a room to edit it, or <b>➕ Add room</b> to start.</p>
      <p class="muted" style="font-size:12px">${n} room${n === 1 ? '' : 's'} planned.</p>`;
    return;
  }
  const peopleOpts = store.data.people.filter(p => p.household === S.h.id && p.kind !== 'ancestor')
    .map(p => `<option value="${p.id}" ${p.id === r.forId ? 'selected' : ''}>${esc(p.display || p.name)}</option>`).join('');
  ed.innerHTML = `<h4>🛏️ Room</h4>
    <label class="frow"><span>Name</span><input id="rName" value="${esc(r.name || '')}"></label>
    <label class="frow"><span>For</span><select id="rFor"><option value="">— anyone —</option>${peopleOpts}</select></label>
    <label class="frow"><span>Status</span><select id="rStatus">${STATUSES.map(s => `<option value="${s.key}" ${s.key === (r.status || 'existing') ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
    <div class="lay-swatches">${ROOM_COLOURS.map(c => `<button type="button" class="lay-swatch${c === r.colour ? ' on' : ''}" style="background:${c}" data-c="${c}"></button>`).join('')}</div>
    <p class="muted" style="font-size:12px">Double-click an edge to add a corner (then drag it for a diagonal). Right-click a corner to delete it.</p>
    <button type="button" class="danger" id="rDelete">🗑 Delete room</button>`;
  ed.querySelector('#rName').addEventListener('input', (e) => { r.name = e.target.value; draw(); });
  ed.querySelector('#rName').addEventListener('change', save);
  ed.querySelector('#rFor').addEventListener('change', (e) => { r.forId = e.target.value || undefined; draw(); save(); });
  ed.querySelector('#rStatus').addEventListener('change', (e) => { r.status = e.target.value; draw(); wire(); save(); });
  ed.querySelectorAll('.lay-swatch').forEach(b => b.addEventListener('click', () => { r.colour = b.dataset.c; draw(); wire(); renderEditor(); save(); }));
  ed.querySelector('#rDelete').addEventListener('click', () => { S.h.layout.rooms.splice(S.sel, 1); S.sel = null; draw(); wire(); renderEditor(); save(); });
}

export function renderLayout(container, householdId) {
  const h = store.household(householdId);
  if (!h) { container.innerHTML = '<div class="extras-view"><p class="muted">Household not found.</p></div>'; return; }
  h.layout = h.layout || { cols: 20, rows: 20, rooms: [] };
  h.layout.rooms = h.layout.rooms || [];

  container.innerHTML = `<div class="layout-view">
    <div class="layout-bar">
      <button class="tool" id="layBack">← Back</button>
      <strong>${esc(h.emoji || '🏠')} ${esc(h.name)} — floor plan</strong>
      <span class="lay-lot">Lot: <input id="layCols" type="number" min="4" max="80" value="${h.layout.cols}"> × <input id="layRows" type="number" min="4" max="80" value="${h.layout.rows}"> tiles</span>
      <button class="tool primary" id="layAdd">➕ Add room</button>
    </div>
    <div class="layout-stage">
      <div class="layout-canvas-wrap" id="layWrap"></div>
      <aside class="layout-editor" id="layEditor"></aside>
    </div>
  </div>`;

  S = { h, wrap: container.querySelector('#layWrap'), editor: container.querySelector('#layEditor'), sel: null };
  draw(); wire(); renderEditor();

  container.querySelector('#layBack').addEventListener('click', () => window.dispatchEvent(new CustomEvent('close-layout', { detail: { id: householdId } })));
  container.querySelector('#layAdd').addEventListener('click', addRoom);
  const setLot = () => {
    h.layout.cols = Math.max(4, Math.min(80, Number(container.querySelector('#layCols').value) || 20));
    h.layout.rows = Math.max(4, Math.min(80, Number(container.querySelector('#layRows').value) || 20));
    clampRooms(); draw(); wire(); save();
  };
  container.querySelector('#layCols').addEventListener('change', setLot);
  container.querySelector('#layRows').addEventListener('change', setLot);
}
