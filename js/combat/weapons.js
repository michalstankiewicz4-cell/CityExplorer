// Wielka Kradzież Aut VI — Broń: karabinek (pieszo i z okna), armata i karabin maszynowy czołgu, karabiny i bomby samolotu, latarka, reflektor, celownik; rozgrzanie shaderów.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
const WPN = { armed: true, rifle: null, fireT: 0, light: null, lightOn: false, holder: null, tankGun: 'cannon', reload: 0, mgT: 0, search: false, WK: null, GK: null };
/* ---------- strzał: promień z kamery przez środek ekranu (celownik) ---------- */
function rayHit(o, d, maxD) {
  let best = maxD, hz = null;
  for (const z of ZB.list) {
    if (z.dead) continue;
    const ox = z.x - o.x, oz = z.z - o.z, hd = d.x * d.x + d.z * d.z; if (hd < 1e-6) continue;
    const t = (ox * d.x + oz * d.z) / hd; if (t < 0.5 || t > best) continue;
    const px = o.x + d.x * t - z.x, pz = o.z + d.z * t - z.z, y = o.y + d.y * t;
    if (Math.hypot(px, pz) < 0.42 && y > z.y && y < z.y + 1.85) { best = t; hz = z; }
  }
  // grunt i budynki dokładnej mapy na drodze pocisku
  for (let t = 1; t < best; t += 1.5) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < H(x, z) || (W.inBuilding && W.inBuilding(x, z) && y < H(x, z) + 40) || zWall(x, z, y)) { return { t, z: null, p: new THREE.Vector3(x, y, z) }; } }
  return { t: best, z: hz, p: new THREE.Vector3(o.x + d.x * best, o.y + d.y * best, o.z + d.z * best) };
}
function aimRay() { const d = new THREE.Vector3(); camera.getWorldDirection(d); return { o: camera.position.clone(), d }; }
function fireRifle() {
  if (WPN.fireT > 0 || !WPN.rifle) return; WPN.fireT = 1 / WPN.rifle.info.rate;
  const sp = mode === 'foot' && CAM.aim < 0.5 ? 0.03 : 0.006;   // z biodra rozrzut większy niż przy celowaniu
  const { o, d } = aimRay(); d.x += (Math.random() - 0.5) * sp; d.y += (Math.random() - 0.5) * sp; d.normalize();
  const h = rayHit(o, d, 400), m = mode === 'car' ? new THREE.Vector3(car.x + Math.sin(car.th) * 0.5, car.y + 1.3, car.z + Math.cos(car.th) * 0.5) : WPN.rifle.parts.flash.getWorldPosition(new THREE.Vector3());
  tracer(m, h.p); WPN.rifle.update(carT, 0, { fire: true }); bump = Math.max(bump, 0.08);
  if (h.z) zHit(h.z, h.p); else burst(h.p.x, h.p.y, h.p.z, 6, 0x8a8070, 2);
}
// wylot lufy czołgu; pocisk leci z wylotu w punkt pod celownikiem (gdy jest przed lufą), inaczej wzdłuż lufy
function tankMuzzle(len) {
  const V = ACT.v; V.gun.updateMatrixWorld(true); const p = V.gun.localToWorld(new THREE.Vector3(0, 0, len)), d = new THREE.Vector3(0, 0, 1).transformDirection(V.gun.matrixWorld);
  const a = aimRay(), h = rayHit(a.o, a.d, 900), to = h.p.clone().sub(p); if (to.length() > 3 && to.clone().normalize().dot(d) > 0.8) d.copy(to.normalize());
  return { p, d };
}
function fireTank() {
  if (WPN.tankGun === 'cannon') {
    if (WPN.reload > 0) { flash('Działo: ładowanie…'); return; }
    WPN.reload = 4;
    const { p, d } = tankMuzzle(5.6);
    const h = rayHit(p, d, 900);
    tracer(p, h.p, 0xffe0a0); if (h.t < 899) boom(h.p.x, Math.max(h.p.y, H(h.p.x, h.p.z)), h.p.z, 6);
    burst(p.x, p.y, p.z, 30, 0xc8c0b0, 5); bump = Math.max(bump, 0.6);
    for (const z of ZB.list) if (!z.dead && Math.hypot(z.x - h.p.x, z.z - h.p.z) < 7) zKill(z, Math.atan2(z.x - h.p.x, z.z - h.p.z), false);
  } else {
    if (WPN.mgT > 0) return; WPN.mgT = 0.09;
    const { p, d } = tankMuzzle(2.0); d.x += (Math.random() - 0.5) * 0.01; d.y += (Math.random() - 0.5) * 0.01; d.normalize(); p.x += 0.4;
    const h = rayHit(p, d, 600);
    if (Math.random() < 0.4) tracer(p, h.p, 0xff9a50);
    if (h.z) zHit(h.z, h.p); else burst(h.p.x, h.p.y, h.p.z, 4, 0x8a8070, 2);
  }
}
// mysz zależnie od tego, czym sterujesz: pieszo LPM strzał, PPM celowanie, kółko — broń (Beryl / bez broni);
// samochód i autobus: PPM celowanie przez okno, LPM strzał; czołg: LPM strzał, PPM przybliżenie, kółko — działo / karabin;
// samolot: LPM — 8 karabinów Browning w skrzydłach; tramwaj, pociąg, okręt: tylko kamera
const isTank = () => mode === 'car' && ACT && ACT.id === 'abrams';
const armed = () => (mode === 'foot' && WPN.armed) || isTank() || (mode === 'car' && on('aim')) || mode === 'air';
function fire() {
  if (!started || optOpen || bigOpen) return;
  if (mode === 'foot') { if (WPN.armed) fireRifle(); }
  else if (isTank()) fireTank();
  else if (mode === 'car' && on('aim')) fireRifle();   // strzał z okna
  else if (mode === 'air') firePlane();
}
// bomby pod skrzydłami samolotu (2 × 250 lb z WeaponKit): celowanie (PPM) albo „zrzut bomby” — zrzut; spadają z prędkością samolotu (grawitacja,
// opór), obracają się wzdłuż lotu, wybuchają na ziemi, budynku albo ścianie; uzbrajane ponownie na postoju na ziemi
const BOMBS = { racks: [[1.55, -0.62, 0.35], [-1.55, -0.62, 0.35]], hung: [], falling: [] };
function bombsArm() {
  if (!WPN.WK || !air.V) return;
  for (const b of BOMBS.hung) if (b) air.V.group.remove(b.group);
  BOMBS.hung = BOMBS.racks.map(([x, y, z]) => { const b = WPN.WK.buildWeapon('bomb250'); b.group.position.set(x, y, z); air.V.group.add(b.group); return b; });
}
function dropBomb() {
  const i = BOMBS.hung.findIndex(Boolean); if (i < 0 || !air.sim || air.sim.state.crashed) { if (i < 0) flash('Brak bomb — wyląduj i zatrzymaj się, żeby uzbroić'); return; }
  const b = BOMBS.hung[i]; BOMBS.hung[i] = null;
  const g = air.V.group; g.updateMatrixWorld(true); const p = b.group.getWorldPosition(new THREE.Vector3()), q = b.group.getWorldQuaternion(new THREE.Quaternion());
  g.remove(b.group); scene.add(b.group); b.group.position.copy(p); b.group.quaternion.copy(q);
  const v = air.sim.state.v; BOMBS.falling.push({ b, v: new THREE.Vector3(v[0], v[1] - 0.5, v[2]), t: 0 });
}
function bombsStep(dt) {
  if (mode === 'air' && air.sim && air.sim.state.onGround && Math.hypot(air.sim.state.v[0], air.sim.state.v[2]) < 1 && !BOMBS.hung.some(Boolean)) bombsArm();
  for (let i = BOMBS.falling.length - 1; i >= 0; i--) {
    const f = BOMBS.falling[i], g = f.b.group; f.t += dt;
    f.v.y -= 9.81 * dt; f.v.multiplyScalar(1 - 0.012 * dt);
    g.position.addScaledVector(f.v, dt);
    if (f.v.lengthSq() > 1) g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.v.clone().normalize());
    const x = g.position.x, y = g.position.y, z = g.position.z, gy = H(x, z);
    if (y <= gy + 0.2 || (W.inBuilding && W.inBuilding(x, z) && y < gy + 25) || zWall(x, z, y) || f.t > 60) {
      scene.remove(g); f.b.dispose(); BOMBS.falling.splice(i, 1);
      const r = f.b.info.blast; boom(x, Math.max(y, gy), z, r);
      for (const zb of ZB.list) if (!zb.dead && Math.hypot(zb.x - x, zb.z - z) < r) zKill(zb, Math.atan2(zb.x - x, zb.z - z), false);
    }
  }
}
// Spitfire Mk I: 8 × Browning .303 w skrzydłach (po 4 na skrzydło), zbieżność ok. 230 m
function firePlane() {
  if (WPN.fireT > 0 || !air.V || air.sim.state.crashed) return; WPN.fireT = 1 / 18;
  const g = air.V.group; g.updateMatrixWorld(true);
  const conv = g.localToWorld(new THREE.Vector3(0, 0.2, 230));
  for (const x of [2.3, -2.3, 3.4, -3.4]) {
    const p = g.localToWorld(new THREE.Vector3(x, -0.1, 0.7)), d = conv.clone().sub(p).normalize(); d.x += (Math.random() - 0.5) * 0.008; d.y += (Math.random() - 0.5) * 0.008; d.normalize();
    const h = rayHit(p, d, 600); if (Math.random() < 0.5) tracer(p, h.p, 0xffc070);
    if (h.z) zHit(h.z, h.p); else if (h.t < 599) burst(h.p.x, h.p.y, h.p.z, 3, 0x8a8070, 2);
  }
}
// rozgrzanie shaderów efektów (wybuch, dym, smugacz, cząstki, plamy) w trakcie wczytywania — pierwszy strzał bez przycięcia
function fxWarm() {
  const g = new THREE.Group(), p = camera.position.clone().add(new THREE.Vector3(0, -500, 0));
  g.position.copy(p); scene.add(g);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3b3835, transparent: true, opacity: 0.7, depthWrite: false, roughness: 1 })));
  for (const t of [BLOOD_TEX, SCORCH_TEX]) g.add(new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true })));
  if (!FX.parts) fxInit();
  if (!FX.light) { FX.light = new THREE.PointLight(0xffa040, 0, 150, 2); scene.add(FX.light); }
  try { renderer.compile(scene, camera); } catch (e) { console.warn('[W3D] rozgrzanie', e); }
  scene.remove(g);   // materiałów nie zwalniamy: zwolnienie usunęłoby skompilowane programy
}
// broń i latarka pieszego (z GameLaboratory), raz
async function weaponsInit() {
  try {
    [WPN.WK, WPN.GK] = await Promise.all([import(GL + 'js/models/weapons/weaponkit.js'), import(GL + 'js/models/gear/gearkit.js')]);
    WPN.rifle = WPN.WK.buildWeapon('beryl'); WPN.rifle.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (PED) { PED.c.rig.chest.add(WPN.rifle.group); WPN.rifle.group.position.set(-0.08, 0.02, 0.28); WPN.rifle.group.rotation.set(0.05, 0.08, 0); }
    WPN.light = WPN.GK.makeItem('flashlight', {}); WPN.light.lights.forEach(l => { l.castShadow = false; });
    WPN.holder = new THREE.Object3D(); scene.add(WPN.holder); WPN.holder.add(WPN.light.group); WPN.light.group.position.set(0, 0, 0); WPN.light.group.rotation.set(0, Math.PI, 0);
    WPN.light.set({ power: 0 });   // latarka zawsze w scenie (bez przebudowy shaderów przy włączaniu), wyłączona — moc 0
    WPN.light.group.traverse(o => { if (o.isMesh) o.visible = false; });
    zPrebuild(6); fxWarm();
  } catch (e) { console.warn('[W3D] broń', e); }
}
function weaponsStep(dt) {
  WPN.fireT -= dt; WPN.reload = Math.max(0, WPN.reload - dt); WPN.mgT -= dt;
  if (WPN.rifle) { WPN.rifle.group.visible = mode === 'foot' && WPN.armed; WPN.rifle.update(carT, dt, {}); }
  if (air.V && WPN.WK && !BOMBS.armedOnce) { BOMBS.armedOnce = true; bombsArm(); }
  const bombKey = mode === 'air' && started && !optOpen && (on('aim') || on('bomb')); if (bombKey && !WPN.bombPrev) dropBomb(); WPN.bombPrev = bombKey;
  bombsStep(dt);
  if (started && !optOpen && on('fire') && ((mode === 'foot' && WPN.armed) || (isTank() && WPN.tankGun === 'mg') || (mode === 'car' && !isTank() && on('aim')) || mode === 'air')) fire();
  // latarka: w dłoni przy piersi, świeci tam, gdzie patrzy kamera
  if (WPN.holder) {
    const onF = WPN.lightOn && mode === 'foot';
    if (onF !== WPN.lightWas) { WPN.lightWas = onF; WPN.light.set({ power: onF ? 1 : 0 }); WPN.light.group.traverse(o => { if (o.isMesh) o.visible = onF; }); }
    if (onF) { const fx = Math.sin(ped.th), fz = Math.cos(ped.th); WPN.holder.position.set(ped.x + fx * 0.3 + fz * 0.2, ped.y + 1.25, ped.z + fz * 0.3 - fx * 0.2);
      const d = new THREE.Vector3(); camera.getWorldDirection(d); WPN.holder.lookAt(WPN.holder.position.clone().add(d)); WPN.light.update(dt); }
  }
  // celownik: pieszo z bronią zawsze (bez celowania — mała kropka, przy celowaniu — pełny), w czołgu i przy strzale z okna
  const cr = $('cross'); if (cr) { const show = started && !optOpen && (mode === 'foot' ? WPN.armed : armed()); cr.style.display = show ? 'block' : 'none';
    if (show) { const full = mode !== 'foot' || CAM.aim > 0.5 || camMode === 2; cr.style.transform = full ? 'scale(1)' : 'scale(0.4)'; cr.style.opacity = full ? '1' : '0.75'; } }
  const wp = $('weap'); if (wp) { const t = mode === 'foot' ? (WPN.armed ? 'Beryl · ' + kb('aim') + ' — celuj · ' + kb('fire') + ' — strzał' : 'Bez broni') + ' · kółko — broń · ' + kb('light') + ' — latarka ' + (WPN.lightOn ? 'wł.' : 'wył.') : mode === 'car' && ACT && ACT.id === 'abrams' ? (WPN.tankGun === 'cannon' ? 'Działo 120 mm' + (WPN.reload > 0 ? ' · ładowanie ' + WPN.reload.toFixed(1) + ' s' : ' · gotowe') : 'Karabin maszynowy') + ' · ' + kb('fire') + ' — strzał · ' + kb('aim') + ' — przybliżenie · kółko / ' + kb('weapon') + ' — broń · ' + kb('light') + ' — reflektor ' + (WPN.search ? 'wł.' : 'wył.') : ''; wp.textContent = t ? t + ' · zombie: ' + ZB.kills : ''; wp.style.display = t ? 'block' : 'none'; }
}
