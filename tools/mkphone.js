// Fabrique index.js de la version téléphone (dossier voisin neodex-plugin-transports-phone) : node tools/mkphone.js
// Sur téléphone un plugin n'a pas de main.js : le moteur (engine.js) est recopié dans la page, avec un « io » qui passe par ctx.net
// et par les fichiers du plugin (compressés en gzip : les horaires de Lille font 58 Mo en texte, 15 Mo au plus par fichier).
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..'), OUT = path.join(DIR, '..', 'neodex-plugin-transports-phone', 'index.js');
const rd = f => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');
const engine = rd('engine.js').replace(/\nif \(typeof module !== 'undefined'\) module\.exports = tpEngine;\n?$/, '\n');
if (/module\.exports|require\(/.test(engine)) throw new Error('engine.js dépend encore de Node');
const io = `
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const pipe = async (u8, t) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(t)).arrayBuffer());
const fname = n => 'tp-' + n.replace(/[^\\w.-]/g, '_');
const mem = new Map();  // ce que les fichiers du plugin refusent (trop gros même compressé) reste en mémoire jusqu'à la fermeture
const io = {
  phone: true, maxTrips: 60000,
  fetchBin: async url => {
    const r = await ctx.net(url, { binary: true });
    if (r && r.ok && !r.b64) throw new Error('mets NeoDex à jour (3.2.6 ou plus) pour télécharger les horaires');  // un NeoDex d'avant ne sait pas rendre un fichier
    if (!r || !r.ok || !r.b64) throw new Error('erreur ' + (r && r.status));
    return unb64(r.b64);
  },
  fetchText: async url => { const r = await ctx.net(url); if (!r || !r.ok) throw new Error('erreur ' + (r && r.status)); return r.body; },
  inflate: raw => pipe(raw, new DecompressionStream('deflate-raw')),
  cacheGet: async n => { if (mem.has(n)) return mem.get(n); try { const b = await folder.readFile(fname(n)); return b == null ? null : new TextDecoder().decode(await pipe(unb64(b), new DecompressionStream('gzip'))); } catch { return null; } },
  cacheSet: async (n, t) => { try { await folder.writeFile(fname(n), toB64(await pipe(new TextEncoder().encode(t), new CompressionStream('gzip')))); await folder.writeFile(fname(n + '.at'), btoa(String(Date.now()))); mem.delete(n); } catch { mem.set(n, t); } },
  cacheAge: async n => { try { const b = await folder.readFile(fname(n + '.at')); return b == null ? Infinity : Date.now() - +atob(b); } catch { return Infinity; } },
  toast: m => toast(m),
};
const E = tpEngine(io);
return E.call;`;
const block = '  // ---- les horaires, calculés ici : sur téléphone un plugin n\'a pas de main.js. Même moteur que le plugin PC (engine.js) ----\n  const tp = (() => {\n'
  + (engine + io).replace(/^(?=.)/gm, '    ') + '\n  })();\n';
const idx = rd('index.js'), line = "  const tp = (name, ...a) => ctx.neo.pluginMain('neodex.transports', name, ...a);  // les horaires et le temps réel vivent dans le main.js du plugin\n";
if (!idx.includes(line)) throw new Error('ligne tp introuvable dans index.js');
fs.writeFileSync(OUT, idx.replace(line, block).replace('const MAX_TRIPS = 120000;', 'const MAX_TRIPS = 60000;'));
console.log('écrit : ' + OUT + ' (' + Math.round(fs.statSync(OUT).size / 1024) + ' Ko)');
