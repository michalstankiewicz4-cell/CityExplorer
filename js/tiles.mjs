// Kafle mapy (1 km × 1 km) do wczytywania w trakcie gry — poza dokładną mapą (centrum / Okęcie).
// Wspólne dla gry (index.html) i narzędzia tools/fetch-tiles.mjs (gotowe kafle Warszawy przy deployu).
// Siatka kafli w metrach od środka globalnego G0 (PKiN): x na wschód, z na południe; kafel (i, j) = [i·T, (i+1)·T] × [j·T, (j+1)·T].
// Kafel: { i, j, b: budynki [[wys, min_wys, x0, z0, x1, z1, …]], l: linie [[klasa, szer, x0, z0, …]], a: obszary [[klasa, [rola, x0, z0, …], …]] }
// współrzędne w decymetrach od rogu kafla (liczby całkowite).
export const G0 = { lat: 52.23175, lon: 21.00586 };
export const T = 1000;
export const KX = 111320 * Math.cos(G0.lat * Math.PI / 180), KY = 110574;
export const toG = (lat, lon) => [(lon - G0.lon) * KX, -(lat - G0.lat) * KY];
export const key = (i, j) => i + '_' + j;
// granice kafla w stopniach { s, w, n, e }
export function tileBBox(i0, j0, n = 1) {
  return { w: G0.lon + i0 * T / KX, e: G0.lon + (i0 + n) * T / KX, n: G0.lat - j0 * T / KY, s: G0.lat - (j0 + n) * T / KY };
}
// Warszawa (granice miasta, prostokąt) w kaflach
export const WARSAW = { i0: -11, i1: 18, j0: -16, j1: 14 };

export function overpassQuery(b) {
  const bb = `${b.s.toFixed(6)},${b.w.toFixed(6)},${b.n.toFixed(6)},${b.e.toFixed(6)}`;
  return `[out:json][timeout:120][bbox:${bb}];(way["building"];way["highway"];way["railway"~"^(rail|tram|light_rail|narrow_gauge|subway)$"];way["landuse"];` +
    `way["natural"~"^(water|wood|scrub|grassland|wetland|heath|sand)$"];way["leisure"~"^(park|garden|pitch|golf_course|nature_reserve|stadium)$"];` +
    `way["aeroway"~"^(runway|taxiway|apron|aerodrome)$"];way["waterway"~"^(river|canal|stream|riverbank)$"];way["amenity"="parking"];` +
    `rel["natural"="water"];rel["landuse"];rel["leisure"~"^(park|garden|nature_reserve)$"];rel["natural"~"^(wood|scrub|wetland)$"];rel["building"];);out geom qt;`;
}

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? NaN : n; };
const ROADW = { motorway: 22, trunk: 18, primary: 15, secondary: 12, tertiary: 10, unclassified: 7, residential: 7, living_street: 6, service: 4.5, pedestrian: 6,
  track: 3, footway: 2, path: 1.6, cycleway: 2, steps: 2, bridleway: 2, busway: 7, road: 6 };
// klasa obszaru (kolejność rysowania i kolor są w grze)
export function areaClass(t) {
  if (t.building) return null;
  const lu = t.landuse, le = t.leisure, na = t.natural;
  if (na === 'water' || lu === 'reservoir' || lu === 'basin' || t.waterway === 'riverbank') return 'water';
  if (lu === 'forest' || na === 'wood') return 'forest';
  if (na === 'scrub' || na === 'heath') return 'scrub';
  if (na === 'wetland') return 'wet';
  if (le === 'park' || le === 'garden' || le === 'nature_reserve' || le === 'golf_course') return 'park';
  if (le === 'pitch' || le === 'stadium') return 'pitch';
  if (/^(grass|meadow|village_green|recreation_ground|flowerbed|greenfield)$/.test(lu || '') || na === 'grassland') return 'grass';
  if (/^(farmland|farmyard|orchard|vineyard|plant_nursery|allotments)$/.test(lu || '')) return 'farm';
  if (lu === 'cemetery') return 'cem';
  if (/^(construction|brownfield|landfill|quarry)$/.test(lu || '') || na === 'sand') return 'constr';
  if (lu === 'railway') return 'rail';
  if (/^(industrial|commercial|retail|garages|military)$/.test(lu || '')) return 'indus';
  if (lu === 'residential') return 'resid';
  if (t.aeroway === 'aerodrome') return 'aero';
  if (t.aeroway === 'apron') return 'apron';
  if (t.amenity === 'parking') return 'lot';
  return null;
}
function lineClass(t) {
  if (t.highway) { const hw = t.highway.replace(/_link$/, ''); const w = ROADW[hw]; if (!w) return null; const tw = num(t.width); return [hw, !isNaN(tw) && tw > 1 && tw < 60 ? tw : /_link$/.test(t.highway) ? 7 : w]; }
  if (t.railway) return [t.railway === 'tram' ? 'tram' : 'rail', 4];
  if (t.waterway && t.waterway !== 'riverbank') return [t.waterway, num(t.width) > 0 ? num(t.width) : t.waterway === 'river' ? 60 : t.waterway === 'canal' ? 12 : 3];
  if (t.aeroway === 'runway' || t.aeroway === 'taxiway') return [t.aeroway, num(t.width) > 3 && num(t.width) < 100 ? num(t.width) : t.aeroway === 'runway' ? 45 : 18];
  return null;
}
function bHeight(t) {
  let h = num(t.height); if (isNaN(h)) { const lv = num(t['building:levels']); h = !isNaN(lv) ? lv * 3.1 + 1.5 : /^(house|detached|garage|garages|shed|hut|bungalow|semidetached_house|farm_auxiliary|barn)$/.test(t.building) ? 6 : t.building === 'industrial' || t.building === 'warehouse' ? 10 : 12; }
  let mh = num(t.min_height); if (isNaN(mh)) { const ml = num(t['building:min_level']); mh = isNaN(ml) ? 0 : ml * 3.1; }
  return [Math.max(2.5, Math.min(260, h)), Math.max(0, mh)];
}
// przycięcie wielokąta do prostokąta (Sutherland–Hodgman) i linii do prostokąta (odcinki stykające się z nim)
function clipPoly(c, x0, z0, x1, z1) {
  let p = []; for (let k = 0; k < c.length; k += 2) p.push([c[k], c[k + 1]]);
  for (const [ax, lim, keepGreater] of [[0, x0, true], [0, x1, false], [1, z0, true], [1, z1, false]]) {
    const q = []; for (let k = 0; k < p.length; k++) {
      const A = p[k], B = p[(k + 1) % p.length], ia = keepGreater ? A[ax] >= lim : A[ax] <= lim, ib = keepGreater ? B[ax] >= lim : B[ax] <= lim;
      if (ia) q.push(A);
      if (ia !== ib) { const f = (lim - A[ax]) / (B[ax] - A[ax]); q.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f]); }
    }
    p = q; if (p.length < 3) return null;
  }
  return p.flat();
}
function clipLine(c, x0, z0, x1, z1) {
  const runs = []; let cur = null;
  const inside = (k) => c[k] >= x0 && c[k] <= x1 && c[k + 1] >= z0 && c[k + 1] <= z1;
  for (let k = 0; k < c.length - 2; k += 2) {
    const hit = inside(k) || inside(k + 2) || !(Math.max(c[k], c[k + 2]) < x0 || Math.min(c[k], c[k + 2]) > x1 || Math.max(c[k + 1], c[k + 3]) < z0 || Math.min(c[k + 1], c[k + 3]) > z1);
    if (hit) { if (!cur) { cur = [c[k], c[k + 1]]; runs.push(cur); } cur.push(c[k + 2], c[k + 3]); } else cur = null;
  }
  return runs;
}
// drogi relacji (otwarte kawałki) → pierścienie: łączenie po wspólnych końcach
function joinRings(parts) {
  const eq = (a, k, b, m) => Math.abs(a[k] - b[m]) < 0.05 && Math.abs(a[k + 1] - b[m + 1]) < 0.05, out = [];
  parts = parts.filter(p => p.length >= 4);
  while (parts.length) {
    let cur = parts.pop(), guard = 0;
    while (!eq(cur, 0, cur, cur.length - 2) && guard++ < 5000) {
      const L = cur.length - 2; let f = -1, rev = false;
      for (let q = 0; q < parts.length; q++) { const p = parts[q]; if (eq(p, 0, cur, L)) { f = q; break; } if (eq(p, p.length - 2, cur, L)) { f = q; rev = true; break; } }
      if (f < 0) break;
      let p = parts.splice(f, 1)[0]; if (rev) { const r = []; for (let k = p.length - 2; k >= 0; k -= 2) r.push(p[k], p[k + 1]); p = r; }
      cur = cur.concat(p.slice(2));
    }
    if (cur.length >= 8) out.push(cur);
  }
  return out;
}
const underground = (t) => (t.tunnel && t.tunnel !== 'no') || num(t.layer) < 0 || t.location === 'underground' || t.indoor === 'yes' || num(t.level) < 0;

// elementy z Overpass (out geom) → kafle; keys: zbiór kluczy kafli do wypełnienia (np. 4 z bloku 2×2)
export function tilesFromElements(els, keys) {
  const out = new Map();
  for (const k of keys) { const [i, j] = k.split('_').map(Number); out.set(k, { i, j, b: [], l: [], a: [] }); }
  const toXZ = (g) => { const o = []; for (const p of g || []) if (p) { const [x, z] = toG(p.lat, p.lon); o.push(x, z); } return o; };
  const bbox = (c, pad = 0) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let k = 0; k < c.length; k += 2) { x0 = Math.min(x0, c[k]); x1 = Math.max(x1, c[k]); z0 = Math.min(z0, c[k + 1]); z1 = Math.max(z1, c[k + 1]); } return [x0 - pad, z0 - pad, x1 + pad, z1 + pad]; };
  const tilesOf = (bb) => { const r = []; for (let i = Math.floor(bb[0] / T); i <= Math.floor(bb[2] / T); i++) for (let j = Math.floor(bb[1] / T); j <= Math.floor(bb[3] / T); j++) { const k = key(i, j); if (out.has(k)) r.push(out.get(k)); } return r; };
  const rel = (tile, c) => { const o = new Array(c.length), ox = tile.i * T, oz = tile.j * T; for (let k = 0; k < c.length; k += 2) { o[k] = Math.round((c[k] - ox) * 10); o[k + 1] = Math.round((c[k + 1] - oz) * 10); } return o; };
  for (const e of els) {
    const t = e.tags; if (!t || underground(t)) continue;
    let rings;   // [[rola 0 zewn. / 1 wewn., coords]]
    if (e.type === 'way') rings = [[0, toXZ(e.geometry)]];
    else if (e.type === 'relation') {
      if (t.type !== 'multipolygon') continue;
      rings = [];
      for (const role of [0, 1]) for (const r of joinRings((e.members || []).filter(m => m.type === 'way' && m.geometry && (m.role === 'inner' ? 1 : 0) === role).map(m => toXZ(m.geometry)))) rings.push([role, r]);
    }
    else continue;
    rings = rings.filter(r => r[1].length >= 4); if (!rings.length) continue;
    if (t.building || t['building:part']) {
      if (t.building === 'no' || t.building === 'roof' || t['building:part']) continue;
      const [h, mh] = bHeight(t);
      for (const [role, c] of rings) {
        if (role || c.length < 8) continue;
        let cx = 0, cz = 0; const n = c.length / 2 - (c[0] === c[c.length - 2] && c[1] === c[c.length - 1] ? 1 : 0);
        for (let k = 0; k < n * 2; k += 2) { cx += c[k]; cz += c[k + 1]; }
        const tile = out.get(key(Math.floor(cx / n / T), Math.floor(cz / n / T))); if (!tile) continue;
        tile.b.push([Math.round(h * 10) / 10, Math.round(mh * 10) / 10, ...rel(tile, c.slice(0, n * 2))]);
      }
      continue;
    }
    const closed = e.type === 'relation' || (rings[0][1].length >= 8 && rings[0][1][0] === rings[0][1][rings[0][1].length - 2] && rings[0][1][1] === rings[0][1][rings[0][1].length - 1]);
    const ac = closed && (e.type === 'relation' || !t.highway || t.area === 'yes') ? areaClass(t) : null;
    if (ac) {
      const all = rings.flatMap(r => r[1]);
      for (const tile of tilesOf(bbox(all))) {
        const x0 = tile.i * T - 2, z0 = tile.j * T - 2, x1 = x0 + T + 4, z1 = z0 + T + 4, rr = [];
        for (const [role, c] of rings) { const q = clipPoly(c, x0, z0, x1, z1); if (q) rr.push([role, ...rel(tile, q)]); }
        if (rr.some(r => r[0] === 0)) tile.a.push([ac, ...rr]);
      }
      continue;
    }
    if (e.type !== 'way') continue;
    const lc = lineClass(t); if (!lc) continue;
    const c = rings[0][1];
    for (const tile of tilesOf(bbox(c, lc[1]))) { const p = lc[1] + 2; for (const run of clipLine(c, tile.i * T - p, tile.j * T - p, tile.i * T + T + p, tile.j * T + T + p)) tile.l.push([lc[0], lc[1], ...rel(tile, run)]); }
  }
  return out;
}
