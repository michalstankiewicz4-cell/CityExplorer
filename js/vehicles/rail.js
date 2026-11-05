// Warszawa 3D — Tryb szynowy: tramwaj (fizyka koło–szyna z aTrain) i pociąg WKD, tory, drzwi, wysiadanie.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   TRYB SZYNOWY: tramwaj PESA Swing 120Na (TramKit) w fizyce z aTrain (koło–szyna: tylko siły kontaktu, bez przyklejania
   do toru) i pociąg (TrainKit) po wygładzonym torze. Tory z OSM: przycięte do mapy, wygładzone (także wysokości),
   zamienione na łuki i proste (GameLaboratory: js/behaviors/rail/path.js); szyny z tego samego opisu.
   W / S — nastawa prędkości (nastawnik), Spacja — hamulec, E — drzwi (na postoju)
   ========================================================================= */
const RAIL_CHAINS = { tram: [], subway: [], rail: [] };   // wszystkie ciągi torów (buildTrains)
let TK = null, TRAINKIT = null, PATH = null, TRAMPHYS = null, PTRACK = null;
const RAIL_LIFT = { tram: 0.01, rail: 0.45 };            // główka szyny nad osią z OSM: tramwaj w jezdni, kolej na podsypce
const mkRail = () => ({ V: null, kind: null, T: null, sim: null, s: 0, v: 0, x: 0, y: 0, z: 0, th: 0, vf: 0, doors: 0, brake: false, target: 0, poses: [], derailed: false });
const RAILS = { tram: mkRail(), train: mkRail() };   // tramwaj i pociąg stoją na swoich torach w centrum; rail — ten, którym jedziesz
let rail = RAILS.tram;
const chKey = (ch) => (ch.names || []).join('|') + ':' + Math.round(ch.len);
const RT = {
  tram: { vmax: 70 / 3.6, cam: [19, 6.5] },
  train: { acc: 0.6, power: 600e3, mass: 42000, brake: 1.0, emerg: 1.8, vmax: 60 / 3.6, cam: [17, 6.5] },
};
// ciąg torów przycięty do mapy: najdłuższy kawałek, którego punkty leżą na terenie
function clipChain(ch) {
  const lim = E - 25, runs = []; let cur = [];
  for (const p of ch.P) { if (Math.abs(p[0]) < lim && Math.abs(p[1]) < lim) cur.push(p); else { if (cur.length) runs.push(cur); cur = []; } }
  if (cur.length) runs.push(cur);
  let best = []; for (const r of runs) if (r.length > best.length) best = r;
  return best;
}
const trackCache = new Map();
// ciąg torów tylko z odcinków o danej nazwie (np. WKD): łączenie końcami odcinków (wspólne węzły), najdłuższy ciąg
function namedChain(re) {
  const L = W.lines.filter(l => l.net === 'rail' && l.samples && l.samples.length > 1 && re.test(l.t.name || ''));
  const ends = new Map(); for (const l of L) for (const [id, st] of [[l.ids[0], true], [l.ids[l.ids.length - 1], false]]) { let a = ends.get(id); if (!a) ends.set(id, a = []); a.push({ l, st }); }
  const outDir = (l, st) => { const S = l.samples, a = st ? S[1] : S[S.length - 2], b = st ? S[0] : S[S.length - 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
  let best = null;
  for (const l0 of L) {
    const used = new Set([l0]), seq = [{ l: l0, rev: false }];
    for (const fwd of [true, false]) {
      let cur = l0, atEnd = fwd;
      for (let k = 0; k < 200; k++) {
        const id = atEnd ? cur.ids[cur.ids.length - 1] : cur.ids[0], od = outDir(cur, !atEnd);
        let nx = null, bs = 0.4;
        for (const c of ends.get(id) || []) { if (used.has(c.l)) continue; const d = outDir(c.l, c.st), sc = -(od[0] * d[0] + od[1] * d[1]); if (sc > bs) { bs = sc; nx = c; } }
        if (!nx) break; used.add(nx.l);
        if (fwd) seq.push({ l: nx.l, rev: !nx.st }); else seq.unshift({ l: nx.l, rev: nx.st });
        cur = nx.l; atEnd = nx.st;
      }
    }
    const P = []; for (const e of seq) { const S = e.rev ? [...e.l.samples].reverse() : e.l.samples; for (const p of S) { const q = P[P.length - 1]; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.5) P.push(p); } }
    const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const ch = { P, cum, len: cum[cum.length - 1], names: [l0.t.name] };
    if (!best || ch.len > best.len) best = ch;
  }
  return best;
}
function railTrack(ch, westward) {   // opis toru (łuki, wysokości) dla ciągu — raz; westward: s rośnie na zachód
  const key = westward ? ch.P : ch;
  if (!trackCache.has(key)) {
    let pts = clipChain(ch); if (westward && pts.length && pts[0][0] < pts[pts.length - 1][0]) pts = pts.slice().reverse();
    trackCache.set(key, pts.length > 3 ? PATH.pathTrack(pts, { step: 4, smooth: 3 }) : null);
  }
  return trackCache.get(key);
}
// szyny: na początek tylko na linii, po której jedzie gracz (pierwsza linia tramwajowa / kolejowa); reszta później
async function buildRails(T, net) {
  PTRACK = PTRACK || await import(GL + 'js/models/structures/railway/path-track.js');
  if (!T || T.L < 20) return;
  const tm = PTRACK.buildPathTrack(T, { lift: RAIL_LIFT[net], sleepers: net === 'rail', ballast: net === 'rail', step: 1.5 }); scene.add(tm); (rail.objs = rail.objs || []).push(tm);
}
// skład i jego tor należą do obszaru, w którym stoi (centrum): w innym obszarze są ukryte, po powrocie — na swoim miejscu
async function loadRail(kind) {
  if (kind === 'tram') {
    TK = TK || await import(GL + 'js/models/train/trams/tramkit.js');
    TRAMPHYS = TRAMPHYS || await import(GL + 'js/behaviors/rail/tram.js');
    const v = TK.buildTram('swing', {}); prepModel(v.group); scene.add(v.group); (rail.objs = rail.objs || []).push(v.group);
    return { kind, v, units: v.sections.map((s) => ({ L: s.L })), gap: v.def.gap };
  }
  await import(GL + 'js/core/three-global.js');
  TRAINKIT = TRAINKIT || await import(GL + 'js/models/train/trainkit.js');
  const g = TRAINKIT.buildTrain(TRAINKIT.DEFAULT_TRAIN); prepModel(g);
  const cars = g.userData.vehicles; for (const c of cars) { g.remove(c); scene.add(c); (rail.objs = rail.objs || []).push(c); }
  return { kind, g, cars, units: cars.map((c) => ({ L: c.userData.halfLength * 2 - 0.02 })), gap: 0.02 };
}
async function parkRail(kind) {
  const prev = rail; rail = RAILS[kind];
  try { await parkRail_(kind); } finally { rail = prev; }
}
async function startRail(kind) {
  if (!RAILS[kind].V) await parkRail(kind);
  if (!RAILS[kind].V) return;
  rail = RAILS[kind]; mode = 'rail'; ego = rail; if (PED) PED.g.visible = false;
}
async function parkRail_(kind) {
  const net = kind === 'tram' ? 'tram' : 'rail';
  PATH = PATH || await import(GL + 'js/behaviors/rail/path.js');
  const R = await loadRail(kind);
  const total = R.units.reduce((a, u) => a + u.L, 0) + R.gap * (R.units.length - 1);
  // ciąg: na mapie, zmieści się skład, jak najwięcej toru na powierzchni, blisko centrum
  // WKD: linia Warszawskiej Kolei Dojazdowej, start na wschodnim końcu (Śródmieście WKD), czołem w stronę Pruszkowa — do końca mapy
  let at = null, bestD = 1e9, any = null;
  if (kind === 'train') {
    const ch = namedChain(/Kolej Dojazdowa/), T = ch && railTrack(ch, true);
    if (T && T.L > total + 40) at = { ch, T, s: total + 15 };
  }
  const above = (T, s) => { const p = T.station(s); return T.height(s) > H(p.px, p.pz) - 1.5; };
  if (!at) for (const ch of RAIL_CHAINS[net]) {
    const T = railTrack(ch); if (!T || T.L < total + 80) continue;
    if (!any) any = { ch, T, s: total + 20 };
    for (let s = total + 20; s < T.L - 60; s += 5) {
      if (!above(T, s) || !above(T, s - total) || !above(T, s + 40)) continue;
      const p = T.station(s), d = Math.hypot(p.px, p.pz); if (d < bestD) { bestD = d; at = { ch, T, s }; }
    }
  }
  at = at || any;
  if (!at) { flash('Brak toru na mapie'); return; }
  const s0 = at.s;
  await buildRails(at.T, net);
  Object.assign(rail, { area: AREA, chKey: chKey(at.ch), V: R, kind, ch: at.ch, T: at.T, s: s0, v: 0, total, lift: RAIL_LIFT[net], target: 0, derailed: false, sim: null });
  if (kind === 'tram') {
    rail.sim = TRAMPHYS.createTramSim(at.T, R.v.def, s0);
    rail.sim.onStep = railForces;
    rail.bodyS = rail.sim.bodies.map(() => s0);
  }
  for (const tr of trains) if (tr.ch === at.ch) { tr.off = true; for (const m of tr.cars) m.visible = false; }
  railPlace(0);
}
// położenie ciała na torze (rzut na oś), od poprzedniego oszacowania
function trackS(T, x, z, s) {
  for (let k = 0; k < 3; k++) { const p = T.station(s); s += (x - p.px) * p.tx + (z - p.pz) * p.tz; s = Math.max(0, Math.min(T.L, s)); }
  return s;
}
// siły świata w fizyce tramwaju: spadek toru (ciężar wzdłuż osi) i kozły oporowe na końcach toru
function railForces(sim) {
  const T = rail.T, G = 9.81;
  for (let i = 0; i < sim.bodies.length; i++) {
    const b = sim.bodies[i], g = b.grade; if (!g) continue;
    b.f[0] += g[0]; b.f[2] += g[1];
    const s = rail.bodyS[i];
    if (s < 3 || s > T.L - 3) { const p = T.station(s), e = s < 3 ? 3 - s : (T.L - 3) - s, vt = b.v[0] * p.tx + b.v[2] * p.tz; const F = 2e6 * e - 2e5 * vt * Math.sign(1); b.f[0] += p.tx * F; b.f[2] += p.tz * F; }
  }
  void G;
}
function railStep(dt) {
  const R = rail;
  if (R.kind === 'tram') return;   // tramwaj liczy fizyka (railPhysics, w klatce)
  const T = RT.train, up = on('fwd'), dn = on('back'), em = on('brake');
  let a = 0;
  if (up) a += R.v >= -0.1 ? Math.min(T.acc, T.power / T.mass / Math.max(1, Math.abs(R.v))) : T.brake;
  if (dn) a -= R.v > 0.1 ? T.brake : (R.v > -3 ? 0.5 : 0);
  if (em) a -= Math.sign(R.v) * T.emerg;
  a -= Math.sign(R.v) * (0.02 + 0.0004 * R.v * R.v);
  a -= 9.81 * (R.T.height(R.s) - R.T.height(R.s - R.total)) / Math.max(1, R.total);
  if (R.doors > 0.5) a = -Math.sign(R.v) * Math.min(Math.abs(R.v) / dt, 3);
  const v0 = R.v; R.v += a * dt; if ((em || (!up && !dn) || R.doors > 0.5) && Math.sign(R.v) !== Math.sign(v0) && v0 !== 0) R.v = 0;
  R.v = Math.max(-5, Math.min(T.vmax, R.v)); R.s += R.v * dt;
  if (R.s > R.T.L - 2) { R.s = R.T.L - 2; if (R.v > 0) { if (R.v > 2) bump = Math.min(1, R.v / 8); R.v = 0; flash('Koniec mapy — dalej trasa do Pruszkowa później. S: jazda wstecz'); } }
  if (R.s - R.total < 2) { R.s = R.total + 2; if (R.v < 0) { R.v = 0; flash('Koniec toru'); } }
  R.brake = (dn && R.v > 0.1) || em; R.vf = R.v;
}
// fizyka tramwaju: nastawnik (prędkość zadana jak w aTrain), kroki 1/2400 s w czasie klatki
function railPhysics(dt) {
  const R = rail, sim = R.sim; if (!sim) return;
  const T = R.T, mass = (b) => b.m;
  // nastawa: W / S zmieniają prędkość zadaną, Spacja — hamulec; drzwi otwarte — hamulec postojowy
  if (on('fwd')) R.target = Math.min(RT.tram.vmax, R.target + 2.5 * dt);
  if (on('back')) R.target = Math.max(-3, R.target - 3.5 * dt);
  sim.ctrl.target = R.target;
  sim.ctrl.brake = on('brake') || R.doors > 0.5 || (R.target === 0 && Math.abs(sim.st.speed) < 0.3);
  // spadek toru: ciężar wzdłuż osi dla każdej bryły (raz na klatkę)
  sim.bodies.forEach((b, i) => {
    const s = R.bodyS[i] = trackS(T, b.p[0], b.p[2], R.bodyS[i]), p = T.station(s);
    const slope = (T.height(Math.min(T.L, s + 1)) - T.height(Math.max(0, s - 1))) / 2, F = -mass(b) * 9.81 * slope;
    b.grade = [p.tx * F, p.tz * F];
  });
  const n = Math.min(160, Math.round(dt / TRAMPHYS.H));
  for (let k = 0; k < n && !sim.broken; k++) sim.step();
  R.v = sim.st.speed; R.vf = R.v; R.brake = sim.ctrl.brake && Math.abs(R.v) > 0.2;
  // wykolejenie: koło zeszło z główki szyny (opadło) albo zestaw kołowy zjechał w bok z osi toru
  let off = 0;
  sim.bodies.forEach((b, i) => { if (!b.Rw) return; const p = T.station(R.bodyS[i]), lat = Math.abs((b.p[0] - p.px) * -p.tz + (b.p[2] - p.pz) * p.tx); off = Math.max(off, lat, b.Rw - 0.06 - b.p[1] > 0 ? 1 : 0); });
  R.offset = off;
  if (!R.derailed && (off > 0.25 || sim.broken)) { R.derailed = true; flash('Wykolejenie! R — z powrotem na tor'); }
}
function railReset() {   // R w trybie szynowym: skład z powrotem na tor
  if (rail.kind !== 'tram') return;
  const s0 = rail.bodyS[rail.sim.bodies.indexOf(rail.sim.vehicles[0].body)] + 0;
  rail.sim = TRAMPHYS.createTramSim(rail.T, rail.V.v.def, Math.max(rail.total + 5, Math.min(rail.T.L - 5, s0 + rail.V.units[0].L / 2)));
  rail.sim.onStep = railForces; rail.bodyS = rail.sim.bodies.map(() => s0); rail.target = 0; rail.derailed = false;
}
// ustawienie: tramwaj z fizyki (człony z przechyłem i kołysaniem), pociąg wzdłuż cięciw na wygładzonym torze
function railPlace(dt) {
  const R = rail; if (!R.V) return;
  if (R.kind === 'tram') {
    railPhysics(dt);
    const sim = R.sim, T = R.T;
    TRAMPHYS.tramPoses(sim, (x, z) => T.height(trackS(T, x, z, R.s)) + R.lift, R.poses, THREE);
    R.x = R.poses[0].x; R.y = R.poses[0].y; R.z = R.poses[0].z;
    const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(R.poses[0].q); R.th = Math.atan2(fw.x, fw.z);
    R.s = R.bodyS[sim.bodies.indexOf(sim.vehicles[0].body)];
    R.V.v.update(carT, dt, { speed: R.v, poses: R.poses, work: R.doors > 0.5, pantograph: false, lights: night, brake: R.brake });
    return;
  }
  let s = R.s; const poses = [];
  for (const u of R.V.units) {
    const a = R.T.station(s), b = R.T.station(s - u.L), ya = R.T.height(s) + R.lift, yb = R.T.height(s - u.L) + R.lift;
    const yaw = Math.atan2(a.px - b.px, a.pz - b.pz), pitch = -Math.atan2(ya - yb, Math.hypot(a.px - b.px, a.pz - b.pz));
    poses.push({ x: (a.px + b.px) / 2, y: (ya + yb) / 2, z: (a.pz + b.pz) / 2, yaw, pitch });
    s -= u.L + R.V.gap;
  }
  R.x = poses[0].x; R.y = poses[0].y; R.z = poses[0].z; R.th = poses[0].yaw;
  R.V.cars.forEach((c, i) => {
    const P = poses[i]; c.position.set(P.x, P.y, P.z); c.rotation.set(0, P.yaw - Math.PI / 2, -P.pitch, 'YXZ');
    for (const w of c.userData.wheelsets || []) w.rotation.z -= R.v * dt / (c.userData.def.Rw || 0.5);
  });
}
function railDoors() { if (Math.abs(rail.v) > 0.2) { flash('Zatrzymaj się, żeby otworzyć drzwi'); return; } rail.doors = rail.doors > 0.5 ? 0 : 1; }
// E w składzie: na postoju otwiera drzwi, przy otwartych — wysiadasz (prawa strona czoła); E przy drzwiach — wsiadasz z powrotem
const railDoorAt = (R = rail) => toWorld({ x: R.x, z: R.z, th: R.th }, -2.6, R.kind === 'tram' ? 2.5 : -3);
function railUse() {
  if (Math.abs(rail.v) > 0.2) { flash('Zatrzymaj się, żeby otworzyć drzwi'); return; }
  if (rail.doors < 0.5) { rail.doors = 1; flash('Drzwi otwarte — E: wysiądź'); return; }
  const [x, z] = railDoorAt();
  Object.assign(ped, { x, z, th: rail.th, vf: 0, vy: 0 }); ped.y = surfaceAt(x, z, rail.y + 1);
  mode = 'foot'; ego = ped; camYaw = rail.th; orbit = 0; if (PED) PED.g.visible = true;
}
