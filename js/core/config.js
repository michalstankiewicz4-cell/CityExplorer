// Wielka Kradzież Aut VI — Konfiguracja: obszar mapy (?map, ?lat, ?lon, ?r), karta ładowania, pamięć przeglądarki (IndexedDB).
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   KONFIGURACJA
   ?lat=..&lon=..&r=..  (promień w metrach, domyślnie 1000)
   ========================================================================= */
const APP_VERSION = '0.21.0';   // SemVer; zmiana wersji: tutaj, w <title>, w JSON-LD (softwareVersion) i w CHANGELOG.md — sprawdza tools/check-version.mjs
document.getElementById('ver').textContent = 'v' + APP_VERSION; document.getElementById('ver2').textContent = 'v' + APP_VERSION;
const QS = new URLSearchParams(location.search);
// dokładne obszary wspólnego świata: gra buduje dokładnie ten, w którym jesteś (przy wejściu w inny — przebudowa w locie);
// poza nimi kafle. ?map=okecie — start na Okęciu; ?lat&lon&r — własny obszar startowy
const AREAS = {
  centrum: { id: 'centrum', lat: 52.23175, lon: 21.00586, r: 1000, file: 'warszawa-centrum.json', name: 'Śródmieście (PKiN)' },
  okecie: { id: 'okecie', lat: 52.1657, lon: 20.9671, r: 2000, file: 'okecie.json', name: 'Lotnisko Chopina (Okęcie)' },
  wisla: { id: 'wisla', lat: 52.2400, lon: 21.0370, r: 1500, file: 'wisla.json', name: 'Wisła (Most Świętokrzyski)' },
};
let AREA = AREAS[QS.get('map')] || (QS.get('lat') || QS.get('lon') || QS.get('r') ? { id: 'custom', lat: +(QS.get('lat') || 52.23175), lon: +(QS.get('lon') || 21.00586), r: Math.min(2500, Math.max(300, +(QS.get('r') || 1000))), name: 'Własny obszar' } : AREAS.centrum);
if (AREA.id === 'custom' && AREA.r === 1000 && AREA.lat === 52.23175 && AREA.lon === 21.00586) AREA = AREAS.centrum;
if (AREA.id === 'custom') AREA.file = AREA.lat === 52.23175 && AREA.lon === 21.00586 ? `warszawa-r${AREA.r}.json` : null;
let MAP = AREA.id === 'centrum' ? null : AREA;   // inna mapa niż centrum (napisy na ekranie startowym)
let CENTER, R, E, SEG, KX, BBOX, CACHE_KEY, TERR_KEY; const KY = 110574;
function setArea(a) {
  AREA = a; MAP = a.id === 'centrum' ? null : a;
  CENTER = { lat: a.lat, lon: a.lon }; R = a.r; E = R + 150;   // E — połowa boku dokładnej mapy (m)
  SEG = Math.min(400, Math.round(2 * E / 8));                    // siatka terenu ~8 m (z NMT: ~4 m)
  KX = 111320 * Math.cos(CENTER.lat * Math.PI / 180);
  BBOX = (() => { const [s, w] = toLL(-E, E), [n, e] = toLL(E, -E); return { s, w, n, e }; })();
  CACHE_KEY = `osm-v2-${CENTER.lat.toFixed(5)}-${CENTER.lon.toFixed(5)}-${R}`;
  TERR_KEY = `terr-v2-${CENTER.lat.toFixed(5)}-${CENTER.lon.toFixed(5)}-${R}-${Math.min(400, Math.round(2 * E / 8))}`;
}
const toXZ = (lat, lon) => [(lon - CENTER.lon) * KX, -(lat - CENTER.lat) * KY];
const toLL = (x, z) => [CENTER.lat - z / KY, CENTER.lon + x / KX];
setArea(AREA);
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

/* ---------- UI ładowania ---------- */
const $ = id => document.getElementById(id);
function status(msg, pct) { $('log').textContent = msg; if (pct != null) { $('bar').firstElementChild.style.width = (pct * 100).toFixed(0) + '%'; $('pct').textContent = Math.round(pct * 100) + '%'; } console.log('[W3D]', msg); }
// ekran ładowania (#loader) w trakcie gry: każde doładowanie (obszar, samolot, okręt, skład, pojazdy innego gracza) go pokazuje;
// licznik, bo doładowania mogą się zagnieżdżać (np. tryb Samolot: zmiana obszaru, potem samolot)
let loadN = 1;   // na starcie strony ekran ładowania jest widoczny
function loadBegin(msg, pct = 0.02) { loadN++; $('loader').style.display = 'flex'; if (msg) status(msg, pct); }
function loadEnd() { loadN = Math.max(0, loadN - 1); if (!loadN) $('loader').style.display = 'none'; }
async function withLoader(msg, fn) { loadBegin(msg); try { return await fn(); } finally { loadEnd(); } }
const frame = () => new Promise(r => setTimeout(r, 16));   // nie rAF: w karcie w tle rAF stoi
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchT(url, opt = {}, ms = 45000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opt, signal: c.signal }); } finally { clearTimeout(t); }
}

/* ---------- IndexedDB (cache) ---------- */
const idb = {
  db: null,
  open() { if (this.db) return this.db; return this.db = new Promise((res, rej) => { const r = indexedDB.open('warszawa3d', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async get(k) { try { const db = await this.open(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); } catch (e) { return undefined; } },
  async set(k, v) { try { const db = await this.open(); await new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { } },
  async del(k) { try { const db = await this.open(); await new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { } },
};
