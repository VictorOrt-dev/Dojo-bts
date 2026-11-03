// Banc de mesure : chaque panne résolue comme le ferait un technicien, au doigt, dans l'interface.
// Vérifie les lectures, les alertes de sécurité, le rapport et la fin d'intervention.

import { nouvellePage as pageNeuve } from './outils.mjs';

// Ces tests portent sur le banc lui-même : l'apprenti a déjà fait le guide « Première intervention »
// (le guide est testé dans tests/ergonomie.mjs).
async function nouvellePage(navigateur) {
  const r = await pageNeuve(navigateur);
  await r.contexte.addInitScript(() => {
    const e = JSON.parse(localStorage.getItem('elec-learning:v1') ?? '{"version":1}');
    if (e.preferences?.tutoBanc) return;
    e.preferences = { ...e.preferences, tutoBanc: true };
    localStorage.setItem('elec-learning:v1', JSON.stringify(e));
  });
  return r;
}

export default async function ({ t, url: U, navigateur }) {
  const { contexte, page: p } = await nouvellePage(navigateur);
  const errs = p.erreurs;
  // L'appareil de mesure arrive replié : on le déplie (barre du bas) avant d'utiliser ses commandes.
  const deplier = async () => { if (await p.$('.poignee-console[aria-expanded="false"]')) await p.click('.poignee-console'); };
  const onglet = async o => { await deplier(); await p.click(`[data-onglet-banc="${o}"]`); };
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

  t.section('I. Banc · indices : chaque panne se résout en suivant seulement les indices');
  for (const id of ['fu1-fondu', 'contact-95-96', 'bobine-coupee', 'cable-pupitre', 'fusible-l2']) {
    await ouvrir(id);
    let gestes = 0;
    while (!(await p.$('.bilan')) && gestes < 20) {
      await p.click('.bouton-indice');
      const suggere = await p.$('[data-suggere="true"]');
      if (suggere) await suggere.click(); else await p.click('#mesurer');
      gestes++;
    }
    const resultat = await etat();
    const rapport = (await p.textContent('main')).replace(/\s+/g, ' ');
    if (id === 'fu1-fondu') {
      t.ok((await p.textContent('.objectif-suivant')).includes('Intervention validée') && /sans indice/.test(await p.textContent('.objectif-suivant'))
        && await p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')).stats.banc.elements['fu1-fondu'].reussites >= 1),
        'réparée avec indices, sans alerte : intervention validée (étape du parcours), objectif suivant « sans indice »');
    }
    t.ok(await p.isVisible('.bilan') && resultat.resolu && resultat.dangers === 0 && /Indices utilisés\s*[1-9]/.test(rapport),
      `${id} : réparée en ${gestes} gestes guidés par les indices, sans alerte de sécurité ; indices comptés au rapport`);
  }
  await ouvrir('cable-pupitre');
  await deplier(); await p.click('[data-fonction="hz"]'); await p.selectOption('#rouge', 's11'); await p.selectOption('#noir', 'n0'); await p.click('#mesurer');
  t.ok((await p.textContent('.note-mesure')).includes('LoZ'), 'lecture qui hésite : « Refais la mesure en LoZ » écrit en clair');
  await p.click('[data-fonction="loz"]'); await p.click('#mesurer');
  t.ok((await p.textContent('.note-mesure')).includes('0 V : pas de tension'), 'lecture à 0 V : « pas de tension entre ces deux points »');
  t.ok(await p.isVisible('.mission') && (await p.textContent('.mission')).includes('Ta mission'), 'la mission est écrite en clair en haut du banc');

  t.section('I. Banc · second circuit : éclairage par télérupteur');
  {
    const bancE = await (await fetch(U + 'data/banc-eclairage.json')).json();
    t.ok(bancE.pannes.length >= 5 && [1, 2, 3].every(n => bancE.pannes.some(x => x.niveau === n))
      && bancE.pannes.every(x => x.pistes?.length && x.risque.length > 60 && x.norme && x.piege && x.ouvre.every(id => bancE.composants.some(c => c.repare.includes(id)))),
      `éclairage : ${bancE.pannes.length} pannes, niveaux I à III, chacune réparable, avec démarche, piège, risque et norme`);
    await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc?circuit=depart-moteur'); await p.waitForSelector('.choix-circuit');
    await p.click('.choix-circuit a:has-text("Éclairage")'); await p.waitForFunction(() => document.querySelector('.titre-chapitre')?.textContent.includes('télérupteur'));
    t.ok((await p.textContent('.titre-chapitre')).includes('télérupteur') && (await p.textContent('.etat-armoire')).includes('Lampe H2')
      && (await p.getAttribute('.choix-circuit a[aria-current="true"]', 'href')).includes('eclairage'), 'choix du circuit : éclairage par télérupteur, voyants lampes et télérupteur');
    // Neutre coupé : 230 V sur le neutre des lampes
    await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc?panne=neutre-boite'); await p.waitForSelector('.tableau-bord');
    await action('essai');
    t.ok((await p.textContent('#resultat-banc')).includes('rien ne s\'allume') && (await p.textContent('.etat-armoire')).includes('position allumé'), 'neutre coupé : le télérupteur bascule, rien ne s\'allume');
    t.ok((await mesure('hz', 'nb', 'PE')).v === '230', 'neutre des lampes à 230 V par rapport à la terre : le piège du neutre coupé');
    t.ok((await mesure('hz', 'd', 'PE')).v === '230', 'la phase arrive bien au retour lampes');
    await ouvrir('contact-kl'); await action('essai');
    t.ok((await mesure('hz', 'd', 'PE')).v === '0' && (await mesure('hz', 'a', 'PE')).v === '230', 'contact brûlé : même symptôme, mais 0 V au retour lampes et 230 V avant le contact');
    // Lampe contrôlée en place : on mesure l'autre lampe en parallèle
    await ouvrir('lampe-h2'); await action('consigner');
    t.ok((await mesure('ohm', 'd2', 'h2n')).v === '2,65', 'lampe H2 mesurée en place : 2,65 kΩ (c\'est H1 en parallèle)');
    await action('controlerFusible', 'h2');
    t.ok((await p.textContent('#resultat-banc')).includes('OL'), 'lampe H2 sortie de sa douille : OL, hors service');
    for (const id of bancE.pannes.map(x => x.id)) {
      await ouvrir(id);
      let gestes = 0;
      while (!(await p.$('.bilan')) && gestes < 20) {
        await p.click('.bouton-indice');
        const suggere = await p.$('[data-suggere="true"]');
        if (suggere) await suggere.click(); else await p.click('#mesurer');
        gestes++;
      }
      const r = await etat();
      t.ok(await p.isVisible('.bilan') && r.resolu && r.dangers === 0, `éclairage · ${id} : réparée en ${gestes} gestes guidés par les indices, sans alerte de sécurité`);
    }
  }

  t.section('I. Banc · troisième circuit : démarrage étoile-triangle');
  {
    const bancET = await (await fetch(U + 'data/banc-etoile-triangle.json')).json();
    t.ok(bancET.pannes.length >= 4 && [1, 2, 3].every(n => bancET.pannes.some(x => x.niveau === n)), `étoile-triangle : ${bancET.pannes.length} pannes, niveaux I à III`);
    await ouvrir('maintien-coupe'); await action('essai');
    t.ok((await p.textContent('#resultat-banc')).includes('dès qu\'on relâche'), 'fil de maintien coupé : démarre tant que Marche est appuyé, s\'arrête au relâchement');
    await ouvrir('basculement-colle'); await action('collegue');
    t.ok((await p.textContent('.etat-armoire')).includes('KM3 étoilecollé') && (await p.textContent('#resultat-banc')).includes('ne bascule pas'), 'KM3 soudé : reste en étoile, KM3 collé, un seul claquement');
    t.ok((await mesure('hz', 'z1', 'n0')).v === '225' && (await mesure('hz', 'z2', 'n0')).v === '0', 'collègue sur Marche : 225 V après le contact 67-68 de KT, 0 V après le verrouillage NF de KM3');
    await action('consigner');
    t.ok((await mesure('ohm', 'U2', 'e')).note.includes('continuité'), 'consigné : un pôle de KM3 reste passant au repos (contacts soudés)');
    await ouvrir('enroulement-desequilibre');
    await onglet('pince'); await p.click('[data-pince="0"]'); await p.click('#pince');
    const l1 = await p.textContent('#resultat-banc');
    await p.click('[data-pince="2"]'); await p.click('#pince');
    t.ok(l1.includes('24,2') && (await p.textContent('#resultat-banc')).includes('31,2'), 'enroulement en court-circuit : courants déséquilibrés en triangle (24,2 A sur L1, 31,2 A sur L3)');
    await action('consigner');
    t.ok((await mesure('ohm', 'U1', 'U2')).v === '2,1' && (await mesure('ohm', 'V1', 'V2')).v === '1,3', 'consigné, couplage ouvert : U1-U2 = 2,1 Ω, V1-V2 = 1,3 Ω');
    for (const id of bancET.pannes.map(x => x.id)) {
      await ouvrir(id);
      let gestes = 0;
      while (!(await p.$('.bilan')) && gestes < 25) {
        await p.click('.bouton-indice');
        const suggere = await p.$('[data-suggere="true"]');
        if (suggere) await suggere.click(); else await p.click('#mesurer');
        gestes++;
      }
      const r = await etat();
      t.ok(await p.isVisible('.bilan') && r.resolu && r.dangers === 0, `étoile-triangle · ${id} : réparée en ${gestes} gestes guidés par les indices, sans alerte de sécurité`);
    }
  }

  t.section('I. Banc · pannes graduées');
  {
    const { contexte: c, page: q } = await nouvellePage(navigateur);
    const niveaux = [];
    for (let i = 0; i < 4; i++) {
      await q.goto(U + '#/entrainement'); await q.goto(U + '#/entrainement/banc'); await q.waitForSelector('.tableau-bord');
      niveaux.push((await q.textContent('.frontispice-banc .surtitre')).match(/Niv\. (I+)/)?.[1]);
    }
    t.ok(niveaux.every(n => n === 'I'), `nouvel apprenti, 4 arrivées au banc : toujours une panne de niveau I (${niveaux.join(', ')})`);
    await c.close();
  }

  t.section('I. Banc · appareil de mesure repliable');
  // Premier passage : appareil replié (ensuite, il garde l'état choisi par l'utilisateur).
  await ouvrir('fu1-fondu');
  if (await p.isVisible('#mesurer')) { await p.click('.poignee-console'); await ouvrir('fu1-fondu'); }
  const barre = await p.locator('.console-banc').boundingBox();
  t.ok(!(await p.isVisible('#mesurer')) && await p.isVisible('.poignee-console') && barre.height <= 80 && barre.y > (await p.evaluate(() => innerHeight)) * 0.7,
    `à l'arrivée : appareil replié en une barre de ${Math.round(barre.height)} px en bas de l'écran, toujours visible`);
  t.ok(await p.isVisible('.mission') && await p.isVisible('.signale-court') && await p.isVisible('.etat-armoire'), 'replié : mission, symptôme et état de l\'armoire visibles d\'emblée');
  await p.click('.poignee-console');
  t.ok(await p.isVisible('#mesurer') && (await p.getAttribute('.poignee-console', 'aria-expanded')) === 'true', 'toucher la barre : l\'appareil se déplie');
  await p.click('#mesurer');
  t.ok(await p.isVisible('#mesurer'), 'il reste déplié pendant les mesures');
  await p.click('.poignee-console');
  t.ok(!(await p.isVisible('#mesurer')) && (await p.textContent('.poignee-lecture')).includes('V'), 'replié à nouveau : la dernière mesure reste lisible dans la barre');
  await p.click('.bouton-indice');
  t.ok(await p.isVisible('#mesurer') && await p.isVisible('.lecon.indice'), '« Indice » depuis la barre repliée : l\'appareil se déplie avec les pointes placées');

  t.section('I. Banc · accès, schéma, abandon');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('a[href="#/entrainement/banc"]');
  await p.click('a[href="#/entrainement/banc"]'); await p.waitForSelector('.tableau-bord');
  t.ok(await p.isVisible('.bon-intervention'), 'accès depuis l\'accueil, panne tirée au sort');
  // Le contenu défile au-dessus de la console fixée : on l'amène en haut de l'écran, comme le ferait le pouce.
  await p.evaluate(() => { const e = [...document.querySelectorAll('summary')].find(x => x.textContent.includes('Schéma de l\'armoire')); scrollBy(0, e.getBoundingClientRect().top - 70); });
  await p.click('summary:has-text("Schéma de l\'armoire")'); await p.waitForTimeout(200);
  t.ok(await p.evaluate(() => { const i = document.querySelector('.schema img'); return i.complete && i.naturalWidth > 0; }), 'schéma affiché');
  await action('abandonner'); await p.waitForSelector('.bilan');
  t.ok((await p.textContent('.bilan-message')).includes('abandonnée') && await p.isVisible('.essentiel .lecon') && await p.isVisible('.essentiel .risque')
    && !(await p.isVisible('.piege-terrain')), 'abandon : la panne et le risque d\'emblée ; démarche et piège repliés');
  await p.click('.en-savoir-plus summary');
  t.ok(await p.isVisible('.reco-domaines') && await p.isVisible('.piege-terrain') && await p.isVisible('.norme') && (await p.textContent('.en-savoir-plus')).includes('démarche d\'un pro'),
    'rapport : « En savoir plus » donne la démarche d\'un pro, le piège et la référence normative');
  t.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  t.ok(errs.length === 0, 'console : ' + (errs.length ? errs.join(' | ') : 'aucune erreur'));
  await contexte.close();
}
