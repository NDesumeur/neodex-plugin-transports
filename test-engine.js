// Le moteur des horaires, sans Electron ni réseau : node test-engine.js
// recherche d'arrêts, itinéraire, horaires lus dans un vrai .zip, temps réel (retard, suppression, arrêt non desservi, alerte), choix d'un réseau
const zlib = require('zlib'), tpEngine = require('./engine.js');
const files = {}, E = tpEngine({ fetchBin: async () => { throw new Error('pas de réseau'); }, fetchText: async () => { throw new Error('pas de réseau'); }, inflate: async u => new Uint8Array(zlib.inflateRawSync(u)),
  cacheGet: n => files[n] ?? null, cacheSet: (n, t) => { files[n] = t; }, cacheAge: n => n in files ? 0 : Infinity, maxTrips: 1000 });
const checks = [], ok = (n, c) => checks.push([n, !!c]);

// 1. recherche d'arrêts
const S = ['Gare de Lens|Lens', 'Gare|Liévin', 'Saint-Paul|Lens', 'Médiathèque|Lens', 'Bellevue|Loison-sous-Lens', 'Gare 2|Loison-sous-Lens', 'Stade Léo Lagrange|Lens', 'Rue Léon Duhamel|Liévin', 'Hôtel de Ville|Hénin-Beaumont'].map(x => { const [name, town] = x.split('|'); return { name, town, key: name + town, ids: [1] }; });
const first = q => E.rank(S, q)[0]?.name, has = (q, n) => E.rank(S, q).some(s => s.name === n);
ok('gare lens', first('gare lens') === 'Gare de Lens'); ok('lens gare (autre ordre)', first('lens gare') === 'Gare de Lens'); ok('st paul', first('st paul') === 'Saint-Paul');
ok('mediatheque (sans accent)', first('mediatheque') === 'Médiathèque'); ok('belevue (faute)', first('belevue') === 'Bellevue'); ok('mediatheuqe (lettres échangées)', has('mediatheuqe', 'Médiathèque'));
ok('regex ga.*lens', has('ga.*lens', 'Gare de Lens')); ok('stade lagrange', first('stade lagrange') === 'Stade Léo Lagrange'); ok('rien ne correspond', E.rank(S, 'zzzzqq').length === 0); ok('regex invalide ne plante pas', Array.isArray(E.rank(S, '[gare')));

// 2. un petit réseau dans un vrai .zip (compressé), lu par le moteur : L3 va de A à B en direct, L1 puis L2 avec une correspondance à X
const day = new Date(2026, 10, 16, 7, 55), ymd = '20261116';
const T = {
  'stops.txt': 'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\na1,A - Quai 1,50,2,0,\na2,A - Quai 2,50,2,0,\nx,X,50,2,0,\nb,B,50,2,0,\nc,C,50,2,0,\nP,Gare,50,2,1,\ng1,Gare voie 1,50,2,0,P\ng2,Gare voie 2,50,2,0,P',
  'routes.txt': 'route_id,route_short_name,route_long_name,route_color,route_type\nL1,1,,ff0000,3\nL2,2,,00ff00,3\nL3,3,,0000ff,3',
  'trips.txt': 'route_id,service_id,trip_id,trip_headsign\nL1,S,T1,C\nL2,S,T2,B\nL3,S,T3,B\nL3,S,T4,\nL3,S,T5,B',
  'stop_times.txt': 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,08:00:00,08:00:00,a1,1\nT1,08:10:00,08:10:00,x,2\nT1,08:20:00,08:20:00,c,3\nT2,08:15:00,08:15:00,x,1\nT2,08:25:00,08:25:00,b,2\nT3,08:05:00,08:05:00,a2,1\nT3,08:40:00,08:40:00,b,2\nT4,07:30:00,07:30:00,a1,1\nT4,07:40:00,07:40:00,g1,2\nT5,08:30:00,08:30:00,a1,1\nT5,08:50:00,08:50:00,g2,2\nT5,09:00:00,09:00:00,b,3',
  'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS,1,1,1,1,1,1,1,20200101,20991231',
};
function zip(entries) {  // un .zip minimal (deflate), comme ceux des réseaux
  const loc = [], cen = []; let off = 0;
  for (const [name, text] of Object.entries(entries)) {
    const data = zlib.deflateRawSync(Buffer.from(text)), n = Buffer.from(name), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(text.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(Buffer.byteLength(text), 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    loc.push(h, n, data); cen.push(c, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(cen), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(cen.length / 2, 8); end.writeUInt16LE(cen.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...loc, cd, end]));
}
// 3. un flux GTFS-RT encodé à la main : T3 en retard de 4 min, T1 supprimé, T5 ne s'arrête pas à A, une alerte sur la ligne 3
const vint = n => { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n) b |= 128; o.push(b); } while (n); return o; };
const f = (no, w, v) => w === 0 ? [...vint(no * 8), ...vint(v)] : [...vint(no * 8 + 2), ...vint(v.length), ...v];
const s = t => [...Buffer.from(t)], tr = (t) => f(1, 2, [...f(1, 2, s(t))]);
const zz = n => n < 0 ? 0x100000000 + n : n;  // int32 négatif
const tu = (trip, extra) => f(3, 2, [...f(1, 2, [...f(1, 2, s(trip)), ...(extra.rel ? f(4, 0, extra.rel) : [])]), ...(extra.stops || [])]);
const stu = (seq, delay, rel) => f(2, 2, [...f(1, 0, seq), ...(delay != null ? f(3, 2, f(1, 0, zz(delay))) : []), ...(rel ? f(5, 0, rel) : [])]);
const trs = t => f(1, 2, f(1, 2, s(t)));
const feed = new Uint8Array([...f(1, 2, f(3, 0, Math.floor(day / 1000))),
  ...f(2, 2, [...f(1, 2, s('e1')), ...tu('T3', { stops: stu(1, 240) })]),
  ...f(2, 2, [...f(1, 2, s('e2')), ...tu('T1', { rel: 3 })]),
  ...f(2, 2, [...f(1, 2, s('e3')), ...tu('T5', { stops: stu(1, null, 1) })]),
  ...f(2, 2, [...f(1, 2, s('e4')), ...f(5, 2, [...f(5, 2, f(2, 2, s('L3'))), ...f(10, 2, trs('Travaux rue X')), ...f(11, 2, trs('La ligne 3 est déviée.'))])])]);
const D = E.decode(feed);
ok('temps réel : 3 trajets et 1 alerte lus', D.updates.length === 3 && D.alerts.length === 1 && D.alerts[0].header === 'Travaux rue X' && D.alerts[0].ents[0].route === 'L3');
ok('temps réel : suppression et arrêt non desservi', D.updates[1].rel === 3 && D.updates[2].stops[0].rel === 1 && D.updates[0].stops[0].departure.delay === 240);

(async () => {
  const net = { id: 'demo', title: 'Démo', gtfs: 'https://exemple/gtfs.zip', rt: [{ url: 'https://exemple/rt' }], trips: 5 };
  const zipped = zip(T), E2 = tpEngine({ fetchBin: async u => u.endsWith('.zip') ? zipped : feed, fetchText: async () => '[]', inflate: async u => new Uint8Array(zlib.inflateRawSync(u)),
    cacheGet: n => files[n] ?? null, cacheSet: (n, t) => { files[n] = t; }, cacheAge: n => n in files ? 0 : Infinity, maxTrips: 1000 });
  const found = await E2.call('tp:search', 'gare', [net]);
  ok('zip lu, quais d\'une gare réunis (' + found.map(x => x.name + ':' + x.quays).join() + ')', found[0]?.name === 'Gare' && found[0].quays === 2 && found[0].key === 'demo~gare|');
  ok('quais « A - Quai 1/2 » réunis', (await E2.call('tp:search', 'A', [net]))[0]?.quays === 2);
  const R = await E2.call('tp:route', 'demo~a|', 'demo~b|', [net], day.getTime()), sig = R.options.map(o => o.legs.map(l => l.route.name).join('+') + '@' + o.dep + '-' + o.arr).join(' ');
  ok('itinéraire : correspondance puis direct (' + sig + ')', sig === '1+2@28800-30300 3@29100-31200 3@30600-32400');
  ok('itinéraire : deux réseaux refusés', await E2.call('tp:route', 'demo~a|', 'autre~b|', [net]).then(() => false, () => true));
  const N = await E2.call('tp:next', 'demo~a|', [net], day.getTime()), by = id => N.departures.find(d => d.trip === id);
  ok('passages : T1 supprimé', by('T1')?.canceled === true);
  ok('passages : T3 avec 4 min de retard exact', by('T3')?.delay === 4 && by('T3').exact);
  ok('passages : T5 ne dessert pas cet arrêt', by('T5')?.skipped === true);
  ok('passages : T4 déjà parti (7:30) absent', !by('T4'));
  ok('direction tirée du terminus quand elle manque', E.parseGtfs(T).trips.get('T4').headsign === 'Gare');
  ok('passages : l\'alerte de la ligne 3', N.alerts.length === 1 && /déviée/.test(N.alerts[0].desc));
  ok('trajet : les arrêts de T3', (await E2.call('tp:trip', 'demo', 'T3', [net])).map(x => x.name).join() === 'A,B');
  // 4. choisir un réseau dans le catalogue national
  const cat = [{ title: 'Réseau urbain ilévia', area: 'Métropole Européenne de Lille', by: 'MEL', rt: [1] }, { title: 'Trains régionaux Hauts-de-France mobilités', area: 'Hauts-de-France', by: 'Région', rt: [] }, { title: 'Réseau urbain TADAO', area: 'CA de Lens - Liévin', by: 'TADAO', rt: [1] }];
  ok('catalogue : « lille » trouve Ilévia', E.findNetworks(cat, 'lille')[0]?.title === 'Réseau urbain ilévia');
  ok('catalogue : « hauts de france » trouve les TER', E.findNetworks(cat, 'hauts de france')[0]?.title.startsWith('Trains'));
  ok('catalogue : « lens » trouve Tadao', E.findNetworks(cat, 'lens')[0]?.title === 'Réseau urbain TADAO');
  ok('réseau trop grand refusé', await tpEngine({ fetchBin: async () => zipped, inflate: async u => new Uint8Array(zlib.inflateRawSync(u)), cacheGet: () => null, cacheSet() {}, cacheAge: () => Infinity, maxTrips: 10 })
    .call('tp:search', 'gare', [{ ...net, id: 'gros', trips: 500000 }]).then(() => false, e => /trop grand/.test(e.message)));
  let bad = 0; for (const [n, c] of checks) { console.log((c ? 'ok     ' : 'ÉCHEC  ') + n); if (!c) bad++; }
  console.log(bad ? bad + ' échec(s)' : checks.length + ' vérifications ok'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
