# CityExplorer — Warszawa 3D

Spacer i jazda (FSO Polonez, czołg M1A2 Abrams, przegubowy Solaris Urbino 18) po prawdziwym centrum Warszawy, zbudowanym z danych OpenStreetMap: budynki z wysokościami (Pałac Kultury z częściami i iglicą), ulice, chodniki, przejścia, tory tramwajowe, parki, drzewa i rzeźba terenu.

**Graj:** https://michalstankiewicz4-cell.github.io/CityExplorer/

## Tryby
Na starcie wybiera się tryb: **pieszo i pojazdem** (czynny) — człowiek przy zaparkowanych pojazdach: Polonezie, czołgu i autobusie; **szynowy** (czynny) — tramwaj PESA Swing 120Na albo pociąg (TrainKit) na torach z OSM: W napęd, S hamowanie / wstecz, Spacja hamowanie nagłe, E drzwi; **samolot** (czynny) — Supermarine Spitfire Mk I (1940) na progu drogi startowej Okęcia (osobna mapa `?map=okecie`), fizyka lotu z GameLaboratory (zachowanie „lot w atmosferze”: nośna, przeciągnięcie, ciąg śmigła, momenty sterów, podwozie na sprężynach); **okręt** (czynny) — ORP Błyskawica na Wiśle przy Moście Świętokrzyskim (`?map=wisla`), woda z laboratorium wody GameLaboratory, ruch okrętu z zachowania „okręt na wodzie”: W/S telegraf, A/D ster, Spacja stop maszyn, E przy brzegu — zejście na ląd.

## Sterowanie (jak w GTA V)
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
| Mysz | rozglądanie (kamera wraca za pojazd); czołg: wieża i armata |
| PPM + LPM | strzał przez okno; czołg: LPM — strzał, PPM — przybliżenie, kółko / Tab — działo / karabin, L — reflektor |
| C | spójrz za siebie · F — wysiądź |

| Wszędzie | |
|---|---|
| V | kamera: TPP (za plecami) / FPP (oczami, z kabiny) |
| M / K | mapa (przeciągnij, kółko, klik = przeniesienie) / minimapa |
| N · X · P · R · H | noc · rentgen · pixel-art · powrót na start · pomoc |

Samolot: W/S drążek, A/D lotki, Q/E ster kierunku, Shift/Ctrl gaz, Spacja hamulce kół, G podwozie, B klapy, LPM karabiny w skrzydłach, F wysiądź. Okręt: W/S telegraf, A/D ster, Spacja stop maszyn, F zejście na ląd. Tramwaj i pociąg: W/S napęd i hamowanie, Spacja hamulec nagły, F drzwi / wysiądź.

## Parametry URL
`?mode=foot` – bez ekranu wyboru trybu
`?r=1500` – promień obszaru w metrach (300–2500, domyślnie 1000)
`?lat=52.2297&lon=21.0122` – inny środek mapy (dane pobiorą się z OSM w przeglądarce)
`?map=okecie` – mapa lotniska Chopina (Okęcie, promień 2000 m; plik `okecie.json` z deployu); `?map=okecie&mode=air` — od razu w samolocie

## Skąd dane
Kolejność ładowania:
1. `warszawa-centrum.json` (oraz `warszawa-r2000.json` i `okecie.json`) obok strony – generowane przy każdym deployu przez GitHub Actions (`tools/fetch-osm.mjs`; Okęcie z drogami startowymi, kołowania i płytami — `aeroway`),
2. pamięć przeglądarki (IndexedDB) – po pierwszym pobraniu,
3. Overpass API, a gdy nie odpowiada – API OpenStreetMap (kafle).

Wysokości terenu: **NMT GUGiK** (`teren-nmt.bin`, model gruntu bez budynków, oczko 5 m, pokrywa ok. 2 km od PKiN; źródło: Główny Urząd Geodezji i Kartografii). Poza nim kafle Terrarium (AWS Terrain Tiles) z wycinaniem „garbów” po budynkach.

## Wspólna mapa
Dokładne obszary (Śródmieście przy PKiN, lotnisko Chopina, Wisła przy Moście Świętokrzyskim) i kafle tworzą jeden świat dla wszystkich pojazdów. Gra buduje dokładnie obszar, w którym jesteś; po wejściu w inny przebudowuje go w locie. Ze wszystkich pojazdów da się wysiąść (E; w tramwaju i pociągu pierwsze E otwiera drzwi). Pojazdy stoją na swoich miejscach niezależnie od miejsca startu: auta, czołg, autobus, tramwaj i pociąg w centrum, samolot na Okęciu, okręt na Wiśle.

## Mapa wczytywana w locie (kafle)
Poza dokładną mapą świat dobudowuje się kaflami 1 × 1 km w zasięgu widoku, w stronę ruchu; dalekie kafle są zwalniane z pamięci. Kafle są uproszczone (płaski grunt z ulicami i obszarami, budynki z płaskimi dachami). Źródła: `tiles/<i>_<j>.json` dla całej Warszawy (generuje deploy: `tools/fetch-tiles.mjs`, w kilku przebiegach — najpierw trasa centrum — Okęcie; deploy po pushu dopisuje kafle przez 4 minuty, uruchomienie co 2 godziny — przez 40 minut; postęp trzyma cache GitHub Actions), pamięć przeglądarki, a poza Warszawą Overpass na żywo. Format i siatka: `js/tiles.mjs`. Duża mapa (M) przesuwa się przeciąganiem i oddala kółkiem; przycisk „Dopracowanie obszarów” pokazuje, które obszary są dopracowane (centrum, Okęcie), a które to automatyczne kafle.

## Wiadukty, tunele, przejazdy
OSM podaje tylko poziom (`layer`), więc wysokości są liczone:
- wiadukt: pomost między przyczółkami, podniesiony tak, by nad przecinaną drogą/torem był prześwit (5,3 m / 6,8 m), podjazd rozkłada się na sąsiednich ulicach (spadek 7%),
- tunel: spąg = teren − głębokość zależna od `layer` i rodzaju (droga, kolej, metro, przejście); przy portalu brany jest pod uwagę wykop widoczny w NMT, brakujący zjazd powstaje na drodze dojazdowej (wykop z murami),
- `tunnel=building_passage`: prześwit 4,2 m w ścianie budynku.
Przycisk „Zapisz dane (JSON)” zapisuje komplet (OSM + teren) – taki plik wrzucony do repo jako `warszawa-centrum.json` też zadziała.

## Technika
Three.js r186. Modele i zachowania (RoadKit, LifeKit, TramKit, TrainKit, AirKit, ShipKit, WeaponKit, GearKit; koło na szynie, lot w atmosferze, okręt na wodzie, woda z laboratorium wody, doktor modeli) powstają w [GameLaboratory](https://github.com/michalstankiewicz4-cell/GameLaboratory) i są kopiowane do gry (`lab/`) — gra nie pobiera niczego z laboratorium w trakcie działania. Budynki są łączone w siatki po kwadratach 220 m. Ulice, place i trawniki są malowane na teksturze gruntu nałożonej na teren. Drzewa to instancje. Kolizje liczone są z obrysami budynków i pniami drzew. Wysokości: `height` / `building:levels` / `min_height` / `roof:shape` (pyramidal, dome, hipped). Gdy budynek ma części (`building:part`), rysowane są tylko części.

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
js/combat/            zombies.js (zombie, ciała, efekty) · weapons.js (karabinek, armata, karabin maszynowy, latarka)
js/ui/                camera.js · hud.js · bigmap.js · options.js · view.js (rentgen, noc) · export.js
js/render/sketch.js   styl „rysunek”
js/shared/tiles.mjs   kafle mapy: format i siatka (gra i tools/fetch-tiles.mjs)
lab/                  pliki z GameLaboratory (te same ścieżki co tam): lab/entries.json, lab/SOURCE.json
tools/                fetch-osm.mjs, fetch-tiles.mjs, sync-lab.mjs, check-version.mjs
doktor.html           doktor mapy
img/                  miniatury pojazdów
```
Praca z modelami: zmiany robimy w GameLaboratory, potem `node tools/sync-lab.mjs ../GameLaboratory` kopiuje do `lab/` potrzebne pliki (punkty wejścia w `lab/entries.json`, zależności zbierane same; nadmiarowe usuwane, `lab/SOURCE.json` — commit laboratorium) i commit w grze.

Dane © OpenStreetMap contributors (ODbL).

## Zombie
W dzień kilku powolnych, w nocy więcej i szybszych. Idą do gracza i atakują (także pojazd), ale nie robią szkód. Można je zastrzelić albo przejechać; ciała zostają na ziemi z krwią.

## Plan
Pełna lista: [TODO.md](TODO.md).
- Lotnictwo: śmigłowiec W-3 Sokół; Boeing (samolot pasażerski); F-15 (odrzutowy).
- Kafle mapy: tunele, wiadukty, przejścia i tory (jazda) na kaflach; teren z wysokościami.
- Szynowe: metro — na początek linia M1; trolejbus linii 51 (1983–1995, Dworzec Południowy — Puławska — Piaseczno); pozostałe linie tramwajowe i kolejowe; WKD do Pruszkowa (cała trasa).
- Schody / rampy przy wejściach do podziemi, które doktor mapy zgłasza jako niepodłączone (propozycja).

## Doktor mapy
`doktor.html` (https://michalstankiewicz4-cell.github.io/CityExplorer/doktor.html) uruchamia grę w ramce i bada zbudowany świat:

| Test | Co znajduje |
|---|---|
| Przejezdność dróg | przeszkody na osi jezdni (budynek, drzewo, filar, nasyp), uskoki na konstrukcjach, stromizny > 16%, skoki wysokości na skrzyżowaniach, prześwit pod wiaduktem < 4,2 m, drogi odcięte od sieci |
| Widoczność | jezdnia/tor w budynku, nawierzchnia pod terenem, tunel wystający nad teren, ściana budynku w tunelu |
| Ciągłość torów | przerwy (tory blisko, bez wspólnego węzła), ślepe końce, skoki wysokości, spadki (kolej 4%, metro 5%, tramwaj 9%), ostre załamania (ważne dla fizyki kół z aTrain) |
| Przejścia i tunele | przejścia podziemne bez wejścia, bramy bez budynku, płytkie tunele drogowe |
| Modele | auto, tramwaj, metro, pociąg — doktor modeli z GameLaboratory (`tools/doctor/modeldoctor.js`, wczytywany z jego strony) |

Wagi: błąd / ostrzeżenie / info. Klik w wynik przenosi tam auto i stawia czerwony znacznik. Raport: przycisk „Kopiuj raport JSON” albo `window.doktorReport`. Zasada jak w GameLaboratory: mapy nie poprawiamy ręcznie — wyniki pokazują, co ulepszyć w budowie świata (część to błędy samych danych OSM, np. tory bez wspólnego węzła).

## Wersje
Projekt używa [SemVer](https://semver.org/lang/pl/): **MAJOR.MINOR.PATCH**.
- **MINOR** – nowa funkcja widoczna dla gracza (np. wiadukty, nowe dzielnice),
- **PATCH** – poprawki błędów i drobne zmiany wydane osobno,
- poprawki w trakcie prac nad tą samą wersją nie zmieniają numeru – trafiają do bieżącego wpisu w `CHANGELOG.md`.

Numer jest w `APP_VERSION` (index.html), w `<title>`, w JSON-LD (`softwareVersion`) i na górze `CHANGELOG.md`. Workflow zatrzymuje publikację, gdy się nie zgadzają (`tools/check-version.mjs`).
