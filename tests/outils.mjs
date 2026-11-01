// Outils communs aux suites de tests : serveur statique intégré, navigateur, comptage des vérifications.
// Aucune dépendance hors Node, sauf Playwright pour les suites qui pilotent un navigateur.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Vérifications ----------

export function creerTesteur() {
  const t = { reussis: 0, echecs: [] };
  t.ok = (condition, message) => {
    console.log((condition ? '  ✔ ' : '  ✘ ') + message);
    if (condition) t.reussis++; else t.echecs.push(message);
    return !!condition;
  };
  t.section = titre => console.log(`\n${titre}`);
  return t;
}

// ---------- Serveur statique (équivalent de « python3 -m http.server ») ----------

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8'
};

// options.version : simule un déploiement (remplace VERSION = 'dev' dans sw.js, comme le workflow GitHub).
// options.delai : retard de chaque réponse, en ms (réseau faible : barres affichées, réseau inutilisable).
// Les deux se changent en cours de test avec serveur.regler({ version, delai }).
export function demarrerServeur(racine = RACINE, options = {}) {
  const reglages = { version: null, delai: 0, ...options };
  const serveur = http.createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.normalize(path.join(racine, chemin));
    if (!fichier.startsWith(racine)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) fichier = path.join(fichier, 'index.html');
    fs.readFile(fichier, (err, contenu) => {
      const repondre = () => {
        if (err) { res.writeHead(404).end('introuvable'); return; }
        if (reglages.version && path.basename(fichier) === 'sw.js') {
          contenu = Buffer.from(contenu.toString('utf8').replace("const VERSION = 'dev';", `const VERSION = '${reglages.version}';`));
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(contenu);
      };
      if (reglages.delai) setTimeout(repondre, reglages.delai); else repondre();
    });
  });
  return new Promise(resolve => serveur.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${serveur.address().port}/`,
    regler: r => Object.assign(reglages, r),
    // closeAllConnections : une requête retardée ne doit pas bloquer l'arrêt du serveur.
    arreter: () => new Promise(r => { serveur.closeAllConnections?.(); serveur.close(r); })
  })));
}

// ---------- Navigateur ----------

// require() (et non import) : il suit NODE_PATH, donc trouve aussi un Playwright installé globalement.
export function chargerPlaywright() {
  const require = createRequire(path.join(RACINE, 'tests', 'outils.mjs'));
  try {
    return require('playwright');
  } catch {
    console.error('\nPlaywright est introuvable. Installe-le une fois (voir README, « Tests automatisés ») :\n'
      + '  npm install --no-save playwright && npx playwright install chromium\n');
    process.exit(2);
  }
}

// Page iPhone 13 qui collecte les erreurs de console et les exceptions.
// profil : profil enregistré avant le premier affichage, pour que les suites qui ne testent pas le premier
// lancement arrivent directement sur l'accueil ; null = vrai premier lancement (écran « Où en es-tu ? »).
export async function nouvellePage(navigateur, { profil = 'formation', ...options } = {}) {
  const { devices } = chargerPlaywright();
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'], ...options });
  if (profil) {
    await contexte.addInitScript(p => {
      if (sessionStorage.getItem('elec-learning:test-profil')) return;
      sessionStorage.setItem('elec-learning:test-profil', '1');
      if (!localStorage.getItem('elec-learning:v1') && !localStorage.getItem('dojo:v1')) {
        localStorage.setItem('elec-learning:v1', JSON.stringify({ version: 1, profil: p }));
      }
    }, profil);
  }
  const page = await contexte.newPage();
  page.erreurs = [];
  page.on('console', m => m.type() === 'error' && page.erreurs.push(m.text()));
  page.on('pageerror', e => page.erreurs.push(e.message));
  return { contexte, page };
}
