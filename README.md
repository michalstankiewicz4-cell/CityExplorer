# CityExplorer — Wielka Kradzież Aut VI

Gra w przeglądarce w prawdziwej Warszawie zbudowanej z OpenStreetMap: budynki z wysokościami (Pałac Kultury z częściami
i iglicą), ulice, wiadukty, tunele, tory, parki, drzewa, rzeźba terenu z NMT. Pieszo, autem, czołgiem, autobusem,
tramwajem, pociągiem WKD, samolotem Spitfire i okrętem ORP Błyskawica — w jednym świecie, z zombie w dzień i w nocy.

**Graj:** https://michalstankiewicz4-cell.github.io/CityExplorer/ · **Dokumentacja:** [docs/](docs/README.md)

## Tryby
Ekran startowy wybiera, od czego zaczynasz; pozostałe pojazdy i tak stoją na swoich miejscach:
**pieszo i pojazdem** (centrum: Polonez, Abrams, Solaris), **szynowy** (tramwaj PESA Swing albo pociąg WKD — cała trasa ze Śródmieścia do Pruszkowa, tory 1:1 z mapy),
**samolot** (Spitfire Mk I na Okęciu), **okręt** (ORP Błyskawica na Wiśle). Szczegóły: [docs/pojazdy.md](docs/pojazdy.md).

**Gra z innymi** (2–4 osoby, WebRTC): na ekranie startowym „Utwórz pokój” i podaj kod albo wpisz kod i „Dołącz”. Gospodarz prowadzi zombie; w pojeździe pierwszy jest kierowcą, kolejni pasażerami. Szczegóły: [docs/multiplayer.md](docs/multiplayer.md).

## Sterowanie (domyślne)
Klawisze można zmienić w opcjach (Esc → Klawisze); lista w lewym dolnym rogu (H) pokazuje klawisze dla tego, czym teraz sterujesz.

| Pieszo | |
|---|---|
| Mysz | kamera (kliknij w grę, by złapać mysz; Esc — puszcza mysz i otwiera opcje) |
| W A S D | ruch względem kamery (trucht), Shift — sprint, Ctrl — kucanie, Spacja — skok |
| PPM / LPM | celowanie przez prawe ramię / strzał (Beryl) |
| Kółko | broń: Beryl / bez broni |
| F | wsiądź (przy pojeździe) · L — latarka |

| Samochód, autobus, czołg | |
|---|---|
| W / S | gaz / hamulec, wstecz · A D — skręt · Spacja — ręczny · Shift — turbo |
| Mysz | rozglądanie (kamera sama wraca za gracza i za pojazd); czołg: wieża i armata |
| PPM + LPM | strzał przez okno; czołg: LPM — strzał, PPM — przybliżenie, kółko / Tab — działo / karabin, L — reflektor |
| C | spójrz za siebie · F — wysiądź |

| Wszędzie | |
|---|---|
| V | kamera: TPP (za plecami) / FPP (oczami, z kabiny) |
| M / K | mapa na graczu (przeciągnij, PPM = z powrotem na gracza, kółko, klik = przeniesienie) / minimapa |
| N · X · P · R · H | noc · rentgen · pixel-art · powrót na start · pomoc |

Samolot: W/S drążek, A/D lotki, Q/E ster kierunku, Shift/Ctrl gaz, Spacja hamulce kół, G podwozie, B klapy, LPM karabiny w skrzydłach, PPM / Z zrzut bomby (2 × 250 lb, uzbrajane po wylądowaniu), F wysiądź. Okręt: W/S telegraf, A/D ster, Spacja stop maszyn, F zejście na ląd. Tramwaj i pociąg: W/S napęd i hamowanie, Spacja hamulec nagły, F drzwi / wysiądź.

## Struktura plików
```
index.html            strona: znaczniki (ekran startowy, HUD, opcje), importmap Three.js, js/boot.mjs
css/game.css          wygląd strony
js/boot.mjs           start: Three.js jako window.THREE, potem skrypty gry po kolei (wspólny zakres globalny)
js/core/              config.js (obszar mapy, ładowanie, IndexedDB) · scene.js (renderer, kamera, światła, H()) ·
                      input.js (klawisze) · loop.js (pętla gry) · main.js (start)
js/world/             osm.js · terrain.js · grids.js (zderzenia, nawierzchnie) · structures.js (wiadukty, tunele) ·
                      trains.js (składy AI) · build.js (budowa mapy) · tiles.js (kafle w locie) · areas.js (wspólny świat)
js/vehicles/          fleet.js (auta, czołg, autobus, pieszy) · drive.js (jazda) · rail.js (tramwaj, pociąg) ·
                      air.js (samolot) · boat.js (okręt i woda)
js/player/walk.js     pieszy
js/combat/            zombies.js (zombie, ciała, efekty) · weapons.js (karabinek, armata, karabin maszynowy, karabiny
                      i bomby samolotu, latarka, celownik)
js/ui/                camera.js · hud.js · bigmap.js · options.js · view.js (rentgen, noc) · export.js
js/render/sketch.js   styl „rysunek”
js/net/net.js         gra z innymi (WebRTC: pokój, gospodarz, zombie, pojazdy, wygładzanie ruchu)
js/vendor/            PeerJS (połączenie WebRTC)
js/shared/tiles.mjs   kafle mapy: format i siatka (gra i tools/fetch-tiles.mjs)
lab/                  pliki z GameLaboratory (te same ścieżki co tam): lab/entries.json, lab/SOURCE.json
tools/                fetch-osm.mjs, fetch-tiles.mjs, sync-lab.mjs, check-version.mjs
doktor.html           doktor mapy
img/                  miniatury pojazdów, grafika ekranu ładowania (też miniatura strony: og-image.jpg)
docs/                 dokumentacja
```
Praca z modelami: zmiany robimy w GameLaboratory, potem `node tools/sync-lab.mjs ../GameLaboratory` i commit w grze ([docs/laboratorium.md](docs/laboratorium.md)). Opis plików i kolejności wczytywania: [docs/architektura.md](docs/architektura.md).

## Plan
Lista: [TODO.md](TODO.md).

## Więcej
Świat, dane, kafle i parametry URL — [docs/swiat.md](docs/swiat.md) · zombie i broń — [docs/walka.md](docs/walka.md) ·
pliki z GameLaboratory — [docs/laboratorium.md](docs/laboratorium.md) · doktor mapy — [docs/doktor.md](docs/doktor.md) ·
publikacja i wersje — [docs/deploy.md](docs/deploy.md).

Dane © OpenStreetMap contributors (ODbL); wysokości: NMT GUGiK, Terrarium (AWS Terrain Tiles).
