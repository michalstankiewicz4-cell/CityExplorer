// Wielka Kradzież Aut VI — HUD i minimapa.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- HUD / minimapa ---------- */
const mm = $('minimap'), mmg = mm.getContext('2d');
let streetT = 0;
function hud(dt, fps) {
  $('speed').firstChild.nodeValue = Math.round(Math.abs(ego.vf || 0) * 3.6);
  const nv = mode === 'foot' && FLEET.length ? (nearVehicle() || (nearOther() && { def: { name: nearOther().name } })) : null;
  if (flashT > 0) flashT -= dt;
  else { const pr = $('prompt'), txt = nv ? '<b>' + kb('use') + '</b> — wsiądź: ' + nv.def.name : ''; if (pr.innerHTML !== txt) pr.innerHTML = txt; pr.style.display = txt ? 'block' : 'none'; }
  drawHelp();
  streetT -= dt;
  if (streetT <= 0) {
    streetT = 0.25; let best = null, bd = 1e9; const k0x = Math.floor(ego.x / ROAD_CELL), k0z = Math.floor(ego.z / ROAD_CELL);
    for (let i = k0x - 1; i <= k0x + 1; i++) for (let j = k0z - 1; j <= k0z + 1; j++) { const a = roadGrid.get(i * 100003 + j); if (a) for (const s of a) { if (!s[4]) continue; const d = segDist(ego.x, ego.z, s)[0] - s[5] / 2; if (d < bd) { bd = d; best = s[4]; } } }
    $('street').textContent = mode === 'boat' ? boatHud() : mode === 'air' ? airHud() : mode === 'rail' && rail.kind === 'tram' ? 'Nastawa ' + Math.round(rail.target * 3.6) + ' km/h' + (rail.derailed ? ' · WYKOLEJENIE (R)' : '') : best && bd < 12 ? best : '';
    $('fps').textContent = fps ? fps + ' fps' : '';
  }
  if (mm.style.display === 'none' || !W.ov) return;
  const Sz = mm.width, zoom = 2.2;   // px minimapy na m
  mmg.save(); mmg.fillStyle = '#7f8274'; mmg.fillRect(0, 0, Sz, Sz);
  mmg.translate(Sz / 2, Sz / 2);
  const fx = Math.sin(ego.th), fz = Math.cos(ego.th);
  mmg.rotate(-Math.PI / 2 - Math.atan2(fz, fx));
  mmg.scale(zoom / W.os, zoom / W.os);
  if (TS.TL) for (const k of TS.loaded.keys()) { const c = TS.ov.get(k); if (!c) continue; const [i, j] = k.split('_').map(Number), T = TS.TL.T; mmg.drawImage(c, (i * T + TS.OFF[0] - ego.x) * W.os, (j * T + TS.OFF[1] - ego.z) * W.os, T * W.os, T * W.os); }   // kafle wokół
  mmg.drawImage(W.ov, -(ego.x + E) * W.os, -(ego.z + E) * W.os);
  mmg.restore();
  mmg.fillStyle = '#ff3b30'; mmg.strokeStyle = '#fff'; mmg.lineWidth = 2;
  mmg.beginPath(); mmg.moveTo(Sz / 2, Sz / 2 - 14); mmg.lineTo(Sz / 2 + 9, Sz / 2 + 10); mmg.lineTo(Sz / 2, Sz / 2 + 5); mmg.lineTo(Sz / 2 - 9, Sz / 2 + 10); mmg.closePath(); mmg.fill(); mmg.stroke();
  // kierunek północy
  const a = -Math.PI / 2 - Math.atan2(fz, fx), nx = Math.sin(-a) * 0, ny = 0;
  const ax = Math.cos(a - Math.PI / 2), ay = Math.sin(a - Math.PI / 2);
  mmg.fillStyle = '#fff'; mmg.font = 'bold 22px system-ui'; mmg.textAlign = 'center'; mmg.textBaseline = 'middle';
  mmg.fillText('N', Sz / 2 + ax * (Sz / 2 - 22), Sz / 2 + ay * (Sz / 2 - 22));
}
