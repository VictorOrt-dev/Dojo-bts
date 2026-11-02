// N. Guidage dynamique de l'accueil (lacune par domaine) et fiches mémo (corrections, Carnet).

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s\u00A0\u202F]+/g, ' ').trim();

export default async function ({ t, url: U, navigateur }) {
  t.section('N. Prochaine étape selon les lacunes, fiches mémo sous les corrections et dans le Carnet');
  const memos = await (await fetch(U + 'data/memos.json')).json();

  // ---------- Accueil : lacune en triphasé détectée dans les réponses enregistrées ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.addInitScript(() => {
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      e.stats = { calcul: { sessions: 2, meilleurScore: 4, derniereSession: 1, niveaux: {}, elements: {
        triphase: { essais: 4, reussites: 1 }, intensite: { essais: 4, reussites: 2 }, couplage: { essais: 3, reussites: 1 }, ohm: { essais: 5, reussites: 5 } } } };
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    });
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
    const texte = (await p.textContent('.prochaine')).replace(/\s+/g, ' ');
    const href = await p.getAttribute('.prochaine', 'href');
    t.ok((await p.getAttribute('.prochaine', 'data-type')) === 'lacune' && /Taux d'échec élevé en Triphasé \(64\s%\)/.test(texte) && texte.includes('Lancer la séance ciblée'),
      `accueil : « ${texte.match(/Taux d'échec[^)]*\)/)?.[0]} », avec « Lancer la séance ciblée »`);
    t.ok(href === '#/entrainement/calcul?n=2&d=tri' && (await p.textContent('.prochaine-diagnostic')).includes('TRI 36'), 'encart : réussite par domaine affichée, routage vers les calculs de niveau II en triphasé');
    await p.click('.prochaine'); await p.waitForSelector('.exercice');   // pas de clavier si le 1er calcul est un QCM (couplage)
    const domaines = await p.evaluate(async () => { const c = await import('/js/calcul.js'); return c.sessionEnCours().exercices.map(e => e.generateur.domaines.includes('tri') && e.generateur.niveau === 2); });
    t.ok(domaines.length === 10 && domaines.every(Boolean), 'un toucher lance directement la séance ciblée : 10 calculs de niveau II, tous en triphasé');

    // ---------- Mémo sous une correction de calcul ----------
    const ex = await p.evaluate(async () => { const c = await import('/js/calcul.js'); const s = c.sessionEnCours(); const e = s.exercices[s.index]; return { id: e.generateur.id, choix: !!e.choix }; });
    if (ex.choix) await p.click('.choix-btn >> nth=0'); else { for (const ch of '9999') await p.click(`[data-touche="${ch}"]`); await p.click('.clavier .valider'); }
    await p.waitForSelector('#suivant');
    if (await p.$('.explication.est-faux')) {
      await p.waitForSelector('.memo');
      const attendu = memos.find(m => m.cibles.calcul?.includes(ex.id));
      t.ok(!(await p.evaluate(() => document.querySelector('.memo').open)) && (await p.textContent('.memo summary')).includes('Comprendre la notion') && net(await p.textContent('.memo summary')).includes(net(attendu.titre)),
        `calcul raté : encart replié « Comprendre la notion · ${attendu.titre} » sous la correction`);
      await p.click('.memo summary');
      t.ok(await p.isVisible('.memo-corps') && (await p.textContent('.memo-corps')).length > 150, 'encart déplié : la fiche s\'affiche en 30 secondes de lecture');
    } else t.ok(true, 'calcul juste par hasard : pas de mémo (attendu)');
    t.ok(p.erreurs.length === 0, 'accueil guidé : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Accueil : fondations acquises ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: 'debutant' });
    await p.addInitScript(() => {
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      e.stats = { reco: { sessions: 1, meilleurScore: 9, derniereSession: 1, niveaux: { 1: 9 }, elements: { 'sym-contact-no': { essais: 3, reussites: 3 } } },
        calcul: { sessions: 1, meilleurScore: 8, derniereSession: 1, niveaux: { 1: 8 }, elements: { ohm: { essais: 3, reussites: 3 } } } };
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    });
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
    t.ok((await p.getAttribute('.prochaine', 'data-type')) === 'niveau' && (await p.textContent('.prochaine-titre')).includes('Fondations acquises — Passe au niveau II')
      && /\?n=2$/.test(await p.getAttribute('.prochaine', 'href')), 'niveau I acquis sans lacune : « Fondations acquises — Passe au niveau II », vers un niveau II');
    await contexte.close();
  }

  // ---------- Mémo sous une question ratée et sous un cas de panne ----------
  const { contexte, page: p } = await nouvellePage(navigateur);
  const qs = await (await fetch(U + 'data/reconnaissance.json')).json();
  await p.goto(U + '#/entrainement/reco?n=1'); await p.waitForSelector('.choix-btn');
  const src = await p.getAttribute('.reco-visuel img', 'src');
  const question = (await p.textContent('.question')).replace(/\s/g, '');
  const q = qs.find(x => x.image === src && x.question.replace(/\s/g, '') === question);
  const textes = (await p.locator('.choix-btn').allTextContents()).map(x => x.replace(/\s/g, '').slice(1));
  await p.locator('.choix-btn').nth(textes.findIndex(x => x !== q.nom.replace(/\s/g, ''))).click();
  await p.waitForSelector('.memo');
  t.ok(net(await p.textContent('.memo summary')).includes(net(memos.find(m => m.cibles.reco?.includes(q.id)).titre)), `question ratée (${q.id}) : la fiche mémo correspondante sous la correction`);
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/panne?c=consignation-contacteur'); await p.waitForSelector('.etape');
  await p.click('.choix-btn:has-text("KM2 est retombé")'); await p.waitForSelector('.memo');
  t.ok(net(await p.textContent('.memo summary')).includes('Consignation en 5 temps'), 'démarche dangereuse dans un cas : fiche « Consignation en 5 temps (NF C 18-510) »');

  // ---------- Carnet : toutes les fiches ----------
  await p.goto(U + '#/profil'); await p.waitForSelector('a[href="#/entrainement/memos"]');
  await p.click('a[href="#/entrainement/memos"]'); await p.waitForSelector('.bloc-memos');
  t.ok(await p.locator('.bloc-memos .memo').count() === memos.length && await p.locator('.bloc-memos').count() >= 5, `Carnet › Fiches mémo : les ${memos.length} fiches, rangées par domaine`);
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/memos?m=slt'); await p.waitForSelector('.bloc-memos');
  t.ok(await p.evaluate(() => document.querySelector('.memo[data-memo="slt"]').open) && (await p.textContent('.memo[data-memo="slt"] .memo-schema')).includes('Ra'), 'lien direct vers une fiche : ouverte, avec son schéma en texte');
  t.ok(p.erreurs.length === 0, 'fiches mémo : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();
}
