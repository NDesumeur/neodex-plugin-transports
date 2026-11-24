// lancé par le test « local » de NeoDex, sans réseau : un itinéraire (direct et avec correspondance) et le plan d'une ligne avec le bus entre deux arrêts ; rien ne déborde
module.exports = async ({ pj, sleep }) => {
  await sleep(1000);
  const L1 = { name: 'B1', color: '#e6007e', text: '#ffffff' }, L2 = { name: '13', color: '#00a0e0', text: '#ffffff' };
  const R = { from: { name: 'Gare de Lens' }, to: { name: 'Bollaert' }, now: 28500, options: [
    { dep: 28800, arr: 30300, legs: [{ route: L1, headsign: 'Liévin', from: 'Gare de Lens', dep: 28800, arr: 29400 }, { route: L2, headsign: 'Bollaert', from: 'Saint-Paul', dep: 29700, arr: 30300 }] },
    { dep: 29100, arr: 31200, legs: [{ route: L2, headsign: 'Bollaert', from: 'Gare de Lens', dep: 29100, arr: 31200 }] } ] };
  const stops = ['Gare de Lens', 'Saint-Paul', 'Médiathèque', 'Bollaert', 'Stade', 'Liévin Centre'].map((name, i) => ({ name, time: 28800 + i * 240 }));
  const r = await pj(`(() => {
    const v = document.querySelector('.appWrap').parentElement, T = v.__tp; T.route(${JSON.stringify(R)});
    const box = document.createElement('div'); document.getElementById('tpRoute').append(box);
    T.plan(box, ${JSON.stringify(stops)}, { route: ${JSON.stringify(L1)}, shift: 0, delay: 0 }, 28800 + 2.5 * 240, 'Médiathèque');
    const bus = box.querySelector('.tpBus'), rows = [...box.querySelectorAll('.tpStop')], y = parseFloat(bus?.style.top), mid = (e) => e.offsetTop + e.offsetHeight / 2;
    return { opts: document.querySelectorAll('#tpRoute .tpOpt').length, badges: document.querySelectorAll('#tpRoute .tpOpt')[0].querySelectorAll('.tpLine').length, past: box.querySelectorAll('.tpStop.past').length,
      bus: !!bus, between: bus ? y > mid(rows[2]) && y < mid(rows[3]) : false, line: parseFloat(getComputedStyle(document.querySelector('#tpRoute .tpLine')).fontSize),
      info: [T.rowInfo({ canceled: true }), T.rowInfo({ live: true, delay: 4, exact: true }), T.rowInfo({ time: 30000, delay: 6 })].join('|'),
      over: [...document.querySelectorAll('.appWrap *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length };
  })()`);
  if (r.opts !== 2 || r.badges !== 2) throw new Error('itinéraire : ' + JSON.stringify(r));
  if (!r.bus || !r.between || r.past !== 3) throw new Error('plan de la ligne : ' + JSON.stringify(r));
  if (r.info !== "supprimé|● en circulation · retard 4 min|horaire prévu 08:20 · retard estimé 6 min") throw new Error('passages : ' + r.info);
  if (r.over) throw new Error(r.over + ' élément(s) débordent à droite');
  // « il faut partir » : le réveil d'un passage (5 min à pied, du lundi au vendredi), la liste des alertes, puis la tâche de fond avec un passage dans 5 min
  const lv = await pj(`(async () => {
    const T = document.querySelector('.appWrap').parentElement.__tp, now = new Date(), nowS = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const s = { key: 'essai~quai', name: 'Médiathèque' }, d = { trip: 'x1', route: { name: 'B1', color: '#e6007e', text: '#fff' }, headsign: 'Liévin', time: nowS + 300, delay: 0 };
    const f = T.leaveForm(s, d); document.getElementById('tpRoute').append(f);
    f.querySelector('input').value = 5; f.querySelector('select').value = 'daily'; f.querySelector('button').click();
    await new Promise(r => setTimeout(r, 400));
    const list = T.leaves(), card = document.getElementById('tpLeave'), sent = [];
    const n = await T.leaveTick(async () => ({ now: nowS, departures: [d] }), m => sent.push(m));
    const again = await T.leaveTick(async () => ({ now: nowS, departures: [d] }), m => sent.push(m));
    const out = { n: list.length, walk: list[0]?.walk, rep: list[0]?.repeat, shown: !card.hidden && card.querySelectorAll('.tpLv').length, sent: n, again, title: sent[0]?.title, body: sent[0]?.body };
    await T.leaveClear(); return out; })()`);
  if (lv.n !== 1 || lv.walk !== 5 || lv.rep !== 'daily' || lv.shown !== 1) throw new Error('alerte « il faut partir » : ' + JSON.stringify(lv));
  if (lv.sent !== 1 || lv.again !== 0 || lv.title !== 'Il faut partir : B1 → Liévin' || !/dans [45] min\) · 5 min à pied$/.test(lv.body)) throw new Error('notification « il faut partir » : ' + JSON.stringify(lv));
  await sleep(2500);  // le temps de la capture d'écran
  return '« il faut partir » : alerte posée (5 min à pied, tous les jours), listée, notification à l’heure et une seule fois par jour · 2 itinéraires (dont 1 avec correspondance), plan de 6 arrêts avec le bus entre le 3e et le 4e, lignes en ' + r.line + ' px';
};
