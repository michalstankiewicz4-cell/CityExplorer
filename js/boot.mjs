// Wielka Kradzież Aut VI — start: Three.js (r186 z lab/vendor, ta sama kopia co modele z GameLaboratory) jako window.THREE,
// potem skrypty gry po kolei (skrypty klasyczne dzielą zakres globalny, więc kolejność ma znaczenie).
import * as THREE from 'three';
window.THREE = THREE;
const FILES = [
  'core/config.js',
  'world/osm.js',
  'world/terrain.js',
  'core/scene.js',
  'world/grids.js',
  'world/structures.js',
  'world/trains.js',
  'world/build.js',
  'vehicles/fleet.js',
  'core/input.js',
  'vehicles/drive.js',
  'vehicles/air.js',
  'vehicles/boat.js',
  'combat/zombies.js',
  'combat/weapons.js',
  'player/walk.js',
  'vehicles/rail.js',
  'ui/camera.js',
  'ui/view.js',
  'ui/hud.js',
  'ui/bigmap.js',
  'render/sketch.js',
  'ui/options.js',
  'core/loop.js',
  'world/tiles.js',
  'ui/export.js',
  'world/areas.js',
  'core/main.js',
];
for (const f of FILES) await new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = new URL(f, import.meta.url).href; s.async = false;
  s.onload = res; s.onerror = () => rej(new Error('Nie wczytano ' + f)); document.head.appendChild(s);
});
