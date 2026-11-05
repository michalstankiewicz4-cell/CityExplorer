// Wielka Kradzież Aut VI — Składy AI: pociągi, metro, tramwaje jeżdżące po ciągach torów.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   POCIĄGI, METRO, TRAMWAJE — jeżdżą tam i z powrotem po najdłuższych ciągach torów
   ========================================================================= */
const TRAIN_T = {
  tram: { n: 2, L: 15, gap: 1.2, w: 2.4, h: 3.3, v: 11, body: '#c8202c', top: '#efc232', count: 12, minLen: 250 },
  subway: { n: 6, L: 19.5, gap: 0.9, w: 2.7, h: 3.6, v: 17, body: '#9aa3ab', top: '#2f63b5', count: 4, minLen: 300 },
  rail: { n: 4, L: 22, gap: 1.0, w: 2.9, h: 4.1, v: 19, body: '#e9e4d6', top: '#2f8a3a', count: 5, minLen: 300 },
};
const trains = [];
function makeTrainCar(T, front) {
  const g = new THREE.Group();
  const bm = new THREE.MeshStandardMaterial({ color: T.body, roughness: 0.5, metalness: 0.25 });
  const tm = new THREE.MeshStandardMaterial({ color: T.top, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1a232c', roughness: 0.1, metalness: 0.6, emissive: '#ffd9a0', emissiveIntensity: 0.15 });
  const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(T.w, T.h * 0.42, T.L), bm, 0.55 + T.h * 0.21);
  add(new THREE.BoxGeometry(T.w + 0.02, T.h * 0.3, T.L - 0.6), glass, 0.55 + T.h * 0.42 + T.h * 0.15);
  add(new THREE.BoxGeometry(T.w, T.h * 0.12, T.L), tm, 0.55 + T.h * 0.72 + T.h * 0.06);
  add(new THREE.BoxGeometry(T.w * 0.9, 0.5, T.L * 0.9), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.8 }), 0.3);
  const hl = new THREE.MeshStandardMaterial({ color: '#fff', emissive: front ? '#fff3d0' : '#ff2020', emissiveIntensity: 1.2 });
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), hl); m.position.set(s * T.w * 0.32, 0.9, T.L / 2 + 0.03); g.add(m); }
  return g;
}
function buildTrains(lines) {
  const byNet = { tram: [], subway: [], rail: [] };
  for (const l of lines) if (byNet[l.net] && l.samples && l.samples.length > 1) byNet[l.net].push(l);
  for (const net in byNet) {
    const L = byNet[net], T = TRAIN_T[net]; if (!L.length) continue;
    const ends = new Map();
    for (const l of L) { for (const [id, st] of [[l.ids[0], true], [l.ids[l.ids.length - 1], false]]) { let a = ends.get(id); if (!a) ends.set(id, a = []); a.push({ l, st }); } }
    const outDir = (l, st) => { const s = l.samples, a = st ? s[1] : s[s.length - 2], b = st ? s[0] : s[s.length - 1]; const dx = b[0] - a[0], dz = b[1] - a[1], d = Math.hypot(dx, dz) || 1; return [dx / d, dz / d]; };
    const used = new Set();
    const grow = (l, rev) => {
      const out = []; let cur = l, cr = rev;
      for (let k = 0; k < 300; k++) {
        const endAtStart = cr, endId = cr ? cur.ids[0] : cur.ids[cur.ids.length - 1], od = outDir(cur, endAtStart);
        let best = null, bs = 0.4;
        for (const c of ends.get(endId) || []) { if (c.l === cur || used.has(c.l)) continue; const id = outDir(c.l, c.st); const sc = -(od[0] * id[0] + od[1] * id[1]); if (sc > bs) { bs = sc; best = c; } }
        if (!best) break;
        used.add(best.l); out.push({ l: best.l, rev: !best.st }); cur = best.l; cr = !best.st;
      }
      return out;
    };
    const chains = [];
    for (const l of [...L].sort((a, b) => b.len - a.len)) {
      if (used.has(l)) continue; used.add(l);
      const back = grow(l, true).reverse().map(e => ({ l: e.l, rev: !e.rev }));
      const seq = [...back, { l, rev: false }, ...grow(l, false)];
      const P = [];
      for (const e of seq) { const s = e.rev ? [...e.l.samples].reverse() : e.l.samples; for (const p of s) { const q = P[P.length - 1]; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.5) P.push(p); } }
      const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      const len = cum[cum.length - 1]; if (len >= T.minLen) chains.push({ P, cum, len, names: [...new Set(seq.map(e => e.l.t.name).filter(Boolean))] });
    }
    chains.sort((a, b) => b.len - a.len);
    RAIL_CHAINS[net] = chains;
    for (const ch of chains.slice(0, T.count)) {
      const tl = T.n * (T.L + T.gap); if (ch.len < tl + 30) continue;
      const cars = []; for (let i = 0; i < T.n; i++) { const m = makeTrainCar(T, i === 0); scene.add(m); cars.push(m); }
      trains.push({ T, ch, cars, s: tl + rnd() * (ch.len - tl), dir: 1, v: T.v * 0.6, wait: 0, pos: cars.map(() => [0, 0, 0, 0, 0]) });
    }
  }
  return trains.length;
}
function trackAt(ch, s) {
  s = Math.max(0, Math.min(ch.len, s));
  let lo = 0, hi = ch.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ch.cum[m] <= s) lo = m; else hi = m; }
  const a = ch.P[lo], b = ch.P[hi], d = ch.cum[hi] - ch.cum[lo] || 1, t = (s - ch.cum[lo]) / d;
  return [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t, a[1] + (b[1] - a[1]) * t];
}
function updateTrains(dt) {
  for (const tr of trains) {
    if (tr.off) continue;
    const T = tr.T, tl = T.n * (T.L + T.gap), ch = tr.ch;
    if (tr.wait > 0) { tr.wait -= dt; if (tr.wait <= 0) { tr.dir *= -1; tr.s = tr.dir > 0 ? tr.s + tl : tr.s - tl; } }
    else {
      const head = tr.s, left = tr.dir > 0 ? ch.len - head : head;
      const vt = Math.min(T.v, Math.sqrt(Math.max(0, 2 * 0.9 * (left - 2))));
      tr.v += Math.max(-2.5 * dt, Math.min(1.0 * dt, vt - tr.v));
      tr.s += tr.dir * tr.v * dt;
      if (left < 2.5 && tr.v < 0.5) { tr.v = 0; tr.wait = 8; }
    }
    tr.cars.forEach((m, i) => {
      const off = i * (T.L + T.gap), c = tr.s - tr.dir * (off + T.L / 2);
      const f = trackAt(ch, c + tr.dir * T.L * 0.35), b = trackAt(ch, c - tr.dir * T.L * 0.35);
      m.position.set((f[0] + b[0]) / 2, (f[1] + b[1]) / 2 + (T === TRAIN_T.rail ? RAIL_LIFT.rail : 0), (f[2] + b[2]) / 2);   // na szynach (kolej na podsypce)
      const yaw = Math.atan2(f[0] - b[0], f[2] - b[2]);
      m.rotation.set(-Math.atan2(f[1] - b[1], Math.hypot(f[0] - b[0], f[2] - b[2])), yaw, 0, 'YXZ');
      tr.pos[i] = [m.position.x, m.position.y, m.position.z, yaw, tr.dir * tr.v];
    });
  }
}
// kolizja auta z wagonami (prostokąty)
function collideTrains() {
  for (const tr of trains) {
    const T = tr.T;
    for (const [cx, cy, cz, yaw, v] of tr.pos) {
      if (Math.abs(car.y - cy) > 2.6 || Math.abs(car.x - cx) > T.L || Math.abs(car.z - cz) > T.L) continue;
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
      for (const o of [1.35, 0, -1.35]) {
        const px = car.x + Math.sin(car.th) * o - cx, pz = car.z + Math.cos(car.th) * o - cz;
        const lz = px * fx + pz * fz, lx = px * rx + pz * rz, hw = T.w / 2 + 1.0, hl = T.L / 2 + 1.0;
        if (Math.abs(lx) >= hw || Math.abs(lz) >= hl) continue;
        const penX = hw - Math.abs(lx), penZ = hl - Math.abs(lz);
        let nx, nz, pen; if (penX < penZ) { const s = Math.sign(lx) || 1; nx = rx * s; nz = rz * s; pen = penX; } else { const s = Math.sign(lz) || 1; nx = fx * s; nz = fz * s; pen = penZ; }
        car.x += nx * pen; car.z += nz * pen;
        const tvx = fx * v, tvz = fz * v, rvn = (car.vx - tvx) * nx + (car.vz - tvz) * nz;
        if (rvn < 0) { car.vx -= 1.3 * rvn * nx; car.vz -= 1.3 * rvn * nz; bump = Math.max(bump, Math.min(1, -rvn / 12)); }
      }
    }
  }
}
