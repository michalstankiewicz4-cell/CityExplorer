// Wielka Kradzież Aut VI — Klawisze: akcje (ACTIONS — jedno źródło prawdy także dla opisów: kb()), obsługa klawiatury.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- klawisze (do zmiany w opcjach, Esc) ---------- */
// sterowanie [akcja, opis, [klawisz, drugi klawisz], grupa]; mysz: kamera, LPM strzał, PPM celowanie
const ACTIONS = [
  ['fwd', 'Naprzód / gaz', ['KeyW', 'ArrowUp'], 'Ruch'], ['back', 'Wstecz / hamulec', ['KeyS', 'ArrowDown'], 'Ruch'],
  ['left', 'W lewo', ['KeyA', 'ArrowLeft'], 'Ruch'], ['right', 'W prawo', ['KeyD', 'ArrowRight'], 'Ruch'],
  ['fast', 'Sprint / turbo / więcej gazu', ['ShiftLeft', 'ShiftRight'], 'Ruch'], ['slow', 'Kucanie / mniej gazu (samolot)', ['ControlLeft', 'ControlRight'], 'Ruch'],
  ['brake', 'Skok / hamulec ręczny / stop maszyn', ['Space', ''], 'Ruch'], ['use', 'Wsiądź / wysiądź (tramwaj: drzwi)', ['KeyF', ''], 'Ruch'],
  ['cam', 'Zmiana widoku kamery', ['KeyV', ''], 'Kamera i mapa'], ['lookBack', 'Spójrz za siebie (pojazd)', ['KeyC', ''], 'Kamera i mapa'],
  ['map', 'Mapa', ['KeyM', ''], 'Kamera i mapa'], ['mini', 'Minimapa', ['KeyK', ''], 'Kamera i mapa'],
  ['fire', 'Strzał (też LPM)', ['', ''], 'Broń'], ['aim', 'Celowanie (też PPM)', ['', ''], 'Broń'],
  ['weapon', 'Broń czołgu: działo / karabin', ['Tab', ''], 'Broń'], ['light', 'Latarka / reflektor czołgu', ['KeyL', ''], 'Broń'],
  ['rudL', 'Ster kierunku w lewo', ['KeyQ', ''], 'Samolot'], ['rudR', 'Ster kierunku w prawo', ['KeyE', ''], 'Samolot'],
  ['gear', 'Podwozie', ['KeyG', ''], 'Samolot'], ['flaps', 'Klapy', ['KeyB', ''], 'Samolot'], ['bomb', 'Zrzut bomby (też PPM)', ['KeyZ', ''], 'Samolot'],
  ['reset', 'Powrót na start', ['KeyR', ''], 'Inne'], ['night', 'Noc / dzień', ['KeyN', ''], 'Inne'], ['xray', 'Rentgen', ['KeyX', ''], 'Inne'],
  ['pix', 'Pixel-art', ['KeyP', ''], 'Inne'], ['help', 'Pomoc (lewy dolny róg)', ['KeyH', ''], 'Inne'],
];
const store = { get(k, d) { try { const v = localStorage.getItem('w3d.' + k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('w3d.' + k, JSON.stringify(v)); } catch {} } };
let BIND = Object.assign(Object.fromEntries(ACTIONS.map(([a, , k]) => [a, k.slice()])), store.get('keys2', {}));   // keys2: nowy układ (stare ustawienia z innym układem są pomijane)
const on = (a) => BIND[a].some(c => c && keys[c]) || (a === 'fire' && mouse.fire) || (a === 'aim' && mouse.aim);
const mouse = { fire: false, aim: false, locked: false, last: 0 };
// jedno źródło prawdy dla opisów: nazwa klawisza akcji z ustawień (podpowiedzi, HUD, pomoc, ekran startowy)
function kb(a) {
  const v = [...new Set((BIND[a] || []).filter(Boolean).map(c => keyName(c).replace(/ [LP]$/, '')))];
  const m = a === 'fire' ? ['LPM'] : a === 'aim' ? ['PPM'] : [];
  return [...m, ...v].join(' / ') || '—';
}
function fillKeyLabels() { for (const e of document.querySelectorAll('[data-k]')) e.textContent = kb(e.dataset.k); }
const actionOf = (code) => { for (const [a] of ACTIONS) if (BIND[a].includes(code)) return a; return null; };
let rebinding = null;
addEventListener('keydown', e => {
  if (rebinding) { e.preventDefault(); if (e.code !== 'Escape') { const [a, i] = rebinding; for (const k in BIND) BIND[k] = BIND[k].map(c => c === e.code ? '' : c); BIND[a][i] = e.code; store.set('keys2', BIND); } rebinding = null; drawKeys(); drawHelp(true); fillKeyLabels(); return; }
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (!started) return;
  if (e.code === 'Escape') { if (performance.now() - (mouse.unlockAt || 0) < 400) return; if (bigOpen) toggleBigMap(); else toggleOptions(); return; }
  if (optOpen) return;
  const a = actionOf(e.code);
  if (a === 'use' && !e.repeat) { if (mode === 'rail') railUse(); else if (mode === 'air') airExit(); else if (mode === 'boat') boatUse(); else useCar(); }
  if (a === 'reset') { if (mode === 'rail') railReset(); else if (mode === 'air') airReset(); else if (mode === 'boat') boatReset(); else resetCar(); }
  if (mode === 'air' && !e.repeat && a === 'gear') { air.c.gear = 1 - air.c.gear; flash('Podwozie: ' + (air.c.gear ? 'wypuszczanie' : 'chowanie')); }
  if (mode === 'air' && !e.repeat && a === 'flaps') { air.c.flaps = 1 - air.c.flaps; flash('Klapy: ' + (air.c.flaps ? 'wypuszczone' : 'schowane')); }
  if (a === 'cam') camMode = camMode === 2 ? 0 : 2;   // dwa widoki: TPP (za plecami) i FPP (oczami)
  if (a === 'brake' && !e.repeat && mode === 'foot' && !ped.air) ped.vy = 4.6;   // skok
  if (a === 'weapon' && !e.repeat && mode === 'car' && ACT && ACT.id === 'abrams') { WPN.tankGun = WPN.tankGun === 'cannon' ? 'mg' : 'cannon'; flash(WPN.tankGun === 'cannon' ? 'Działo 120 mm' : 'Karabin maszynowy'); }
  if (a === 'light' && !e.repeat) { if (mode === 'car' && ACT && ACT.id === 'abrams') WPN.search = !WPN.search; else WPN.lightOn = !WPN.lightOn; }
  if (a === 'fire' && !e.repeat) fire();
  if (a === 'night') setNight(!night);
  if (a === 'xray') setXray(!xray);
  if (a === 'pix') { pixelMode = !pixelMode; canvas.classList.toggle('pix', pixelMode); onResize(); }
  if (a === 'map') toggleBigMap();
  if (a === 'mini') { const m = $('minimap'); m.style.display = m.style.display === 'none' ? '' : 'none'; }
  if (a === 'help') { const m = $('help'); m.style.display = m.style.display === 'none' ? '' : 'none'; }
  if (a === 'map' && document.pointerLockElement) { mouse.wantUnlock = true; document.exitPointerLock(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
