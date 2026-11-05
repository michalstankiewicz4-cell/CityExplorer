// Warszawa 3D — Opcje (Esc): gra, grafika, klawisze.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- opcje (Esc): gra, grafika, klawisze ---------- */
let optOpen = false;
const keyName = (c) => !c ? '—' : c.replace(/^Key/, '').replace(/^Digit/, '').replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('ShiftLeft', 'Shift L').replace('ShiftRight', 'Shift P').replace('ControlLeft', 'Ctrl L').replace('ControlRight', 'Ctrl P').replace('Space', 'Spacja');
function drawKeys() {
  const L = $('kList'); L.textContent = '';
  for (const [a, label] of ACTIONS) {
    const row = document.createElement('div'); row.className = 'k';
    const t = document.createElement('span'); t.textContent = label; row.appendChild(t);
    for (const i of [0, 1]) { const b = document.createElement('button'); const w = rebinding && rebinding[0] === a && rebinding[1] === i; b.textContent = w ? 'naciśnij…' : keyName(BIND[a][i]); b.className = w ? 'wait' : ''; b.onclick = () => { rebinding = [a, i]; drawKeys(); }; row.appendChild(b); }
    L.appendChild(row);
  }
}
function applyGfx() {
  try { localStorage.setItem('w3d.gfx', JSON.stringify(GFX)); } catch {}
  onResize();
  const sh = [0, 1024, 2048, 4096][GFX.shadows];
  if (renderer.shadowMap.enabled !== GFX.shadows > 0) { renderer.shadowMap.enabled = sun.castShadow = GFX.shadows > 0; scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }
  if (sh && sun.shadow.mapSize.x !== sh) { sun.shadow.mapSize.set(sh, sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.fog.far = GFX.view; scene.fog.near = Math.min(300, GFX.view * 0.2); camera.far = Math.max(2000, GFX.view * 2);
  camera.fov = GFX.fov; renderer.toneMappingExposure = GFX.exposure; camera.updateProjectionMatrix();
  for (const [id, v, f] of [['gRes', GFX.res, x => Math.round(x * 100) + '%'], ['gView', GFX.view, x => x + ' m'], ['gFov', GFX.fov, x => x + '°'], ['gExp', GFX.exposure, x => x.toFixed(2)]]) { $(id).value = v; $(id + 'V').textContent = f(+v); }
  $('gSh').value = GFX.shadows; $('gSketch').value = GFX.sketch ? 1 : 0;
  if (FLEET.length && !!GFX.sketch !== SK.on) setSketch(!!GFX.sketch);
}
function syncGame() { $('oNight').checked = night; $('oXray').checked = xray; $('oPix').checked = pixelMode; $('oMini').checked = $('minimap').style.display !== 'none'; $('oHelp').checked = $('help').style.display !== 'none'; $('oCam').value = camMode; }
function toggleOptions(force) {
  optOpen = force ?? !optOpen; rebinding = null;
  $('opts').style.display = optOpen ? 'flex' : 'none';
  if (optOpen) { for (const k in keys) keys[k] = false; syncGame(); drawKeys(); applyGfx(); }
}
for (const b of document.querySelectorAll('#opts .tabs button')) b.onclick = () => { for (const x of document.querySelectorAll('#opts .tabs button')) x.classList.toggle('on', x === b); for (const t of document.querySelectorAll('#opts .tab')) t.hidden = t.dataset.tab !== b.dataset.tab; rebinding = null; drawKeys(); };
$('oResume').onclick = () => toggleOptions(false);
$('oMenu').onclick = () => location.reload();
$('oNight').onchange = e => setNight(e.target.checked);
$('oXray').onchange = e => setXray(e.target.checked);
$('oPix').onchange = e => { pixelMode = e.target.checked; canvas.classList.toggle('pix', pixelMode); onResize(); };
$('oMini').onchange = e => { $('minimap').style.display = e.target.checked ? '' : 'none'; };
$('oHelp').onchange = e => { $('help').style.display = e.target.checked ? '' : 'none'; };
$('oCam').onchange = e => { camMode = +e.target.value; };
for (const [id, k] of [['gRes', 'res'], ['gView', 'view'], ['gFov', 'fov'], ['gExp', 'exposure']]) $(id).oninput = e => { GFX[k] = +e.target.value; applyGfx(); };
$('gSh').onchange = e => { GFX.shadows = +e.target.value; applyGfx(); };
$('gSketch').onchange = e => { GFX.sketch = +e.target.value; applyGfx(); };
$('gDef').onclick = () => { Object.assign(GFX, { res: 1, shadows: 2, view: 1700, fov: 62, exposure: 1.05, sketch: 0 }); applyGfx(); };
$('kDef').onclick = () => { BIND = Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k.slice()])); store.set('keys', BIND); drawKeys(); };
$('opts').addEventListener('click', e => { if (e.target === $('opts')) toggleOptions(false); });
