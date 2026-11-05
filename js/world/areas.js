// Wielka Kradzież Aut VI — Wspólny świat: dokładne obszary przebudowywane w locie, pojazdy na swoich miejscach, wczytanie obszaru.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
// zwolnienie dokładnej mapy (obiekty sceny, siatki zderzeń, dróg, nawierzchni, składy AI); kafle też — wczytają się na nowo
function unloadWorld() {
  for (const k of [...TS.loaded.keys()]) freeTile(k);
  for (const o of W.objs || []) {
    scene.remove(o);
    o.traverse(m => { if (m.geometry) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; for (const mt of ms) if (mt.map && mt.map.isCanvasTexture && mt.map.image && mt.map.image.width >= 2048) mt.map.dispose(); });
  }
  collGrid.clear(); roadGrid.clear(); surfGrid.clear(); passGrid.clear(); trains.length = 0; trackCache.clear();
  for (const k of Object.keys(W)) delete W[k];
}
// wejście w inny dokładny obszar: przebudowa świata wokół niego, gracz i pojazdy przesunięci do nowego układu
let switching = false;
async function switchArea(a) {
  if (switching || a === AREA) return;
  switching = true;
  const [dx, dz] = toXZ(a.lat, a.lon), sk = !!SK.on;
  try {
    loadBegin('Wczytuję dokładną mapę: ' + a.name + '…');
    if (sk) setSketch(false);
    zClearAll(); unloadWorld(); setArea(a);
    await loadArea();
    const g = toXZ(TS.TL ? TS.TL.G0.lat : 52.23175, TS.TL ? TS.TL.G0.lon : 21.00586); TS.OFF = [g[0], g[1]]; TS.fail.clear();
    const mv = (o) => { if (o) { o.x -= dx; o.z -= dz; } };
    mv(ped); for (const V of FLEET) { mv(V.s); mv(V.s.spawn); V.s.rest = false; } if (SPAWN) mv(SPAWN);
    if (air.sim) { const p = air.sim.state.p; p[0] -= dx; p[2] -= dz; mv(air.spawn); airSync(); }
    if (boat.sim) { mv(boat.sim.state); mv(boat.spawn); boat.mask = null; boatSync(); boatMask(boat.sim.state.x, boat.sim.state.z); }
    if (mode !== 'air') { for (const V of FLEET) V.s.y = surfaceAt(V.s.x, V.s.z, V.s.y + 2); ped.y = surfaceAt(ped.x, ped.z, ped.y + 2); }
    camPos.x -= dx; camPos.z -= dz; if (air.off == null) {}
    for (const R of Object.values(RAILS)) for (const o of R.objs || []) o.visible = R.area === AREA;
    await homeVehicles(t => status('Ustawiam pojazdy na ich miejscach: ' + t, 0.95));
    if (sk) setSketch(true); if (xray) setXray(true); setNight(night);
    if (bigOpen) { bmPan = null; drawBigMap(); }
  } catch (e) { console.error('[W3D] zmiana obszaru', e); flash('Nie udało się wczytać: ' + a.name); }
  finally { loadEnd(); switching = false; }
}
// co sekundę: gracz w innym dokładnym obszarze (w 3/4 jego boku) — przebudowa
let areaT = 0;
function areaCheck(dt) {
  if ((areaT += dt) < 1 || switching || mode === 'rail' || mode === 'enter' || mode === 'exit') return; areaT = 0;
  for (const a of Object.values(AREAS)) {
    if (a === AREA) continue;
    const [x, z] = toXZ(a.lat, a.lon), h = (a.r + 150) * 0.75;
    if (Math.abs(ego.x - x) < h && Math.abs(ego.z - z) < h) { switchArea(a); return; }
  }
}
// pojazdy na swoich miejscach niezależnie od tego, gdzie zaczynasz: auta, czołg, autobus, tramwaj i pociąg — w centrum,
// samolot — na Okęciu, okręt — na Wiśle; każdy pojawia się, gdy pierwszy raz zbudujesz jego obszar, i potem już tam stoi
async function homeVehicles(progress = () => {}) {
  if (AREA === AREAS.centrum) {
    if (!FLEET.homed && FLEET.length) { const sp = findSpawn(); SPAWN = sp; for (const V of FLEET) { park(V, sp, parkAlong(V)); V.v.group.visible = true; } FLEET.homed = true; }
    for (const k of ['tram', 'train']) if (!RAILS[k].V) { progress(k === 'tram' ? 'tramwaj…' : 'pociąg WKD…'); try { await parkRail(k); } catch (e) { console.warn('[W3D] skład', k, e); } }
    for (const R of Object.values(RAILS)) if (R.V && R.area === AREA) for (const tr of trains) if (tr.ch && chKey(tr.ch) === R.chKey) { tr.off = true; for (const m of tr.cars) m.visible = false; }
  }
  if (AREA === AREAS.okecie && !air.V) { progress('samolot…'); try { await parkAir(); } catch (e) { console.warn('[W3D] samolot', e); } }
  if (AREA === AREAS.wisla && !boat.V) { progress('okręt…'); try { await parkBoat(); } catch (e) { console.warn('[W3D] okręt', e); } }
}
/* ---------- dokładny obszar: dane, teren, budowa świata ---------- */
async function loadArea() {
  DATA = null; TERR_RAW = null; HF = null;
  status('Szukam danych…', 0.02);
  const local = await loadLocalFile();
  if (local) { DATA = local.osm; if (local.terrain && local.meta.SEG === SEG) TERR_RAW = Float32Array.from(local.terrain); status('Wczytano dane OSM z pliku', 0.5); }
  if (!DATA) { DATA = await idb.get(CACHE_KEY); if (DATA) status('Dane OSM z pamięci przeglądarki', 0.5); }
  if (!DATA) {
    DATA = await fetchOverpass();
    if (!DATA) DATA = await fetchOsmApi();
    if (!DATA) throw new Error('Nie udało się pobrać danych OpenStreetMap');
    await idb.set(CACHE_KEY, DATA);
  }
  let dtm = false;
  status('Wczytuję model terenu NMT (GUGiK)…', 0.5);
  const nmt = await loadNMT();
  if (nmt) { TERR_RAW = nmt; dtm = true; W.terrSrc = 'NMT GUGiK'; }
  else { SEG = Math.min(400, Math.round(2 * E / 8)); if (TERR_RAW && TERR_RAW.length !== (SEG + 1) ** 2) TERR_RAW = null; W.terrSrc = 'Terrarium'; }
  if (!TERR_RAW) TERR_RAW = await idb.get(TERR_KEY);
  if (!TERR_RAW) {
    try { status('Pobieram wysokości terenu…', 0.5); TERR_RAW = await loadTerrain(); await idb.set(TERR_KEY, TERR_RAW); }
    catch (e) { console.warn('teren', e); status('Brak danych wysokości — teren płaski', 0.6); TERR_RAW = null; }
  }
  if (TERR_RAW) { const t = processTerrain(TERR_RAW, dtm ? null : buildingMask(DATA), dtm); HF = t.h; W.terrBase = t.base; }
  await frame();
  seed = 12345;
  const before = new Set(scene.children);
  const st = buildWorld(DATA);
  W.objs = scene.children.filter(o => !before.has(o));   // obiekty dokładnej mapy (do zwolnienia przy zmianie obszaru)
  return st;
}
