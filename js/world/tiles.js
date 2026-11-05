// Wielka Kradzież Aut VI — Kafle mapy wczytywane w locie (moduł shared/tiles.mjs): budowa, zwalnianie, podglądy.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   KAFLE MAPY POZA DOKŁADNĄ MAPĄ (js/shared/tiles.mjs): wczytywanie w stronę ruchu, zwalnianie z pamięci za plecami
   Źródła kafla: tiles/<i>_<j>.json (Warszawa, z deployu) → pamięć przeglądarki → Overpass na żywo (poza Warszawą).
   Uproszczone: płaski grunt z malowanymi drogami i obszarami, budynki z płaskimi dachami; bez tuneli, wiaduktów, torów do jazdy.
   ========================================================================= */
const TS = { TL: null, index: null, live: true, loaded: new Map(), ov: new Map(), data: new Map(), fail: new Map(), busy: false, t: 0, want: [], ovq: [], OFF: [0, 0], stats: { built: 0, freed: 0, live: 0, errors: 0 } };
const TILE_COL = { farm: [0, '#a9a874'], indus: [0, '#8a8680'], resid: [0, '#908f87'], aero: [0, '#7f9c5b'], park: [1, '#6a964b'], rail: [1, '#7d776d'], forest: [2, '#4c7a3a'],
  scrub: [2, '#62813f'], wet: [2, '#5f7d5a'], cem: [2, '#6b8a5a'], constr: [2, '#8f7f63'], grass: [3, '#73a052'], pitch: [5, '#5b9a52'], apron: [6, '#a3a29b'], lot: [6, '#55575a'], water: [9, '#3e6b8a'] };
const ROAD_COL = { footway: '#bdb5a6', path: '#a9a08c', cycleway: '#a65a50', steps: '#9d968a', pedestrian: '#c7bfb0', track: '#9a8a6c', bridleway: '#a9a08c' };
const tileGY = () => (W.terrBase || 0) - 0.3;
async function tilesInit() {
  try {
    TS.TL = await import(new URL('js/shared/tiles.mjs', location.href).href);
    const g = toXZ(TS.TL.G0.lat, TS.TL.G0.lon); TS.OFF = [g[0], g[1]];   // środek globalny kafli w układzie tej mapy
    const r = await fetchT('tiles/index.json', {}, 15000).catch(() => null);
    TS.index = r && r.ok ? new Set((await r.json()).keys) : new Set();
  } catch (e) { console.warn('[W3D] kafle', e); TS.TL = null; }
}
// kafel → malowanie na płótnie (S px na bok)
function paintTile(g, tile, S) {
  const k = S / (TS.TL.T * 10);
  g.fillStyle = '#8c8c84'; g.fillRect(0, 0, S, S);
  const ring = (c, from) => { for (let q = from; q < c.length; q += 2) q === from ? g.moveTo(c[q] * k, c[q + 1] * k) : g.lineTo(c[q] * k, c[q + 1] * k); g.closePath(); };
  const areas = tile.a.filter(a => TILE_COL[a[0]]).sort((x, y) => TILE_COL[x[0]][0] - TILE_COL[y[0]][0]);
  for (const a of areas) { g.beginPath(); for (let r = 1; r < a.length; r++) ring(a[r], 1); g.fillStyle = TILE_COL[a[0]][1]; g.fill('evenodd'); }
  const line = (l, wd, col, dash) => { g.beginPath(); for (let q = 2; q < l.length; q += 2) q === 2 ? g.moveTo(l[q] * k, l[q + 1] * k) : g.lineTo(l[q] * k, l[q + 1] * k); g.lineWidth = Math.max(0.6, wd * 10 * k); g.strokeStyle = col; g.lineCap = g.lineJoin = 'round'; g.setLineDash(dash ? dash.map(d => d * 10 * k) : []); g.stroke(); g.setLineDash([]); };
  for (const l of tile.l) if (/^(river|canal|stream)$/.test(l[0])) line(l, l[1], '#3e6b8a');
  for (const l of tile.l) if (l[0] === 'taxiway') { line(l, l[1], '#8d8c86'); line(l, 0.3, '#e2b631'); }
  for (const l of tile.l) if (l[0] === 'runway') { line(l, l[1], '#5d5e5b'); line(l, 0.9, '#efeee8', [30, 20]); }
  for (const l of tile.l) if (ROAD_COL[l[0]]) line(l, l[1], ROAD_COL[l[0]]);
  const veh = tile.l.filter(l => ROAD_W[l[0]] && !ROAD_COL[l[0]]).sort((a, b) => a[1] - b[1]);
  for (const l of veh) line(l, l[1] + 0.9, '#a7a39b');
  for (const l of veh) line(l, l[1], l[1] >= 10 ? '#3a3c3f' : '#45474a');
  for (const l of tile.l) if (l[0] === 'rail' || l[0] === 'tram') { line(l, l[0] === 'tram' ? 2.6 : 3.4, '#6d675e'); line(l, 1.9, '#2b2b2b'); }
}
const tileMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
function buildTile(tile) {
  const T = TS.TL.T, x0 = tile.i * T + TS.OFF[0], z0 = tile.j * T + TS.OFF[1], GY = tileGY(), grp = new THREE.Group(), res = [];
  // grunt: płótno 1024 px (1 m/px) na prostokątach kafla poza dokładną mapą
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024; paintTile(cv.getContext('2d'), tile, 1024);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); res.push(tex);
  const x1 = x0 + T, z1 = z0 + T, rects = [];
  if (x1 <= -E || x0 >= E || z1 <= -E || z0 >= E) rects.push([x0, z0, x1, z1]);
  else {
    if (x0 < -E) rects.push([x0, z0, -E, z1]); if (x1 > E) rects.push([E, z0, x1, z1]);
    const ax = Math.max(x0, -E), bx = Math.min(x1, E);
    if (z0 < -E) rects.push([ax, z0, bx, -E]); if (z1 > E) rects.push([ax, E, bx, z1]);
  }
  if (rects.length) {
    const pos = [], uv = [], nor = [];
    for (const [a, b, c, d] of rects) {   // siatka co ≤ 50 m: grunt idzie za terenem (zejście od krawędzi dokładnej mapy)
      const nx = Math.max(1, Math.ceil((c - a) / 50)), nz = Math.max(1, Math.ceil((d - b) / 50));
      for (let u = 0; u < nx; u++) for (let v = 0; v < nz; v++) {
        const xa = a + (c - a) * u / nx, xb = a + (c - a) * (u + 1) / nx, za = b + (d - b) * v / nz, zb = b + (d - b) * (v + 1) / nz;
        for (const [px, pz] of [[xa, za], [xa, zb], [xb, za], [xb, za], [xa, zb], [xb, zb]]) { pos.push(px, H(px, pz) - 0.02, pz); nor.push(0, 1, 0); uv.push((px - x0) / T, 1 - (pz - z0) / T); }
      }
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const gm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97 }); const m = new THREE.Mesh(gg, gm); m.receiveShadow = true; grp.add(m); res.push(gg, gm);
  }
  // budynki: ściany i płaskie dachy, kolor z lekką zmiennością
  const P = [], C = [], col = new THREE.Color(), coll = [];
  for (const b of tile.b) {
    const n = (b.length - 2) / 2; if (n < 3) continue;
    const xs = [], zs = []; let cx = 0, cz = 0;
    for (let q = 0; q < n; q++) { const x = x0 + b[2 + q * 2] / 10, z = z0 + b[3 + q * 2] / 10; xs.push(x); zs.push(z); cx += x; cz += z; }
    cx /= n; cz /= n; if (Math.abs(cx) < E && Math.abs(cz) < E) continue;   // tę część pokazuje dokładna mapa
    const g0 = H(cx, cz), yb = g0 - 0.5 + b[1], yt = g0 + b[0], hsh = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453, rr = hsh - Math.floor(hsh);
    col.setHSL(0.08 + rr * 0.05, 0.12 + rr * 0.1, 0.62 + rr * 0.12);
    for (let q = 0; q < n; q++) {
      const a = q, c = (q + 1) % n;
      P.push(xs[a], yb, zs[a], xs[c], yb, zs[c], xs[a], yt, zs[a], xs[a], yt, zs[a], xs[c], yb, zs[c], xs[c], yt, zs[c]);
      coll.push(collTile(xs[a], zs[a], xs[c], zs[c], yb, yt));   // ściana do zderzeń (zwalniana z kaflem)
      for (let v = 0; v < 6; v++) C.push(col.r, col.g, col.b);
    }
    const tri = THREE.ShapeUtils.triangulateShape(xs.map((x, q) => new THREE.Vector2(x, zs[q])), []);
    const rc = col.clone().multiplyScalar(0.72);
    for (const t of tri) for (const q of t) { P.push(xs[q], yt, zs[q]); C.push(rc.r, rc.g, rc.b); }
  }
  if (P.length) {
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); bg.computeVertexNormals();
    const m = new THREE.Mesh(bg, tileMat); m.castShadow = true; grp.add(m); res.push(bg);
  }
  // podgląd na dużą mapę (128 px)
  const o = document.createElement('canvas'); o.width = o.height = 128; o.getContext('2d').drawImage(cv, 0, 0, 128, 128); ovPut(tile.i + '_' + tile.j, o);
  scene.add(grp); TS.stats.built++;
  return { grp, res, coll, cx: x0 + T / 2, cz: z0 + T / 2 };
}
// ściana budynku kafla w siatce zderzeń (ten sam format co collAdd); zwraca [ściana, klucze komórek] do zwolnienia
function collTile(ax, az, bx, bz, y0, y1) {
  const sg = [ax, az, bx, bz, 0, y0, y1, 'b'], ks = [];
  for (let i = Math.floor(Math.min(ax, bx) / COLL_CELL); i <= Math.floor(Math.max(ax, bx) / COLL_CELL); i++) for (let j = Math.floor(Math.min(az, bz) / COLL_CELL); j <= Math.floor(Math.max(az, bz) / COLL_CELL); j++) {
    const k = i * 100003 + j; let a = collGrid.get(k); if (!a) collGrid.set(k, a = []); a.push(sg); ks.push(k);
  }
  return [sg, ks];
}
function ovPut(k, c) { TS.ov.delete(k); TS.ov.set(k, c); if (TS.ov.size > 500) TS.ov.delete(TS.ov.keys().next().value); }
function disposeTile(t) { scene.remove(t.grp); for (const r of t.res) r.dispose(); for (const [sg, ks] of t.coll || []) for (const c of ks) { const a = collGrid.get(c); if (a) { const q = a.indexOf(sg); if (q >= 0) a.splice(q, 1); } } }
function freeTile(k) { const t = TS.loaded.get(k); if (!t) return; disposeTile(t); TS.loaded.delete(k); TS.stats.freed++; }
let liveBusy = false;
async function tileData(k, allowLive = true) {
  if (TS.data.has(k)) return TS.data.get(k);
  let d = null;
  if (TS.index.has(k)) { const r = await fetchT('tiles/' + k + '.json', {}, 30000).catch(() => null); if (r && r.ok) d = await r.json(); }
  if (!d) d = await idb.get('tile-v1-' + k);
  if (!d && allowLive && TS.live && !liveBusy) {   // poza Warszawą: Overpass na żywo, jeden naraz
    liveBusy = true;
    try {
      const [i, j] = k.split('_').map(Number), q = TS.TL.overpassQuery(TS.TL.tileBBox(i, j));
      for (const url of OVERPASS) {
        try { const r = await fetchT(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 60000); if (!r.ok) throw new Error('HTTP ' + r.status); const js = await r.json(); d = TS.TL.tilesFromElements(js.elements || [], new Set([k])).get(k); TS.stats.live++; await idb.set('tile-v1-' + k, d); break; }
        catch (e) { console.warn('[W3D] kafel na żywo', k, e.message); }
      }
    } finally { liveBusy = false; }
  }
  if (d) { TS.data.set(k, d); if (TS.data.size > 30) TS.data.delete(TS.data.keys().next().value); }
  return d;
}
// co 0,4 s: najbliższy brakujący kafel w zasięgu widoku wczytuje się, dalekie są zwalniane; potem podglądy dla dużej mapy
async function streamTick() {
  if (!TS.TL || !TS.index || TS.busy) return;
  TS.busy = true;
  try {
    const T = TS.TL.T, gx = ego.x - TS.OFF[0], gz = ego.z - TS.OFF[1], LR = Math.max(1500, GFX.view + 600), now = performance.now();
    for (const [k, t] of TS.loaded) if (Math.hypot(t.cx - ego.x, t.cz - ego.z) > LR + 1300) freeTile(k);
    let best = null, bd = 1e9;
    const n = Math.ceil(LR / T) + 1, ci = Math.floor(gx / T), cj = Math.floor(gz / T);
    for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) {
      const k = i + '_' + j; if (TS.loaded.has(k) || (TS.fail.get(k) || 0) > now || !(TS.index.has(k) || TS.live)) continue;
      const lx = i * T + TS.OFF[0], lz = j * T + TS.OFF[1]; if (lx >= -E && lx + T <= E && lz >= -E && lz + T <= E) continue;   // cały w dokładnej mapie
      const d = Math.hypot(Math.max(lx - ego.x, 0, ego.x - lx - T), Math.max(lz - ego.z, 0, ego.z - lz - T));
      if (d < LR && d < bd) { bd = d; best = k; }
    }
    if (best) {
      const d = await tileData(best);
      if (d) { try { TS.loaded.set(best, buildTile(d)); } catch (e) { TS.stats.errors++; console.warn('[W3D] kafel', best, e); TS.fail.set(best, now + 1e9); } }
      else TS.fail.set(best, now + 60000);
    }
  } finally { TS.busy = false; }
}
// podglądy kafli dla dużej mapy (bez budowania 3D): kilka naraz z gotowych plików, z Overpass po jednym
async function ovTick() {
  if (!TS.TL || TS.ovBusy || !TS.ovq.length) return;
  TS.ovBusy = true;
  try {
    for (let n = 0; n < 6 && TS.ovq.length; n++) {
      const k = TS.ovq.shift(); if (TS.ov.has(k) || (TS.fail.get(k) || 0) > performance.now()) continue;
      const d = await tileData(k);
      if (d) { const c = document.createElement('canvas'); c.width = c.height = 128; paintTile(c.getContext('2d'), d, 128); ovPut(k, c); } else TS.fail.set(k, performance.now() + 60000);
      if (!TS.index.has(k)) break;
    }
    if (bigOpen) drawBigMap();
  } finally { TS.ovBusy = false; }
}
