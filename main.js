// Transports : le côté système du plugin sur PC, chargé par NeoDex une fois le plugin signé et l'accès complet accordé.
// Les horaires sont calculés par engine.js (le même moteur que sur téléphone) ; ici, seulement le téléchargement, la décompression et le cache.
const { app } = require('electron');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const tpEngine = require('./engine.js');

const DIR = () => path.join(app.getPath('userData'), 'transports');
const file = n => path.join(DIR(), ...n.split('/'));
const MAX = 120 * 1024 * 1024;  // une archive d'horaires plus grosse n'est pas téléchargée
async function fetchBin(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'NeoDex-transports' } });
  if (!r.ok) throw new Error('erreur ' + r.status);
  if (+r.headers.get('content-length') > MAX) throw new Error('fichier trop gros');
  const b = new Uint8Array(await r.arrayBuffer()); if (b.length > MAX) throw new Error('fichier trop gros');
  return b;
}
const engine = tpEngine({
  fetchBin,
  fetchText: async url => new TextDecoder().decode(await fetchBin(url)),
  inflate: async u8 => new Uint8Array(zlib.inflateRawSync(u8)),
  cacheGet: n => { try { return fs.readFileSync(file(n), 'utf8'); } catch { return null; } },
  cacheSet: (n, t) => { try { fs.mkdirSync(path.dirname(file(n)), { recursive: true }); fs.writeFileSync(file(n), t); } catch {} },
  cacheAge: n => { try { return Date.now() - fs.statSync(file(n)).mtimeMs; } catch { return Infinity; } },
  maxTrips: 120000,  // l'Île-de-France entière (près de 400 000 trajets) demanderait plusieurs Go de mémoire
});

module.exports = ({ ipcMain }) => {
  for (const n of ['tp:networks', 'tp:search', 'tp:next', 'tp:trip', 'tp:route']) ipcMain.handle(n, (_, ...a) => engine.call(n, ...a));
};
module.exports.engine = engine;
