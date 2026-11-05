// Warszawa 3D — Siatki świata: zderzenia, drogi, nawierzchnie (pomosty, tunele), przejścia; surfaceAt().
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   BUDOWA ŚWIATA
   ========================================================================= */
const W = {};   // stan świata: kolizje, drogi, itp.
const COLL_CELL = 16;
const collGrid = new Map();
function collAdd(ax, az, bx, bz, r = 0, y0 = -1e9, y1 = 1e9, kind = '') {   // kind: b budynek, t drzewo, p filar, r bariera, d spód pomostu, w mur/ściana tunelu, e nasyp, h mur portalu, g brama
  const x0 = Math.floor((Math.min(ax, bx) - r) / COLL_CELL), x1 = Math.floor((Math.max(ax, bx) + r) / COLL_CELL);
  const z0 = Math.floor((Math.min(az, bz) - r) / COLL_CELL), z1 = Math.floor((Math.max(az, bz) + r) / COLL_CELL);
  if ((x1 - x0 + 1) * (z1 - z0 + 1) > 400) return;
  const s = [ax, az, bx, bz, r, y0, y1, kind];
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 100003 + j; let a = collGrid.get(k); if (!a) collGrid.set(k, a = []); a.push(s); }
}
const roadGrid = new Map(), ROAD_CELL = 30;
function roadAdd(ax, az, bx, bz, name, w) {
  const x0 = Math.floor(Math.min(ax, bx) / ROAD_CELL), x1 = Math.floor(Math.max(ax, bx) / ROAD_CELL), z0 = Math.floor(Math.min(az, bz) / ROAD_CELL), z1 = Math.floor(Math.max(az, bz) / ROAD_CELL);
  if ((x1 - x0 + 1) * (z1 - z0 + 1) > 200) return;
  const s = [ax, az, bx, bz, name, w];
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 100003 + j; let a = roadGrid.get(k); if (!a) roadGrid.set(k, a = []); a.push(s); }
}
function segDist(px, pz, s) {
  const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - s[0]) * dx + (pz - s[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
  const cx = s[0] + dx * t, cz = s[1] + dz * t; return [Math.hypot(px - cx, pz - cz), cx, cz];
}

const ROAD_W = { motorway: 22, trunk: 20, primary: 16, secondary: 13, tertiary: 10, unclassified: 7, residential: 7, living_street: 6, service: 4.5, pedestrian: 6, footway: 2.6, path: 2, cycleway: 2.2, steps: 2.6, track: 3, busway: 7, road: 6 };
const FOOT_NET = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'track', 'bridleway']);
const ROAD_RANK = { service: 1, living_street: 2, residential: 2, unclassified: 2, road: 2, busway: 3, tertiary: 4, secondary: 5, primary: 6, trunk: 7, motorway: 8 };
