// Service worker d'Elec learning : l'app fonctionne hors connexion (atelier, sous-sol, transports).
// Stratégie « réseau d'abord » : en ligne, on reçoit toujours la dernière version publiée (pas de numéro
// de version à penser à changer) ; hors ligne, ou si le réseau met plus de 3 s, on sert la copie en cache.
// Tous les fichiers sont mis en cache dès l'installation, pour que chaque écran marche hors ligne.
// Ajouter un fichier à l'app = l'ajouter aussi dans FICHIERS (les tests automatiques le vérifient).

const CACHE = 'elec-learning';
const DELAI_RESEAU = 3000; // ms

const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/atelier.js',
  'js/banc.js',
  'js/calcul.js',
  'js/circuit.js',
  'js/difficulte.js',
  'js/domaines.js',
  'js/entrainement.js',
  'js/hasard.js',
  'js/mise-en-page.js',
  'js/panne.js',
  'js/profil.js',
  'js/quiz.js',
  'js/sauvegarde.js',
  'js/storage.js',
  'js/theme.js',
  'js/tuteur.js',
  'js/util.js',
  'js/xp.js',
  'data/banc-depart-moteur.json',
  'data/pannes.json',
  'data/reconnaissance.json',
  'fonts/atkinson-hyperlegible-latin-400-italic.woff2',
  'fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  'fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  'fonts/jetbrains-mono-greek-500-normal.woff2',
  'fonts/jetbrains-mono-greek-700-normal.woff2',
  'fonts/jetbrains-mono-latin-500-normal.woff2',
  'fonts/jetbrains-mono-latin-700-normal.woff2',
  'fonts/young-serif-latin-400-normal.woff2',
  'img/banc/depart-moteur.svg',
  'img/icon-180.png',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon.svg',
  'img/reco/mat-arret-urgence.svg',
  'img/reco/mat-contacteur.svg',
  'img/reco/mat-disjoncteur-modulaire.svg',
  'img/reco/mat-disjoncteur-moteur.svg',
  'img/reco/mat-relais-thermique.svg',
  'img/reco/sym-bobine.svg',
  'img/reco/sym-alim-dc.svg',
  'img/reco/sym-bp-nf.svg',
  'img/reco/sym-bp-no.svg',
  'img/reco/sym-contact-nf.svg',
  'img/reco/sym-contact-no.svg',
  'img/reco/sym-differentiel.svg',
  'img/reco/sym-diode.svg',
  'img/reco/sym-disjoncteur.svg',
  'img/reco/sym-fusible.svg',
  'img/reco/sym-moteur.svg',
  'img/reco/sym-sectionneur-terre.svg',
  'img/reco/sym-sectionneur.svg',
  'img/reco/sym-terre-protection.svg',
  'img/reco/sym-thermique.svg',
  'img/reco/sym-transfo.svg',
  'img/reco/sym-voyant.svg'
];

self.addEventListener('install', ev => {
  // cache: 'reload' : ne pas reprendre une copie périmée du cache HTTP du navigateur.
  ev.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const requete = ev.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== location.origin) return;
  ev.respondWith(reseauDabord(requete));
});

async function reseauDabord(requete) {
  const cache = await caches.open(CACHE);
  const reseau = fetch(requete).then(reponse => {
    if (reponse.ok) cache.put(requete, reponse.clone());
    return reponse;
  });
  try {
    return await Promise.race([
      reseau,
      new Promise((_, refus) => setTimeout(() => refus(new Error('réseau trop lent')), DELAI_RESEAU))
    ]);
  } catch {
    // ignoreSearch : css/style.css?v=6 retrouve css/style.css en cache.
    const copie = await cache.match(requete, { ignoreSearch: true });
    if (copie) {
      reseau.catch(() => {}); // la réponse réseau, si elle finit par arriver, met juste le cache à jour
      return copie;
    }
    return reseau; // rien en cache : on attend le réseau (ou son erreur)
  }
}
