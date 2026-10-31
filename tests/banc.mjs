// Banc de mesure : chaque panne résolue comme le ferait un technicien, au doigt, dans l'interface.
// Vérifie les lectures, les alertes de sécurité, le rapport et la fin d'intervention.

import { nouvellePage } from './outils.mjs';

export default async function ({ t, url: U, navigateur }) {
  const { contexte, page: p } = await nouvellePage(navigateur);
  const errs = p.erreurs;
  const onglet = async o => { await p.click(`[data-onglet-banc="${o}"]`); };
  const mesure = async (f, r, n) => {
    await onglet('multimetre'); await p.click(`[data-fonction="${f}"]`);
    await p.selectOption('#rouge', r); await p.selectOption('#noir', n); await p.click('#mesurer');
    const v = (await p.textContent('#lecture')).trim(); const note = await p.$('.note-mesure') ? await p.textContent('.note-mesure') : '';
    return { v, note };
  };
  const action = async (a, choix) => {
    await onglet('actions');
    if (a === 'controlerFusible') await p.selectOption('#fusible', choix);
    if (a === 'remplacer') await p.selectOption('#piece', choix);
    await p.click(`[data-action="${a}"]`);
  };
  const ouvrir = async id => { await p.goto(U + '#/entrainement'); await p.goto(U + `#/entrainement/banc?panne=${id}`); await p.waitForSelector('.tableau-bord'); };
  const etat = () => p.evaluate(async () => { const m = await import('/js/banc.js'); const e = m.interventionEnCours(); return { minutes: e.minutes, dangers: e.dangers.length, resolu: e.resolu }; });

  t.section('I. Banc de mesure · fusible de commande FU1');
  await ouvrir('fu1-fondu');
  t.ok((await p.textContent('.etat-armoire')).includes('éteint'), 'voyant H1 éteint');
  t.ok((await mesure('hz', 'c0', 'n0')).v === '229', 'secondaire T1 : 229 V');
  t.ok((await mesure('hz', 'c1', 'n0')).v === '0', 'sortie FU1 : 0 V');
  await action('consigner');
  t.ok(['2,4', '2,40'].includes((await mesure('ohm', 'c0', 'c1')).v), 'FU1 mesuré EN PLACE : 2,4 kΩ (voyant + transformateur en parallèle), pas OL');
  await action('controlerFusible', 'fu1');
  t.ok((await p.textContent('#resultat-banc')).includes('OL'), 'FU1 sorti de son support : OL');
  await action('remplacer', 'fu1'); await action('consigner'); await action('essai');
  t.ok(await p.isVisible('.bilan') && (await p.textContent('.bilan-message')).includes('pro'), 'réparé, diagnostic de pro (rapide, sans danger, sans pièce inutile)');

  t.section('I. Banc · contact 95-96');
  await ouvrir('contact-95-96');
  t.ok((await mesure('hz', 'c1', 'n0')).v === '229' && (await mesure('hz', 'x1', 'n0')).v === '0', '230 V sur 95, 0 V sur 96');
  await action('rearmer');
  t.ok((await p.textContent('#resultat-banc')).includes('ne change rien'), 'réarmer : sans effet (le relais n\'est pas déclenché)');
  await action('consigner');
  t.ok((await mesure('ohm', 'c1', 'x1')).v === 'OL', '95-96 consigné : OL');
  await action('remplacer', 'relais'); await action('consigner'); await action('essai');
  t.ok(await p.isVisible('.bilan'), 'relais remplacé : le moteur tourne');

  t.section('I. Banc · bobine coupée');
  await ouvrir('bobine-coupee');
  const fantA1 = await mesure('hz', 'x2', 'n0');
  t.ok(fantA1.v === '91' && fantA1.note.includes('hésite'), 'A1 au repos, multimètre classique : 91 V fantôme, afficheur instable');
  t.ok((await mesure('loz', 'x2', 'n0')).v === '0', 'A1 au repos en LoZ : 0 V');
  await action('collegue');
  t.ok((await mesure('hz', 'x2', 'n0')).v === '229' && (await p.textContent('.etat-armoire')).includes('retombé'), 'Marche maintenu : 229 V sur A1-A2, et KM1 reste retombé');
  await action('collegue'); await action('consigner');
  t.ok((await mesure('ohm', 'x2', 'n0')).v === 'OL', 'A1-A2 à l\'ohmmètre : OL');
  await action('remplacer', 'bobine'); await action('consigner'); await action('essai');
  t.ok(await p.isVisible('.bilan'), 'bobine remplacée : réparé');

  t.section('I. Banc · câble du pupitre (tension fantôme)');
  await ouvrir('cable-pupitre');
  t.ok((await mesure('hz', 'x1', 'n0')).v === '229', 'X1:1 : 229 V');
  const fant = await mesure('hz', 'x3', 'n0');
  t.ok(fant.v === '91' && fant.note.includes('hésite'), 'KM1:13, multimètre classique : 91 V fantôme');
  t.ok((await mesure('loz', 's11', 'n0')).v === '0', 'S1:11 en LoZ : 0 V, la fantôme disparaît');
  const avantDanger = (await etat()).dangers;
  await mesure('ohm', 'x1', 's11');
  t.ok((await etat()).dangers === avantDanger + 1 && await p.isVisible('.alerte-securite'), 'ohmmètre sans consigner : alerte sécurité, pas de lecture');
  await action('remplacer', 'transfo');
  t.ok((await etat()).dangers === avantDanger + 2, 'remplacer une pièce sans consigner : refusé, alerte sécurité');
  await action('consigner');
  t.ok((await mesure('ohm', 'x1', 's11')).v === 'OL', 'consigné, continuité X1:1 → S1:11 : OL');
  await action('remplacer', 'transfo');
  await action('remplacer', 'cable'); await action('consigner'); await action('essai');
  await p.waitForSelector('.bilan');
  t.ok((await p.textContent('.bilan')).includes('pas en sécurité') && (await p.textContent('main')).includes('Transformateur de commande T1'), 'rapport : alertes sécurité et pièce changée pour rien (T1) signalées');

  t.section('I. Banc · fusible L2 (manque de phase)');
  await ouvrir('fusible-l2');
  t.ok((await p.textContent('.etat-armoire')).includes('déclenché'), 'relais thermique déclenché au départ');
  const l12 = await mesure('hz', 'p1', 'p2');
  t.ok(l12.v === '230' && l12.note.includes('hésite'), 'Q1:2 – Q1:4 : 230 V au lieu de 400 V, instable');
  t.ok((await mesure('loz', 'p1', 'p2')).v === '0' && ['397', '398'].includes((await mesure('hz', 'p1', 'p3')).v), 'LoZ : 0 V ; L1-L3 : ≈ 398 V');
  await action('rearmer');
  await onglet('pince'); await p.click('[data-pince="1"]'); await p.click('#pince');
  t.ok((await p.textContent('#resultat-banc')).replace(/\s/g, ' ').includes('indique 0 A') && (await p.textContent('.etat-armoire')).includes('déclenché'), 'pince sur L2 pendant l\'essai : 0 A, le moteur grogne, le relais redéclenche');
  await action('rearmer'); await onglet('pince'); await p.click('[data-pince="0"]'); await p.click('#pince');
  t.ok((await p.textContent('#resultat-banc')).includes('67') && (await etat()).dangers === 0, 'pince sur L1 : 67 A (démarrage bloqué), 2 essais : pas encore de faute'); await action('rearmer'); await action('essai'); t.ok((await etat()).dangers === 1, '3e essai sur un moteur bloqué = faute de sécurité');
  await action('consigner'); await action('controlerFusible', 'fu-l2');
  t.ok((await p.textContent('#resultat-banc')).includes('OL'), 'cartouche L2 sortie : OL');
  await action('remplacer', 'fusibles'); await action('consigner'); await action('essai');
  t.ok(!(await p.isVisible('.bilan')) && (await p.textContent('#resultat-banc')).includes('ne colle pas'), 'fusibles changés mais relais pas réarmé : rien ne redémarre');
  await action('rearmer'); await action('essai');
  t.ok(await p.isVisible('.bilan'), 'relais réarmé : le moteur tourne');

  t.section('I. Banc · accès, schéma, abandon');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('a[href="#/entrainement/banc"]');
  await p.click('a[href="#/entrainement/banc"]'); await p.waitForSelector('.tableau-bord');
  t.ok(await p.isVisible('.bon-intervention'), 'accès depuis l\'accueil, panne tirée au sort');
  await p.click('summary:has-text("Voir le schéma")'); await p.waitForTimeout(200);
  t.ok(await p.evaluate(() => { const i = document.querySelector('.schema img'); return i.complete && i.naturalWidth > 0; }), 'schéma affiché');
  await action('abandonner'); await p.waitForSelector('.bilan');
  t.ok((await p.textContent('.bilan-message')).includes('abandonnée') && await p.isVisible('.piege-terrain'), 'abandon : la panne et la démarche sont expliquées');
  t.ok(await p.isVisible('.bilan ~ .reco-domaines, .reco-domaines') && await p.isVisible('.risque') && await p.isVisible('.norme'), 'rapport : domaines de la panne, « le risque, en vrai » et référence normative');
  t.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  t.ok(errs.length === 0, 'console : ' + (errs.length ? errs.join(' | ') : 'aucune erreur'));
  await contexte.close();
}
