// Warszawa 3D — Dane OpenStreetMap: filtr znaczników, Overpass, API OSM (kafle), plik z deployu.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   DANE OSM
   ========================================================================= */
const TAGS = new Set(['building', 'building:part', 'height', 'min_height', 'building:levels', 'building:min_level', 'roof:shape', 'roof:height', 'roof:levels',
  'building:colour', 'roof:colour', 'highway', 'lanes', 'width', 'railway', 'natural', 'leisure', 'landuse', 'water', 'waterway', 'amenity', 'parking', 'area',
  'area:highway', 'layer', 'bridge', 'tunnel', 'name', 'footway', 'crossing', 'oneway', 'service', 'place', 'location', 'covered', 'type', 'indoor', 'level', 'aeroway', 'ref', 'surface']);
const pick = t => { if (!t) return undefined; const o = {}; let k = 0; for (const a in t) if (TAGS.has(a)) { o[a] = t[a]; k++; } return k ? o : undefined; };
function relevantWay(t) {
  if (!t) return false;
  return !!(t.building || t['building:part'] || t.highway || t['area:highway'] || t.railway || t.natural || t.leisure || t.landuse || t.waterway || t.amenity === 'parking' || t.place === 'square' || t.aeroway);
}
function relevantRel(t) {
  if (!t || t.type !== 'multipolygon') return false;
  return !!(t.building || t['building:part'] || /^(park|garden|pitch|playground)$/.test(t.leisure || '') ||
    /^(forest|grass|meadow|recreation_ground|village_green|cemetery|construction|railway)$/.test(t.landuse || '') ||
    /^(wood|water|scrub|grassland)$/.test(t.natural || '') || t.amenity === 'parking' || t['area:highway'] || t.place === 'square' || t.highway === 'pedestrian' || /^(aerodrome|apron|runway|taxiway)$/.test(t.aeroway || ''));
}
class OsmStore {
  constructor() { this.nodes = new Map(); this.ways = new Map(); this.rels = new Map(); }
  add(els) { for (const e of els) { if (e.type === 'node') this.nodes.set(e.id, e); else if (e.type === 'way') this.ways.set(e.id, e); else if (e.type === 'relation') this.rels.set(e.id, e); } }
  compact() {
    const rels = [], needW = new Set();
    for (const r of this.rels.values()) {
      if (!relevantRel(r.tags)) continue;
      const m = r.members.filter(m => m.type === 'way').map(m => [m.ref, m.role || '']);
      rels.push({ id: r.id, t: pick(r.tags), m }); m.forEach(x => needW.add(x[0]));
    }
    const ways = [], needN = new Set();
    for (const w of this.ways.values()) {
      const rel = relevantWay(w.tags); if (!rel && !needW.has(w.id)) continue;
      ways.push({ id: w.id, t: rel ? pick(w.tags) : undefined, n: w.nodes }); for (const n of w.nodes) needN.add(n);
    }
    const nodes = {}, trees = [];
    for (const n of this.nodes.values()) {
      if (needN.has(n.id)) nodes[n.id] = [+n.lat.toFixed(7), +n.lon.toFixed(7)];
      if (n.tags && n.tags.natural === 'tree') trees.push([+n.lat.toFixed(7), +n.lon.toFixed(7)]);
    }
    return { v: 2, nodes, ways, rels, trees };
  }
}

async function fetchOverpass() {
  const b = `${BBOX.s.toFixed(6)},${BBOX.w.toFixed(6)},${BBOX.n.toFixed(6)},${BBOX.e.toFixed(6)}`;
  const q = `[out:json][timeout:120][bbox:${b}];(nwr["building"];nwr["building:part"];way["highway"];way["area:highway"];way["railway"];node["natural"="tree"];way["natural"];rel["natural"~"^(wood|scrub)$"];way["leisure"];rel["leisure"~"^(park|garden)$"];way["landuse"];rel["landuse"~"^(forest|grass|recreation_ground|cemetery)$"];way["waterway"];way["amenity"="parking"];rel["amenity"="parking"];way["place"="square"];rel["place"="square"];rel["highway"="pedestrian"];way["aeroway"];rel["aeroway"];);(._;>;);out body qt;`;
  for (const url of OVERPASS) {
    try {
      status(`Pobieram dane OSM (Overpass: ${new URL(url).host})…`, 0.08);
      const r = await fetchT(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 30000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); if (!j.elements || j.elements.length < 50) throw new Error('pusta odpowiedź');
      const st = new OsmStore(); st.add(j.elements); return st.compact();
    } catch (e) { console.warn('Overpass', url, e); }
  }
  return null;
}

async function fetchOsmApi() {
  const DX = 0.0085, DY = 0.0055;
  const nx = Math.ceil((BBOX.e - BBOX.w) / DX), ny = Math.ceil((BBOX.n - BBOX.s) / DY);
  const tiles = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const w = BBOX.w + i * (BBOX.e - BBOX.w) / nx, e = BBOX.w + (i + 1) * (BBOX.e - BBOX.w) / nx;
    const s = BBOX.s + j * (BBOX.n - BBOX.s) / ny, n = BBOX.s + (j + 1) * (BBOX.n - BBOX.s) / ny;
    tiles.push({ w, s, e, n });
  }
  const st = new OsmStore(); let done = 0, total = tiles.length;
  async function getTile(b, depth) {
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${b.w.toFixed(6)},${b.s.toFixed(6)},${b.e.toFixed(6)},${b.n.toFixed(6)}`;
    let r = null;
    for (let a = 0; a < 4; a++) {
      try {
        r = await fetchT(url, {}, 60000);
        if (r.ok) break;
        if (r.status === 400 && depth < 3) {   // za dużo węzłów -> dzielimy na 4
          total += 3; const mx = (b.w + b.e) / 2, my = (b.s + b.n) / 2;
          for (const q of [{ w: b.w, e: mx, s: b.s, n: my }, { w: mx, e: b.e, s: b.s, n: my }, { w: b.w, e: mx, s: my, n: b.n }, { w: mx, e: b.e, s: my, n: b.n }]) await getTile(q, depth + 1);
          return;
        }
        await sleep(2500 * (a + 1));
      } catch (e) { await sleep(2000 * (a + 1)); }
    }
    if (!r || !r.ok) throw new Error('OSM API: ' + (r ? r.status : 'brak połączenia'));
    const j = await r.json(); st.add(j.elements);
    done++; status(`Pobieram dane OSM (api.openstreetmap.org) — kafel ${done}/${total}`, 0.05 + 0.45 * done / total);
  }
  const queue = tiles.slice();
  await Promise.all([0, 1, 2].map(async () => { while (queue.length) await getTile(queue.shift(), 0); }));
  return st.compact();
}

async function loadLocalFile() {
  if (location.protocol === 'file:') return null;
  try {
    if (!AREA.file) return null; const r = await fetchT(AREA.file, {}, 40000); if (!r.ok) return null;
    const j = await r.json();
    if (!j.meta || Math.abs(j.meta.lat - CENTER.lat) > 1e-4 || Math.abs(j.meta.lon - CENTER.lon) > 1e-4 || j.meta.R !== R) return null;
    return j;
  } catch (e) { return null; }
}
