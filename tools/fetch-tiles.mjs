// Kafle mapy całej Warszawy (1 km × 1 km, js/tiles.mjs) do wczytywania w trakcie gry. Uruchamiane w GitHub Actions.
// Pobiera z Overpass blokami 2 × 2 km, najpierw wzdłuż trasy centrum — Okęcie, potem coraz dalej. Kafle już zapisane
// (np. z cache poprzedniego deployu) są pomijane, więc kolejne deploye dopełniają mapę; limit czasu jednego uruchomienia:
// TILE_MINUTES (domyślnie 25). Na końcu zapisuje tiles/index.json (lista gotowych kafli).
// Test bez sieci: node tools/fetch-tiles.mjs --from plik-osm.json [dx dz]  (dane w formacie gry v2, przesunięte o dx, dz metrów)
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { WARSAW, T, key, tileBBox, overpassQuery, tilesFromElements, toG, KX, KY, G0 } from '../js/tiles.mjs';

const DIR = 'tiles'; mkdirSync(DIR, { recursive: true });
const UA = 'CityExplorer-build/1.0 (+https://github.com/michalstankiewicz4-cell/CityExplorer)';
const END = Date.now() + (+(process.env.TILE_MINUTES || 25)) * 60000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const save = (tiles) => { for (const [k, t] of tiles) writeFileSync(`${DIR}/${k}.json`, JSON.stringify(t)); };

if (process.argv[2] === '--from') {   // tryb testowy: kafle z pliku danych gry
  const D = JSON.parse(readFileSync(process.argv[3], 'utf8')), dx = +(process.argv[4] || 0), dz = +(process.argv[5] || 0);
  const m = D.meta, osm = D.osm, KXm = 111320 * Math.cos(m.lat * Math.PI / 180);
  const [gx0, gz0] = toG(m.lat, m.lon);
  const geo = (id) => { const p = osm.nodes[id]; if (!p) return null; const x = (p[1] - m.lon) * KXm + gx0 + dx, z = -(p[0] - m.lat) * KY + gz0 + dz; return { lat: G0.lat - z / KY, lon: G0.lon + x / KX }; };
  const W = new Map(osm.ways.map(w => [w.id, w]));
  const els = osm.ways.filter(w => w.t).map(w => ({ type: 'way', tags: w.t, geometry: w.n.map(geo) }))
    .concat(osm.rels.map(r => ({ type: 'relation', tags: r.t, members: r.m.map(([id, role]) => ({ type: 'way', role, geometry: W.has(id) ? W.get(id).n.map(geo) : null })) })));
  const keys = new Set(); for (const e of els) for (const g of (e.geometry || e.members.flatMap(x => x.geometry || []))) if (g) { const [x, z] = toG(g.lat, g.lon); keys.add(key(Math.floor(x / T), Math.floor(z / T))); }
  save(tilesFromElements(els, keys));
} else {
  // bloki 2×2 kafle; kolejność: odległość od odcinka centrum (0,0) — Okęcie
  const [ox, oz] = toG(52.1657, 20.9671), seg = (x, z) => { const L2 = ox * ox + oz * oz, f = Math.max(0, Math.min(1, (x * ox + z * oz) / L2)); return Math.hypot(x - ox * f, z - oz * f); };
  const blocks = [];
  for (let i = WARSAW.i0; i <= WARSAW.i1; i += 2) for (let j = WARSAW.j0; j <= WARSAW.j1; j += 2) blocks.push([i, j, seg((i + 1) * T, (j + 1) * T)]);
  blocks.sort((a, b) => a[2] - b[2]);
  const EP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  let done = 0, skip = 0, fail = 0;
  for (const [i, j] of blocks) {
    if (Date.now() > END) { console.log('Limit czasu — reszta przy następnym deployu'); break; }
    const keys = new Set([key(i, j), key(i + 1, j), key(i, j + 1), key(i + 1, j + 1)]);
    if ([...keys].every(k => existsSync(`${DIR}/${k}.json`))) { skip++; continue; }
    let ok = false;
    for (let a = 0; a < EP.length * 2 && !ok; a++) {
      const url = EP[a % EP.length];
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(overpassQuery(tileBBox(i, j, 2))), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, signal: AbortSignal.timeout(150000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const js = await r.json(); if (js.remark && /runtime error|timed out/i.test(js.remark)) throw new Error(js.remark);
        save(tilesFromElements(js.elements || [], keys)); ok = true; done++;
        console.log(`blok ${i},${j}: ${(js.elements || []).length} elementów (${url.split('/')[2]})`);
      } catch (e) { console.warn(`blok ${i},${j}`, url.split('/')[2], e.message); await sleep(4000 * (a + 1)); }
    }
    if (!ok) fail++;
    await sleep(1200);
  }
  console.log(`bloki: pobrane ${done}, gotowe wcześniej ${skip}, nieudane ${fail}, wszystkich ${blocks.length}`);
}
const have = readdirSync(DIR).filter(f => /^-?\d+_-?\d+\.json$/.test(f)).map(f => f.slice(0, -5));
writeFileSync(`${DIR}/index.json`, JSON.stringify({ T, G0, keys: have }));
console.log(`tiles/index.json: ${have.length} kafli`);
