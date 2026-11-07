// Wielka Kradzież Aut VI — Gra z innymi (2–4 osoby) przez WebRTC: połączenie bezpośrednie między przeglądarkami (PeerJS,
// js/vendor/peerjs.min.js; serwer PeerJS tylko zestawia połączenie). Gwiazda: gospodarz (ten, kto utworzył pokój) przekazuje
// wiadomości pozostałym, prowadzi zombie i tabelę zajętości pojazdów (pierwszy w pojeździe — kierowca, kolejni — pasażerowie).
// Każdy gracz ma swoje miejsce (0 — gospodarz, 1–3): na spawnie swój komplet aut (Polonez, Abrams, Solaris), na Okęciu
// swój samolot, na Wiśle swój okręt; tramwaj i pociąg są wspólne. Auta innych można prowadzić (kto pierwszy), samolotem
// i okrętem innego gracza steruje tylko on — u pozostałych to kopie ustawiane z sieci.
// Położenia w sieci są globalne (metry od PKiN), bo każdy gracz może mieć zbudowany inny dokładny obszar; wysokości
// liczy każdy u siebie (grunt), samolot — nad gruntem. Ruch innych graczy jest wygładzany: pokazujemy stan sprzed 120 ms
// między dwiema ostatnimi paczkami. Test bez sieci: ?net=local (BroadcastChannel między kartami jednej przeglądarki).
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
const NET = {
  on: false, host: false, me: null, hostId: null, name: '', code: '', tr: null,
  players: new Map(),       // id → { id, name, buf: [paczki], av: awatar, tag: napis, k, v }
  occ: {},                  // pojazd → { d: kierowca, p: [pasażerowie] } (u gospodarza prawdziwa, u reszty kopia)
  slot: 0, sendT: 0, zbT: 0, vpT: 0, owT: 0, setT: 0, zSeq: 1, zmap: new Map(), px: new Map(),
  DELAY: 120, RATE: 1 / 15,
};
const g2l = (gx, gz) => [gx + TS.OFF[0], gz + TS.OFF[1]], l2g = (x, z) => [x - TS.OFF[0], z - TS.OFF[1]];
const vehId = () => mode === 'car' && ACT ? ACT.key : mode === 'rail' ? rail.kind : mode === 'air' ? 'air' : mode === 'boat' ? 'boat' : null;
const driverOf = (v) => NET.occ[v] && NET.occ[v].d;
const remoteDriven = (v) => NET.on && !!driverOf(v) && driverOf(v) !== NET.me;
// pasażer: siedzisz w pojeździe, który prowadzi ktoś inny (sterowanie ma kierowca); tramwaj liczy każdy u siebie
const isPassenger = () => { const v = vehId(); return !!v && remoteDriven(v); };
// zgłaszane do tabeli zajętości: auta (każdego gracza) i pociąg; tramwaj liczy każdy u siebie, samolot i okręt są własne
const myVeh = () => { const v = mode === 'enter' && SEQV ? SEQV.key : mode === 'exit' ? null : vehId(); return v === 'tram' || v === 'air' || v === 'boat' ? null : v; };
const baseId = (v) => String(v || '').split('#')[0];
const slotOwner = (k) => k === NET.slot ? NET.me : ([...NET.players.values()].find((p) => p.slot === k) || {}).id;

/* ---------- transport: PeerJS albo kanał lokalny (test) ---------- */
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error('Nie wczytano PeerJS')); document.head.appendChild(s); });
}
async function netTransport(code, host, onMsg, onOpen, onClose) {
  const id = 'wka6-' + code.toLowerCase();
  if (QS.get('net') === 'local') {   // karty jednej przeglądarki: BroadcastChannel, każdy widzi wszystko — filtr „do kogo”
    const me = host ? id : id + '-' + Math.random().toString(36).slice(2, 7), bc = new BroadcastChannel(id);
    bc.onmessage = (e) => { const m = e.data; if (m.to !== me && m.to !== '*') return; if (m.hello && host) onOpen(m.from); if (m.bye) onClose(m.from); else if (!m.hello) onMsg(m.from, m.d); };
    if (!host) setTimeout(() => { bc.postMessage({ from: me, to: id, hello: true }); onOpen(id); }, 50);
    return { me, send: (to, d) => bc.postMessage({ from: me, to, d }), close: () => bc.postMessage({ from: me, to: '*', bye: true }) };
  }
  await loadPeerJS();
  const conns = new Map();
  const peer = host ? new Peer(id, { debug: 1 }) : new Peer({ debug: 1 });
  const me = await new Promise((res, rej) => { peer.on('open', res); peer.on('error', (e) => rej(new Error(e.type === 'unavailable-id' ? 'Pokój o tym kodzie już istnieje' : e.type === 'peer-unavailable' ? 'Nie ma pokoju o tym kodzie' : e.message))); });
  const wire = (c) => {
    c.on('open', () => { conns.set(c.peer, c); onOpen(c.peer); });
    c.on('data', (d) => onMsg(c.peer, d));
    c.on('close', () => { conns.delete(c.peer); onClose(c.peer); });
  };
  if (host) peer.on('connection', (c) => { if (conns.size >= 3) { c.on('open', () => c.close()); return; } wire(c); });
  else wire(peer.connect(id, { serialization: 'json', reliable: true }));
  return { me, send: (to, d) => { if (to === '*') { for (const c of conns.values()) c.send(d); } else { const c = conns.get(to); if (c) c.send(d); } }, close: () => peer.destroy() };
}

/* ---------- pokój ---------- */
async function netStart(host, code, name) {
  NET.code = (code || Math.random().toString(36).slice(2, 7)).toUpperCase(); NET.host = host; NET.name = name || (host ? 'Gospodarz' : 'Gracz');
  NET.tr = await netTransport(NET.code, host, netOnMsg, (pid) => {
    if (NET.host) { NET.players.set(pid, NET.players.get(pid) || { id: pid, name: '…', buf: [] }); }
    else { NET.hostId = pid; NET.tr.send(pid, { t: 'hello', name: NET.name }); }
  }, (pid) => netDrop(pid));
  NET.me = NET.tr.me; NET.on = true; if (host) NET.hostId = NET.me;
  addEventListener('beforeunload', () => { try { NET.tr.close(); } catch { } });
  return NET.code;
}
function netDrop(pid) {
  const p = NET.players.get(pid); if (p) { netAvatarFree(p); netProxyFree(pid); NET.players.delete(pid); flash((p.name || 'Gracz') + ' wyszedł'); }
  if (NET.host) { for (const v in NET.occ) { const o = NET.occ[v]; if (o.d === pid) o.d = null; o.p = o.p.filter((x) => x !== pid); } netSend('*', { t: 'occ', occ: NET.occ }); netPlayers(); }
  else if (pid === NET.hostId) { flash('Gospodarz zamknął pokój — gra dalej sama'); NET.on = false; NET.occ = {}; for (const p of NET.players.values()) { netAvatarFree(p); netProxyFree(p.id); } NET.players.clear(); netOccApply(); }
}
// wysyłka: gracz → gospodarz; gospodarz → wszyscy (albo do jednego)
function netSend(to, d) { if (!NET.on) return; if (!NET.host) NET.tr.send(NET.hostId, d); else NET.tr.send(to, d); }
function netRelay(from, d) { if (NET.host) for (const p of NET.players.values()) if (p.id !== from) NET.tr.send(p.id, d); }
function netPlayers() { netSend('*', { t: 'pl', list: [{ id: NET.me, name: NET.name, slot: 0 }, ...[...NET.players.values()].map((p) => ({ id: p.id, name: p.name, slot: p.slot }))] }); netHud(); }

function netOnMsg(from, d) {
  if (!d || !d.t) return;
  if (NET.host && d.t === 'hello') { const p = NET.players.get(from) || { id: from, buf: [] }; p.name = String(d.name || 'Gracz').slice(0, 16); if (p.slot == null) { const used = new Set([0, ...[...NET.players.values()].map((q) => q.slot)]); p.slot = [1, 2, 3].find((k) => !used.has(k)) ?? 3; } NET.players.set(from, p); NET.tr.send(from, { t: 'hi', you: from, slot: p.slot, night, occ: NET.occ }); netPlayers(); flash(p.name + ' dołączył'); return; }
  if (d.t === 'hi') { NET.me = d.you; zClearAll();   // dołączenie w trakcie gry: zombie od teraz prowadzi gospodarz
    if (d.slot !== NET.slot) { const o = NET.slot; NET.slot = d.slot; netReslot(o, d.slot); }   // twoje pojazdy na twoje miejsce
    setNight(!!d.night); NET.occ = d.occ || {}; netOccApply(); flash('Połączono z pokojem ' + NET.code); return; }
  if (d.t === 'pl') { for (const q of d.list) if (q.id !== NET.me && !NET.players.has(q.id)) NET.players.set(q.id, { id: q.id, name: q.name, buf: [] }); for (const q of d.list) { const p = NET.players.get(q.id); if (p) { p.name = q.name; p.slot = q.slot; } } for (const id of [...NET.players.keys()]) if (!d.list.some((q) => q.id === id)) netDrop(id); netHud(); return; }
  if (d.t === 'st') { const id = d.id || from; if (id === NET.me) return; const p = NET.players.get(id) || NET.players.set(id, { id, name: d.n, buf: [] }).get(id); p.buf.push({ at: performance.now(), d }); if (p.buf.length > 8) p.buf.shift(); if (d.ow) p.ow = d.ow; if (NET.host) netRelay(from, { ...d, id }); return; }
  if (d.t === 'occ') { if (NET.host && d.req) { netOccReq(from, d.req, d.v); return; } NET.occ = d.occ; netOccApply(); return; }
  if (d.t === 'night') { setNight(!!d.on); return; }
  if (d.t === 'zb') { netZombies(d); return; }
  if (d.t === 'zd') { const z = NET.zmap.get(d.id); if (z && !z.dead) zKill(z, d.dir, d.cr, true); return; }
  if (d.t === 'hit' && NET.host) { const z = ZB.list.find((q) => q.nid === d.id && !q.dead); if (z) { z.hp -= d.head ? 3 : 1; if (z.hp <= 0) zKill(z, d.dir || 0, false); } return; }
  if (d.t === 'kill' && NET.host) { const z = ZB.list.find((q) => q.nid === d.id && !q.dead); if (z) zKill(z, d.dir || 0, !!d.cr); return; }
  if (d.t === 'boomk' && NET.host) { const [x, z] = g2l(d.g[0], d.g[1]); for (const q of ZB.list) if (!q.dead && Math.hypot(q.x - x, q.z - z) < d.r) zKill(q, Math.atan2(q.x - x, q.z - z), false); return; }
  if (d.t === 'vp') { netPoses(d); if (NET.host) netRelay(from, d); return; }
  if (d.t === 'fx') { netFxShow(d); if (NET.host) netRelay(from, d); return; }
}

/* ---------- pojazdy: zajętość (gospodarz rozstrzyga — pierwszy kierowcą, kolejni pasażerami) ---------- */
function netClaim(v, role) { if (!NET.on) return; if (NET.host) netOccReq(NET.me, role, v); else netSend(NET.hostId, { t: 'occ', req: role, v }); }
function netOccReq(pid, role, v) {
  const o = NET.occ[v] || (NET.occ[v] = { d: null, p: [] });
  o.p = o.p.filter((x) => x !== pid); if (o.d === pid) o.d = null;
  if (role === 'enter') { if (!o.d) o.d = pid; else o.p.push(pid); }
  netSend('*', { t: 'occ', occ: NET.occ }); netOccApply();
}
// po zmianie tabeli: kto steruje którym pojazdem (u mnie pojazdy prowadzone przez innych nie liczą fizyki)
function netOccApply() {
  for (const V of FLEET) { V.remote = remoteDriven(V.key); if (driverOf(V.key)) V.auth = driverOf(V.key); }   // położenie auta rozsyła ostatni kierowca
  for (const k in RAILS) RAILS[k].remote = remoteDriven(k);
  // ktoś był pierwszy — jedziesz jako pasażer
  const pas = isPassenger(); if (pas && !NET.pas) flash('Pojazd prowadzi ' + netName(driverOf(vehId())) + ' — jedziesz jako pasażer'); NET.pas = pas;
  netHud();
}
const netName = (id) => id === NET.me ? NET.name : (NET.players.get(id) || {}).name || 'gracz';

/* ---------- mój stan → sieć (15 razy na sekundę) ---------- */
function netMyState() {
  const [gx, gz] = l2g(ego.x, ego.z), d = { t: 'st', id: NET.me, n: NET.name, k: mode === 'enter' || mode === 'exit' ? 'foot' : mode, v: vehId(), p: [Math.round(gx * 100) / 100, Math.round(gz * 100) / 100], th: +ego.th.toFixed(3), sp: +(ego.vf || 0).toFixed(2), an: [on('aim') ? 1 : 0, ped.crouch ? 1 : 0, WPN.armed ? 1 : 0] };
  if (mode === 'foot' || mode === 'enter' || mode === 'exit') { const [px, pz] = l2g(ped.x, ped.z); d.p = [px, pz]; d.th = ped.th; d.sp = ped.vf; }
  if (d.v && (mode === 'air' || mode === 'boat' || driverOf(d.v) === NET.me)) {
    if (mode === 'car') d.vs = { th: car.th, vf: car.vf, st: car.steer, w: car.w || 0, tur: orbit, gun: Math.max(-0.15, Math.min(0.35, 0.05 - tilt * 0.5)), br: car.brake ? 1 : 0, sl: ACT.id === 'abrams' && WPN.search ? 1 : 0 };
    else if (mode === 'air') { const s = air.sim.state, c = air.c; d.vs = { q: s.q.map((x) => +x.toFixed(4)), agl: s.p[1] - H(s.p[0], s.p[2]), c: [c.throttle, c.aileron, c.elevator, c.rudder, c.flaps, c.gear], g: s.onGround ? 1 : 0 }; }
    else if (mode === 'boat') { const s = boat.sim.state; d.vs = { th: s.th, vf: s.vf, h: s.heave, pi: s.pitch, ro: s.roll, sh: s.shift }; }
    else if (mode === 'rail' && rail.kind === 'train') d.vs = { s: rail.s, v: rail.v, dr: rail.doors };
  }
  // co sekundę: gdzie stoi mój samolot i okręt (inni widzą je na lotnisku i na rzece, także gdy dołączą później)
  if ((NET.owT -= NET.RATE) <= 0) { NET.owT = 1; d.ow = {};
    if (air.sim) { const s = air.sim.state, g = l2g(s.p[0], s.p[2]); d.ow.a = [g[0], s.p[1] - H(s.p[0], s.p[2]), g[1], ...s.q.map((x) => +x.toFixed(4)), air.c.gear]; }
    if (boat.sim) { const s = boat.sim.state, g = l2g(s.x, s.z); d.ow.b = [g[0], g[1], s.th, boat.yw]; } }
  return d;
}
/* ---------- inni gracze: wygładzenie (stan sprzed 120 ms), awatary, pojazdy prowadzone przez nich ---------- */
const lerpA = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
function netSample(p) {
  const B = p.buf; if (!B.length) return null;
  const t = performance.now() - NET.DELAY; let i = B.length - 1; while (i > 0 && B[i - 1].at > t) i--;
  const a = B[Math.max(0, i - 1)], b = B[i]; if (a === b || b.at <= a.at) return b.d;
  const k = Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at))), A = a.d, Bd = b.d;
  const o = { ...Bd, p: [A.p[0] + (Bd.p[0] - A.p[0]) * k, A.p[1] + (Bd.p[1] - A.p[1]) * k], th: lerpA(A.th, Bd.th, k), sp: A.sp + (Bd.sp - A.sp) * k };
  if (A.vs && Bd.vs) { o.vs = { ...Bd.vs }; for (const key of ['vf', 'h', 'pi', 'ro', 'sh', 's', 'v', 'agl', 'gun']) if (typeof A.vs[key] === 'number') o.vs[key] = A.vs[key] + (Bd.vs[key] - A.vs[key]) * k; for (const key of ['th', 'tur']) if (typeof A.vs[key] === 'number') o.vs[key] = lerpA(A.vs[key], Bd.vs[key], k);
    if (A.vs.q && Bd.vs.q) { const qa = new THREE.Quaternion(A.vs.q[1], A.vs.q[2], A.vs.q[3], A.vs.q[0]), qb = new THREE.Quaternion(Bd.vs.q[1], Bd.vs.q[2], Bd.vs.q[3], Bd.vs.q[0]); qa.slerp(qb, k); o.vs.q = [qa.w, qa.x, qa.y, qa.z]; } }
  return o;
}
function netAvatar(p) {
  if (p.av || !window.LifeKit) return;
  const LK = window.LifeKit, def = LK.CREATURES.find((c) => c.id === 'humanHead') || LK.CREATURES[0], P = {};
  for (const q of def.params) P[q.key] = q.value;
  P.height = 1.72 + Math.random() * 0.12; P.suit = [2, 3, 4, 0][NET.players.size % 4]; P.seed = Math.floor(Math.random() * 1000);
  const c = LK.build(def.id, P, { detail: 0.8 }); c.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); scene.add(c.group); p.av = c;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#0d1014cc'; g.fillRect(0, 8, 256, 48); g.fillStyle = '#e9d3a6'; g.font = '600 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.name || 'Gracz', 128, 33);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  p.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); p.tag.scale.set(2.4, 0.6, 1); p.tag.renderOrder = 20; scene.add(p.tag);
}
function netAvatarFree(p) { if (p.av) { scene.remove(p.av.group); p.av.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); p.av = null; } if (p.tag) { scene.remove(p.tag); p.tag.material.map.dispose(); p.tag.material.dispose(); p.tag = null; } }
function netShowPlayers(dt) {
  for (const p of NET.players.values()) {
    const d = netSample(p); if (!d) continue;
    netAvatar(p); if (!p.av) continue;
    const [x, z] = g2l(d.p[0], d.p[1]), onFoot = d.k === 'foot';
    let tagY = 0;
    if (onFoot) {
      const y = surfaceAt(x, z, (p.y ?? H(x, z)) + 1, true); p.y = y;
      p.av.group.visible = true; p.av.group.position.set(x, y, z); p.av.group.rotation.set(0, d.th, 0);
      const sp = Math.abs(d.sp); p.av.animate(carT, dt, { gait: sp < 0.15 ? 'idle' : sp > 2.6 ? 'run' : 'walk', speed: Math.max(0.6, sp), layers: { aim: d.an && d.an[2] ? 1 : 0, sneak: d.an && d.an[1] ? 1 : 0 } });
      tagY = y + 2.2;
    } else { p.av.group.visible = false; tagY = netVehicleTagY(d, x, z); }
    p.tag.position.set(x, tagY, z);
    if (d.vs && d.v && driverOf(d.v) === d.id) netApplyVehicle(d, x, z, dt);
    netProxies(p, d, x, z, dt);
  }
}
function netVehicleTagY(d, x, z) {
  if (d.v === 'air' && d.vs) return H(x, z) + (d.vs.agl || 0) + 3;
  if (d.v === 'boat') return (boat.yw || H(x, z)) + 32;
  const b = baseId(d.v); return surfaceAt(x, z, H(x, z) + 1) + (b === 'urbino18' || b === 'abrams' || b === 'train' || b === 'tram' ? 4.5 : 2.6);
}
// pojazd prowadzony przez innego gracza: u mnie bez fizyki, w miejscu z sieci
function netApplyVehicle(d, x, z, dt) {
  const vs = d.vs, V = FLEET.find((q) => q.key === d.v);
  if (V && vs.vf != null) { const S = V.s; S.x = x; S.z = z; S.th = vs.th; S.vf = vs.vf; S.steer = vs.st; S.w = vs.w; S.brake = !!vs.br; S.y = surfaceAt(x, z, S.y + 1); S.vx = Math.sin(S.th) * S.vf; S.vz = Math.cos(S.th) * S.vf; S.rest = false; V.net = vs; return; }
  if (d.v === 'train' && RAILS.train.V && RAILS.train.area === AREA) { const R = RAILS.train; R.s = vs.s; R.v = vs.v; R.doors = vs.dr; const prev = rail; rail = R; railPlace(0); rail = prev; }
}

/* ---------- samoloty i okręty innych graczy: kopie ustawiane z sieci (lot / rejs — 15 razy na sekundę, postój — co sekundę) ---------- */
function netProxies(p, d, x, z, dt) {
  const P = NET.px.get(p.id) || NET.px.set(p.id, {}).get(p.id);
  // samolot: w locie z paczki, na postoju z „ow”, a gdy nic nie wiadomo — na miejscu gracza na progu drogi startowej Okęcia
  let a = null;
  if (d.v === 'air' && d.vs) a = { x, z, agl: d.vs.agl, q: d.vs.q, c: d.vs.c, fly: true };
  else if (p.ow && p.ow.a) { const [lx, lz] = g2l(p.ow.a[0], p.ow.a[2]); a = { x: lx, z: lz, agl: p.ow.a[1], q: p.ow.a.slice(3, 7), c: [0, 0, 0, 0, 0, p.ow.a[7]] }; }
  else if (AREA === AREAS.okecie && W.runways && p.slot != null && FLY && P.restQ !== undefined) { const sp = airSlotPoint(p.slot); a = { x: sp.x, z: sp.z, agl: P.restY, q: P.restQ(sp.th), c: [0, 0, 0, 0, 0, 1] }; }
  if ((a || (AREA === AREAS.okecie && p.slot != null)) && !P.air && !P.airBusy) { P.airBusy = true; (started ? withLoader('Samolot gracza…', () => netProxyAir(P)) : netProxyAir(P)).finally(() => { P.airBusy = false; }); }
  if (P.air) { P.air.group.visible = !!a; if (a) { const g = P.air.group; g.position.set(a.x, H(a.x, a.z) + a.agl, a.z); g.quaternion.set(a.q[1], a.q[2], a.q[3], a.q[0]);
    P.air.update(carT, dt, { throttle: a.fly ? a.c[0] : 0, engine: !!a.fly, aileron: a.c[1], elevator: a.c[2], rudder: a.c[3], flaps: a.c[4], gear: a.c[5] > 0.5, work: a.fly ? 0 : 1, lights: night, speed: 0 }); } }
  // okręt: w rejsie z paczki, na postoju z „ow”, inaczej na miejscu gracza na Wiśle
  let b = null;
  if (d.v === 'boat' && d.vs) b = { x, z, th: d.vs.th, h: d.vs.h, pi: d.vs.pi, ro: d.vs.ro };
  else if (p.ow && p.ow.b) { const [lx, lz] = g2l(p.ow.b[0], p.ow.b[1]); b = { x: lx, z: lz, th: p.ow.b[2], h: 0, pi: 0, ro: 0, yw: p.ow.b[3] }; }
  else if (boat.base && p.slot != null) { const sp = boatSlotPoint(p.slot); b = { x: sp.x, z: sp.z, th: sp.th, h: 0, pi: 0, ro: 0 }; }
  if (b && !P.boat && !P.boatBusy) { P.boatBusy = true; (started ? withLoader('Okręt gracza…', () => netProxyBoat(P)) : netProxyBoat(P)).finally(() => { P.boatBusy = false; }); }
  if (P.boat) { P.boat.group.visible = !!b; if (b) { P.boat.group.position.set(b.x, (boat.V ? boat.yw : b.yw ?? H(b.x, b.z) + 0.3) + b.h, b.z); P.boat.group.rotation.set(-b.pi, b.th, b.ro, 'YXZ'); P.by = P.boat.group.position.y; } }
}
async function netProxyAir(P) {
  if (!AIRK) [AIRK, FLY] = await Promise.all([import(GL + 'js/models/air/airkit.js'), import(GL + 'js/behaviors/air/flight.js')]);
  const V = AIRK.buildAircraft('spitfire', {}); prepModel(V.group); scene.add(V.group); P.air = V;
  P.restY = V.def.rest.y; P.restQ = (yaw) => FLY.createFlight(V.def.flight, V.def.mass, { p: [0, 0, 0], yaw, pitch: -V.def.rest.pitch }).state.q;
}
async function netProxyBoat(P) {
  if (!SHIPK) [WK, SHIPK, SHIPB] = await Promise.all([import(GL + 'js/envs/water/waterkit.js'), import(GL + 'js/models/ships-sea/index.js'), import(GL + 'js/behaviors/water/ship.js')]);
  const m = SHIPK.buildShip('blyskawica', {}); prepModel(m.group); scene.add(m.group); P.boat = m;
}
function netProxyFree(id) {
  const P = NET.px.get(id); if (!P) return;
  for (const m of [P.air, P.boat]) if (m) { scene.remove(m.group); m.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
  NET.px.delete(id);
}
/* ---------- komplety aut: każdy gracz ma swój; położenie stojącego auta rozsyła ostatni kierowca (albo właściciel) ---------- */
function netSets() {
  if (!RK || !FLEET.length || NET.setBusy) return;
  const slots = new Set([NET.slot, ...[...NET.players.values()].map((p) => p.slot).filter((k) => k != null)]);
  const need = [...slots].filter((k) => !FLEET.some((V) => V.slot === k));
  for (const k of new Set(FLEET.map((V) => V.slot))) if (!slots.has(k)) fleetDrop(k);
  if (need.length) { NET.setBusy = true; const go = async () => { for (const k of need) await fleetSet(k); }; (started ? withLoader('Pojazdy gracza…', go) : go()).finally(() => { NET.setBusy = false; }); }
}
function netPosesSend() {
  const list = [];
  for (const V of FLEET) { if ((V.auth || slotOwner(V.slot)) !== NET.me || driverOf(V.key)) continue; const S = V.s, g = l2g(S.x, S.z); list.push([V.key, Math.round(g[0] * 100) / 100, Math.round(g[1] * 100) / 100, +S.th.toFixed(3)]); }
  if (list.length) netSend('*', { t: 'vp', list });
}
function netPoses(d) {
  for (const [key, gx, gz, th] of d.list) {
    const V = FLEET.find((q) => q.key === key); if (!V || driverOf(key) || (V === ACT && mode === 'car')) continue;
    const [x, z] = g2l(gx, gz), S = V.s;
    if (Math.hypot(S.x - x, S.z - z) < 0.3 && Math.abs(lerpA(S.th, th, 1) - S.th) < 0.03) continue;
    S.x = x; S.z = z; S.th = th; S.vx = S.vz = S.vf = 0; S.y = surfaceAt(x, z, S.y + 2); S.rest = false;
  }
}
// zmiana miejsca po dołączeniu: twoje auta, samolot i okręt (gdy jeszcze nieruszone) na twoje miejsce
function netReslot(from, to) {
  fleetReslot(from, to);
  if (air.sim && air.spawn && air.sim.state.onGround && Math.hypot(air.sim.state.p[0] - air.spawn.x, air.sim.state.p[2] - air.spawn.z) < 1 && mode !== 'air') { air.spawn = airSlotPoint(to); airReset(); }
  if (boat.sim && boat.spawn && Math.hypot(boat.sim.state.x - boat.spawn.x, boat.sim.state.z - boat.spawn.z) < 1 && mode !== 'boat') { boat.spawn = boatSlotPoint(to); boatReset(); }
}

/* ---------- zombie: gospodarz prowadzi i rozsyła, pozostali pokazują ---------- */
function netZombiesSend() {
  const list = [];
  for (const z of ZB.list) { if (z.dead) continue; if (!z.nid) z.nid = NET.zSeq++; const [gx, gz] = l2g(z.x, z.z); list.push([z.nid, Math.round(gx * 10) / 10, Math.round(gz * 10) / 10, +z.th.toFixed(2), +(z.go || 0).toFixed(2), +(z.atk || 0).toFixed(2)]); }
  netSend('*', { t: 'zb', list });
}
function netZombies(d) {
  const seen = new Set();
  for (const [id, gx, gz, th, go, atk] of d.list) {
    seen.add(id); let z = NET.zmap.get(id);
    const [x, zz] = g2l(gx, gz);
    if (!z) { const c = ZB.pool.pop() || zBuild(); if (!c) continue; c.group.visible = true; c.group.rotation.set(0, 0, 0); z = { c, nid: id, x, z: zz, y: H(x, zz), th, hp: 2, atk: 0, t0: Math.random() * 10, net: true }; NET.zmap.set(id, z); ZB.list.push(z); }
    z.tx = x; z.tz = zz; z.tth = th; z.go = go; z.tatk = atk;
  }
  for (const [id, z] of NET.zmap) if (!seen.has(id) && !z.dead) { zFree(z); ZB.list.splice(ZB.list.indexOf(z), 1); NET.zmap.delete(id); }
}
// u gracza (nie gospodarza): zombie z sieci płynnie do celu, animacja; przejechanie — do gospodarza
function netZombiesStep(dt) {
  const S = egoShape();
  for (const z of ZB.list) {
    if (z.dead) { if (z.fall < 1) { z.fall = Math.min(1, z.fall + dt / 0.6); const k = z.fall * z.fall; z.c.group.rotation.set(-Math.PI / 2 * k, z.th, 0, 'YXZ'); z.c.group.position.y = z.y + 0.12 * k; } continue; }
    if (z.tx == null) continue;
    const k = Math.min(1, 8 * dt); z.x += (z.tx - z.x) * k; z.z += (z.tz - z.z) * k; z.th = lerpA(z.th, z.tth, k); z.atk += ((z.tatk || 0) - z.atk) * k;
    z.y = surfaceAt(z.x, z.z, z.y + 0.8, true);
    if (S.v > 2.5 && !S.air && capDist(S, z.x, z.z) < 0.35) { netSend(NET.hostId, { t: 'kill', id: z.nid, dir: S.th, cr: 1 }); zKill(z, S.th, true, true); continue; }
    z.c.group.position.set(z.x, z.y, z.z); z.c.group.rotation.set(0, z.th, 0);
    z.c.animate(carT + z.t0, dt, { gait: z.go > 0.05 ? (z.go > 1.9 ? 'run' : 'walk') : 'idle', speed: Math.max(0.4, z.go || 0), layers: { zombie: 1, attack: z.atk } });
  }
}
// gracze (u gospodarza) jako cele zombie: ja i inni, w moim układzie
function netTargets() {
  const T = [egoShape()];
  if (NET.on && NET.host) for (const p of NET.players.values()) {
    const d = netSample(p); if (!d) continue; const [x, z] = g2l(d.p[0], d.p[1]);
    const v = d.k === 'foot' ? null : baseId(d.v), big = { urbino18: [7.5, 1.3], abrams: [3.2, 1.9], polonez: [1.4, 0.9], train: [7, 1.4], tram: [7, 1.4], air: [4, 3], boat: [55, 6] }[v] || [0, 0.4];
    T.push({ x, z, th: d.th, hl: big[0], r: big[1], v: Math.abs(d.sp || 0), air: v === 'air' && d.vs && d.vs.agl > 2, water: v === 'boat', remote: true });
  }
  return T;
}

/* ---------- efekty u innych: smugacze i wybuchy ---------- */
function netFx(type, a, b, r) {
  if (!NET.on) return;
  const ga = l2g(a.x, a.z), d = { t: 'fx', ty: type, a: [ga[0], a.y, ga[1]] };
  if (b) { const gb = l2g(b.x, b.z); d.b = [gb[0], b.y, gb[1]]; }
  if (r) d.r = r;
  if (NET.host) netRelay(NET.me, d); else netSend(NET.hostId, d);
}
function netFxShow(d) {
  const [ax, az] = g2l(d.a[0], d.a[2]), A = new THREE.Vector3(ax, d.a[1], az);
  if (d.ty === 'tr' && d.b) { const [bx, bz] = g2l(d.b[0], d.b[2]); tracer(A, new THREE.Vector3(bx, d.b[1], bz), 0xffc070); }
  if (d.ty === 'boom') boom(ax, Math.max(d.a[1], H(ax, az)), az, d.r || 6, true);
}

/* ---------- inni gracze na mapach (minimapa, duża mapa): położenie, kierunek, imię, kolor ---------- */
const NET_COL = ['#4fc3f7', '#81c784', '#ffb74d', '#ce93d8'];
function netMapPoints() {
  const out = []; if (!NET.on) return out; let i = 0;
  for (const p of NET.players.values()) {
    const d = netSample(p), col = NET_COL[i++ % NET_COL.length]; if (!d) continue;
    const [x, z] = g2l(d.p[0], d.p[1]); out.push({ x, z, th: d.th, name: p.name || 'Gracz', col });
  }
  return out;
}
// strzałka gracza na płótnie (środek, kąt jak strzałka gracza na mapie)
function netArrow(g, x, y, rot, col, name, sc = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -11 * sc); g.lineTo(7 * sc, 8 * sc); g.lineTo(0, 4 * sc); g.lineTo(-7 * sc, 8 * sc); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.font = `600 ${Math.round(12 * sc)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#000b'; g.strokeText(name, x, y - 18 * sc); g.fillStyle = col; g.fillText(name, x, y - 18 * sc);
}
/* ---------- co klatkę ---------- */
function netStep(dt) {
  if (!NET.on || !started) return;
  // wsiadanie i wysiadanie: zgłoszenie do gospodarza (pierwszy w pojeździe — kierowca, kolejni — pasażerowie)
  const v = myVeh(); if (v !== NET.vcur) { if (NET.vcur) netClaim(NET.vcur, 'leave'); if (v) netClaim(v, 'enter'); NET.vcur = v; }
  if ((NET.sendT += dt) >= NET.RATE) { NET.sendT = 0; const d = netMyState(); if (NET.host) NET.tr.send('*', d); else NET.tr.send(NET.hostId, d); }
  if (NET.host && (NET.zbT += dt) >= 0.1) { NET.zbT = 0; netZombiesSend(); }
  if ((NET.vpT += dt) >= 0.5) { NET.vpT = 0; netPosesSend(); }
  if ((NET.setT += dt) >= 1) { NET.setT = 0; netSets(); }
  netShowPlayers(dt);
}
function netHud() {
  const el = $('netHud'); if (!el) return;
  if (!NET.on) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const occ = (id) => { for (const v in NET.occ) { const o = NET.occ[v]; if (o.d === id) return ' · prowadzi'; if (o.p.includes(id)) return ' · pasażer'; } return ''; };
  el.innerHTML = `<b>Pokój ${NET.code}</b>${NET.host ? ' (gospodarz)' : ''}<br>` + [{ id: NET.me, name: NET.name + ' (ty)' }, ...NET.players.values()].map((p) => `${p.name}${occ(p.id)}`).join('<br>');
}

/* ---------- ekran startowy: utwórz pokój / dołącz ---------- */
function netUI() {
  const nm = $('mpName'); try { nm.value = localStorage.getItem('w3d.name') || ''; } catch { }
  const go = async (host) => {
    const name = nm.value.trim().slice(0, 16) || (host ? 'Gospodarz' : 'Gracz'); try { localStorage.setItem('w3d.name', name); } catch { }
    const code = host ? null : $('mpCode').value.trim(); if (!host && !code) { $('mpStatus').textContent = 'Wpisz kod pokoju'; return; }
    $('mpStatus').textContent = host ? 'Tworzę pokój…' : 'Łączę…'; $('mpHost').disabled = $('mpJoin').disabled = true;
    try { const c = await netStart(host, code, name); $('mpStatus').innerHTML = host ? `Pokój <b>${c}</b> — podaj kod znajomym (2–4 osoby)` + (started ? '' : ', potem wybierz tryb') : `Pokój <b>${c}</b>` + (started ? '' : ' — wybierz tryb'); netHud(); }
    catch (e) { $('mpStatus').textContent = 'Nie udało się: ' + e.message; $('mpHost').disabled = $('mpJoin').disabled = false; }
  };
  $('mpHost').onclick = () => go(true); $('mpJoin').onclick = () => go(false);
}
