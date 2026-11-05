// Wielka Kradzież Aut VI — Teren: kafle wysokości Terrarium, NMT GUGiK, maska budynków, obróbka wysokości.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   TEREN (Terrarium / AWS elevation tiles)
   ========================================================================= */
async function loadTerrain() {
  const z = 15, n = 2 ** z;
  const lx = lon => (lon + 180) / 360 * n;
  const ly = lat => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
  const x0 = Math.floor(lx(BBOX.w)), x1 = Math.floor(lx(BBOX.e)), y0 = Math.floor(ly(BBOX.n)), y1 = Math.floor(ly(BBOX.s));
  const tw = x1 - x0 + 1, th = y1 - y0 + 1, W = tw * 256, Hh = th * 256;
  const data = new Float32Array(W * Hh);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d', { willReadFrequently: true });
  let done = 0;
  const jobs = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) jobs.push([tx, ty]);
  await Promise.all(jobs.map(async ([tx, ty]) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`;
    await img.decode();
    g.clearRect(0, 0, 256, 256); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, 256, 256).data;
    const ox = (tx - x0) * 256, oy = (ty - y0) * 256;
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const k = (j * 256 + i) * 4; data[(oy + j) * W + ox + i] = d[k] * 256 + d[k + 1] + d[k + 2] / 256 - 32768;
    }
    done++; status(`Pobieram wysokości terenu — kafel ${done}/${jobs.length}`, 0.5 + 0.1 * done / jobs.length);
  }));
  const sample = (lat, lon) => {
    let px = (lx(lon) - x0) * 256 - 0.5, py = (ly(lat) - y0) * 256 - 0.5;
    px = Math.max(0, Math.min(W - 1.001, px)); py = Math.max(0, Math.min(Hh - 1.001, py));
    const i = px | 0, j = py | 0, fx = px - i, fy = py - j;
    const a = data[j * W + i], b = data[j * W + i + 1], c = data[(j + 1) * W + i], d = data[(j + 1) * W + i + 1];
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  };
  const N = SEG + 1, h = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const [lat, lon] = toLL(-E + i * 2 * E / SEG, -E + j * 2 * E / SEG); h[j * N + i] = sample(lat, lon);
  }
  return h;
}
// NMT GUGiK (model gruntu bez budynków, oczko 5 m) — plik w repo, pokrywa centrum ~2 km od PKiN
async function loadNMT() {
  if (location.protocol === 'file:') return null;
  try {
    const [m, b] = await Promise.all([fetchT('teren-nmt.json', {}, 15000).then(r => r.ok ? r.json() : null), fetchT('teren-nmt.bin', {}, 30000).then(r => r.ok ? r.arrayBuffer() : null)]);
    if (!m || !b) return null;
    const north = m.south + m.nrows * m.dy, east = m.west + m.ncols * m.dx, sl = 0.003;
    if (BBOX.w < m.west - sl || BBOX.e > east + sl || BBOX.s < m.south - sl || BBOX.n > north + sl) return null;
    const v = new Uint16Array(b), W_ = m.ncols, H_ = m.nrows;
    const at = (i, j) => v[Math.max(0, Math.min(H_ - 1, j)) * W_ + Math.max(0, Math.min(W_ - 1, i))];
    const sample = (lat, lon) => { const px = (lon - m.west) / m.dx - 0.5, py = (north - lat) / m.dy - 0.5, i = Math.floor(px), j = Math.floor(py), fx = px - i, fy = py - j; return m.base + m.scale * (at(i, j) * (1 - fx) * (1 - fy) + at(i + 1, j) * fx * (1 - fy) + at(i, j + 1) * (1 - fx) * fy + at(i + 1, j + 1) * fx * fy); };
    SEG = Math.min(700, Math.round(2 * E / 4));
    const N = SEG + 1, h = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [lat, lon] = toLL(-E + i * 2 * E / SEG, -E + j * 2 * E / SEG); h[j * N + i] = sample(lat, lon); }
    return h;
  } catch (e) { console.warn('NMT', e); return null; }
}
// maska budynków na siatce terenu (dane wysokości to model pokrycia — dachy trzeba wyciąć)
function buildingMask(D) {
  const N = SEG + 1, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = g.strokeStyle = '#fff'; g.lineJoin = 'round';
  g.lineWidth = 2.5;   // ~20 m poszerzenia
  const sc = SEG / (2 * E), P = id => { const p = D.nodes[id]; if (!p) return null; const [x, z] = toXZ(p[0], p[1]); return [(x + E) * sc, (z + E) * sc]; };
  const relW = new Set(); for (const r of D.rels) if (r.t && (r.t.building || r.t['building:part'])) for (const m of r.m) relW.add(m[0]);
  for (const w of D.ways) {
    if (!((w.t && (w.t.building || w.t['building:part'])) || relW.has(w.id))) continue;
    if (w.t && (w.t.building === 'roof' || num(w.t.layer) < 0)) continue;
    g.beginPath(); let k = 0; for (const id of w.n) { const p = P(id); if (!p) continue; k++ ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.closePath(); g.fill(); g.stroke();
  }
  const d = g.getImageData(0, 0, N, N).data, m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = d[i * 4] > 60 ? 1 : 0;
  return m;
}
function processTerrain(raw, mask, dtm) {
  const N = SEG + 1; let h = Float32Array.from(raw);
  if (dtm) mask = null;
  if (mask) {   // dopełnianie dziur z sąsiednich znanych komórek (warstwa po warstwie)
    const known = Uint8Array.from(mask, v => 1 - v); let left = known.reduce((a, b) => a + (1 - b), 0);
    if (left < N * N * 0.9) for (let pass = 0; pass < 200 && left > 0; pass++) {
      const nh = Float32Array.from(h), nk = Uint8Array.from(known);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const k = j * N + i; if (known[k]) continue; let s = 0, c = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const q = jj * N + ii; if (known[q]) { s += h[q]; c++; } }
        if (c) { nh[k] = s / c; nk[k] = 1; left--; }
      }
      h = nh; known.set(nk);
    }
  }
  const pass = (src, r, op) => {   // separowalny filtr: min / max / średnia
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let acc = op === 'min' ? 1e9 : op === 'max' ? -1e9 : 0, c = 0;
      for (let k = -r; k <= r; k++) { const ii = Math.min(N - 1, Math.max(0, i + k)); const v = src[j * N + ii]; if (op === 'min') acc = Math.min(acc, v); else if (op === 'max') acc = Math.max(acc, v); else { acc += v; c++; } }
      tmp[j * N + i] = op === 'avg' ? acc / c : acc;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let acc = op === 'min' ? 1e9 : op === 'max' ? -1e9 : 0, c = 0;
      for (let k = -r; k <= r; k++) { const jj = Math.min(N - 1, Math.max(0, j + k)); const v = tmp[jj * N + i]; if (op === 'min') acc = Math.min(acc, v); else if (op === 'max') acc = Math.max(acc, v); else { acc += v; c++; } }
      out[j * N + i] = op === 'avg' ? acc / c : acc;
    }
    return out;
  };
  // otwarcie morfologiczne usuwa "garby" po budynkach z modelu pokrycia, potem wygładzenie
  if (!dtm) { h = pass(h, 2, 'min'); h = pass(h, 2, 'max'); h = pass(h, 2, 'avg'); h = pass(h, 2, 'avg'); }
  const c = h[(N >> 1) * N + (N >> 1)];
  let edgeSum = 0, edgeN = 0;
  for (let i = 0; i < N; i++) { edgeSum += h[i] + h[(N - 1) * N + i] + h[i * N] + h[i * N + N - 1]; edgeN += 4; }
  const base = edgeSum / edgeN - c;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -E + i * 2 * E / SEG, z = -E + j * 2 * E / SEG;
    const d = Math.max(Math.abs(x), Math.abs(z));
    const t = Math.min(1, Math.max(0, (d - (E - 110)) / 100));   // łagodne opadanie do poziomu tła na brzegu
    const s = t * t * (3 - 2 * t);
    h[j * N + i] = (h[j * N + i] - c) * (1 - s) + base * s;
  }
  return { h, base };
}
