// K. Service worker en conditions de production (VERSION injectée, comme le fait le déploiement GitHub) :
// ouverture instantanée depuis le cache même quand le réseau répond mal, hors ligne franc, mise à jour en
// arrière-plan proposée par un bandeau, ancien cache supprimé. Serveur dédié : on y règle version et latence.

import { demarrerServeur, nouvellePage } from './outils.mjs';

const LENT = 8000;        // ms : réseau « barres affichées, inutilisable » (sous-sol, local technique)
const INSTANTANE = 1500;  // ms : ouverture attendue depuis le cache (marge pour une machine d'intégration lente)

export default async function ({ t, navigateur }) {
  t.section('K. Service worker : cache d\'abord, mises à jour en arrière-plan');
  const serveur = await demarrerServeur(undefined, { version: 'test-1' });
  const U = serveur.url;
  const { contexte, page: p } = await nouvellePage(navigateur);
  try {
    const caches = () => p.evaluate(() => caches.keys());
    await p.goto(U); await p.waitForSelector('.plaque');
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await p.waitForSelector('.plaque');
    t.ok(await p.evaluate(() => !!navigator.serviceWorker.controller) && (await caches()).includes('elec-learning-test-1'),
      'version déployée « test-1 » installée : cache elec-learning-test-1');

    // Réseau faible : chaque réponse met 8 s. L'app doit s'ouvrir depuis le cache, sans attendre.
    serveur.regler({ delai: LENT });
    let t0 = Date.now();
    await p.reload({ waitUntil: 'commit' }); await p.waitForSelector('.plaque');
    const ouverture = Date.now() - t0;
    t.ok(ouverture < INSTANTANE, `réseau à ${LENT / 1000} s par requête : app ouverte en ${ouverture} ms depuis le cache (ancienne stratégie « réseau d'abord » : 15,4 s mesurées)`);
    t0 = Date.now();
    await p.click('.tabbar a[data-onglet="banc"]'); await p.waitForSelector('.tableau-bord');
    const banc = Date.now() - t0;
    t.ok(banc < INSTANTANE, `réseau lent : banc de mesure (schéma et données du circuit) ouvert en ${banc} ms`);
    serveur.regler({ delai: 0 });

    // Hors ligne franc
    await contexte.setOffline(true);
    await p.goto(U + '#/entrainement'); await p.reload(); await p.waitForSelector('.plaque');
    await p.goto(U + '#/entrainement/calcul?n=3&d=hta'); await p.waitForSelector('.clavier');
    t.ok(true, 'hors ligne franc : accueil et calculs HTA disponibles');
    await contexte.setOffline(false);

    // Nouvelle mise en ligne : installée en arrière-plan, proposée par un bandeau, jamais imposée en pleine séance.
    serveur.regler({ version: 'test-2' });
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.plaque');
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await p.waitForSelector('.bandeau-maj', { timeout: 20000 });
    const avant = await caches();
    t.ok(avant.includes('elec-learning-test-2') && avant.includes('elec-learning-test-1')
      && await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting)),
      'mise à jour téléchargée d\'un bloc dans un cache neuf, en attente : l\'ancienne version reste en service');
    t.ok((await p.textContent('.bandeau-maj')).includes('Nouvelle version prête'), 'bandeau « Nouvelle version prête » affiché, avec « Recharger »');
    await Promise.all([p.waitForEvent('load'), p.click('.bandeau-maj button')]);
    await p.waitForSelector('.plaque');
    const apres = await caches();
    t.ok(apres.includes('elec-learning-test-2') && !apres.includes('elec-learning-test-1') && !(await p.$('.bandeau-maj')),
      '« Recharger » : nouvelle version active, ancien cache supprimé, bandeau disparu');
    t.ok(p.erreurs.filter(e => !/Failed to load resource/.test(e)).length === 0, 'service worker : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  } finally {
    await contexte.close();
    await serveur.arreter();
  }
}
