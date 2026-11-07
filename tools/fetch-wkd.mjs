// Trasa WKD Śródmieście → Pruszków z OSM (prawdziwa geometria torów, 1:1) → data/wkd.json.
// Użycie: node tools/fetch-wkd.mjs            — pobiera z Overpass i zapisuje data/wkd.json
//         node tools/fetch-wkd.mjs plik.json  — z zapisanej odpowiedzi Overpass (out body + węzły)
// Wynik: jeden ciąg toru (jeden z dwóch torów linii, ten, którym jedzie się na zachód), od czoła na Śródmieściu WKD
// do Pruszkowa WKD (+ zapas za peronem), punkty w stopniach × 1e6 zapisane przyrostami, warstwa każdego punktu
// (-1 tunel / wykop pod ziemią, 0 teren, 1 most / wiadukt) i przystanki z odległością od początku.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const BBOX = '52.09,20.60,52.245,21.02';
const Q = `[out:json][timeout:120];(way["railway"~"rail|light_rail"]["name"~"Dojazdowa|WKD"](${BBOX});way["railway"~"rail|light_rail"]["operator"~"WKD|Dojazdowa"](${BBOX}););(._;>;);out body;` +
  `node["railway"~"station|halt|stop"]["network"~"WKD|Dojazdowa"](${BBOX});out;node["railway"~"station|halt|stop"]["name"~"WKD"](${BBOX});out;`;
const FROM = 'Warszawa Śródmieście WKD', TO = 'Pruszków WKD', TAIL = 180;   // m za peronem końcowym

async function load() {
  if (process.argv[2]) return JSON.parse(readFileSync(process.argv[2], 'utf8'));
  for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(Q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'CityExplorer-game/1.0' } });
      if (r.ok) return await r.json();
      console.warn(url, r.status);
    } catch (e) { console.warn(url, e.message); }
  }
  throw new Error('Overpass niedostępny');
}

const j = await load();
const N = new Map(), ways = [], st = new Map();
for (const e of j.elements) {
  if (e.type === 'node' && e.lat != null) N.set(e.id, e);
  if (e.type === 'node' && e.tags && /station|halt|stop/.test(e.tags.railway || '') && e.tags.name) {
    const name = e.tags.name.replace('Środmieście', 'Śródmieście');
    if (!st.has(name) || e.tags.railway === 'station') st.set(name, { name, lat: e.lat, lon: e.lon });
  }
}
// tylko główna linia (bez bocznic, rozjazdów i torów postojowych)
for (const e of j.elements) if (e.type === 'way' && e.tags && !e.tags.service && e.nodes && e.nodes.length > 1) ways.push(e);
// płaskie metry wokół PKiN (jak w grze: toXZ)
const LAT0 = 52.23175, LON0 = 21.00586, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110540;
const xz = (n) => [(n.lon - LON0) * KX, -(n.lat - LAT0) * KZ];
const layerOf = (t) => t.tunnel === 'yes' || t.covered === 'yes' || (+t.layer < 0 && (t.cutting === 'yes' || +t.level < 0)) ? -1 : (t.bridge && t.bridge !== 'no') ? 1 : 0;

// ciąg: od węzła najbliższego Śródmieściu WKD na zachód, na rozgałęzieniach — najprostsza kontynuacja
const ends = new Map(); for (const w of ways) for (const [id, first] of [[w.nodes[0], true], [w.nodes[w.nodes.length - 1], false]]) { (ends.get(id) || ends.set(id, []).get(id)).push({ w, first }); }
const S0 = st.get(FROM), S1 = st.get(TO); if (!S0 || !S1) throw new Error('brak przystanku ' + (!S0 ? FROM : TO));
const P0 = xz(S0), P1 = xz(S1);
// początek: ślepy koniec toru (kozioł oporowy) przy Śródmieściu WKD — najdalej na wschód w promieniu 400 m od stacji
const deg = new Map(); for (const e of j.elements) if (e.type === 'way' && e.nodes) for (const id of e.nodes) deg.set(id, (deg.get(id) || 0) + 1);
let best = null;
for (const [id, a] of ends) { if (deg.get(id) !== 1) continue; const p = xz(N.get(id)), d = Math.hypot(p[0] - P0[0], p[1] - P0[1]); if (d < 400 && (!best || p[0] > best.x)) best = { id, d, a, x: p[0] }; }
if (!best) for (const [id, a] of ends) { const p = xz(N.get(id)), d = Math.hypot(p[0] - P0[0], p[1] - P0[1]); if (!best || d < best.d) best = { id, d, a }; }
// z dwóch torów przy czole wybieramy ten, który dalej biegnie na zachód (pierwszy w kierunku Pruszkowa)
const pts = [], lay = [], used = new Set();
let curId = best.id, dir = null;
const pushWay = (w, fromFirst) => {
  const ids = fromFirst ? w.nodes : [...w.nodes].reverse(), L = layerOf(w.tags);
  for (let k = pts.length ? 1 : 0; k < ids.length; k++) { pts.push(ids[k]); lay.push(L); }
  used.add(w.id); return ids[ids.length - 1];
};
for (let guard = 0; guard < 400; guard++) {
  const c = (ends.get(curId) || []).filter((e) => !used.has(e.w.id));
  if (!c.length) break;
  const here = xz(N.get(curId));
  let pick = null, bs = -2;
  for (const e of c) {
    const ids = e.first ? e.w.nodes : [...e.w.nodes].reverse(), nx = xz(N.get(ids[Math.min(3, ids.length - 1)]));
    let d = [nx[0] - here[0], nx[1] - here[1]]; const l = Math.hypot(d[0], d[1]) || 1; d = [d[0] / l, d[1] / l];
    const sc = dir ? d[0] * dir[0] + d[1] * dir[1] : -d[0];   // na początku: na zachód (−x)
    if (sc > bs) { bs = sc; pick = e; }
  }
  if (!pick || bs < 0.3) break;
  curId = pushWay(pick.w, pick.first);
  const a = xz(N.get(pts[pts.length - 2])), b = xz(N.get(pts[pts.length - 1])), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  dir = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}
// odległości wzdłuż ciągu, cięcie za Pruszkowem
const P = pts.map((id) => xz(N.get(id))), cum = [0];
for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
const proj = (q) => { let bi = 0, bd = 1e9; for (let i = 0; i < P.length; i++) { const d = Math.hypot(P[i][0] - q[0], P[i][1] - q[1]); if (d < bd) { bd = d; bi = i; } } return { i: bi, s: cum[bi], d: bd }; };
const end = proj(P1); if (end.d > 120) throw new Error('ciąg nie dochodzi do ' + TO + ' (' + Math.round(end.d) + ' m)');
let last = cum.findIndex((c) => c > end.s + TAIL); if (last < 0) last = P.length - 1;
const keep = pts.slice(0, last + 1), keepL = lay.slice(0, last + 1);
const stations = [...st.values()].map((s) => ({ ...s, ...proj(xz(s)) })).filter((s) => s.d < 60 && s.s <= cum[last]).sort((a, b) => a.s - b.s)
  .map((s) => ({ name: s.name, s: Math.round(s.s) }));
// zapis: przyrosty w mikrostopniach
const enc = []; let la = 0, lo = 0;
for (const id of keep) { const n = N.get(id), A = Math.round(n.lat * 1e6), B = Math.round(n.lon * 1e6); enc.push(A - la, B - lo); la = A; lo = B; }
const out = { src: 'OpenStreetMap (ODbL), Overpass ' + new Date().toISOString().slice(0, 10), from: FROM, to: TO, length: Math.round(cum[last]), pts: enc, layer: keepL, stations };
mkdirSync('data', { recursive: true });
writeFileSync(process.argv[3] || 'data/wkd.json', JSON.stringify(out));
console.log(`WKD: ${keep.length} punktów, ${(cum[last] / 1000).toFixed(2)} km, przystanki: ${stations.map((s) => s.name + ' ' + s.s).join(', ')}`);
