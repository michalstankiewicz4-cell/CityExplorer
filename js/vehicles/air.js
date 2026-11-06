// Wielka Kradzież Aut VI — Samolot (AirKit, zachowanie „lot w atmosferze”): postój, lot, wysiadanie, kamera, HUD.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   SAMOLOT (AirKit z GameLaboratory i zachowanie „lot w atmosferze”): Spitfire Mk I na progu drogi startowej Okęcia
   klawisze: js/core/input.js (ACTIONS) — drążek, lotki (na ziemi także kółko ogonowe), ster kierunku, gaz, hamulce kół,
   podwozie, klapy, zrzut bomby; wsiądź / wysiądź (owiewka otwiera się przy wysiadaniu)
   ========================================================================= */
const air = { V: null, sim: null, c: { throttle: 0, elevator: 0, aileron: 0, rudder: 0, flaps: 0, gear: 1, brake: 1 }, work: 0, ego: { x: 0, y: 0, z: 0, th: 0, vf: 0 }, spawn: null, off: null };
let AIRK = null, FLY = null;
function airSpawnPoint() {
  const rw = (W.runways || []).slice().sort((a, b) => b.L - a.L)[0];
  if (!rw) { const s = SPAWN || findSpawn(); return { x: s.x, z: s.z, th: s.th }; }
  const [a, b] = rw.p0[0] > rw.p1[0] ? [rw.p0, rw.p1] : [rw.p1, rw.p0];   // próg po wschodniej stronie, start na zachód
  const ux = (b[0] - a[0]) / rw.L, uz = (b[1] - a[1]) / rw.L;
  let d = 50; while (d < rw.L - 600 && (Math.abs(a[0] + ux * d) > E - 60 || Math.abs(a[1] + uz * d) > E - 60)) d += 20;   // próg poza mapą: pierwszy kawałek na mapie
  return { x: a[0] + ux * d, z: a[1] + uz * d, th: Math.atan2(ux, uz) };
}
// miejsce gracza na progu (gra z innymi): kolejne samoloty obok, w poprzek drogi startowej
const AIR_SIDE = [0, 16, -16, 32];
function airSlotPoint(slot) { const sp = airSpawnPoint(), d = AIR_SIDE[slot || 0]; return { x: sp.x + Math.cos(sp.th) * d, z: sp.z - Math.sin(sp.th) * d, th: sp.th }; }
function airReset() {
  const sp = air.spawn, def = air.V.def, h = H(sp.x, sp.z);
  air.sim = FLY.createFlight(def.flight, def.mass, { p: [sp.x, h + def.rest.y, sp.z], yaw: sp.th, pitch: -def.rest.pitch });
  Object.assign(air.c, { throttle: 0, elevator: 0, aileron: 0, rudder: 0, flaps: 0, gear: 1, brake: 1 }); air.work = 0; air.off = null;
  if (typeof bombsArm === 'function' && BOMBS.armedOnce) bombsArm();
  airSync();
}
// samolot stoi na swoim miejscu (próg drogi startowej Okęcia) od chwili zbudowania Okęcia — wsiadasz (wsiądź / wysiądź) albo trybem Samolot
async function parkAir() {
  if (air.V) return;
  if (!AIRK) [AIRK, FLY] = await Promise.all([import(GL + 'js/models/air/airkit.js'), import(GL + 'js/behaviors/air/flight.js')]);
  air.V = AIRK.buildAircraft('spitfire', {}); prepModel(air.V.group); scene.add(air.V.group);
  air.spawn = airSlotPoint(mySlot()); airReset(); air.work = 1;
}
async function startAir() {
  if (!air.V) await parkAir();
  mode = 'air'; ego = air.ego; air.work = 0; air.off = null; if (PED) PED.g.visible = false;
}
function airSync() { const s = air.sim.state, e = air.ego, f = air.sim.qRot(s.q, [0, 0, 1]); e.x = s.p[0]; e.y = s.p[1]; e.z = s.p[2]; e.th = Math.atan2(f[0], f[2]); e.vf = s.ias; }
function airStep(dt) {
  const c = air.c, s = air.sim.state, k = 1 - Math.exp(-5 * dt);
  const pitch = (on('back') ? 1 : 0) - (on('fwd') ? 1 : 0), roll = (on('right') ? 1 : 0) - (on('left') ? 1 : 0), yaw = (on('rudR') ? 1 : 0) - (on('rudL') ? 1 : 0);
  c.elevator += (pitch * 0.7 - c.elevator) * k; c.aileron += (roll - c.aileron) * k;
  c.rudder += ((yaw || (s.onGround ? roll : 0)) - c.rudder) * k;   // kółko ogonowe skręca ze sterem kierunku
  if (on('fast')) c.throttle = Math.min(1, c.throttle + 0.5 * dt);
  if (on('slow')) c.throttle = Math.max(0, c.throttle - 0.5 * dt);
  c.brake = on('brake') ? 1 : 0;
  for (let i = 0; i < 2; i++) air.sim.step(dt / 2, c, H);   // H: także poza dokładną mapą (grunt kafli)
  if (!s.crashed) {   // ściana budynku (siatka kolizji) — rozbity
    const a = collGrid.get(Math.floor(s.p[0] / COLL_CELL) * 100003 + Math.floor(s.p[2] / COLL_CELL));
    if (a && a.some(sg => sg[4] === 0 && s.p[1] >= sg[5] && s.p[1] <= sg[6] && segDist(s.p[0], s.p[2], sg)[0] < 3)) s.crashed = true;
  }
  airSync();
}
function airPlace(dt) {
  const s = air.sim.state, g = air.V.group, c = air.c;
  g.position.set(s.p[0], s.p[1], s.p[2]); g.quaternion.set(s.q[1], s.q[2], s.q[3], s.q[0]);
  const on_ = mode === 'air';
  air.V.update(carT, dt, { throttle: s.crashed || !on_ ? 0 : c.throttle, engine: !s.crashed && on_, aileron: c.aileron, elevator: c.elevator, rudder: c.rudder, flaps: c.flaps, gear: c.gear > 0.5, work: on_ ? 0 : air.work, lights: night, speed: s.onGround && on_ ? Math.hypot(s.v[0], s.v[2]) : 0 });
}
// „wsiądź / wysiądź” w samolocie: na ziemi po zatrzymaniu wysiadasz (owiewka się otwiera); E przy kabinie — wsiadasz
function airExit() {
  const s = air.sim.state;
  if (!s.onGround || Math.hypot(s.v[0], s.v[2]) > 1) { flash(s.onGround ? 'Zatrzymaj samolot, żeby wysiąść' : 'Najpierw wyląduj'); return; }
  const [x, z] = airDoorAt();
  Object.assign(ped, { x, z, th: air.ego.th + Math.PI, vf: 0, vy: 0 }); ped.y = surfaceAt(x, z, H(x, z) + 0.5);
  air.c.throttle = 0; air.work = 1; mode = 'foot'; ego = ped; camYaw = air.ego.th + Math.PI; orbit = 0; camera.up.set(0, 1, 0); if (PED) PED.g.visible = true;
}
function airDoorAt() { const d = air.V.def.doorAt, g = air.V.group; g.updateMatrixWorld(true); const p = g.localToWorld(new THREE.Vector3(d.x, 0, d.z - 1.6)); return [p.x, p.z]; }   // za krawędzią spływu skrzydła
function airHud() {
  const s = air.sim.state, c = air.c;
  return `Wys. ${Math.round(s.p[1] - H(s.p[0], s.p[2]))} m · gaz ${Math.round(c.throttle * 100)}% · klapy ${c.flaps ? 'wypuszczone' : 'schowane'} · podwozie ${c.gear ? 'wypuszczone' : 'schowane'}` +
    ` · bomby ${BOMBS.hung.filter(Boolean).length}` + (s.stall && !s.onGround ? ' · PRZECIĄGNIĘCIE' : '') + (s.crashed ? ' · ROZBITY (' + kb('reset') + ' — od nowa)' : '');
}
// kamera: za samolotem (C: bliżej / dalej) albo z kabiny — horyzont przechyla się z samolotem
function airCamera(dt, snap) {
  const s = air.sim.state, q = (v) => air.sim.qRot(s.q, v), f = q([0, 0, 1]), u = q([0, 1, 0]), g = air.V.group;
  if (camMode === 2) {
    g.updateMatrixWorld(true); const st = air.V.def.seat;
    camPos.copy(g.localToWorld(new THREE.Vector3(st.x, st.y + 0.62, st.z)));
    const tl = Math.max(-1.2, Math.min(1.2, -tilt)), d = q([Math.sin(orbit) * Math.cos(tl), Math.sin(tl), Math.cos(orbit) * Math.cos(tl)]);
    camLook.set(camPos.x + d[0] * 20, camPos.y + d[1] * 20, camPos.z + d[2] * 20); camera.up.set(u[0], u[1], u[2]);
    if (camera.near !== 0.05) { camera.near = 0.05; camera.updateProjectionMatrix(); }
  } else {
    if (!dragging && performance.now() - mouse.last > 1500) { orbit *= Math.exp(-2.2 * dt); tilt *= Math.exp(-2.2 * dt); }   // kamera sama wraca za samolot
    const h = Math.atan2(f[0], f[2]) + orbit, far = camMode === 1;
    const r = Math.hypot(far ? 40 : 16, far ? 12 : 4.5) * camDist, el = Math.max(-0.3, Math.min(1.4, Math.atan2(far ? 12 : 4.5, far ? 40 : 16) + tilt));
    const want = new THREE.Vector3(-Math.sin(h) * Math.cos(el) * r, Math.sin(el) * r, -Math.cos(h) * Math.cos(el) * r);
    if (!air.off || snap) air.off = want.clone(); else air.off.lerp(want, 1 - Math.exp(-4 * dt));   // przesunięcie względem samolotu: kamera nie zostaje w tyle przy prędkości
    camPos.set(s.p[0] + air.off.x, s.p[1] + air.off.y, s.p[2] + air.off.z);
    const gy = H(camPos.x, camPos.z) + 1.2; if (camPos.y < gy) camPos.y = gy;
    camLook.set(s.p[0] + f[0] * 8, s.p[1] + 1 + f[1] * 8, s.p[2] + f[2] * 8); camera.up.set(0, 1, 0);
    if (camera.near !== 0.3) { camera.near = 0.3; camera.updateProjectionMatrix(); }
  }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
