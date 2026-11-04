// Pilnuje spójności numeru wersji (uruchamiane w GitHub Actions przed publikacją).
import { readFileSync } from 'node:fs';
const html = readFileSync('index.html', 'utf8'), log = readFileSync('CHANGELOG.md', 'utf8');
const v = (html.match(/const APP_VERSION = '([\d.]+)'/) || [])[1];
const t = (html.match(/<title>[^<]*· v([\d.]+)<\/title>/) || [])[1];
const ld = (html.match(/"softwareVersion":"([\d.]+)"/) || [])[1];
const cl = (log.match(/^## ([\d.]+)/m) || [])[1];
const ok = v && v === t && v === ld && v === cl;
console.log(`APP_VERSION=${v} title=${t} JSON-LD=${ld} CHANGELOG=${cl}`);
if (!ok) { console.error('Niespójny numer wersji — popraw przed publikacją.'); process.exit(1); }
