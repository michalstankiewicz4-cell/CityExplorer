// Warszawa 3D — Broń: karabinek pieszego, armata i karabin maszynowy czołgu, latarka, reflektor, celownik.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
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
  const { o, d } = aimRay(); d.x += (Math.random() - 0.5) * 0.006; d.y += (Math.random() - 0.5) * 0.006; d.normalize();
  const h = rayHit(o, d, 400), m = WPN.rifle.parts.flash.getWorldPosition(new THREE.Vector3());
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
const armed = () => mode === 'foot' || (mode === 'car' && ACT && ACT.id === 'abrams');
function fire() { if (!started || optOpen || bigOpen) return; if (mode === 'foot') fireRifle(); else if (mode === 'car' && ACT && ACT.id === 'abrams') fireTank(); }
// broń i latarka pieszego (z GameLaboratory), raz
async function weaponsInit() {
  try {
    [WPN.WK, WPN.GK] = await Promise.all([import(GL + 'js/models/weapons/weaponkit.js'), import(GL + 'js/models/gear/gearkit.js')]);
    WPN.rifle = WPN.WK.buildWeapon('beryl'); WPN.rifle.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (PED) { PED.c.rig.chest.add(WPN.rifle.group); WPN.rifle.group.position.set(-0.08, 0.02, 0.28); WPN.rifle.group.rotation.set(0.05, 0.08, 0); }
    WPN.light = WPN.GK.makeItem('flashlight', {}); WPN.light.lights.forEach(l => { l.castShadow = false; });
    WPN.holder = new THREE.Object3D(); scene.add(WPN.holder); WPN.holder.add(WPN.light.group); WPN.light.group.position.set(0, 0, 0); WPN.light.group.rotation.set(0, Math.PI, 0);
    WPN.holder.visible = false;
  } catch (e) { console.warn('[W3D] broń', e); }
}
function weaponsStep(dt) {
  WPN.fireT -= dt; WPN.reload = Math.max(0, WPN.reload - dt); WPN.mgT -= dt;
  if (WPN.rifle) { WPN.rifle.group.visible = mode === 'foot'; WPN.rifle.update(carT, dt, {}); }
  if (started && !optOpen && on('fire') && (mode === 'foot' || (mode === 'car' && ACT && ACT.id === 'abrams' && WPN.tankGun === 'mg'))) fire();
  // latarka: w dłoni przy piersi, świeci tam, gdzie patrzy kamera
  if (WPN.holder) {
    const onF = WPN.lightOn && mode === 'foot'; WPN.holder.visible = onF;
    if (onF) { const fx = Math.sin(ped.th), fz = Math.cos(ped.th); WPN.holder.position.set(ped.x + fx * 0.3 + fz * 0.2, ped.y + 1.25, ped.z + fz * 0.3 - fx * 0.2);
      const d = new THREE.Vector3(); camera.getWorldDirection(d); WPN.holder.lookAt(WPN.holder.position.clone().add(d)); WPN.light.update(dt); }
  }
  const cr = $('cross'); if (cr) cr.style.display = started && armed() && camMode !== 1 ? 'block' : 'none';
  const wp = $('weap'); if (wp) { const t = mode === 'foot' ? 'Beryl · LPM / V — strzał · L — latarka ' + (WPN.lightOn ? 'wł.' : 'wył.') : mode === 'car' && ACT && ACT.id === 'abrams' ? (WPN.tankGun === 'cannon' ? 'Działo 120 mm' + (WPN.reload > 0 ? ' · ładowanie ' + WPN.reload.toFixed(1) + ' s' : ' · gotowe') : 'Karabin maszynowy') + ' · Tab — zmiana · L — reflektor ' + (WPN.search ? 'wł.' : 'wył.') : ''; wp.textContent = t ? t + ' · zombie: ' + ZB.kills : ''; wp.style.display = t ? 'block' : 'none'; }
}
let bump = 0;
