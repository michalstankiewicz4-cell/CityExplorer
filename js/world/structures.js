// Wielka Kradzież Aut VI — Konstrukcje: wiadukty, tunele, rampy, wykopy, przejazdy bramne, mosty nad wodą; nawierzchnia pod nogami — surfaceAt().
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* =========================================================================
   KONSTRUKCJE: wiadukty, tunele, rampy, wykopy, przejazdy bramne
   OSM podaje tylko poziom (layer), więc wysokości liczymy:
   - wiadukt: pomost liniowo między przyczółkami, podniesiony tak, by nad
     każdą przecinaną drogą/torem był prześwit; podjazdy na sąsiednich drogach
   - tunel: spąg = teren - głębokość; przy portalu uwzględniamy istniejący
     wykop w NMT, brakujący zjazd robimy na drodze dojazdowej (wykop + mury)
   ========================================================================= */
const NET_SLOPE = { road: 0.07, foot: 0.12, rail: 0.03, subway: 0.04, tram: 0.06 };
const TUBE_H = { road: 5.6, foot: 3.0, rail: 6.6, subway: 6.0, tram: 5.6 };
const tunnelDepth = (net, L) => { const a = Math.max(1, Math.abs(isNaN(L) ? 1 : L)); return net === 'subway' ? 8 + 5 * a : net === 'rail' ? 5 + 3.5 * a : net === 'foot' ? 1.5 + 3.5 * a : 4 + 3.5 * a; };
const CLEAR = { road: 5.3, foot: 3.2, rail: 6.8, subway: 6.8, tram: 6.2 };
const SURF_CELL = 12;
const surfGrid = new Map();
const passGrid = new Map(), PASS_CELL = 30;
function gridAdd(grid, cell, x0, z0, x1, z1, pad, item) {
  const a0 = Math.floor((Math.min(x0, x1) - pad) / cell), a1 = Math.floor((Math.max(x0, x1) + pad) / cell);
  const b0 = Math.floor((Math.min(z0, z1) - pad) / cell), b1 = Math.floor((Math.max(z0, z1) + pad) / cell);
  if ((a1 - a0 + 1) * (b1 - b0 + 1) > 400) return;
  for (let i = a0; i <= a1; i++) for (let j = b0; j <= b1; j++) { const k = i * 100003 + j; let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(item); }
}
// wysokość nawierzchni pod punktem: najwyższa powierzchnia nie wyżej niż yRef+1.1 (wjazd na rampę), inaczej najniższa
function surfaceAt(x, z, yRef, foot = false) {   // foot: pieszy (także posadzki przejść, schody, kładki)
  let best = -1e9, low = 1e9, inTube = false, inStair = false;
  const a = surfGrid.get(Math.floor(x / SURF_CELL) * 100003 + Math.floor(z / SURF_CELL));
  if (a) for (const s of a) {
    const dx = s[3] - s[0], dz = s[5] - s[2], l2 = dx * dx + dz * dz;
    let t = l2 > 0 ? ((x - s[0]) * dx + (z - s[2]) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (s[8] && !foot) continue;
    const d = Math.hypot(x - s[0] - dx * t, z - s[2] - dz * t); if (d > s[6] + 0.3) continue;
    const y = s[1] + (s[4] - s[1]) * t;
    if (s[7] && yRef < y + s[7] - 1) inTube = true;   // jesteśmy w tunelu: teren nad nami to strop
    if (s[8] && yRef < y + 2.5 && y <= yRef + 1.1 && y < H(x, z) - 0.3) inStair = true;       // pieszy na schodach / posadzce przejścia w wykopie: resztki terenu nad nim się nie liczą
    if (y <= yRef + 1.1 && y > best) best = y; if (y < low) low = y;
  }
  if (!inTube && !inStair) { const th = H(x, z); if (th <= yRef + 1.1 && th > best) best = th; if (th < low) low = th; }
  return best > -1e8 ? best : low;
}

function makeDeckTextures() {
  const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const noise = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.8})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } };
  return {
    road: mk(128, 512, (g, w, h) => { g.fillStyle = '#404245'; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, 0.06); g.fillStyle = '#d9d6cc'; g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h); for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 1.5, y, 3, 56); }),
    rail: mk(128, 512, (g, w, h) => { g.fillStyle = '#6f685e'; g.fillRect(0, 0, w, h); noise(g, w, h, 5000, 0.12); g.fillStyle = '#4a3c30'; for (let y = 0; y < h; y += 26) g.fillRect(18, y, w - 36, 9); g.fillStyle = '#2c2c2c'; g.fillRect(36, 0, 6, h); g.fillRect(w - 42, 0, 6, h); g.fillStyle = '#9b9b98'; g.fillRect(37, 0, 2, h); g.fillRect(w - 41, 0, 2, h); }),
    foot: mk(128, 128, (g, w, h) => { g.fillStyle = '#c3bba9'; g.fillRect(0, 0, w, h); noise(g, w, h, 800, 0.05); g.strokeStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }),
  };
}
const DECK_TEX = makeDeckTextures();
const deckMat = { road: new THREE.MeshStandardMaterial({ map: DECK_TEX.road, roughness: 0.9 }), rail: new THREE.MeshStandardMaterial({ map: DECK_TEX.rail, roughness: 1 }), foot: new THREE.MeshStandardMaterial({ map: DECK_TEX.foot, roughness: 0.95 }) };
const concMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 });
const tubeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe2a8' });
const deckKind = net => net === 'road' ? 'road' : net === 'foot' ? 'foot' : 'rail';

function buildStructures(lines, ctx) {
  /* ---------- graf węzłów każdej sieci ---------- */
  const nets = {};
  for (const l of lines) {
    if (!l.net || l.ids.length < 2) continue;
    const N = nets[l.net] || (nets[l.net] = new Map());
    l.ids.forEach((id, i) => { let n = N.get(id); if (!n) N.set(id, n = { id, x: l.pts[i][0], z: l.pts[i][1], ways: [] }); if (!n.ways.includes(l)) n.ways.push(l); });
    l.kind = l.isB ? 'bridge' : l.isTun ? 'tunnel' : 'free';
    l.len = 0; l.cum = [0]; for (let i = 1; i < l.pts.length; i++) { l.len += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]); l.cum.push(l.len); }
  }
  const off = new Map(), abs = new Map();   // klucz: net:id
  const K = (net, id) => net + ':' + id;
  const sources = [];   // [net, id, offset]

  /* ---------- tunele ---------- */
  for (const net in nets) for (const n of nets[net].values()) {
    const tun = n.ways.filter(l => l.kind === 'tunnel'); if (!tun.length) continue;
    const D = Math.max(...tun.map(l => tunnelDepth(net, l.L)));
    // schody prowadzące do przejścia podziemnego to zejście, nie powierzchnia: węzeł u ich stóp jest już pod ziemią, w dół schodzą schody
    const free = n.ways.some(l => l.kind === 'free' && !(net === 'foot' && l.t.highway === 'steps'));
    if (!free) { off.set(K(net, n.id), -D); continue; }
    // portal: wykop już w NMT? patrzymy 15 m w głąb tunelu
    const l = tun[0], i = l.ids.indexOf(n.id), dir = i === 0 ? 1 : -1;
    let p = l.pts[i], acc = 0;
    for (let k = i + dir; k >= 0 && k < l.pts.length; k += dir) { const q = l.pts[k], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (acc + d >= 15) { const f = (15 - acc) / d; p = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; acc = 15; break; } acc += d; p = q; }
    // wjazdy do garaży podziemnych i przejścia: zjazd tylko w samym tunelu, bez wykopu na ulicy
    const minor = net === 'foot' || (net === 'road' && tun.every(t => (t.rank || 0) <= 1));
    const o = minor ? 0 : Math.min(0, H(p[0], p[1]) - D - H(n.x, n.z));
    off.set(K(net, n.id), o); n.portal = true;
    if (o < -0.15) sources.push([net, n.id, o]);
  }

  /* ---------- wiadukty: komponenty, przyczółki, prześwit ---------- */
  // indeks linii "pod spodem" do szukania skrzyżowań
  const under = new Map(), UC = 25;
  for (const l of lines) if (l.kind !== 'bridge' && l.kind !== 'tunnel' && l.net) for (let i = 0; i < l.pts.length - 1; i++) gridAdd(under, UC, l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1], 0, [l, i]);
  const segX = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t, u] : null; };
  const pointAt = (l, d) => { d = Math.max(0, Math.min(l.len, d)); let i = 1; while (i < l.cum.length - 1 && l.cum[i] < d) i++; const a = l.pts[i - 1], b = l.pts[i], f = (d - l.cum[i - 1]) / ((l.cum[i] - l.cum[i - 1]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
  // NMT pod wiaduktem jest interpolowany (skaner nie widzi gruntu) — wysokość drogi pod spodem bierzemy z terenu obok
  const underCuts = new Map();
  for (const net in nets) {
    const N = nets[net], seen = new Set();
    for (const start of N.values()) {
      if (seen.has(start.id) || !start.ways.some(l => l.kind === 'bridge')) continue;
      // komponent węzłów połączonych liniami-wiaduktami
      const comp = [], q = [start]; seen.add(start.id);
      while (q.length) { const n = q.pop(); comp.push(n); for (const l of n.ways) if (l.kind === 'bridge') for (const id of l.ids) if (!seen.has(id)) { seen.add(id); q.push(N.get(id)); } }
      const bLines = new Set(); comp.forEach(n => n.ways.forEach(l => l.kind === 'bridge' && bLines.add(l)));
      const bound = comp.filter(n => n.ways.some(l => l.kind !== 'bridge') || n.ways.reduce((s, l) => s + (l.ids[0] === n.id || l.ids[l.ids.length - 1] === n.id ? 1 : 2), 0) <= 1);
      // odległości po pomoście od każdego przyczółka (Dijkstra na małym grafie)
      const dist = bound.map(b => { const d = new Map([[b.id, 0]]), pq = [[0, b.id]]; while (pq.length) { pq.sort((x, y) => y[0] - x[0]); const [dv, id] = pq.pop(); if (dv > d.get(id)) continue; const n = N.get(id); for (const l of n.ways) { if (l.kind !== 'bridge') continue; const i = l.ids.indexOf(id); for (const j of [i - 1, i + 1]) { if (j < 0 || j >= l.ids.length) continue; const nd = dv + Math.abs(l.cum[j] - l.cum[i]); if (nd < (d.get(l.ids[j]) ?? 1e9)) { d.set(l.ids[j], nd); pq.push([nd, l.ids[j]]); } } } } return d; });
      const bAbs = bound.map(b => H(b.x, b.z) + Math.max(0, off.get(K(net, b.id)) || 0));
      const setAbs = (delta) => {
        for (const n of comp) {
          const bi = bound.indexOf(n);
          if (bi >= 0) { abs.set(K(net, n.id), bAbs[bi] + delta); continue; }
          let sw = 0, sv = 0; bound.forEach((b, k) => { const d = dist[k].get(n.id); if (d != null) { const w = 1 / Math.max(0.5, d); sw += w; sv += w * bAbs[k]; } });
          abs.set(K(net, n.id), (sw ? sv / sw : H(n.x, n.z)) + delta);
        }
      };
      setAbs(0);
      // prześwit nad przecinanymi drogami/torami
      let need = 0;
      for (const l of bLines) for (let i = 0; i < l.pts.length - 1; i++) {
        const a = l.pts[i], b = l.pts[i + 1];
        const cand = new Set(); const x0 = Math.floor(Math.min(a[0], b[0]) / UC), x1 = Math.floor(Math.max(a[0], b[0]) / UC), z0 = Math.floor(Math.min(a[1], b[1]) / UC), z1 = Math.floor(Math.max(a[1], b[1]) / UC);
        for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) for (const it of under.get(gx * 100003 + gz) || []) cand.add(it);
        for (const [o, j] of cand) {
          if (o === l || (num(o.L) >= l.L)) continue;
          if (o.ids.includes(l.ids[i]) || o.ids.includes(l.ids[i + 1])) continue;
          const tu = segX(a, b, o.pts[j], o.pts[j + 1]); if (tu == null) continue;
          const [t, u] = tu;
          const px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t;
          const deck = abs.get(K(net, l.ids[i])) * (1 - t) + abs.get(K(net, l.ids[i + 1])) * t;
          const clr = (CLEAR[o.net] || 5.3) + 6 * Math.max(0, l.L - 1 - Math.max(0, num(o.L) || 0));
          const sc = o.cum[j] + (o.cum[j + 1] - o.cum[j]) * u, half = (l.wd || 8) / 2 + 14;
          const q1 = pointAt(o, sc - half), q2 = pointAt(o, sc + half), h1 = H(q1[0], q1[1]), h2 = H(q2[0], q2[1]), hOut = Math.min(h1, h2);
          if (deck - hOut >= clr - 0.6) {   // wiadukt nad zagłębieniem: obniżamy drogę/tor pod spodem zamiast podnosić pomost
            if (deck - H(px, pz) < clr) { let a2 = underCuts.get(o); if (!a2) underCuts.set(o, a2 = []); a2.push([sc - half, sc + half, h1, h2, deck - clr]); }
            continue;
          }
          const req = hOut + clr;
          if (req - deck > need) { need = req - deck; for (const bl of bLines) bl.dbg = { need: +need.toFixed(1), by: (o.t.name || o.hw || o.rail) + '/' + o.net + '/L' + o.L + '/' + o.kind, at: [px | 0, pz | 0], H: +H(px, pz).toFixed(1), deck: +deck.toFixed(1) }; }
        }
      }
      // most nad rzeką / kanałem: prześwit nad lustrem wody (teren w korycie)
      for (const l of bLines) for (let i = 0; i < l.pts.length - 1; i++) for (const [c, d, clr] of W.water || []) {
        const tu = segX(l.pts[i], l.pts[i + 1], c, d); if (!tu) continue;
        const t = tu[0], px = l.pts[i][0] + (l.pts[i + 1][0] - l.pts[i][0]) * t, pz = l.pts[i][1] + (l.pts[i + 1][1] - l.pts[i][1]) * t;
        const deck = abs.get(K(net, l.ids[i])) * (1 - t) + abs.get(K(net, l.ids[i + 1])) * t, req = H(px, pz) + clr;
        if (req - deck > need) need = req - deck;
      }
      // chodnik na wiadukcie obok jezdni: nie podnosimy osobno (jezdnia obok decyduje)
      if (net === 'foot' && need > 0.05) {
        const mid = [...bLines][0], mp = mid.pts[Math.floor(mid.pts.length / 2)];
        const near = lines.some(o => o.kind === 'bridge' && o.net !== 'foot' && o.pts.some((p, k) => k < o.pts.length - 1 && segDist(mp[0], mp[1], [p[0], p[1], o.pts[k + 1][0], o.pts[k + 1][1]])[0] < 15));
        if (near) need = 0;
      }
      if (need > 0.05) {
        setAbs(need);
        if (net !== 'foot' || true) bound.forEach((b, k) => { if (b.ways.some(l => l.kind === 'free')) { off.set(K(net, b.id), Math.max(off.get(K(net, b.id)) || 0, bAbs[k] + need - H(b.x, b.z))); sources.push([net, b.id, bAbs[k] + need - H(b.x, b.z)]); } });
      }
    }
  }

  /* ---------- podjazdy / zjazdy: przesunięcie maleje wzdłuż drogi (na wprost, bez skręcania w boczne ulice) ---------- */
  const dirOf = (l, i, j) => { const a = l.pts[i], b = l.pts[j]; const dx = b[0] - a[0], dz = b[1] - a[1], d = Math.hypot(dx, dz) || 1; return [dx / d, dz / d]; };
  for (const [net, sid, o0] of sources) {
    const N = nets[net], slope = NET_SLOPE[net] || 0.07, sign = Math.sign(o0);
    for (const l0 of N.get(sid).ways) {
      if (l0.kind !== 'free') continue;
      const i0 = l0.ids.indexOf(sid);
      for (const step of [1, -1]) {
        let l = l0, i = i0, st = step, v = Math.abs(o0), guard = 0;
        if (i + st < 0 || i + st >= l.ids.length) continue;
        while (v > 0.02 && guard++ < 500) {
          const j = i + st;
          if (j < 0 || j >= l.ids.length) {
            // koniec drogi: kontynuacja w najbardziej "prostą" drogę
            const id = l.ids[i], n = N.get(id), d0 = dirOf(l, i - st, i); let best = null, bs = 0.7;
            for (const w of n.ways) { if (w === l || w.kind !== 'free') continue; const k = w.ids.indexOf(id); for (const s2 of [1, -1]) { const k2 = k + s2; if (k2 < 0 || k2 >= w.ids.length) continue; const d1 = dirOf(w, k, k2), sc = d0[0] * d1[0] + d0[1] * d1[1]; if (sc > bs) { bs = sc; best = [w, k, s2]; } } }
            if (!best) break;
            [l, i, st] = best; continue;
          }
          const nid = l.ids[j], k = K(net, nid);
          if (abs.has(k) || N.get(nid).ways.some(w => w.kind === 'tunnel')) break;
          v -= slope * Math.abs(l.cum[j] - l.cum[i]); if (v <= 0.02) break;
          const cur = off.get(k) || 0; if (sign > 0 ? v > cur : -v < cur) off.set(k, sign * v);
          i = j;
        }
      }
    }
  }

  // boczne drogi przy podniesionym/obniżonym węźle: krótki stromy podjazd zamiast progu (maks. 25%)
  for (let pass = 0; pass < 30; pass++) {
    let changed = false;
    for (const l of lines) {
      if (l.kind !== 'free' || !l.net) continue;
      for (let i = 0; i < l.ids.length - 1; i++) for (const [a, b] of [[i, i + 1], [i + 1, i]]) {
        const ka = K(l.net, l.ids[a]), kb = K(l.net, l.ids[b]); if (abs.has(kb) || nets[l.net].get(l.ids[b]).ways.some(w => w.kind === 'tunnel')) continue;
        const oa = off.get(ka) || 0, ob = off.get(kb) || 0, d = Math.abs(l.cum[b] - l.cum[a]), lim = Math.abs(oa) - 0.25 * d;
        if (lim > 0.05 && lim > Math.abs(ob) + 0.01 && (ob === 0 || Math.sign(ob) === Math.sign(oa))) { off.set(kb, Math.sign(oa) * lim); changed = true; }
      }
    }
    if (!changed) break;
  }

  /* ---------- próbki co ~4 m z wysokością ---------- */
  for (const l of lines) {
    if (!l.net || l.ids.length < 2) { l.samples = null; continue; }
    const S = [];
    const nodeVal = i => { const k = K(l.net, l.ids[i]); return l.kind === 'bridge' && abs.has(k) ? { a: abs.get(k) } : { o: off.get(k) || 0 }; };
    let maxOff = 0; const pin = new Set([0]);
    for (let i = 0; i < l.pts.length - 1; i++) {
      const a = l.pts[i], b = l.pts[i + 1], va = nodeVal(i), vb = nodeVal(i + 1);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(len / 4));
      for (let k = i ? 1 : 0; k <= steps; k++) {
        const t = k / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, h = H(x, z);
        let y;
        if (va.a != null && vb.a != null) y = va.a + (vb.a - va.a) * t;
        else { const oa = va.o ?? (va.a - H(a[0], a[1])), ob = vb.o ?? (vb.a - H(b[0], b[1])); y = h + oa + (ob - oa) * t; }
        if (l.kind === 'tunnel' && l.net !== 'foot') y = Math.min(y, h - 0.4);   // przejście pieszych: przy wejściu posadzka równo z terenem (otwarta klatka schodowa)
        const uc = underCuts.get(l);
        if (uc) { const d = l.cum[i] + (l.cum[i + 1] - l.cum[i]) * t; for (const [s0, s1, h1, h2, ymax] of uc) if (d > s0 && d < s1) { const f = (d - s0) / (s1 - s0), yl = Math.min(h1 + (h2 - h1) * f, ymax); y = Math.min(y, yl); } }
        S.push([x, z, y, h]); maxOff = Math.max(maxOff, Math.abs(y - h));
      }
      if (nets[l.net].get(l.ids[i + 1]).ways.length > 1) pin.add(S.length - 1);   // węzeł wspólny z inną linią: nie ruszać przy wygładzaniu
    }
    pin.add(S.length - 1);
    if (l.kind === 'tunnel' && (l.net === 'rail' || l.net === 'subway' || l.net === 'tram') && S.length > 6) {
      const hT = TUBE_H[l.net] || 6;
      for (let pass = 0; pass < 4; pass++) {
        const y = S.map(p => p[2]);
        for (let k = 1; k < S.length - 1; k++) { if (pin.has(k)) continue; let sm = 0, c = 0; for (let j = Math.max(0, k - 8); j <= Math.min(S.length - 1, k + 8); j++) { sm += y[j]; c++; } S[k][2] = sm / c; }
      }
      // przykrycie nad stropem (poza okolicą portali)
      let acc = 0; const dist = S.map((p, k) => (k ? acc += Math.hypot(p[0] - S[k - 1][0], p[1] - S[k - 1][1]) : 0));
      for (let k = 1; k < S.length - 1; k++) if (!pin.has(k) && dist[k] > 25 && acc - dist[k] > 25) S[k][2] = Math.min(S[k][2], S[k][3] - hT - 0.3);
    }
    l.samples = S; l.maxOff = maxOff;
    if (l.kind === 'free' && maxOff > 0.15) l.kind = 'ramp';
  }

  /* ---------- geometria ---------- */
  const G = { deck: { road: new Geo(true), rail: new Geo(true), foot: new Geo(true) }, conc: new Geo(false), tube: new Geo(false), lamp: new Geo(false) };
  const CONC = new THREE.Color('#9d9890'), CONC_D = new THREE.Color('#7f7a72'), RAIL_C = new THREE.Color('#b9b4ab'), TUBE_C = { road: new THREE.Color('#a8a397'), rail: new THREE.Color('#8b867c'), subway: new THREE.Color('#9aa3a6'), tram: new THREE.Color('#8b867c'), foot: new THREE.Color('#b8b2a4') }, CEIL_C = new THREE.Color('#77736b');
  const frameAt = (S, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L; return [-tz, tx]; };   // wektor "w prawo"
  const P = (S, i, side, w, dy = 0) => { const r = frameAt(S, i); return [S[i][0] + r[0] * side * w, S[i][2] + dy, S[i][1] + r[1] * side * w]; };
  // pas jezdni/toru (górna powierzchnia) z UV
  const ribbon = (Gm, S, i0, i1, w, dy, want, uvLen) => {
    let acc = 0;
    for (let i = i0; i < i1; i++) {
      const d = Math.hypot(S[i + 1][0] - S[i][0], S[i + 1][1] - S[i][1]);
      const L0 = P(S, i, -1, w / 2, dy), R0 = P(S, i, 1, w / 2, dy), L1 = P(S, i + 1, -1, w / 2, dy), R1 = P(S, i + 1, 1, w / 2, dy);
      const v0 = acc / uvLen, v1 = (acc + d) / uvLen; acc += d;
      Gm.tri(L0, R0, R1, CONC, want, [0, v0], [1, v0], [1, v1]); Gm.tri(L0, R1, L1, CONC, want, [0, v0], [1, v1], [0, v1]);
    }
  };
  // pionowa ściana wzdłuż krawędzi; yb/yt: funkcje (i) -> wysokość; facing: +1 na zewnątrz, -1 do środka
  const wall = (Gm, S, i0, i1, side, w, yb, yt, col, facing) => {
    for (let i = i0; i < i1; i++) {
      const ra = frameAt(S, i), rb = frameAt(S, i + 1);
      const ax = S[i][0] + ra[0] * side * w, az = S[i][1] + ra[1] * side * w, bx = S[i + 1][0] + rb[0] * side * w, bz = S[i + 1][1] + rb[1] * side * w;
      const A0 = [ax, yb(i), az], B0 = [bx, yb(i + 1), bz], A1 = [ax, yt(i), az], B1 = [bx, yt(i + 1), bz];
      if (A1[1] - A0[1] < 0.02 && B1[1] - B0[1] < 0.02) continue;
      const hint = [ra[0] * side * facing, 0, ra[1] * side * facing];
      Gm.tri(A0, B0, B1, col, hint); Gm.tri(A0, B1, A1, col, hint);
    }
  };
  const box = (Gm, x, y0, z, sx, sy, sz, col) => {
    const X = [x - sx / 2, x + sx / 2], Y = [y0, y0 + sy], Z = [z - sz / 2, z + sz / 2];
    const v = (i, j, k) => [X[i], Y[j], Z[k]];
    const f = (a, b, c, d, h) => { Gm.tri(a, b, c, col, h); Gm.tri(a, c, d, col, h); };
    f(v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0), [0, 0, -1]); f(v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1), [0, 0, 1]);
    f(v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0), [-1, 0, 0]); f(v(1, 0, 0), v(1, 0, 1), v(1, 1, 1), v(1, 1, 0), [1, 0, 0]);
    f(v(0, 1, 0), v(1, 1, 0), v(1, 1, 1), v(0, 1, 1), [0, 1, 0]);
  };
  const collEdge = (S, i0, i1, side, w, y0f, y1f, kind = 'w') => { for (let i = i0; i < i1; i++) { const ra = frameAt(S, i), rb = frameAt(S, i + 1); collAdd(S[i][0] + ra[0] * side * w, S[i][1] + ra[1] * side * w, S[i + 1][0] + rb[0] * side * w, S[i + 1][1] + rb[1] * side * w, 0, Math.min(y0f(i), y0f(i + 1)), Math.max(y1f(i), y1f(i + 1)), kind); } };
  // nawierzchnia pod nogami / kołami; foot = tylko dla pieszych (posadzki przejść, schody, kładki — auta tam nie wjeżdżają)
  const addSurf = (S, i0, i1, hw, hT = 0, foot = 0) => { for (let i = i0; i < i1; i++) { const a = S[i], b = S[i + 1]; gridAdd(surfGrid, SURF_CELL, a[0], a[1], b[0], b[1], hw + (foot ? 0.2 : 0.5), [a[0], a[2], a[1], b[0], b[2], b[1], hw, hT, foot]); } };
  const cuts = [], stats = { bridges: 0, tunnels: 0, ramps: 0, passages: 0 };
  // indeks jezdni: krawędzi nasypu/bariery nie stawiamy w pasie innej jezdni (np. druga jezdnia dwujezdniowej ulicy)
  const roadIdx = new Map();
  for (const l of lines) if (l.net === 'road' && l.samples) for (let i = 0; i < l.pts.length - 1; i++) gridAdd(roadIdx, 20, l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1], 0, [l, i]);
  const inOtherRoad = (l, x, z) => { for (const [o, i] of roadIdx.get(Math.floor(x / 20) * 100003 + Math.floor(z / 20)) || []) { if (o === l) continue; if (segDist(x, z, [o.pts[i][0], o.pts[i][1], o.pts[i + 1][0], o.pts[i + 1][1]])[0] < (o.wd || 6) / 2 + 1.2) return true; } return false; };

  // co biegnie pod wiaduktem (jezdnie, tory): filar nie może stanąć na nich
  const belowIdx = new Map();
  for (const o of lines) if (o.samples && o.kind !== 'bridge' && o.kind !== 'tunnel' && /^(road|rail|tram|subway)$/.test(o.net)) {
    const S = o.samples; for (let i = 0; i < S.length - 1; i++) gridAdd(belowIdx, 20, S[i][0], S[i][1], S[i + 1][0], S[i + 1][1], 0, [o, i]);
  }
  // drugi tunel tej samej sieci tuż obok (po danej stronie osi, na podobnej wysokości) — wspólne wnętrze, bez ściany między tubami
  const tubeIdx = new Map();
  for (const o of lines) if (o.samples && (o.kind === 'tunnel' || o.kind === 'ramp')) { const S = o.samples; for (let i = 0; i < S.length - 1; i++) gridAdd(tubeIdx, 20, S[i][0], S[i][1], S[i + 1][0], S[i + 1][1], 7, [o, i]); }
  const twinTube = (l, S, i, side, hw) => {
    const p = S[i], r = frameAt(S, i);
    for (const [o, k] of tubeIdx.get(Math.floor(p[0] / 20) * 100003 + Math.floor(p[1] / 20)) || []) {
      if (o === l || o.net !== l.net || o.net === 'road') continue; const a = o.samples[k], b = o.samples[k + 1];
      if (Math.abs((a[2] + b[2]) / 2 - p[2]) > 3) continue;
      const [d, cx, cz] = segDist(p[0], p[1], [a[0], a[1], b[0], b[1]]), lim = hw + (o.wd || 4.6) / 2 + 1.0;
      if (d > 0.5 && d < lim && ((cx - p[0]) * r[0] + (cz - p[1]) * r[1]) * side > 0) return true;
    }
    return false;
  };
  const onLineBelow = (x, z, yTop) => { for (const [o, i] of belowIdx.get(Math.floor(x / 20) * 100003 + Math.floor(z / 20)) || []) { const a = o.samples[i], b = o.samples[i + 1]; if (Math.min(a[2], b[2]) > yTop - 2.5) continue; if (segDist(x, z, [a[0], a[1], b[0], b[1]])[0] < (o.wd || (o.net === 'road' ? 6 : 3.4)) / 2 + 1.2) return true; } return false; };

  for (const l of lines) {
    const S = l.samples; if (!S || S.length < 2) continue;
    const net = l.net, w = l.wd || 4.6, hw = w / 2, n = S.length - 1, dk = deckKind(net);
    const uvLen = dk === 'foot' ? 4 : 12;
    if (l.kind === 'bridge') {
      stats.bridges++;
      ribbon(G.deck[dk], S, 0, n, w, 0.02, 1, uvLen);
      ribbon(G.conc, S, 0, n, w + 0.6, -1.1, -1, 10);
      for (const side of [-1, 1]) {
        wall(G.conc, S, 0, n, side, hw + 0.3, i => S[i][2] - 1.1, i => S[i][2] + 0.05, CONC, 1);
        wall(G.conc, S, 0, n, side, hw + 0.3, i => S[i][2] - 0.02, i => S[i][2] + 1.0, RAIL_C, 1);   // balustrada (obie strony)
        wall(G.conc, S, 0, n, side, hw + 0.22, i => S[i][2] - 0.02, i => S[i][2] + 1.0, RAIL_C, -1);
        collEdge(S, 0, n, side, hw + 0.25, i => S[i][2] - 0.4, i => S[i][2] + 1.3, 'r');    // balustrady
        collEdge(S, 0, n, side, hw + 0.3, i => S[i][2] - 2.9, i => S[i][2] - 0.25, 'd');    // spód pomostu (dla aut pod spodem)
      }
      // filary co ~24 m
      let acc = 12;
      for (let i = 0; i < n; i++) {
        acc += Math.hypot(S[i + 1][0] - S[i][0], S[i + 1][1] - S[i][1]);
        if (acc < 24) continue; acc = 0;
        const clear = S[i][2] - 1.1 - S[i][3]; if (clear < 2.4) continue;
        const r = frameAt(S, i), xs = w > 14 ? [-w / 3, w / 3] : [0];
        for (const o of xs) { const x = S[i][0] + r[0] * o, z = S[i][1] + r[1] * o, g0 = H(x, z) - 0.5; if (onLineBelow(x, z, S[i][2])) continue; box(G.conc, x, g0, z, 1.4, S[i][2] - 1.1 - g0, 1.4, CONC_D); collAdd(x, z, x, z, 0.85, g0 - 1, S[i][2] - 1.2, 'p'); }
      }
      if (net === 'road') addSurf(S, 0, n, hw); else if (net === 'foot') addSurf(S, 0, n, hw, 0, 1);
    } else if (l.kind === 'tunnel') {
      stats.tunnels++;
      const hT = TUBE_H[net] || 5.6, col = TUBE_C[net] || TUBE_C.road;
      ribbon(G.deck[dk], S, 0, n, w, 0.02, 1, uvLen);
      // wejście do podziemi (pieszy): tam, gdzie posadzka jest płycej niż wysokość przejścia, to otwarta klatka schodowa —
      // wycięty teren, bez stropu, mur do 0,9 m nad terenem zamiast ściany tuby
      const open = S.map(p => net === 'foot' && p[3] - p[2] < hT + 0.4);
      for (let i = 0; i <= n; i++) if (open[i]) cuts.push([S[i][0], S[i][1], S[i][2], hw + 0.5]);
      const wallTop = k => open[k] ? Math.max(S[k][2] + 0.9, S[k][3] + 0.9) : S[k][2] + hT;
      // ściany boczne; tam, gdzie obok biegnie drugi tunel tej sieci (np. dwa tory WKD w osobnych tubach), ściany między nimi nie ma — jeden szerszy tunel
      for (const side of [-1, 1]) {
        const tw = S.map((p, i) => twinTube(l, S, i, side, hw)); let i0 = 0;
        for (let i = 0; i <= n; i++) if (i === n || tw[i] !== tw[i0]) { const i1 = Math.min(n, i); if (!tw[i0] && i1 > i0) { wall(G.tube, S, i0, i1, side, hw + 0.4, k => S[k][2] - 0.2, wallTop, col, -1); collEdge(S, i0, i1, side, hw + 0.3, k => S[k][2] - 1, wallTop); } i0 = i; }
      }
      // strop tylko nad zamkniętą częścią (klatka schodowa jest otwarta)
      for (let i = 0, j0 = 0; i <= n; i++) if (i === n || open[i] !== open[j0]) { if (!open[j0] && i > j0) ribbon(G.tube, S, j0, i, w + 0.8, hT, -1, 10); j0 = i; }
      // lampy pod stropem
      for (let i = 0; i < n; i += 2) { const p = S[i]; if (open[i]) continue; G.lamp.tri([p[0] - 0.35, p[2] + hT - 0.05, p[1] - 0.35], [p[0] + 0.35, p[2] + hT - 0.05, p[1] - 0.35], [p[0] + 0.35, p[2] + hT - 0.05, p[1] + 0.35], CONC, -1); G.lamp.tri([p[0] - 0.35, p[2] + hT - 0.05, p[1] - 0.35], [p[0] + 0.35, p[2] + hT - 0.05, p[1] + 0.35], [p[0] - 0.35, p[2] + hT - 0.05, p[1] + 0.35], CONC, -1); }
      // ściany czołowe portali
      for (const end of [0, n]) {
        const node = nets[net].get(end ? l.ids[l.ids.length - 1] : l.ids[0]); if (!node || !node.portal) continue;
        const p = S[end], r = frameAt(S, end), top = p[3] + 0.6, yb = p[2] + hT; if (top - yb < 0.2) continue;
        const A = [p[0] - r[0] * (hw + 1.2), yb, p[1] - r[1] * (hw + 1.2)], B = [p[0] + r[0] * (hw + 1.2), yb, p[1] + r[1] * (hw + 1.2)];
        const q = S[end ? n - 1 : 1], out = [p[0] - q[0], 0, p[1] - q[1]];
        const A1 = [A[0], top, A[2]], B1 = [B[0], top, B[2]];
        G.conc.tri(A, B, B1, CONC, out); G.conc.tri(A, B1, A1, CONC, out);
        collAdd(A[0], A[2], B[0], B[2], 0, yb - 0.3, top + 1.5, 'h');   // mur nad portalem (z góry nie wjedziesz do wykopu)
      }
      if (net === 'road') addSurf(S, 0, n, hw, hT); else if (net === 'foot') addSurf(S, 0, n, hw, hT, 1);
    } else if (l.kind === 'ramp') {
      stats.ramps++;
      // odcinki z przesunięciem > 0.12 m
      let i0 = -1;
      const flush = (a, b) => {
        if (b <= a) return;
        ribbon(G.deck[dk], S, a, b, w, 0.04, 1, uvLen);
        for (const side of [-1, 1]) {
          const edgeH = i => { const r = frameAt(S, i); return H(S[i][0] + r[0] * side * (hw + 0.3), S[i][1] + r[1] * side * (hw + 0.3)); };
          // nasyp: ściana w dół do terenu; wykop: mur oporowy w górę do terenu — bez muru między dwoma torami obok siebie (wspólny wykop / nasyp)
          const tw = []; for (let i = a; i <= b; i++) tw[i] = twinTube(l, S, i, side, hw);
          for (let i = a, j0 = a; i <= b; i++) if (i === b || tw[i] !== tw[j0]) { const j1 = Math.min(b, i); if (!tw[j0] && j1 > j0) {
            wall(G.conc, S, j0, j1, side, hw + 0.3, i => Math.min(S[i][2], edgeH(i) - 0.4), i => S[i][2] + 0.05, CONC, 1);
            wall(G.conc, S, j0, j1, side, hw + 0.3, i => S[i][2] - 0.05, i => Math.max(S[i][2], edgeH(i) + 0.6), CONC_D, -1); } j0 = i; }
          for (let i = a; i < b; i++) {
            if (tw[i]) continue;
            const up = Math.max(S[i][2] - S[i][3], S[i + 1][2] - S[i + 1][3]);
            const dn = Math.min(S[i][2] - S[i][3], S[i + 1][2] - S[i + 1][3]);
            const r = frameAt(S, i), ex = S[i][0] + r[0] * side * (hw + 0.3), ez = S[i][1] + r[1] * side * (hw + 0.3);
            const nextTo = net === 'road' && inOtherRoad(l, ex, ez);
            if (up > 0.9 && !nextTo) collEdge(S, i, i + 1, side, hw + 0.3, j => S[j][3] - 1, j => S[j][2] - 0.35, 'e');       // nasyp: auto z dołu
            if (up > 0.9 && net === 'road' && !nextTo) collEdge(S, i, i + 1, side, hw + 0.2, j => S[j][2] - 0.3, j => S[j][2] + 0.9, 'r');   // bariera na górze
            if (dn < -0.9) collEdge(S, i, i + 1, side, hw + 0.3, j => S[j][2] - 1, j => S[j][3] + 1.2);      // wykop: mury
          }
        }
        for (let i = a; i <= b; i++) if (S[i][2] < S[i][3] - 0.2) cuts.push([S[i][0], S[i][1], S[i][2], hw + 0.6]);
        if (net === 'road') addSurf(S, a, b, hw); else if (net === 'foot') addSurf(S, a, b, hw, 0, 1);
      };
      for (let i = 0; i <= n; i++) {
        const big = Math.abs(S[i][2] - S[i][3]) > 0.12;
        if (big && i0 < 0) i0 = Math.max(0, i - 1);
        if (!big && i0 >= 0) { flush(i0, i); i0 = -1; }
      }
      if (i0 >= 0) flush(i0, n);
    }
  }

  /* ---------- wycięcie terenu pod wykopy ---------- */
  if (HF && cuts.length) {
    const N = SEG + 1, cell = 2 * E / SEG;
    const vals = new Map();
    for (const [x, z, y, r] of cuts) {
      const i0 = Math.floor((x - r + E) / cell), i1 = Math.ceil((x + r + E) / cell), j0 = Math.floor((z - r + E) / cell), j1 = Math.ceil((z + r + E) / cell);
      for (let j = Math.max(0, j0); j <= Math.min(SEG, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(SEG, i1); i++) {
        const vx = -E + i * cell, vz = -E + j * cell; if (Math.hypot(vx - x, vz - z) > r + cell * 0.7) continue;
        const k = j * N + i; vals.set(k, Math.min(vals.get(k) ?? 1e9, y - 0.05));
      }
    }
    for (const [k, y] of vals) HF[k] = Math.min(HF[k], y);
  }

  /* ---------- przejazdy bramne (luki w ścianach budynków) ---------- */
  for (const l of lines) if (l.passage) {
    const hw = Math.min(5, Math.max(1.4, (l.wd || 4) / 2 + (l.net === 'road' ? 0.6 : 0.2)));
    for (let i = 0; i < l.pts.length - 1; i++) { const a = l.pts[i], b = l.pts[i + 1]; gridAdd(passGrid, PASS_CELL, a[0], a[1], b[0], b[1], hw, [a[0], a[1], b[0], b[1], hw, l.net === 'road' ? 4.2 : 3.0]); }
  }
  return { G, stats, nets };
}
// luki w krawędzi budynku: zwraca listę [t0, t1, wysokośćPrześwitu] (t w 0..1 wzdłuż krawędzi)
function passageGaps(ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az); if (len < 0.5) return null;
  const set = new Set();
  const i0 = Math.floor(Math.min(ax, bx) / PASS_CELL), i1 = Math.floor(Math.max(ax, bx) / PASS_CELL), j0 = Math.floor(Math.min(az, bz) / PASS_CELL), j1 = Math.floor(Math.max(az, bz) / PASS_CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const s of passGrid.get(i * 100003 + j) || []) set.add(s);
  if (!set.size) return null;
  const gaps = [];
  for (const s of set) {
    const rx = bx - ax, rz = bz - az, sx = s[2] - s[0], sz = s[3] - s[1], den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) continue;
    const t = ((s[0] - ax) * sz - (s[1] - az) * sx) / den, u = ((s[0] - ax) * rz - (s[1] - az) * rx) / den;
    if (t < -0.02 || t > 1.02 || u < -0.05 || u > 1.05) continue;
    const sin = Math.abs(den) / (len * Math.hypot(sx, sz)), g = Math.min(0.5, s[4] / Math.max(0.35, sin) / len);
    gaps.push([Math.max(0, t - g), Math.min(1, t + g), s[5]]);
  }
  return gaps.length ? gaps.sort((p, q) => p[0] - q[0]) : null;
}
