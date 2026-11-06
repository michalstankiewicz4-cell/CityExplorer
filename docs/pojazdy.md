# Pojazdy

Modele i zachowania powstają w GameLaboratory i są w `lab/` ([laboratorium.md](laboratorium.md)). Klawisze —
[sterowanie.md](sterowanie.md); poniżej nazwy akcji (`fwd`, `use`…), nie klawisze.

| Pojazd | Model (kit) | Ruch | Miejsce | Wsiadanie / wysiadanie |
|---|---|---|---|---|
| Pieszy | LifeKit (człowiek z laboratorium ludzi), karabinek Beryl, latarka (GearKit) | `walk.js`: trucht, sprint, kucanie, skok, celowanie; zderzenia ze ścianami i pojazdami | przy Polonezie albo na ulicy obszaru startu | — |
| FSO Polonez, Solaris Urbino 18 | RoadKit | `driveWheels`: przyspieszenie z `TUNE`, poślizg boczny, ręczny, spadki | centrum, przy ulicy (najlepiej Marszałkowska) | `use` przy drzwiach (sekwencja drzwi), wysiadanie po zatrzymaniu |
| M1A2 Abrams | RoadKit (z reflektorem szperaczem) | `driveTank`: gąsienice, obrót w miejscu; wieża i armata za kamerą | centrum | jak wyżej (właz) |
| PESA Swing 120Na | TramKit + zachowanie „koło na szynie” (fizyka aTrain) | nastawnik prędkości, hamulec, wykolejenie | centrum, na linii tramwajowej | `use`: drzwi, drugi raz — wysiadka przy czole |
| Pociąg (TrainKit) | TrainKit | po wygładzonym torze WKD: napęd, hamowanie, spadek, koniec mapy | centrum, Śródmieście WKD | jak tramwaj |
| Supermarine Spitfire Mk I | AirKit + zachowanie „lot w atmosferze” | 6 stopni swobody: nośna, przeciągnięcie, ciąg, stery, podwozie | Okęcie, próg drogi startowej 29 | `use` na ziemi po zatrzymaniu (owiewka się otwiera) |
| ORP Błyskawica | ShipKit + zachowanie „okręt na wodzie”; woda WaterKit | telegraf, ster, cyrkulacja, kołysanie, mielizna | Wisła przy Moście Świętokrzyskim | `use` na postoju przy brzegu |

## Kamera
`ui/camera.js`: TPP i FPP (`cam`). Pieszo kamera przez prawe ramię, przy celowaniu bliżej i węższy kąt. W pojeździe
kamera wraca za pojazd 1,5 s po ruchu myszą, gdy jedzie (auta, tramwaj, pociąg, samolot, okręt; poza czołgiem), `lookBack` — spójrz za siebie, kąt widzenia rośnie
z prędkością. Samolot i okręt mają własne kamery (`airCamera`, `boatCamera`; FPP — kabina, mostek).

## Woda
Woda z laboratorium wody liczona jest w układzie okrętu (jak w laboratorium: okręt w środku, woda płynie obok)
i rysowana drugim przebiegiem z tą samą głębią; maska z kafli (obszary wody, linie rzek) wycina ją do koryta.
Poziom wody — z terenu w korycie przy okręcie.
