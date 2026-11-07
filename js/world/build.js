// Wielka Kradzież Aut VI — Budowa dokładnej mapy z danych OSM: grunt, drogi, lotnisko, budynki, drzewa, teren, nakładki mapy.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
function buildWorld(D) {
  const NODES = D.nodes, WAYS = new Map(); for (const w of D.ways) WAYS.set(w.id, w);
  const xyOf = id => { const p = NODES[id]; return p ? toXZ(p[0], p[1]) : null; };
  const wayXZ = w => { const o = []; for (const id of w.n) { const p = xyOf(id); if (p) o.push(p); } return o; };
  const closed = w => w.n.length > 3 && w.n[0] === w.n[w.n.length - 1];
  const asRing = pts => { const r = pts.slice(); if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop(); return r; };
  function assemble(ids) {
    const segs = ids.map(id => WAYS.get(id)).filter(w => w && w.n.length > 1).map(w => w.n.slice()); const rings = [];
    while (segs.length) {
      let cur = segs.pop(), guard = 0;
      while (cur[0] !== cur[cur.length - 1] && guard++ < 2000) {
        const end = cur[cur.length - 1]; let f = -1, rev = false;
        for (let i = 0; i < segs.length; i++) { const s = segs[i]; if (s[0] === end) { f = i; break; } if (s[s.length - 1] === end) { f = i; rev = true; break; } }
        if (f < 0) break; const s = segs.splice(f, 1)[0]; if (rev) s.reverse(); cur = cur.concat(s.slice(1));
      }
      if (cur.length >= 4 && cur[0] === cur[cur.length - 1]) { const r = []; for (const id of cur) { const p = xyOf(id); if (p) r.push(p); } if (r.length >= 4) rings.push(asRing(r)); }
    }
    return rings;
  }
  // obszary (way zamknięty lub multipolygon) -> {t, outers, inners}
  const areas = [];
  for (const w of D.ways) if (w.t && closed(w)) areas.push({ id: w.id, t: w.t, outers: [asRing(wayXZ(w))], inners: [] });
  for (const r of D.rels) {
    const outers = assemble(r.m.filter(m => m[1] !== 'inner').map(m => m[0]));
    const inners = assemble(r.m.filter(m => m[1] === 'inner').map(m => m[0]));
    if (outers.length) areas.push({ id: r.id, t: r.t, outers, inners, rel: true });
  }

  /* ---------------- tekstura gruntu ---------------- */
  status('Maluję ulice, trawniki i place…', 0.66);
  const maxTex = renderer.capabilities.maxTextureSize;
  const S = Math.min(maxTex, 2 * E > 2400 ? 8192 : 4096, 8192);
  const gc = document.createElement('canvas'); gc.width = gc.height = S;
  const g = gc.getContext('2d');
  const sc = S / (2 * E), PX = x => (x + E) * sc;
  g.fillStyle = '#8c8c84'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; const s = 2 + rnd() * 10; g.fillRect(rnd() * S, rnd() * S, s, s); }
  const pathPoly = (rings) => { for (const r of rings) { r.forEach((p, i) => i ? g.lineTo(PX(p[0]), PX(p[1])) : g.moveTo(PX(p[0]), PX(p[1]))); g.closePath(); } };
  const fillArea = (a, col) => { g.beginPath(); pathPoly(a.outers); pathPoly(a.inners); g.fillStyle = col; g.fill('evenodd'); };
  const areaColor = t => {
    const lu = t.landuse, le = t.leisure, na = t.natural;
    if (t.building || t['building:part']) return null;
    if (na === 'water' || lu === 'reservoir' || lu === 'basin' || t.waterway === 'riverbank') return [9, '#3e6b8a'];
    if (le === 'pitch') return [5, '#5b9a52'];
    if (le === 'playground') return [5, '#b9a47c'];
    if (lu === 'forest' || na === 'wood') return [2, '#4c7a3a'];
    if (na === 'scrub') return [2, '#62813f'];
    if (le === 'park' || le === 'garden') return [1, '#6a964b'];
    if (/^(grass|meadow|village_green|recreation_ground|flowerbed)$/.test(lu || '') || na === 'grassland') return [3, '#73a052'];
    if (lu === 'cemetery') return [2, '#6b8a5a'];
    if (lu === 'construction' || lu === 'brownfield') return [2, '#8f7f63'];
    if (lu === 'railway') return [1, '#7d776d'];
    if (t.aeroway === 'aerodrome') return [0, '#7f9c5b'];             // trawa lotniska pod wszystkim
    if (t.aeroway === 'apron') return [6, '#a3a29b'];                 // płyta postojowa (beton)
    if (t.aeroway === 'runway' || t.aeroway === 'taxiway') return [8, '#8d8c86'];
    if (t.amenity === 'parking' && !/^(underground|multi-storey|rooftop)$/.test(t.parking || '')) return [6, '#55575a'];
    if (t['area:highway'] || (t.highway === 'pedestrian' && (t.area === 'yes' || 1)) || t.place === 'square') {
      const ah = t['area:highway'] || t.highway;
      if (/^(footway|pedestrian|path|steps)$/.test(ah) || t.place === 'square') return [7, '#c4bcad'];
      if (/^(cycleway)$/.test(ah)) return [7, '#a5594f'];
      return [8, '#3c3e41'];
    }
    return null;
  };
  const areaFills = [];
  for (const a of areas) { if (a.t.highway && !a.t['area:highway'] && !(a.t.area === 'yes') && a.t.highway !== 'pedestrian') continue; if (a.t.highway === 'pedestrian' && a.t.area !== 'yes' && !a.rel) continue; const c = areaColor(a.t); if (c) areaFills.push([c[0], c[1], a]); }
  areaFills.sort((x, y) => x[0] - y[0]);
  for (const [, col, a] of areaFills) fillArea(a, col);
  // linie wodne
  for (const w of D.ways) {
    const t = w.t; if (!t || !t.waterway || t.tunnel) continue;
    const ww = num(t.width) || (t.waterway === 'river' ? 120 : t.waterway === 'canal' ? 12 : 3);
    if (t.waterway === 'riverbank') continue;
    const pts = wayXZ(w); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(PX(p[0]), PX(p[1])) : g.moveTo(PX(p[0]), PX(p[1])));
    g.strokeStyle = '#3e6b8a'; g.lineWidth = ww * sc; g.lineCap = g.lineJoin = 'round'; g.stroke();
  }
  // drogi
  const lines = [];
  for (const w of D.ways) {
    const t = w.t; if (!t) continue;
    // ciągi piesze pod ziemią (przejścia, schody, korytarze stacji metra): tunel pieszy, także gdy w OSM to indoor / level < 0
    const footHw = /^(footway|steps|corridor|path|pedestrian)$/.test(t.highway || ''), below = num(t.level) < 0 || num(t.layer) < 0 || t.location === 'underground';
    if (t.highway === 'elevator' || ((t.indoor === 'yes' || t.highway === 'corridor') && !(footHw && below))) continue;
    const isB = !!t.bridge && t.bridge !== 'no';
    // tory pod ziemią bez znacznika tunelu (stacja podziemna: level < 0 albo location=underground) to tunel
    const isT = (!!t.tunnel && t.tunnel !== 'no' && t.tunnel !== 'culvert') || (!!t.railway && !isB && (num(t.level) < 0 || t.location === 'underground')) || (footHw && below && !isB);
    let L = num(t.layer); if (isNaN(L) && footHw && num(t.level) < 0) L = num(t.level);
    const passage = isT && !t.railway && (t.tunnel === 'building_passage' || isNaN(L));
    if (!isT && !isB && L < 0 && t.railway) L = 0;   // tor w wykopie (layer −1 bez tunelu): zjazd z portalu w wykopie robią konstrukcje
    if (!isT && !isB && (L < 0 || num(t.level) < 0 || t.location === 'underground')) continue;
    if (isNaN(L)) L = isB ? 1 : (isT && !passage) ? -1 : 0;
    const ids = [], pts = []; for (const id of w.n) { const p = xyOf(id); if (p) { ids.push(id); pts.push(p); } }
    if (pts.length < 2) continue;
    const base = { t, ids, pts, isB, isTun: isT && !passage, passage, L };
    if (t.highway) {
      if (closed(w) && (t.area === 'yes')) continue;
      let hw = t.highway; const link = /_link$/.test(hw); hw = hw.replace(/_link$/, '');
      let wd = ROAD_W[hw]; if (!wd) continue; if (link) wd = 7;
      const lanes = num(t.lanes); if (!isNaN(lanes) && ROAD_RANK[hw]) wd = Math.max(wd * 0.6, lanes * 3.3 + 1);
      const tw = num(t.width); if (!isNaN(tw) && tw > 1 && tw < 60) wd = tw;
      lines.push({ ...base, hw, wd, rank: ROAD_RANK[hw] || 0, net: FOOT_NET.has(hw) ? 'foot' : 'road' });
    } else if (t.railway && /^(tram|rail|light_rail|narrow_gauge|subway|monorail)$/.test(t.railway)) {
      lines.push({ ...base, rail: t.railway, wd: 4.6, net: t.railway === 'tram' ? 'tram' : t.railway === 'subway' ? 'subway' : 'rail' });
    }
  }
  lines.forEach(l => { l.ground = !l.isB && !l.isTun && !l.passage; });
  // rzeki i kanały pod mostami (prześwit nad wodą: rzeka 10 m, kanał 5 m)
  W.water = []; for (const w of D.ways) { const t = w.t; if (!t || !/^(river|canal)$/.test(t.waterway || '') || t.tunnel) continue; const pts = wayXZ(w); for (let i = 0; i < pts.length - 1; i++) W.water.push([pts[i], pts[i + 1], t.waterway === 'river' ? 10 : 5]); }
  status('Liczę wiadukty i tunele…', 0.68);
  const STR = buildStructures(lines);
  W.structStats = STR.stats; W.lines = lines;
  const strokePts = (pts, wd, col, dash) => {
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(PX(p[0]), PX(p[1])) : g.moveTo(PX(p[0]), PX(p[1])));
    g.lineWidth = Math.max(1, wd * sc); g.strokeStyle = col; g.lineCap = dash ? 'butt' : 'round'; g.lineJoin = 'round'; g.setLineDash(dash ? dash.map(d => d * sc) : []); g.stroke(); g.setLineDash([]);
  };
  const FOOT = { footway: '#bdb5a6', path: '#a9a08c', cycleway: '#a65a50', steps: '#9d968a', pedestrian: '#c7bfb0', track: '#9a8a6c' };
  const gl = lines.filter(l => l.ground);
  for (const l of gl) if (l.hw && FOOT[l.hw]) strokePts(l.pts, l.wd, FOOT[l.hw]);
  const veh = lines.filter(l => l.hw && !FOOT[l.hw]).sort((a, b) => a.rank - b.rank);
  const vg = veh.filter(l => l.ground);
  for (const l of vg) strokePts(l.pts, l.wd + 0.9, '#a7a39b');           // krawężnik
  for (const l of vg) strokePts(l.pts, l.wd, l.rank >= 4 ? '#3a3c3f' : '#45474a');
  for (const l of vg) if (l.rank >= 4 && l.wd >= 9 && l.t.oneway !== 'yes') strokePts(l.pts, 0.35, '#e9e6dc', [3, 5]);
  for (const l of vg) if (l.rank >= 4 && l.wd >= 9) { strokePts(l.pts, l.wd - 1.2, 'rgba(240,240,230,0.35)', [0.25, 1e4]); }
  // przejścia dla pieszych (zebry)
  for (const l of gl) if (l.hw === 'footway' && (l.t.footway === 'crossing' || l.t.crossing)) strokePts(l.pts, 3.2, '#ebe8df', [0.55, 0.55]);
  // tory
  for (const l of gl) if (l.rail && l.net !== 'subway') {
    strokePts(l.pts, l.rail === 'tram' ? 2.6 : 3.4, l.rail === 'tram' ? 'rgba(70,70,70,0.45)' : '#6d675e');
    strokePts(l.pts, 1.9, '#2b2b2b'); strokePts(l.pts, 1.2, l.rail === 'tram' ? '#55575a' : '#6d675e');
  }

  // lotnisko: drogi startowe (oznakowanie ICAO: krawędzie, oś, progi, numery) i drogi kołowania (żółta oś)
  W.runways = [];
  const AW = [];
  for (const w of D.ways) { const t = w.t; if (!t || !/^(runway|taxiway)$/.test(t.aeroway || '') || (closed(w) && t.area === 'yes')) continue; const pts = wayXZ(w); if (pts.length >= 2) AW.push({ t, pts, wd: num(t.width) > 3 && num(t.width) < 100 ? num(t.width) : t.aeroway === 'runway' ? 45 : 18 }); }
  for (const a of AW) if (a.t.aeroway === 'taxiway') { strokePts(a.pts, a.wd + 3, '#8a8984'); }
  for (const a of AW) if (a.t.aeroway === 'taxiway') strokePts(a.pts, 0.3, '#e2b631');
  for (const a of AW) if (a.t.aeroway === 'runway') {
    const p0 = a.pts[0], p1 = a.pts[a.pts.length - 1], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (L < 200) continue;
    const ux = (p1[0] - p0[0]) / L, uz = (p1[1] - p0[1]) / L, nx = -uz, nz = ux, wd = a.wd;
    W.runways.push({ p0, p1, L, wd, ref: a.t.ref || '' });
    strokePts([p0, p1], wd + 8, '#7e8a62'); strokePts([p0, p1], wd, '#5d5e5b');
    for (const sgn of [-1, 1]) strokePts([[p0[0] + nx * sgn * (wd / 2 - 1), p0[1] + nz * sgn * (wd / 2 - 1)], [p1[0] + nx * sgn * (wd / 2 - 1), p1[1] + nz * sgn * (wd / 2 - 1)]], 0.9, '#efeee8');
    const refs = (a.t.ref || '').split('/');
    for (const [end, dir, num_] of [[p0, 1, refs[0]], [p1, -1, refs[1] || '']]) {
      const at = (d, s) => [end[0] + ux * dir * d + nx * s, end[1] + uz * dir * d + nz * s];
      for (let k = 0, n = Math.max(4, Math.floor((wd - 6) / 3.6)); k < n; k++) { const s0 = -wd / 2 + 3 + (k + 0.5) * (wd - 6) / n; strokePts([at(6, s0), at(36, s0)], 1.8, '#efeee8'); }   // „klawisze fortepianu”
      if (num_) {   // numer drogi startowej
        const [cx, cz] = at(60, 0); g.save(); g.translate(PX(cx), PX(cz)); g.rotate(Math.atan2(uz * dir, ux * dir) + Math.PI / 2);
        g.fillStyle = '#efeee8'; g.font = `bold ${Math.round(9 * sc)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.scale(1, 2.2); g.fillText(num_.replace(/[^0-9LRC]/g, ''), 0, 0); g.restore();
      }
      for (const s0 of [-wd / 2 + 7, wd / 2 - 7]) strokePts([at(300, s0), at(345, s0)], 8, '#efeee8');   // strefa przyziemienia
    }
    const dash = []; for (let d = 90; d < L - 90; d += 50) dash.push(d);
    for (const d of dash) strokePts([[p0[0] + ux * d, p0[1] + uz * d], [p0[0] + ux * (d + 30), p0[1] + uz * (d + 30)]], 0.9, '#efeee8');   // oś
  }

  /* ---------------- budynki ---------------- */
  status('Stawiam budynki…', 0.72);
  const bl = [];
  const addB = (outer, holes, t, part, id) => {
    if (!outer || outer.length < 3) return;
    if (ringArea(outer) < 0) outer.reverse();
    holes = holes.filter(h => h.length >= 3).map(h => { if (ringArea(h) > 0) h.reverse(); return h; });
    const a = ringArea(outer); if (a < 2) return;
    const c = centroid(outer); if (Math.abs(c[0]) > E - 5 || Math.abs(c[1]) > E - 5) return;
    bl.push({ outer, holes, t, part, id, c, area: a });
  };
  for (const a of areas) {
    const t = a.t;
    if (!(t.building || t['building:part'])) continue;
    if (t.building === 'no' || t['building:part'] === 'no') continue;
    if (t.location === 'underground' || t.building === 'underground' || num(t.layer) < 0) continue;
    const part = !!t['building:part'] && !t.building;
    for (const o of a.outers) addB(o.slice(), a.inners.map(r => r.slice()), t, part, a.id);
  }
  // budynek z częściami (Simple 3D Buildings) -> rysujemy tylko części
  const partIdx = new Map(), PC = 50;
  for (const b of bl) if (b.part) { const k = Math.floor(b.c[0] / PC) * 100003 + Math.floor(b.c[1] / PC); let a = partIdx.get(k); if (!a) partIdx.set(k, a = []); a.push(b); }
  const hasParts = b => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of b.outer) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    for (let i = Math.floor(x0 / PC); i <= Math.floor(x1 / PC); i++) for (let j = Math.floor(z0 / PC); j <= Math.floor(z1 / PC); j++) {
      const a = partIdx.get(i * 100003 + j); if (a) for (const p of a) if (p !== b && p.area < b.area * 1.05 && pip(p.c, b.outer)) return true;
    }
    return false;
  };
  const DEF_COL = ['#d9d3c5', '#cfc6b2', '#bdb6a8', '#e3ddd1', '#cab9a0', '#aaa59c', '#d5c8ae', '#b9ab95', '#e8e3d7', '#c2bcb2', '#d0b49a'];
  const TALL_COL = ['#8ea3b4', '#9db0be', '#7c8f9f', '#a7b4bd', '#6f8496', '#b4bfc6'];
  const ROOF_COL = ['#6b6b6b', '#79746f', '#5e5f61', '#8a857f', '#70706a'];
  const chunks = new Map(), CH = 220;
  const chunkOf = c => { const k = Math.floor(c[0] / CH) * 1000 + Math.floor(c[1] / CH); let o = chunks.get(k); if (!o) chunks.set(k, o = { w: new Geo(true), r: new Geo(false) }); return o; };
  const tmpC = new THREE.Color();
  const parseCol = (s, fb) => { const c = new THREE.Color(fb); if (s) { try { const m = /^[0-9a-f]{6}$/i.test(s) ? '#' + s : s; const cc = new THREE.Color(); cc.setStyle(m.replace(/_/g, '')); c.copy(cc); } catch (e) { } } return c; };
  const footprints = [], bvol = [];
  let nB = 0;
  for (const b of bl) {
    const t = b.t;
    if (!b.part && hasParts(b)) continue;
    let isRoof = t.building === 'roof' || t['building:part'] === 'roof' || t.covered === 'yes';
    const lv = num(t['building:levels']), rl = num(t['roof:levels']);
    let h = num(t.height), rh = num(t['roof:height']);
    let minH = num(t.min_height); if (isNaN(minH)) { const ml = num(t['building:min_level']); minH = isNaN(ml) ? 0 : ml * 3.2; }
    const shape = (t['roof:shape'] || 'flat').toLowerCase();
    if (isNaN(rh)) rh = isNaN(rl) ? NaN : rl * 3.2;
    if (isNaN(h)) {
      if (!isNaN(lv)) h = lv * 3.2 + (isNaN(rh) ? 0 : rh);
      else { const bt = t.building || t['building:part']; h = /^(garage|garages|shed|kiosk|carport|hut|toilets|service|container)$/.test(bt) ? 3 : /^(house|detached|semidetached_house|bungalow)$/.test(bt) ? 8 : bt === 'roof' ? 6 : bt === 'church' ? 22 : 14; }
    }
    // zadaszenie, galeria, wiata: część, której wysokość w większości zajmuje dach (roof:height ≥ 70% wysokości części) —
    // rysowana jak dach (bez okien biurowca); np. zadaszone przejścia wzdłuż wiaduktu Chałubińskiego przy Centralnej
    const rhTag = num(t['roof:height']);
    let canopy = false;
    if (!isRoof && !isNaN(rhTag) && h > minH && rhTag >= 0.7 * (h - minH) && isNaN(lv)) { isRoof = true; canopy = true; }
    if (isRoof && (canopy || (isNaN(num(t.min_height)) && isNaN(num(t['building:min_level']))))) minH = Math.max(minH, h - 1.2);   // daszek, nie bryła
    if (h <= minH) h = minH + 1;
    // wymiar do domyślnej wysokości dachu
    let maxR = 0; for (const p of b.outer) maxR = Math.max(maxR, Math.hypot(p[0] - b.c[0], p[1] - b.c[1]));
    const peaked = /^(pyramidal|spire|cone|dome|onion|hipped|conical)$/.test(shape) && b.holes.length === 0 && b.outer.length <= 64;
    if (peaked) { if (isNaN(rh)) rh = shape === 'hipped' ? Math.min(maxR * 0.4, 4) : Math.min(maxR * (shape === 'dome' || shape === 'onion' ? 0.9 : 1.2), (h - minH) * 0.6); }
    else rh = 0;
    rh = Math.min(rh, (h - minH) * 0.95);
    let gmin = 1e9; for (const p of b.outer) gmin = Math.min(gmin, H(p[0], p[1])); gmin = Math.min(gmin, H(b.c[0], b.c[1]));
    // na moście / wiadukcie (layer ≥ 1 nad pomostem): wysokości z OSM liczone od pomostu, nie od ziemi pod nim
    let deck = -1e9; if (num(t.layer) >= 1) for (const p of [b.c, ...b.outer]) { const y = surfaceAt(p[0], p[1], H(p[0], p[1]) + 60); if (y > H(p[0], p[1]) + 2) deck = Math.max(deck, y); }
    // poza wiaduktem layer ≥ 1 znaczy „nad czymś” (np. dworzec Ochota nad wykopem WKD): od poziomu ulicy, bez ścian w dół
    let gmax = -1e9; if (num(t.layer) >= 1 && deck < -1e8) for (const p of b.outer) gmax = Math.max(gmax, H(p[0], p[1]));
    const up = gmax - gmin > 2;   // pod spodem coś głębszego niż ulica (wykop, tory) — inaczej zwykły budynek na zboczu
    const G = deck > -1e8 ? deck : up ? gmax - 0.3 : gmin - 0.3;
    const y0 = G + (minH > 0 ? minH : up ? 0 : -1.5), wallTop = G + h - rh, top = G + h;
    // kolory
    const r1 = hash(Math.abs(b.id) % 2147483647 | 0);
    const tall = h > 45;
    const wc = parseCol(t['building:colour'], (tall ? TALL_COL : DEF_COL)[Math.floor(r1 * (tall ? TALL_COL : DEF_COL).length)]);
    wc.multiplyScalar(0.94 + 0.12 * hash((b.id * 7) | 0));
    const rc = parseCol(t['roof:colour'], ROOF_COL[Math.floor(hash((b.id * 3) | 0) * ROOF_COL.length)]);
    const ch = chunkOf(b.c);
    const WB = isRoof ? null : ch.w;
    // ściany
    const walls = (ring) => {
      let acc = hash((b.id * 11) | 0) * 12;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], c = ring[(i + 1) % ring.length];
        const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.01) continue;
        const nx = dz / len, nz = -dx / len;
        const u0 = acc / 12, u1 = (acc + len) / 12; acc += len;
        const v0 = (y0 - G) / 12.8, v1 = (wallTop - G) / 12.8;
        const T = WB || ch.r, col = isRoof ? rc : wc;
        // kawałki ściany; w miejscu przejazdu bramnego ściana zaczyna się nad prześwitem
        const gaps = passageGaps(a[0], a[1], c[0], c[1]);
        const pieces = [];
        if (!gaps) pieces.push([0, 1, y0]);
        else { let t0 = 0; for (const [g0, g1, hp] of gaps) { if (g0 > t0) pieces.push([t0, g0, y0]); pieces.push([Math.max(t0, g0), g1, Math.max(y0, G + hp)]); t0 = Math.max(t0, g1); } if (t0 < 1) pieces.push([t0, 1, y0]); }
        for (const [ta, tb, yb] of pieces) {
          if (tb - ta < 1e-4 || wallTop - yb < 0.05) continue;
          const ax = a[0] + dx * ta, az = a[1] + dz * ta, bx = a[0] + dx * tb, bz = a[1] + dz * tb;
          const ua = u0 + (u1 - u0) * ta, ub = u0 + (u1 - u0) * tb, vb = (yb - G) / 12.8;
          // na skarpie dół ściany idzie za terenem (nie schodzi do najniższego punktu działki, np. do tunelu)
          const ya = yb === y0 && minH <= 0 && !up ? Math.min(wallTop - 0.5, Math.max(yb, H(ax, az) - 1.5)) : yb, yb2 = yb === y0 && minH <= 0 && !up ? Math.min(wallTop - 0.5, Math.max(yb, H(bx, bz) - 1.5)) : yb;
          const va = (ya - G) / 12.8, vb2 = (yb2 - G) / 12.8;
          const A0 = [ax, ya, az], B0 = [bx, yb2, bz], B1 = [bx, wallTop, bz], A1 = [ax, wallTop, az];
          if (WB) {
            WB.v(...A0, nx, 0, nz, col, ua, va); WB.v(...B1, nx, 0, nz, col, ub, v1); WB.v(...B0, nx, 0, nz, col, ub, vb2);
            WB.v(...A0, nx, 0, nz, col, ua, va); WB.v(...A1, nx, 0, nz, col, ua, v1); WB.v(...B1, nx, 0, nz, col, ub, v1);
          } else {
            T.v(...A0, nx, 0, nz, col); T.v(...B1, nx, 0, nz, col); T.v(...B0, nx, 0, nz, col);
            T.v(...A0, nx, 0, nz, col); T.v(...A1, nx, 0, nz, col); T.v(...B1, nx, 0, nz, col);
          }
          if (minH < 2.5 && !isRoof && yb < G + 2.5) collAdd(ax, az, bx, bz, 0, Math.min(ya, yb2) - 1, top, 'b');
        }
      }
    };
    walls(b.outer); for (const hr of b.holes) walls(hr);
    // dach
    const R_ = ch.r;
    if (peaked && rh > 0.2) {
      const levels = (shape === 'dome' || shape === 'onion') ? [0, 0.38, 0.7, 0.9, 1].map(f => [Math.cos(f * Math.PI / 2), Math.sin(f * Math.PI / 2)]) : shape === 'hipped' ? [[1, 0], [0.35, 1]] : [[1, 0], [0, 1]];
      const lvl = levels.map(([s, k]) => b.outer.map(p => [b.c[0] + (p[0] - b.c[0]) * s, wallTop + rh * k, b.c[1] + (p[1] - b.c[1]) * s]));
      for (let k = 0; k < lvl.length - 1; k++) {
        const L0 = lvl[k], L1 = lvl[k + 1];
        for (let i = 0; i < L0.length; i++) { const j = (i + 1) % L0.length; R_.tri(L0[i], L0[j], L1[j], rc, 1); R_.tri(L0[i], L1[j], L1[i], rc, 1); }
      }
      const last = lvl[lvl.length - 1];
      if (levels[levels.length - 1][0] > 0.01) { const v2 = last.map(p => new THREE.Vector2(p[0], p[2])); const f = THREE.ShapeUtils.triangulateShape(v2, []); for (const [a, c, d] of f) R_.tri(last[a], last[c], last[d], rc, 1); }
    } else {
      const v2 = b.outer.map(p => new THREE.Vector2(p[0], p[1])), hs = b.holes.map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
      const all = b.outer.concat(...b.holes);
      let faces = []; try { faces = THREE.ShapeUtils.triangulateShape(v2, hs); } catch (e) { }
      const rcol = tmpC.copy(rc);
      for (const [a, c, d] of faces) R_.tri([all[a][0], top, all[a][1]], [all[c][0], top, all[c][1]], [all[d][0], top, all[d][1]], rcol, 1);
      if (minH > 2) for (const [a, c, d] of faces) R_.tri([all[a][0], y0, all[a][1]], [all[c][0], y0, all[c][1]], [all[d][0], y0, all[d][1]], wc, -1);
    }
    if (minH < 2.5 && !isRoof) footprints.push(b);
    bvol.push({ outer: b.outer, y0, top, roof: isRoof, id: b.id, c: b.c });   // bryły (doktor mapy: budynki przecinające wiadukty)
    nB++;
  }
  const bGroup = new THREE.Group();
  for (const ch of chunks.values()) {
    if (ch.w.p.length) { const m = new THREE.Mesh(ch.w.build(), wallMat); m.castShadow = m.receiveShadow = true; bGroup.add(m); }
    if (ch.r.p.length) { const m = new THREE.Mesh(ch.r.build(), roofMat); m.castShadow = m.receiveShadow = true; bGroup.add(m); }
  }
  scene.add(bGroup);
  // cień kontaktowy budynków na gruncie
  g.lineJoin = 'round';
  for (const b of footprints) { g.beginPath(); pathPoly([b.outer]); g.strokeStyle = 'rgba(30,30,28,0.35)'; g.lineWidth = 2.2 * sc; g.stroke(); g.fillStyle = '#6f6e69'; g.fill(); }
  // test "czy punkt jest w budynku"
  const fIdx = new Map(), FC = 60;
  for (const b of footprints) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of b.outer) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    for (let i = Math.floor(x0 / FC); i <= Math.floor(x1 / FC); i++) for (let j = Math.floor(z0 / FC); j <= Math.floor(z1 / FC); j++) { const k = i * 100003 + j; let a = fIdx.get(k); if (!a) fIdx.set(k, a = []); a.push(b); }
  }
  W.inBuilding = (x, z) => { const a = fIdx.get(Math.floor(x / FC) * 100003 + Math.floor(z / FC)); return !!a && a.some(b => pip([x, z], b.outer)); };
  const aIdx = new Map();
  for (const b of bl) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of b.outer) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } for (let i = Math.floor(x0 / FC); i <= Math.floor(x1 / FC); i++) for (let j = Math.floor(z0 / FC); j <= Math.floor(z1 / FC); j++) { const k = i * 100003 + j; let a = aIdx.get(k); if (!a) aIdx.set(k, a = []); a.push(b); } }
  W.inAnyBuilding = (x, z) => { const a = aIdx.get(Math.floor(x / FC) * 100003 + Math.floor(z / FC)); return !!a && a.some(b => pip([x, z], b.outer)); };   // także części podwieszone (doktor mapy)
  // przejazdy bramne: nawierzchnia na wierzchu + ściany i strop wewnątrz budynku
  const PG = STR.G, PASS_C = new THREE.Color('#8f877a'), PASS_CEIL = new THREE.Color('#6d675e');
  for (const l of lines) if (l.passage && l.samples) {
    strokePts(l.pts, l.wd, l.net === 'road' ? '#45474a' : (FOOT[l.hw] || '#bdb5a6'));
    const S = l.samples, hw = Math.min(5, Math.max(1.4, l.wd / 2 + (l.net === 'road' ? 0.6 : 0.2))), hp = l.net === 'road' ? 4.2 : 3.0;
    for (let i = 0; i < S.length - 1; i++) {
      const mx = (S[i][0] + S[i + 1][0]) / 2, mz = (S[i][1] + S[i + 1][1]) / 2; if (!W.inBuilding(mx, mz)) continue;
      const r = [-(S[i + 1][1] - S[i][1]), S[i + 1][0] - S[i][0]], rl = Math.hypot(r[0], r[1]) || 1; r[0] /= rl; r[1] /= rl;
      const y0 = Math.min(S[i][2], S[i + 1][2]) - 0.3, y1 = y0 + 0.3 + hp;
      for (const sd of [-1, 1]) {
        const A = [S[i][0] + r[0] * sd * hw, y0, S[i][1] + r[1] * sd * hw], B = [S[i + 1][0] + r[0] * sd * hw, y0, S[i + 1][1] + r[1] * sd * hw];
        PG.tube.tri(A, B, [B[0], y1, B[2]], PASS_C, [-r[0] * sd, 0, -r[1] * sd]); PG.tube.tri(A, [B[0], y1, B[2]], [A[0], y1, A[2]], PASS_C, [-r[0] * sd, 0, -r[1] * sd]);
        collAdd(A[0], A[2], B[0], B[2], 0, y0 - 1, y1, 'g');
      }
      const c = [[S[i][0] - r[0] * hw, y1, S[i][1] - r[1] * hw], [S[i][0] + r[0] * hw, y1, S[i][1] + r[1] * hw], [S[i + 1][0] + r[0] * hw, y1, S[i + 1][1] + r[1] * hw], [S[i + 1][0] - r[0] * hw, y1, S[i + 1][1] - r[1] * hw]];
      PG.tube.tri(c[0], c[1], c[2], PASS_CEIL, -1); PG.tube.tri(c[0], c[2], c[3], PASS_CEIL, -1);
    }
  }
  // meshe konstrukcji
  const sGroup = new THREE.Group();
  const addG = (geo, mat, cast) => { if (!geo.p.length) return; const m = new THREE.Mesh(geo.build(), mat); m.castShadow = cast; m.receiveShadow = true; sGroup.add(m); return m; };
  for (const k in STR.G.deck) addG(STR.G.deck[k], deckMat[k], true);
  addG(STR.G.conc, concMat, true); addG(STR.G.tube, tubeMat, true); addG(STR.G.lamp, lampMat, false);
  scene.add(sGroup);
  W.nTrains = buildTrains(lines);

  /* ---------------- maska (drzewa nie na jezdni i nie w budynkach) ---------------- */
  const MS = 1024, ms = MS / (2 * E), mc = document.createElement('canvas'); mc.width = mc.height = MS; const mg = mc.getContext('2d');
  mg.fillStyle = '#fff'; mg.fillRect(0, 0, MS, MS); mg.strokeStyle = '#000'; mg.fillStyle = '#000'; mg.lineCap = mg.lineJoin = 'round';
  for (const l of lines) { if (!l.pts || !l.ground || l.net === 'subway' || (l.hw && FOOT[l.hw] && l.hw !== 'pedestrian')) continue; mg.beginPath(); l.pts.forEach((p, i) => i ? mg.lineTo((p[0] + E) * ms, (p[1] + E) * ms) : mg.moveTo((p[0] + E) * ms, (p[1] + E) * ms)); mg.lineWidth = Math.max(1, ((l.wd || 4) + 2) * ms); mg.stroke(); }
  for (const b of footprints) { mg.beginPath(); b.outer.forEach((p, i) => i ? mg.lineTo((p[0] + E) * ms, (p[1] + E) * ms) : mg.moveTo((p[0] + E) * ms, (p[1] + E) * ms)); mg.closePath(); mg.fill(); }
  for (const [, col, a] of areaFills) if (col === '#3e6b8a' || col === '#55575a' || col === '#c4bcad') { mg.beginPath(); for (const r of a.outers) { r.forEach((p, i) => i ? mg.lineTo((p[0] + E) * ms, (p[1] + E) * ms) : mg.moveTo((p[0] + E) * ms, (p[1] + E) * ms)); mg.closePath(); } mg.fill(); }
  const md = mg.getImageData(0, 0, MS, MS).data;
  const free = (x, z) => { const i = Math.floor((x + E) * ms), j = Math.floor((z + E) * ms); if (i < 0 || j < 0 || i >= MS || j >= MS) return false; return md[(j * MS + i) * 4] > 128; };

  /* ---------------- drzewa ---------------- */
  status('Sadzę drzewa…', 0.8);
  const trees = [];
  for (const [lat, lon] of D.trees) { const [x, z] = toXZ(lat, lon); if (Math.abs(x) < E - 20 && Math.abs(z) < E - 20) trees.push([x, z, 1]); }
  for (const w of D.ways) if (w.t && w.t.natural === 'tree_row') {
    const p = wayXZ(w);
    for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < L; s += 9) { const x = a[0] + (b[0] - a[0]) * s / L, z = a[1] + (b[1] - a[1]) * s / L; if (free(x, z)) trees.push([x, z, 1]); } }
  }
  for (const a of areas) {
    const t = a.t; let dens = 0;
    if (t.landuse === 'forest' || t.natural === 'wood') dens = 1 / 70; else if (t.leisure === 'park') dens = 1 / 260; else if (t.leisure === 'garden') dens = 1 / 400; else if (t.landuse === 'cemetery') dens = 1 / 150; else if (t.natural === 'scrub') dens = 1 / 200;
    if (!dens) continue;
    for (const o of a.outers) {
      const A = Math.abs(ringArea(o)); let n = Math.min(4000, Math.round(A * dens)); if (n < 1) continue;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of o) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      let tries = n * 6;
      while (n > 0 && tries-- > 0) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (!pip([x, z], o) || a.inners.some(r => pip([x, z], r)) || !free(x, z)) continue; trees.push([x, z, 0]); n--; }
    }
  }
  if (trees.length > 30000) trees.length = 30000;
  const trunkG = new THREE.CylinderGeometry(0.16, 0.24, 1, 6); trunkG.translate(0, 0.5, 0);
  const crownG = new THREE.IcosahedronGeometry(1, 1);
  const crownC = new THREE.IcosahedronGeometry(1, 0);
  const trunkM = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 }), trees.length);
  const crownM = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), trees.length);
  const crownM2 = new THREE.InstancedMesh(crownC, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), trees.length);
  const TREE_COLS = ['#4f7a35', '#5e8a3c', '#46702f', '#6b9343', '#3f6a2c', '#7c9a3a', '#a7932f', '#b9772c', '#8f8a32'].map(c => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  trees.forEach(([x, z], i) => {
    const y = H(x, z), r0 = rnd(), ht = 7 + r0 * 8, cr = 2 + rnd() * 2.2 + ht * 0.08, rot = rnd() * 6.28;
    q.setFromAxisAngle(up, rot);
    m4.compose(pv.set(x, y - 0.2, z), q, sv.set(1 + ht * 0.04, ht * 0.62, 1 + ht * 0.04)); trunkM.setMatrixAt(i, m4);
    m4.compose(pv.set(x, y + ht * 0.62, z), q, sv.set(cr, cr * 1.15, cr)); crownM.setMatrixAt(i, m4);
    m4.compose(pv.set(x + (rnd() - 0.5) * cr * 0.6, y + ht * 0.62 + cr * 0.55, z + (rnd() - 0.5) * cr * 0.6), q, sv.set(cr * 0.7, cr * 0.8, cr * 0.7)); crownM2.setMatrixAt(i, m4);
    const c = TREE_COLS[Math.floor(rnd() * TREE_COLS.length)].clone().multiplyScalar(0.85 + rnd() * 0.3);
    crownM.setColorAt(i, c); crownM2.setColorAt(i, c.multiplyScalar(1.12));
    collAdd(x, z, x, z, 0.45, y - 1, y + 12, 't');
  });
  // drzewa przy kamerze są wycinane (żeby nie zasłaniały auta)
  for (const m of [trunkM, crownM, crownM2]) m.material.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('void main() {', 'void main() {\n  if (distance(vWP, cameraPosition) < 7.0) discard;');
  };
  for (const m of [trunkM, crownM, crownM2]) { m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); }

  /* ---------------- teren ---------------- */
  status('Rzeźbię teren…', 0.88);
  const tex = new THREE.CanvasTexture(gc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const tg = new THREE.PlaneGeometry(2 * E, 2 * E, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const pa = tg.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, HF ? HF[i] : 0); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97 })); terrain.receiveShadow = true; scene.add(terrain);
  // tło poza mapą: ramka wokół kwadratu terenu (nie przykrywa niższych miejsc w środku)
  const fr = new THREE.Shape([new THREE.Vector2(-20000, -20000), new THREE.Vector2(20000, -20000), new THREE.Vector2(20000, 20000), new THREE.Vector2(-20000, 20000)]);
  fr.holes.push(new THREE.Path([new THREE.Vector2(-E + 1, -E + 1), new THREE.Vector2(-E + 1, E - 1), new THREE.Vector2(E - 1, E - 1), new THREE.Vector2(E - 1, -E + 1)]));
  const skirt = new THREE.Mesh(new THREE.ShapeGeometry(fr).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7f8274', roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
  W.xrayMats = [terrain.material, skirt.material]; W.crowns = [trunkM, crownM, crownM2];
  // kilka metrów pod gruntem kafli (ten jest ok. 0,3 m pod terenem): przy 8 cm różnicy z daleka (samolot) grunt kafli i tło migały na zmianę
  skirt.position.y = (W.terrBase || 0) - 4; skirt.receiveShadow = true; scene.add(skirt);

  /* ---------------- drogi do nawigacji / nazw ---------------- */
  for (const l of veh) { const nm = l.t.name || ''; for (let i = 0; i < l.pts.length - 1; i++) roadAdd(l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1], nm, l.wd); }
  W.veh = veh;
  // etykiety ulic na dużą mapę: najdłuższy odcinek każdej nazwanej ulicy
  const lab = new Map();
  for (const l of veh) { const nm = l.t.name; if (!nm || l.rank < 2) continue; for (let i = 0; i < l.pts.length - 1; i++) { const a = l.pts[i], b = l.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); const cur = lab.get(nm); if ((!cur || L > cur.L) && L > 40) lab.set(nm, { L, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), rank: l.rank }); } }
  W.labels = [...lab.entries()].map(([nm, v]) => ({ nm, ...v }));

  /* ---------------- minimapa ---------------- */
  const OV = 1024, ov = document.createElement('canvas'); ov.width = ov.height = OV; const og = ov.getContext('2d');
  og.drawImage(gc, 0, 0, OV, OV);
  const os = OV / (2 * E); og.fillStyle = '#4b4741';
  for (const b of footprints) { og.beginPath(); b.outer.forEach((p, i) => i ? og.lineTo((p[0] + E) * os, (p[1] + E) * os) : og.moveTo((p[0] + E) * os, (p[1] + E) * os)); og.closePath(); og.fill(); }
  W.ov = ov; W.os = os;
  W.footprints = footprints; W.bvol = bvol;
  W.stats = { buildings: nB, trees: trees.length, roads: veh.length, areas: areas.length, tex: S, ...W.structStats, trains: W.nTrains, terrain: W.terrSrc };
  return W.stats;
}
