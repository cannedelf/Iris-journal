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

const AVATAR_R = 36;               // portrait circle radius
const BOX_W = 100;                 // node cell width (layout slot)
const BOX_H = 104;                 // node cell height (circle + name)
const CY = AVATAR_R + 10;          // circle centre y within the cell (46)
const NAME_Y = CY + AVATAR_R + 16; // name baseline below the circle (98)
const COUPLE_GAP = 16;             // space between two partners
const SIBLING_GAP = 30;            // space between sibling units
const LEVEL_H = BOX_H + 60;        // vertical distance between generations
const ASPIRATION_EMOJI = {
  Family: '🏠', Knowledge: '📚', Fortune: '💰', Popularity: '🎉',
  Pleasure: '😎', 'Grilled Cheese': '🧀', Romance: '💋', 'Growing Up': '🍼'
};

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
    // Show a child if their own family matches this tree, OR if this parent is a blood
    // member of it — so a child appears under BOTH parents' family trees (e.g. Liv +
    // Fourth's baby shows in the Hill tree under Liv and the Frisbee tree under Fourth).
    // The Townies tab stays a flat directory, so it doesn't absorb married-in kids.
    const showBloodKids = person.family === familyId && familyId !== 'townie';
    const kids = store.childrenOf(person.id)
      .filter(c => (c.family === familyId || showBloodKids) && !consumed.has(c.id))
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
  const typeView = colourMode === 'type' && !isAncestor;
  const border = typeView ? tMeta.colour : fam.colour;
  const fillSoft = isAncestor ? '#efece6' : (typeView ? tMeta.soft : fam.soft);
  const faded = typeView && person.type === 'Ghost';
  const cx = BOX_W / 2, cy = CY, R = AVATAR_R;

  const g = svgEl('g', { class: `node ${isAncestor ? 'ancestor' : ''} ${person.heart ? 'heart' : ''} ${faded ? 'faded' : ''}`, transform: `translate(${x},${y})`, 'data-id': person.id, role: 'button', tabindex: '0' });

  // Round portrait: soft backing, optional photo clipped to the circle, then the colour ring.
  g.appendChild(svgEl('circle', { class: 'avatar-bg', cx, cy, r: R, fill: fillSoft }));
  if (person.photo) {
    const img = svgEl('image', { x: cx - R, y: cy - R, width: R * 2, height: R * 2, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#avatarClip)' });
    img.setAttribute('href', person.photo);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', person.photo);
    g.appendChild(img);
  } else {
    const em = svgEl('text', { class: 'avatar-emoji', x: cx, y: cy + R * 0.34, 'text-anchor': 'middle', 'font-size': R * 1.15 });
    em.textContent = person.emoji || '👤';
    g.appendChild(em);
  }
  g.appendChild(svgEl('circle', { class: 'avatar-ring', cx, cy, r: R, fill: 'none', stroke: border, 'stroke-width': asPartner ? 3 : 4, 'stroke-dasharray': isAncestor ? '5 4' : 'none' }));

  // Full name underneath.
  const name = svgEl('text', { class: 'node-name', x: cx, y: NAME_Y, 'text-anchor': 'middle' });
  name.textContent = person.name || person.display || '';
  g.appendChild(name);

  // Corner badges around the portrait: NW bow · NE occult · SE pet · SW aspiration.
  const off = R * 0.72;
  const addBadge = (bx, by, emoji, stroke, cls, id) => {
    const bg = svgEl('g', cls ? { class: cls, 'data-id': id } : {});
    bg.appendChild(svgEl('circle', { cx: bx, cy: by, r: 11.5, fill: '#fff', stroke, 'stroke-width': 2 }));
    const t = svgEl('text', { x: bx, y: by + 4.5, 'text-anchor': 'middle', 'font-size': 13 });
    t.textContent = emoji; bg.appendChild(t);
    g.appendChild(bg);
  };
  if (person.yellowBow) addBadge(cx - off, cy - off, '🎀', '#e6a91f');
  if (hasType) addBadge(cx + off, cy - off, tMeta.emoji, tMeta.colour);
  const pets = store.petsOf(person.id);
  if (pets.length) {
    addBadge(cx + off, cy + off, pets[0].emoji || '🐾', fam.colour, 'pet-chip', pets[0].id);
    if (pets.length > 1) {
      const c = svgEl('text', { class: 'pet-count', x: cx + off + 11, y: cy + off + 13, 'font-size': 9, 'text-anchor': 'middle' });
      c.textContent = '+' + (pets.length - 1); g.appendChild(c);
    }
  }
  const asp = !isAncestor && ASPIRATION_EMOJI[person.aspiration];
  if (asp) addBadge(cx - off, cy + off, asp, '#c9b78f');

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

function drawUnits(units, nodes, edges) {
  for (const u of units) {
    nodes.appendChild(nodeBox(u.person, u.unitLeft, u.y, false));
    // Partner portrait + marriage connector (between the two circles).
    if (u.partner) {
      const px = u.unitLeft + BOX_W + COUPLE_GAP;
      nodes.appendChild(nodeBox(u.partner, px, u.y, true));
      const my = u.y + CY;
      const status = (u.partnerMeta && u.partnerMeta.status) || '';
      const wed = /engaged|married/i.test(status);
      edges.appendChild(svgEl('line', {
        class: 'marriage' + (wed ? ' strong' : ''),
        x1: u.unitLeft + BOX_W / 2 + AVATAR_R, y1: my, x2: px + BOX_W / 2 - AVATAR_R, y2: my
      }));
      const heart = svgEl('text', { class: 'marriage-mark', x: u.cx, y: my - 5, 'text-anchor': 'middle' });
      heart.textContent = wed ? '💍' : (/love|crush|romantic/i.test(status) ? '💕' : '·');
      nodes.appendChild(heart);
    }
    // Bloodlines connect circle-centre to circle-centre (drawn behind the portraits, so the
    // vertical sections tuck neatly behind the circles and names). Descend from the couple
    // midpoint only when the displayed partner is genuinely the child's other parent.
    for (const c of u.childUnits) {
      const partnerIsCoParent = u.partner && (c.person.parents || []).includes(u.partner.id);
      const startX = partnerIsCoParent ? u.cx : u.primaryCx;
      // Adoption = warm pink dotted line + beating heart ❤️; alien = glowing green dashes + UFO 🛸
      const adopted = !!c.person.adopted;
      const alien = !adopted && (c.person.parents || []).some(pid => { const par = store.person(pid); return par && (par.alien || par.type === 'Alien'); });
      const edge = connector(startX, u.y + CY, c.primaryCx, c.y + CY);
      if (adopted) edge.classList.add('edge-adopt');
      else if (alien) edge.classList.add('edge-alien');
      edges.appendChild(edge);
      if (adopted || alien) {
        const midY = u.y + CY + (c.y - u.y) / 2;
        const mark = svgEl('text', { class: adopted ? 'adopt-mark' : 'alien-mark', x: c.primaryCx, y: midY + 5, 'text-anchor': 'middle' });
        mark.textContent = adopted ? '❤️' : '🛸';
        nodes.appendChild(mark);
      }
    }
    drawUnits(u.childUnits, nodes, edges);
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
  // One shared circular clip for every portrait (all circles sit at the same local coords).
  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id: 'avatarClip', clipPathUnits: 'userSpaceOnUse' });
  clip.appendChild(svgEl('circle', { cx: BOX_W / 2, cy: CY, r: AVATAR_R }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const viewport = svgEl('g', { class: 'viewport' });
  const tform = `translate(${pad - ext.minX}, ${pad})`;
  const edgesLayer = svgEl('g', { transform: tform }); // behind
  const nodesLayer = svgEl('g', { transform: tform }); // in front (portraits cover the lines)
  viewport.appendChild(edgesLayer);
  viewport.appendChild(nodesLayer);
  svg.appendChild(viewport);
  container.appendChild(svg);

  drawUnits(forest, nodesLayer, edgesLayer);

  // Squeeze long full names so they stay tidy under the portrait.
  const fit = (t, max) => {
    try { if (t.getComputedTextLength() > max) { t.setAttribute('textLength', max); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (_) {}
  };
  container.querySelectorAll('text.node-name').forEach(t => fit(t, BOX_W + SIBLING_GAP - 10));

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
  const view = document.createElement('div');
  view.className = 'households-view';

  // Current-rotation tracker.
  const rot = (store.data.meta && store.data.meta.rotation) || 1;
  const banner = document.createElement('div');
  banner.className = 'rotation-banner';
  banner.innerHTML = `<span class="rot-label">🔄 Currently playing</span>
    <button class="rot-btn" data-rot="-1" title="Previous rotation">−</button>
    <strong class="rot-num" title="Click to set the rotation">Rotation ${rot}</strong>
    <button class="rot-btn" data-rot="1" title="Next rotation">+</button>`;
  const setRot = async (val) => {
    val = Math.max(1, Math.floor(val) || 1);
    store.data.meta = store.data.meta || {};
    store.data.meta.rotation = val;
    await store.commit(`Set rotation to ${val}`);
    window.dispatchEvent(new CustomEvent('data-updated'));
  };
  banner.querySelectorAll('.rot-btn').forEach(b => b.addEventListener('click', () => setRot(rot + Number(b.dataset.rot))));
  banner.querySelector('.rot-num').addEventListener('click', () => {
    const v = prompt('Which rotation are you on?', rot);
    if (v !== null && v.trim() !== '' && !isNaN(v)) setRot(Number(v));
  });
  view.appendChild(banner);

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
  view.appendChild(wrap);
  container.appendChild(view);
}
