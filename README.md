# CityExplorer — Warszawa 3D

Spacer i jazda (FSO Polonez, czołg M1A2 Abrams, przegubowy Solaris Urbino 18) po prawdziwym centrum Warszawy, zbudowanym z danych OpenStreetMap: budynki z wysokościami (Pałac Kultury z częściami i iglicą), ulice, chodniki, przejścia, tory tramwajowe, parki, drzewa i rzeźba terenu.

**Graj:** https://michalstankiewicz4-cell.github.io/CityExplorer/

## Tryby
Na starcie wybiera się tryb: **pieszo i pojazdem** (czynny) — człowiek przy zaparkowanych pojazdach: Polonezie, czołgu i autobusie; **szynowy** (czynny) — tramwaj PESA Swing 120Na albo pociąg (TrainKit) na torach z OSM: W napęd, S hamowanie / wstecz, Spacja hamowanie nagłe, E drzwi; **samolot** (czynny) — Supermarine Spitfire Mk I (1940) na progu drogi startowej Okęcia (osobna mapa `?map=okecie`), fizyka lotu z GameLaboratory (zachowanie „lot w atmosferze”: nośna, przeciągnięcie, ciąg śmigła, momenty sterów, podwozie na sprężynach); **łódź** — wkrótce.

## Sterowanie
| Klawisz | Akcja |
|---|---|
| E | wsiądź / wysiądź (przy drzwiach lub włazie najbliższego pojazdu; wysiąść można po zatrzymaniu) |
| Esc | opcje: gra, grafika (m.in. styl „rysunek”), zmiana klawiszy |
| W / ↑ | gaz / naprzód |
| S / ↓ | hamulec, wsteczny / wstecz |
| A D / ← → | skręt; pieszo: krok w bok (W A S D względem kamery, kamerę obraca LPM) |
| Spacja | ręczny (drift) |
| Shift | turbo / bieg |
| R | autem: powrót na start; pieszo: do drzwi auta |
| C | kamera (za plecami / wysoko / oczami — zza kierownicy) |
| M | duża mapa (klik = teleport, przeciągnij = przesuwanie, kółko = zoom i oddalanie) |
| K | minimapa wł./wył. |
| X | rentgen: przezroczysty grunt i budynki (tunele, metro, pociągi) |
| N | noc / dzień |
| P | filtr pixel-art |
| H | ukryj pomoc |
| **Samolot:** W / S | drążek: pchnij (nos w dół) / ciągnij (nos w górę) |
| A / D | lotki (na ziemi także kółko ogonowe) |
| Q / F | ster kierunku |
| Shift / Ctrl | gaz więcej / mniej |
| Spacja | hamulce kół |
| G / B | podwozie / klapy |
| E | owiewka kabiny |
| R | od nowa na progu drogi startowej |
| Mysz | LPM + przeciągnij = rozglądanie dookoła i w górę/dół, kółko = zoom |

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

## Mapa wczytywana w locie (kafle)
Poza dokładną mapą świat dobudowuje się kaflami 1 × 1 km w zasięgu widoku, w stronę ruchu; dalekie kafle są zwalniane z pamięci. Kafle są uproszczone (płaski grunt z ulicami i obszarami, budynki z płaskimi dachami). Źródła: `tiles/<i>_<j>.json` dla całej Warszawy (generuje deploy: `tools/fetch-tiles.mjs`, w kilku przebiegach — najpierw trasa centrum — Okęcie; postęp trzyma cache GitHub Actions), pamięć przeglądarki, a poza Warszawą Overpass na żywo. Format i siatka: `js/tiles.mjs`. Duża mapa (M) przesuwa się przeciąganiem i oddala kółkiem.

## Wiadukty, tunele, przejazdy
OSM podaje tylko poziom (`layer`), więc wysokości są liczone:
- wiadukt: pomost między przyczółkami, podniesiony tak, by nad przecinaną drogą/torem był prześwit (5,3 m / 6,8 m), podjazd rozkłada się na sąsiednich ulicach (spadek 7%),
- tunel: spąg = teren − głębokość zależna od `layer` i rodzaju (droga, kolej, metro, przejście); przy portalu brany jest pod uwagę wykop widoczny w NMT, brakujący zjazd powstaje na drodze dojazdowej (wykop z murami),
- `tunnel=building_passage`: prześwit 4,2 m w ścianie budynku.
Przycisk „Zapisz dane (JSON)” zapisuje komplet (OSM + teren) – taki plik wrzucony do repo jako `warszawa-centrum.json` też zadziała.

## Technika
Jeden plik `index.html`. Three.js r186, pojazdy (RoadKit, TramKit, TrainKit, AirKit: Spitfire Mk I) i fizyka (koło na szynie, lot w atmosferze) i człowiek (LifeKit z laboratorium ludzi) ładują się z [GameLaboratory](https://michalstankiewicz4-cell.github.io/GameLaboratory/) — jedna kopia Three.js dla gry i modeli. Budynki są łączone w siatki po kwadratach 220 m. Ulice, place i trawniki są malowane na teksturze gruntu nałożonej na teren. Drzewa to instancje. Kolizje liczone są z obrysami budynków i pniami drzew. Wysokości: `height` / `building:levels` / `min_height` / `roof:shape` (pyramidal, dome, hipped). Gdy budynek ma części (`building:part`), rysowane są tylko części.

Dane © OpenStreetMap contributors (ODbL).

## Plan
- Łódź: Wisła i ORP Błyskawica z wodą z laboratorium wody.
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
