// Extra views: 👶 Baby Name Bank, 🏘️ Community Lots, 📊 Stats. All read from the store.

import { store } from './store.js';

const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- 👶 Baby Name Bank ----------
export function renderNames(container) {
  container.innerHTML = '';
  const view = document.createElement('div');
  view.className = 'extras-view';
  view.innerHTML = `<h2 class="extras-h">👶 Baby Name Bank</h2>
    <p class="extras-sub">The <b>NEXT</b> available name is highlighted for each family. Tick one off when a baby's born!</p>`;

  (store.data.babyNames || []).forEach(g => {
    const fam = store.family(g.family) || {};
    const col = (arr, title) => {
      let nextDone = false;
      const items = (arr || []).map(nm => {
        const isNext = !nm.used && !nextDone; if (isNext) nextDone = true;
        return `<li class="name-item ${nm.used ? 'used' : ''} ${isNext ? 'next' : ''}">
          <button class="name-tick" data-fam="${esc(g.family)}" data-col="${title.toLowerCase()}" data-name="${esc(nm.name)}" title="Mark used / unused">${nm.used ? '✅' : '⬜'}</button>
          <span class="name-emoji">${nm.emoji || ''}</span>
          <span class="name-text">${esc(nm.name)}</span>
          ${isNext ? '<span class="name-next">NEXT</span>' : ''}
          ${nm.note ? `<span class="name-note">${esc(nm.note)}</span>` : ''}
        </li>`;
      }).join('');
      return `<div class="name-col"><h4>${title}</h4><ul>${items}</ul></div>`;
    };
    const sec = document.createElement('div');
    sec.className = 'name-family';
    sec.style.borderColor = fam.colour || 'var(--line)';
    sec.innerHTML = `<h3>${esc(g.label)}</h3><div class="name-cols">${col(g.girls, 'Girls')}${col(g.boys, 'Boys')}</div>`;
    view.appendChild(sec);
  });
  container.appendChild(view);

  view.querySelectorAll('.name-tick').forEach(b => b.addEventListener('click', async () => {
    const g = store.data.babyNames.find(x => x.family === b.dataset.fam);
    const list = g[b.dataset.col] || [];
    const nm = list.find(x => x.name === b.dataset.name);
    if (!nm) return;
    nm.used = !nm.used;
    await store.commit('Update baby names');
    window.dispatchEvent(new CustomEvent('data-updated'));
  }));
}

// ---------- 🏘️ Community Lots ----------
function lotStatusEmoji(status) {
  const s = (status || '').toLowerCase();
  if (/not built/.test(s)) return '⬜';
  if (/revamp|rebuild|fix|needs/.test(s)) return '🔧';
  if (/becoming|progress|building/.test(s)) return '🔄';
  if (/open|ready|done|complete/.test(s)) return '✅';
  return '🏠';
}
export function renderLots(container) {
  container.innerHTML = '';
  const view = document.createElement('div');
  view.className = 'extras-view';
  view.innerHTML = `<h2 class="extras-h">🏘️ Community Lots</h2>
    <p class="extras-sub">Sunnyside's community lots and their build status.</p>`;
  const grid = document.createElement('div');
  grid.className = 'lots-grid';
  (store.data.lots || []).forEach((l, idx) => {
    const card = document.createElement('div');
    card.className = 'lot-card';
    card.innerHTML = `<button class="hh-edit" data-edit-lot="${idx}" title="Edit lot">✎</button>
      <h3>${l.emoji || '🏠'} ${esc(l.name)}</h3>
      <p class="lot-status">${lotStatusEmoji(l.status)} ${esc(l.status || '')}</p>
      <p class="lot-notes">${esc(l.notes || '')}</p>`;
    card.querySelector('[data-edit-lot]').addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('open-lot', { detail: { index: idx } }));
    });
    grid.appendChild(card);
  });
  if (!(store.data.lots || []).length) grid.innerHTML = '<p class="muted">No lots yet — add one from the ➕ Add menu.</p>';
  view.appendChild(grid);
  container.appendChild(view);
}

// ---------- 📊 Stats ----------
export function renderStats(container) {
  const P = store.data.people, PETS = store.data.pets || [];
  // Sims that only ever existed in CAS — e.g. the alien P.T. 83 used for an
  // abduction, or genetic-reference Sims — aren't real residents, so we leave
  // them out of every count. (Ancestors are a separate, deliberate category.)
  const casOnly = (p) => p.kind !== 'ancestor' && p.cas;
  const people = P.filter(p => !casOnly(p));
  const sims = people.filter(p => p.kind !== 'ancestor');
  const ancestors = people.filter(p => p.kind === 'ancestor');
  const playable = sims.filter(p => p.family !== 'townie');
  const townies = sims.filter(p => p.family === 'townie');

  const tally = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
  const petBy = tally(PETS, p => p.species || 'Other');
  const asp = tally(playable, p => p.aspiration);
  const signs = tally(sims, p => p.starSign);
  const topSign = Object.entries(signs).sort((a, b) => b[1] - a[1])[0];

  const persKeys = ['neat', 'outgoing', 'active', 'playful', 'nice'];
  const persAvg = persKeys.map(k => {
    const v = sims.map(p => p.personality && p.personality[k]).filter(x => typeof x === 'number');
    return [k, v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : 0];
  });

  const skillKeys = ['cooking', 'mechanical', 'charisma', 'body', 'logic', 'creativity', 'cleaning'];
  let totalSkill = 0, mostSkilled = null, top = -1;
  sims.forEach(p => { const t = skillKeys.reduce((a, k) => a + ((p.skills && p.skills[k]) || 0), 0); totalSkill += t; if (t > top) { top = t; mostSkilled = p; } });
  const totalMoments = [...people, ...PETS].reduce((a, p) => a + ((p.moments || []).length), 0);
  const cats = petBy['Cat'] || 0, dogs = petBy['Dog'] || 0;
  const rotation = (store.data.meta && store.data.meta.rotation) || 1;

  // A Sim was "born in town" only if one of their parents is a real played
  // resident (not a CAS founder/ancestor). This keeps the founders — who have
  // ancestor parents — out of the birth count.
  const playedParent = (p) => (p.parents || []).some(pid => { const par = store.person(pid); return par && !par.cas; });

  // Lifespans
  const bornR = (p) => p.cas ? 1 : p.bornRotation;
  const lived = (p) => { const b = bornR(p); return b ? ((p.diedRotation || rotation) - b + 1) : null; };
  const withLife = sims.filter(p => bornR(p));
  // "Longest-lived" is a tie between all the founders (everyone arrived R1), so
  // a manually-pinned ⭐ Town Elder wins when one is set on a Sim's profile.
  const elder = sims.find(p => p.townElder);
  const longest = elder ? { p: elder, n: lived(elder), pinned: true }
    : withLife.map(p => ({ p, n: lived(p) })).sort((a, b) => b.n - a.n)[0];
  const living = withLife.filter(p => !p.diedRotation);
  const oldestLiving = (elder && !elder.diedRotation) ? { p: elder, n: lived(elder), pinned: true }
    : living.map(p => ({ p, n: lived(p) })).sort((a, b) => b.n - a.n)[0];
  const firstResident = withLife.filter(p => !p.cas).sort((a, b) => (a.bornRotation - b.bornRotation) || ((a.bornDay || 0) - (b.bornDay || 0)))[0];
  const births = sims.filter(p => p.bornRotation && playedParent(p)).length;
  const deaths = sims.filter(p => p.diedRotation).length;

  // Timeline of arrivals/births and deaths
  const events = [];
  sims.forEach(p => {
    if (p.bornRotation) { const b = playedParent(p); events.push({ r: p.bornRotation, d: p.bornDay || 0, emoji: b ? '👶' : '➡️', text: `${p.display || p.name} ${b ? 'born' : 'arrived'}` }); }
    if (p.diedRotation) events.push({ r: p.diedRotation, d: p.diedDay || 0, emoji: '🕊️', text: `${p.display || p.name} died${p.causeOfDeath ? ' — ' + p.causeOfDeath : ''}` });
  });
  events.sort((a, b) => a.r - b.r || a.d - b.d);
  const timelineHtml = events.length
    ? `<div class="timeline">${events.map(e => `<div class="tl-row"><span class="tl-when">R${e.r}${e.d ? ' D' + e.d : ''}</span><span>${e.emoji} ${esc(e.text)}</span></div>`).join('')}</div>`
    : '<p class="muted">No arrivals or deaths logged yet — add Lifespan dates on a Sim\'s profile.</p>';

  const distRow = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<div class="stat-dist-row"><span>${esc(k)}</span><b>${v}</b></div>`).join('') || '<span class="muted">—</span>';

  const card = (title, body) => `<div class="stat-card"><h3>${title}</h3>${body}</div>`;

  container.innerHTML = `<div class="extras-view"><h2 class="extras-h">📊 Sunnyside Stats</h2>
    <div class="stats-grid">
      ${card('🌳 Population', `<p class="stat-big">${sims.length}</p>
        <p class="stat-sub">${playable.length} playable · ${townies.length} townies · ${ancestors.length} ancestors</p>`)}
      ${card('🐾 Pets', `<p class="stat-big">${PETS.length}</p>
        <p class="stat-sub">${distRow(petBy)}</p>`)}
      ${card('🐱 vs 🐕', `<p class="stat-big">${cats} : ${dogs}</p><p class="stat-sub">cats : dogs</p>`)}
      ${card('✨ Aspirations', distRow(asp))}
      ${card('⭐ Most common star sign', topSign ? `<p class="stat-big">${esc(topSign[0])}</p><p class="stat-sub">${topSign[1]} Sims</p>` : '—')}
      ${card('🧠 Average personality', persAvg.map(([k, v]) =>
        `<div class="stat-dist-row"><span>${k[0].toUpperCase() + k.slice(1)}</span><b>${v.toFixed(1)}</b></div>`).join(''))}
      ${card('📚 Skill points', `<p class="stat-big">${totalSkill}</p>
        <p class="stat-sub">most skilled: ${mostSkilled ? esc(mostSkilled.display || mostSkilled.name) + ' (' + top + ')' : '—'}</p>`)}
      ${card('📖 Moments logged', `<p class="stat-big">${totalMoments}</p>`)}
      ${card('🔄 Rotation', `<p class="stat-big">${rotation}</p>`)}
      ${card('🌱 First resident', firstResident ? `<p class="stat-big">${esc(firstResident.display || firstResident.name)}</p><p class="stat-sub">arrived R${firstResident.bornRotation}${firstResident.bornDay ? ' Day ' + firstResident.bornDay : ''}</p>` : '<span class="muted">add arrival dates</span>')}
      ${card('⏳ Longest-lived', longest ? `<p class="stat-big">${longest.pinned ? '⭐ ' : ''}${esc(longest.p.display || longest.p.name)}</p><p class="stat-sub">${longest.pinned ? 'pinned as Town Elder' : longest.n + ' rotation' + (longest.n === 1 ? '' : 's')}</p>` : '—')}
      ${card('🏡 Longest in Sunnyside', oldestLiving ? `<p class="stat-big">${esc(oldestLiving.p.display || oldestLiving.p.name)}</p><p class="stat-sub">${oldestLiving.n} rotation${oldestLiving.n === 1 ? '' : 's'} &amp; counting</p>` : '—')}
      ${card('👶 Births / 🕊️ Deaths', `<p class="stat-big">${births} / ${deaths}</p>`)}
    </div>
    <h3 class="extras-h" style="margin-top:24px">📜 Sunnyside Timeline</h3>
    ${timelineHtml}
  </div>`;
}
