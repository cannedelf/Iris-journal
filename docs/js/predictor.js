// 🧬 Baby genetics predictor — pick two parents, see possible children's hair & eyes.
// Uses Sims 2 dominant/recessive logic: each parent carries a visible (dominant) and a
// hidden (recessive) allele; a child gets one from each parent, and the more dominant wins.

import { store } from './store.js';

const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byName = (a, b) => (a.display || a.name || '').toLowerCase().localeCompare((b.display || b.name || '').toLowerCase());

// Lower rank = more dominant. Order of the array also sets keyword-match priority.
const HAIR = [
  { cat: 'Red / ginger', rank: 3, emoji: '🧡', kw: ['ginger', 'red', 'auburn', 'copper'] },
  { cat: 'Blonde', rank: 4, emoji: '💛', kw: ['blond', 'golden', 'yellow', 'fair', 'sandy'] },
  { cat: 'Brown', rank: 2, emoji: '🤎', kw: ['brown', 'brunette', 'chestnut'] },
  { cat: 'Black', rank: 1, emoji: '🖤', kw: ['black', 'dark', 'ebony', 'jet', 'raven', 'coil'] }
];
const EYES = [
  { cat: 'Dark brown', rank: 1, emoji: '🟤', kw: ['dark brown', 'dark warm brown', 'warm dark brown'] },
  { cat: 'Lilac', rank: 7, emoji: '💜', kw: ['lilac', 'violet', 'purple', 'lavender'] },
  { cat: 'Hazel', rank: 3, emoji: '🌰', kw: ['hazel'] },
  { cat: 'Green', rank: 4, emoji: '💚', kw: ['green', 'olive', 'pistachio', 'emerald'] },
  { cat: 'Amber', rank: 2, emoji: '🟠', kw: ['amber'] },
  { cat: 'Grey', rank: 5, emoji: '🩶', kw: ['grey', 'gray'] },
  { cat: 'Blue', rank: 6, emoji: '💙', kw: ['blue'] },
  { cat: 'Brown', rank: 2, emoji: '🟤', kw: ['brown'] }
];

function mapColour(text, table) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const e of table) if (e.kw.some(k => t.includes(k))) return e;
  return null;
}

// The two alleles a parent can pass: [visible, hidden]. Hidden falls back to visible
// when there's no recessive ("none"/"n/a"/blank).
function alleles(genetics, visKey, hidKey, table) {
  const vis = mapColour(genetics[visKey], table);
  if (!vis) return null;
  const hidText = (genetics[hidKey] || '').trim().toLowerCase();
  let hid = mapColour(genetics[hidKey], table);
  if (!hid || !hidText || /none|n\/a|^-+$/.test(hidText)) hid = vis;
  return [vis, hid];
}

function predict(aAll, bAll) {
  const counts = {}, carried = {};
  for (const a of aAll) for (const b of bAll) {
    const exp = a.rank <= b.rank ? a : b;
    const rec = a.rank <= b.rank ? b : a;
    counts[exp.cat] = counts[exp.cat] || { entry: exp, count: 0 };
    counts[exp.cat].count++;
    if (rec.cat !== exp.cat) carried[rec.cat] = rec;
  }
  const results = Object.values(counts)
    .map(c => ({ ...c.entry, pct: c.count / 4 * 100 }))
    .sort((x, y) => y.pct - x.pct || x.rank - y.rank);
  return { results, carried: Object.values(carried) };
}

function geneBlock(title, emoji, res) {
  if (!res) return `<div class="gene-block"><h3>${emoji} ${title}</h3>
    <p class="muted">Add a clear ${title.toLowerCase()} colour in both parents' Genetics to predict this one. 🧬</p></div>`;
  const bars = res.results.map(r => `<div class="gene-row">
    <span class="gene-emoji">${r.emoji}</span><span class="gene-cat">${esc(r.cat)}</span>
    <span class="gene-bar"><span style="width:${r.pct}%"></span></span>
    <span class="gene-pct">${Math.round(r.pct)}%</span></div>`).join('');
  // A little magic note when a recessive surprise (blonde/red/green/lilac…) can actually show.
  const magic = res.results.find(r => r.rank >= 3);
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
  const hair = (() => { const x = alleles(g1, 'hairVisible', 'hairHidden', HAIR), y = alleles(g2, 'hairVisible', 'hairHidden', HAIR); return x && y ? predict(x, y) : null; })();
  const eyes = (() => { const x = alleles(g1, 'eyesVisible', 'eyesHidden', EYES), y = alleles(g2, 'eyesVisible', 'eyesHidden', EYES); return x && y ? predict(x, y) : null; })();
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
