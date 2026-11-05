// Warszawa 3D — Fizyka jazdy: koła (auto, autobus), gąsienice (czołg).
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
function physics(dt) {
  if (mode === 'air') airStep(dt);
  if (mode === 'boat') boatStep(dt);
  if (mode === 'foot') walk(dt);
  if (mode === 'rail') railStep(dt);
  if (FLEET.homed) for (const V of FLEET) {
    const drive = mode === 'car' && V === ACT;
    if (!drive && V.s.rest) continue;          // stojący pojazd nie wymaga liczenia
    car = V.s; VDEF = V.def;
    if (V.def.kind === 'tracked') driveTank(dt, drive, V); else driveWheels(dt, drive, V);
    collideV(V, drive);
    if (drive) collideTrains();
    const sy = surfaceAt(car.x, car.z, car.y);
    if (car.y - sy > 0.25 || car.vy > 0.5) { car.vy -= 9.81 * dt; car.y += car.vy * dt; if (car.y <= sy) { if (car.vy < -6 && drive) bump = Math.max(bump, Math.min(1, -car.vy / 15)); car.y = sy; car.vy = 0; } car.air = car.y > sy + 0.05; }
    else { car.y = sy; car.vy = 0; car.air = false; }
    car.rest = !drive && !car.air && Math.abs(car.vf) < 0.02 && Math.hypot(car.vx, car.vz) < 0.03;
  }
  if (ACT) { car = ACT.s; VDEF = ACT.def; }
}
// koła: auto i autobus (poślizg boczny, ręczny, opór, nachylenie)
function driveWheels(dt, drive, V) {
  const T = TUNE[V.id];
  const up = drive && on('fwd'), dn = drive && on('back'), lf = drive && on('left'), rt = drive && on('right');
  const hb = !drive || on('brake'), turbo = drive && on('fast');
  let fx = Math.sin(car.th), fz = Math.cos(car.th), rx = -fz, rz = fx;
  let vf = car.vx * fx + car.vz * fz, vl = car.vx * rx + car.vz * rz;
  car.brake = drive && ((dn && vf > 0.5) || (up && vf < -0.5) || on('brake'));
  const vmax = VDEF.maxSpeed, VMAX = turbo ? vmax * 1.25 : vmax, ACC = turbo ? T.accT : T.acc, BR = V.id === 'urbino18' ? 6 : 16;
  if (up) { if (vf < -0.5) vf += BR * dt; else vf += ACC * Math.max(0, 1 - vf / VMAX) * dt; }
  if (dn) { if (vf > 0.5) vf -= BR * dt; else vf -= ACC * 0.7 * Math.max(0, 1 + vf / 14) * dt; }
  if (!up && !dn) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 1.3 * dt);
  if (hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 5 * dt);
  vf -= 0.0011 * vf * Math.abs(vf) * dt * 10;
  if (!car.air) { const hf = surfaceAt(car.x + fx * 1.4, car.z + fz * 1.4, car.y), hbk = surfaceAt(car.x - fx * 1.4, car.z - fz * 1.4, car.y); vf -= 9.81 * Math.max(-0.6, Math.min(0.6, (hf - hbk) / 2.8)) * dt; }
  const grip = hb && drive ? 1.1 : 8; vl *= Math.exp(-(drive ? grip : 20) * dt);
  const target = (rt ? 1 : 0) - (lf ? 1 : 0);
  car.steer += (target - car.steer) * Math.min(1, 7 * dt);
  const delta = car.steer * T.steer / (1 + Math.abs(vf) / 20);
  car.delta = delta;
  car.th += -(vf / VDEF.wheelbase) * Math.tan(delta) * (hb && drive ? 1.35 : 1) * dt;
  fx = Math.sin(car.th); fz = Math.cos(car.th); rx = -fz; rz = fx;
  car.vx = fx * vf + rx * vl; car.vz = fz * vf + rz * vl;
  car.x += car.vx * dt; car.z += car.vz * dt;
  car.vf = vf;
}
// gąsienice: bez poślizgu bocznego, obrót w miejscu (A/D), wolniejszy skręt przy prędkości
function driveTank(dt, drive, V) {
  const T = TUNE[V.id];
  const up = drive && on('fwd'), dn = drive && on('back'), lf = drive && on('left'), rt = drive && on('right');
  const turbo = drive && on('fast');
  const thr = (up ? 1 : 0) - (dn ? 1 : 0), target = thr * VDEF.maxSpeed * (thr < 0 ? 0.4 : 1) * (turbo ? 1.12 : 1);
  let vf = car.vf;
  const rate = Math.abs(target) > Math.abs(vf) && Math.sign(target) === Math.sign(vf || target) ? (turbo ? T.accT : T.acc) : 5;
  vf += Math.max(-rate * dt, Math.min(rate * dt, target - vf));
  car.brake = drive && thr === 0 && Math.abs(vf) > 0.5 || (thr !== 0 && Math.sign(thr) !== Math.sign(vf) && Math.abs(vf) > 0.5);
  if (!car.air) { const fx0 = Math.sin(car.th), fz0 = Math.cos(car.th), hf = surfaceAt(car.x + fx0 * 2.5, car.z + fz0 * 2.5, car.y), hbk = surfaceAt(car.x - fx0 * 2.5, car.z - fz0 * 2.5, car.y); vf -= 9.81 * 0.25 * Math.max(-0.6, Math.min(0.6, (hf - hbk) / 5)) * dt; }
  const tw = ((lf ? 1 : 0) - (rt ? 1 : 0)) * (0.7 - 0.35 * Math.min(1, Math.abs(vf) / 15));
  car.w += (tw - car.w) * Math.min(1, 3 * dt);
  car.th += car.w * dt;
  const fx = Math.sin(car.th), fz = Math.cos(car.th);
  car.vx = fx * vf; car.vz = fz * vf; car.x += car.vx * dt; car.z += car.vz * dt; car.vf = vf;
}
