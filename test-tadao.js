// Recherche d'arrêts : node test-tadao.js (sans Electron : on ne teste que le classement)
const Module = require('module'), orig = Module._load; Module._load = function (r, ...a) { if (r === 'electron') return { app: {}, ipcMain: {}, dialog: {}, shell: {} }; return orig.call(this, r, ...a); };
const { tadaoRank, routeSearch } = require('./main.js');
const S = ['Gare de Lens|Lens', 'Gare|Liévin', 'Saint-Paul|Lens', 'Médiathèque|Lens', 'Bellevue|Loison-sous-Lens', 'Gare 2|Loison-sous-Lens', "Stade Léo Lagrange|Lens", 'Rue Léon Duhamel|Liévin', 'Hôtel de Ville|Hénin-Beaumont'].map(x => { const [name, town] = x.split('|'); return { name, town, key: name + town, ids: [1] }; });
const first = q => tadaoRank(S, q)[0]?.name, has = (q, n) => tadaoRank(S, q).some(s => s.name === n);
const checks = [
  ['gare lens', first('gare lens') === 'Gare de Lens'], ['lens gare (autre ordre)', first('lens gare') === 'Gare de Lens'], ['st paul', first('st paul') === 'Saint-Paul'],
  ['mediatheque (sans accent)', first('mediatheque') === 'Médiathèque'], ['belevue (faute)', first('belevue') === 'Bellevue'], ['mediatheuqe (lettres échangées)', has('mediatheuqe', 'Médiathèque')],
  ['regex ga.*lens', has('ga.*lens', 'Gare de Lens')], ['regex ^gare', has('^gare', 'Gare')], ['stade lagrange (mot manquant au milieu)', first('stade lagrange') === 'Stade Léo Lagrange'],
  ['hotel ville', first('hotel ville') === 'Hôtel de Ville'], ['duhamel', first('duhamel') === 'Rue Léon Duhamel'], ['rien ne correspond', tadaoRank(S, 'zzzzqq').length === 0], ['regex invalide ne plante pas', Array.isArray(tadaoRank(S, '[gare'))],
];
// l'itinéraire, sur un petit réseau : L3 va directement de A à B (8:05 → 8:40), L1 puis L2 avec une correspondance à X (8:00 → 8:25)
const G = { stops: new Map([['a', { name: 'A', key: 'A' }], ['x', { name: 'X', key: 'X' }], ['b', { name: 'B', key: 'B' }], ['c', { name: 'C', key: 'C' }]]),
  groups: new Map(['A', 'X', 'B', 'C'].map(k => [k, { key: k, name: k, town: 'Lens', ids: [k.toLowerCase()] }])), routes: new Map(['L1', 'L2', 'L3'].map(r => [r, { name: r }])),
  trips: new Map([['T1', { route: 'L1', service: 'S', headsign: 'C' }], ['T2', { route: 'L2', service: 'S', headsign: 'B' }], ['T3', { route: 'L3', service: 'S', headsign: 'B' }], ['T4', { route: 'L3', service: 'S', headsign: 'B' }]]),
  byTrip: new Map([['T1', [[1, 'a', 28800], [2, 'x', 29400], [3, 'c', 30000]]], ['T2', [[1, 'x', 29700], [2, 'b', 30300]]], ['T3', [[1, 'a', 29100], [2, 'b', 31200]]], ['T4', [[1, 'a', 27000], [2, 'b', 27600]]]]),
  cal: new Map([['S', { monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '1', sunday: '1', start_date: '20200101', end_date: '20991231' }]]), dates: new Map() };
G.byStop = new Map(); for (const [trip, l] of G.byTrip) for (const [seq, stop, t] of l) { if (!G.byStop.has(stop)) G.byStop.set(stop, []); G.byStop.get(stop).push([trip, t, seq]); }
const R = routeSearch(G, 'A', 'B', new Date(2026, 10, 16, 7, 55).getTime()), sig = R.options.map(o => o.legs.map(l => l.route.name).join('+') + '@' + o.dep + '-' + o.arr).join(' ');
checks.push(['itinéraire : correspondance puis direct (' + sig + ')', sig === 'L1+L2@28800-30300 L3@29100-31200'], ['itinéraire : le bus déjà parti est ignoré', !/27000/.test(sig)], ['itinéraire : arrêt inconnu refusé', (() => { try { routeSearch(G, 'A', 'Z'); return false; } catch { return true; } })()]);
let bad = 0; for (const [n, ok] of checks) { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + n); if (!ok) bad++; }
console.log(bad ? bad + ' échec(s)' : checks.length + ' vérifications ok'); process.exit(bad ? 1 : 0);
