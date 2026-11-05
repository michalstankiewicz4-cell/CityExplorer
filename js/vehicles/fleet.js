// Wielka Kradzież Aut VI — Pojazdy drogowe (RoadKit) i pieszy (LifeKit): wczytanie, wsiadanie i wysiadanie, miejsca startowe.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   POJAZDY (RoadKit z GameLaboratory) I PIESZY (LifeKit z laboratorium ludzi)
   FSO Polonez, M1A2 Abrams, Solaris Urbino 18 — stoją przy starcie; E: wsiądź / wysiądź
   ========================================================================= */
const GL = new URL('lab/', location.href).href;   // pliki z GameLaboratory skopiowane do gry (tools/sync-lab.mjs); ta sama kopia Three.js r186
let RK = null, PED = null, ENV = null;
const FLEET = [];                       // { id, def, v (model), s (stan) }
let ACT = null, car = null, VDEF = null; // pojazd gracza (ostatnio używany); car / VDEF — stan i opis liczonego teraz pojazdu
const VEH_IDS = ['polonez', 'abrams', 'urbino18'];
const PARK = { urbino18: 18, polonez: 0, abrams: -10 };     // ustawienie na starcie: metry wzdłuż ulicy
const TUNE = {                          // przyspieszenie w grze (zwykłe / Shift), kamera (odległość, wysokość), oczy w kabinie
  polonez: { acc: 6, accT: 9, steer: 0.6, cam: [8.5, 3.2], eye: ['body', 0.36, 1.15, -0.25] },
  abrams: { acc: 2.6, accT: 3.6, cam: [13, 5], eye: ['turret', -0.7, 1.33, 0.05] },
  urbino18: { acc: 2.2, accT: 3.0, steer: 0.55, cam: [17, 6], eye: ['body', 0.75, 2.0, 4.25] },
};
// okręgi kolizji pojazdu [x, z, r] w jego układzie (autobus: człon tylny obrócony o kąt przegubu)
function circlesOf(V) {
  const d = V.def;
  if (V.id === 'abrams') return [[0, 2.9, 1.8], [0, 1.0, 1.8], [0, -1.0, 1.8], [0, -2.9, 1.8]];
  if (V.id === 'urbino18') {
    const out = [[0, 4.6, 1.27], [0, 2.4, 1.27], [0, 0.2, 1.27], [0, -2.0, 1.27], [0, -3.9, 1.27]];
    const p = V.v.articulation ? V.v.articulation() : 0, c = Math.cos(p), s = Math.sin(p);
    for (const zr of [-1.1, -3.2, -5.3, -7.2]) out.push([zr * s, d.joint + zr * c, 1.27]);
    return out;
  }
  return [[0, 1.3, 0.86], [0, 0, 0.86], [0, -1.3, 0.86]];
}
const toWorld = (s, lx, lz) => { const c = Math.cos(s.th), n = Math.sin(s.th); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };
function carEnv() {   // otoczenie do odbić lakieru i chromu: niebo nad, ulica pod
  const sc = new THREE.Scene(), g = new THREE.SphereGeometry(10, 32, 16), c = [];
  const top = new THREE.Color('#b9cfe2'), hor = new THREE.Color('#e4e8ea'), bot = new THREE.Color('#4a4a46');
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10, col = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(bot, Math.min(1, -y * 4)); c.push(col.r, col.g, col.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(sc, 0.02); pm.dispose(); g.dispose();
  return rt.texture;
}
function prepModel(group) {
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m && 'envMap' in m && !m.envMap) { m.envMap = ENV; m.envMapIntensity = 0.9; } } });
}
// wczytanie modeli z postępem: progress(ułamek, nazwa etapu)
async function loadModels(progress = () => {}) {
  progress(0.02, 'Pojazdy drogowe (RoadKit)…');
  RK = await import(GL + 'js/models/road/roadkit.js');
  ENV = carEnv();
  for (let i = 0; i < VEH_IDS.length; i++) {
    const id = VEH_IDS[i], def = RK.vehicleInfo(id);
    progress(0.1 + i * 0.22, def.name + '…'); await frame();
    const v = RK.buildVehicle(id, id === 'abrams' ? { searchlight: true } : {}); prepModel(v.group); scene.add(v.group);
    FLEET.push({ id, def, v, s: { x: 0, z: 0, y: 0, vy: 0, air: false, th: 0, vx: 0, vz: 0, steer: 0, w: 0, vf: 0, brake: false, work: 0, rest: false, spawn: null } });
  }
  ACT = FLEET.find(V => V.id === 'polonez'); car = ACT.s; VDEF = ACT.def;
  // pieszy: człowiek z laboratorium ludzi (LifeKit, klasyczne skrypty na globalnym THREE)
  progress(0.8, 'Pieszy (LifeKit)…'); await frame();
  try {
    await import(GL + 'js/core/three-global.js');
    for (const f of ['js/models/life/lifekit.js', 'js/models/human/walk.js', 'js/models/human/face.js', 'js/models/human/data/bust-head.js', 'js/models/human/data/human-head.js', 'js/models/human/human.js']) await import(GL + f);
    const LK = window.LifeKit, def = LK.CREATURES.find(c => c.id === 'humanHead') || LK.CREATURES[0];
    const P = {}; for (const q of def.params) P[q.key] = q.value;
    P.height = 1.78; P.suit = 1;   // grafitowy kombinezon
    const c = LK.build(def.id, P, { detail: 1 });
    c.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    scene.add(c.group);
    PED = { c, g: c.group };
  } catch (e) { console.warn('[W3D] pieszy', e); }
  progress(1, 'Gotowe');
}
function makeCar() { const v = RK.buildVehicle('polonez', {}); return { g: v.group, v }; }   // dla doktora mapy
const ped = { x: 0, z: 0, y: 0, vy: 0, air: false, th: 0, vf: 0, steer: 0 };
let mode = 'foot', ego = ped;          // kogo prowadzi gracz: 'foot' | 'car' | 'enter' | 'exit'
let seq = 0, SEQV = null;              // wsiadanie / wysiadanie: postęp (s) i pojazd
const keys = {};
const doorOf = (V) => toWorld(V.s, V.def.doorAt.x, V.def.doorAt.z);
function nearVehicle() {
  let best = null, bd = 3.6;   // wsiadasz z większej odległości
  if (FLEET.homed) for (const V of FLEET) { const [dx, dz] = doorOf(V), d = Math.hypot(ped.x - dx, ped.z - dz); if (d < bd && Math.abs(ped.y - V.s.y) < 1.5) { bd = d; best = V; } }
  return best;
}
const outward = (V) => Math.sign(V.def.doorAt.x) * Math.PI / 2;   // kierunek od pojazdu przy drzwiach (lewa: +, prawa: −)
// inne pojazdy przy pieszym: zaparkowany samolot, skład (drzwi przy czole)
function nearOther() {
  if (air.V && mode === 'foot') { const [x, z] = airDoorAt(); if (Math.hypot(ped.x - x, ped.z - z) < 3) return { kind: 'air', name: air.V.def.name }; }
  if (boat.V && mode === 'foot') { const s = boat.sim.state, fx = Math.sin(s.th), fz = Math.cos(s.th), dx = ped.x - s.x, dz = ped.z - s.z, al = dx * fx + dz * fz, ac = Math.abs(dx * fz - dz * fx); if (Math.abs(al) < 50 && ac < 30) return { kind: 'boat', name: boat.V.info.name }; }
  if (mode === 'foot') for (const R of Object.values(RAILS)) if (R.V && R.area === AREA) { const [x, z] = railDoorAt(R); if (Math.hypot(ped.x - x, ped.z - z) < 3.5) return { kind: 'rail', R, name: R.kind === 'tram' ? 'tramwaj' : 'pociąg' }; }
  return null;
}
function useCar() {
  if (mode === 'foot') {
    const o = nearOther();
    if (o && o.kind === 'air') { mode = 'air'; ego = air.ego; air.work = 0; if (PED) PED.g.visible = false; air.off = null; return; }
    if (o && o.kind === 'rail') { rail = o.R; mode = 'rail'; ego = rail; if (PED) PED.g.visible = false; return; }
    if (o && o.kind === 'boat') { mode = 'boat'; ego = boat.ego; boat.off = null; if (PED) PED.g.visible = false; return; }
    const V = nearVehicle(); if (V) { SEQV = V; mode = 'enter'; seq = 0; }
  }
  else if (mode === 'car') {
    if (Math.abs(car.vf) > 1.5) { flash('Zatrzymaj pojazd, żeby wysiąść'); return; }
    const [dx, dz] = doorOf(ACT);
    Object.assign(ped, { x: dx, z: dz, th: car.th + outward(ACT), vf: 0, vy: 0 }); ped.y = surfaceAt(dx, dz, car.y + 0.5);
    SEQV = ACT; mode = 'exit'; seq = 0;
  }
}
let flashT = 0;
function flash(t) { $('prompt').innerHTML = t; $('prompt').style.display = 'block'; flashT = 2; }
// wsiadanie i wysiadanie: drzwi (właz) się otwierają, człowiek wchodzi / wychodzi, drzwi się zamykają
function sequence(dt) {
  for (const V of FLEET) V.s.work = 0;
  if (mode !== 'enter' && mode !== 'exit') return;
  seq += dt;
  const V = SEQV, [dx, dz] = doorOf(V), T = V.id === 'abrams' ? 2.0 : 1.5;
  V.s.work = seq < T - 0.4 ? 1 : 0;
  if (mode === 'enter') {
    const k = Math.min(1, seq / 0.5); ped.x += (dx - ped.x) * k; ped.z += (dz - ped.z) * k;
    ped.th = V.s.th - outward(V); ped.vf = seq < 0.5 ? 1 : 0;
    if (PED) PED.g.visible = seq < 0.85;
    if (seq > T) { mode = 'car'; ACT = V; car = V.s; VDEF = V.def; ego = car; V.s.rest = false; orbit = Math.atan2(Math.sin(camYaw + orbit - V.s.th), Math.cos(camYaw + orbit - V.s.th)); }
  } else {
    if (PED) PED.g.visible = seq > 0.35;
    ped.vf = seq > 0.35 && seq < 0.9 ? 1 : 0;
    if (seq > 0.35 && seq < 0.9) { ped.x += Math.sin(ped.th) * 0.9 * dt; ped.z += Math.cos(ped.th) * 0.9 * dt; }   // krok od pojazdu
    if (seq > T) { mode = 'foot'; ego = ped; camYaw = V.s.th + orbit; orbit = 0; }
  }
}

/* ---------- miejsca startowe: parkowanie pojazdów, powrót na start, szukanie ulicy przy PKiN ---------- */
function park(V, s0, along) {   // pojazd na swoim miejscu startowym
  const fx = Math.sin(s0.th), fz = Math.cos(s0.th), x = s0.x + fx * along, z = s0.z + fz * along;
  Object.assign(V.s, { x, z, th: s0.th, vx: 0, vz: 0, vy: 0, steer: 0, w: 0, vf: 0, rest: false, spawn: { x, z, th: s0.th } });
  V.s.y = surfaceAt(x, z, H(x, z));
}
function resetCar() {
  if (mode === 'foot' || mode === 'exit') {   // pieszy wraca do drzwi pojazdu
    if (mode === 'exit') { mode = 'foot'; ego = ped; if (PED) PED.g.visible = true; }
    const [dx, dz] = doorOf(ACT);
    Object.assign(ped, { x: dx, z: dz, th: ACT.s.th, vf: 0, vy: 0 }); ped.y = surfaceAt(dx, dz, ACT.s.y + 0.5);
    return;
  }
  const s = car.spawn; Object.assign(car, { x: s.x, z: s.z, th: s.th, vx: 0, vz: 0, vy: 0, steer: 0, w: 0, vf: 0 }); car.y = surfaceAt(s.x, s.z, H(s.x, s.z));
}
let SPAWN = null;
function startAt(s) {   // pojazdy zaparkowane rzędem wzdłuż ulicy, człowiek przy drzwiach Poloneza
  SPAWN = s;
  for (const V of FLEET) park(V, s, PARK[V.id] || 0);
  ACT = FLEET.find(V => V.id === 'polonez'); car = ACT.s; VDEF = ACT.def;
  mode = 'foot'; ego = ped; resetCar(); camYaw = s.th; orbit = 0;
}
function findSpawn() {
  // najbliższa główna ulica przy PKiN (preferowana Marszałkowska) z wolnym pasem na trzy pojazdy (−15…+25 m)
  let best = null;
  const free = (x, z, r) => { if (W.inBuilding(x, z)) return false; const a = collGrid.get(Math.floor(x / COLL_CELL) * 100003 + Math.floor(z / COLL_CELL)) || []; return !a.some(q => segDist(x, z, q)[0] < r); };
  for (const l of W.veh || []) {
    if (l.rank < 4 || !l.ground) continue;
    const pref = /Marszałkowska/.test(l.t.name || '') ? 0 : 140;
    for (let i = 0; i < l.pts.length - 1; i++) {
      const s = [l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1]];
      const L = Math.hypot(s[2] - s[0], s[3] - s[1]); if (L < 12) continue;
      let dx = s[2] - s[0], dz = s[3] - s[1]; if (dz > 0) { dx = -dx; dz = -dz; }   // jedziemy na północ
      dx /= L; dz /= L;
      const th = Math.atan2(dx, dz), rx = -Math.cos(th), rz = Math.sin(th), off = Math.max(1.8, l.wd * 0.25);
      for (let k = 0.1; k < 0.95; k += 0.1) {
        const x = s[0] + (s[2] - s[0]) * k + rx * off, z = s[1] + (s[3] - s[1]) * k + rz * off;
        const d = Math.hypot(x, z); if (d < 60) continue;
        const score = d + pref; if (best && score >= best.score) continue;
        let ok = true, y0 = H(x, z);
        for (let a = -15; a <= 25 && ok; a += 2) { const px = x + dx * a, pz = z + dz * a; ok = free(px, pz, 2.2) && Math.abs(surfaceAt(px, pz, y0) - y0 - a * 0) < 2.5; }
        if (ok) best = { score, x, z, th };
      }
    }
  }
  return best || { x: 0, z: 140, th: Math.PI };
}
