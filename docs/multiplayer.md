# Gra z innymi (multiplayer)

2–4 osoby, połączenie bezpośrednie między przeglądarkami (WebRTC). Kod: `js/net/net.js`, biblioteka PeerJS 1.5.5 (`js/vendor/peerjs.min.js`, licencja MIT obok) — wczytywana dopiero przy tworzeniu pokoju lub dołączaniu. Serwer PeerJS (publiczny, `0.peerjs.com`) tylko zestawia połączenie; dane gry idą bezpośrednio między graczami.

## Pokój

- Można zacząć samemu, a pokój utworzyć (albo dołączyć) w trakcie gry: sekcja „Gra z innymi” przechodzi po starcie do opcji (Esc → Gra).
- Ekran startowy, sekcja „Gra z innymi”: imię (zapamiętane w `localStorage`, `w3d.name`), **Utwórz pokój** — powstaje kod (5 znaków), albo kod + **Dołącz**. Potem zwykły wybór trybu.
- Identyfikator gospodarza w PeerJS: `wka6-<kod>`. Pozostali łączą się z nim (gwiazda); gospodarz przekazuje wiadomości dalej. Więcej niż 3 gości — połączenie odrzucone.
- Gospodarz wychodzi — pozostali grają dalej sami (komunikat). Gość wychodzi — znika jego postać, zwalnia miejsce w pojeździe.
- Lista graczy: `#netHud` w prawym górnym rogu (kto prowadzi, kto jest pasażerem).

## Miejsca graczy i pojazdy każdego gracza

- Gospodarz ma miejsce 0, kolejni gracze 1–3 (przydziela gospodarz, `hi.slot`). W pojedynkę — miejsce 0.
- **Komplet aut na spawnie** (Polonez, Abrams, Solaris) dla każdego gracza: `fleetSet(slot)` w `vehicles/fleet.js`; kolejne komplety stoją dalej wzdłuż tej samej ulicy (`SLOT_ALONG`: 0, +45, −45, +90 m). Pojazd ma `key` (`polonez`, `polonez#1`…), po którym jest rozpoznawany w sieci. Gracz wychodzi — jego komplet znika.
- **Samolot każdego gracza** na progu drogi startowej Okęcia, obok siebie w poprzek drogi (`airSlotPoint`, co 16 m); **okręt każdego gracza** na Wiśle, co 160 m wzdłuż nurtu (`boatSlotPoint`). Swoim samolotem i okrętem steruje tylko właściciel — u innych to kopie (`netProxies`): w locie / rejsie z jego paczek, na postoju z jego pozycji wysyłanej co sekundę (`ow`), a gdy nic nie wiadomo — na jego miejscu.
- Tramwaj i pociąg są wspólne (bez zmian).
- Dołączenie w trakcie gry: twoje pojazdy przechodzą na twoje miejsce (nieruszone jadą tam same, `netReslot`); własne zombie znikają — od tej chwili prowadzi je gospodarz.
- Położenie stojącego auta rozsyła co pół sekundy jego ostatni kierowca, a zanim ktoś nim pojedzie — właściciel kompletu (`vp`); dzięki temu porzucone auto stoi u wszystkich w tym samym miejscu.

## Mapa i odrodzenie

- Inni gracze na minimapie (strzałka w kolorze gracza z imieniem; gdy daleko — na brzegu) i na dużej mapie (`netMapPoints`, `netArrow`).
- **Odrodzenie**: opcje → „Odrodzenie na starcie” — z każdego miejsca i pojazdu pieszo na start, przy drzwiach twojego Poloneza na jego miejscu (`respawn()` w `vehicles/fleet.js`); działa też w pojedynkę.

## Gospodarz

- Prowadzi **zombie**: pojawianie wokół losowego gracza, pościg za najbliższym, znikanie dopiero daleko od wszystkich, przejechanie przez dowolnego gracza (`netTargets()` w `zombiesStep`). Stan (`zb`: id, położenie, kierunek, prędkość, atak) 10 razy na sekundę.
- Goście nie liczą zombie: pokazują je płynnie (`netZombiesStep`), trafienie (`hit`), przejechanie (`kill`) i wybuch (`boomk`) zgłaszają gospodarzowi; śmierć (`zd`) rozsyła gospodarz. Krew u strzelającego widać od razu.
- Ustala **porę dnia** (`night`).
- Prowadzi **tabelę zajętości aut i pociągu** (`occ`): pierwszy zgłoszony — kierowca, kolejni — pasażerowie (także w autach innych graczy). Zgłoszenie idzie samo przy wsiadaniu i wysiadaniu (zmiana pojazdu gracza w `netStep`).

## Pojazdy

- Kierowca liczy fizykę i wysyła stan pojazdu w swojej paczce: auto, autobus, czołg (kierunek, prędkość, skręt, wieża, armata, reflektor), samolot (orientacja, wysokość nad gruntem, stery, podwozie), okręt (kierunek, prędkość, kołysanie), pociąg (położenie na torze, prędkość, drzwi).
- U pozostałych auto lub pociąg ma `remote = true`: bez fizyki (`physics()` w `vehicles/drive.js`), położenie z sieci (`netApplyVehicle`).
- **Pasażer** (`isPassenger()`): siedzi w pojeździe, kamera jak zwykle, nie steruje; z samochodu i autobusu może strzelać przez okno (PPM + LPM). Wysiada klawiszem „wsiądź / wysiądź” na tych samych zasadach co kierowca (pojazd stoi).
- Samolot i okręt są własne (bez pasażerów). Tramwaj (fizyka koło–szyna w klatce) liczy każdy u siebie — nie jest synchronizowany.

## Płynność

- Paczka gracza `st` 15 razy na sekundę: położenie, kierunek, prędkość, celowanie / kucanie / broń, pojazd i jego stan (gdy jest kierowcą).
- Inni gracze są pokazywani **120 ms wstecz** (`NET.DELAY`): położenie, kąty i stan pojazdu interpolowane między dwiema paczkami (kąty po najkrótszej drodze, orientacja samolotu — slerp kwaternionów). Zombie u gości dojeżdżają do stanu gospodarza wykładniczo.
- Postać innego gracza: człowiek z LifeKit z imieniem nad głową; w pojeździe ukryta, imię nad pojazdem.
- Efekty innych: smugacze (`fx tr`, z samolotu jeden na salwę) i wybuchy (`fx boom`).

## Współrzędne

Każdy gracz może mieć zbudowany inny dokładny obszar, więc w sieci położenia są globalne: `l2g(x, z) = [x − TS.OFF[0], z − TS.OFF[1]]` (metry od PKiN), u odbiorcy `g2l`. Wysokość liczy każdy u siebie (`surfaceAt`, grunt kafli poza dokładną mapą); samolot przesyła wysokość nad gruntem, okręt pływa na swojej wysokości wody.

## Test lokalny

`?net=local` zamiast PeerJS używa `BroadcastChannel` — gra w kilku kartach jednej przeglądarki bez internetu (wiadomości z polem „do kogo”). Funkcje w konsoli: `netStart(true, 'KOD', 'imię')`, `netStart(false, 'KOD', 'imię')`, stan w `NET`.
