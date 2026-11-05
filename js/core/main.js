// Warszawa 3D — Start: dane, teren, świat, modele, ekran startowy, wybór trybu.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- start ---------- */
async function main() {
  try {
    const st = await loadArea();
    await tilesInit();
    if (MAP) { document.querySelector('#start .sub').textContent = MAP.name + ' · wybierz, czym ruszasz'; }
    console.log('[W3D] stats', JSON.stringify(st));
    // ekran startowy: przelot nad miastem, modele wczytują się w tle (pasek na karcie trybu)
    status('Gotowe', 1); await frame();
    $('verHud').textContent = 'Warszawa 3D v' + APP_VERSION;
    applyGfx();
    $('loader').style.display = 'none'; $('start').style.display = 'flex';
    requestAnimationFrame(loop);
    const ml = $('modes').querySelector('.mload u');
    await loadModels((f, t) => { ml.textContent = t + ' ' + Math.round(f * 100) + '%'; });
    if (AREA === AREAS.centrum) startAt(findSpawn());
    else { for (const V of FLEET) V.v.group.visible = false; const sp = findSpawn(); SPAWN = sp; Object.assign(ped, { x: sp.x, z: sp.z, th: sp.th, vf: 0, vy: 0 }); ped.y = surfaceAt(sp.x, sp.z, H(sp.x, sp.z)); mode = 'foot'; ego = ped; camYaw = sp.th; }
    FLEET.homed = AREA === AREAS.centrum;
    await homeVehicles(t => { ml.textContent = 'Na swoje miejsce: ' + t; });
    ml.textContent = 'Broń i latarka…'; await weaponsInit();
    if (GFX.sketch) setSketch(true);
    $('modes').querySelector('.mload').remove();
    $('modes').querySelector('[data-mode=foot]').disabled = false; $('modes').querySelector('[data-mode=rail]').disabled = false; $('modes').querySelector('[data-mode=air]').disabled = false; $('modes').querySelector('[data-mode=boat]').disabled = false;
    const chosen = QS.get('mode') || await new Promise(res => { for (const b of $('modes').querySelectorAll('button:not(:disabled)')) b.onclick = (e) => res(b.dataset.mode === 'rail' ? 'rail:' + ((e.target.dataset && e.target.dataset.veh) || 'tram') : b.dataset.mode); });
    started = chosen;
    if (chosen === 'drive') { mode = 'car'; ego = car; if (PED) PED.g.visible = false; }   // od razu za kierownicą (doktor mapy)
    if (chosen === 'boat') { $('mload4').style.display = 'flex'; if (AREA !== AREAS.wisla) await switchArea(AREAS.wisla); await startBoat(); }
    if (chosen === 'air') { $('mload3').style.display = 'flex'; if (AREA !== AREAS.okecie) await switchArea(AREAS.okecie); await startAir(); }   // samolot startuje z Okęcia
    if (chosen.startsWith('rail')) { $('mload2').style.display = 'flex'; if (AREA !== AREAS.centrum) await switchArea(AREAS.centrum); await startRail(chosen.split(':')[1] || 'tram'); }
    $('start').classList.add('out'); setTimeout(() => { $('start').style.display = 'none'; }, 650);
    $('hud').style.display = ''; $('minimap').style.display = ''; $('help').style.display = '';
    updateCamera(0, true);
    window.__W3D = { step, get car() { return car; }, FLEET, ped, ZB, WPN, fire, zSpawn, get rail() { return rail; }, RAILS, startRail, air, startAir, boat, startBoat, isWater, TS, streamTick, buildTile, tileData, disposeTile, get mode() { return mode; }, useCar, startAt, PED: () => PED, W, keys, H, scene, camera, renderer, setNight, setXray, surfaceAt, trains, stats: st, physics, updateCamera, passageGaps, passGrid, surfGrid, collGrid, COLL_CELL, SURF_CELL, get E() { return E; }, get R() { return R; }, get AREA() { return AREA; }, switchArea, AREAS, THREE, makeCar, makeTrainCar, TRAIN_T, TUBE_H, setCamMode: m => { camMode = m; }, version: APP_VERSION };
    window.dispatchEvent(new Event('w3d-ready'));
  } catch (e) {
    console.error(e);
    $('log').innerHTML = `<span id="err">Błąd: ${e.message}</span>\nSprawdź połączenie z internetem i odśwież stronę.`;
    $('loader').style.display = 'flex'; $('start').style.display = 'none';
  }
}
main();
