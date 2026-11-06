// Wielka Kradzież Aut VI — Pętla gry: krok fizyki, przelot na ekranie startowym, rysowanie.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- pętla ---------- */
let carT = 0, bmT = 0, last = performance.now(), acc = 0, fpsN = 0, fpsT = 0, fps = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  step(dt, true);
}
// przelot nad miastem na ekranie startowym: wolny obrót wokół Pałacu Kultury
let flyT = 0;
function flyover(dt) {
  flyT += dt;
  const a = 0.6 + flyT * 0.035, r = 420, x = Math.sin(a) * r, z = Math.cos(a) * r, h = H(0, 0);
  camera.position.set(x, h + 150 + Math.sin(flyT * 0.11) * 25, z); camera.lookAt(0, h + 80, 0);
  sun.position.set(SUN_DIR.x * 400, h + SUN_DIR.y * 400, SUN_DIR.z * 400); sun.target.position.set(0, h, 0);
}
function step(dt, draw) {
  fpsN++; fpsT += dt; if (fpsT > 1) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
  if (!started) { updateTrains(dt); carT += dt; flyover(dt); if (draw) renderer.render(scene, camera); return; }
  if (optOpen) { if (draw) { renderer.render(scene, camera); if (boat.V) boatRenderWater(); } return; }   // pauza w opcjach
  if (switching || loadN) return;   // przebudowa dokładnej mapy albo doładowanie (ekran ładowania) — gra stoi
  acc += dt; const STEP = 1 / 120; let n = 0;
  while (acc >= STEP && n++ < 20) { physics(STEP); acc -= STEP; }
  sequence(dt);
  updateTrains(dt);
  // pojazdy: obrót wokół pionu na pozycji; koła, gąsienice, zawieszenie, przegub i przechył robi ich model
  carT += dt;
  for (const V of FLEET) {
    const S = V.s, cth = Math.cos(S.th), sth = Math.sin(S.th), mine = V === ACT && mode === 'car' && !V.remote;
    V.v.group.position.set(S.x, S.y, S.z); V.v.group.rotation.set(0, S.th, 0);
    const o = {
      speed: S.vf, steer: -S.steer * Math.min(1, 1.6 / (1 + Math.abs(S.vf) / 20)), turn: S.w,
      contact: (lx, lz) => surfaceAt(S.x + lx * cth + lz * sth, S.z - lx * sth + lz * cth, S.y + 0.6) - S.y,
      lights: night && (mine || V.id === 'urbino18'), brake: S.brake, work: S.work,
    };
    if (V.id === 'abrams' && mine) { o.turret = orbit; o.gun = Math.max(-0.15, Math.min(0.35, 0.05 - tilt * 0.5)); }
    else if (V.id === 'abrams' && V.remote && V.net) { o.turret = V.net.tur; o.gun = V.net.gun; }   // wieża jak u kierowcy (gra z innymi)
    if (V.id === 'abrams') o.searchlight = mine ? WPN.search : !!(V.remote && V.net && V.net.sl);
    V.v.update(carT, dt, o);
  }
  if (mode === 'rail') railPlace(dt);
  wkdRails(dt);   // szyny trasy WKD kawałkami wokół składu i gracza
  if (air.V) airPlace(dt);   // także zaparkowany (pieszy obok)
  if (boat.V && boat.sim) boatPlace(dt);
  // pieszy
  if (PED) {
    PED.g.position.set(ped.x, ped.y, ped.z); PED.g.rotation.set(0, ped.th, 0);
    const sp = Math.abs(ped.vf);
    PED.c.animate(carT, dt, { gait: sp < 0.15 ? 'idle' : sp > 2.6 ? 'run' : 'walk', speed: Math.max(0.6, sp), layers: { aim: WPN.rifle && WPN.armed ? 1 : 0, sneak: ped.crouch ? 1 : 0 } });
    // celowanie tułów z bronią pochyla się w górę i w dół za celownikiem
    if (WPN.armed && mode === 'foot' && (on('aim') || on('fire'))) { const d = new THREE.Vector3(); camera.getWorldDirection(d); const p = Math.asin(Math.max(-0.9, Math.min(0.9, d.y))); PED.c.rig.chest.rotation.x -= p * 0.6; PED.c.rig.spine.rotation.x -= p * 0.35; }
  }
  zombiesStep(dt); weaponsStep(dt); fxStep(dt); netStep(dt);
  updateCamera(dt); sketchFrame();
  if ((TS.t += dt) > 0.4) { TS.t = 0; streamTick(); ovTick(); }
  areaCheck(dt);
  sun.position.set(ego.x + SUN_DIR.x * 400, ego.y + SUN_DIR.y * 400, ego.z + SUN_DIR.z * 400); sun.target.position.set(ego.x, ego.y, ego.z);
  hud(dt, fps);
  if (bigOpen && (bmT = (bmT || 0) + dt) > 0.1) { bmT = 0; drawBigMap(); }
  if (draw) { renderer.render(scene, camera); if (boat.V) boatRenderWater(); }   // woda: drugi przebieg z tą samą głębią
}
