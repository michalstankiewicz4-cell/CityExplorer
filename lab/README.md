# lab/ — pliki z GameLaboratory

Kopia plików [GameLaboratory](https://github.com/michalstankiewicz4-cell/GameLaboratory), których potrzebuje gra (modele,
zachowania, woda, Three.js r186, doktor modeli) — w tych samych ścieżkach co w laboratorium, więc względne importy działają.
Nie edytujemy tu niczego: zmiany robimy w GameLaboratory, potem z katalogu gry:

    node tools/sync-lab.mjs ../GameLaboratory

Punkty wejścia: `entries.json` (reszta zbierana sama z importów). `SOURCE.json` — commit laboratorium i lista plików.
