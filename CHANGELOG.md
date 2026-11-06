# Changelog

Gra nazywała się wcześniej „Warszawa 3D”; od 0.18.0 — „Wielka Kradzież Aut VI”.

## 0.20.0 — 2026-11-07
- **WKD do Pruszkowa**: pociąg WKD jedzie całą trasą ze Śródmieścia WKD do Pruszkowa WKD (16,5 km, 13 przystanków) po prawdziwej geometrii torów z OpenStreetMap, w skali 1:1 z resztą mapy — także poza dokładnym obszarem centrum, nad kaflami. Tunel pod Śródmieściem jak na dokładnej mapie, dalej tor na gruncie. Szyny budowane kawałkami po 1 km wokół składu i gracza. Dane: `data/wkd.json` (`tools/fetch-wkd.mjs`). Na końcu: „Pruszków WKD — koniec trasy”.

## 0.19.2 — 2026-11-07
- **Kamera podąża za graczem i pojazdem**: 1,5 s po ostatnim ruchu myszą sama wraca za plecy — pieszo, gdy idziesz (nie przy celowaniu ani przy biegu w stronę kamery), i za każdym pojazdem w ruchu: auta, tramwaj, pociąg, a teraz także samolot i okręt (czołg bez zmian: mysz celuje wieżą).
- **Duża mapa wyśrodkowana na graczu** przy każdym przybliżeniu i podąża za nim; przeciągnięcie przesuwa mapę, PPM wraca na gracza.

## 0.19.1 — 2026-11-05
- **Szybka publikacja**: po pushu strona publikuje się w ok. minutę z danymi z cache (wcześniej: kolejka za przebiegiem kafli i 12 minut pobierania OSM przy każdym pushu, razem nawet godzina). Dane OSM i kafle pobiera osobne zadanie co 2 godziny, które nie blokuje publikacji ([docs/deploy.md](docs/deploy.md)).

## 0.19.0 — 2026-11-05
- **Gra z innymi (2–4 osoby)** — połączenie bezpośrednie między przeglądarkami (WebRTC, PeerJS 1.5.5 w `js/vendor/`; serwer PeerJS tylko zestawia połączenie). Na ekranie startowym: imię, „Utwórz pokój” (kod do podania znajomym) albo kod i „Dołącz”, potem wybór trybu. W prawym górnym rogu lista graczy w pokoju (kto prowadzi, kto jest pasażerem).
- **Gospodarz** (ten, kto utworzył pokój) prowadzi zombie dla wszystkich (pojawiają się, gonią i atakują najbliższego gracza) i rozsyła ich stan 10 razy na sekundę; trafienia, przejechania i wybuchy innych graczy idą do niego, a śmierć zombie widzą wszyscy. Gospodarz ustala też porę dnia.
- **Pojazdy**: pierwszy, kto wsiądzie, jest kierowcą, kolejni — pasażerami (jadą z nim, kamera jak w pojeździe, sterowanie ma kierowca; z samochodu i autobusu mogą strzelać przez okno). Tramwaj liczy każdy u siebie.
- **Płynność**: stan graczy 15 razy na sekundę; ruch innych (pieszo i pojazdów, także wieża czołgu, przechyły okrętu, orientacja samolotu) pokazywany z opóźnieniem 120 ms i wygładzany między paczkami. Inni gracze jako postacie z imieniem nad głową; smugacze i wybuchy innych widać u wszystkich.
- **Każdy gracz ma swoje pojazdy**: na spawnie swój komplet aut (Polonez, Abrams, Solaris — kolejne komplety dalej wzdłuż ulicy), na Okęciu tyle samolotów, ilu graczy (obok siebie na progu), na Wiśle tyle okrętów, ilu graczy; tramwaj i pociąg wspólne. Autem innego gracza też można pojechać (kto pierwszy), samolotem i okrętem steruje tylko właściciel. Porzucone auto stoi u wszystkich w tym samym miejscu.
- **Zacznij sam, dołącz później**: sekcja „Gra z innymi” jest też w opcjach (Esc → Gra) — pokój można utworzyć albo do niego dołączyć w trakcie gry.
- **Gracze na mapie**: inni gracze na minimapie (gdy daleko — na brzegu) i na dużej mapie, w swoich kolorach, z imieniem.
- **Odrodzenie**: opcje → „Odrodzenie na starcie” — z każdego miejsca i pojazdu pieszo na start, przy twoim Polonezie (także w pojedynkę).
- **Ekran ładowania**: modele, pojazdy i broń wczytują się na pierwszym ekranie ładowania (wcześniej na karcie „Pieszo i pojazdem”); ekran startowy pojawia się, gdy wszystko gotowe, karty trybów od razu aktywne. Każde doładowanie w trakcie gry (zmiana obszaru, samolot, okręt, skład przy wyborze trybu, pojazdy dołączającego gracza) pokazuje ekran ładowania, a gra w tym czasie stoi; odrodzenie poza centrum też (natychmiastowe — bez ekranu).
- **Duża mapa: granica całej mapy** — złota obwódka siatki kafli Warszawy z wymiarami (30 × 31 km), widoczna po oddaleniu.
- **Trzy razy więcej zombie**: w dzień do 21 (wcześniej 7), w nocy do 66 (wcześniej 22); pojawiają się 3 razy częściej, pula gotowych zombie do 80.
- Naprawione miganie gruntu i ulic poza dokładnymi obszarami (z samolotu): tło pod kaflami leżało 8 cm pod ich gruntem — teraz 4 m niżej, z przesunięciem głębi.
- Miniatura strony z numerem wersji w adresie (`og-image.jpg?v=…`, pilnuje `tools/check-version.mjs`) — Discord i inne serwisy pobiorą nową zamiast pokazywać starą „Warszawę 3D” z pamięci.
- Położenia w sieci są globalne (metry od PKiN), więc gracze mogą być w różnych obszarach (Centrum, Okęcie, Wisła). Test bez sieci: `?net=local` (karty jednej przeglądarki).

## 0.18.0 — 2026-11-05
- **Ekran ładowania**: grafika na cały ekran, postęp (pasek, procent, etap) w prawym dolnym rogu; ta sama grafika jako miniatura strony (`og-image.jpg`). Z ekranu startowego usunięte linie „Wkrótce…”, „Sterowanie…” i podtytuł „Prawdziwe Śródmieście z mapy · wybierz, czym ruszasz”; karty trybów w kolejności 1–4.
- **Klawisze — jedno źródło prawdy**: każdy opis klawisza (podpowiedź „wsiądź” przy pojeździe — wcześniej na stałe „E”, HUD broni, komunikaty tramwaju i samolotu, podpowiedź mapy, pomoc, ekran startowy) bierze nazwę z ustawień klawiszy.
- **Celownik i celowanie**: pieszo z bronią celownik zawsze (bez celowania mała kropka, przy celowaniu pełny); naprawione celowanie PPM (zoom i celownik nie działały); przy strzale postać obraca się w stronę celownika, tułów z bronią pochyla się za celownikiem, z biodra większy rozrzut, przy celowaniu wolniejsza mysz.
- Kamera: C (spójrz za siebie) przeskakuje od razu zamiast przejeżdżać przez pojazd (czołg). Naprawiony błąd w konsoli przy łapaniu myszy (`setPointerCapture`).
- **Bez przycięć**: pierwszy strzał z czołgu i włączenie latarki nie przebudowują już shaderów (jedno stałe światło wybuchów, latarka zawsze w scenie, rozgrzanie shaderów efektów przy wczytywaniu); pula gotowych zombie zamiast budowania przy pojawianiu.
- Napisy przy wczytywaniu: „Pieszy (LifeKit)…”, „Ustawiam pojazdy na ich miejscach: …”, „Broń, latarka, zombie, efekty…” (wszystkie modele są w `lab/`, gra nie pobiera ich z laboratorium).
- **Nowa nazwa: „Wielka Kradzież Aut VI”** — w tytule strony, na ekranie ładowania i startowym, w HUD, SEO, dokumentacji i opisach w kodzie (wcześniej „Warszawa 3D”).
- **Dokumentacja** w `docs/` (architektura, świat, pojazdy, zombie i broń, sterowanie, laboratorium, doktor mapy, publikacja); README skrócone i poprawione (nieaktualne: klawisz E, „osobna mapa” Okęcia, doktor modeli „z jego strony”, `APP_VERSION` w index.html, `js/tiles.mjs`); opisy w kodzie poprawione, fragmenty przeniesione do właściwych plików (miejsca startowe do `vehicles/fleet.js`, `DATA` do `world/osm.js`, `WPN` do `combat/weapons.js`, `bump` do `core/scene.js`).

## 0.17.0 — 2026-11-05
- **Samolot: bomby** — dwie bomby 250 lb GP Mk IV (WeaponKit z GameLaboratory) pod skrzydłami Spitfire’a; zrzut PPM albo Z. Bomba spada z prędkością samolotu (grawitacja, opór), obraca się wzdłuż lotu i wybucha na ziemi, budynku albo ścianie: wybuch z dymem i osmaleniem, zabija zombie w promieniu 14 m. Po wylądowaniu i zatrzymaniu bomby są podwieszane od nowa; HUD pokazuje, ile zostało.
- Karabiny w skrzydłach (LPM, 8 × Browning .303, zbieżność ok. 230 m) — jak dotąd.
- Z samolotu zombie widać i pojawiają się dalej (do ok. 480 m), żeby było w co celować.

## 0.16.0 — 2026-11-05
- **Nowe sterowanie i kamera**: mysz łapana kliknięciem w grę (ruch obraca kamerę bez trzymania przycisku), Esc puszcza mysz i otwiera opcje. Pieszo: kamera przez prawe ramię, W A S D — trucht, Shift — sprint, Ctrl — kucanie, Spacja — skok; PPM — celowanie (kamera bliżej, węższy kąt, postać patrzy tam, gdzie kamera, i chodzi bokiem), LPM — strzał, kółko — broń (Beryl / bez broni). F — wsiądź / wysiądź z większej odległości.
- **Kamera: dwa widoki** — V przełącza TPP (za plecami / za pojazdem) i FPP (oczami, z kabiny, z mostka). W pojeździe kamera sama wraca za pojazd 1,5 s po ruchu myszą; C — spójrz za siebie; kąt widzenia rośnie z prędkością, kamera lekko odjeżdża i drży przy dużej prędkości.
- **Mysz zależnie od pojazdu**: samochód, autobus — PPM celowanie przez okno, LPM strzał; czołg — mysz kieruje wieżą, LPM strzał, PPM przybliżenie, kółko — działo / karabin; samolot — LPM: 8 karabinów Browning w skrzydłach; w pozostałych pojazdach kółko — odległość kamery.
- **Klawisze**: nowy układ z grupami w opcjach (Ruch, Kamera i mapa, Broń, Samolot, Inne) i opisem myszy; „Domyślne” przywraca układ. **Pomoc w lewym dolnym rogu** pokazuje klawisze i mysz dla tego, czym teraz sterujesz, według ustawień klawiszy.

## 0.15.0 — 2026-11-05
- **Podział na pliki i foldery**: `index.html` to już tylko strona; wygląd w `css/game.css`, kod gry w `js/` (core, world, vehicles, player, combat, ui, render, shared) — opis w README, „Struktura plików”.
- **Pliki z GameLaboratory w grze** (`lab/`): modele, zachowania, woda, Three.js i doktor modeli są kopiowane do repozytorium gry narzędziem `tools/sync-lab.mjs` (punkty wejścia w `lab/entries.json`, zależności zbierane same) — gra nie pobiera niczego z laboratorium w trakcie działania. Pracujemy dalej w GameLaboratory, po zmianie — synchronizacja i commit w grze.

## 0.14.0 — 2026-11-05
- **Zombie**: w dzień kilku powolnych, w nocy więcej (do 22) i szybkich — biegną. Człowiek z laboratorium ludzi GameLaboratory w skórze i ubraniu zombie, z warstwami ruchu „zombie” (pochylony, ręce przed sobą, powłóczy nogą) i „atak”. Pojawiają się wokół gracza, idą do niego; przy nim — także przy pojeździe — atakują, ale nie robią szkód. Daleko za plecami znikają.
- **Pieszo: karabinek Beryl** (WeaponKit z GameLaboratory) trzymany przed sobą i **latarka** (GearKit): strzał krótkim kliknięciem LPM albo V (przytrzymanie — seria), celownik na środku ekranu; w głowę — od razu, w ciało — dwa trafienia. L — latarka.
- **Czołg: armata 120 mm albo karabin maszynowy** (Tab): armata — wybuch z dymem, błyskiem i osmaleniem, zabija zombie w promieniu 7 m, ładowanie 4 s; karabin — seria ze smugaczami. Pocisk leci w punkt pod celownikiem. **Reflektor szperacz** przy armacie (L), celuje razem z nią.
- **Rozjeżdżanie**: pojazd w ruchu przejeżdża zombie; **ciała zostają na ziemi z krwią** (upadek na wznak, kałuża krwi, przy przejechaniu smuga), do 50 ciał.
- Nowe klawisze (do zmiany w opcjach): V — strzał, Tab — broń czołgu, L — latarka / reflektor.

## 0.13.0 — 2026-11-05
- **Wszystkie pojazdy na swoich miejscach**, niezależnie od tego, gdzie zaczynasz: Polonez, Abrams, Solaris, tramwaj PESA Swing i pociąg WKD — w centrum; Spitfire — na progu drogi startowej Okęcia; ORP Błyskawica — na Wiśle przy Moście Świętokrzyskim. Każdy pojawia się przy pierwszym zbudowaniu swojego obszaru (przy starcie albo po wjeździe / wlocie) i potem tam stoi; podchodzisz i wsiadasz klawiszem E. Tramwaj i pociąg stoją jednocześnie, każdy na swoim torze.
- Tryby na ekranie startowym przenoszą do miejsca pojazdu (Szynowy — do centrum, Samolot — na Okęcie, Okręt — na Wisłę); karta Szynowy czynna na każdej mapie.

## 0.12.0 — 2026-11-05
- **Tryb Okręt**: ORP Błyskawica (1937, ShipKit z GameLaboratory) na Wiśle przy Moście Świętokrzyskim — nowy dokładny obszar wspólnego świata (`?map=wisla`, plik `wisla.json` z deployu). W/S — telegraf (naprzód / wstecz), A/D — ster, Spacja — stop maszyn, R — od nowa, E — na postoju przy brzegu zejście na ląd (i z powrotem przy burcie). Kamera C: za rufą, dalej, z mostka.
- **Woda z laboratorium wody** (WaterKit): rzeka — zmarszczki, odbicia nieba, odblask słońca, fala dziobowa, fale Kelvina, kilwater i piana przy burtach; liczona w układzie okrętu (jak w laboratorium) i rysowana drugim przebiegiem z tą samą głębią; maska z OSM (obszary wody i linie rzek z kafli) wycina ją do koryta.
- Ruch okrętu z GameLaboratory (zachowanie „okręt na wodzie”): ciąg, opór, ster i cyrkulacja, kołysanie na falach, mielizna przy brzegu.
- Mosty nad rzekami i kanałami mają prześwit nad wodą (rzeka 10 m, kanał 5 m).

## 0.11.1 — 2026-11-05
- Zaparkowany tramwaj lub pociąg (po wysiadce) i jego tor zostają w swoim obszarze: po przejściu do innego obszaru są ukryte (wcześniej zostawały w złym miejscu), po powrocie do centrum stoją tam, gdzie je zostawiłeś.

## 0.11.0 — 2026-11-05
- **Wspólna mapa dla wszystkich pojazdów** (krok 2): dokładne obszary (Śródmieście przy PKiN, lotnisko Chopina) leżą w jednym świecie z kaflami. Gra buduje dokładnie ten obszar, w który wjeżdżasz, wchodzisz lub wlatujesz (przy wejściu w inny — przebudowa w locie z kartą ładowania; poprzedni zostaje kaflami). Z Okęcia dolatujesz nad nasze centrum, z centrum dojeżdżasz samochodem na nasze lotnisko. Tryb Samolot z centrum przenosi na Okęcie bez przeładowania strony.
- **Wysiadanie ze wszystkich pojazdów**: samolot — E po zatrzymaniu na ziemi (owiewka się otwiera, pieszy staje za skrzydłem); tramwaj i pociąg — E na postoju otwiera drzwi, drugie E — wysiadasz przy czole. E przy kabinie samolotu lub przy drzwiach składu — wsiadasz z powrotem (podpowiedź na ekranie).

## 0.10.0 — 2026-11-05
- **Jazda poza dokładną mapą** (krok 1 wspólnej mapy): samochody, czołg, autobus i pieszy nie zatrzymują się już na krawędzi — wjeżdżają na kafle wczytywane w locie. Teren od krawędzi dokładnej mapy schodzi łagodnie (300 m) do gruntu kafli, grunt kafli idzie za terenem; ściany budynków kafli są w siatce zderzeń (zwalniane razem z kaflem). Z centrum można dojechać do Okęcia (lotnisko w wersji uproszczonej — dokładne obszary we wspólnym świecie to krok 2).
- Samolot nad kaflami używa tej samej wysokości terenu.
- Minimapa pokazuje kafle wokół; duża mapa: przeniesienie kliknięciem także poza dokładną mapę.

## 0.9.1 — 2026-11-05
- Duża mapa (M): przycisk **„Dopracowanie obszarów”** — zaznacza obszary dopracowane (centrum przy PKiN — najbardziej, lotnisko Chopina, centrum `?r=2000` — dokładna mapa, mniej sprawdzana) i przyciemnia kafle wygenerowane automatycznie; legenda z opisem, co jest w każdym.

## 0.9.0 — 2026-11-05
- **Mapa wczytywana w locie**: poza dokładną mapą (centrum albo Okęcie) świat dobudowuje się kaflami 1 × 1 km w stronę, w którą lecisz / jedziesz (w zasięgu widoku), a kafle daleko za plecami są zwalniane z pamięci. Kafle są uproszczone: płaski grunt z malowanymi ulicami, obszarami, wodą, torami i lotniskami, budynki z płaskimi dachami (wysokości z OSM). Tunele, wiadukty, przejścia i jazda po torach na kaflach — później.
- Źródła kafli: gotowe pliki całej Warszawy (`tiles/`, generuje deploy: `tools/fetch-tiles.mjs`, najpierw trasa centrum — Okęcie, kolejne deploye dopełniają resztę miasta przez cache), potem pamięć przeglądarki, a poza Warszawą (np. reszta Mazowsza) — Overpass na żywo, kafel po kaflu. Wspólny moduł: `js/tiles.mjs`.
- **Duża mapa (M)**: przesuwanie przeciąganiem i oddalanie kółkiem — widać kafle dookoła (wczytują się podglądy); PKiN w swoim miejscu także na mapie Okęcia.
- Samolot nad kaflami: grunt kafli jako podłoże (lądowanie poza dokładną mapą na płaskim gruncie).
- **Doktor mapy**: nowy test „Kafle mapy” — liczba gotowych kafli, luki na trasie centrum — Okęcie, czy kafle w promieniu 4 km się wczytują i budują.

## 0.8.0 — 2026-11-05
- **Tryb Samolot**: Supermarine Spitfire Mk I (1940, AirKit z GameLaboratory) na progu drogi startowej 29 **lotniska Chopina** — osobna mapa `?map=okecie` (promień 2 km; nie całe miasto). Fizyka lotu z GameLaboratory (zachowanie „lot w atmosferze”): nośna z kąta natarcia i przeciągnięcie, opór, ciąg śmigła z mocy, momenty sterów i stateczności, koła na sprężynach z hamulcami, kółko ogonowe; start, lot i lądowanie wynikają z sił. Na rozbiegu samolot zbacza — kontruje się sterem kierunku. Zderzenie z ziemią brzuchem lub ze ścianą budynku — rozbity (R od nowa).
- Sterowanie samolotu: W/S drążek, A/D lotki (na ziemi także kółko ogonowe), Q/F ster kierunku, Shift/Ctrl gaz, Spacja hamulce, G podwozie, B klapy, E owiewka; wszystko do zmiany w opcjach. Kamera C: za samolotem, dalej, z kabiny (horyzont przechyla się z samolotem). HUD: prędkość przyrządowa, wysokość nad ziemią, gaz, klapy, podwozie, ostrzeżenie o przeciągnięciu.
- Mapa: lotniska z OSM (`aeroway`) — trawa lotniska, płyty, drogi kołowania z żółtą osią, drogi startowe z oznakowaniem (krawędzie, oś, „klawisze fortepianu” na progach, numery, strefy przyziemienia). Deploy pobiera `okecie.json`.
- Ekran startowy: karta „Samolot” czynna (z centrum przenosi na mapę Okęcia); w planie (wkrótce): śmigłowiec W-3 Sokół, Boeing, odrzutowy F-15.
- README: sterowanie samolotu, `?map=okecie`, sekcja **Plan**.

## 0.7.1 — 2026-11-04
- Pociąg jedzie linią **WKD**: start na stacji Śródmieście WKD (pod ziemią), czołem w stronę Pruszkowa — tunelem, za portalem wykopem w górę (tor się wznosi, teren przycięty pod tor) do końca mapy (dalsza trasa później); szyny na tej linii.
- Mapa: tory w wykopie (OSM layer −1 bez tunelu) i na podziemnych stacjach (level < 0) nie znikają już z mapy — wykop i zjazd od portalu robią konstrukcje; stacja podziemna to tunel.
- Rentgen (X): ściany tuneli i mury też półprzezroczyste — z pociągu w tunelu widać świat dookoła.

## 0.7.0 — 2026-11-04
- **Tramwaj na pełnej fizyce z aTrain** (GameLaboratory: zachowanie „koło na szynie”): kontakt koła z szyną z profilu koła i przekroju szyny, zawieszenie, napęd i hamulec — tramwaj trzyma się toru wyłącznie siłami (bez przyklejania). Człony na wózkach stałych jadą na swoich zestawach kołowych, podwieszone wiszą na przegubach; widać przechył i kołysanie, za szybko w łuku — wykolejenie (R wraca na tor). W/S — nastawnik (prędkość zadana, widać ją w HUD), Spacja — hamulec.
- **Szyny** na początek na linii, po której jedzie gracz — tramwajowej (w jezdni) albo kolejowej (na podsypce z podkładami); pozostałe linie później. Z tego samego opisu toru co fizyka; tory z OSM przycięte do mapy i wygładzone (także w pionie) — tor bez skoków.
- Ekran startowy: wyśrodkowane miniatury; w planie (wkrótce): metro — na początek linia M1, trolejbus linii 51 (1983–1995, Puławska).
- **Doktor mapy**: sprawdza, czy z chodnika da się zejść do przejścia podziemnego (pieszy idzie od wejścia w głąb) — wejście jest w OSM, a w świecie gry brak schodów / rampy: „Wejście do podziemi niepodłączone”.

## 0.6.0 — 2026-11-04
- **Tryb szynowy**: prowadzisz **tramwaj PESA Swing 120Na** (model z GameLaboratory — 5 członów, każdy człon na łuku toru, harmonijki się rozciągają, drzwi, wnętrze, nocą światła) albo **pociąg z TrainKit** (lokomotywa spalinowa, wagon drewniany i stalowy; zestawy kołowe się obracają) po prawdziwych torach z OSM. W — napęd, S — hamowanie (na postoju jazda wstecz), Spacja — hamowanie nagłe, E — drzwi na postoju; prędkość z masy, mocy, oporów i spadku toru, kozioł oporowy na końcu toru. Kamera C: widok z kabiny. Automatyczne składy znikają z toru gracza.
- Na ekranie startowym karta „Szynowy” czynna: klik w miniaturę tramwaju albo pociągu wybiera skład.

## 0.5.1 — 2026-11-04
- Pieszo: sterowanie jak w grach z kamerą za plecami — W A S D względem kamery (A/D krok w bok), postać obraca się w stronę ruchu, kamerę obraca się myszą (LPM) i zostaje tam, gdzie ją ustawisz. Wcześniej A/D obracały postać razem z kamerą.
- Ekran startowy: miniatury pojazdów to gotowe obrazki (`img/`), widać je od razu, bez renderowania przy starcie.

## 0.5.0 — 2026-11-04
- **Trzy pojazdy przy starcie** (modele z GameLaboratory): FSO Polonez, **czołg M1A2 Abrams** (gąsienice, obrót w miejscu, wieża i armata celują za kamerą, właz dowódcy) i **przegubowy Solaris Urbino 18** w barwach MZA (przegub jak naczepa, otwierane drzwi, wnętrze, nocą świecą lampy w środku i wyświetlacze). Wsiadasz do najbliższego klawiszem E.
- Zderzenia pojazdów ze sobą, z pieszym i z miastem (okręgi wzdłuż nadwozia; autobus także członem tylnym).
- **Ekran startowy**: przelot nad Śródmieściem w tle, karty trybów z **miniaturami pojazdów** (renderowane z modeli), modele wczytują się w tle z paskiem postępu; ekran ładowania z kółkiem, paskiem i procentami.
- **Opcje (Esc)** — gra pauzuje: noc, rentgen, pixel-art, minimapa, kamera; **grafika** (rozdzielczość, cienie, zasięg widoku, pole widzenia, jasność, **styl pojazdów: rysunek — krawędzie niebieskim długopisem, powierzchnie kredką kreskowaną po skosie**); **klawisze** do zmiany (po dwa na czynność). Ustawienia zostają w przeglądarce.

## 0.4.0 — 2026-11-04
- **Ekran startowy z wyborem trybu**: 1 — pieszo i pojazdem (czynny); szynowy, łódź i samolot — wkrótce.
- **Pieszy**: człowiek z laboratorium ludzi GameLaboratory (LifeKit — chód i bieg ze szkieletem), W/S/A/D, Shift — bieg; zderzenia ze ścianami, drzewami i autem.
- **FSO Polonez 1500** z GameLaboratory (RoadKit) zamiast prostego auta: koła ze skrętem Ackermanna, zawieszenie na nawierzchni pod każdym kołem, przechył i „kucanie”, światła mijania nocą, światła stop i cofania, wnętrze; kamera C — widok zza kierownicy.
- **Wsiadanie i wysiadanie (E)**: drzwi kierowcy otwierają się, człowiek wchodzi / wychodzi; wysiąść można po zatrzymaniu.
- Gra używa Three.js r186 z GameLaboratory (jedna kopia dla gry i modeli).

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
