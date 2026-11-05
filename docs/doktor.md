# Doktor mapy (`doktor.html`)

Uruchamia grę w ramce (`?mode=drive`) i bada zbudowany świat:

| Test | Co znajduje |
|---|---|
| Przejezdność dróg | przeszkody na osi jezdni (budynek, drzewo, filar, nasyp), uskoki na konstrukcjach, stromizny > 16%, skoki wysokości na skrzyżowaniach, prześwit pod wiaduktem < 4,2 m, drogi odcięte od sieci |
| Widoczność | jezdnia / tor w budynku, nawierzchnia pod terenem, tunel wystający nad teren, budynek w tunelu |
| Ciągłość torów | przerwy, ślepe końce, skoki wysokości, spadki (kolej 4%, metro 5%, tramwaj 9%), ostre załamania |
| Przejścia i tunele | przejścia podziemne bez wejścia, wejścia do podziemi niepodłączone, bramy bez budynku, płytkie tunele drogowe |
| Modele | auto, tramwaj, metro, pociąg — doktor modeli z GameLaboratory (kopia w `lab/tools/doctor/modeldoctor.js`) |
| Kafle mapy | gotowe kafle Warszawy, luki na trasie centrum — Okęcie, czy kafle w promieniu 4 km się wczytują i budują |

Wagi: błąd / ostrzeżenie / info. Klik w wynik przenosi tam auto i stawia znacznik. Raport: „Kopiuj raport JSON”
albo `window.doktorReport`. Mapy nie poprawiamy ręcznie: wyniki pokazują, co ulepszyć w budowie świata (część to
błędy danych OSM).
