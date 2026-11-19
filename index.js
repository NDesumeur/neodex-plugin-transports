// Transports : les prochains passages de tous les réseaux de France (catalogue transport.data.gouv.fr), plusieurs réseaux à la fois.
// Les horaires et le temps réel sont calculés par engine.js : sur PC dans main.js du plugin, sur téléphone dans cette page (version -phone).
// Les arrêts favoris peuvent prévenir d'une perturbation (trajet supprimé, gros retard, alerte du réseau), même onglet fermé.
const HTML = "<div class=\"appWrap wide\">\n      <div class=\"agHead\"><span class=\"label\">Transports</span><span class=\"hint\" id=\"tpNetHint\"></span></div>\n      <div class=\"sysCard px\" id=\"tpNetCard\"><div class=\"tpNets\" id=\"tpNets\"></div><div id=\"tpNetPick\"></div></div>\n      <div id=\"tpFavs\" class=\"setBg\"></div>\n      <div class=\"sysCard px\"><input class=\"f\" id=\"tpSearch\" placeholder=\"Chercher un arrêt ou une gare (ex : Gare de Lens, Lille Flandres…)\" spellcheck=\"false\"><div id=\"tpResults\"></div></div>\n      <div class=\"sysCard px tpTrip\"><span class=\"label\">Itinéraire · quel bus ou quel train prendre</span><div class=\"tpIt\"><div class=\"tpPick\"><input class=\"f\" id=\"tpFrom\" placeholder=\"De… (l’arrêt affiché si vide)\" spellcheck=\"false\"><div class=\"tpRes\"></div></div><div class=\"tpPick\"><input class=\"f\" id=\"tpTo\" placeholder=\"À… (même réseau)\" spellcheck=\"false\"><div class=\"tpRes\"></div></div><button class=\"btn px\" id=\"tpGo\">QUEL TRAJET ?</button></div><div id=\"tpRoute\"></div></div>\n      <div class=\"sysCard px\" id=\"tpBoard\"><div class=\"hint\">Choisis un arrêt pour voir les prochains passages.</div></div>\n    </div>";
const CSS = `#tpSearch{font-size:clamp(17px,1.15vw,20px)}
.tpNets{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tpNet{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(var(--mgr),.12);box-shadow:inset 0 0 0 2px var(--line2);font-size:14px;color:#fff;max-width:100%}
.tpNet span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tpNet i{font-style:normal;cursor:var(--cp,pointer);color:var(--muted)} .tpNet i:hover{color:#ff4f6d}
.tpNetRes{display:flex;flex-direction:column;gap:2px;max-height:340px;overflow:auto;margin-top:8px}
.tpNetRes .tpResult small{display:block;color:var(--muted);font-size:13px}
.tpTag{font:8px var(--title);padding:3px 5px 2px;margin-left:6px;background:#1e7a43;color:#fff;vertical-align:middle}.tpTag.no{background:#6a2a3a}
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
.tpStops:not(:empty){display:flex;flex-direction:column;margin:0 0 8px 20px;padding-left:12px;box-shadow:inset 3px 0 0 var(--line2)}
.tpStop{display:flex;justify-content:space-between;gap:12px;padding:3px 8px;font-size:clamp(14px,1vw,17px);color:var(--lilac)}
.tpStop.past{color:var(--muted);opacity:.6}
.tpStop.here{color:#fff;background:rgba(var(--mgr),.2)}
.tpResult{all:unset;cursor:var(--cp,pointer);display:flex;justify-content:space-between;gap:12px;padding:8px 10px;font-size:clamp(15px,1.05vw,18px)}
.tpResult:hover{background:rgba(var(--mgr),.14)}
.tpResult b{color:#fff;font-weight:600}
.tpResult span{color:var(--muted);text-align:right}
.tpHead{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.tpName{font:600 clamp(22px,1.7vw,30px) var(--text);color:#fff}
.tpRow{cursor:var(--cp,pointer);display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.tpLine{min-width:64px;text-align:center;padding:6px 8px;font:clamp(11px,.8vw,14px) var(--title);letter-spacing:.5px}
.tpRow .tn{color:#fff;font-size:clamp(16px,1.15vw,20px);min-width:0}
.tpRow small{display:block;font-size:clamp(13px,.9vw,15px);color:var(--muted)}
.tpRow.live small{color:#8ee8a0}
.tpRow.late small{color:#ffc061}
.tpRow.gone .tn,.tpRow.gone .tpWhen{text-decoration:line-through;opacity:.6}.tpRow.gone small{color:#ff6b81;text-decoration:none}
.tpWhen{font:clamp(15px,1.15vw,21px) var(--title);color:#fff;white-space:nowrap}
.tpWhen.now{color:var(--pink)}
.tpAlert{margin:8px 0;padding:10px 12px;background:rgba(255,160,40,.12);box-shadow:inset 3px 0 0 #ffa028;font-size:14px;color:var(--lilac);line-height:1.45}
.tpAlert b{color:#ffc061;display:block;margin-bottom:2px}
.nbaStar{all:unset;cursor:var(--cp,pointer);color:var(--muted);font-size:16px;padding:0 4px}
.nbaStar:hover,.nbaStar.on{color:#ffd07a}
`;
// le réseau d'origine du plugin (Lens-Liévin) : repris tel quel pour ceux qui avaient déjà des arrêts favoris
const TADAO = { id: '600ee0e9d319b4c4b84bd748', title: 'Réseau urbain TADAO', gtfs: 'https://www.data.gouv.fr/api/1/datasets/r/47a5e290-7883-4a40-bdcf-b693f64087b0', rt: [{ url: 'https://www.data.gouv.fr/api/1/datasets/r/c4563dcc-f547-489a-b63a-efb4dbb37262', f: 'trip_updates,vehicle_positions' }], trips: 7363 };
const MAX_TRIPS = 120000;
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast } = ctx.host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => view.querySelector('#' + id);
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  let prefs = await doc('prefs');
  if (prefs == null) {  // première ouverture : tu retrouves tes réglages d'avant
    prefs = {}; const old = legacy.settings ? await legacy.settings().catch(() => ({})) : {};
    if (Array.isArray(old.tadaoStops) && old.tadaoStops.length) prefs.tadaoStops = old.tadaoStops;
  }
  if (!Array.isArray(prefs.nets)) {  // avant la version 2 : un seul réseau, Tadao ; ses arrêts favoris prennent le préfixe du réseau
    prefs.nets = prefs.tadaoStops?.length ? [TADAO] : [];
    prefs.tadaoStops = (prefs.tadaoStops || []).map(s => s.key.includes('~') ? s : { ...s, key: TADAO.id + '~' + s.key });
  }
  const save = () => folder.write('prefs', prefs);
  await save();
  const tp = (name, ...a) => ctx.neo.pluginMain('neodex.transports', name, ...a);  // les horaires et le temps réel vivent dans le main.js du plugin
  const nets = () => prefs.nets, netOf = key => prefs.nets.find(n => n.id === String(key).split('~')[0]);
  const errText = e => String(e?.message || e).replace(/^.*Error: /, '');
  let tpStop = null, tpTimer = null, tpTrip = null;
  const tpFavs = () => prefs.tadaoStops || [];

  // ---- les réseaux choisis, et l'ajout d'un réseau depuis le catalogue national ----
  function netChips() {
    const add = el('button', 'btn px' + (nets().length ? '' : ' main'), nets().length ? '+ RÉSEAU' : '+ CHOISIR MON RÉSEAU');
    add.onclick = () => netPicker(!$('tpNetPick').childElementCount);
    $('tpNets').replaceChildren(...nets().map(n => {
      const c = el('span', 'tpNet'), x = el('i', '', '✕'); c.append(el('span', '', n.title), x); c.title = n.rt?.length ? 'Horaires et temps réel' : 'Horaires seulement (ce réseau ne donne pas de temps réel)';
      x.onclick = async () => { if (!await ctx.host.confirm('Retirer « ' + n.title + ' » ? Ses arrêts favoris partent aussi.', { ok: 'Retirer', danger: true })) return;
        prefs.nets = nets().filter(y => y !== n); prefs.tadaoStops = tpFavs().filter(s => !s.key.startsWith(n.id + '~')); if (tpStop && netOf(tpStop.key) == null) tpStop = null; await save(); refreshAll(); };
      return c;
    }), add);
    $('tpNetHint').textContent = nets().length ? nets().length + ' réseau' + (nets().length > 1 ? 'x' : '') + ' · données transport.data.gouv.fr' : '';
  }
  function netPicker(open) {
    const box = $('tpNetPick'); if (!open) return box.replaceChildren();
    const inp = el('input', 'f'), res = el('div', 'tpNetRes'); inp.placeholder = 'Ville, région, réseau ou exploitant (ex : Lille, Hauts-de-France, TER, Tadao…)'; inp.spellcheck = false;
    let n = 0;
    const show = async () => {
      const me = ++n; res.replaceChildren(el('div', 'hint', 'Recherche dans le catalogue national…'));
      try {
        const list = await tp('tp:networks', inp.value.trim()); if (me !== n) return;
        res.replaceChildren(...(list.length ? list.slice(0, 40).map(d => {
          const b = el('button', 'tpResult'), l = el('div'), big = d.trips > MAX_TRIPS, have = nets().some(x => x.id === d.id);
          const name = el('b', '', d.title); if (d.rt.length) name.append(el('span', 'tpTag', 'TEMPS RÉEL')); if (big) name.append(el('span', 'tpTag no', 'TROP GRAND'));
          l.append(name, el('small', '', [d.area, d.by].filter(Boolean).join(' · ')));
          b.append(l, el('span', '', have ? '✓ choisi' : d.trips ? d.trips.toLocaleString('fr-FR') + ' trajets' : ''));
          b.onclick = async () => {
            if (have) return; if (big) return toast('Ce réseau est trop grand pour NeoDex (' + d.trips.toLocaleString('fr-FR') + ' trajets).', true);
            prefs.nets.push({ id: d.id, title: d.title, gtfs: d.gtfs, rt: d.rt, trips: d.trips }); await save(); netPicker(false); refreshAll(); toast('Ajouté : ' + d.title + '. Cherche un arrêt pour commencer.');
          };
          return b;
        }) : [el('div', 'hint', 'Aucun réseau trouvé.')]));
      } catch (e) { if (me === n) res.replaceChildren(el('div', 'hint', errText(e))); }
    };
    let t = 0; inp.oninput = () => { clearTimeout(t); t = setTimeout(show, 250); };
    box.replaceChildren(inp, res); inp.focus(); show();
  }
  function refreshAll() { netChips(); tpChips(); if (tpStop) tpShow(tpStop); else $('tpBoard').replaceChildren(el('div', 'hint', nets().length ? 'Choisis un arrêt pour voir les prochains passages.' : 'Choisis d\'abord ton réseau (bus, tram, métro, car ou train) : tous ceux de France sont dans la liste.')); }

  function tpChips() {
    $('tpFavs').replaceChildren(...(tpFavs().length ? tpFavs().map(s => { const b = el('button', 'tab px' + (tpStop?.key === s.key ? ' on' : ''), (s.alert ? '🔔 ' : '') + s.name); b.title = [s.town, netOf(s.key)?.title].filter(Boolean).join(' · '); b.onclick = () => tpShow(s); return b; }) : [el('span', 'hint', nets().length ? 'Cherche un arrêt puis clique sur ☆ pour le garder ici.' : '')]));
  }
  async function tpOpen() { netChips(); tpChips(); if (!nets().length) { refreshAll(); netPicker(true); } else if (!tpStop && tpFavs()[0]) tpShow(tpFavs()[0]); else if (tpStop) tpShow(tpStop); }
  const resultBtn = (s, onclick) => { const b = el('button', 'tpResult'); b.append(el('b', '', s.name), el('span', '', [s.town, nets().length > 1 ? s.netTitle : ''].filter(Boolean).join(' · ') + (s.quays > 1 ? ' · ' + s.quays + ' quais' : ''))); b.onclick = onclick; return b; };
  $('tpSearch').oninput = async e => {
    const q = e.target.value.trim(); if (q.length < 2) return $('tpResults').replaceChildren();
    if (!nets().length) return $('tpResults').replaceChildren(el('div', 'hint', 'Choisis d\'abord un réseau (bouton + CHOISIR MON RÉSEAU).'));
    $('tpResults').replaceChildren(el('div', 'hint', 'Recherche… (la première fois, NeoDex télécharge les horaires du réseau)'));
    try {
      const r = await tp('tp:search', q, nets());
      if (e.target.value.trim() !== q) return;
      $('tpResults').replaceChildren(...(r.length ? r.map(s => resultBtn(s, () => { $('tpSearch').value = ''; $('tpResults').replaceChildren(); tpShow(s); })) : [el('div', 'hint', 'Aucun arrêt trouvé.')]));
    } catch (err) { $('tpResults').replaceChildren(el('div', 'hint', 'Horaires indisponibles : ' + errText(err))); }
  };
  const hhmm = t => String(Math.floor(t / 3600) % 24).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0');
  // où est le véhicule entre deux arrêts, d'après l'heure : l'indice de l'arrêt passé et la part du chemin vers le suivant (null : pas encore parti ou arrivé)
  const busAt = (times, now) => { if (!times.length || now < times[0] || now >= times.at(-1)) return null; let i = 0; while (times[i + 1] <= now) i++; return [i, times[i + 1] > times[i] ? (now - times[i]) / (times[i + 1] - times[i]) : 0]; };
  console.assert(JSON.stringify(busAt([100, 200, 400], 300)) === '[1,0.5]' && busAt([100, 200], 50) === null && busAt([100, 200], 200) === null, 'busAt');
  function busIcon(c) {  // un petit bus en pixels, aux couleurs de la ligne
    const cv = document.createElement('canvas'); cv.width = 11; cv.height = 7; cv.className = 'tpBus'; const g = cv.getContext('2d');
    g.fillStyle = c || '#8a5cf0'; g.fillRect(0, 0, 11, 5); g.fillStyle = '#d8f0ff'; for (const x of [1, 4, 7]) g.fillRect(x, 1, 2, 2); g.fillRect(9, 1, 1, 3); g.fillStyle = '#05010b'; g.fillRect(2, 5, 2, 2); g.fillRect(7, 5, 2, 2);
    return cv;
  }
  function tpPlan(box, list, d, now, here) {  // le plan de la ligne : chaque arrêt sur un trait à la couleur de la ligne, le véhicule avance entre deux arrêts
    const times = list.map(p => p.time - (d.shift || 0) + (d.delay || 0) * 60);
    box.className = 'tpStops tpPlan'; box.style.setProperty('--lc', d.route?.color || '#8a5cf0');
    const rows = list.map((p, i) => { const e = el('div', 'tpStop' + (times[i] <= now ? ' past' : p.name === here ? ' here' : '')); e.append(el('span', '', p.name), el('b', '', hhmm(times[i]))); return e; });
    box.replaceChildren(...rows);
    const at = busAt(times, now); if (!at || d.canceled) return;
    const bus = busIcon(d.route?.color), a = rows[at[0]], b = rows[at[0] + 1]; bus.title = d.live ? 'Position estimée d’après le temps réel' : 'Position estimée d’après l’horaire';
    bus.style.top = (a.offsetTop + a.offsetHeight / 2 + (b.offsetTop - a.offsetTop) * at[1]) + 'px'; box.append(bus);
  }
  // l'itinéraire : deux arrêts choisis dans une liste qui s'ouvre sous la saisie
  const tpEnds = { from: null, to: null };
  function tpPicker(inp, k) {
    const res = inp.nextElementSibling; let n = 0;
    inp.oninput = async () => { tpEnds[k] = null; const q = inp.value.trim(), me = ++n; if (q.length < 2) return res.replaceChildren();
      try { const r = await tp('tp:search', q, nets()); if (me !== n) return; res.replaceChildren(...r.slice(0, 8).map(s => resultBtn(s, () => { tpEnds[k] = s; inp.value = s.name; res.replaceChildren(); }))); }
      catch (err) { res.replaceChildren(el('div', 'hint', errText(err))); } };
    inp.onblur = () => setTimeout(() => res.replaceChildren(), 200);
  }
  tpPicker($('tpFrom'), 'from'); tpPicker($('tpTo'), 'to');
  function tpRouteShow(r) {
    const box = $('tpRoute');
    if (!r.options.length) return box.replaceChildren(el('div', 'hint', 'Aucun trajet de ' + r.from.name + ' à ' + r.to.name + ' dans les 3 prochaines heures (même avec une correspondance).'));
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
    $('tpRoute').replaceChildren(el('div', 'hint', 'Recherche des trajets…'));
    try { tpRouteShow(await tp('tp:route', a.key, b.key, nets())); } catch (err) { $('tpRoute').replaceChildren(el('div', 'hint', 'Itinéraire indisponible : ' + errText(err))); }
  };
  // ce que dit une ligne de passage : supprimé, ne s'arrête pas, en circulation, retard (exact ou estimé)
  function rowInfo(d) {
    if (d.canceled) return 'supprimé';
    if (d.skipped) return 'ne s\'arrête pas à cet arrêt';
    const late = d.delay > 1 ? (d.exact ? ' · retard ' : ' · retard estimé ') + d.delay + ' min' : d.delay != null && d.delay < -1 ? ' · en avance' : d.exact ? ' · à l\'heure' : '';
    if (d.live) return '● en circulation' + (d.away != null ? ' · à ' + d.away + ' arrêt' + (d.away > 1 ? 's' : '') + (d.where ? ' (' + d.where + ')' : '') : '') + late;
    return 'horaire prévu ' + hhmm(d.time) + late;
  }
  async function tpShow(s) {
    clearTimeout(tpTimer); tpStop = s; tpChips();
    if (!view.classList.contains('on')) return;
    tpTimer = setTimeout(() => tpShow(s), 30000);
    const fav = tpFavs().find(f => f.key === s.key), star = el('button', 'nbaStar' + (fav ? ' on' : ''), fav ? '★' : '☆');
    star.title = fav ? 'Retirer de mes arrêts' : 'Garder cet arrêt';
    star.onclick = async () => { prefs.tadaoStops = fav ? tpFavs().filter(f => f.key !== s.key) : [...tpFavs(), { key: s.key, name: s.name, town: s.town }]; await save(); tpShow(s); };
    const head = el('div', 'tpHead'); head.append(el('span', 'tpName', s.name), el('span', 'hint', [s.town, netOf(s.key)?.title].filter(Boolean).join(' · ')), star);
    if (fav) {  // la cloche : prévenir d'une perturbation à cet arrêt
      const bell = el('button', 'btn px', fav.alert ? '🔔 PERTURBATIONS : OUI' : '🔕 PERTURBATIONS : NON');
      bell.title = 'Une notification quand un passage de la prochaine heure est supprimé, a 10 min de retard ou plus, ou qu\'une alerte du réseau touche cet arrêt (vérifié toutes les 5 min, même onglet fermé)';
      bell.onclick = async () => { fav.alert = !fav.alert; await save(); tpShow(s); toast(fav.alert ? 'Tu seras prévenu des perturbations à ' + s.name : 'Plus de notification pour ' + s.name); };
      head.append(bell);
    }
    if ($('tpBoard').dataset.key !== s.key) { $('tpBoard').dataset.key = s.key; $('tpBoard').replaceChildren(head, el('div', 'hint', 'Chargement…')); }  // le même arrêt toutes les 30 s : l'ancien tableau reste jusqu'au nouveau
    try {
      const r = await tp('tp:next', s.key, nets()), net = netOf(s.key);
      const alerts = (r.alerts || []).map(a => { const x = el('div', 'tpAlert'); x.append(el('b', '', '⚠ ' + (a.header || 'Info réseau')), a.desc ? el('div', '', a.desc) : ''); return x; });
      const rows = r.departures.map(d => {
        const row = el('div', 'tpRow' + (d.canceled || d.skipped ? ' gone' : d.delay >= 5 ? ' late' : d.live ? ' live' : '')), line = el('span', 'tpLine', d.route?.name || '?'), mins = Math.round((d.time + (d.delay || 0) * 60 - r.now) / 60);
        line.style.background = d.route?.color; line.style.color = d.route?.text;
        const when = el('span', 'tpWhen' + (mins <= 1 && !d.canceled ? ' now' : ''), mins <= 0 ? 'à quai' : mins < 60 ? mins + ' min' : hhmm(d.time + (d.delay || 0) * 60));
        const info = el('div', 'tn'); info.append(d.headsign, el('small', '', rowInfo(d)));
        row.append(line, info, when);
        const stops = el('div', 'tpStops');  // un clic sur un passage : tous ses arrêts, avec leurs heures
        const fill = async () => tpPlan(stops, await tp('tp:trip', net.id, d.trip, nets()), d, r.now, s.name);
        row.onclick = () => { const on = tpTrip === d.trip; tpTrip = on ? null : d.trip; view.querySelectorAll('.tpStops').forEach(x => x.replaceChildren()); if (!on) fill().catch(e => toast(errText(e), true)); };
        if (tpTrip === d.trip) fill().catch(() => {});
        return [row, stops];
      }).flat();
      const foot = 'Horaires ' + (net?.title || '') + ' (transport.data.gouv.fr)' + (!r.rt ? ' · pas de temps réel sur ce réseau' : ' · temps réel' + (r.buses ? ', ' + r.buses + ' véhicules suivis' : '') + (r.liveAt ? ' (' + new Date(r.liveAt * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ')' : ''));
      $('tpBoard').replaceChildren(head, ...alerts, ...(rows.length ? rows : [el('div', 'hint', 'Plus de passage dans les 3 prochaines heures.')]), el('div', 'hint', foot));
    } catch (err) { $('tpBoard').replaceChildren(head, el('div', 'hint', 'Horaires indisponibles : ' + errText(err))); }
  }

  // ---- perturbations des arrêts à cloche : toutes les 5 min, même onglet fermé ; une seule notification par passage ou par alerte ----
  async function watch() {
    const favs = tpFavs().filter(f => f.alert && netOf(f.key)); if (!favs.length) return;
    const sent = new Set(prefs.sent || []), today = new Date().toDateString(), out = [];
    for (const f of favs) {
      let r; try { r = await tp('tp:next', f.key, nets()); } catch { continue; }
      for (const d of r.departures) {
        const mins = (d.time - r.now) / 60; if (mins > 60) continue;
        const why = d.canceled ? 'supprimé' : d.skipped ? 'ne s\'arrête pas' : d.delay >= 10 ? d.delay + ' min de retard' : '';
        const id = today + '|' + d.trip + '|' + why; if (!why || sent.has(id)) continue;
        sent.add(id); out.push({ title: (d.route?.name || '') + ' ' + hhmm(d.time) + ' → ' + d.headsign + ' : ' + why, body: f.name });
      }
      for (const a of r.alerts || []) { const id = 'a|' + a.id + '|' + a.header; if (sent.has(id)) continue; sent.add(id); out.push({ title: '⚠ ' + (a.header || 'Info réseau'), body: f.name + (a.desc ? ' · ' + a.desc.slice(0, 200) : '') }); }
    }
    prefs.sent = [...sent].slice(-300); await save();
    for (const n of out.slice(0, 4)) ctx.notifications?.send({ type: 'perturbation', title: n.title, body: n.body, open: 'plugin:neodex.transports' }).catch(() => {});
  }
  ctx.background?.every?.(5, () => watch().catch(() => {}));

  view.__tp = { route: tpRouteShow, plan: tpPlan, busAt, rowInfo };  // pour l'auto-test
  ctx.onOpen(() => { tpOpen(); });
  ctx.onClose(() => { clearTimeout(tpTimer); });
  refreshAll();
}
