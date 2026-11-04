# CityExplorer — Warszawa 3D

Jeżdżenie autem po prawdziwym centrum Warszawy, zbudowanym z danych OpenStreetMap: budynki z wysokościami (Pałac Kultury z częściami i iglicą), ulice, chodniki, przejścia, tory tramwajowe, parki, drzewa i rzeźba terenu.

**Graj:** https://michalstankiewicz4-cell.github.io/CityExplorer/

## Sterowanie
| Klawisz | Akcja |
|---|---|
| W / ↑ | gaz |
| S / ↓ | hamulec, wsteczny |
| A D / ← → | skręt |
| Spacja | ręczny (drift) |
| Shift | turbo |
| R | powrót pod PKiN |
| C | kamera (za autem / wysoko / z maski) |
| M | duża mapa (klik = teleport, kółko = zoom) |
| K | minimapa wł./wył. |
| N | noc / dzień |
| P | filtr pixel-art |
| H | ukryj pomoc |
| Mysz | przeciągnij = obrót kamery, kółko = zoom |

## Parametry URL
`?r=1500` – promień obszaru w metrach (300–2500, domyślnie 1000)
`?lat=52.2297&lon=21.0122` – inny środek mapy (dane pobiorą się z OSM w przeglądarce)

## Skąd dane
Kolejność ładowania:
1. `warszawa-centrum.json` obok strony – generowany przy każdym deployu przez GitHub Actions (`tools/fetch-osm.mjs`), tylko dla domyślnego środka i promienia,
2. pamięć przeglądarki (IndexedDB) – po pierwszym pobraniu,
3. Overpass API, a gdy nie odpowiada – API OpenStreetMap (kafle).

Wysokości terenu: kafle Terrarium (AWS Terrain Tiles), filtrowane, żeby usunąć „garby” po budynkach.
Przycisk „Zapisz dane (JSON)” zapisuje komplet (OSM + teren) – taki plik wrzucony do repo jako `warszawa-centrum.json` też zadziała.

## Technika
Jeden plik `index.html`, three.js z CDN (jsDelivr). Budynki są łączone w siatki po kwadratach 220 m. Ulice, place i trawniki są malowane na teksturze gruntu nałożonej na teren. Drzewa to instancje. Kolizje liczone są z obrysami budynków i pniami drzew. Wysokości: `height` / `building:levels` / `min_height` / `roof:shape` (pyramidal, dome, hipped). Gdy budynek ma części (`building:part`), rysowane są tylko części.

Dane © OpenStreetMap contributors (ODbL).
