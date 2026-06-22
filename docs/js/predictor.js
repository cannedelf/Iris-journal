// 🧬 Baby genetics predictor — pick two parents, see possible children's hair & eyes.
// Uses Sims 2 dominant/recessive logic: each parent carries a visible (dominant) and a
// hidden (recessive) allele; a child gets one from each parent, and the more dominant wins.

import { store } from './store.js';

const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byName = (a, b) => (a.display || a.name || '').toLowerCase().localeCompare((b.display || b.name || '').toLowerCase());

// Lower rank = more dominant. Colours that share a rank are equally dominant, so when two
// of them meet it's a 50/50 coin flip (the real Sims 2 hair rule: Black & Brown are both
// dominant, Blonde & Red both recessive). Array order also sets keyword-match priority.
const HAIR = [
  { cat: 'Red / ginger', rank: 2, rec: true, emoji: '🧡', kw: ['ginger', 'red', 'auburn', 'copper'] },
  { cat: 'Blonde', rank: 2, rec: true, emoji: '💛', kw: ['blond', 'golden', 'yellow', 'fair', 'sandy'] },
  { cat: 'Brown', rank: 1, rec: false, emoji: '🤎', kw: ['brown', 'brunette', 'chestnut'] },
  { cat: 'Black', rank: 1, rec: false, emoji: '🖤', kw: ['black', 'dark', 'ebony', 'jet', 'raven', 'coil'] }
];
// Eyes are two tiers too (dominant vs recessive); equal colours give 50/50. The colour list
// and its tiers come from meta.eyeColours in the data, so the predictor matches your game exactly.
function eyeEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes('alien')) return '👽';
  if (n.includes('purple') || n.includes('lilac')) return '💜';
  if (n.includes('amber')) return '🟠';
  if (n.includes('aqua')) return '🩵';
  if (n.includes('grey') || n.includes('gray')) return '🩶';
  if (n.includes('green') || n.includes('olive')) return '💚';
  if (n.includes('light blue')) return '🩵';
  if (n.includes('blue')) return '💙';
  if (n.includes('brown')) return '🟤';
  if (n.includes('black')) return '⚫';
  return '👁️';
}
function eyesTable() {
  const list = (store.data.meta && store.data.meta.eyeColours) || [];
  return list
    .map(c => ({ cat: c.name, rank: c.dominant ? 1 : 2, rec: !c.dominant, emoji: eyeEmoji(c.name) }))
    .sort((a, b) => b.cat.length - a.cat.length); // match longest names first ("Hazel Green" before "Green")
}
function mapEye(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  const table = eyesTable();
  return table.find(e => e.cat.toLowerCase() === t) || table.find(e => t.includes(e.cat.toLowerCase())) || null;
}

function mapColour(text, table) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const e of table) if (e.kw.some(k => t.includes(k))) return e;
  return null;
}

// The two alleles a parent can pass: [visible, hidden]. Hidden falls back to visible
// when there's no recessive ("none"/"n/a"/blank). `mapper` turns a field into a colour.
function alleles(genetics, visKey, hidKey, mapper) {
  const vis = mapper(genetics[visKey]);
  if (!vis) return null;
  const hidText = (genetics[hidKey] || '').trim().toLowerCase();
  let hid = mapper(genetics[hidKey]);
  if (!hid || !hidText || /none|n\/a|^-+$/.test(hidText)) hid = vis;
  return [vis, hid];
}

function predict(aAll, bAll) {
  const counts = {}, carried = {};
  const add = (e, p) => { counts[e.cat] = counts[e.cat] || { entry: e, mass: 0 }; counts[e.cat].mass += p; };
  const P = 0.25; // each of the 4 allele combinations is equally likely
  for (const a of aAll) for (const b of bAll) {
    if (a.rank < b.rank) { add(a, P); if (b.cat !== a.cat) carried[b.cat] = b; }
    else if (b.rank < a.rank) { add(b, P); if (a.cat !== b.cat) carried[a.cat] = a; }
    else if (a.cat === b.cat) { add(a, P); }
    else { add(a, P / 2); add(b, P / 2); carried[a.cat] = a; carried[b.cat] = b; } // equal dominance → 50/50
  }
  const results = Object.values(counts)
    .map(c => ({ ...c.entry, pct: c.mass * 100 }))
    .sort((x, y) => y.pct - x.pct || x.rank - y.rank);
  const guaranteed = new Set(results.filter(r => r.pct >= 100).map(r => r.cat));
  return { results, carried: Object.values(carried).filter(c => !guaranteed.has(c.cat)) };
}

function geneBlock(title, emoji, res) {
  if (!res) return `<div class="gene-block"><h3>${emoji} ${title}</h3>
    <p class="muted">Add a clear ${title.toLowerCase()} colour in both parents' Genetics to predict this one. 🧬</p></div>`;
  const bars = res.results.map(r => `<div class="gene-row">
    <span class="gene-emoji">${r.emoji}</span><span class="gene-cat">${esc(r.cat)}</span>
    <span class="gene-bar"><span style="width:${r.pct}%"></span></span>
    <span class="gene-pct">${Math.round(r.pct)}%</span></div>`).join('');
  // A little magic note when a recessive surprise (blonde/red/green/lilac…) can actually show.
  const magic = res.results.find(r => r.rec);
  const note = magic ? `<p class="gene-magic">✨ A recessive surprise is possible — ${magic.emoji} ${esc(magic.cat)} could show!</p>` : '';
  const carried = res.carried.length
    ? `<p class="carried">🧬 Could secretly carry: ${res.carried.map(c => c.emoji + ' ' + esc(c.cat)).join(', ')}</p>` : '';
  return `<div class="gene-block"><h3>${emoji} ${title}</h3>${bars}${note}${carried}</div>`;
}

function frecklesNote(g1, g2) {
  const has = (g) => /yes/i.test(g.freckles || '');
  return (has(g1) || has(g2))
    ? 'Freckles are possible 🟤 — they\'re dominant in Sims 2, so even one freckled parent can pass them on!'
    : 'Freckles unlikely — neither parent has them.';
}

function renderResults(el, id1, id2) {
  const a = store.person(id1), b = store.person(id2);
  if (!a || !b) { el.innerHTML = ''; return; }
  if (a.id === b.id) { el.innerHTML = `<p class="muted pred-pair">Pick two different Sims! 🌻</p>`; return; }
  const g1 = a.genetics || {}, g2 = b.genetics || {};
  const mapHair = (t) => mapColour(t, HAIR);
  const hair = (() => { const x = alleles(g1, 'hairVisible', 'hairHidden', mapHair), y = alleles(g2, 'hairVisible', 'hairHidden', mapHair); return x && y ? predict(x, y) : null; })();
  const eyes = (() => { const x = alleles(g1, 'eyesVisible', 'eyesHidden', mapEye), y = alleles(g2, 'eyesVisible', 'eyesHidden', mapEye); return x && y ? predict(x, y) : null; })();
  el.innerHTML = `
    <p class="pred-pair">${a.emoji || ''} ${esc(a.display || a.name)} <span>+</span> ${b.emoji || ''} ${esc(b.display || b.name)}</p>
    ${geneBlock('Hair', '💇', hair)}
    ${geneBlock('Eyes', '👁️', eyes)}
    <div class="gene-block"><h3>✨ Other traits</h3>
      <p>${frecklesNote(g1, g2)}</p>
      <p class="muted">Skin tone usually <em>blends</em> between the two parents — ${esc(g1.skin || '?')} &amp; ${esc(g2.skin || '?')}.</p>
    </div>`;
}

export function renderPredictor(container) {
  container.innerHTML = `<div class="predictor">
    <h2>🧬 Baby Genetics Predictor</h2>
    <p class="pred-intro">Pick two parents to see what their children could look like — Sims 2 style!
      Dominant genes show; recessive ones can hide and surprise you. 💫</p>
    <div class="pred-pickers">
      <label>Parent 1<select id="pred1"></select></label>
      <span class="pred-plus">💕</span>
      <label>Parent 2<select id="pred2"></select></label>
    </div>
    <div id="predResults" class="pred-results"></div>
  </div>`;
  const people = [...store.data.people].sort(byName);
  const def1 = store.person('kareem') ? 'kareem' : (people[0] && people[0].id);
  const def2 = store.person('iris') ? 'iris' : (people[1] && people[1].id);
  const opts = (sel) => people.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${(p.emoji || '')} ${esc(p.display || p.name)}</option>`).join('');
  const s1 = container.querySelector('#pred1'), s2 = container.querySelector('#pred2');
  s1.innerHTML = opts(def1); s2.innerHTML = opts(def2);
  const run = () => renderResults(container.querySelector('#predResults'), s1.value, s2.value);
  s1.addEventListener('change', run); s2.addEventListener('change', run);
  run();
}
