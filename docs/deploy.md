# Publikacja (GitHub Actions, `.github/workflows/static.yml`)

Uruchamia się po pushu na `main`, ręcznie i co 2 godziny. Kroki:
1. `tools/check-version.mjs` — numer wersji ten sam w `APP_VERSION` (`js/core/config.js`), `<title>`, JSON-LD
   (`softwareVersion`) i adres miniatury (`og-image.jpg?v=…`) w `index.html` oraz na górze `CHANGELOG.md`; inaczej publikacja się zatrzymuje.
2. Dane OSM (`tools/fetch-osm.mjs lat lon r [plik]`): `warszawa-centrum.json`, `warszawa-r2000.json`, `okecie.json`,
   `wisla.json` (błąd pobierania nie zatrzymuje publikacji — gra pobierze dane w przeglądarce).
3. Kafle Warszawy (`tools/fetch-tiles.mjs`): odtworzenie z cache poprzednich przebiegów, pobranie brakujących (blokami
   2 × 2 km, dwa zapytania Overpass naraz, najpierw trasa centrum — Okęcie; po pushu 4 minuty, w przebiegu co 2 godziny
   40 minut), zapis cache, `tiles/index.json`.
4. Publikacja całego katalogu na GitHub Pages.

Wersje: SemVer — MINOR: nowa funkcja widoczna dla gracza, PATCH: poprawki; każda wersja ma wpis w `CHANGELOG.md`.
