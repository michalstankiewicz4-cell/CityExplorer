// Warszawa 3D — Klawisze: akcje do zmiany w opcjach, obsługa klawiatury; parkowanie i start pojazdów.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- klawisze (do zmiany w opcjach, Esc) ---------- */
const ACTIONS = [
  ['fwd', 'Naprzód / gaz', ['KeyW', 'ArrowUp']], ['back', 'Wstecz / hamulec', ['KeyS', 'ArrowDown']], ['left', 'W lewo', ['KeyA', 'ArrowLeft']], ['right', 'W prawo', ['KeyD', 'ArrowRight']],
  ['fast', 'Bieg / turbo / gaz więcej', ['ShiftLeft', 'ShiftRight']], ['slow', 'Gaz mniej (samolot)', ['ControlLeft', 'ControlRight']], ['brake', 'Hamulec ręczny', ['Space', '']], ['use', 'Wsiądź / wysiądź', ['KeyE', '']],
  ['cam', 'Kamera', ['KeyC', '']], ['map', 'Mapa', ['KeyM', '']], ['mini', 'Minimapa', ['KeyK', '']], ['night', 'Noc / dzień', ['KeyN', '']],
  ['xray', 'Rentgen', ['KeyX', '']], ['pix', 'Pixel-art', ['KeyP', '']], ['reset', 'Powrót na start', ['KeyR', '']], ['help', 'Pomoc', ['KeyH', '']],
  ['fire', 'Strzał (też krótkie kliknięcie LPM)', ['KeyV', '']], ['weapon', 'Broń czołgu: działo / karabin', ['Tab', '']], ['light', 'Latarka / reflektor czołgu', ['KeyL', '']],
  ['rudL', 'Ster kierunku w lewo (samolot)', ['KeyQ', '']], ['rudR', 'Ster kierunku w prawo (samolot)', ['KeyF', '']], ['gear', 'Podwozie (samolot)', ['KeyG', '']], ['flaps', 'Klapy (samolot)', ['KeyB', '']],
];
const store = { get(k, d) { try { const v = localStorage.getItem('w3d.' + k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('w3d.' + k, JSON.stringify(v)); } catch {} } };
let BIND = Object.assign(Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k.slice()])), store.get('keys', {}));
const on = (a) => BIND[a].some(c => c && keys[c]);
const actionOf = (code) => { for (const [a] of ACTIONS) if (BIND[a].includes(code)) return a; return null; };
let rebinding = null;
addEventListener('keydown', e => {
  if (rebinding) { e.preventDefault(); if (e.code !== 'Escape') { const [a, i] = rebinding; for (const k in BIND) BIND[k] = BIND[k].map(c => c === e.code ? '' : c); BIND[a][i] = e.code; store.set('keys', BIND); } rebinding = null; drawKeys(); return; }
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (!started) return;
  if (e.code === 'Escape') { if (bigOpen) toggleBigMap(); else toggleOptions(); return; }
  if (optOpen) return;
  const a = actionOf(e.code);
  if (a === 'use' && !e.repeat) { if (mode === 'rail') railUse(); else if (mode === 'air') airExit(); else if (mode === 'boat') boatUse(); else useCar(); }
  if (a === 'reset') { if (mode === 'rail') railReset(); else if (mode === 'air') airReset(); else if (mode === 'boat') boatReset(); else resetCar(); }
  if (mode === 'air' && !e.repeat && a === 'gear') { air.c.gear = 1 - air.c.gear; flash('Podwozie: ' + (air.c.gear ? 'wypuszczanie' : 'chowanie')); }
  if (mode === 'air' && !e.repeat && a === 'flaps') { air.c.flaps = 1 - air.c.flaps; flash('Klapy: ' + (air.c.flaps ? 'wypuszczone' : 'schowane')); }
  if (a === 'cam') camMode = (camMode + 1) % 3;
  if (a === 'weapon' && !e.repeat && mode === 'car' && ACT && ACT.id === 'abrams') { WPN.tankGun = WPN.tankGun === 'cannon' ? 'mg' : 'cannon'; flash(WPN.tankGun === 'cannon' ? 'Działo 120 mm' : 'Karabin maszynowy'); }
  if (a === 'light' && !e.repeat) { if (mode === 'car' && ACT && ACT.id === 'abrams') WPN.search = !WPN.search; else WPN.lightOn = !WPN.lightOn; }
  if (a === 'fire' && !e.repeat) fire();
  if (a === 'night') setNight(!night);
  if (a === 'xray') setXray(!xray);
  if (a === 'pix') { pixelMode = !pixelMode; canvas.classList.toggle('pix', pixelMode); onResize(); }
  if (a === 'map') toggleBigMap();
  if (a === 'mini') { const m = $('minimap'); m.style.display = m.style.display === 'none' ? '' : 'none'; }
  if (a === 'help') { const m = $('help'); m.style.display = m.style.display === 'none' ? '' : 'none'; }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

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
