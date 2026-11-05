# Pliki z GameLaboratory (`lab/`)

Modele, zachowania, woda, Three.js r186 i doktor modeli powstają w
[GameLaboratory](https://github.com/michalstankiewicz4-cell/GameLaboratory). Gra ma ich kopię w `lab/` — w tych samych
ścieżkach co w laboratorium (względne importy działają bez zmian) — i nie pobiera niczego z laboratorium w trakcie
działania (`GL = 'lab/'` w `vehicles/fleet.js`, importmap w `index.html`, doktor modeli w `doktor.html`).

Praca: zmiany robimy w GameLaboratory (tam też doktor modeli i laboratoria), po skończonej zmianie z katalogu gry:

    node tools/sync-lab.mjs ../GameLaboratory

i commit w grze. Narzędzie bierze punkty wejścia z `lab/entries.json`, zbiera zależności (importy statyczne
i dynamiczne ze stałymi ścieżkami), kopiuje je, usuwa z `lab/` pliki spoza zbioru i zapisuje `lab/SOURCE.json`
(commit laboratorium, lista plików). W `lab/` niczego nie edytujemy. Nowy kit używany przez grę — dopisać do
`lab/entries.json`.
