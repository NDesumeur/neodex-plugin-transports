// Transports : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoDex sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoDex.
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"appWrap wide\">\n      <div class=\"agHead\"><span class=\"label\">Transports · Tadao</span></div>\n      <div id=\"tpFavs\" class=\"setBg\"></div>\n      <div class=\"sysCard px\"><input class=\"f\" id=\"tpSearch\" placeholder=\"Chercher un arrêt (ex : Gare de Lens, Bollaert…)\" spellcheck=\"false\"><div id=\"tpResults\"></div></div>\n      <div class=\"sysCard px tpTrip\"><span class=\"label\">Itinéraire · quel bus prendre</span><div class=\"tpIt\"><div class=\"tpPick\"><input class=\"f\" id=\"tpFrom\" placeholder=\"De… (l’arrêt affiché si vide)\" spellcheck=\"false\"><div class=\"tpRes\"></div></div><div class=\"tpPick\"><input class=\"f\" id=\"tpTo\" placeholder=\"À… (ex : Gare de Lens)\" spellcheck=\"false\"><div class=\"tpRes\"></div></div><button class=\"btn px\" id=\"tpGo\">QUEL BUS ?</button></div><div id=\"tpRoute\"></div></div>\n      <div class=\"sysCard px\" id=\"tpBoard\"><div class=\"hint\">Choisis un arrêt pour voir les prochains passages.</div></div>\n    </div>";
/*CSS-MOVED*/ const CSS = `#tpSearch{font-size:clamp(17px,1.15vw,20px)}
.tpIt{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:start}.tpPick{position:relative;min-width:0}.tpPick .f{width:100%;font-size:16px}
.tpRes:not(:empty){position:absolute;z-index:5;left:0;right:0;top:100%;display:flex;flex-direction:column;background:var(--win);box-shadow:0 0 0 2px var(--line2);max-height:260px;overflow:auto}
@media (max-width:760px){.tpIt{grid-template-columns:1fr}}
.tpOpt{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:clamp(15px,1vw,18px);color:var(--lilac)}
.tpOpt b{color:#fff;font:clamp(14px,1.05vw,19px) var(--title)}.tpOpt .dur{margin-left:auto;color:var(--muted)}
.tpStops.tpPlan:not(:empty){position:relative;margin:4px 0 10px 26px;padding-left:22px;box-shadow:none}
.tpPlan::before{content:"";position:absolute;left:5px;top:12px;bottom:12px;width:4px;background:var(--lc,#8a5cf0)}
.tpPlan .tpStop{position:relative;padding:4px 8px}.tpPlan .tpStop::before{content:"";position:absolute;left:-20px;top:50%;width:10px;height:10px;margin-top:-5px;background:var(--win);box-shadow:0 0 0 2px var(--lc,#8a5cf0)}
.tpPlan .tpStop.past::before{background:var(--lc,#8a5cf0)}
.tpBus{position:absolute;left:-4px;width:22px;height:14px;margin-top:-7px;image-rendering:pixelated;z-index:2;transition:top 1s steps(4)}
#tpResults{display:flex;flex-direction:column;gap:2px}
.tpRow{cursor:var(--cp,pointer)}
.tpStops:not(:empty){display:flex;flex-direction:column;margin:0 0 8px 20px;padding-left:12px;box-shadow:inset 3px 0 0 var(--line2)}
.tpStop{display:flex;justify-content:space-between;gap:12px;padding:3px 8px;font-size:clamp(14px,1vw,17px);color:var(--lilac)}
.tpStop.past{color:var(--muted);opacity:.6}
.tpStop.here{color:#fff;background:rgba(var(--mgr),.2)}
.tpResult{all:unset;cursor:var(--cp,pointer);display:flex;justify-content:space-between;gap:12px;padding:8px 10px;font-size:clamp(15px,1.05vw,18px)}
.tpResult:hover{background:rgba(var(--mgr),.14)}
.tpResult b{color:#fff;font-weight:600}
.tpResult span{color:var(--muted)}
.tpHead{display:flex;align-items:center;gap:14px}
.tpName{font:600 clamp(22px,1.7vw,30px) var(--text);color:#fff}
.tpRow{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.tpLine{min-width:64px;text-align:center;padding:6px 8px;font:clamp(11px,.8vw,14px) var(--title);letter-spacing:.5px}
.tpRow .tn{color:#fff;font-size:clamp(16px,1.15vw,20px);min-width:0}
.tpRow small{display:block;font-size:clamp(13px,.9vw,15px);color:var(--muted)}
.tpRow.live small{color:#8ee8a0}
.tpWhen{font:clamp(15px,1.15vw,21px) var(--title);color:#fff;white-space:nowrap}
.tpWhen.now{color:var(--pink)}
.nbaStar{all:unset;cursor:var(--cp,pointer);color:var(--muted);font-size:16px;padding:0 4px}
.nbaStar:hover,.nbaStar.on{color:#ffd07a}
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = ctx.host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => id === "busApp" ? view : view.querySelector('#' + id);  // les identifiants de ta vue, sans toucher à ceux du reste de NeoDex
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  let prefs = await doc('prefs');
  if (prefs == null) {  // première ouverture : tu retrouves tes réglages d'avant
    prefs = {}; const old = legacy.settings ? await legacy.settings().catch(() => ({})) : {};
    for (const k of ["tadaoStops"]) if (old[k] !== undefined && old[k] !== '' && !(Array.isArray(old[k]) && !old[k].length)) prefs[k] = old[k];
    if (Object.keys(prefs).length) await folder.write('prefs', prefs);
  }
  const tp = (name, ...a) => ctx.neo.pluginMain('neodex.transports', name, ...a);  // les horaires et les bus en direct vivent dans le main.js du plugin
  const neo = Object.assign({}, ctx.neo || {}, { tadaoSearch: q => tp('tadao:search', q), tadaoNext: (k, at) => tp('tadao:next', k, at), tadaoTrip: id => tp('tadao:trip', id), win: a => ctx.host.win?.(a), getSettings: async () => prefs, setSettings: async s => { Object.assign(prefs, s); await folder.write('prefs', prefs); return prefs; } });
  // ---- ton code d'origine ----
  /* ---------- Transports app: Tadao (Lens-Liévin-Hénin-Carvin), next departures from the timetables + where the buses are now ---------- */
  let tpStop = null, tpTimer = null, tpTrip = null;
  const tpFavs = () => prefs.tadaoStops || [];
  function tpChips() {
    $('tpFavs').replaceChildren(...(tpFavs().length ? tpFavs().map(s => { const b = el('button', 'tab px' + (tpStop?.key === s.key ? ' on' : ''), s.name); b.title = s.town; b.onclick = () => tpShow(s); return b; }) : [el('span', 'hint', 'Cherche un arrêt puis clique sur ☆ pour le garder ici.')]));
  }
  async function tpOpen() { tpChips(); if (!tpStop && tpFavs()[0]) tpShow(tpFavs()[0]); else if (tpStop) tpShow(tpStop); }
  $('tpSearch').oninput = async e => {
    const q = e.target.value.trim(); if (q.length < 2) return $('tpResults').replaceChildren();
    $('tpResults').replaceChildren(el('div', 'hint', 'Recherche… (la première fois, NeoDex télécharge les horaires Tadao, environ 20 Mo)'));
    try {
      const r = await neo.tadaoSearch(q);
      if (e.target.value.trim() !== q) return;
      $('tpResults').replaceChildren(...(r.length ? r.map(s => { const b = el('button', 'tpResult'); b.append(el('b', '', s.name), el('span', '', s.town + (s.quays > 1 ? ' · ' + s.quays + ' quais' : ''))); b.onclick = () => { $('tpSearch').value = ''; $('tpResults').replaceChildren(); tpShow(s); }; return b; }) : [el('div', 'hint', 'Aucun arrêt trouvé.')]));
    } catch (err) { $('tpResults').replaceChildren(el('div', 'hint', 'Horaires indisponibles : ' + err.message.replace(/^.*Error: /, ''))); }
  };
  const hhmm = t => String(Math.floor(t / 3600) % 24).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0');
  // où est le bus entre deux arrêts, d'après l'heure : l'indice de l'arrêt passé et la part du chemin vers le suivant (null : pas encore parti ou arrivé)
  const busAt = (times, now) => { if (!times.length || now < times[0] || now >= times.at(-1)) return null; let i = 0; while (times[i + 1] <= now) i++; return [i, times[i + 1] > times[i] ? (now - times[i]) / (times[i + 1] - times[i]) : 0]; };
  console.assert(JSON.stringify(busAt([100, 200, 400], 300)) === '[1,0.5]' && busAt([100, 200], 50) === null && busAt([100, 200], 200) === null, 'busAt');
  function busIcon(c) {  // un petit bus en pixels, aux couleurs de la ligne
    const cv = document.createElement('canvas'); cv.width = 11; cv.height = 7; cv.className = 'tpBus'; const g = cv.getContext('2d');
    g.fillStyle = c || '#8a5cf0'; g.fillRect(0, 0, 11, 5); g.fillStyle = '#d8f0ff'; for (const x of [1, 4, 7]) g.fillRect(x, 1, 2, 2); g.fillRect(9, 1, 1, 3); g.fillStyle = '#05010b'; g.fillRect(2, 5, 2, 2); g.fillRect(7, 5, 2, 2);
    return cv;
  }
  function tpPlan(box, list, d, now, here) {  // le plan de la ligne : chaque arrêt sur un trait à la couleur de la ligne, le bus avance entre deux arrêts
    const times = list.map(p => p.time - (d.shift || 0) + (d.delay || 0) * 60);
    box.className = 'tpStops tpPlan'; box.style.setProperty('--lc', d.route?.color || '#8a5cf0');
    const rows = list.map((p, i) => { const e = el('div', 'tpStop' + (times[i] <= now ? ' past' : p.name === here ? ' here' : '')); e.append(el('span', '', p.name), el('b', '', hhmm(times[i]))); return e; });
    box.replaceChildren(...rows);
    const at = busAt(times, now); if (!at) return;
    const bus = busIcon(d.route?.color), a = rows[at[0]], b = rows[at[0] + 1]; bus.title = d.live ? 'Le bus (position estimée d’après le direct)' : 'Le bus (position estimée d’après l’horaire)';
    bus.style.top = (a.offsetTop + a.offsetHeight / 2 + (b.offsetTop - a.offsetTop) * at[1]) + 'px'; box.append(bus);
  }
  // l'itinéraire : deux arrêts choisis dans une liste qui s'ouvre sous la saisie
  const tpEnds = {from: null, to: null};
  function tpPicker(inp, k) {
    const res = inp.nextElementSibling; let n = 0;
    inp.oninput = async () => { tpEnds[k] = null; const q = inp.value.trim(), me = ++n; if (q.length < 2) return res.replaceChildren();
      try { const r = await neo.tadaoSearch(q); if (me !== n) return; res.replaceChildren(...r.slice(0, 8).map(s => { const b = el('button', 'tpResult'); b.append(el('b', '', s.name), el('span', '', s.town)); b.onclick = () => { tpEnds[k] = s; inp.value = s.name; res.replaceChildren(); }; return b; })); }
      catch (err) { res.replaceChildren(el('div', 'hint', err.message.replace(/^.*Error: /, ''))); } };
    inp.onblur = () => setTimeout(() => res.replaceChildren(), 200);
  }
  tpPicker($('tpFrom'), 'from'); tpPicker($('tpTo'), 'to');
  function tpRouteShow(r) {
    const box = $('tpRoute');
    if (!r.options.length) return box.replaceChildren(el('div', 'hint', 'Aucun bus de ' + r.from.name + ' à ' + r.to.name + ' dans les 3 prochaines heures (même avec une correspondance).'));
    box.replaceChildren(...r.options.map(o => {
      const row = el('div', 'tpOpt'), badge = l => { const x = el('span', 'tpLine', l.route?.name || '?'); x.style.background = l.route?.color; x.style.color = l.route?.text; return x; };
      row.append(el('b', '', hhmm(o.dep) + ' → ' + hhmm(o.arr)));
      o.legs.forEach((l, i) => row.append(...(i ? [el('span', '', 'puis, à ' + l.from + ' (' + hhmm(l.dep) + ')')] : []), badge(l), el('span', '', 'direction ' + l.headsign)));
      row.append(el('span', 'dur', Math.round((o.arr - o.dep) / 60) + ' min' + (o.legs.length > 1 ? ' · 1 correspondance' : ' · direct') + (o.dep - r.now > 60 ? ' · dans ' + Math.round((o.dep - r.now) / 60) + ' min' : '')));
      return row;
    }));
  }
  $('tpGo').onclick = async () => {
    const a = tpEnds.from || (!$('tpFrom').value.trim() && tpStop), b = tpEnds.to;
    if (!a || !b) return toast(!b ? 'Choisis l’arrêt d’arrivée dans la liste' : 'Choisis l’arrêt de départ dans la liste', true);
    $('tpRoute').replaceChildren(el('div', 'hint', 'Recherche des bus…'));
    try { tpRouteShow(await tp('tadao:route', a.key, b.key)); } catch (err) { $('tpRoute').replaceChildren(el('div', 'hint', 'Itinéraire indisponible : ' + err.message.replace(/^.*Error: /, ''))); }
  };
  async function tpShow(s) {
    clearTimeout(tpTimer); tpStop = s; tpChips();
    if (!view.classList.contains('on')) return;
    tpTimer = setTimeout(() => tpShow(s), 30000);
    const fav = tpFavs().some(f => f.key === s.key), star = el('button', 'nbaStar' + (fav ? ' on' : ''), fav ? '★' : '☆');
    star.title = fav ? 'Retirer de mes arrêts' : 'Garder cet arrêt'; star.onclick = async () => { prefs = await neo.setSettings({tadaoStops: fav ? tpFavs().filter(f => f.key !== s.key) : [...tpFavs(), {key: s.key, name: s.name, town: s.town}]}); tpShow(s); };
    const head = el('div', 'tpHead'); head.append(el('span', 'tpName', s.name), el('span', 'hint', s.town), star);
    $('tpBoard').replaceChildren(head, el('div', 'hint', 'Chargement…'));
    try {
      const r = await neo.tadaoNext(s.key);
      const rows = r.departures.map(d => {
        const row = el('div', 'tpRow'), line = el('span', 'tpLine', d.route?.name || '?'), mins = Math.round((d.time + (d.delay || 0) * 60 - r.now) / 60);
        line.style.background = d.route?.color; line.style.color = d.route?.text;
        const when = el('span', 'tpWhen' + (mins <= 1 ? ' now' : ''), mins <= 0 ? 'à quai' : mins < 60 ? mins + ' min' : String(Math.floor(d.time / 3600) % 24).padStart(2, '0') + ':' + String(Math.floor(d.time % 3600 / 60)).padStart(2, '0'));
        const info = el('div', 'tn'); info.append(d.headsign, el('small', '', (d.live ? '● en circulation' + (d.away != null ? ' · à ' + d.away + ' arrêt' + (d.away > 1 ? 's' : '') + (d.where ? ' (' + d.where + ')' : '') : '') + (d.delay > 1 ? ' · retard estimé ' + d.delay + ' min' : d.delay != null && d.delay < -1 ? ' · en avance' : '') : 'horaire prévu ' + String(Math.floor(d.time / 3600) % 24).padStart(2, '0') + ':' + String(Math.floor(d.time % 3600 / 60)).padStart(2, '0'))));
        if (d.live) row.classList.add('live');
        row.append(line, info, when);
        const stops = el('div', 'tpStops');  // a click on a bus: all its stops, with their times
        const fill = async () => tpPlan(stops, await neo.tadaoTrip(d.trip), d, r.now, s.name);
        row.onclick = () => { const on = tpTrip === d.trip; tpTrip = on ? null : d.trip; view.querySelectorAll('.tpStops').forEach(x => x.replaceChildren()); if (!on) fill().catch(e => toast(e.message, true)); };
        if (tpTrip === d.trip) fill().catch(() => {});
        return [row, stops];
      }).flat();
      $('tpBoard').replaceChildren(head, ...(rows.length ? rows : [el('div', 'hint', 'Plus de passage dans les 3 prochaines heures.')]),
        el('div', 'hint', 'Horaires Tadao (transport.data.gouv.fr) · ' + r.buses + ' bus suivis en direct' + (r.liveAt ? ', position du ' + new Date(r.liveAt * 1000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}) : '') + ' · le retard est estimé d\'après la position du bus.'));
    } catch (err) { $('tpBoard').replaceChildren(head, el('div', 'hint', 'Horaires indisponibles : ' + err.message.replace(/^.*Error: /, ''))); }
  }
  // ---- fin ----
  view.__tp = {route: tpRouteShow, plan: tpPlan, busAt};  // pour l'auto-test
  ctx.onOpen(() => { tpOpen(); });
  ctx.onClose(() => { clearTimeout(tpTimer); });
}
