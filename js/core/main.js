// Wielka Kradzież Aut VI — Start: dane, teren, świat, modele, ekran startowy, wybór trybu.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- start ---------- */
async function main() {
  try {
    const st = await loadArea();
    await tilesInit();
    console.log('[W3D] stats', JSON.stringify(st));
    // ekran startowy: przelot nad miastem, modele wczytują się w tle (pasek na karcie trybu)
    // modele, pojazdy na miejscach, broń — wszystko na ekranie ładowania; ekran startowy dopiero, gdy gotowe
    $('verHud').textContent = 'Wielka Kradzież Aut VI v' + APP_VERSION;
    applyGfx();
    requestAnimationFrame(loop);
    await loadModels((f, t) => status(t, f * 0.75));
    if (AREA === AREAS.centrum) startAt(findSpawn());
    else { for (const V of FLEET) V.v.group.visible = false; const sp = findSpawn(); SPAWN = sp; Object.assign(ped, { x: sp.x, z: sp.z, th: sp.th, vf: 0, vy: 0 }); ped.y = surfaceAt(sp.x, sp.z, H(sp.x, sp.z)); mode = 'foot'; ego = ped; camYaw = sp.th; }
    FLEET.homed = AREA === AREAS.centrum;
    await homeVehicles(t => status('Ustawiam pojazdy na ich miejscach: ' + t, 0.85));
    status('Broń, latarka, zombie, efekty…', 0.95); await weaponsInit();
    if (GFX.sketch) setSketch(true);
    status('Gotowe', 1); await frame();
    loadEnd(); $('start').style.display = 'flex';
    netUI();   // gra z innymi: utwórz pokój / dołącz (js/net/net.js)
    const chosen = QS.get('mode') || await new Promise(res => { for (const b of $('modes').querySelectorAll('button:not(:disabled)')) b.onclick = (e) => res(b.dataset.mode === 'rail' ? 'rail:' + ((e.target.dataset && e.target.dataset.veh) || 'tram') : b.dataset.mode); });
    started = chosen;
    if (chosen === 'drive') { mode = 'car'; ego = car; if (PED) PED.g.visible = false; }   // od razu za kierownicą (doktor mapy)
    if (chosen === 'boat') await withLoader('Wczytuję okręt…', async () => { if (AREA !== AREAS.wisla) await switchArea(AREAS.wisla); await startBoat(); });
    if (chosen === 'air') await withLoader('Wczytuję samolot…', async () => { if (AREA !== AREAS.okecie) await switchArea(AREAS.okecie); await startAir(); });   // samolot stoi na Okęciu
    if (chosen.startsWith('rail')) await withLoader('Wczytuję skład…', async () => { if (AREA !== AREAS.centrum) await switchArea(AREAS.centrum); await startRail(chosen.split(':')[1] || 'tram'); });
    // gra z innymi także w trakcie gry: sekcja przechodzi do opcji (Esc → Gra) — można zacząć samemu, a ktoś dołączy później
    $('opts').querySelector('.tab[data-tab=game]').insertBefore($('mp'), $('oMenu')); if (!NET.on) $('mpStatus').textContent = 'Utwórz pokój i podaj kod znajomym albo wpisz kod i dołącz — w każdej chwili gry.';
    $('start').classList.add('out'); setTimeout(() => { $('start').style.display = 'none'; }, 650);
    $('hud').style.display = ''; $('minimap').style.display = ''; $('help').style.display = '';
    updateCamera(0, true);
    window.__W3D = { get WKD() { return WKD; }, step, get car() { return car; }, FLEET, ped, ZB, WPN, fire, zSpawn, get rail() { return rail; }, RAILS, startRail, air, startAir, boat, startBoat, isWater, TS, streamTick, buildTile, tileData, disposeTile, get mode() { return mode; }, useCar, startAt, PED: () => PED, W, keys, H, scene, camera, renderer, setNight, setXray, surfaceAt, trains, stats: st, physics, updateCamera, passageGaps, passGrid, surfGrid, collGrid, COLL_CELL, SURF_CELL, get E() { return E; }, get R() { return R; }, get AREA() { return AREA; }, switchArea, AREAS, THREE, makeCar, makeTrainCar, TRAIN_T, TUBE_H, setCamMode: m => { camMode = m; }, NET, version: APP_VERSION };
    window.dispatchEvent(new Event('w3d-ready'));
  } catch (e) {
    console.error(e);
    $('log').innerHTML = `<span id="err">Błąd: ${e.message}</span>\nSprawdź połączenie z internetem i odśwież stronę.`;
    $('loader').style.display = 'flex'; $('start').style.display = 'none';
  }
}
main();
