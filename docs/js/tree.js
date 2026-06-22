// Family tree rendering.
//
// We draw ONE family at a time as a descendant chart: the family's ancestors sit at the
// top (greyed-out origin nodes), their children below, grandchildren below that, and so on.
// Spouses who married in are drawn beside their partner, bordered in THEIR OWN family's
// colour so you can see at a glance who married into whom. Clicking a married-in spouse
// jumps to their own family tab (their ancestors), so genetics make sense across families.

import { store } from './store.js';
import { typeMeta } from './constants.js';

// Colour mode: 'family' (borders by family) or 'type' (borders by occult/life-state).
let colourMode = localStorage.getItem('sunnyside.colourMode') || 'family';
export const getColourMode = () => colourMode;
export function setColourMode(m) { colourMode = m; localStorage.setItem('sunnyside.colourMode', m); }

const BOX_W = 168, BOX_H = 96;
const COUPLE_GAP = 26;      // space between two partners
const SIBLING_GAP = 38;     // space between sibling units
const LEVEL_H = BOX_H + 74; // vertical distance between generations

// Build the forest of "units" for a family. A unit = a primary person + optional partner + child units.
function buildForest(familyId) {
  const primaries = store.data.people.filter(p => p.family === familyId);
  const consumed = new Set();

  const partnerOf = (p) => {
    const pr = (p.partners || [])[0];
    return pr ? store.person(pr.id) : null;
  };
  const partnerMeta = (p) => (p.partners || [])[0] || null;

  function unit(person) {
    consumed.add(person.id);
    const partner = partnerOf(person);
    if (partner && partner.family === familyId) consumed.add(partner.id);
    const kids = store.childrenOf(person.id)
      .filter(c => c.family === familyId && !consumed.has(c.id))
      .map(c => unit(c));
    return { person, partner, partnerMeta: partnerMeta(person), childUnits: kids };
  }

  // Roots: family members with no parents. Process ancestors / parents-of-many first
  // so spouses get consumed as partners rather than spawning duplicate roots.
  const roots = primaries
    .filter(p => !(p.parents || []).length)
    .sort((a, b) => {
      const rank = (x) => (x.kind === 'ancestor' ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return store.childrenOf(b.id).length - store.childrenOf(a.id).length;
    });

  const rootUnits = [];
  for (const p of roots) {
    if (consumed.has(p.id)) continue;
    rootUnits.push(unit(p));
  }
  // Catch any primaries not reached (orphans / data quirks) so nobody is hidden.
  for (const p of primaries) {
    if (!consumed.has(p.id)) rootUnits.push(unit(p));
  }
  return rootUnits;
}

const unitWidth = (u) => BOX_W + (u.partner ? COUPLE_GAP + BOX_W : 0);

function measure(u) {
  const uw = unitWidth(u);
  if (!u.childUnits.length) return (u._w = uw);
  const cw = u.childUnits.reduce((s, c) => s + measure(c), 0) + SIBLING_GAP * (u.childUnits.length - 1);
  return (u._w = Math.max(uw, cw));
}

function place(u, depth, left) {
  const uw = unitWidth(u);
  u.y = depth * LEVEL_H;
  if (!u.childUnits.length) {
    u.cx = left + u._w / 2;
  } else {
    const childrenW = u.childUnits.reduce((s, c) => s + c._w, 0) + SIBLING_GAP * (u.childUnits.length - 1);
    let cstart = left + (u._w - childrenW) / 2;
    for (const c of u.childUnits) { place(c, depth + 1, cstart); cstart += c._w + SIBLING_GAP; }
    const first = u.childUnits[0], last = u.childUnits[u.childUnits.length - 1];
    u.cx = (first.cx + last.cx) / 2;
  }
  u.unitLeft = u.cx - uw / 2;
  u.primaryCx = u.unitLeft + BOX_W / 2; // bloodline connects through the primary
}

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

function nodeBox(person, x, y, asPartner) {
  const fam = store.family(person.family) || { colour: '#a89f94', soft: '#e7e2da' };
  const isAncestor = person.kind === 'ancestor';
  const tMeta = typeMeta(person.type || 'Human');
  const hasType = (person.type || 'Human') !== 'Human';
  // In Type mode the whole card recolours (border + background); ancestors keep their family hue.
  const typeView = colourMode === 'type' && !isAncestor;
  const border = typeView ? tMeta.colour : fam.colour;
  const fill = isAncestor ? '#efece6' : (typeView ? tMeta.soft : fam.soft);
  const faded = typeView && (person.type === 'Ghost'); // deceased fade away gently
  const g = svgEl('g', { class: `node ${isAncestor ? 'ancestor' : ''} ${person.heart ? 'heart' : ''} ${faded ? 'faded' : ''}`, transform: `translate(${x},${y})`, 'data-id': person.id, role: 'button', tabindex: '0' });

  g.appendChild(svgEl('rect', {
    class: 'node-box', x: 0, y: 0, width: BOX_W, height: BOX_H, rx: 16,
    fill, stroke: border,
    'stroke-width': asPartner ? 2.5 : 3, 'stroke-dasharray': isAncestor ? '5 4' : (faded ? '6 4' : 'none')
  }));

  const emoji = svgEl('text', { class: 'node-emoji', x: 16, y: 38, 'font-size': 30 });
  emoji.textContent = person.emoji || '👤';
  g.appendChild(emoji);

  const name = svgEl('text', { class: 'node-name', x: 54, y: 32 });
  name.textContent = person.display || person.name;
  g.appendChild(name);

  const sub = svgEl('text', { class: 'node-sub', x: 54, y: 52 });
  sub.textContent = isAncestor ? 'Ancestor' : (person.aspiration || person.lifeStage || '');
  g.appendChild(sub);

  const foot = svgEl('text', { class: 'node-foot', x: 16, y: 78 });
  foot.textContent = [fam.name, person.starSign].filter(Boolean).join(' · ');
  g.appendChild(foot);

  // Occult / life-state badge (always shown, in either colour mode).
  if (hasType) {
    const bx = BOX_W - 15, by = 16;
    const badge = svgEl('g', { class: 'type-badge' });
    badge.appendChild(svgEl('circle', { cx: bx, cy: by, r: 13, fill: '#fff', stroke: tMeta.colour, 'stroke-width': 2 }));
    const be = svgEl('text', { x: bx, y: by + 5, 'text-anchor': 'middle', 'font-size': 14 });
    be.textContent = tMeta.emoji;
    badge.appendChild(be);
    g.appendChild(badge);
  }

  // Yellow bow club 🎀
  if (person.yellowBow) {
    const yb = svgEl('text', { x: 19, y: 14, 'text-anchor': 'middle', 'font-size': 15 });
    yb.textContent = '🎀';
    g.appendChild(yb);
  }

  // Pets attached to their owner as small chips.
  const pets = store.petsOf(person.id);
  pets.slice(0, 4).forEach((pet, i) => {
    const px = BOX_W - 22 - i * 22, py = BOX_H - 14;
    const pg = svgEl('g', { class: 'pet-chip', 'data-id': pet.id, transform: `translate(${px},${py})` });
    pg.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 13, fill: '#fff', stroke: fam.colour, 'stroke-width': 1.5 }));
    const pe = svgEl('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 15 });
    pe.textContent = pet.emoji || '🐾';
    pg.appendChild(pe);
    g.appendChild(pg);
  });

  return g;
}

function connector(x1, y1, x2, y2) {
  const midY = y1 + (y2 - y1) / 2;
  const p = svgEl('path', {
    class: 'edge',
    d: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`
  });
  return p;
}

function collectExtent(units, acc) {
  for (const u of units) {
    const right = u.unitLeft + unitWidth(u);
    acc.minX = Math.min(acc.minX, u.unitLeft);
    acc.maxX = Math.max(acc.maxX, right);
    acc.maxY = Math.max(acc.maxY, u.y + BOX_H);
    collectExtent(u.childUnits, acc);
  }
}

function drawUnits(units, layer) {
  for (const u of units) {
    // Primary box
    layer.appendChild(nodeBox(u.person, u.unitLeft, u.y, false));
    // Partner box + marriage connector
    if (u.partner) {
      const px = u.unitLeft + BOX_W + COUPLE_GAP;
      layer.appendChild(nodeBox(u.partner, px, u.y, true));
      const my = u.y + BOX_H / 2;
      const status = (u.partnerMeta && u.partnerMeta.status) || '';
      const wed = /engaged|married/i.test(status);
      layer.appendChild(svgEl('line', {
        class: 'marriage' + (wed ? ' strong' : ''), x1: u.unitLeft + BOX_W, y1: my, x2: px, y2: my
      }));
      const heart = svgEl('text', { class: 'marriage-mark', x: u.cx, y: my - 8, 'text-anchor': 'middle' });
      heart.textContent = /engaged|married/i.test(status) ? '💍' : (/love|crush|romantic/i.test(status) ? '💕' : '·');
      layer.appendChild(heart);
    }
    // Edges down to children. Only descend from the COUPLE midpoint when the displayed
    // partner is genuinely the child's other parent. Otherwise the bloodline drops from
    // the actual parent's own box, so e.g. Cassian doesn't look like Clara's child when
    // his real other parent is P.T. 83.
    for (const c of u.childUnits) {
      const partnerIsCoParent = u.partner && (c.person.parents || []).includes(u.partner.id);
      const startX = partnerIsCoParent ? u.cx : u.primaryCx;
      // Alien heritage: if any of the child's parents is flagged alien, the bloodline
      // gets its own glowing green dashed line with a little UFO. 👽🛸
      const alien = (c.person.parents || []).some(pid => { const par = store.person(pid); return par && (par.alien || par.type === 'Alien'); });
      const edge = connector(startX, u.y + BOX_H, c.primaryCx, c.y);
      if (alien) edge.classList.add('edge-alien');
      layer.appendChild(edge);
      if (alien) {
        const midY = u.y + BOX_H + (c.y - (u.y + BOX_H)) / 2;
        const mark = svgEl('text', { class: 'alien-mark', x: c.primaryCx, y: midY + 6, 'text-anchor': 'middle' });
        mark.textContent = '🛸';
        layer.appendChild(mark);
      }
    }
    drawUnits(u.childUnits, layer);
  }
}

// Public: render a family's tree into `container`.
export function renderTree(container, familyId) {
  container.innerHTML = '';
  const forest = buildForest(familyId);
  if (!forest.length) {
    container.innerHTML = `<p class="empty">No Sims in this family yet.</p>`;
    return;
  }

  // Measure + place each root tree, laid out left to right.
  let left = 0;
  for (const root of forest) { measure(root); place(root, 0, left); left += root._w + SIBLING_GAP * 2; }

  const ext = { minX: Infinity, maxX: -Infinity, maxY: 0 };
  collectExtent(forest, ext);
  const pad = 60;
  const width = ext.maxX - ext.minX + pad * 2;
  const height = ext.maxY + pad * 2;

  const svg = svgEl('svg', { class: 'tree-svg', width: '100%', height: '100%' });
  const viewport = svgEl('g', { class: 'viewport' });
  const layer = svgEl('g', { transform: `translate(${pad - ext.minX}, ${pad})` });
  viewport.appendChild(layer);
  svg.appendChild(viewport);
  container.appendChild(svg);

  drawUnits(forest, layer);

  // Squeeze any text that's wider than its box so long names (AWiddleFrisbee,
  // Still-Here…) stay inside the card instead of leaking out the side.
  const fit = (t, max) => {
    try { if (t.getComputedTextLength() > max) { t.setAttribute('textLength', max); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (_) {}
  };
  container.querySelectorAll('text.node-name, text.node-sub').forEach(t => fit(t, BOX_W - 54 - 12));
  container.querySelectorAll('text.node-foot').forEach(t => fit(t, BOX_W - 16 - 12));

  setupPanZoom(svg, viewport, { width, height, container });

  // Click / keyboard to open a profile (node or pet).
  svg.addEventListener('click', (e) => {
    const petChip = e.target.closest('.pet-chip');
    if (petChip) { dispatchOpen(petChip.dataset.id); return; }
    const node = e.target.closest('.node');
    if (node) dispatchOpen(node.dataset.id);
  });
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const node = e.target.closest('.node');
    if (node) { e.preventDefault(); dispatchOpen(node.dataset.id); }
  });
}

function dispatchOpen(id) {
  window.dispatchEvent(new CustomEvent('open-node', { detail: { id } }));
}

// Fit-to-screen pan & zoom.
function setupPanZoom(svg, viewport, { width, height, container }) {
  const cw = container.clientWidth || 800, ch = container.clientHeight || 600;
  let scale = Math.min(1, Math.min(cw / width, ch / height) * 0.96) || 0.5;
  let tx = (cw - width * scale) / 2, ty = 30;
  let dragging = false, sx = 0, sy = 0;

  const apply = () => viewport.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
  apply();

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const ns = Math.max(0.2, Math.min(2.5, scale * factor));
    tx = mx - (mx - tx) * (ns / scale);
    ty = my - (my - ty) * (ns / scale);
    scale = ns; apply();
  }, { passive: false });

  svg.addEventListener('mousedown', (e) => { dragging = true; sx = e.clientX - tx; sy = e.clientY - ty; svg.classList.add('grabbing'); });
  window.addEventListener('mousemove', (e) => { if (!dragging) return; tx = e.clientX - sx; ty = e.clientY - sy; apply(); });
  window.addEventListener('mouseup', () => { dragging = false; svg.classList.remove('grabbing'); });

  // Expose simple controls.
  svg._zoom = (dir) => { const ns = Math.max(0.2, Math.min(2.5, scale * (dir > 0 ? 1.2 : 0.8))); tx = cw / 2 - (cw / 2 - tx) * (ns / scale); ty = ch / 2 - (ch / 2 - ty) * (ns / scale); scale = ns; apply(); };
  svg._reset = () => { scale = Math.min(1, Math.min(cw / width, ch / height) * 0.96) || 0.5; tx = (cw - width * scale) / 2; ty = 30; apply(); };
}

// Household grouping view.
export function renderHouseholds(container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'household-grid';
  for (const h of store.data.households) {
    const members = store.data.people.filter(p => p.household === h.id);
    const pets = store.data.pets.filter(p => p.household === h.id);
    const card = document.createElement('div');
    card.className = 'household-card';
    card.innerHTML = `
      <button class="hh-edit" title="Edit household" data-edit-hh="${h.id}">✎</button>
      <h3>${h.emoji || '🏠'} ${h.name}</h3>
      <p class="household-loc">${h.location || ''}</p>
      <div class="household-members"></div>
      <p class="household-feat">${h.features || ''}</p>`;
    card.querySelector('[data-edit-hh]').addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('open-household', { detail: { id: h.id } }));
    });
    const list = card.querySelector('.household-members');
    [...members, ...pets].forEach(m => {
      const chip = document.createElement('button');
      chip.className = 'member-chip';
      chip.style.borderColor = store.familyColour(m.id);
      chip.innerHTML = `<span>${m.emoji || '👤'}</span> ${m.display || m.name}`;
      chip.addEventListener('click', () => dispatchOpen(m.id));
      list.appendChild(chip);
    });
    wrap.appendChild(card);
  }
  container.appendChild(wrap);
}
