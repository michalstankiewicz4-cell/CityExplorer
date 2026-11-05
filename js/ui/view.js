// Wielka Kradzież Aut VI — Rentgen (X) i noc (N).
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- rentgen (X): przezroczysty grunt i budynki ---------- */
let xray = false;
function setXray(on) {
  xray = on;
  for (const m of [...(W.xrayMats || []), wallMat, roofMat]) { m.transparent = on; m.opacity = on ? (m === wallMat || m === roofMat ? 0.18 : 0.28) : 1; m.depthWrite = !on; m.needsUpdate = true; }
  for (const m of W.crowns || []) m.visible = !on;
  tubeMat.emissive = new THREE.Color(on ? '#3a3328' : '#000');
  // tunele i mury też półprzezroczyste: w tunelu (pociąg, metro, tramwaj, auto) widać przez nie świat dookoła
  for (const m of [tubeMat, concMat]) { m.transparent = on; m.opacity = on ? 0.4 : 1; m.depthWrite = !on; m.needsUpdate = true; }
}

/* ---------- noc ---------- */
let night = false;
function setNight(on) {
  if (typeof NET !== 'undefined' && NET.on && NET.host) netSend('*', { t: 'night', on: !!on });   // gospodarz: pora dnia dla wszystkich
  night = on;
  scene.background.copy(on ? NIGHT.sky : DAY.sky); scene.fog.color.copy(on ? NIGHT.fog : DAY.fog);
  hemi.intensity = on ? 0.18 : 1.15; sun.intensity = on ? 0.12 : 2.4; sun.color.set(on ? '#9fb4ff' : '#fff3df');
  wallMat.emissiveIntensity = on ? 1.4 : 0;
}
