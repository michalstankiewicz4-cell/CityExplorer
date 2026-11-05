# Zombie i broń

## Zombie (`combat/zombies.js`)
Człowiek z LifeKit ze skórą i ubraniem zombie, warstwy ruchu „zombie” i „atak”. W dzień do 21, powolne (0,4–0,7 m/s);
w nocy do 66, biegnące (2,4–3,4 m/s). Pojawiają się 45–115 m od gracza (z samolotu 80–380 m), idą do niego i przy nim
(także przy pojeździe) atakują **bez szkód**. Znikają daleko za plecami (190 m; z samolotu 480 m). Zabite: upadek na
wznak, kałuża krwi (przy przejechaniu — smuga), do 50 ciał. Rozjeżdżanie: pojazd jadący szybciej niż 2,5 m/s.

## Broń (`combat/weapons.js`)
| Kto | Broń | Działanie |
|---|---|---|
| Pieszy | karabinek Beryl (WeaponKit) | `fire`: strzał w punkt pod celownikiem (z biodra większy rozrzut), seria przy przytrzymaniu; w głowę — od razu, w ciało — 2 trafienia; `aim`: celowanie |
| Auto, autobus | Beryl przez okno | `aim` + `fire` |
| Czołg | armata 120 mm / karabin maszynowy (`weapon`, kółko) | armata: wybuch, promień 7 m, ładowanie 4 s; karabin: seria ze smugaczami; reflektor szperacz (`light`) |
| Samolot | 8 × Browning .303, 2 bomby 250 lb | `fire`: karabiny (zbieżność ok. 230 m); `aim` / `bomb`: zrzut bomby — balistyka, wybuch, promień 14 m; uzbrajanie na postoju na ziemi |
Latarka (`light`, pieszo) świeci tam, gdzie patrzy kamera. Pocisk sprawdza zombie, grunt, budynki i ściany.

## Wydajność
- **Światła**: dodanie albo usunięcie światła przebudowuje shadery wszystkich materiałów (przycięcie gry). Dlatego
  światło wybuchów jest jedno, stałe (`FX.light`), latarka jest zawsze w scenie (wyłączona — moc 0), reflektor czołgu
  ma stałe światło.
- **Rozgrzanie shaderów** (`fxWarm`) w trakcie wczytywania: materiały wybuchu, dymu, smugacza, cząstek i plam są
  kompilowane od razu — pierwszy strzał bez przycięcia.
- **Pula zombie**: 6 gotowych przy starcie; zabrane z dala wracają do puli (do 80) zamiast być budowane od nowa.
