// Lance les tests automatisés d'Elec learning.
//
//   node tests/lancer.mjs                    toutes les suites
//   node tests/lancer.mjs unitaires          sans navigateur (solveur du banc, contrôle des sauvegardes)
//   node tests/lancer.mjs non-regression banc parcours service-worker
//
// Code de sortie : 0 si tout passe, 1 en cas d'échec (utilisable par une intégration continue).

import { creerTesteur, demarrerServeur, chargerPlaywright } from './outils.mjs';

const SUITES = {
  'unitaires': { fichier: './unitaires.mjs', navigateur: false, titre: 'Tests unitaires (Node)' },
  'non-regression': { fichier: './non-regression.mjs', navigateur: true, titre: 'Non-régression (navigateur iPhone 13)' },
  'banc': { fichier: './banc.mjs', navigateur: true, titre: 'Parcours du banc de mesure (navigateur iPhone 13)' },
  'parcours': { fichier: './parcours.mjs', navigateur: true, titre: 'Premier lancement et parcours guidé (navigateur iPhone 13)' },
  'service-worker': { fichier: './service-worker.mjs', navigateur: true, titre: 'Service worker en production : réseau lent, hors ligne, mise à jour' }
};

const demandees = process.argv.slice(2);
const inconnues = demandees.filter(n => !SUITES[n]);
if (inconnues.length) {
  console.error(`Suite inconnue : ${inconnues.join(', ')}. Suites disponibles : ${Object.keys(SUITES).join(', ')}.`);
  process.exit(2);
}
const choisies = demandees.length ? demandees : Object.keys(SUITES);

const t = creerTesteur();
const debut = Date.now();
let serveur = null;
let navigateur = null;
try {
  if (choisies.some(n => SUITES[n].navigateur)) {
    serveur = await demarrerServeur();
    navigateur = await chargerPlaywright().chromium.launch();
  }
  for (const nom of choisies) {
    const suite = SUITES[nom];
    console.log(`\n━━━ ${suite.titre} ━━━`);
    const { default: executer } = await import(suite.fichier);
    try {
      await executer({ t, url: serveur?.url, navigateur });
    } catch (err) {
      t.ok(false, `${nom} interrompue : ${err.message.split('\n')[0]}`);
    }
  }
} finally {
  await navigateur?.close();
  await serveur?.arreter();
}

const duree = Math.round((Date.now() - debut) / 1000);
console.log(`\n${t.reussis} vérification${t.reussis > 1 ? 's' : ''} réussie${t.reussis > 1 ? 's' : ''}, ${t.echecs.length} échec${t.echecs.length > 1 ? 's' : ''} (${duree} s).`);
if (t.echecs.length) {
  console.log('\nÉCHECS :');
  t.echecs.forEach(m => console.log(`  ✘ ${m}`));
  process.exit(1);
}
console.log('TOUS LES TESTS PASSENT');
