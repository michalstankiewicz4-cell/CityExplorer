# Świat

## Dane
Kolejność ładowania danych OSM obszaru: plik z deployu obok strony (`warszawa-centrum.json`, `warszawa-r2000.json`,
`okecie.json`, `wisla.json`) → pamięć przeglądarki (IndexedDB) → Overpass API → API OpenStreetMap (kafelkami).
Wysokości: **NMT GUGiK** (`teren-nmt.bin`, model gruntu, oczko 5 m, ok. 2 km od PKiN), poza nim kafle **Terrarium**
(AWS Terrain Tiles) z wycinaniem „garbów” po budynkach. Bez danych wysokości teren jest płaski.

## Budowa dokładnej mapy (`buildWorld`)
Grunt to jedna tekstura (4096 px, przy dużych obszarach 8192 px) z obszarami, wodą, drogami, torami i lotniskiem
(drogi startowe z oznakowaniem: krawędzie, oś, progi, numery, strefy przyziemienia; drogi kołowania z żółtą osią).
Budynki z `height` / `building:levels` / `min_height` / `roof:shape`, łączone w siatki po kwadratach 220 m; gdy
budynek ma części (`building:part`), rysowane są części. Drzewa — instancje. Zderzenia z obrysami budynków i pniami.

## Wiadukty, tunele, przejazdy (`buildStructures`)
OSM podaje tylko poziom (`layer`), więc wysokości są liczone:
- wiadukt: pomost między przyczółkami, podniesiony tak, by nad przecinaną drogą / torem był prześwit (`CLEAR`: droga
  5,3 m, kolej i metro 6,8 m, tramwaj 6,2 m), podjazdy na sąsiednich ulicach (spadek drogi do 7%);
- most nad rzeką / kanałem: prześwit nad lustrem wody (rzeka 10 m, kanał 5 m);
- tunel: spąg = teren − głębokość zależna od `layer` i rodzaju; przy portalu brany jest pod uwagę wykop w NMT,
  brakujący zjazd powstaje na drodze dojazdowej (wykop z murami); tory pod ziemią bez znacznika tunelu (stacja
  podziemna) to tunel, tor z `layer=-1` bez tunelu — wykop;
- `tunnel=building_passage`: prześwit 4,2 m w ścianie budynku.

## Wspólny świat (obszary)
Jeden świat dla wszystkich pojazdów. Dokładne obszary (`AREAS` w `core/config.js`):

| Obszar | Środek | Promień | Plik | Co tam stoi |
|---|---|---|---|---|
| `centrum` — Śródmieście (PKiN) | 52,23175 N, 21,00586 E | 1000 m | `warszawa-centrum.json` | Polonez, Abrams, Solaris, tramwaj, pociąg WKD |
| `okecie` — Lotnisko Chopina | 52,1657 N, 20,9671 E | 2000 m | `okecie.json` | Spitfire Mk I (próg drogi startowej 29) |
| `wisla` — Wisła (Most Świętokrzyski) | 52,2400 N, 21,0370 E | 1500 m | `wisla.json` | ORP Błyskawica |

Gra buduje tylko obszar, w którym jesteś; gdy wejdziesz w głąb innego (¾ jego boku), przebudowuje świat w locie
(`switchArea`: karta ładowania, gra stoi; gracz, pojazdy, samolot i okręt przesunięte do nowego układu; zombie i ślady
walki znikają). Poprzedni obszar zostaje kaflami. Pojazd pojawia się na swoim miejscu przy pierwszym zbudowaniu jego
obszaru (`homeVehicles`) i potem tam stoi. Tramwaj i pociąg jeżdżą tylko w centrum (tory z fizyką są tylko na
dokładnej mapie); w innym obszarze są ukryte.

## Kafle (świat poza dokładną mapą)
Kafle 1 × 1 km w siatce od PKiN (`js/shared/tiles.mjs`: `G0`, `T`, format: budynki, linie, obszary w decymetrach od
rogu kafla). W zasięgu widoku w stronę ruchu kafle się wczytują, daleko za plecami są zwalniane (z geometrią,
teksturą i ścianami w siatce zderzeń). Kafel: płaski grunt z malowanymi drogami, obszarami, wodą, torami i lotniskami,
budynki z płaskimi dachami. Od krawędzi dokładnej mapy teren schodzi łagodnie (300 m) do poziomu kafli (`H()`).
Źródła: gotowe pliki `tiles/<i>_<j>.json` całej Warszawy (deploy, [deploy.md](deploy.md)) → pamięć przeglądarki →
Overpass na żywo (poza Warszawą, kafel po kaflu). Duża mapa (M): przesuwanie, oddalanie, podglądy kafli, przycisk
„Dopracowanie obszarów”.

## Parametry URL
| Parametr | Działanie |
|---|---|
| `?mode=foot` / `rail:tram` / `rail:train` / `air` / `boat` | start bez ekranu wyboru (`drive` — od razu w aucie, dla doktora mapy) |
| `?map=okecie` / `?map=wisla` | start w obszarze lotniska / Wisły |
| `?lat=…&lon=…&r=…` | własny obszar startowy (promień 300–2500 m; dane pobiorą się z OSM w przeglądarce) |
