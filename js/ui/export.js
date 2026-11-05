// Wielka Kradzież Aut VI — Zapis danych (JSON) i pobranie od nowa.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- eksport / odświeżenie ---------- */
$('bExport').onclick = () => {
  const out = { meta: { lat: CENTER.lat, lon: CENTER.lon, R, SEG, created: new Date().toISOString(), attribution: '© OpenStreetMap contributors (ODbL); elevation: Mapzen Terrarium / AWS Terrain Tiles' }, osm: DATA, terrain: TERR_RAW ? Array.from(TERR_RAW, v => Math.round(v * 10) / 10) : null };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = 'warszawa-centrum.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
$('bRefresh').onclick = async () => { await idb.del(CACHE_KEY); await idb.del(TERR_KEY); location.reload(); };
$('bHide').onclick = () => { $('help').style.display = 'none'; };
