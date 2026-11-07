// Wielka Kradzież Aut VI — Pieszy: chód i bieg względem kamery, zderzenia ze ścianami i pojazdami.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- pieszy: chód, bieg, zderzenia ze ścianami i z pojazdami ---------- */
function walk(dt) {
  // jak w grach z kamerą za plecami: W/S naprzód i w tył, A/D w bok — względem kamery; postać obraca się w stronę ruchu
  const f = (on('fwd') ? 1 : 0) - (on('back') ? 1 : 0), sd = (on('left') ? 1 : 0) - (on('right') ? 1 : 0), aim = (on('aim') || on('fire')) && WPN.armed, crouch = on('slow');
  const run = on('fast') && !aim && !crouch, camDir = camYaw + orbit;
  let want = 0; ped.side = 0;
  if (aim) {   // celowanie: postać patrzy tam, gdzie kamera, a chodzi bokiem i tyłem
    const d = Math.atan2(Math.sin(camDir - ped.th), Math.cos(camDir - ped.th)); ped.th += d * Math.min(1, 14 * dt);
    if (f || sd) { const dir = camDir + Math.atan2(sd, f); want = crouch ? 0.8 : 1.3; ped.mx = Math.sin(dir); ped.mz = Math.cos(dir); }
  } else if (f || sd) {
    const dir = camDir + Math.atan2(sd, f), d = Math.atan2(Math.sin(dir - ped.th), Math.cos(dir - ped.th));
    ped.th += d * Math.min(1, 9 * dt); want = (run ? 6.4 : crouch ? 1.0 : 3.1) * Math.max(0.2, Math.cos(Math.min(Math.abs(d), 1.5)));
    ped.mx = Math.sin(ped.th); ped.mz = Math.cos(ped.th);
  }
  ped.crouch = crouch;
  ped.vf += (want - ped.vf) * Math.min(1, (want > ped.vf ? 6 : 9) * dt);
  ped.x += (ped.mx ?? Math.sin(ped.th)) * ped.vf * dt; ped.z += (ped.mz ?? Math.cos(ped.th)) * ped.vf * dt;
  for (let it = 0; it < 2; it++) {
    const k0x = Math.floor(ped.x / COLL_CELL), k0z = Math.floor(ped.z / COLL_CELL);
    for (let i = k0x - 1; i <= k0x + 1; i++) for (let j = k0z - 1; j <= k0z + 1; j++) {
      const a = collGrid.get(i * 100003 + j); if (!a) continue;
      for (const sg of a) {
        if (ped.y + 0.9 < sg[5] || ped.y + 0.9 > sg[6]) continue;
        const [d, cx, cz] = segDist(ped.x, ped.z, sg), rr = 0.32 + sg[4];
        if (d < rr && d > 1e-6) { ped.x += (ped.x - cx) / d * (rr - d); ped.z += (ped.z - cz) / d * (rr - d); }
      }
    }
  }
  for (const V of FLEET) {   // pojazdy: ich okręgi
    if (Math.abs(ped.y - V.s.y) > 2.5 || Math.hypot(ped.x - V.s.x, ped.z - V.s.z) > 16) continue;
    for (const [lx, lz, r] of circlesOf(V)) {
      const [cx, cz] = toWorld(V.s, lx, lz), d = Math.hypot(ped.x - cx, ped.z - cz), rr = r + 0.3;
      if (d < rr && d > 1e-6) { ped.x += (ped.x - cx) / d * (rr - d); ped.z += (ped.z - cz) / d * (rr - d); }
    }
  }
  const sy = surfaceAt(ped.x, ped.z, ped.y + 0.4, true);
  if (ped.y - sy > 0.35 || ped.vy > 0.5) { ped.vy -= 9.81 * dt; ped.y += ped.vy * dt; if (ped.y <= sy) { ped.y = sy; ped.vy = 0; } ped.air = ped.y > sy + 0.05; }
  else { ped.y += (sy - ped.y) * Math.min(1, 14 * dt); ped.vy = 0; ped.air = false; }

}
// zderzenia pojazdu ze ścianami, drzewami, filarami i z innymi pojazdami (okręgi wzdłuż nadwozia)
function collideV(V, drive) {
  const C = circlesOf(V);
  for (let it = 0; it < 3; it++) {
    let hit = false;
    for (const [lx, lz, r] of C) {
      const [px, pz] = toWorld(car, lx, lz);
      const k0x = Math.floor(px / COLL_CELL), k0z = Math.floor(pz / COLL_CELL), reach = Math.ceil(r / COLL_CELL);
      for (let i = k0x - reach; i <= k0x + reach; i++) for (let j = k0z - reach; j <= k0z + reach; j++) {
        const a = collGrid.get(i * 100003 + j); if (!a) continue;
        for (const s of a) {
          if (car.y + 0.7 < s[5] || car.y + 0.7 > s[6]) continue;
          const [d, cx, cz] = segDist(px, pz, s); const rr = r + s[4];
          if (d < rr && d > 1e-6) { hit = push(px - cx, pz - cz, d, rr - d, drive) || hit; }
        }
      }
      for (const O of FLEET) {
        if (O === V || Math.abs(O.s.y - car.y) > 3 || Math.hypot(O.s.x - car.x, O.s.z - car.z) > 30) continue;
        for (const [ox, oz, orr] of circlesOf(O)) {
          const [cx, cz] = toWorld(O.s, ox, oz), d = Math.hypot(px - cx, pz - cz), rr = r + orr;
          if (d < rr && d > 1e-6) { hit = push(px - cx, pz - cz, d, rr - d, drive) || hit; }
        }
      }
    }
    if (!hit) break;
  }
}
function push(dx, dz, d, pen, drive) {
  const nx = dx / d, nz = dz / d;
  car.x += nx * pen; car.z += nz * pen;
  const vn = car.vx * nx + car.vz * nz;
  if (vn < 0) {
    car.vx -= 1.25 * vn * nx; car.vz -= 1.25 * vn * nz; car.vx *= 0.9; car.vz *= 0.9;
    car.vf = car.vx * Math.sin(car.th) + car.vz * Math.cos(car.th);
    if (drive) bump = Math.max(bump, Math.min(1, -vn / 15));
  }
  return true;
}
