// Pobiera dane OSM dla obszaru gry i zapisuje warszawa-centrum.json (uruchamiane w GitHub Actions).
// Logika filtrowania musi być zgodna z sekcją "DANE OSM" w index.html.
// Użycie: node tools/fetch-osm.mjs [lat] [lon] [r]
import { writeFileSync } from 'node:fs';

const lat0 = +(process.argv[2] || 52.23175), lon0 = +(process.argv[3] || 21.00586), R = +(process.argv[4] || 1000);
const E = R + 150;
const KX = 111320 * Math.cos(lat0 * Math.PI / 180), KY = 110574;
const toLL = (x, z) => [lat0 - z / KY, lon0 + x / KX];
const [s, w] = toLL(-E, E), [n, e] = toLL(E, -E);
const BBOX = { s, w, n, e };
const UA = 'CityExplorer-build/1.0 (+https://github.com/michalstankiewicz4-cell/CityExplorer)';

const TAGS = new Set(['building', 'building:part', 'height', 'min_height', 'building:levels', 'building:min_level', 'roof:shape', 'roof:height', 'roof:levels',
  'building:colour', 'roof:colour', 'highway', 'lanes', 'width', 'railway', 'natural', 'leisure', 'landuse', 'water', 'waterway', 'amenity', 'parking', 'area',
  'area:highway', 'layer', 'bridge', 'tunnel', 'name', 'footway', 'crossing', 'oneway', 'service', 'place', 'location', 'covered', 'type', 'indoor', 'level']);
const pick = t => { if (!t) return undefined; const o = {}; let k = 0; for (const a in t) if (TAGS.has(a)) { o[a] = t[a]; k++; } return k ? o : undefined; };
const relevantWay = t => !!t && !!(t.building || t['building:part'] || t.highway || t['area:highway'] || t.railway || t.natural || t.leisure || t.landuse || t.waterway || t.amenity === 'parking' || t.place === 'square');
function relevantRel(t) {
  if (!t || t.type !== 'multipolygon') return false;
  return !!(t.building || t['building:part'] || /^(park|garden|pitch|playground)$/.test(t.leisure || '') ||
    /^(forest|grass|meadow|recreation_ground|village_green|cemetery|construction|railway)$/.test(t.landuse || '') ||
    /^(wood|water|scrub|grassland)$/.test(t.natural || '') || t.amenity === 'parking' || t['area:highway'] || t.place === 'square' || t.highway === 'pedestrian');
}
const nodes = new Map(), ways = new Map(), rels = new Map();
const add = els => { for (const x of els) (x.type === 'node' ? nodes : x.type === 'way' ? ways : rels).set(x.id, x); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function overpass() {
  const b = `${BBOX.s.toFixed(6)},${BBOX.w.toFixed(6)},${BBOX.n.toFixed(6)},${BBOX.e.toFixed(6)}`;
  const q = `[out:json][timeout:120][bbox:${b}];(nwr["building"];nwr["building:part"];way["highway"];way["area:highway"];way["railway"];node["natural"="tree"];way["natural"];rel["natural"~"^(wood|scrub)$"];way["leisure"];rel["leisure"~"^(park|garden)$"];way["landuse"];rel["landuse"~"^(forest|grass|recreation_ground|cemetery)$"];way["waterway"];way["amenity"="parking"];rel["amenity"="parking"];way["place"="square"];rel["place"="square"];rel["highway"="pedestrian"];);(._;>;);out body qt;`;
  for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, signal: AbortSignal.timeout(150000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); if (!j.elements || j.elements.length < 50) throw new Error('pusta odpowiedź');
      add(j.elements); console.log('Overpass OK', url, j.elements.length); return true;
    } catch (err) { console.warn('Overpass', url, err.message); }
  }
  return false;
}
async function osmApi() {
  const DX = 0.0085, DY = 0.0055, nx = Math.ceil((BBOX.e - BBOX.w) / DX), ny = Math.ceil((BBOX.n - BBOX.s) / DY);
  const tile = async (b, depth) => {
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${b.w.toFixed(6)},${b.s.toFixed(6)},${b.e.toFixed(6)},${b.n.toFixed(6)}`;
    for (let a = 0; a < 4; a++) {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) }).catch(() => null);
      if (r && r.ok) { add((await r.json()).elements); return; }
      if (r && r.status === 400 && depth < 3) { const mx = (b.w + b.e) / 2, my = (b.s + b.n) / 2; for (const q of [{ w: b.w, e: mx, s: b.s, n: my }, { w: mx, e: b.e, s: b.s, n: my }, { w: b.w, e: mx, s: my, n: b.n }, { w: mx, e: b.e, s: my, n: b.n }]) await tile(q, depth + 1); return; }
      await sleep(3000 * (a + 1));
    }
    throw new Error('OSM API failed ' + url);
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    await tile({ w: BBOX.w + i * (BBOX.e - BBOX.w) / nx, e: BBOX.w + (i + 1) * (BBOX.e - BBOX.w) / nx, s: BBOX.s + j * (BBOX.n - BBOX.s) / ny, n: BBOX.s + (j + 1) * (BBOX.n - BBOX.s) / ny }, 0);
    console.log('OSM API tile', j * nx + i + 1, '/', nx * ny);
  }
}

if (!(await overpass())) await osmApi();
const R_ = [], needW = new Set();
for (const r of rels.values()) { if (!relevantRel(r.tags)) continue; const m = r.members.filter(m => m.type === 'way').map(m => [m.ref, m.role || '']); R_.push({ id: r.id, t: pick(r.tags), m }); m.forEach(x => needW.add(x[0])); }
const W_ = [], needN = new Set();
for (const x of ways.values()) { const rel = relevantWay(x.tags); if (!rel && !needW.has(x.id)) continue; W_.push({ id: x.id, t: rel ? pick(x.tags) : undefined, n: x.nodes }); for (const k of x.nodes) needN.add(k); }
const N_ = {}, trees = [];
for (const x of nodes.values()) { if (needN.has(x.id)) N_[x.id] = [+x.lat.toFixed(7), +x.lon.toFixed(7)]; if (x.tags && x.tags.natural === 'tree') trees.push([+x.lat.toFixed(7), +x.lon.toFixed(7)]); }
const out = { meta: { lat: lat0, lon: lon0, R, SEG: null, created: new Date().toISOString(), attribution: '© OpenStreetMap contributors (ODbL)' }, osm: { v: 2, nodes: N_, ways: W_, rels: R_, trees }, terrain: null };
const outName = R === 1000 ? 'warszawa-centrum.json' : `warszawa-r${R}.json`;
writeFileSync(outName, JSON.stringify(out));
console.log(`Zapisano ${outName}: ${W_.length} dróg/obszarów, ${R_.length} relacji, ${trees.length} drzew`);
