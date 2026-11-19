// Transports : le moteur des horaires, le même sur PC (chargé par main.js) et sur téléphone (recopié dans index.js de la version -phone).
// N'importe quel réseau du catalogue national transport.data.gouv.fr : horaires GTFS (retéléchargés chaque semaine) et temps réel GTFS-RT
// (retards, trajets supprimés, arrêts non desservis, positions des véhicules, alertes du réseau). Rien ici ne dépend de Node ni du navigateur :
// le téléchargement, la décompression et le cache passent par « io », donné par main.js (PC) ou par le plugin (téléphone).
// io = { fetchBin(url) -> Uint8Array, fetchText(url) -> texte, inflate(Uint8Array) -> Uint8Array, cacheGet(nom) -> texte|null,
//        cacheSet(nom, texte), cacheAge(nom) -> ms, toast(texte), maxTrips, phone } ; chaque fonction peut rendre une promesse
function tpEngine(io) {
  const CATALOG = 'https://transport.data.gouv.fr/api/datasets', WEEK = 7 * 864e5;
  const GTFS_FILES = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt', 'calendar_dates.txt'];
  const csv = (text, onRow) => {  // ligne d'en-tête puis les lignes, guillemets compris
    const lines = (text || '').replace(/^﻿/, '').split(/\r?\n/), head = lines[0].split(',').map(h => h.trim());
    const cell = l => { if (!l.includes('"')) return l.split(','); const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === ',' && !q) { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o; };
    for (let i = 1; i < lines.length; i++) if (lines[i]) { const v = cell(lines[i]), r = {}; head.forEach((h, k) => r[h] = v[k]); onRow(r); }
  };
  const secs = t => { const [h, m, s] = (t || '').trim().split(':').map(Number); return h * 3600 + m * 60 + (s || 0); };
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  // ---------- l'archive .zip des horaires (rangée telle quelle ou compressée « deflate », ZIP64 compris) ----------
  async function unzipText(u8, names) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), out = {};
    let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('ce réseau ne donne pas ses horaires en fichier GTFS lisible');
    let p = dv.getUint32(e + 16, true), n = dv.getUint16(e + 10, true);
    if (p === 0xFFFFFFFF || n === 0xFFFF) {  // ZIP64 : la fin du répertoire est dans un second enregistrement
      const loc = e - 20; if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) { const z = Number(dv.getBigUint64(loc + 8, true)); n = Number(dv.getBigUint64(z + 32, true)); p = Number(dv.getBigUint64(z + 48, true)); }
    }
    for (; n > 0; n--) {
      const method = dv.getUint16(p + 10, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), F = 0xFFFFFFFF;
      let usize = dv.getUint32(p + 24, true), size = dv.getUint32(p + 20, true), off = dv.getUint32(p + 42, true);
      for (let x = p + 46 + nl; x + 4 <= p + 46 + nl + xl; x += 4 + dv.getUint16(x + 2, true)) if (dv.getUint16(x, true) === 1) {
        let q = x + 4; const big = () => { const v = Number(dv.getBigUint64(q, true)); q += 8; return v; };
        if (usize === F) usize = big(); if (size === F) size = big(); if (off === F) off = big();
      }
      const base = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)).split('/').pop();
      p += 46 + nl + xl + dv.getUint16(p + 32, true);
      if (!names.includes(base)) continue;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = u8.subarray(start, start + size);
      if (method !== 0 && method !== 8) throw new Error('archive des horaires illisible (compression inconnue)');
      out[base] = new TextDecoder().decode(method === 0 ? raw : await io.inflate(raw));
    }
    return out;
  }

  // ---------- les horaires d'un réseau ----------
  function parseGtfs(t) {
    const g = { stops: new Map(), groups: new Map(), routes: new Map(), trips: new Map(), cal: new Map(), dates: new Map() };
    // la ville : après le code postal de la description (« 220 Avenue Pablo Neruda 62138 Auchy-les-Mines », « 59000 LILLE - AU DROIT DU N° 37 »)
    const townOf = d => { const m = /\b\d{5}\s+([^,\-–]+(?:-[^\s,\-–]+)*)/.exec(d || ''); if (!m) return ''; const s = m[1].trim(); return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, c => c.toUpperCase()) : s; };
    const parents = new Map(); csv(t['stops.txt'], r => { if (r.location_type === '1') parents.set(r.stop_id, r); });
    csv(t['stops.txt'], r => {
      if (r.location_type && r.location_type !== '0') return;
      // les quais d'un pôle (« Béhal-Jean Zay - Quai 4 », ou les points d'arrêt d'une même gare) sont un seul arrêt pour le voyageur
      const par = parents.get(r.parent_station), name = (par?.stop_name || r.stop_name || '').replace(/\s*-\s*Quai\s*\w+\s*$/i, '').trim();
      const town = townOf(par?.stop_desc) || townOf(r.stop_desc), key = norm(name) + '|' + norm(town);
      g.stops.set(r.stop_id, { name, quay: r.stop_name, town, key, lat: +r.stop_lat, lon: +r.stop_lon });
      if (!g.groups.has(key)) g.groups.set(key, { key, name, town, ids: [], lat: +r.stop_lat, lon: +r.stop_lon });
      g.groups.get(key).ids.push(r.stop_id);
    });
    csv(t['routes.txt'], r => g.routes.set(r.route_id, { id: r.route_id, name: r.route_short_name || r.route_long_name, long: r.route_long_name, color: '#' + (r.route_color || '8a5cf0'), text: '#' + (r.route_text_color || 'ffffff'), type: +r.route_type }));
    csv(t['trips.txt'], r => g.trips.set(r.trip_id, { route: r.route_id, service: r.service_id, headsign: r.trip_headsign || '' }));
    // les passages (plus d'un million de lignes à Lille) en tableaux de nombres : trajets et arrêts numérotés, trois nombres par passage.
    // byStop.get(arrêt) -> [[trajet, heure, rang]] et byTrip.get(trajet) -> [[rang, arrêt, heure]] les redonnent à la demande
    const tripIds = [...g.trips.keys()], tripIx = new Map(tripIds.map((id, i) => [id, i])), stopIds = [...g.stops.keys()], stopIx = new Map(stopIds.map((id, i) => [id, i]));
    const bs = new Array(stopIds.length), bt = new Array(tripIds.length);
    csv(t['stop_times.txt'], r => {
      const t = secs(r.departure_time || r.arrival_time), seq = +r.stop_sequence, ti = tripIx.get(r.trip_id), si = stopIx.get(r.stop_id);
      if (isNaN(t) || ti === undefined || si === undefined) return;
      (bs[si] ||= []).push(ti, t, seq); (bt[ti] ||= []).push(seq, si, t);
    });
    for (let i = 0; i < bt.length; i++) { const a = bt[i]; if (!a) continue; const l = []; for (let k = 0; k < a.length; k += 3) l.push([a[k], a[k + 1], a[k + 2]]); l.sort((x, y) => x[0] - y[0]); bt[i] = l.flat(); }
    g.byStop = { get: id => { const a = bs[stopIx.get(id)]; if (!a) return undefined; const o = []; for (let k = 0; k < a.length; k += 3) o.push([tripIds[a[k]], a[k + 1], a[k + 2]]); return o; } };
    g.byTrip = { get: id => { const a = bt[tripIx.get(id)]; if (!a) return undefined; const o = []; for (let k = 0; k < a.length; k += 3) o.push([a[k], stopIds[a[k + 1]], a[k + 2]]); return o; } };
    tripIds.forEach((id, i) => { const tr = g.trips.get(id), a = bt[i]; if (!tr.headsign && a) tr.headsign = g.stops.get(stopIds[a[a.length - 2]])?.name || ''; });  // pas de direction : le terminus
    csv(t['calendar.txt'], r => g.cal.set(r.service_id, r));
    csv(t['calendar_dates.txt'], r => { if (!g.dates.has(r.date)) g.dates.set(r.date, new Map()); g.dates.get(r.date).set(r.service_id, r.exception_type); });
    for (const grp of g.groups.values()) { grp.routes = new Set(); for (const id of grp.ids) { const a = bs[stopIx.get(id)] || []; for (let k = 0; k < a.length; k += 3) grp.routes.add(g.trips.get(tripIds[a[k]]).route); } }
    return g;
  }
  const ymdC = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  function running(g, service, day) {  // calendrier + exceptions (1 = ajouté, 2 = retiré ce jour-là)
    const ex = g.dates.get(ymdC(day))?.get(service);
    if (ex === '1') return true; if (ex === '2') return false;
    const c = g.cal.get(service); if (!c) return false;
    const d = ymdC(day), wd = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day.getDay()];
    return c[wd] === '1' && d >= c.start_date && d <= c.end_date;
  }

  // ---------- le temps réel GTFS-RT (protobuf) : positions, retards, suppressions, alertes ----------
  function fields(buf, start = 0, end = buf.length) {  // -> [[numéro, type, valeur]]
    const out = [], dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); let i = start;
    const varint = () => { let v = 0, m = 1, b; do { b = buf[i++]; v += (b & 0x7f) * m; m *= 128; } while (b & 0x80); return v; };
    while (i < end) {
      const key = varint(), f = Math.floor(key / 8), w = key & 7;
      if (w === 0) out.push([f, 0, varint()]);
      else if (w === 1) { out.push([f, 1, dv.getFloat64(i, true)]); i += 8; }
      else if (w === 2) { const n = varint(); out.push([f, 2, [i, i + n]]); i += n; }
      else if (w === 5) { out.push([f, 5, dv.getFloat32(i, true)]); i += 4; }
      else throw new Error('protobuf : type ' + w);
    }
    return out;
  }
  const msg = (buf, [a, b]) => fields(buf, a, b), str = (buf, [a, b]) => new TextDecoder().decode(buf.subarray(a, b));
  const get = (fs, n) => fs.find(x => x[0] === n)?.[2], all = (fs, n) => fs.filter(x => x[0] === n).map(x => x[2]);
  const signed = v => v > 0x7fffffff ? v - 0x100000000 : v;
  const tripOf = (buf, r) => { const t = msg(buf, r); return { tripId: get(t, 1) && str(buf, get(t, 1)), routeId: get(t, 5) && str(buf, get(t, 5)), rel: get(t, 4) || 0 }; };
  const text = (buf, r) => { if (!r) return ''; const tr = all(msg(buf, r), 1).map(x => { const m = msg(buf, x); return { t: get(m, 1) ? str(buf, get(m, 1)) : '', l: get(m, 2) ? str(buf, get(m, 2)) : '' }; }); return (tr.find(x => /^fr/i.test(x.l)) || tr.find(x => !x.l) || tr[0] || {}).t || ''; };
  function decode(buf) {
    const vehicles = [], updates = [], alerts = []; let timestamp = 0;
    for (const [f, , v] of fields(buf)) {
      if (f === 1) timestamp = get(msg(buf, v), 3) || 0;
      if (f !== 2) continue;
      const e = msg(buf, v), id = get(e, 1) ? str(buf, get(e, 1)) : '', vp = get(e, 4), tu = get(e, 3), al = get(e, 5);
      if (vp) {
        const p = msg(buf, vp), pos = get(p, 2) && msg(buf, get(p, 2));
        vehicles.push({ ...(get(p, 1) ? tripOf(buf, get(p, 1)) : {}), lat: pos && get(pos, 1), lon: pos && get(pos, 2), stopId: get(p, 7) && str(buf, get(p, 7)), timestamp: get(p, 5) || 0 });
      }
      if (tu) {
        const u = msg(buf, tu), stops = all(u, 2).map(x => {
          const s = msg(buf, x), ev = n => { const r = get(s, n); if (!r) return null; const m = msg(buf, r); return { delay: get(m, 1) != null ? signed(get(m, 1)) : null, time: get(m, 2) || null }; };
          return { seq: get(s, 1), stopId: get(s, 4) && str(buf, get(s, 4)), arrival: ev(2), departure: ev(3), rel: get(s, 5) || 0 };
        });
        updates.push({ ...(get(u, 1) ? tripOf(buf, get(u, 1)) : {}), delay: get(u, 5) != null ? signed(get(u, 5)) : null, stops });
      }
      if (al) {
        const a = msg(buf, al), ents = all(a, 5).map(x => { const s = msg(buf, x); return { route: get(s, 2) && str(buf, get(s, 2)), stop: get(s, 5) && str(buf, get(s, 5)), trip: get(s, 4) && tripOf(buf, get(s, 4)).tripId }; });
        const per = all(a, 1).map(x => { const m = msg(buf, x); return [get(m, 1) || 0, get(m, 2) || 0]; });
        alerts.push({ id, header: text(buf, get(a, 10)), desc: text(buf, get(a, 11)), effect: get(a, 7) || 0, ents, per });
      }
    }
    return { timestamp, vehicles, updates, alerts };
  }

  // ---------- le catalogue national des réseaux ----------
  let catalog = null;
  async function networks(force) {
    if (catalog && !force) return catalog;
    let txt = await io.cacheGet('catalog.json'); const old = (await io.cacheAge('catalog.json')) > WEEK;
    if (!txt || old || force) {
      try {
        const j = JSON.parse(await io.fetchText(CATALOG));
        const list = j.filter(d => d.type === 'public-transit').map(d => {
          const gt = d.resources.filter(r => r.format === 'GTFS' && r.is_available !== false).sort((a, b) => (a.type === 'main' ? 0 : 1) - (b.type === 'main' ? 0 : 1))[0];
          if (!gt) return null;
          const rt = d.resources.filter(r => r.format === 'gtfs-rt' && r.is_available !== false).map(r => ({ url: r.url, f: (r.features || []).join(',') }));
          const area = (d.covered_area || []).map(a => a.nom).filter(Boolean).slice(0, 4).join(', ');
          return { id: d.id, title: d.title, area, by: d.publisher?.name || '', gtfs: gt.url, rt, trips: gt.metadata?.stats?.trips_count || 0, modes: (gt.modes || gt.metadata?.modes || []).join(','), kind: (d.sub_types || []).join(',') };
        }).filter(Boolean).sort((a, b) => a.title.localeCompare(b.title, 'fr'));
        txt = JSON.stringify(list); await io.cacheSet('catalog.json', txt);
      } catch (e) { if (!txt) throw new Error('catalogue des réseaux indisponible (' + e.message + ')'); }
    }
    return (catalog = JSON.parse(txt));
  }
  // un réseau cherché par son nom, sa ville, sa région ou son exploitant
  function findNetworks(list, q) {
    const w = norm(q).split(' ').filter(Boolean); if (!w.length) return list;
    return list.map(n => { const h = norm(n.title + ' ' + n.area + ' ' + n.by), t = norm(n.title); if (!w.every(x => h.includes(x))) return null; return [w.every(x => t.includes(x)) ? 0 : 1, n]; })
      .filter(Boolean).sort((a, b) => a[0] - b[0] || (b[1].rt.length ? 1 : 0) - (a[1].rt.length ? 1 : 0)).map(x => x[1]);
  }

  // ---------- chaque réseau choisi : ses horaires (chargés à la première question) et son temps réel ----------
  const nets = new Map();  // id -> { def, g, loading, rt: { at, data } }
  const safe = id => String(id).replace(/[^\w-]/g, '');
  async function gtfsTexts(def) {
    const dir = safe(def.id) + '/', at = +((await io.cacheGet(dir + 'gtfs-at')) || 0), kept = {};
    for (const f of GTFS_FILES) kept[f] = await io.cacheGet(dir + f);
    const have = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'].every(f => kept[f] != null);
    if (have && Date.now() - at < WEEK) return kept;
    try {
      if (def.trips > io.maxTrips) throw new Error('réseau trop grand pour ' + (io.phone ? 'le téléphone' : 'NeoDex') + ' (' + def.trips + ' trajets)');
      io.toast?.('Téléchargement des horaires de « ' + def.title + ' » (une fois par semaine)…');
      const t = await unzipText(await io.fetchBin(def.gtfs), GTFS_FILES);
      if (['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'].some(f => t[f] == null)) throw new Error('fichier des horaires incomplet');
      for (const f of GTFS_FILES) await io.cacheSet(dir + f, t[f] || '');
      await io.cacheSet(dir + 'gtfs-at', String(Date.now()));
      return t;
    } catch (e) { if (have) return kept; throw e; }  // pas de réseau : les horaires de la semaine dernière
  }
  function net(def) {
    if (!def || !def.id || !def.gtfs) throw new Error('réseau inconnu');
    let n = nets.get(def.id); if (!n) nets.set(def.id, n = { def, g: null, loading: null, rt: { at: 0, data: null } });
    n.def = def; return n;
  }
  const load = n => n.g ? Promise.resolve(n.g) : (n.loading ??= gtfsTexts(n.def).then(t => {
    const g = parseGtfs(t); if (g.trips.size > io.maxTrips * 1.5) throw new Error('réseau trop grand (' + g.trips.size + ' trajets)'); return (n.g = g);
  }).catch(e => { n.loading = null; throw e; }));
  async function realtime(n) {
    if (!n.def.rt?.length) return null;
    if (Date.now() - n.rt.at < 20000) return n.rt.data;
    const parts = await Promise.all(n.def.rt.slice(0, 4).map(r => io.fetchBin(r.url).then(decode, () => null)));
    const ok = parts.filter(Boolean), data = ok.length ? { timestamp: Math.max(...ok.map(p => p.timestamp)), vehicles: ok.flatMap(p => p.vehicles), updates: ok.flatMap(p => p.updates), alerts: ok.flatMap(p => p.alerts) } : null;
    n.rt = { at: Date.now(), data }; return data;
  }
  // une clé d'arrêt donnée à la page : « réseau~arrêt »
  const split = key => { const i = String(key).indexOf('~'); return i < 0 ? [null, key] : [key.slice(0, i), key.slice(i + 1)]; };
  const defOf = (list, id) => { const d = (list || []).find(n => n.id === id); if (!d) throw new Error('réseau retiré ou inconnu'); return d; };

  // le classement des arrêts pour une saisie : score bas = meilleur résultat, null = ne correspond pas
  const T_STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'et', 'arret', 'station']), T_ALIAS = { st: 'saint', ste: 'sainte' };
  const tWords = s => norm(s).split(' ').filter(Boolean).map(w => T_ALIAS[w] || w);
  function lev1(a, b) {  // vrai si a et b diffèrent d'une seule lettre (ajoutée, retirée, changée ou deux lettres échangées)
    if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
  }
  function rank(stops, q) {
    const n = norm(q || ''); if (!n) return [];
    const scored = [];
    let re = null; if (/[.*+?^$|\[\](){}]/.test(q || '')) { try { re = new RegExp(String(q).normalize('NFD').replace(/[̀-ͯ]/g, ''), 'i'); } catch {} }
    const qw = tWords(q).filter(w => !T_STOP.has(w)); const tokens = qw.length ? qw : tWords(q);
    for (const s of stops) {
      const name = norm(s.name), nameW = tWords(s.name), townW = tWords(s.town), words = nameW.concat(townW);
      let score = null;
      if (re && re.test(norm(s.name + ' ' + s.town) + ' ' + s.name.normalize('NFD').replace(/[̀-ͯ]/g, ''))) score = 0.5;
      else if (name === n) score = 0; else if (name.startsWith(n)) score = 1;
      else {
        let total = 0;
        for (const t of tokens) {
          let best = Infinity;
          words.forEach((w, i) => { const pen = i < nameW.length ? 0 : .5; let c = Infinity; if (w === t) c = 0; else if (w.startsWith(t)) c = 1; else if (w.includes(t)) c = 2; else if (t.length >= 4 && (lev1(w.slice(0, t.length + 1), t) || lev1(w, t))) c = 3; best = Math.min(best, c + pen); });
          if (best === Infinity) { total = null; break; } total += best;
        }
        if (total !== null) score = 2 + total / tokens.length + nameW.length * .01;
      }
      if (score !== null) scored.push([score, s]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name, 'fr')).map(x => x[1]);
  }

  // les alertes du réseau en cours qui touchent ces lignes ou ces arrêts (une alerte sans cible touche tout le réseau)
  function alertsFor(data, routes, stopIds, nowS) {
    if (!data?.alerts?.length) return [];
    const t = nowS ?? Date.now() / 1000;
    return data.alerts.filter(a => (!a.per.length || a.per.some(([s, e]) => (!s || s <= t) && (!e || e >= t))) && (a.header || a.desc)
      && (!a.ents.length || a.ents.some(e => (e.route && routes.has(e.route)) || (e.stop && stopIds.has(e.stop)) || (!e.route && !e.stop && !e.trip))))
      .map(a => ({ id: a.id, header: a.header, desc: a.desc.slice(0, 600), effect: a.effect })).slice(0, 8);
  }
  // le retard du temps réel pour un trajet à un arrêt : celui du dernier arrêt annoncé avant le nôtre (il se reporte sur la suite)
  function rtDelay(u, stops, seq, dayStart) {
    if (!u) return null;
    let best = null;
    for (const s of u.stops) {
      const sq = s.seq ?? stops.find(x => x[1] === s.stopId)?.[0]; if (sq == null || sq > seq) continue;
      const ev = s.departure || s.arrival; if (!ev) continue;
      let d = ev.delay; if (d == null && ev.time) { const sch = stops.find(x => x[0] === sq); if (sch) d = ev.time - (dayStart + sch[2]); }
      if (d != null && (!best || sq >= best[0])) best = [sq, d, s.rel];
    }
    return best ? best[1] : u.delay;
  }
  async function departures(def, key, max = 30, at = Date.now()) {  // at : un autre moment (l'auto-test vérifie un lundi matin)
    const n = net(def), g = await load(n), grp = g.groups.get(key); if (!grp) throw new Error('arrêt inconnu');
    const now = new Date(at), nowS = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds(), out = [];
    const live = await realtime(n), fresh = new Map((live?.vehicles || []).filter(v => v.tripId && (!live.timestamp || live.timestamp - v.timestamp < 600)).map(v => [v.tripId, v]));
    const upd = new Map((live?.updates || []).filter(u => u.tripId).map(u => [u.tripId, u]));
    const today = new Date(now), yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const midnight = d => { const m = new Date(d); m.setHours(0, 0, 0, 0); return m.getTime() / 1000; };
    const ids = new Set(grp.ids);
    for (const id of grp.ids) for (const [tripId, t, seq] of g.byStop.get(id) || []) {
      const trip = g.trips.get(tripId); if (!trip) continue;
      // une heure après 24:00 appartient au service de la veille
      for (const [day, shift] of [[today, 0], [yesterday, 86400]]) {
        const at = t - shift; if (at < nowS - 60 || at > nowS + 3 * 3600 || !running(g, trip.service, day)) continue;
        const stops = g.byTrip.get(tripId), last = stops[stops.length - 1];
        if (last[0] === seq || g.stops.get(last[1])?.key === key) continue;  // finit ici (peut-être à un autre quai du pôle) : personne n'y monte
        const v = fresh.get(tripId), u = upd.get(tripId); let delay = null, away = null, where = '', exact = false;
        const canceled = u?.rel === 3 || u?.rel === 7, skipped = !!u?.stops.some(s => (s.seq === seq || ids.has(s.stopId)) && s.rel === 1);
        const d = rtDelay(u, stops, seq, midnight(day));
        if (d != null) { delay = Math.round(d / 60); exact = true; }
        if (v) {  // où est le véhicule maintenant, et le retard estimé d'après sa position si le réseau ne le donne pas
          const cur = stops.find(s => s[1] === v.stopId);
          if (cur) { away = stops.filter(s => s[0] > cur[0] && s[0] <= seq).length; where = g.stops.get(v.stopId)?.name || ''; if (cur[0] > seq) continue; if (!exact) delay = Math.round(Math.max(-120, nowS - (cur[2] - shift)) / 60); }  // déjà passé
        }
        if (!canceled && at + (delay || 0) * 60 < nowS - 60) continue;
        out.push({ trip: tripId, shift, route: g.routes.get(trip.route), headsign: trip.headsign, time: at, delay, exact, away, where, live: !!v || exact, canceled, skipped, quay: id });
      }
    }
    out.sort((a, b) => (a.time + (a.delay || 0) * 60) - (b.time + (b.delay || 0) * 60));
    const alerts = alertsFor(live, grp.routes, ids);
    return { stop: { name: grp.name, town: grp.town }, now: nowS, departures: out.slice(0, max), liveAt: live?.timestamp || 0, buses: fresh.size, rt: !!def.rt?.length, alerts };
  }

  // itinéraire d'un arrêt à un autre du même réseau, d'après les horaires : les directs, et avec une correspondance (2 min au moins pour changer)
  function routeSearch(g, fromKey, toKey, at = Date.now(), max = 6) {
    const A = g.groups.get(fromKey), B = g.groups.get(toKey); if (!A || !B) throw new Error('arrêt inconnu');
    const now = new Date(at), nowS = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds(), yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const boards = (ids, after, until) => {
      const out = [];
      for (const id of ids) for (const [tripId, t, seq] of g.byStop.get(id) || []) {
        const trip = g.trips.get(tripId); if (!trip) continue;
        for (const [day, shift] of [[now, 0], [yesterday, 86400]]) { const s = t - shift; if (s >= after && s <= until && running(g, trip.service, day)) out.push({ tripId, shift, seq, t: s, id }); }
      }
      return out.sort((a, b) => a.t - b.t);
    };
    const leg = (b, off) => { const trip = g.trips.get(b.tripId); return { route: g.routes.get(trip.route), headsign: trip.headsign, trip: b.tripId, shift: b.shift, from: g.stops.get(b.id)?.name || '', dep: b.t, to: g.stops.get(off[1])?.name || '', arr: off[2] - b.shift }; };
    const inB = new Set(B.ids), res = [], dep = boards(A.ids, nowS - 60, nowS + 3 * 3600), offAt = (b, set) => g.byTrip.get(b.tripId)?.find(s => s[0] > b.seq && set.has(s[1]));
    for (const b of dep) { const off = offAt(b, inB); if (off) res.push([leg(b, off)]); }
    for (const b of dep.slice(0, 25)) {
      for (const s of g.byTrip.get(b.tripId) || []) {
        if (s[0] <= b.seq) continue; const grp = g.groups.get(g.stops.get(s[1])?.key); if (!grp || grp === A || grp === B) continue;
        const arr = s[2] - b.shift;
        for (const b2 of boards(grp.ids, arr + 120, arr + 3600)) { if (b2.tripId === b.tripId) continue; const off = offAt(b2, inB); if (off) { res.push([leg(b, s), leg(b2, off)]); break; } }
      }
    }
    const opts = res.map(legs => ({ legs, dep: legs[0].dep, arr: legs.at(-1).arr })).sort((a, b) => a.arr - b.arr || b.dep - a.dep || a.legs.length - b.legs.length), kept = [];
    for (const o of opts) if (!kept.some(k => k.dep >= o.dep)) kept.push(o);
    return { from: { name: A.name, town: A.town }, to: { name: B.name, town: B.town }, now: nowS, options: kept.slice(0, max) };
  }

  // ---------- ce que la page demande ; « list » : les réseaux choisis ({ id, title, gtfs, rt, trips }) ----------
  async function call(name, ...a) {
    if (name === 'tp:networks') return findNetworks(await networks(a[1]), a[0] || '').slice(0, 60);
    if (name === 'tp:search') {  // dans tous les réseaux choisis ; un réseau qui ne se charge pas est signalé sans gêner les autres
      const [q, list] = a, out = [], errs = [];
      await Promise.all((list || []).map(async def => { try { const g = await load(net(def)); for (const s of rank([...g.groups.values()], q).slice(0, 20)) out.push({ key: def.id + '~' + s.key, name: s.name, town: s.town, quays: s.ids.length, net: def.id, netTitle: def.title, _r: out.length }); } catch (e) { errs.push(def.title + ' : ' + e.message); } }));
      if (!out.length && errs.length) throw new Error(errs.join(' · '));
      const n = norm(q); return out.sort((x, y) => (norm(x.name) === n ? 0 : 1) - (norm(y.name) === n ? 0 : 1)).slice(0, 30).map(({ _r, ...s }) => s);
    }
    if (name === 'tp:next') { const [key, list, at] = a, [id, k] = split(key); return departures(defOf(list, id), k, 30, typeof at === 'number' ? at : Date.now()); }
    if (name === 'tp:trip') { const [id, tripId, list] = a, g = await load(net(defOf(list, id))); return (g.byTrip.get(tripId) || []).map(([, stop, time]) => ({ name: g.stops.get(stop)?.name || '', time })); }
    if (name === 'tp:route') {
      const [ka, kb, list, at] = a, [ia, sa] = split(ka), [ib, sb] = split(kb);
      if (ia !== ib) throw new Error('les deux arrêts doivent être sur le même réseau');
      return routeSearch(await load(net(defOf(list, ia))), sa, sb, typeof at === 'number' ? at : Date.now());
    }
    throw new Error('inconnu : ' + name);
  }
  return { call, parseGtfs, decode, unzipText, rank, routeSearch, departures, findNetworks, alertsFor, rtDelay, csv };
}
if (typeof module !== 'undefined') module.exports = tpEngine;
