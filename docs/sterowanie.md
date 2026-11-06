# Sterowanie

## Jedno źródło prawdy
Klawisze są tylko w `ACTIONS` (`js/core/input.js`): `[akcja, opis, [klawisz, drugi klawisz], grupa]`. Ustawienia
gracza są w `localStorage` (`w3d.keys2`), „Domyślne” w opcjach przywraca `ACTIONS`. Każdy opis klawisza w grze bierze
nazwę z `kb(akcja)`: podpowiedzi („F — wsiądź”), HUD broni, komunikaty, pomoc w lewym dolnym rogu (`drawHelp` —
dla tego, czym sterujesz), ekran startowy (`<kbd data-k="akcja">`, wypełniane przez `fillKeyLabels`). Kod pyta
o stan akcji przez `on(akcja)` (dla `fire` i `aim` także LPM i PPM).

Dodanie akcji: wpis w `ACTIONS` (z grupą), obsługa przez `on()` albo w `keydown` (`actionOf`), opis w `drawHelp`.

## Domyślne klawisze
| Grupa | Akcja | Klawisz |
|---|---|---|
| Ruch | naprzód / wstecz / w lewo / w prawo | W S A D (strzałki) |
| | sprint, turbo, więcej gazu · kucanie, mniej gazu | Shift · Ctrl |
| | skok, hamulec ręczny, stop maszyn · wsiądź / wysiądź | Spacja · F |
| Kamera i mapa | widok TPP / FPP · spójrz za siebie · mapa · minimapa | V · C · M · K |
| Broń | strzał · celowanie · broń czołgu · latarka / reflektor | LPM · PPM · Tab · L |
| Samolot | ster kierunku · podwozie · klapy · zrzut bomby | Q / E · G · B · Z (też PPM) |
| Inne | powrót na start · noc · rentgen · pixel-art · pomoc | R · N · X · P · H |

Odrodzenie (pieszo na start, przy twoim Polonezie, z każdego miejsca i pojazdu): opcje (Esc) → „Odrodzenie na starcie”. Gra z innymi: [multiplayer.md](multiplayer.md).

## Mysz
Kliknięcie w grę łapie mysz (Pointer Lock): ruch obraca kamerę bez przycisku; Esc puszcza mysz i otwiera opcje.
Kamera podąża za graczem jak w grach z widokiem zza pleców: 1,5 s po ostatnim ruchu myszą sama wraca za plecy (pieszo, gdy idziesz — nie przy celowaniu ani przy biegu w stronę kamery) i za pojazd, gdy jedzie (poza czołgiem, w którym mysz celuje wieżą). Bez złapania — LPM + przeciągnij. Zależnie od tego, czym sterujesz: pieszo LPM strzał, PPM celowanie, kółko — broń
(Beryl / bez broni); auto, autobus: PPM celowanie przez okno, LPM strzał, kółko — odległość kamery; czołg: mysz —
wieża i armata, LPM strzał, PPM przybliżenie, kółko — działo / karabin; samolot: LPM karabiny, PPM bomba;
tramwaj, pociąg, okręt — rozglądanie, kółko — odległość kamery.
