// Wielka Kradzież Aut VI — Scena: renderer, kamera, światła, niebo i mgła, ustawienia grafiki; wysokość terenu H(); geometria i tekstury pomocnicze.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
let bump = 0;   // wstrząs kamery (zderzenie, strzał, wybuch), wygasa w updateCamera
/* =========================================================================
   SCENA
   ========================================================================= */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelMode = false;
// ustawienia grafiki (opcje, Esc) — zapamiętane w przeglądarce
const GFX = Object.assign({ res: 1, shadows: 2, view: 1700, fov: 62, exposure: 1.05 }, (() => { try { return JSON.parse(localStorage.getItem('w3d.gfx')) || {}; } catch { return {}; } })());
const basePR = () => Math.max(0.4, Math.min(devicePixelRatio, 2) * 0.75 * GFX.res);
renderer.setPixelRatio(basePR());
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const DAY = { sky: new THREE.Color('#b9cfe2'), fog: new THREE.Color('#c3d3e0') }, NIGHT = { sky: new THREE.Color('#0b1220'), fog: new THREE.Color('#0d1422') };
scene.background = DAY.sky.clone();
scene.fog = new THREE.Fog(DAY.fog.clone(), 300, 1700);
const camera = new THREE.PerspectiveCamera(GFX.fov, innerWidth / innerHeight, 0.3, 5000);
const hemi = new THREE.HemisphereLight('#cfe0f2', '#5d5a4c', 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3df', 2.4);
const SUN_DIR = new THREE.Vector3(-0.45, 0.72, 0.52).normalize();
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 1, far: 900 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);
addEventListener('resize', onResize);
function onResize() { renderer.setPixelRatio(pixelMode ? 0.3 : basePR()); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

/* ---------- teren: funkcja wysokości ---------- */
let HF = null;  // Float32Array (SEG+1)^2
// wysokość terenu; poza dokładną mapą (kafle) teren od krawędzi łagodnie schodzi przez 300 m do płaskiego gruntu kafli
function H(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  if (ax > E || az > E) {
    const he = Hin(Math.max(-E, Math.min(E, x)), Math.max(-E, Math.min(E, z))), d = Math.max(ax, az) - E, t = Math.min(1, d / 300), k = t * t * (3 - 2 * t);
    return he + ((W.terrBase || 0) - 0.3 - he) * k;
  }
  return Hin(x, z);
}
function Hin(x, z) {
  if (!HF) return 0;
  let fx = (x + E) / (2 * E) * SEG, fz = (z + E) / (2 * E) * SEG;
  fx = Math.max(0, Math.min(SEG - 1e-4, fx)); fz = Math.max(0, Math.min(SEG - 1e-4, fz));
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, N = SEG + 1;
  // ta sama triangulacja co PlaneGeometry (przekątna a-d / b-c)
  const a = HF[j * N + i], b = HF[j * N + i + 1], c = HF[(j + 1) * N + i], d = HF[(j + 1) * N + i + 1];
  if (u + v <= 1) return a + (b - a) * u + (c - a) * v;
  return d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

/* ---------- geometria pomocnicza ---------- */
const ringArea = r => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
function pip(pt, ring) { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
const centroid = r => { let x = 0, z = 0; for (const p of r) { x += p[0]; z += p[1]; } return [x / r.length, z / r.length]; };
function num(v) { if (v == null) return NaN; const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

class Geo {
  constructor(uv) { this.p = []; this.n = []; this.c = []; this.uv = uv ? [] : null; }
  v(x, y, z, nx, ny, nz, col, u, w) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); if (this.uv) this.uv.push(u || 0, w || 0); }
  // trójkąt z automatycznym ustawieniem orientacji (want: +1 = normalna w górę, -1 w dół, 0 = jak podano)
  // want: +1/-1 = normalna w górę/dół, [x,y,z] = w stronę wektora; ua/ub/uc: UV
  tri(a, b, c, col, want, ua, ub, uc) {
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-7) return;
    const flip = Array.isArray(want) ? nx * want[0] + ny * want[1] + nz * want[2] < 0 : (want && Math.sign(ny) !== want);
    if (flip) { let t = b; b = c; c = t; t = ub; ub = uc; uc = t; nx = -nx; ny = -ny; nz = -nz; }
    nx /= l; ny /= l; nz /= l;
    this.v(a[0], a[1], a[2], nx, ny, nz, col, ua && ua[0], ua && ua[1]); this.v(b[0], b[1], b[2], nx, ny, nz, col, ub && ub[0], ub && ub[1]); this.v(c[0], c[1], c[2], nx, ny, nz, col, uc && uc[0], uc && uc[1]);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere(); return g;
  }
}

/* ---------- tekstury elewacji ---------- */
function facadeTextures() {
  const S = 256, B = 64;
  const a = document.createElement('canvas'), e = document.createElement('canvas'); a.width = a.height = e.width = e.height = S;
  const g = a.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = '#efede8'; g.fillRect(0, 0, S, S);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++) {
    const x = bx * B + B * 0.2, y = fy * B + B * 0.22, w = B * 0.6, h = B * 0.56;
    g.fillStyle = '#d6d3cc'; g.fillRect(x - 2, y - 2, w + 4, h + 5);
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#46525e'); gr.addColorStop(0.55, '#2c343d'); gr.addColorStop(1, '#55626e');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = '#d6d3cc'; g.fillRect(x + w / 2 - 1, y, 2, h);
    if (hash(fy * 7 + bx * 13 + 1) < 0.42) { const k = 0.55 + 0.45 * hash(fy * 3 + bx * 29); ge.fillStyle = `rgba(255,${(200 + 30 * k) | 0},${(120 + 40 * k) | 0},${k})`; ge.fillRect(x, y, w, h); }
  }
  g.fillStyle = 'rgba(0,0,0,0.06)'; for (let fy = 0; fy < 4; fy++) g.fillRect(0, fy * B, S, 3);
  const t1 = new THREE.CanvasTexture(a), t2 = new THREE.CanvasTexture(e);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  t1.colorSpace = THREE.SRGBColorSpace; t2.colorSpace = THREE.SRGBColorSpace;
  return [t1, t2];
}
const [FACADE, FACADE_LIT] = facadeTextures();
const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: FACADE, roughness: 0.82, metalness: 0.02, emissive: 0xffffff, emissiveMap: FACADE_LIT, emissiveIntensity: 0 });
const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
