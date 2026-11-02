// Service worker d'Elec learning : l'app s'ouvre instantanément, même en sous-sol ou en zone blanche.
//
// EN PRODUCTION (VERSION injectée par le déploiement, .github/workflows/test.yml) : « cache d'abord ».
//   - Chaque fichier de l'app est servi depuis le cache local, sans attendre le réseau : ouverture immédiate,
//     même quand le réseau répond mal (barres affichées, réseau inutilisable).
//   - Chaque mise en ligne change VERSION, donc le contenu de sw.js : le navigateur installe la nouvelle version
//     EN ARRIÈRE-PLAN, télécharge TOUS les fichiers d'un bloc dans un cache neuf (cache.addAll : tout ou rien),
//     puis attend. Jamais de mélange d'anciens et de nouveaux fichiers.
//   - La nouvelle version prend la main quand l'utilisateur touche « Recharger » sur le bandeau de mise à jour
//     (js/mise-a-jour.js), ou d'elle-même au prochain lancement à froid de l'app.
// EN DÉVELOPPEMENT (VERSION = 'dev', serveur local) : « réseau d'abord », pour voir ses modifications aussitôt ;
//   la copie en cache ne sert que si le réseau ne répond pas en 3 s.
//
// Ajouter un fichier à l'app = l'ajouter aussi dans FICHIERS (les tests automatiques le vérifient).

const VERSION = 'dev';
const CACHE = `elec-learning-${VERSION}`;
const PRODUCTION = VERSION !== 'dev';
const DELAI_RESEAU = 3000; // ms, développement seulement

const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/atelier.js',
  'js/banc.js',
  'js/bienvenue.js',
  'js/calcul.js',
  'js/circuit.js',
  'js/difficulte.js',
  'js/domaines.js',
  'js/entrainement.js',
  'js/hasard.js',
  'js/mise-a-jour.js',
  'js/mise-en-page.js',
  'js/panne.js',
  'js/parcours.js',
  'js/positionnement.js',
  'js/profil.js',
  'js/quiz.js',
  'js/sauvegarde.js',
  'js/storage.js',
  'js/theme.js',
  'js/tuteur.js',
  'js/normes.js',
  'js/leitner.js',
  'js/revision.js',
  'js/isolement.js',
  'js/banc-profils.js',
  'js/memos.js',
  'js/guidage.js',
  'js/badges.js',
  'js/insignes.js',
  'js/blocs.js',
  'js/util.js',
  'js/xp.js',
  'data/banc-depart-moteur.json',
  'data/pannes.json',
  'data/isolement.json',
  'data/banc-eclairage.json',
  'data/memos.json',
  'data/reconnaissance.json',
  'fonts/archivo-latin-400-normal.woff2',
  'fonts/archivo-latin-500-normal.woff2',
  'fonts/archivo-latin-700-normal.woff2',
  'fonts/archivo-latin-800-normal.woff2',
  'fonts/jetbrains-mono-greek-500-normal.woff2',
  'fonts/jetbrains-mono-greek-700-normal.woff2',
  'fonts/jetbrains-mono-latin-500-normal.woff2',
  'fonts/jetbrains-mono-latin-700-normal.woff2',
  'img/banc/depart-moteur.svg',
  'img/banc/eclairage.svg',
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
  'img/reco/sym-voyant.svg',
  'img/reco/mat-multimetre.svg',
  'img/reco/mat-vat.svg',
  'img/reco/mat-cadenas.svg',
  'img/reco/mat-conducteurs.svg',
  'img/reco/mat-capteur.svg',
  'img/reco/sym-renvoi.svg',
  'img/reco/mat-megohmmetre.svg'
];

self.addEventListener('install', ev => {
  // cache: 'reload' : ne pas reprendre une copie périmée du cache HTTP du navigateur.
  // Si un seul fichier manque, l'installation échoue et l'ancienne version reste en service.
  ev.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => { if (!PRODUCTION) return self.skipWaiting(); })
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c.startsWith('elec-learning') && c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// Le bandeau « Nouvelle version prête » demande d'activer la version en attente.
self.addEventListener('message', ev => {
  if (ev.data === 'activer') self.skipWaiting();
});

self.addEventListener('fetch', ev => {
  const requete = ev.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== location.origin) return;
  ev.respondWith(PRODUCTION ? cacheDabord(requete) : reseauDabord(requete));
});

async function cacheDabord(requete) {
  const cache = await caches.open(CACHE);
  // ignoreSearch : css/style.css?v=7 retrouve css/style.css ; une navigation retrouve la page de l'app.
  const copie = await cache.match(requete, { ignoreSearch: true })
    ?? (requete.mode === 'navigate' ? await cache.match('./') : undefined);
  if (copie) return copie;
  // Hors de l'app (fichier non listé) : réseau, gardé en cache pour la prochaine fois.
  const reponse = await fetch(requete);
  if (reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

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
    const copie = await cache.match(requete, { ignoreSearch: true });
    if (copie) {
      reseau.catch(() => {}); // la réponse réseau, si elle finit par arriver, met juste le cache à jour
      return copie;
    }
    return reseau; // rien en cache : on attend le réseau (ou son erreur)
  }
}
