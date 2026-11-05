// Warszawa 3D — Kamera: za plecami / wysoko / oczami, rozglądanie myszą.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- kamera ---------- */
let started = null, camYaw = 0, camMode = 0, orbit = 0, tilt = 0, camDist = 1, dragging = false, lastX = 0, lastY = 0;
// LPM: pełne rozglądanie — poziomo (orbit) i w pionie (tilt)
let clickAt = null;   // krótkie kliknięcie LPM (bez przeciągania) — strzał
canvas.addEventListener('pointerdown', e => { if (e.button !== 0) return; dragging = true; lastX = e.clientX; lastY = e.clientY; clickAt = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', e => { dragging = false; if (clickAt && Math.hypot(e.clientX - clickAt.x, e.clientY - clickAt.y) < 5 && performance.now() - clickAt.t < 350) fire(); clickAt = null; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  orbit -= (e.clientX - lastX) * 0.006;
  tilt = Math.max(-1.5, Math.min(1.5, tilt + (e.clientY - lastY) * 0.005));
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', e => { camDist = Math.min(4, Math.max(0.5, camDist * (e.deltaY > 0 ? 1.1 : 0.9))); e.preventDefault(); }, { passive: false });
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt, snap) {
  if (mode === 'air') return airCamera(dt, snap);
  if (mode === 'boat') return boatCamera(dt, snap);
  const onFoot = ego === ped;
  if (!dragging && !onFoot) { orbit *= Math.exp(-1.5 * dt); tilt *= Math.exp(-1.5 * dt); }   // pieszo kamera zostaje tam, gdzie ją ustawisz
  const th = (onFoot ? camYaw : ego.th) + orbit, fx = Math.sin(th), fz = Math.cos(th);
  let dist, hgt, look;
  const CT = onFoot ? [3.6, 1.9] : mode === 'rail' ? RT[rail.kind].cam : TUNE[ACT.id].cam, big = CT[0] / 8.5;
  if (camMode === 0) { dist = CT[0] * camDist; hgt = CT[1] * camDist; look = onFoot ? 1.45 : 1.3 * Math.max(1, big); }
  else if (camMode === 1) { dist = (onFoot ? 11 : 26 * big) * camDist; hgt = (onFoot ? 6 : 13 * big) * camDist; look = onFoot ? 1.2 : 2 * big; }
  else { dist = 0; hgt = onFoot ? 1.66 : 0; look = 1.1; }
  // kąt elewacji kamery wokół auta; poniżej poziomu kamera zostaje nad ziemią i patrzy w górę
  let lookUp = 0;
  if (camMode !== 2) {
    const r = Math.hypot(dist, hgt), E0 = Math.atan2(hgt, dist), Ev = Math.max(-1.3, Math.min(1.45, E0 + tilt)), Ec = Math.max(0.06, Ev);
    lookUp = Ec - Ev; dist = r * Math.cos(Ec); hgt = r * Math.sin(Ec);
  }
  const want = new THREE.Vector3(ego.x - fx * dist, ego.y + hgt, ego.z - fz * dist);
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
  if (camMode === 2 || snap) camPos.copy(want); else camPos.lerp(want, 1 - Math.exp(-6 * dt));
  const near = camMode === 2 ? 0.05 : 0.3; if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  if (camMode === 2) {   // z maski: swobodne rozglądanie
    const p = Math.max(-1.35, Math.min(1.35, -tilt)), c = Math.cos(p) * 20;
    camLook.set(camPos.x + fx * c, camPos.y + Math.sin(p) * 20, camPos.z + fz * c);
  } else {
    camLook.set(ego.x + fx * 5, ego.y + look, ego.z + fz * 5);
    if (lookUp > 0) camLook.y += (Math.hypot(camPos.x - camLook.x, camPos.z - camLook.z) + 0.1) * Math.tan(Math.min(1.35, lookUp));
  }
  camera.position.copy(camPos);
  if (bump > 0.01) { camera.position.x += (Math.random() - 0.5) * bump * 0.5; camera.position.y += (Math.random() - 0.5) * bump * 0.5; bump *= Math.exp(-8 * dt); }
  camera.lookAt(camLook);
  if (PED) PED.g.visible = (mode === 'foot' ? camMode !== 2 : PED.g.visible);
}
