// S. Ouverture aux grands débutants (audit débutant, R1 à R4) : lexique tactile, « Je ne sais pas encore »,
// examen blanc calibré sur le niveau, accueil en clair.

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();
const lire = p => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')));

export default async function ({ t, url: U, navigateur }) {
  t.section('S. Débutants : lexique tactile, « Je ne sais pas encore », examen calibré, accueil en clair');
  const { contexte, page: p } = await nouvellePage(navigateur, { profil: 'debutant' });

  // ---------- R1 · Lexique tactile ----------
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.blocs-parcours');
  await p.waitForSelector('.terme');
  const termes = await p.$$eval('.terme', l => l.map(e => ({ id: e.dataset.terme, dansCommande: !!e.parentElement.closest('button, a, select, summary') })));
  t.ok(termes.length >= 3 && termes.every(x => !x.dansCommande) && new Set(termes.map(x => x.id)).size === termes.length,
    `accueil : ${termes.length} mots du métier touchables (${termes.map(x => x.id).join(', ')}), une seule fois chacun, jamais dans un bouton ou un lien`);
  const mot = p.locator('.terme:visible').first();
  const id = await mot.getAttribute('data-terme');
  await mot.click(); await p.waitForSelector('.bulle-lexique[open]');
  const bulle = net(await p.textContent('.bulle-lexique'));
  t.ok(bulle.includes('Lexique') && net(await p.textContent('.bulle-def')).split(' ').length <= 20, `toucher « ${id} » : sa définition en moins de 20 mots, dans une bulle`);
  await p.click('.bulle-lexique [data-fermer]');
  t.ok(!(await p.isVisible('.bulle-lexique')), '« Compris » referme la bulle');
  await mot.click(); await p.click('.bulle-lexique a'); await p.waitForSelector('.liste-lexique');
  t.ok(await p.locator('.entree-lexique').count() >= 30 && await p.locator(`#lexique-${id}.choisi`).count() === 1,
    '« Tout le lexique » : la liste complète (30 termes et plus), le mot touché mis en évidence');
  await p.goto(U + '#/profil'); await p.waitForSelector('.section-lexique');
  await p.click('.section-lexique a'); await p.waitForSelector('.liste-lexique');
  t.ok(p.url().endsWith('#/entrainement/lexique'), 'Carnet : section « Lexique » qui ouvre le lexique complet');

  // Banc : les termes du bon d'intervention se touchent aussi
  await p.goto(U + '#/entrainement/banc?panne=fu1-fondu'); await p.waitForSelector('.tableau-bord'); await p.waitForTimeout(200);
  t.ok(await p.locator('.bon-intervention .terme').count() >= 2, 'banc : contacteur, relais thermique… touchables dans le bon d\'intervention');

  // ---------- R2 · « Je ne sais pas encore » (reconnaissance) ----------
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/reco?n=1'); await p.waitForSelector('#je-ne-sais-pas');
  const xpAvant = (await lire(p)).xp ?? 0;
  const bouton = await p.locator('#je-ne-sais-pas').boundingBox();
  t.ok(bouton.height >= 44, `« Je ne sais pas encore » sous les choix (${Math.round(bouton.height)} px de haut)`);
  await p.click('#je-ne-sais-pas'); await p.waitForSelector('.est-decouverte'); await p.waitForSelector('.est-decouverte .memo[open]');
  const corr = net(await p.textContent('.explication'));
  t.ok(corr.includes('On le découvre ensemble') && !corr.includes('Pas encore') && corr.includes('La réponse') && await p.locator('.choix-btn.juste').count() === 1 && await p.locator('.choix-btn.faux').count() === 0,
    'reconnaissance : la réponse et l\'explication, sans « Pas encore » ni choix barré');
  t.ok(await p.isVisible('.est-decouverte .memo[open] .memo-corps'), 'la fiche mémo arrive dépliée');
  const etat = await lire(p);
  const el = Object.values(etat.stats.reco.elements)[0];
  t.ok((etat.xp ?? 0) === xpAvant && el.boite === 1 && el.reussites === 0 && !(await p.$('#je-ne-sais-pas')), 'pas d\'XP perdu ; l\'élément part en révision (boîte 1)');

  // ---------- R2 · « Je ne sais pas encore » (calculs) ----------
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/calcul?n=1'); await p.waitForSelector('#je-ne-sais-pas');
  const calc = await p.evaluate(async () => (await import('/js/calcul.js')).sessionEnCours().exercices[0].generateur.id);
  await p.click('#je-ne-sais-pas'); await p.waitForSelector('.est-decouverte');
  const corrC = net(await p.textContent('.explication'));
  t.ok(corrC.includes('On le découvre ensemble') && corrC.includes('Le calcul posé') && !corrC.includes('Pas encore') && !(await p.$('.clavier')),
    `calculs : la réponse et le calcul posé d'emblée, sans verdict (${calc})`);
  t.ok((await lire(p)).stats.calcul.elements[calc].boite === 1 && await p.locator('.borne.decouverte').count() === 1, 'le calcul part en révision ; le bornier le marque à part');

  // ---------- R4 · Examen blanc calibré ----------
  await p.goto(U + '#/entrainement/examen'); await p.waitForSelector('.composition-examen');
  t.ok(net(await p.textContent('.composition-examen')).includes('Calibré sur ton niveau : 10 de niveau I, 5 de niveau II'), 'débutant : examen calibré annoncé (10 de niveau I, 5 de niveau II)');
  await p.click('#commencer-examen'); await p.waitForSelector('.chrono');
  const niveaux = await p.evaluate(async () => (await import('/js/examen.js')).examenEnCours().liste.map(q => q.niveau));
  t.ok(niveaux.length === 15 && !niveaux.includes(3) && niveaux.filter(n => n === 1).length === 10, `examen tiré : ${niveaux.join(' ')} — aucun niveau III`);
  t.ok(await p.locator('.terme').count() === 0, 'pendant l\'examen : aucun mot du lexique touchable (épreuve sans aide)');
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/examen'); await p.waitForSelector('.lien-composition');
  await p.click('.lien-composition'); await p.waitForFunction(() => document.querySelector('.composition-examen')?.textContent.includes('Examen complet, tous niveaux'));
  t.ok(net(await p.textContent('.composition-examen')).includes('5 de niveau I, 5 de niveau II, 5 de niveau III'), 'examen complet au choix : 5 par niveau');

  // ---------- R4 · Accueil en clair ----------
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.blocs-parcours');
  const blocs = net(await p.textContent('.blocs-parcours'));
  t.ok(['très basse tension (TBT, 24 V)', 'Cas haute tension (HTA)', 'haute tension HTA (20 000 V)', 'Calculs en monophasé (230 V)'].every(x => blocs.includes(x)),
    'accueil : les sigles des 3 blocs écrits en clair (TBT, HTA, monophasé)');

  t.ok(p.erreurs.length === 0, 'débutants : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();
}
