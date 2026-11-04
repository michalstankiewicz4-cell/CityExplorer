# Changelog

## 0.3.0 — 2026-11-04
- **Doktor mapy** (`doktor.html`): bada zbudowany świat — przejezdność dróg (przeszkody, uskoki, stromizny, skoki na skrzyżowaniach, prześwit pod wiaduktami, odcięte drogi), widoczność (jezdnia w budynku / pod terenem, tunel nad terenem, budynek w tunelu), ciągłość torów (przerwy, ślepe końce, skoki, spadki, ostre załamania), przejścia podziemne i bramy; modele (auto, tramwaj, metro, pociąg) bada doktor modeli z GameLaboratory. Klik w wynik przenosi tam auto i stawia znacznik; `window.doktorReport`.
- Poprawki z doktora: nasyp/bariera rampy nie blokuje drugiej jezdni ulicy dwujezdniowej; boczne drogi przy rampach bez progów (krótki podjazd, maks. 25%); tunele kolejowe i metra z wygładzonym spągiem i przykryciem; kolizje ścian budynków od terenu przy każdej krawędzi (tunel pod budynkiem nie blokuje).
- Kolizje mają rodzaj przeszkody (budynek, drzewo, filar, bariera, nasyp…).

## 0.2.0 — 2026-11-04
- Teren z NMT GUGiK (model gruntu bez budynków, oczko 5 m) zamiast Terrarium w centrum — skarpa, wykopy kolejowe, nasypy.
- Wiadukty: pomosty z barierkami i filarami, wysokość z prześwitu nad drogami/torami, podjazdy na sąsiednich ulicach; można po nich jeździć i pod nimi przejeżdżać.
- Tunele drogowe: zjazd w wykopie z murami oporowymi, wnętrze z oświetleniem, mury czołowe portali.
- Przejazdy bramne pod kamienicami (tunnel=building_passage): prześwit w ścianie, wnętrze bramy.
- Tunele kolejowe (Średnicowy, WKD), metro i przejścia podziemne; pociągi, metro i tramwaje jeżdżą po torach (kolizje z tramwajami).
- X — tryb rentgen: przezroczysty grunt i budynki, widać tunele i metro.
- Fizyka wielopoziomowa: nawierzchnia pod autem (teren/wiadukt/tunel), spadanie z krawędzi, kolizje zależne od wysokości.
- Poprawka: tło poza mapą nie przykrywa już niższych terenów (Powiśle).
- Pod wiaduktami NMT jest interpolowany — droga/tor pod spodem dostaje wysokość z terenu obok (przejazd pod wiaduktem), pomost podnoszony tylko dla estakad nad płaskim terenem.
- Wjazdy do garaży podziemnych nie robią wykopów na ulicach; rampy biegną wzdłuż drogi, bez rozlewania na boczne ulice.
- SEO po polsku: opis, Open Graph / X z miniaturą 1200×630 (og-image.jpg), dane strukturalne (schema.org VideoGame), sitemap.xml, robots.txt, ikona.
- Budynki na skarpie: dół ścian idzie za terenem (nie wchodzą do tunelu Wisłostrady).
- Wersjonowanie (SemVer): numer przy tytule (karta przeglądarki, ekran ładowania, HUD); spójność pilnuje `tools/check-version.mjs` w workflow.

## 0.1.2 — 2026-11-04
- LPM: pełne rozglądanie — dookoła oraz w górę i w dół (też z kamery z maski).
- Kamera nie wchodzi w budynki, drzewa przy kamerze są wycinane.

## 0.1.1 — 2026-11-04
- Teren: wycięcie budynków z modelu wysokości (PKiN nie stoi już na garbie), ładowanie działa w karcie w tle.

## 0.1.0 — 2026-11-04
- Pierwsza wersja: Śródmieście wokół PKiN z danych OSM (budynki z częściami, ulice, zebry, tramwaje, parki, woda, drzewa), teren z kafli Terrarium.
- Auto z fizyką arkadową (drift, turbo, nachylenie terenu), kolizje z budynkami i drzewami.
- Kamery, noc/dzień z oświetlonymi oknami i reflektorami, filtr pixel-art, minimapa, duża mapa pod M z teleportem.
- Cache w IndexedDB, eksport danych do JSON, pobieranie danych w GitHub Actions.
