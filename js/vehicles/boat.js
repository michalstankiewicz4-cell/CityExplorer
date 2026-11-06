// Wielka Kradzież Aut VI — Okręt (ShipKit, zachowanie „okręt na wodzie”) i woda z laboratorium wody (WaterKit), maska koryta.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   OKRĘT: ORP Błyskawica (ShipKit z GameLaboratory) na Wiśle; woda z laboratorium wody (WaterKit), ruch: zachowanie
   „okręt na wodzie”. Woda jest liczona w układzie okrętu (jak w laboratorium: okręt w środku, woda płynie obok) i
   rysowana drugim przebiegiem z tą samą głębią; maska wody (rzeka z OSM) wycina ją do koryta.
   klawisze: js/core/input.js (ACTIONS) — naprzód / wstecz: telegraf, w lewo / w prawo: ster, hamulec ręczny: stop maszyn, wsiądź / wysiądź: przy brzegu
   ========================================================================= */
const boat = { V: null, sim: null, def: null, c: { throttle: 0, rudder: 0 }, ego: { x: 0, y: 0, z: 0, th: 0, vf: 0 }, yw: 0, waves: [], t: 0, u: null, wscene: null, wcam: null, mask: null, maskBusy: false, off: null, area: null };
let WK = null, SHIPK = null, SHIPB = null;
const KN = 0.5144;
// maska wody 4 × 4 km (2 m/px) wokół punktu, z kafli (obszary wody i linie rzek)
async function boatMask(cx, cz) {
  if (!TS.TL || boat.maskBusy) return; boat.maskBusy = true;
  try {
    const S = 2048, SZ = 4096, x0 = cx - SZ / 2, z0 = cz - SZ / 2, k = S / SZ, T = TS.TL.T;
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = g.lineJoin = 'round';
    const gi0 = Math.floor((x0 - TS.OFF[0]) / T), gi1 = Math.floor((x0 + SZ - TS.OFF[0]) / T), gj0 = Math.floor((z0 - TS.OFF[1]) / T), gj1 = Math.floor((z0 + SZ - TS.OFF[1]) / T);
    for (let i = gi0; i <= gi1; i++) for (let j = gj0; j <= gj1; j++) {
      const d = await tileData(i + '_' + j); if (!d) continue;
      const ox = (i * T + TS.OFF[0] - x0) * k, oz = (j * T + TS.OFF[1] - z0) * k, q = k / 10;
      for (const a of d.a) if (a[0] === 'water') { g.beginPath(); for (let r = 1; r < a.length; r++) { const c = a[r]; for (let n = 1; n < c.length; n += 2) n === 1 ? g.moveTo(ox + c[n] * q, oz + c[n + 1] * q) : g.lineTo(ox + c[n] * q, oz + c[n + 1] * q); g.closePath(); } g.fill('evenodd'); }
      for (const l of d.l) if (/^(river|canal)$/.test(l[0])) { g.beginPath(); for (let n = 2; n < l.length; n += 2) n === 2 ? g.moveTo(ox + l[n] * q, oz + l[n + 1] * q) : g.lineTo(ox + l[n] * q, oz + l[n + 1] * q); g.lineWidth = Math.max(2, l[1] * k); g.stroke(); }
    }
    const px = g.getImageData(0, 0, S, S).data, a = new Uint8Array(S * S); for (let n = 0; n < S * S; n++) a[n] = px[n * 4];
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace;
    if (boat.mask && boat.mask.tex) boat.mask.tex.dispose();
    boat.mask = { x0, z0, SZ, S, a, tex, cx, cz };
    if (boat.u) { boat.u.tMask.value = tex; boat.u.uMaskW.value.set(x0, z0, SZ, 1); }
  } finally { boat.maskBusy = false; }
}
function isWater(x, z) {
  const m = boat.mask; if (!m) return true;
  const i = Math.floor((x - m.x0) / m.SZ * m.S), j = Math.floor((z - m.z0) / m.SZ * m.S);
  if (i < 0 || j < 0 || i >= m.S || j >= m.S) return false;
  return m.a[j * m.S + i] > 127;
}
async function parkBoat() {
  if (boat.V) return;
  if (!WK) [WK, SHIPK, SHIPB] = await Promise.all([import(GL + 'js/envs/water/waterkit.js'), import(GL + 'js/models/ships-sea/index.js'), import(GL + 'js/behaviors/water/ship.js')]);
  const m = SHIPK.buildShip('blyskawica', {}); prepModel(m.group); scene.add(m.group); boat.V = m; boat.area = AREA;
  boat.def = SHIPB.shipDef(m, { mass: 2.144e6, power: 54000 * 745.7, vmax: 39 * KN });
  // woda z laboratorium wody: rzeka (zmarszczki, mulista), fala dziobowa, kilwater, piana przy burtach
  const u = WK.waterUniforms(), ht = WK.hullTexture(m.lines);
  u.uHull.value = ht.tex; u.uHullZ.value.set(ht.z0, ht.z1, ht.max, 0); u.uShip.value.set(0, m.lines.zBow, m.lines.zStern, m.beam / 2);
  const L = WK.LOOKS.river; boat.waves = WK.waveSet(WK.SEAS.river, 210, 7); WK.setWaves(u, boat.waves);
  u.uDeep.value.set(L.deep); u.uScatter.value.set(L.scatter); u.uShine.value = L.shine; u.uRipples.value = L.ripples; u.uCrest.value = L.crest; u.uReflect.value = 0.9; u.uCurrent.value = 0.8;
  u.uShipFx.value.set(1, 1, 1, 0);
  u.tMask = { value: null }; u.uMaskW = { value: new THREE.Vector4(0, 0, 1, 0) }; u.uFrame = { value: new THREE.Vector4(0, 0, 1, 0) };
  const mat = WK.waterMaterial(u);
  mat.fragmentShader = mat.fragmentShader
    .replace('      void main() {\n        float dist', `      uniform sampler2D tMask; uniform vec4 uMaskW, uFrame;
      void main() {
        if (uMaskW.w > 0.5) {   // koryto rzeki: poza maską wody nic nie rysujemy
          vec2 wxz = uFrame.xy + vec2(vWorld.x * uFrame.z + vWorld.z * uFrame.w, -vWorld.x * uFrame.w + vWorld.z * uFrame.z);
          vec2 muv = (wxz - uMaskW.xy) / uMaskW.z;
          if (muv.x < 0.0 || muv.y < 0.0 || muv.x > 1.0 || muv.y > 1.0 || texture2D(tMask, vec2(muv.x, 1.0 - muv.y)).r < 0.5) discard;
        }
        float dist`)
    .replace(/gl_FragColor = vec4\(col, mix\(alpha, 1\.0, max\(max\(F \* 0\.8, foam\), ice\.x\)\)\);/, '$&\n#include <tonemapping_fragment>\n#include <colorspace_fragment>');
  const mesh = new THREE.Mesh(WK.polarGrid(160, 120, 0.6, 3000), mat); mesh.frustumCulled = false;
  boat.u = u; boat.wscene = new THREE.Scene(); boat.wscene.add(mesh);
  boat.wcam = new THREE.PerspectiveCamera(); boat.wcam.matrixAutoUpdate = false; boat.wcam.matrixWorldAutoUpdate = false;
  // miejsce: oś Wisły najbliżej środka obszaru, dziobem z nurtem; poziom wody z terenu w korycie
  const wc = toXZ(AREAS.wisla.lat, AREAS.wisla.lon);   // miejsce okrętu: Wisła przy Moście Świętokrzyskim
  await boatMask(wc[0], wc[1]);
  let best = null, bd = 1e9;
  if (TS.TL) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const gi = Math.floor((wc[0] - TS.OFF[0]) / TS.TL.T) + i, gj = Math.floor((wc[1] - TS.OFF[1]) / TS.TL.T) + j, d = await tileData(gi + '_' + gj); if (!d) continue;
    const ox = gi * TS.TL.T + TS.OFF[0], oz = gj * TS.TL.T + TS.OFF[1];
    for (const l of d.l) if (l[0] === 'river') for (let n = 2; n < l.length - 2; n += 2) {
      const ax = ox + l[n] / 10, az = oz + l[n + 1] / 10, bx = ox + l[n + 2] / 10, bz = oz + l[n + 3] / 10, mx = (ax + bx) / 2, mz = (az + bz) / 2, dd = Math.hypot(mx - wc[0], mz - wc[1]);
      if (dd < bd && isWater(mx, mz)) { bd = dd; best = { x: mx, z: mz, th: Math.atan2(bx - ax, bz - az) }; }
    }
  }
  if (!best && boat.mask) { const M = boat.mask; for (let n = 0; n < M.S * M.S; n += 7) if (M.a[n] > 127) { const x = M.x0 + (n % M.S + 0.5) * M.SZ / M.S, z = M.z0 + (Math.floor(n / M.S) + 0.5) * M.SZ / M.S, dd = Math.hypot(x - wc[0], z - wc[1]); if (dd < bd) { bd = dd; best = { x, z, th: 0 }; } } }
  best = best || { x: wc[0], z: wc[1], th: 0 };
  const hs = []; for (let a = -600; a <= 600; a += 25) for (let b = -600; b <= 600; b += 25) if (isWater(best.x + a, best.z + b)) hs.push(H(best.x + a, best.z + b));
  hs.sort((p, q) => p - q); boat.yw = (hs.length ? hs[Math.floor(hs.length * 0.9)] : H(best.x, best.z)) + 0.3;
  boat.base = best; boat.spawn = boatSlotPoint(mySlot()); boatReset();
}
// miejsce gracza na rzece (gra z innymi): kolejne okręty wzdłuż nurtu, co 160 m (gdy tam woda)
const BOAT_ALONG = [0, 160, -160, 320];
function boatSlotPoint(slot) { const b = boat.base, d = BOAT_ALONG[slot || 0], x = b.x + Math.sin(b.th) * d, z = b.z + Math.cos(b.th) * d; return d && isWater(x, z) ? { x, z, th: b.th } : d ? { x: b.x - Math.cos(b.th) * 40 * Math.sign(d), z: b.z + Math.sin(b.th) * 40 * Math.sign(d), th: b.th } : b; }
async function startBoat() {
  if (!boat.V) await parkBoat();
  mode = 'boat'; ego = boat.ego; boat.off = null; if (PED) PED.g.visible = false;
}
function boatReset() { const sp = boat.spawn; boat.sim = SHIPB.createShip(boat.def, { x: sp.x, z: sp.z, th: sp.th }); boat.c.throttle = 0; boat.c.rudder = 0; boat.off = null; boatSync(); }
function boatSync() { const s = boat.sim.state, e = boat.ego; e.x = s.x; e.z = s.z; e.y = boat.yw + 2; e.th = s.th; e.vf = s.vf; }
function boatStep(dt) {
  const c = boat.c;
  if (on('fwd')) c.throttle = Math.min(1, c.throttle + 0.25 * dt);
  if (on('back')) c.throttle = Math.max(-0.4, c.throttle - 0.25 * dt);
  if (on('brake')) c.throttle = 0;
  c.rudder = (on('right') ? 1 : 0) - (on('left') ? 1 : 0);
  boat.t += dt; boat.sim.step(dt, c, boat.waves, boat.t, isWater);
  const s = boat.sim.state, m = boat.mask;
  if (!m || Math.hypot(s.x - m.cx, s.z - m.cz) > 1000) boatMask(s.x, s.z);
  boatSync();
}
function boatPlace(dt) {
  const s = boat.sim.state, g = boat.V.group, u = boat.u;
  g.position.set(s.x, boat.yw + s.heave, s.z); g.rotation.set(-s.pitch, s.th, s.roll, 'YXZ');
  // woda w układzie okrętu: kamera przeliczona do niego, fale płyną obok z prędkością okrętu
  u.uTime.value = boat.t; u.uShift.value = s.shift; u.uShip.value.x = Math.max(0, s.vf);
  u.uFrame.value.set(s.x, s.z, Math.cos(s.th), Math.sin(s.th));
  u.uSun.value.copy(SUN_DIR); u.uSunCol.value.set(night ? '#30364a' : '#fff1dc'); u.uLight.value = night ? 0.15 : 1;
  u.uSkyH.value.copy(scene.fog.color); u.uSkyZ.value.copy(scene.background); u.uSkySea.value.copy(scene.fog.color); u.uFogCol.value.copy(scene.fog.color); u.uFogFar.value = scene.fog.far;
  u.uRes.value.set(renderer.domElement.width, renderer.domElement.height);
}
function boatRenderWater() {
  if (!boat.V || !boat.sim) return;
  const s = boat.sim.state, M = new THREE.Matrix4().makeRotationY(s.th).setPosition(s.x, boat.yw, s.z).invert(), w = boat.wcam;
  camera.updateMatrixWorld();
  w.matrixWorld.multiplyMatrices(M, camera.matrixWorld); w.matrixWorldInverse.copy(w.matrixWorld).invert();
  w.projectionMatrix.copy(camera.projectionMatrix); w.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(boat.wscene, w); renderer.autoClear = ac;
}
function boatHud() {
  const s = boat.sim.state, c = boat.c, tel = c.throttle > 0.02 ? 'naprzód ' + Math.round(c.throttle * 100) + '%' : c.throttle < -0.02 ? 'wstecz ' + Math.round(-c.throttle * 250) + '%' : 'stop';
  return `${(s.vf / KN).toFixed(1)} w · telegraf: ${tel} · ster ${c.rudder > 0 ? 'prawo' : c.rudder < 0 ? 'lewo' : 'zero'}` + (s.aground ? ' · MIELIZNA' : '');
}
// „wsiądź / wysiądź”: na postoju przy brzegu wysiadasz na ląd (najbliższy suchy punkt z boku); przy burcie — wsiadasz
function boatShore() {
  const s = boat.sim.state, fx = Math.sin(s.th), fz = Math.cos(s.th);
  for (let d = 8; d <= 70; d += 2) for (const sd of [1, -1]) for (const zz of [0, 20, -20]) {
    const x = s.x + fx * zz + fz * d * sd, z = s.z + fz * zz - fx * d * sd; if (!isWater(x, z)) return [x + fz * sd * 2, z - fx * sd * 2];
  }
  return null;
}
function boatUse() {
  const s = boat.sim.state;
  if (Math.abs(s.vf) > 0.6) { flash('Zatrzymaj okręt, żeby zejść na ląd'); return; }
  const p = boatShore(); if (!p) { flash('Podpłyń do brzegu, żeby zejść na ląd'); return; }
  Object.assign(ped, { x: p[0], z: p[1], th: s.th, vf: 0, vy: 0 }); ped.y = surfaceAt(p[0], p[1], H(p[0], p[1]) + 1);
  boat.c.throttle = 0; mode = 'foot'; ego = ped; camYaw = s.th; orbit = 0; if (PED) PED.g.visible = true;
}
function boatCamera(dt, snap) {
  const s = boat.sim.state, g = boat.V.group;
  if (camMode === 2) {   // z mostka
    g.updateMatrixWorld(true); camPos.copy(g.localToWorld(new THREE.Vector3(0, boat.V.lines.deck(20) + 9.5, 20)));
    const tl = Math.max(-1.2, Math.min(1.2, -tilt)), h = s.th + orbit;
    camLook.set(camPos.x + Math.sin(h) * Math.cos(tl) * 50, camPos.y + Math.sin(tl) * 50, camPos.z + Math.cos(h) * Math.cos(tl) * 50);
    if (camera.near !== 0.3) { camera.near = 0.3; camera.updateProjectionMatrix(); }
  } else {
    if (!dragging && performance.now() - mouse.last > 1500 && Math.abs(s.vf) > 0.5) { orbit *= Math.exp(-1.6 * dt); tilt *= Math.exp(-1.6 * dt); }   // kamera sama wraca za okręt
    const far = camMode === 1, d0 = far ? 290 : 135, h0 = far ? 95 : 38, h = s.th + orbit;
    const r = Math.hypot(d0, h0) * camDist, el = Math.max(0.03, Math.min(1.4, Math.atan2(h0, d0) + tilt));
    const want = new THREE.Vector3(-Math.sin(h) * Math.cos(el) * r, Math.sin(el) * r, -Math.cos(h) * Math.cos(el) * r);
    if (!boat.off || snap) boat.off = want.clone(); else boat.off.lerp(want, 1 - Math.exp(-4 * dt));
    camPos.set(s.x + boat.off.x, boat.yw + boat.off.y, s.z + boat.off.z);
    const gy = Math.max(H(camPos.x, camPos.z), boat.yw) + 1.5; if (camPos.y < gy) camPos.y = gy;
    camLook.set(s.x + Math.sin(s.th) * 20, boat.yw + 8, s.z + Math.cos(s.th) * 20);
    if (camera.near !== 0.3) { camera.near = 0.3; camera.updateProjectionMatrix(); }
  }
  camera.up.set(0, 1, 0); camera.position.copy(camPos); camera.lookAt(camLook);
}
