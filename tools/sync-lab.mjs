// Pliki z GameLaboratory, których potrzebuje gra, kopiowane do lab/ (te same ścieżki co w GameLaboratory, więc
// względne importy w modułach działają bez zmian). Pracujemy dalej w repozytorium laboratorium; po zrobieniu
// zmiany w modelu / zachowaniu: node tools/sync-lab.mjs ../GameLaboratory — i commit w grze.
// Punkty wejścia: lab/entries.json; reszta (importy statyczne i dynamiczne ze stałymi ścieżkami) — zbierana sama.
// Pliki w lab/ spoza zbioru są usuwane; lab/SOURCE.json zapisuje commit laboratorium i listę plików.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';

const SRC = process.argv[2] || '../GameLaboratory', DST = 'lab';
const entries = JSON.parse(readFileSync(join(DST, 'entries.json'), 'utf8')).entries;
const IMPORT = [/\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, /\bimport\s+['"]([^'"]+)['"]/g];
const seen = new Set(), queue = entries.map((e) => normalize(e));
while (queue.length) {
  const f = queue.pop(); if (seen.has(f)) continue;
  const abs = join(SRC, f); if (!existsSync(abs)) { console.error('brak w laboratorium:', f); process.exitCode = 1; continue; }
  seen.add(f);
  if (!/\.m?js$/.test(f)) continue;
  const code = readFileSync(abs, 'utf8');
  for (const re of IMPORT) for (const m of code.matchAll(re)) {
    const s = m[1]; if (!s.startsWith('.')) continue;   // tylko ścieżki względne (three jest w vendor/)
    queue.push(normalize(join(dirname(f), s)));
  }
}
// kopiowanie i sprzątanie
const keep = new Set([...seen].map((f) => join(DST, f)).concat([join(DST, 'entries.json'), join(DST, 'SOURCE.json'), join(DST, 'README.md')]));
let n = 0;
for (const f of seen) { const to = join(DST, f); mkdirSync(dirname(to), { recursive: true }); copyFileSync(join(SRC, f), to); n++; }
const walk = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) { walk(p); if (!readdirSync(p).length) rmdirSync(p); } else if (!keep.has(p)) { unlinkSync(p); console.log('usunięty', p); } } };
walk(DST);
let commit = ''; try { commit = execSync('git rev-parse --short HEAD', { cwd: SRC }).toString().trim(); } catch { /* bez gita */ }
writeFileSync(join(DST, 'SOURCE.json'), JSON.stringify({ from: 'https://github.com/michalstankiewicz4-cell/GameLaboratory', commit, date: new Date().toISOString().slice(0, 10), files: [...seen].sort().map((f) => f.split(sep).join('/')) }, null, 1) + '\n');
console.log(`lab/: ${n} plików z GameLaboratory ${commit}`);
void relative;
