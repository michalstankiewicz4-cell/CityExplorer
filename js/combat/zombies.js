// Wielka Kradzież Aut VI — Zombie: pula, pojawianie się, pościg, atak (bez szkód), śmierć, ciała, krew; efekty (cząstki, smugacze, wybuchy, jedno światło wybuchów).
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   ZOMBIE, BROŃ, ŚWIATŁA: zombie (człowiek z LifeKit: skóra i ubranie zombie, warstwy ruchu „zombie” i „atak”) —
   w dzień kilku powolnych, w nocy więcej i szybszych; idą do gracza, przy nim (także przy pojeździe) atakują, ale nie
   robią szkód. Pieszo: karabinek Beryl (WeaponKit) i latarka (GearKit); czołg: armata albo karabin maszynowy
   (Tab), reflektor szperacz (L). Rozjechane i zastrzelone zombie zostają na ziemi z krwią.
   ========================================================================= */
const ZB = { pool: [], list: [], corpses: [], decals: [], t: 0, def: null, LK: null, spawnT: 0, kills: 0 };
const FX = { tracers: [], booms: [], parts: null, pv: [], pi: 0 };
const zMax = () => night ? 66 : 21;
const zSpeedOf = () => night ? 2.4 + Math.random() * 1.0 : 0.4 + Math.random() * 0.3;
// krew: nieregularna plama (raz, płótno 128 px)
const BLOOD_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.random() * 40, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, s = 8 + Math.random() * (28 - r * 0.45);
    const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(90,6,6,0.95)'); gr.addColorStop(0.7, 'rgba(70,4,4,0.85)'); gr.addColorStop(1, 'rgba(60,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const SCORCH_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(10,9,8,0.95)'); gr.addColorStop(0.6, 'rgba(25,22,20,0.7)'); gr.addColorStop(1, 'rgba(30,28,25,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const decalGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function decal(tex, x, z, sx, sz, rot, y) {
  const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.position.set(x, (y ?? surfaceAt(x, z, H(x, z) + 1)) + 0.03, z); m.rotation.y = rot; m.scale.set(sx, 1, sz); m.renderOrder = 2; scene.add(m);
  ZB.decals.push(m); if (ZB.decals.length > 120) { const o = ZB.decals.shift(); scene.remove(o); o.material.dispose(); }
}
// cząstki: krew i pył (jeden bufor, kolejne sloty)
function fxInit() {
  const N = 600, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-1e5), 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  FX.parts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false })); FX.parts.frustumCulled = false; scene.add(FX.parts);
  FX.pv = Array.from({ length: N }, () => ({ v: [0, 0, 0], life: 0 }));
}
function burst(x, y, z, n, col, spd = 3) {
  if (!FX.parts) fxInit(); const P = FX.parts.geometry.attributes.position, C = FX.parts.geometry.attributes.color, c = new THREE.Color(col);
  for (let k = 0; k < n; k++) { const i = FX.pi = (FX.pi + 1) % FX.pv.length, p = FX.pv[i]; P.setXYZ(i, x, y, z); C.setXYZ(i, c.r, c.g, c.b); p.v = [(Math.random() - 0.5) * spd, Math.random() * spd * 0.8, (Math.random() - 0.5) * spd]; p.life = 0.6 + Math.random() * 0.5; }
}
function tracer(a, b, col = 0xffd27a) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]), m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
  scene.add(m); FX.tracers.push({ m, life: 0.07 });
}
function boom(x, y, z, r) {
  const fl = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
  fl.position.set(x, y + 0.5, z); scene.add(fl);
  // jedno stałe światło wybuchów (dodawanie świateł do sceny przebudowuje wszystkie shadery — przycięcie gry)
  if (!FX.light) { FX.light = new THREE.PointLight(0xffa040, 0, 150, 2); scene.add(FX.light); }
  const L = FX.light; L.distance = r * 12; L.position.set(x, y + 2, z);
  const smoke = []; for (let k = 0; k < 9; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3b3835, transparent: true, opacity: 0.75, depthWrite: false, roughness: 1 })); s.position.set(x + (Math.random() - 0.5) * r * 0.6, y + 0.5 + Math.random() * r * 0.4, z + (Math.random() - 0.5) * r * 0.6); s.userData.v = [(Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2]; scene.add(s); smoke.push(s); }
  FX.booms.push({ fl, L, smoke, t: 0, r });
  decal(SCORCH_TEX, x, z, r * 0.9, r * 0.9, Math.random() * 6.28);
  burst(x, y + 0.3, z, 60, 0x5a4a38, 12);
  const d = Math.hypot(camPos.x - x, camPos.z - z); bump = Math.max(bump, Math.min(1, 25 / Math.max(10, d)));
}
function fxStep(dt) {
  if (FX.parts) {
    const P = FX.parts.geometry.attributes.position;
    for (let i = 0; i < FX.pv.length; i++) { const p = FX.pv[i]; if (p.life <= 0) continue; p.life -= dt; p.v[1] -= 9.81 * dt;
      let y = P.getY(i) + p.v[1] * dt; const x = P.getX(i) + p.v[0] * dt, z = P.getZ(i) + p.v[2] * dt; if (p.life <= 0) y = -1e5; P.setXYZ(i, x, y, z); }
    P.needsUpdate = true;
  }
  for (let i = FX.tracers.length - 1; i >= 0; i--) { const t = FX.tracers[i]; t.life -= dt; t.m.material.opacity = Math.max(0, t.life / 0.07); if (t.life <= 0) { scene.remove(t.m); t.m.geometry.dispose(); t.m.material.dispose(); FX.tracers.splice(i, 1); } }
  for (let i = FX.booms.length - 1; i >= 0; i--) {
    const b = FX.booms[i]; b.t += dt; const k = b.t / 0.35;
    b.fl.scale.setScalar(b.r * (0.3 + 0.9 * Math.min(1, k))); b.fl.material.opacity = Math.max(0, 1 - k); if (b.L === FX.light && FX.booms[FX.booms.length - 1] === b) b.L.intensity = Math.max(0, 40000 * (1 - b.t / 0.3));
    for (const s of b.smoke) { s.position.x += s.userData.v[0] * dt; s.position.y += s.userData.v[1] * dt; s.position.z += s.userData.v[2] * dt; s.scale.setScalar(b.r * 0.25 * (1 + b.t)); s.material.opacity = Math.max(0, 0.75 * (1 - b.t / 3)); }
    if (b.t > 3) { scene.remove(b.fl); b.fl.geometry.dispose(); b.fl.material.dispose(); for (const s of b.smoke) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); } FX.booms.splice(i, 1); }
  }
}
/* ---------- zombie ---------- */
function zBuild() {
  const LK = window.LifeKit; if (!LK) return null;
  const def = LK.CREATURES.find(c => c.id === 'humanHead') || LK.CREATURES[0], P = {};
  for (const q of def.params) P[q.key] = q.value;
  const pick = (k, label) => { const q = def.params.find(x => x.key === k); const i = q && q.choices ? q.choices.findIndex(c => c.startsWith(label)) : -1; return i >= 0 ? i : P[k]; };
  P.height = 1.6 + Math.random() * 0.3; P.build = Math.random(); P.frame = Math.random();
  P.tone = pick('tone', Math.random() < 0.7 ? 'Zombie' : 'Corpse'); P.suit = pick('suit', Math.random() < 0.6 ? 'Torn' : 'Graphite');
  P.hair = Math.floor(Math.random() * 4); P.hairColor = Math.floor(Math.random() * 6); P.seed = Math.floor(Math.random() * 1000);
  const c = LK.build(def.id, P, { detail: 0.6 });
  c.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  scene.add(c.group); return c;
}
// zmiana obszaru: zombie, ciała i plamy znikają (nowy obszar zaludni się sam)
function zClearAll() { for (const z of ZB.list) zFree(z); ZB.list.length = 0; ZB.corpses.length = 0; for (const m of ZB.decals) { scene.remove(m); m.material.dispose(); } ZB.decals.length = 0; }
// zombie wracają do puli zamiast znikać (budowa nowego człowieka zajmuje chwilę — przycięcie przy pojawianiu)
function zFree(z) {
  if (ZB.pool.length < 80) { z.c.group.visible = false; z.c.group.rotation.set(0, 0, 0); ZB.pool.push(z.c); return; }
  scene.remove(z.c.group); z.c.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
}
// pula na start (w trakcie wczytywania): kilka gotowych zombie
function zPrebuild(n) { for (let i = 0; i < n; i++) { const c = zBuild(); if (!c) return; c.group.visible = false; ZB.pool.push(c); } }
function zSpawn(t) {
  const c0 = t || ego, far = t ? t.air || (!t.remote && mode === 'air') : mode === 'air';
  for (let k = 0; k < 12; k++) {
    const a = Math.random() * 6.28, d = far ? 80 + Math.random() * 300 : 45 + Math.random() * 70, x = c0.x + Math.sin(a) * d, z = c0.z + Math.cos(a) * d;
    if (W.inBuilding && W.inBuilding(x, z)) continue; if (boat.mask && isWater(x, z)) continue;
    if (zWall(x, z, H(x, z) + 1)) continue;
    const c = ZB.pool.pop() || zBuild(); if (!c) return; c.group.visible = true; c.group.rotation.set(0, 0, 0);
    const y = surfaceAt(x, z, H(x, z) + 1);
    ZB.list.push({ c, x, z, y, th: Math.random() * 6.28, sp: zSpeedOf(), hp: 2, wander: Math.random() * 6.28, atk: 0, t0: Math.random() * 10 });
    return;
  }
}
function zWall(x, z, y) { const a = collGrid.get(Math.floor(x / COLL_CELL) * 100003 + Math.floor(z / COLL_CELL)); return !!a && a.some(sg => sg[4] === 0 && sg[7] !== 't' && y >= sg[5] && y <= sg[6] + 1 && segDist(x, z, sg)[0] < 0.45); }
// gracz jako cel: środek, kierunek, połowa długości i promień (pieszy, pojazd, skład, samolot, okręt)
function egoShape() {
  if (mode === 'car' && ACT) return { x: car.x, z: car.z, th: car.th, hl: ACT.id === 'urbino18' ? 7.5 : ACT.id === 'abrams' ? 3.2 : 1.4, r: ACT.id === 'abrams' ? 1.9 : ACT.id === 'urbino18' ? 1.3 : 0.9, v: Math.abs(car.vf) };
  if (mode === 'rail') return { x: rail.x, z: rail.z, th: rail.th, hl: 7, r: 1.4, v: Math.abs(rail.v) };
  if (mode === 'air') return { x: air.ego.x, z: air.ego.z, th: air.ego.th, hl: 4, r: 3, v: air.sim.state.onGround ? Math.hypot(air.sim.state.v[0], air.sim.state.v[2]) : 0, air: !air.sim.state.onGround };
  if (mode === 'boat') return { x: boat.ego.x, z: boat.ego.z, th: boat.ego.th, hl: 55, r: 6, v: 0, water: true };
  return { x: ped.x, z: ped.z, th: ped.th, hl: 0, r: 0.4, v: 0 };
}
function capDist(S, x, z) { const fx = Math.sin(S.th), fz = Math.cos(S.th), dx = x - S.x, dz = z - S.z, al = Math.max(-S.hl, Math.min(S.hl, dx * fx + dz * fz)); return Math.hypot(dx - fx * al, dz - fz * al) - S.r; }
// fromNet: śmierć przyszła z sieci (albo zgłoszenie idzie osobno) — gospodarz nie rozsyła jej drugi raz
function zKill(z, dir, crushed, fromNet) {
  if (NET.on && NET.host && z.nid && !fromNet) { z.sent = true; netSend('*', { t: 'zd', id: z.nid, dir, cr: crushed ? 1 : 0 }); }
  z.dead = true; z.fall = 0; z.dir = dir; z.crushed = crushed;
  z.c.animate(carT, 1, { gait: 'idle' });   // rozluźniony, potem upada na wznak
  const y = surfaceAt(z.x, z.z, z.y + 1);
  decal(BLOOD_TEX, z.x - Math.sin(z.th) * 0.9, z.z - Math.cos(z.th) * 0.9, 1.6 + Math.random(), 1.6 + Math.random(), Math.random() * 6.28, y);
  if (crushed) { const fx = Math.sin(dir), fz = Math.cos(dir); decal(BLOOD_TEX, z.x + fx * 2.5, z.z + fz * 2.5, 1.1, 4.5, dir, y); }
  burst(z.x, y + 1.1, z.z, crushed ? 50 : 25, 0x7a0a0a, crushed ? 6 : 3);
  ZB.corpses.push(z); ZB.kills++;
  if (ZB.corpses.length > 50) { const old = ZB.corpses.shift(); zFree(old); ZB.list.splice(ZB.list.indexOf(old), 1); if (old.net) NET.zmap.delete(old.nid); }
}
function zHit(z, p) {
  burst(p.x, p.y, p.z, 14, 0x8a0b0b, 2.5);
  const head = p.y > z.y + 1.5, dir = Math.atan2(z.x - ego.x, z.z - ego.z);
  if (z.net) { netSend(NET.hostId, { t: 'hit', id: z.nid, head: head ? 1 : 0, dir }); return; }   // zombie gospodarza: trafienie liczy on
  z.hp -= head ? 3 : 1;   // w głowę — od razu
  if (z.hp <= 0) zKill(z, dir, false);
}
function zombiesStep(dt) {
  if (!started || switching || !window.LifeKit) return;
  if (NET.on && !NET.host) { netZombiesStep(dt); return; }   // z innymi: zombie prowadzi gospodarz
  ZB.spawnT -= dt;
  const alive = ZB.list.filter(z => !z.dead), T = netTargets(), nP = T.length;
  if (ZB.spawnT <= 0 && alive.length < zMax() * Math.min(2, (1 + nP) / 2)) { ZB.spawnT = (night ? 0.2 : 0.85) / nP; const t = T[Math.floor(Math.random() * nP)]; if (!t.water) zSpawn(t); }
  for (let i = ZB.list.length - 1; i >= 0; i--) {
    const z = ZB.list[i];
    if (z.dead) {   // upadek na wznak (0,6 s), potem leży
      if (z.fall < 1) { z.fall = Math.min(1, z.fall + dt / 0.6); const k = z.fall * z.fall; z.c.group.rotation.set(-Math.PI / 2 * k, z.th, 0, 'YXZ'); z.c.group.position.y = z.y + 0.12 * k; }
      continue;
    }
    // najbliższy gracz (pieszo albo pojazd); za daleko od wszystkich — znika (z samolotu widać dalej)
    let S = T[0], dc = capDist(S, z.x, z.z), far = true;
    for (const t of T) { const dd = Math.hypot(z.x - t.x, z.z - t.z); if (dd < (t.air || (t === T[0] && mode === 'air') ? 480 : 190)) far = false; const c = capDist(t, z.x, z.z); if (c < dc) { dc = c; S = t; } }
    if (far) { zFree(z); ZB.list.splice(i, 1); continue; }
    const d0 = Math.hypot(z.x - S.x, z.z - S.z);
    // przejechany: pojazd w ruchu przez zombie
    if (S.v > 2.5 && dc < 0.35 && !S.air) { zKill(z, S.th, true); if (!S.remote && mode === 'car' && ACT && ACT.id !== 'abrams') bump = Math.max(bump, 0.25); continue; }
    z.sp = night ? Math.max(z.sp, 2.4) : Math.min(z.sp, 0.7);
    let want = z.th, go = 0, atk = 0;
    if (d0 < 75 && !S.air) {   // goni gracza; przy nim (i przy pojeździe) atakuje — bez szkód
      want = Math.atan2(S.x - z.x, S.z - z.z);
      if (dc < 0.9) atk = 1; else go = z.sp;
      if (S.water && boat.mask && isWater(z.x + Math.sin(want) * 1.5, z.z + Math.cos(want) * 1.5)) { go = 0; atk = 1; }
    } else { z.wander += (Math.random() - 0.5) * dt; want = z.wander; go = 0.35; }
    let dth = ((want - z.th + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    z.th += Math.max(-2.5 * dt, Math.min(2.5 * dt, dth));
    if (go) {
      const nx = z.x + Math.sin(z.th) * go * dt, nz = z.z + Math.cos(z.th) * go * dt;
      if (!zWall(nx, nz, z.y + 1) && !(W.inBuilding && W.inBuilding(nx, nz))) { z.x = nx; z.z = nz; } else { z.wander = z.th + (Math.random() < 0.5 ? 1.4 : -1.4); z.th = z.wander; }
    }
    z.y = surfaceAt(z.x, z.z, z.y + 0.8);
    z.atk += (atk - z.atk) * Math.min(1, 6 * dt); z.go = go;
    z.c.group.position.set(z.x, z.y, z.z); z.c.group.rotation.set(0, z.th, 0);
    z.c.animate(carT + z.t0, dt, { gait: go > 0.05 ? (go > 1.9 ? 'run' : 'walk') : 'idle', speed: Math.max(0.4, go), layers: { zombie: 1, attack: z.atk } });
  }
}
