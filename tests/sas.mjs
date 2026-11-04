// V. Sas d'entrée : sans profil, l'application est verrouillée, quel que soit le lien d'arrivée ; seul un choix l'ouvre.

import { nouvellePage } from './outils.mjs';

const lire = p => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}'));

export default async function ({ t, url: U, navigateur }) {
  t.section('V. Sas d\'entrée : verrouillé sans profil, déverrouillé par un choix');

  // ---------- Verrouillé par défaut, sur tous les liens ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
    const etats = [];
    for (const h of ['', '#/entrainement', '#/entrainement/banc', '#/entrainement/examen', '#/entrainement/reco?n=1', '#/profil', '#/bienvenue']) {
      await p.goto(U + '#/x'); await p.goto(U + h); await p.waitForSelector('#sas');
      etats.push(await p.evaluate(() => ({
        vue: document.getElementById('vue').childElementCount,
        inertes: ['.topbar', '#vue', '.tabbar'].every(s => document.querySelector(s).inert && document.querySelector(s).getAttribute('aria-hidden') === 'true'),
        modal: document.getElementById('sas').getAttribute('aria-modal') === 'true',
        couvre: (() => { const r = document.getElementById('sas').getBoundingClientRect(); return r.top <= 0 && r.left <= 0 && r.width >= innerWidth && r.height >= innerHeight; })()
      })));
    }
    t.ok(etats.every(e => e.vue === 0 && e.inertes && e.modal && e.couvre),
      `sans profil, 7 entrées (accueil, banc, examen, séance, Carnet, ancien lien…) : sas plein écran, aucun écran rendu dessous, en-tête / écran / onglets inertes`);
    const boutons = await p.$$eval('#sas button, #sas a', l => l.map(b => b.dataset.profil ?? `AUTRE:${b.textContent.trim()}`));
    t.ok(boutons.join() === 'debutant,formation,confirme', 'seulement les 3 choix : ni croix, ni « Plus tard », ni lien de sortie');
    const tailles = await p.$$eval('#sas [data-profil]', l => l.map(b => Math.round(b.getBoundingClientRect().height)));
    t.ok(tailles.every(h => h >= 44), `les 3 choix sont de grands blocs tactiles (${tailles.join(', ')} px de haut)`);
    t.ok((await p.textContent('#sas-titre')).includes('Bienvenue') && (await p.textContent('#sas')).includes('Choisis ton point de départ pour adapter l\'expérience'), 'titre fort : « Bienvenue » et « Choisis ton point de départ pour adapter l\'expérience »');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const sousLeDoigt = await p.evaluate(() => { const r = document.querySelector('.tabbar a[data-onglet="banc"]').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#sas') !== null; });
    t.ok(!!(await p.$('#sas')) && sousLeDoigt && !(await lire(p)).profil, 'Échap ne ferme rien ; toucher l\'onglet « Banc » tombe sur le sas ; aucun profil enregistré');
    // Déverrouillage
    await p.goto(U + '#/entrainement/examen'); await p.waitForSelector('#sas');
    await p.click('#sas [data-profil="formation"]');
    const immediat = (await lire(p)).profil;
    const replie = await p.evaluate(() => document.getElementById('sas')?.classList.contains('se-replie'));
    await p.waitForSelector('#sas', { state: 'detached' }); await p.waitForSelector('.composition-examen');
    const apres = await p.evaluate(() => ({ inertes: ['.topbar', '#vue', '.tabbar'].some(s => document.querySelector(s).inert), profil: document.documentElement.dataset.profil }));
    t.ok(immediat === 'formation' && replie, 'au toucher : profil enregistré tout de suite, le sas se replie (transition)');
    t.ok(!apres.inertes && apres.profil === 'formation' && p.url().endsWith('#/entrainement/examen'), 'puis l\'app s\'ouvre sur la page demandée (examen blanc), plus rien d\'inerte, aux couleurs du profil');
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.pastille-profil');
    t.ok((await p.textContent('.pastille-profil')).includes('En formation') && (await p.getAttribute('.pastille-profil', 'href')) === '#/profil', 'accueil : pastille « En formation » à la couleur du profil, qui mène au Carnet');
    await p.reload(); await p.waitForSelector('.prochaine');
    t.ok(!(await p.$('#sas')), 'rechargement : le sas ne revient pas, le choix est mémorisé');
    // Tout effacer
    p.on('dialog', d => d.accept());
    await p.goto(U + '#/profil'); await p.click('#btn-effacer'); await p.waitForSelector('#sas');
    t.ok(!(await lire(p)).profil, '« Tout effacer » : le sas réapparaît aussitôt');
    await p.reload(); await p.waitForSelector('#sas');
    t.ok(await p.evaluate(() => document.getElementById('vue').childElementCount) === 0, '… et à chaque rechargement tant qu\'aucun profil n\'est choisi');
    await p.click('#sas [data-profil="debutant"]'); await p.waitForSelector('.socle-jeu');
    t.ok(p.url().endsWith('#/entrainement/socle') && (await lire(p)).profil === 'debutant', '« Grand débutant » : direction le socle des 4 piliers');
    t.ok(p.erreurs.length === 0, 'sas : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Avec un profil : jamais de sas ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
    t.ok(!(await p.$('#sas')) && await p.evaluate(() => !document.querySelector('.tabbar').inert), 'profil déjà choisi : accès direct, aucun sas');
    await contexte.close();
  }
}
