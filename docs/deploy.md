# Publikacja (GitHub Actions, `.github/workflows/static.yml`)

Dwa zadania:
- **dane** — tylko co 2 godziny i ręcznie (nie po pushu): dane OSM obszarów (`tools/fetch-osm.mjs lat lon r [plik]`:
  `warszawa-centrum.json`, `warszawa-r2000.json`, `okecie.json`, `wisla.json`) i brakujące kafle Warszawy
  (`tools/fetch-tiles.mjs`, blokami 2 × 2 km, dwa zapytania Overpass naraz, najpierw trasa centrum — Okęcie, do 40 minut);
  wszystko zapisywane w cache (`osm-v1-…`, `tiles-v1-…`).
- **publikacja** — po każdym pushu, po zadaniu „dane” i ręcznie, ok. minuty:
  1. `tools/check-version.mjs` — numer wersji ten sam w `APP_VERSION` (`js/core/config.js`), `<title>`, JSON-LD
     (`softwareVersion`) i adres miniatury (`og-image.jpg?v=…`) w `index.html` oraz na górze `CHANGELOG.md`; inaczej publikacja się zatrzymuje.
  2. Dane OSM i kafle z cache (bez pobierania; dane OSM pobiera tylko wtedy, gdy w cache ich jeszcze nie ma), spis `tiles/index.json`.
  3. Publikacja całego katalogu na GitHub Pages.

Pobieranie nie blokuje publikacji po pushu: kolejka Pages (`concurrency: pages`) obejmuje tylko krótkie zadanie „publikacja”.
Błąd pobierania danych nie zatrzymuje publikacji — gra pobierze brakujące dane w przeglądarce.

Wersje: SemVer — MINOR: nowa funkcja widoczna dla gracza, PATCH: poprawki; każda wersja ma wpis w `CHANGELOG.md`.
