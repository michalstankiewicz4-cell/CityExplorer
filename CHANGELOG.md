# Changelog

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
