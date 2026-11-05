// Warszawa 3D — Opcje (Esc): gra, grafika, klawisze.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- opcje (Esc): gra, grafika, klawisze ---------- */
let optOpen = false;
const keyName = (c) => !c ? '—' : c.replace(/^Key/, '').replace(/^Digit/, '').replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('ShiftLeft', 'Shift L').replace('ShiftRight', 'Shift P').replace('ControlLeft', 'Ctrl L').replace('ControlRight', 'Ctrl P').replace('Space', 'Spacja');
function drawKeys() {
  const L = $('kList'); L.textContent = ''; let grp = '';
  for (const [a, label, , g] of ACTIONS) {
    if (g !== grp) { grp = g; const h = document.createElement('div'); h.className = 'kg'; h.textContent = g; L.appendChild(h); }
    const row = document.createElement('div'); row.className = 'k';
    const t = document.createElement('span'); t.textContent = label; row.appendChild(t);
    for (const i of [0, 1]) { const b = document.createElement('button'); const w = rebinding && rebinding[0] === a && rebinding[1] === i; b.textContent = w ? 'naciśnij…' : keyName(BIND[a][i]); b.className = w ? 'wait' : ''; b.onclick = () => { rebinding = [a, i]; drawKeys(); }; row.appendChild(b); }
    L.appendChild(row);
  }
  const h = document.createElement('div'); h.className = 'kg'; h.textContent = 'Mysz (zależnie od tego, czym sterujesz)'; L.appendChild(h);
  const M = [['Pieszo', 'ruch — kamera · LPM — strzał · PPM — celowanie · kółko — broń (Beryl / bez broni)'], ['Samochód, autobus', 'ruch — rozglądanie (kamera wraca za pojazd) · PPM — celowanie przez okno · LPM — strzał · kółko — odległość kamery'],
    ['Czołg', 'ruch — wieża i armata · LPM — strzał · PPM — przybliżenie · kółko — działo / karabin'], ['Samolot', 'ruch — rozglądanie · LPM — karabiny w skrzydłach · PPM — zrzut bomby · kółko — odległość kamery'],
    ['Tramwaj, pociąg, okręt', 'ruch — rozglądanie · kółko — odległość kamery'], ['Zawsze', 'kliknięcie w grę — złapanie myszy · Esc — puszcza mysz i otwiera opcje']];
  for (const [k, t] of M) { const row = document.createElement('div'); row.className = 'k km'; const a2 = document.createElement('span'); a2.textContent = k; const b2 = document.createElement('span'); b2.textContent = t; row.append(a2, b2); L.appendChild(row); }
}
// pomoc w lewym dolnym rogu: klawisze dla tego, czym teraz sterujesz (z ustawień klawiszy)
let helpFor = '';
function drawHelp(force) {
  const k = (a) => { const v = [...new Set(BIND[a].filter(Boolean).map(c => keyName(c).replace(/ [LP]$/, '')))]; return v.length ? v.join(' / ') : '—'; };
  const ctx = mode === 'car' && ACT ? (ACT.id === 'abrams' ? 'tank' : 'car') : mode === 'enter' || mode === 'exit' ? 'foot' : mode;
  if (!force && ctx === helpFor) return; helpFor = ctx;
  const R = (a, b) => `<div><b>${a}</b>${b}</div>`, mv = `${k('fwd')} ${k('left')} ${k('back')} ${k('right')}`.replace(/ \/ [↑↓←→]/g, '');
  let h = '';
  if (ctx === 'foot') h = R(mv, 'chodzenie (względem kamery)') + R(k('fast'), 'sprint') + R(k('slow'), 'kucanie') + R(k('brake'), 'skok') + R('Mysz', 'kamera — kliknij w grę, by złapać mysz') + R('PPM', 'celowanie') + R('LPM', 'strzał (Beryl)') + R('Kółko', 'broń: Beryl / bez broni') + R(k('light'), 'latarka') + R(k('use'), 'wsiądź (przy pojeździe)');
  else if (ctx === 'car' || ctx === 'tank') h = R(k('fwd'), 'gaz') + R(k('back'), 'hamulec / wstecz') + R(`${k('left')} ${k('right')}`.replace(/ \/ [←→]/g, ''), 'skręt') + R(k('brake'), 'hamulec ręczny') + R(k('fast'), 'turbo') + R(k('lookBack'), 'spójrz za siebie') + R(k('use'), 'wysiądź (po zatrzymaniu)') + (ctx === 'tank' ? R('Mysz', 'wieża i armata') + R('LPM', 'strzał') + R('PPM', 'przybliżenie') + R('Kółko / ' + k('weapon'), 'działo / karabin') + R(k('light'), 'reflektor') : R('Mysz', 'rozglądanie') + R('PPM + LPM', 'strzał przez okno') + R('Kółko', 'odległość kamery'));
  else if (ctx === 'rail') h = R(k('fwd'), 'napęd / nastawa w górę') + R(k('back'), 'hamowanie / nastawa w dół') + R(k('brake'), 'hamulec nagły') + R(k('use'), 'drzwi, drugi raz — wysiądź');
  else if (ctx === 'air') h = R(`${k('fwd')} ${k('back')}`.replace(/ \/ [↑↓]/g, ''), 'drążek: nos w dół / w górę') + R(`${k('left')} ${k('right')}`.replace(/ \/ [←→]/g, ''), 'lotki (na ziemi: kółko ogonowe)') + R(`${k('rudL')} ${k('rudR')}`, 'ster kierunku') + R(`${k('fast')} ${k('slow')}`.replace(/ \/ [^ ]+ P/g, ''), 'gaz więcej / mniej') + R(k('brake'), 'hamulce kół') + R(`${k('gear')} ${k('flaps')}`, 'podwozie, klapy') + R(k('use'), 'wysiądź (na ziemi)') + R('LPM', 'karabiny w skrzydłach') + R('PPM / ' + k('bomb'), 'zrzut bomby (2 pod skrzydłami)');
  else if (ctx === 'boat') h = R(`${k('fwd')} ${k('back')}`.replace(/ \/ [↑↓]/g, ''), 'telegraf: naprzód / wstecz') + R(`${k('left')} ${k('right')}`.replace(/ \/ [←→]/g, ''), 'ster') + R(k('brake'), 'stop maszyn') + R(k('use'), 'zejście na ląd (przy brzegu)');
  h += R(k('cam'), 'widok kamery') + R(`${k('map')} ${k('mini')}`, 'mapa, minimapa') + R(`${k('night')} ${k('xray')} ${k('pix')}`, 'noc, rentgen, pixel-art') + R('Esc', 'opcje i klawisze · ' + k('help') + ' ukryj');
  $('helpKeys').innerHTML = h;
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
$('kDef').onclick = () => { BIND = Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k.slice()])); store.set('keys2', BIND); drawKeys(); drawHelp(true); };
$('opts').addEventListener('click', e => { if (e.target === $('opts')) toggleOptions(false); });
