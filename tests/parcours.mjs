// J. Premier lancement et parcours guidé, dans l'interface : « Où en es-tu ? », « Ta prochaine séance »,
// déblocage souple (mentions, jamais de verrou), test de positionnement, réglage du profil dans le Carnet.

import { nouvellePage } from './outils.mjs';

export default async function ({ t, url: U, navigateur }) {
  t.section('J. Premier lancement et parcours guidé');
  const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
  const etat = () => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}'));
  const qs = await (await fetch(U + 'data/reconnaissance.json')).json();

  // Premier lancement : stockage vide → « Où en es-tu ? »
  await p.goto(U); await p.waitForSelector('[data-profil]');
  t.ok(p.url().endsWith('#/bienvenue') && await p.locator('[data-profil]').count() === 3
    && (await p.textContent('main')).includes('Débutant total') && (await p.textContent('main')).includes('Technicien confirmé'),
    'premier lancement : écran « Où en es-tu ? » à 3 choix');
  await p.click('[data-profil="debutant"]'); await p.waitForSelector('.prochaine');
  t.ok((await etat()).profil === 'debutant' && p.url().endsWith('#/entrainement'), 'choix « Débutant total » enregistré, retour à l\'accueil');

  // Accueil débutant : carte prioritaire en tête, ordre des modes
  const prochaine = await p.evaluate(() => { const a = document.querySelector('.prochaine'); const m = document.querySelector('.modes'); return { href: a.getAttribute('href'), avant: !!(a.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING), texte: a.textContent }; });
  t.ok(prochaine.href === '#/entrainement/reco?n=1' && prochaine.avant && prochaine.texte.includes('Étape 1 sur 10'), '« Ta prochaine séance » en tête : Reconnaissance niveau I, étape 1 sur 10');
  const ordre = await p.$$eval('.modes .mode', l => l.map(a => a.getAttribute('href').split('/').pop()));
  t.ok(ordre.join() === 'reco,calcul,panne,banc', `accueil débutant : ${ordre.join(' → ')}`);
  t.ok((await p.textContent('.mode-banc')).includes('Conseillé après'), 'carte Banc : « Conseillé après un premier cas de panne réussi »');
  const boite = await p.locator('.prochaine').boundingBox();
  t.ok(boite.height >= 64 && (await p.locator('.prochaine-go').boundingBox()).height >= 44, 'carte « Ta prochaine séance » et son bouton : cibles larges (≥ 44 px)');

  // Déblocage souple : mentions, liens toujours actifs
  await p.click('.prochaine'); await p.waitForSelector('.choix-btn');
  t.ok(p.url().endsWith('#/entrainement/reco?n=1'), 'la carte ouvre directement la séance, en un toucher');
  await p.goto(U + '#/entrainement/reco'); await p.waitForSelector('.mode');
  const niveaux = await p.$$eval('.modes .mode', l => l.map(m => ({ lien: m.tagName === 'A', conseil: m.querySelector('.conseil')?.textContent ?? '' })));
  t.ok(!niveaux[0].conseil && niveaux[1].conseil.includes('80 % au niveau I') && niveaux[2].conseil.includes('niveau II') && niveaux.every(n => n.lien),
    'reconnaissance : niveaux II et III « Conseillé après… », mais tous ouvrables (aucun verrou)');
  await p.click('.modes a.mode >> nth=2'); await p.waitForSelector('.choix-btn');
  t.ok(p.url().includes('n=3'), 'niveau III ouvert d\'un toucher malgré la mention');
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/panne'); await p.waitForSelector('.ligne-panne');
  const lignes = await p.$$eval('.ligne-panne', l => l.map(a => ({ niv: a.querySelector('.niv')?.className ?? '', hta: a.textContent.includes('HTA'), conseil: a.querySelector('.conseil')?.textContent ?? '' })));
  t.ok(lignes.filter(l => !l.niv.includes('niv-1')).every(l => l.conseil) && lignes.filter(l => l.hta).every(l => l.conseil.includes('HTA')),
    'cas de panne : niveaux II, III et HTA portent leur mention');

  // Progression : un niveau réussi fait avancer le parcours et lève la mention
  await p.evaluate(() => { const e = JSON.parse(localStorage.getItem('elec-learning:v1')); e.stats.reco = { sessions: 1, meilleurScore: 9, derniereSession: Date.now(), elements: {}, niveaux: { 1: 9 } }; localStorage.setItem('elec-learning:v1', JSON.stringify(e)); });
  await p.goto(U + '#/x'); await p.reload(); await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
  t.ok((await p.getAttribute('.prochaine', 'href')) === '#/entrainement/calcul?n=1' && (await p.textContent('.prochaine')).includes('Étape 2'), 'reconnaissance niveau I réussie (9/10) : la prochaine séance passe aux calculs, étape 2');
  await p.goto(U + '#/entrainement/reco'); await p.waitForSelector('.mode');
  t.ok(!(await p.$$eval('.modes .mode', l => l[1].querySelector('.conseil'))), 'niveau I acquis : plus de mention sur le niveau II');

  // Profil confirmé : test de positionnement
  await p.goto(U + '#/profil'); await p.waitForSelector('.selecteur-profil');
  await p.click('.selecteur-profil [data-profil="confirme"]'); await p.waitForTimeout(200);
  t.ok((await etat()).profil === 'confirme' && (await p.getAttribute('.selecteur-profil [data-profil="confirme"]', 'aria-pressed')) === 'true', 'Carnet : profil changé en « Confirmé »');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
  t.ok((await p.getAttribute('.prochaine', 'href')) === '#/entrainement/positionnement' && (await p.$$eval('.modes .mode', l => l[0].getAttribute('href'))) === '#/entrainement/banc',
    'confirmé : prochaine séance = test de positionnement ; le banc passe en tête');
  const xpAvant = (await etat()).xp ?? 0;
  await p.click('.prochaine');
  let vues = 0;
  const modesVus = new Set();
  for (let i = 0; i < 12; i++) {
    await p.waitForSelector('.choix-btn:not([disabled])');
    // La bonne réponse est lue dans l'état du test (exposé pour les tests), jamais dans le DOM.
    const q = await p.evaluate(async () => { const m = await import('/js/positionnement.js'); const x = m.positionnementEnCours(); const q = x.questions[x.index]; return { bonne: q.choix.indexOf(q.bonne), mode: q.mode, n: q.choix.length }; });
    modesVus.add(q.mode);
    if (q.mode === 'calcul' && (q.bonne < 0 || q.n < 3)) throw new Error('calcul du positionnement sans bonne réponse ou avec moins de 3 choix');
    await p.locator('.choix-btn').nth(q.bonne).click();
    vues++;
    await p.click('#suivant');
  }
  await p.waitForSelector('.bilan');
  const pos = (await etat()).positionnement;
  t.ok(vues === 12 && modesVus.size === 3 && pos?.score === 12 && pos.niveau === 3 && pos.niveaux.calcul === 3 && pos.niveaux.panne === 3 && (await p.textContent('.bilan')).includes('Tout est validé'),
    'test de positionnement : 12 questions (reconnaissance, calcul, cas de panne), 12/12 → niveau III validé dans les trois modes');
  t.ok(((await etat()).xp ?? 0) === xpAvant, 'le test ne rapporte pas d\'XP (pas de farm d\'XP)');
  await p.goto(U + '#/entrainement/panne'); await p.waitForSelector('.ligne-panne');
  t.ok(await p.locator('.ligne-panne .conseil').count() === 0, 'après positionnement : plus aucune mention « Conseillé après… » sur les cas');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
  t.ok((await p.getAttribute('.prochaine', 'href')) === '#/entrainement/banc', 'parcours confirmé repris au banc de mesure');
  await p.goto(U + '#/profil'); await p.waitForSelector('.selecteur-profil');
  t.ok((await p.textContent('main')).includes('Positionnement : 12/12'), 'Carnet : résultat du positionnement affiché, mode par mode');
  t.ok(p.erreurs.length === 0, 'parcours guidé : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();

  // Un utilisateur qui a déjà de la progression n'est jamais renvoyé vers « Où en es-tu ? »
  const { contexte: c2, page: p2 } = await nouvellePage(navigateur, { profil: null });
  await c2.addInitScript(() => { if (!localStorage.getItem('elec-learning:v1')) localStorage.setItem('elec-learning:v1', JSON.stringify({ version: 1, xp: 350, stats: {} })); });
  await p2.goto(U); await p2.waitForSelector('.plaque');
  t.ok(p2.url().endsWith('#/entrainement') || !p2.url().includes('bienvenue'), 'utilisateur existant (350 XP, pas de profil) : accueil direct, sans questionnaire');
  await c2.close();
}
