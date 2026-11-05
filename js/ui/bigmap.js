// Wielka Kradzież Aut VI — Duża mapa (M): przesuwanie, zoom, przeniesienie, dopracowanie obszarów.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- duża mapa (M) ---------- */
// warstwa „dopracowanie obszarów”: mapy dokładne (ręcznie sprawdzane doktorem) i kafle generowane automatycznie
const QUAL = [
  { lat: 52.23175, lon: 21.00586, r: 1000, col: '#e6b84a', name: 'Centrum (PKiN) — najbardziej dopracowane', note: 'teren NMT, wiadukty, tunele, przejścia, tramwaje, metro, WKD; sprawdzane doktorem mapy' },
  { lat: 52.1657, lon: 20.9671, r: 2000, col: '#5aa9e6', name: 'Lotnisko Chopina (Okęcie) — dopracowane', note: 'drogi startowe z oznakowaniem, samolot' },
  { lat: 52.2400, lon: 21.0370, r: 1500, col: '#4ad6b9', name: 'Wisła — dopracowane', note: 'mosty i nabrzeża z dokładnej mapy, woda z laboratorium wody, okręt' },
  { lat: 52.23175, lon: 21.00586, r: 2000, col: '#b98ad6', name: 'Centrum ?r=2000 — dokładna mapa, mniej sprawdzana', note: 'ten sam silnik co centrum, bez ręcznych poprawek', ring: true },
];
let bmQual = false;
$('bmQual').onclick = () => { bmQual = !bmQual; $('bmQual').classList.toggle('on', bmQual); drawBigMap(); };
function drawQuality(ox, oy, s) {
  bmg.save();
  // kafle automatyczne: szare kreskowanie na wczytanych podglądach
  if (TS.TL) { const T = TS.TL.T; bmg.fillStyle = 'rgba(40,44,52,0.42)'; for (const k of TS.ov.keys()) { const [i, j] = k.split('_').map(Number); bmg.fillRect(ox + (i * T + TS.OFF[0] + E) * s, oy + (j * T + TS.OFF[1] + E) * s, T * s + 0.5, T * s + 0.5); } }
  for (const q of QUAL.slice().reverse()) {
    const [x, z] = toXZ(q.lat, q.lon), e = q.r + 150, px = ox + (x - e + E) * s, py = oy + (z - e + E) * s, w = 2 * e * s;
    bmg.fillStyle = q.col + (q.ring ? '14' : '33'); bmg.fillRect(px, py, w, w);
    bmg.setLineDash(q.ring ? [6, 5] : []); bmg.lineWidth = 2.5; bmg.strokeStyle = q.col; bmg.strokeRect(px, py, w, w); bmg.setLineDash([]);
  }
  // legenda
  const L = [...QUAL.map(q => [q.col, q.name, q.note]), ['#6b7078', 'Kafle 1 km — wygenerowane automatycznie', 'uproszczone: płaski grunt, budynki z płaskimi dachami']];
  const lx = 16, ly = 56, lh = 38; bmg.fillStyle = '#0d1014dd'; bmg.fillRect(lx, ly, 420, L.length * lh + 12);
  bmg.textAlign = 'left'; bmg.textBaseline = 'alphabetic';
  L.forEach(([c, n, d], k) => { const y = ly + 10 + k * lh; bmg.fillStyle = c; bmg.fillRect(lx + 10, y + 2, 14, 14); bmg.fillStyle = '#fff'; bmg.font = '600 13px system-ui'; bmg.fillText(n, lx + 32, y + 14); bmg.fillStyle = '#ffffffaa'; bmg.font = '12px system-ui'; bmg.fillText(d, lx + 32, y + 30); });
  bmg.restore();
}
const bm = $('bigmap'), bmg = bm.getContext('2d');
let bigOpen = false, bmZoom = 1, bmView = null;
function toggleBigMap() {
  if (!W.ov) return;
  bigOpen = !bigOpen; bm.style.display = $('bigmapHint').style.display = $('bmQual').style.display = bigOpen ? 'block' : 'none';
  if (bigOpen) { bmZoom = 1; bmPan = null; drawBigMap(); }
}
bm.addEventListener('wheel', e => { e.preventDefault(); bmZoom = Math.min(8, Math.max(0.12, bmZoom * (e.deltaY > 0 ? 0.85 : 1.18))); drawBigMap(); }, { passive: false });
// przesuwanie dużej mapy (przeciągnij): widać, co jest dalej — kafle wczytują się w podglądzie
let bmPan = null, bmDrag = null, bmMoved = false;
bm.addEventListener('pointerdown', e => { if (!bmView) return; bmDrag = { x: e.clientX, y: e.clientY, cx: bmView.cx, cz: bmView.cz }; bmMoved = false; });
addEventListener('pointermove', e => { if (!bmDrag || !bigOpen) return; const dx = e.clientX - bmDrag.x, dy = e.clientY - bmDrag.y; if (Math.hypot(dx, dy) > 4) bmMoved = true; if (bmMoved) { bmPan = { x: bmDrag.cx - dx / bmView.s, z: bmDrag.cz - dy / bmView.s }; drawBigMap(); } });
addEventListener('pointerup', () => { bmDrag = null; });
bm.addEventListener('click', e => {
  if (!bmView || bmMoved) { bmMoved = false; return; }
  const x = (e.clientX - bmView.ox) / bmView.s - E, z = (e.clientY - bmView.oy) / bmView.s - E;
  if (W.inBuilding && W.inBuilding(x, z)) { $('bigmapHint').textContent = 'Tam stoi budynek — wybierz ulicę lub plac'; return; }
  if (mode === 'car') { Object.assign(car, { x, z, vx: 0, vz: 0, vy: 0 }); car.y = surfaceAt(x, z, H(x, z)); } else if (mode === 'foot') { Object.assign(ped, { x, z, vy: 0, vf: 0 }); ped.y = surfaceAt(x, z, H(x, z)); } updateCamera(0, true); toggleBigMap();
  $('bigmapHint').textContent = 'Mapa — kliknij, aby się tam przenieść · przeciągnij = przesuwanie · kółko = zoom · ' + kb('map') + ' zamyka';
});
function drawBigMap() {
  if (!bigOpen) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (bm.width !== innerWidth * dpr || bm.height !== innerHeight * dpr) { bm.width = innerWidth * dpr; bm.height = innerHeight * dpr; }
  bmg.setTransform(dpr, 0, 0, dpr, 0, 0);
  bmg.clearRect(0, 0, innerWidth, innerHeight);
  const size = Math.min(innerWidth, innerHeight) * 0.92 * bmZoom;
  const s = size / (2 * E);
  // środek: przesunięty myszą, przy zoomie gracz, inaczej środek mapy
  const vcx = bmPan ? bmPan.x : bmZoom > 1 ? ego.x : 0, vcz = bmPan ? bmPan.z : bmZoom > 1 ? ego.z : 0;
  let ox = innerWidth / 2 - (vcx + E) * s, oy = innerHeight / 2 - (vcz + E) * s;
  bmView = { ox, oy, s, cx: vcx, cz: vcz };
  bmg.imageSmoothingEnabled = true;
  if (TS.TL) {   // kafle wokół (podglądy); brakujące trafiają do kolejki wczytywania
    const T = TS.TL.T, gx0 = (-ox / s - E) - TS.OFF[0], gz0 = (-oy / s - E) - TS.OFF[1], gx1 = gx0 + innerWidth / s, gz1 = gz0 + innerHeight / s;
    const i0 = Math.floor(gx0 / T), i1 = Math.floor(gx1 / T), j0 = Math.floor(gz0 / T), j1 = Math.floor(gz1 / T), many = (i1 - i0 + 1) * (j1 - j0 + 1) > 400;
    bmg.fillStyle = '#20252b'; bmg.fillRect(0, 0, innerWidth, innerHeight);
    TS.ovq.length = 0;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = i + '_' + j, px = ox + (i * T + TS.OFF[0] + E) * s, py = oy + (j * T + TS.OFF[1] + E) * s, c = TS.ov.get(k);
      if (c) bmg.drawImage(c, px, py, T * s + 0.5, T * s + 0.5);
      else if (!many && (TS.index.has(k) || TS.live) && !((TS.fail.get(k) || 0) > performance.now())) TS.ovq.push(k);
    }
    const mx = (vcx - TS.OFF[0]), mz = (vcz - TS.OFF[1]); TS.ovq.sort((a, b) => { const d = (k) => { const [i, j] = k.split('_').map(Number); return Math.hypot((i + 0.5) * T - mx, (j + 0.5) * T - mz); }; return d(a) - d(b); });
  }
  bmg.drawImage(W.ov, ox, oy, size, size);
  bmg.strokeStyle = '#ffffff55'; bmg.lineWidth = 1; bmg.strokeRect(ox, oy, size, size);
  // etykiety
  bmg.textAlign = 'center'; bmg.textBaseline = 'middle';
  for (const L of W.labels || []) {
    if (L.rank < 4 && bmZoom < 2) continue;
    const px = ox + (L.x + E) * s, py = oy + (L.z + E) * s;
    let a = L.ang; if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
    bmg.save(); bmg.translate(px, py); bmg.rotate(a);
    bmg.font = `${L.rank >= 4 ? 600 : 500} ${Math.round(11 + Math.min(4, bmZoom))}px system-ui`;
    bmg.lineWidth = 3; bmg.strokeStyle = '#000a'; bmg.strokeText(L.nm, 0, 0); bmg.fillStyle = '#fff'; bmg.fillText(L.nm, 0, 0);
    bmg.restore();
  }
  // PKiN (także na innej mapie — w swoim miejscu)
  const pkl = toXZ(52.23175, 21.00586), pk = [ox + (pkl[0] + E) * s, oy + (pkl[1] + E) * s];
  bmg.fillStyle = '#c6ae7f'; bmg.beginPath(); bmg.arc(pk[0], pk[1], 5, 0, 7); bmg.fill();
  bmg.font = '600 13px system-ui'; bmg.lineWidth = 3; bmg.strokeStyle = '#000a'; bmg.strokeText('PKiN', pk[0], pk[1] - 14); bmg.fillStyle = '#f3e3c0'; bmg.fillText('PKiN', pk[0], pk[1] - 14);
  if (bmQual) drawQuality(ox, oy, s);
  // auto
  const cx = ox + (ego.x + E) * s, cy = oy + (ego.z + E) * s, fx = Math.sin(ego.th), fz = Math.cos(ego.th);
  bmg.save(); bmg.translate(cx, cy); bmg.rotate(Math.atan2(fz, fx) + Math.PI / 2);
  bmg.fillStyle = '#ff3b30'; bmg.strokeStyle = '#fff'; bmg.lineWidth = 2;
  bmg.beginPath(); bmg.moveTo(0, -13); bmg.lineTo(8, 9); bmg.lineTo(0, 4); bmg.lineTo(-8, 9); bmg.closePath(); bmg.fill(); bmg.stroke(); bmg.restore();
  // róża wiatrów
  bmg.font = 'bold 16px system-ui'; bmg.fillStyle = '#fff'; bmg.fillText('N ↑', innerWidth - 40, 30);
  // skala 200 m
  bmg.fillStyle = '#fff'; bmg.fillRect(20, innerHeight - 30, 200 * s, 3); bmg.font = '12px system-ui'; bmg.textAlign = 'left'; bmg.fillText('200 m', 20, innerHeight - 42);
}
