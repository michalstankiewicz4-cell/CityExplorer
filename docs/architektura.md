# Architektura

## Start
1. `index.html` — znaczniki (karta ładowania, ekran startowy, HUD, opcje, pomoc, mapa), `css/game.css`, importmap
   `three → ./lab/vendor/three/three.module.js` (Three.js r186 z GameLaboratory) i `js/boot.mjs`.
2. `js/boot.mjs` (moduł) — `import * as THREE from 'three'`, `window.THREE = THREE`, potem po kolei skrypty gry z listy
   `FILES`. To skrypty klasyczne: dzielą jeden zakres globalny (zmienne `let`/`const` i funkcje z jednego pliku są
   widoczne w kolejnych), więc **kolejność na liście ma znaczenie** — kod wykonywany od razu przy wczytaniu pliku może
   używać tylko tego, co zadeklarowały pliki wcześniejsze (funkcje wywoływane później — dowolnych).
3. `js/core/main.js` — `main()`: dane i teren obszaru (`loadArea`), budowa świata, kafle (`tilesInit`), ekran startowy
   z przelotem nad miastem, w tle modele (`loadModels`), pojazdy na miejscach (`homeVehicles`), broń, latarka, pula
   zombie, rozgrzanie shaderów (`weaponsInit`); po wyborze trybu — start.

## Pliki (kolejność wczytywania)
| Plik | Zawartość |
|---|---|
| `core/config.js` | wersja (`APP_VERSION`), obszary (`AREAS`, `setArea`), karta ładowania (`status`), `fetchT`, IndexedDB |
| `world/osm.js` | `DATA`, `TERR_RAW`; filtr znaczników OSM, Overpass, API OSM, plik z deployu |
| `world/terrain.js` | Terrarium, NMT GUGiK, maska budynków, obróbka wysokości |
| `core/scene.js` | renderer, kamera, światła, niebo, mgła, `GFX`; `H()` (teren, także poza mapą), `bump` (wstrząs kamery) |
| `world/grids.js` | `W` (stan świata), siatki: zderzenia (`collGrid`), drogi; szerokości dróg |
| `world/structures.js` | wiadukty, tunele, rampy, wykopy, bramy, mosty nad wodą; `surfaceAt()` |
| `world/trains.js` | składy AI na torach |
| `world/build.js` | `buildWorld(D)` — grunt, drogi, lotnisko, budynki, drzewa, teren, mapa |
| `vehicles/fleet.js` | `GL` (ścieżka `lab/`), auta, czołg, autobus, pieszy; `mode`, `ego`; wsiadanie; miejsca startowe |
| `core/input.js` | `ACTIONS`, `BIND`, `on()`, `kb()`, `mouse`, klawiatura |
| `vehicles/drive.js` | `physics()` — krok fizyki wszystkich trybów; jazda kołami i gąsienicami |
| `vehicles/air.js`, `vehicles/boat.js` | samolot; okręt i woda |
| `combat/zombies.js`, `combat/weapons.js` | zombie i efekty; broń, bomby, latarka, celownik |
| `player/walk.js` | pieszy; zderzenia pojazdów ze ścianami (`collideV`) |
| `vehicles/rail.js` | tramwaj i pociąg (`RAILS`, `rail`) |
| `ui/camera.js`, `ui/view.js`, `ui/hud.js`, `ui/bigmap.js` | kamera i mysz; rentgen i noc; HUD i minimapa; duża mapa |
| `render/sketch.js` | styl „rysunek” |
| `ui/options.js` | opcje, lista klawiszy, pomoc w lewym dolnym rogu |
| `core/loop.js` | `loop`, `step(dt, draw)` — krok 1/120 s, aktualizacje, rysowanie |
| `world/tiles.js` | kafle w locie |
| `ui/export.js` | zapis danych JSON, pobranie od nowa |
| `world/areas.js` | wspólny świat: zwolnienie i budowa obszaru, `switchArea`, `homeVehicles`, `loadArea` |
| `core/main.js` | `main()` |
| `shared/tiles.mjs` | moduł ES wspólny z `tools/fetch-tiles.mjs`: siatka i format kafli |

## Stan gry (najważniejsze zmienne)
- `mode` — czym sterujesz: `foot`, `car`, `enter`/`exit` (wsiadanie), `rail`, `air`, `boat`; `ego` — obiekt z położeniem
  (`x, y, z, th, vf`) tego, za kim idzie kamera (`ped`, stan auta, `rail`, `air.ego`, `boat.ego`).
- `ACT` / `car` — ostatnio używany pojazd drogowy i jego stan; `FLEET` — auta, czołg, autobus.
- `AREA`, `CENTER`, `E` (połowa boku dokładnej mapy), `HF` (siatka wysokości) — bieżący dokładny obszar.
- `started` — wybrany tryb (gra trwa), `optOpen`, `bigOpen`, `switching` (przebudowa obszaru — gra stoi).

## Pętla
`loop` (requestAnimationFrame) → `step(dt, true)`: fizyka w krokach 1/120 s (`physics`), wsiadanie, składy AI,
ustawienie modeli, zombie, broń, efekty, kamera, kafle (co 0,4 s), zmiana obszaru (co 1 s), HUD, rysowanie
(i drugi przebieg wody, gdy jest okręt). Na ekranie startowym — przelot nad miastem; w opcjach — pauza.
