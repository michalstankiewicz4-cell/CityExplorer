// Warszawa 3D — Kamera: za plecami / wysoko / oczami, rozglądanie myszą.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- kamera ---------- */
let started = null, camYaw = 0, camMode = 0, orbit = 0, tilt = 0, camDist = 1, dragging = false, lastX = 0, lastY = 0;
// Mysz jak w GTA V: kliknięcie w grę łapie mysz (Pointer Lock) — ruch obraca kamerę bez trzymania przycisku,
// LPM strzela, PPM celuje; Esc puszcza mysz i otwiera opcje. Bez złapania (np. odmowa przeglądarki): LPM + przeciągnij.
const SENS = 0.0022;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (mouse.locked) { if (e.button === 0) { mouse.fire = true; fire(); } if (e.button === 2) mouse.aim = true; return; }
  if (e.button === 2) { mouse.aim = true; return; }
  if (e.button !== 0) return;
  if (started && !optOpen && !bigOpen && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { } }
  dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId);
});
addEventListener('pointerup', e => { if (e.button === 0) { mouse.fire = false; dragging = false; } if (e.button === 2) mouse.aim = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; mouse.fire = mouse.aim = false; });
const look = (dx, dy) => { orbit -= dx * SENS; tilt = Math.max(-1.5, Math.min(1.5, tilt + dy * SENS)); mouse.last = performance.now(); };
addEventListener('mousemove', e => { if (mouse.locked) look(e.movementX, e.movementY); });
canvas.addEventListener('pointermove', e => {
  if (mouse.locked || !dragging) return;
  look((e.clientX - lastX) * 2.7, (e.clientY - lastY) * 2.3); lastX = e.clientX; lastY = e.clientY;
});
document.addEventListener('pointerlockchange', () => {
  mouse.locked = document.pointerLockElement === canvas; mouse.fire = mouse.aim = false; if (!mouse.locked) mouse.unlockAt = performance.now();
  if (!mouse.locked && started && !optOpen && !bigOpen && !mouse.wantUnlock) toggleOptions(true);   // Esc w grze: pauza i opcje
  mouse.wantUnlock = false;
});
// kółko: pieszo — broń (Beryl / bez broni), w czołgu — działo / karabin, w pozostałych pojazdach — odległość kamery
canvas.addEventListener('wheel', e => {
  e.preventDefault(); if (!started || optOpen) return;
  const now = performance.now(); if (now - (mouse.wheelT || 0) < 180 && (mode === 'foot' || isTank())) return; mouse.wheelT = now;
  if (mode === 'foot') { WPN.armed = !WPN.armed; flash(WPN.armed ? 'Beryl' : 'Bez broni'); }
  else if (isTank()) { WPN.tankGun = WPN.tankGun === 'cannon' ? 'mg' : 'cannon'; flash(WPN.tankGun === 'cannon' ? 'Działo 120 mm' : 'Karabin maszynowy'); }
  else camDist = Math.min(4, Math.max(0.5, camDist * (e.deltaY > 0 ? 1.1 : 0.9)));
}, { passive: false });
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), CAM = { aim: 0, spd: 0 };
function updateCamera(dt, snap) {
  if (mode === 'air') return airCamera(dt, snap);
  if (mode === 'boat') return boatCamera(dt, snap);
  const onFoot = ego === ped;
  // w pojeździe kamera sama wraca za pojazd 1,5 s po ruchu myszą, gdy jedzie (w czołgu nie: kamera celuje wieżą)
  if (!onFoot && !dragging && !(mode === 'car' && ACT && ACT.id === 'abrams') && performance.now() - mouse.last > 1500 && Math.abs(ego.vf || 0) > 1) { orbit *= Math.exp(-2.2 * dt); tilt *= Math.exp(-2.2 * dt); }
  const back = !onFoot && on('lookBack') ? Math.PI : 0;   // spójrz za siebie
  const th = (onFoot ? camYaw : ego.th) + orbit + back, fx = Math.sin(th), fz = Math.cos(th);
  // pieszo: kamera przez prawe ramię (jak w GTA V), przy celowaniu bliżej i węższy kąt widzenia
  const aimK = on('aim') && ((onFoot && WPN.armed) || mode === 'car') ? 1 : 0;   // w samolocie PPM to zrzut bomby CAM.aim += (aimK - CAM.aim) * Math.min(1, 10 * dt);
  const side = onFoot && camMode !== 2 ? 0.42 + 0.2 * CAM.aim : 0, rx = -fz * side, rz = fx * side;
  // „feeling”: w pojeździe kąt widzenia rośnie z prędkością, kamera lekko odjeżdża i drży przy dużej prędkości
  const spd = onFoot ? 0 : Math.abs(ego.vf || 0); CAM.spd += (spd - CAM.spd) * Math.min(1, 2 * dt);
  { const f = GFX.fov * (1 - 0.3 * CAM.aim) + (camMode === 2 ? 4 : 10) * Math.min(1, CAM.spd / 45); if (Math.abs(camera.fov - f) > 0.05) { camera.fov = f; camera.updateProjectionMatrix(); } }
  if (CAM.spd > 25 && camMode !== 2) bump = Math.max(bump, 0.025 * Math.min(1, (CAM.spd - 25) / 30));
  let dist, hgt, look;
  const CT = onFoot ? [3.2 - 1.6 * CAM.aim, 1.0 - 0.35 * CAM.aim] : mode === 'rail' ? RT[rail.kind].cam : TUNE[ACT.id].cam, big = CT[0] / 8.5;
  if (camMode === 0) { const sk = 1 + 0.25 * Math.min(1, CAM.spd / 40); dist = CT[0] * camDist * sk; hgt = CT[1] * camDist; look = onFoot ? 1.55 : 1.3 * Math.max(1, big); }
  else if (camMode === 1) { dist = (onFoot ? 11 : 26 * big) * camDist; hgt = (onFoot ? 6 : 13 * big) * camDist; look = onFoot ? 1.2 : 2 * big; }
  else { dist = 0; hgt = onFoot ? 1.66 : 0; look = 1.1; }
  // kąt elewacji kamery wokół auta; poniżej poziomu kamera zostaje nad ziemią i patrzy w górę
  let lookUp = 0;
  if (camMode !== 2) {
    const r = Math.hypot(dist, hgt), E0 = Math.atan2(hgt, dist), Ev = Math.max(-1.3, Math.min(1.45, E0 + tilt)), Ec = Math.max(0.06, Ev);
    lookUp = Ec - Ev; dist = r * Math.cos(Ec); hgt = r * Math.sin(Ec);
  }
  const want = new THREE.Vector3(ego.x - fx * dist + rx, ego.y + hgt + (onFoot ? 0.6 : 0), ego.z - fz * dist + rz);
  // kamera nie wchodzi w budynki: szukamy pierwszej ściany między autem a kamerą
  if (camMode !== 2) {
    const dx = want.x - ego.x, dz = want.z - ego.z, L = Math.hypot(dx, dz);
    let tHit = 1;
    for (let t = 0; t <= 1 && L > 0.1; t += 1.5 / L) {
      const px = ego.x + dx * t, pz = ego.z + dz * t, a = collGrid.get(Math.floor(px / COLL_CELL) * 100003 + Math.floor(pz / COLL_CELL));
      if (a && a.some(sg => sg[4] === 0 && ego.y + 1.5 >= sg[5] && ego.y + 1.5 <= sg[6] && segDist(px, pz, sg)[0] < 0.8)) { tHit = Math.max(0.12, t - 1.2 / L); break; }
    }
    if (tHit < 1) { want.x = ego.x + dx * tHit; want.z = ego.z + dz * tHit; }
  }
  const under = ego.y < H(ego.x, ego.z) - 2.5;   // auto w tunelu / wykopie pod ziemią
  if (under) want.y = Math.max(ego.y + 0.9, Math.min(ego.y + 3.9, want.y));
  else { const gy = Math.max(H(want.x, want.z), surfaceAt(want.x, want.z, ego.y)) + 1.2; if (want.y < gy) want.y = gy; }
  if (camMode === 2 && !onFoot) {   // za kierownicą: oczy kierowcy w nadwoziu (z jego przechyłem)
    if (mode === 'rail') {   // z kabiny prowadzącego
      const h = rail.kind === 'tram' ? rail.V.v.sections[0].g : rail.V.cars[0], e = rail.kind === 'tram' ? [0, 1.95, rail.V.v.sections[0].L / 2 - 1.5] : [2.6, 2.9, 0];
      h.updateMatrixWorld(true); want.copy(h.localToWorld(new THREE.Vector3(e[0], e[1], e[2])));
    } else {
    const e = TUNE[ACT.id].eye, holder = e[0] === 'turret' ? ACT.v.turret : ACT.v.body;
    ACT.v.group.updateMatrixWorld(true);
    want.copy(holder.localToWorld(new THREE.Vector3(e[1], e[2], e[3])));
    }
  } else if (camMode === 2) { want.x = ped.x + Math.sin(ped.th) * 0.12; want.z = ped.z + Math.cos(ped.th) * 0.12; }
  if (camMode === 2 || snap) camPos.copy(want); else camPos.lerp(want, 1 - Math.exp(-(onFoot ? 18 : 6) * dt));
  const near = camMode === 2 ? 0.05 : 0.3; if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  if (camMode === 2) {   // z maski: swobodne rozglądanie
    const p = Math.max(-1.35, Math.min(1.35, -tilt)), c = Math.cos(p) * 20;
    camLook.set(camPos.x + fx * c, camPos.y + Math.sin(p) * 20, camPos.z + fz * c);
  } else {
    camLook.set(ego.x + fx * 5 + rx, ego.y + look, ego.z + fz * 5 + rz);
    if (lookUp > 0) camLook.y += (Math.hypot(camPos.x - camLook.x, camPos.z - camLook.z) + 0.1) * Math.tan(Math.min(1.35, lookUp));
  }
  camera.position.copy(camPos);
  if (bump > 0.01) { camera.position.x += (Math.random() - 0.5) * bump * 0.5; camera.position.y += (Math.random() - 0.5) * bump * 0.5; bump *= Math.exp(-8 * dt); }
  camera.lookAt(camLook);
  if (PED) PED.g.visible = (mode === 'foot' ? camMode !== 2 : PED.g.visible);
}
