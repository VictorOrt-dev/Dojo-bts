// Non-régression de l'application, dans un navigateur iPhone 13 piloté par Playwright.
// A. contenus et générateurs · B. Reconnaissance · C. Calculs · D. Cours · E. Cas de panne ·
// F. ancien nom · G. hors connexion · H. import de sauvegarde sécurisé.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RACINE, nouvellePage } from './outils.mjs';

// Fichiers que l'app doit mettre en cache pour marcher hors connexion (comparés à la liste FICHIERS de sw.js).
function fichiersDeLApp() {
  const lister = (dossier, ext) => fs.readdirSync(path.join(RACINE, dossier)).filter(f => ext.some(e => f.endsWith(e))).map(f => `${dossier}/${f}`);
  return [
    ...lister('js', ['.js']), ...lister('data', ['.json']), ...lister('fonts', ['.woff2']),
    ...lister('img', ['.png', '.svg']), ...lister('img/reco', ['.svg']), ...lister('img/banc', ['.svg']),
    'css/style.css', 'index.html', 'manifest.webmanifest'
  ];
}

export default async function ({ t, url: U, navigateur }) {
  const dossierTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'elec-learning-'));
  const { contexte: ctx, page: p } = await nouvellePage(navigateur, { acceptDownloads: true });
  const errs = p.erreurs;
  await p.addInitScript(() => { window.__toasts = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList?.contains('toast') && window.__toasts.push(n.textContent)))).observe(document, { childList: true, subtree: true }); });
  await p.clock.install();
  const xpDe = () => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}').xp ?? 0);
  const etat = () => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}'));

  t.section('A. Contenus et générateurs');
  await p.goto(U); await p.waitForSelector('.plaque');
  const r = await p.evaluate(async () => {
    const c = await import('/js/calcul.js'); const r3 = Math.sqrt(3), rho = 0.0225, tan = x => Math.tan(Math.acos(x)), res = {};
    const att = (id, ex) => { const d = ex.donnees;
      switch (id) {
        case 'ohm': return { V: d.R * d.I, A: d.I, 'Ω': d.R }[ex.unite];
        case 'puissance': return { UI: d.U * d.I, RI2: d.R * d.I ** 2, U2R: d.U ** 2 / d.R, energie: d.P * d.t / 1000 }[d.type];
        case 'tension-attendue': return d.type === 'mesure' ? (d.depart - d.arrivee) / 230 * 100 : d.depart - 2 * rho * d.L * d.I / d.S;
        case 'charge-moteur': return (d.mesures[0] + d.mesures[1] + d.mesures[2]) / 3 / d.In * 100;
        case 'desequilibre': { const m = (d.valeurs[0] + d.valeurs[1] + d.valeurs[2]) / 3; return Math.max(...d.valeurs.map(v => Math.abs(v - m))) / m * 100; }
        case 'triphase': { const S = r3 * 400 * d.I / 1000; return { kW: S * d.cos, kVA: S, kvar: S * Math.sqrt(1 - d.cos ** 2) }[ex.unite]; }
        case 'intensite': return d.Pu * 1000 / (r3 * 400 * d.eta * d.cos);
        case 'couplage': if (ex.choix) return d.plaque === '230/400 V' ? 'Étoile' : 'Triangle'; if (d.U) return d.U / r3; if (d.Id) return d.Id / 3; return d.I / r3;
        case 'chute-mono': { const du = 2 * rho * d.L * d.I / d.S; return d.en === 'V' ? du : du / 2.3; }
        case 'chute-tri': return r3 * rho * d.L * d.I / d.S / 4;
        case 'compensation': return d.P * (tan(d.cos1) - tan(d.cos2));
        case 'boucherot': { const S = Math.hypot(d.P1 + d.P2, d.P1 * tan(d.cos1)); return ex.unite === 'kVA' ? S : S * 1000 / (r3 * 400); }
        case 'alim-24v': return (d.api + d.nCapteurs * 0.025 + d.nEv * d.pEv / 24) * 1.25;
        case 'chute-24v': return 24 - 2 * rho * d.L * (d.P / 24) / d.S;
        case 'contact-tt': return d.type === 'uc' ? d.Ra * 230 / (d.Ra + d.Rb) : 50 / (d.IdnMA / 1000);
        case 'hta-courant': return d.type === 'in' ? d.S / (r3 * 20) : d.Ibt * 0.4 / 20;
        case 'tensions-reseau': return d.demande === 'V' ? d.U / r3 : d.U;
        case 'courant-corps': return d.U / d.R * 1000;
        case 'rapport-transfo': return d.U1 * 410 / 20;
        case 'prise-transfo': return d.U1 * 410 / (20 * (1 + d.p / 100));
        case 'lmax-tn': return 0.8 * 230 * d.S / (rho * 2 * d.k * d.In);
        case 'boucle-4-20': return d.type === 'mesure' ? d.P * (d.I - 4) / 16 : 24 - 0.02 * (d.Re + d.Rc);
        case 'neutre-coupe': { const R1 = 230 ** 2 / d.P1, R2 = 230 ** 2 / d.P2; return 400 * R1 / (R1 + R2); }
        case 'transfo': { const In = d.S * 1000 / (r3 * 400); return d.demande === 'In' ? In : In * 100 / d.ucc / 1000; }
      } };
    for (const g of c.GENERATEURS) { const pb = [];
      for (let i = 0; i < 300; i++) { const ex = g.creer(), a = att(g.id, ex);
        const textes = [ex.enonce, ex.solution, ex.explication, ex.piege].join(' ');
        if (!ex.explication || !ex.piege || !ex.solution || /NaN|undefined|Infinity/.test(textes)) pb.push('texte');
        else if (ex.choix ? ex.reponse !== a : Math.abs(ex.reponse - a) > 1e-9 * Math.abs(a)) pb.push(`valeur ${ex.reponse} ≠ ${a}`);
        else if (!ex.choix) {
          const t = ex.tolerance ?? c.TOLERANCE;
          if (!c.estJuste(ex.reponse * (1 + t * 0.95), ex.reponse, t) || c.estJuste(ex.reponse * (1 + t * 1.05), ex.reponse, t)) pb.push('tolérance');
          for (const e of ex.erreurs ?? []) {
            if (c.estJuste(e.valeur, ex.reponse, ex.tolerance)) pb.push(`erreur type trop proche de la bonne réponse (${g.id})`);
            if (c.diagnostiquer(ex, e.valeur) === null) pb.push('erreur type non diagnostiquée');
          }
          if (c.diagnostiquer(ex, ex.reponse * 1000) === null) pb.push('unité ×1000 non diagnostiquée');
        } }
      res[g.id] = { niveau: g.niveau, pb: [...new Set(pb)] }; }
    const parNiveau = [1, 2, 3].map(n => c.GENERATEURS.filter(g => g.niveau === n).length);
    const ids = c.GENERATEURS.map(g => g.id);
    const sessionsOk = [1, 2, 3].every(n => c.creerSession(n).exercices.length === 10 && c.creerSession(n).exercices.every(e => e.generateur.niveau === n));
    const domainesValides = ['tbt-cc', 'mono-bt', 'tri', 'securite', 'hta'];
    const metaOk = c.GENERATEURS.every(g => g.domaines?.length && g.domaines.every(d => domainesValides.includes(d)) && g.risque?.length > 60);
    const parDomaine = Object.fromEntries(domainesValides.map(d => [d, c.GENERATEURS.filter(g => g.domaines.includes(d)).length]));
    const filtreOk = [1, 2, 3].every(n => domainesValides.every(d => { const g = c.generateursDe(n, d); return !g.length || c.creerSession(n, d).exercices.every(e => e.generateur.domaines.includes(d) && e.generateur.niveau === n); }));
    return { res, parNiveau, sessionsOk, ids, metaOk, parDomaine, filtreOk };
  });
  for (const [id, v] of Object.entries(r.res)) if (v.pb.length) t.ok(false, `${id} : ${v.pb.join(' | ')}`);
  t.ok(Object.values(r.res).every(v => !v.pb.length), `${r.ids.length} générateurs × 300 tirages : valeurs justes, explication + piège + calcul posé présents, erreurs types diagnostiquées`);
  t.ok(!r.ids.includes('resistances') && ['tension-attendue', 'charge-moteur', 'desequilibre'].every(id => r.ids.includes(id)), 'résistances série/parallèle retirées ; 3 calculs de valeurs attendues ajoutés (tension au récepteur, charge moteur, déséquilibre)');
  t.ok(r.parNiveau.every(n => n >= 3) && r.sessionsOk, `générateurs par niveau : ${r.parNiveau.join(' / ')} ; une séance ne tire que dans son niveau`);
  t.ok(r.metaOk, 'chaque calcul : domaine(s) valide(s) et risque humain / machine rédigé');
  t.ok(Object.values(r.parDomaine).every(n => n > 0), `calculs dans les 5 domaines : ${Object.entries(r.parDomaine).map(([d, n]) => `${d} ${n}`).join(', ')}`);
  t.ok(r.filtreOk, 'séance filtrée par domaine : uniquement des calculs de ce domaine et de ce niveau');

  const qs = await p.evaluate(() => fetch('data/reconnaissance.json').then(r => r.json()));
  const DOMAINES = ['tbt-cc', 'mono-bt', 'tri', 'securite', 'hta'];
  t.ok(qs.length >= 30 && [1, 2, 3].every(n => qs.filter(q => q.niveau === n).length >= 10) && new Set(qs.map(q => q.id)).size === qs.length, `reconnaissance : ${qs.length} questions, au moins 10 par niveau (${[1, 2, 3].map(n => qs.filter(q => q.niveau === n).length).join(' / ')}), ids uniques`);
  t.ok(qs.every(q => q.domaines?.length && q.domaines.every(d => DOMAINES.includes(d)) && q.risque?.length > 60 && q.norme), 'chaque question : domaine(s) valide(s), risque humain / machine, référence normative');
  t.ok(DOMAINES.every(d => qs.some(q => q.domaines.includes(d))), 'reconnaissance : les 5 domaines ont des questions');
  t.ok(qs.every(q => q.faux.length === 3 && new Set([q.nom, ...q.faux]).size === 4 && q.explication && q.reperage && q.role
    && Object.keys(q.pourquoiPas).sort().join('|') === [...q.faux].sort().join('|') && Object.values(q.pourquoiPas).every(Boolean)), 'chaque question : explication + un « pourquoi pas » par mauvaise réponse');
  // Biais de longueur : options de longueur comparable, bonne réponse pas plus souvent la plus longue que le hasard.
  const pannesBiais = await p.evaluate(() => fetch('data/pannes.json').then(r => r.json()));
  const groupes = [
    ...qs.map(q => ({ bon: q.nom, autres: q.faux })),
    ...pannesBiais.flatMap(c => c.etapes.map(e => ({ bon: e.choix.find(x => x.verdict === 'bon').texte, autres: e.choix.filter(x => x.verdict !== 'bon').map(x => x.texte) })))
  ];
  const ecartMax = Math.max(...groupes.map(g => { const l = [g.bon, ...g.autres].map(t => t.length); return Math.max(...l) / Math.min(...l); }));
  const plusLongue = groupes.filter(g => g.bon.length > Math.max(...g.autres.map(t => t.length))).length;
  t.ok(ecartMax <= 1.45, `longueurs équilibrées : la plus longue option fait au plus ${ecartMax.toFixed(2)} × la plus courte (limite 1,45)`);
  t.ok(plusLongue / groupes.length <= 0.35, `bonne réponse strictement la plus longue : ${plusLongue}/${groupes.length} (${Math.round(plusLongue / groupes.length * 100)} %, limite 35 %, avant 34/50)`);
  // Images : aucun repère ni calibre écrit sur le matériel ou les symboles (sauf « M 3~ », qui fait partie du symbole moteur).
  const textesImages = [];
  for (const src of new Set(qs.map(q => q.image))) {
    const svg = await p.evaluate(u => fetch(u).then(r => r.text()), src);
    for (const m of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) if (!(src.includes('sym-moteur') && ['M', '3~'].includes(m[1]))) textesImages.push(`${src} : ${m[1]}`);
  }
  t.ok(textesImages.length === 0, 'aucune réponse écrite dans les images' + (textesImages.length ? ' — ' + textesImages.join(', ') : ''));

  let imagesOk = true; for (const src of new Set(qs.map(q => q.image))) if (await p.evaluate(u => fetch(u).then(r => r.status), src) !== 200) imagesOk = false;
  t.ok(imagesOk, `les ${new Set(qs.map(q => q.image)).size} images répondent`);

  t.section('B. Reconnaissance par niveau');
  const jouer = async (bon, controle) => {
    for (let i = 0; i < 10; i++) {
      await p.waitForSelector('.choix-btn:not([disabled])');
      const src = await p.getAttribute('.reco-visuel img', 'src');
      const question = await p.textContent('.question');
      const norm = s => s.replace(/\s+/g, ' ').trim();
      const q = qs.find(x => x.image === src && norm(question) === norm(x.question).replace(/\s+\?/, ' ?') || x.image === src && norm(question).replace(/\s/g, '') === x.question.replace(/\s/g, ''));
      const textes = (await p.locator('.choix-btn').allTextContents()).map(t => norm(t).slice(1).replace(/\s/g, ''));
      const iBon = textes.findIndex(t => t === q.nom.replace(/\s/g, ''));
      const iFaux = (iBon + 1) % 4;
      await p.locator('.choix-btn').nth(bon ? iBon : iFaux).click();
      await p.waitForSelector('#suivant');
      if (controle && i === 0) await controle(q);
      await p.click('#suivant');
    }
    await p.waitForSelector('.bilan');
  };
  await p.click('a[href="#/entrainement/reco"]'); await p.waitForSelector('a[href="#/entrainement/reco?n=1"]');
  t.ok(await p.locator('.modes .mode').count() === 3, 'écran de choix : 3 niveaux proposés');
  await p.click('a[href="#/entrainement/reco?n=1"]');
  t.ok((await p.textContent('.niveau-seance')).includes('Fondations'), 'le niveau de la séance est affiché');
  await jouer(false, async q => {
    t.ok(await p.isVisible('.diagnostic') && (await p.textContent('.diagnostic')).includes('Pourquoi pas'), 'erreur : « pourquoi pas » la réponse choisie');
    t.ok(await p.isVisible('.lecon') && (await p.textContent('.lecon')).length > 60, 'erreur : explication détaillée visible');
  });
  t.ok(await xpDe() === 0 && !(await p.$('.bilan a[href="#/entrainement/reco?n=2"]')), 'séance ratée : 0 XP, pas de niveau suivant proposé');
  await p.click('#rejouer');
  await jouer(true, async () => {
    t.ok(!(await p.isVisible('.lecon')) && await p.isVisible('.approfondir'), 'bonne réponse : explication repliée (« Pourquoi c\'est ça »)');
  });
  t.ok(await xpDe() === 120, `niveau I parfait : XP = ${await xpDe()} (attendu 10 × 10 + 20)`);
  await p.click('.bilan ~ .actions a[href="#/entrainement/reco?n=2"], a[href="#/entrainement/reco?n=2"]');
  await p.waitForSelector('.choix-btn');
  t.ok((await p.textContent('.niveau-seance')).includes('Pratique courante'), 'après 10/10, « Passer au niveau II » ouvre le niveau II');
  await jouer(true);
  t.ok(await xpDe() === 120 + 170, `niveau II parfait : XP = ${await xpDe()} (attendu +15 × 10 + 20)`);
  t.ok((await p.evaluate(() => window.__toasts)).some(t => t.includes('Compagnon')), 'passage au rang Compagnon annoncé');
  const st = await etat();
  t.ok(st.stats.reco.niveaux[1] === 10 && st.stats.reco.niveaux[2] === 10, 'meilleur score enregistré par niveau');

  t.section('C. Calculs sans chrono, avec diagnostic');
  await p.goto(U + '#/entrainement/calcul'); await p.waitForSelector('a[href="#/entrainement/calcul?n=2"]');
  await p.click('a[href="#/entrainement/calcul?n=2"]'); await p.waitForSelector('.exercice');
  t.ok(!(await p.$('.chrono, .meche, #secondes')), 'aucun chrono à l\'écran');
  await p.clock.fastForward(120000); await p.waitForTimeout(200);
  t.ok(!(await p.$('#suivant')), 'après 2 minutes sans répondre, rien ne se passe : pas de temps limite');
  const exo = () => p.evaluate(async () => { const c = await import('/js/calcul.js'); const s = c.sessionEnCours(); const e = s.exercices[s.index]; return { reponse: e.reponse, choix: e.choix ?? null, erreurs: e.erreurs ?? [], niveau: e.generateur.niveau }; });
  const composer = async t => { for (const ch of t) await p.click(`[data-touche="${ch}"]`); };
  const fmt = v => (Math.round(v * 1000) / 1000).toString().replace('.', ',').slice(0, 9);
  const xp0 = await xpDe();
  let justes = 0, diagVu = false, niveauxOk = true;
  for (let i = 0; i < 10; i++) {
    await p.waitForSelector('.exercice');
    const e = await exo();
    if (e.niveau !== 2) niveauxOk = false;
    if (i < 3 && !e.choix && e.erreurs.length) {
      await composer(fmt(e.erreurs[0].valeur)); await p.click('.clavier .valider'); await p.waitForSelector('#suivant');
      if (!diagVu) {
        t.ok((await p.textContent('.diagnostic')).replace(/\s+/g, ' ').includes(e.erreurs[0].message.slice(0, 25).replace(/\s+/g, ' ').split(' ').slice(0, 3).join(' ')), 'erreur type reconnue : « ' + e.erreurs[0].message.slice(0, 60) + '… »');
        t.ok(await p.isVisible('.lecon') && await p.isVisible('.piege-terrain') && await p.isVisible('.solution'), 'erreur : rappel de la formule, calcul posé et piège affichés');
        diagVu = true;
      }
    } else {
      if (e.choix) await p.locator('.choix-btn', { hasText: e.reponse }).click();
      else { await composer(fmt(e.reponse * 1.01)); await p.click('.clavier .valider'); }
      await p.waitForSelector('#suivant'); if (await p.$('.explication.est-juste')) justes++;
    }
    await p.click('#suivant');
  }
  await p.waitForSelector('.bilan');
  t.ok(diagVu && niveauxOk, 'les 10 calculs sont du niveau II');
  t.ok(await xpDe() - xp0 === justes * 15, `XP = ${await xpDe() - xp0} pour ${justes} justes (15 XP chacun, sans bonus de vitesse)`);
  t.ok((await etat()).stats.calcul.niveaux[2] === justes, 'meilleur score du niveau II enregistré');

  t.section('D. Domaines techniques et fin du module Cours');
  t.ok(!(await p.$('.tabbar a[href="#/cours"]')) && await p.isVisible('.tabbar a[href="#/entrainement/banc"]'), 'barre d\'onglets : Entraînement, Banc, Carnet (plus de Cours)');
  await p.goto(U + '#/cours'); await p.waitForTimeout(300);
  t.ok(p.url().endsWith('#/entrainement'), 'ancien lien #/cours redirigé vers l\'entraînement');
  await p.goto(U + '#/fiche/secu-slt'); await p.waitForTimeout(300);
  t.ok(p.url().endsWith('#/entrainement'), 'ancien lien #/fiche/… redirigé vers l\'entraînement');
  t.ok(!fs.existsSync(path.join(RACINE, 'data/fiches.json')) && !fs.existsSync(path.join(RACINE, 'js/cours.js')), 'fiches.json et cours.js supprimés du dépôt');
  await p.goto(U + '#/entrainement/reco'); await p.waitForSelector('.filtres-domaines');
  t.ok(await p.locator('.filtres-domaines .filtre').count() === 6, 'filtre par domaine : Tous + 5 domaines');
  await p.click('.filtres-domaines .filtre:has-text("HTA")'); await p.waitForTimeout(200);
  const htaVides = [1, 2, 3].filter(n => !qs.some(q => q.niveau === n && q.domaines.includes('hta'))).length;
  t.ok(p.url().endsWith('#/entrainement/reco?d=hta') && await p.locator('.mode.inactif').count() === htaVides && (await p.textContent('.domaine-desc')).includes('Haute tension'),
    `domaine HTA : ${3 - htaVides} niveaux avec du contenu, ${htaVides} grisé(s), description du domaine affichée`);
  await p.click('a.mode[href="#/entrainement/reco?n=3&d=hta"]'); await p.waitForSelector('.choix-btn');
  const nbHta = qs.filter(q => q.niveau === 3 && q.domaines.includes('hta')).length;
  t.ok((await p.textContent('.session-chiffres')).includes(`/${String(nbHta).padStart(2, '0')}`), `séance HTA niveau III : ${nbHta} planches, pas 10`);
  let horsDomaine = 0;
  for (let i = 0; i < nbHta; i++) {
    await p.waitForSelector('.choix-btn:not([disabled])');
    const src = await p.getAttribute('.reco-visuel img', 'src');
    const question = (await p.textContent('.question')).replace(/\s/g, '');
    const q = qs.find(x => x.image === src && x.question.replace(/\s/g, '') === question);
    if (!q?.domaines.includes('hta')) horsDomaine++;
    await p.locator('.choix-btn').first().click(); await p.waitForSelector('#suivant');
    if (i === 0) t.ok(await p.isVisible('.risque') || await p.isVisible('.approfondir'), 'correction : bloc « le risque, en vrai » présent');
    await p.click('#suivant');
  }
  await p.waitForSelector('.bilan');
  t.ok(horsDomaine === 0, 'séance HTA : uniquement des planches du domaine HTA');
  await p.goto(U + '#/entrainement/calcul?n=1&d=tbt-cc'); await p.waitForSelector('.clavier');
  t.ok((await p.textContent('.niveau-seance')).includes('TBT'), 'calculs : séance TBT & CC, domaine rappelé en tête');


  t.section('E. Cas de panne');
  const pannes = await p.evaluate(() => fetch('data/pannes.json').then(r => r.json()));
  t.ok(pannes.length >= 8 && [1, 2, 3].every(n => pannes.filter(c => c.niveau === n).length >= 2), `${pannes.length} interventions, au moins 2 par niveau`);
  t.ok(pannes.every(c => !c.module && c.domaines?.length && c.domaines.every(d => DOMAINES.includes(d)) && c.conclusion.risque?.length > 60 && c.conclusion.norme), 'chaque cas : domaines (plus de « module »), risque et norme dans le diagnostic final');
  t.ok(DOMAINES.every(d => pannes.some(c => c.domaines.includes(d))), 'cas de panne : les 5 domaines sont couverts (dont consignation / VAT et poste HTA)');
  t.ok(pannes.every(c => c.contexte && c.conclusion?.cause && c.conclusion?.remede && c.conclusion?.lecon && c.etapes.length >= 3
    && c.etapes.every(e => e.situation && e.question && e.choix.length >= 3 && e.choix.filter(x => x.verdict === 'bon').length === 1
      && e.choix.every(x => ['bon', 'acceptable', 'mauvais', 'danger'].includes(x.verdict) && x.explication && x.texte))),
    'chaque étape : une seule bonne démarche, chaque choix expliqué, conclusion cause / remède / leçon');
  t.ok(pannes.flatMap(c => c.etapes.flatMap(e => e.choix)).filter(x => x.verdict === 'danger').length >= 8, 'des démarches dangereuses à reconnaître dans les cas');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('a[href="#/entrainement/panne"]');
  await p.click('a[href="#/entrainement/panne"]'); await p.waitForSelector('.ligne-panne');
  t.ok(await p.locator('.ligne-panne').count() === pannes.length, `liste des ${pannes.length} interventions, groupées par niveau`);
  await p.click('.filtres-domaines .filtre:has-text("SÉCU")'); await p.waitForTimeout(200);
  t.ok(await p.locator('.ligne-panne').count() === pannes.filter(c => c.domaines.includes('securite')).length, 'filtre Sécurité : seuls les cas du domaine');
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/panne'); await p.waitForSelector('.ligne-panne');
  const xpAvantPanne = await xpDe();
  const cas = pannes.find(c => c.id === 'commande-hs');
  await p.click('a[href="#/entrainement/panne?c=commande-hs"]'); await p.waitForSelector('.etape');
  t.ok(await p.isVisible('.bon-intervention') && !(await p.$('.chrono')), 'bon d\'intervention affiché, pas de chrono');
  const ordreA = await p.locator('.choix-btn').evaluateAll(bs => bs.map(b => b.dataset.i).join(''));
  const iDanger = cas.etapes[2].choix.findIndex(x => x.verdict === 'danger');
  for (let etape = 0; etape < cas.etapes.length; etape++) {
    await p.waitForSelector('.etape .choix-btn:not([disabled])');
    const e = cas.etapes[etape];
    const iBon = e.choix.findIndex(x => x.verdict === 'bon');
    if (etape === 2) {
      await p.click(`.choix-btn[data-i="${iDanger}"]`); await p.waitForSelector('#suite');
      t.ok(await p.isVisible('.explication.est-danger .alerte-securite') && (await p.textContent('.verdict')).includes('Alerte sécurité'), 'démarche dangereuse : alerte sécurité expliquée');
      await p.click('#suite'); await p.waitForTimeout(100);
      t.ok(await p.locator(`.choix-btn[data-i="${iDanger}"]`).isDisabled() && !(await p.locator(`.choix-btn[data-i="${iBon}"]`).isDisabled()), 'on peut choisir une autre démarche ; le choix dangereux reste barré');
    }
    await p.click(`.choix-btn[data-i="${iBon}"]`); await p.waitForSelector('#suite');
    if (etape === 0) t.ok(await p.isVisible('.explication.est-juste .lecon'), 'bonne démarche : explication affichée');
    await p.click('#suite');
  }
  await p.waitForSelector('.rapport-panne');
  t.ok((await p.textContent('.rapport-panne')).includes(cas.conclusion.cause.slice(0, 20)), 'diagnostic final : cause, remède, leçon');
  t.ok(await xpDe() - xpAvantPanne === 20, `2 étapes réussies du premier coup sur 3 : +${await xpDe() - xpAvantPanne} XP (attendu 2 × 10, sans bonus)`);
  await p.click('#recommencer'); await p.waitForSelector('.etape');
  for (const e of cas.etapes) { await p.waitForSelector('.etape .choix-btn:not([disabled])'); await p.click(`.choix-btn[data-i="${e.choix.findIndex(x => x.verdict === 'bon')}"]`); await p.click('#suite'); }
  await p.waitForSelector('.rapport-panne');
  t.ok(await xpDe() - xpAvantPanne === 20 + 50, 'intervention sans faute : +3 × 10 + 20 XP');
  await p.goto(U + '#/entrainement/panne'); await p.waitForSelector('.ligne-panne');
  t.ok((await p.locator('a[href="#/entrainement/panne?c=commande-hs"] .ligne-fin').textContent()).includes('Sans faute'), 'cas marqué « Sans faute » dans la liste');
  let ordresDifferents = false;
  for (let k = 0; k < 6 && !ordresDifferents; k++) { await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/panne?c=commande-hs'); await p.waitForSelector('.etape'); ordresDifferents = (await p.locator('.choix-btn').evaluateAll(bs => bs.map(b => b.dataset.i).join(''))) !== ordreA; }
  t.ok(ordresDifferents, 'l\'ordre des propositions change d\'une fois sur l\'autre');
  // Chaque cas se joue de bout en bout (bonne démarche à chaque étape) et se termine par risque + norme.
  const casIncomplets = [];
  for (const c of pannes) {
    await p.goto(U + '#/entrainement'); await p.goto(U + `#/entrainement/panne?c=${c.id}`); await p.waitForSelector('.etape');
    for (const e of c.etapes) {
      await p.waitForSelector('.etape .choix-btn:not([disabled])');
      await p.click(`.choix-btn[data-i="${e.choix.findIndex(x => x.verdict === 'bon')}"]`); await p.click('#suite');
    }
    await p.waitForSelector('.rapport-panne');
    if (!(await p.isVisible('.rapport-panne .risque')) || !(await p.isVisible('.rapport-panne .norme'))) casIncomplets.push(c.id);
  }
  t.ok(casIncomplets.length === 0, `les ${pannes.length} cas se jouent jusqu'au diagnostic final, avec risque et norme` + (casIncomplets.length ? ' — ' + casIncomplets.join(', ') : ''));

  t.section('F. Nouveau nom « Elec learning »');
  const textes = [];
  for (const h of ['#/entrainement', '#/entrainement/reco', '#/entrainement/panne', '#/entrainement/banc', '#/profil']) { await p.goto(U + h); await p.waitForTimeout(250); textes.push(await p.evaluate(() => document.body.innerText + ' ' + document.title)); }
  t.ok(!textes.join(' ').match(/dojo/i) && textes[0].includes('Elec learning'), 'plus aucun « Dojo » à l\'écran ; « Elec learning » dans l\'en-tête');
  const manifeste = await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
  t.ok(manifeste.name === 'Elec learning' && manifeste.short_name === 'Elec learning', 'manifeste : Elec learning');
  await p.goto(U + '#/dojo/reco?n=2'); await p.waitForTimeout(400);
  t.ok(p.url().endsWith('#/entrainement/reco?n=2') && await p.isVisible('.choix-btn'), 'ancien lien #/dojo/reco?n=2 redirigé');
  const { contexte: ctx2, page: p2 } = await nouvellePage(navigateur);
  await ctx2.addInitScript(() => { if (!sessionStorage.getItem('fait')) { sessionStorage.setItem('fait', 1); localStorage.setItem('dojo:v1', JSON.stringify({ version: 1, xp: 777, fichesVues: {}, stats: {} })); } });
  await p2.goto(U); await p2.waitForSelector('.plaque');
  const cles = await p2.evaluate(() => ({ nouv: JSON.parse(localStorage.getItem('elec-learning:v1') || '{}').xp, anc: localStorage.getItem('dojo:v1') }));
  t.ok(cles.nouv === 777 && cles.anc === null && (await p2.textContent('.niveau-xp .valeur')) === '777', 'progression de l\'ancienne version reprise automatiquement (777 XP)');
  await p2.goto(U + '#/profil'); await p2.waitForSelector('#btn-export');
  fs.writeFileSync(path.join(dossierTemp, 'ancienne.json'), JSON.stringify({ app: 'dojo-bts', version: 1, xp: 1234, fichesVues: {}, stats: {} }));
  p2.on('dialog', d => d.accept());
  await p2.setInputFiles('#fichier-import', path.join(dossierTemp, 'ancienne.json')); await p2.waitForTimeout(300);
  t.ok(await p2.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')).xp) === 1234, 'une sauvegarde exportée avec l\'ancien nom s\'importe');

  t.section('G. Hors connexion');
  const listeSw = [...fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8').matchAll(/^  '([^']+)',?$/gm)].map(m => m[1]);
  const fichiersRepo = fichiersDeLApp();
  const manquants = fichiersRepo.filter(f => !listeSw.includes(f)), enTrop = listeSw.filter(f => f !== './' && !fichiersRepo.includes(f));
  t.ok(!manquants.length && !enTrop.length, `sw.js liste exactement les ${fichiersRepo.length} fichiers de l'app` + (manquants.length ? ' — manquants : ' + manquants : '') + (enTrop.length ? ' — inexistants : ' + enTrop : ''));
  await p2.goto(U + '#/entrainement'); await p2.evaluate(() => navigator.serviceWorker.ready); await p2.reload(); await p2.waitForSelector('.plaque');
  t.ok(await p2.evaluate(() => !!navigator.serviceWorker.controller), 'service worker actif');
  await p2.goto(U + '#/profil'); await p2.waitForSelector('.ligne-etat');
  t.ok((await p2.textContent('main')).includes('Disponible hors connexion'), 'le Carnet indique « Disponible hors connexion »');
  await ctx2.setOffline(true);
  await p2.reload(); await p2.waitForSelector('.selecteur');
  await p2.goto(U + '#/entrainement/panne?c=variateur-surtension'); await p2.waitForSelector('.etape');
  await p2.goto(U + '#/entrainement/calcul?n=3&d=hta'); await p2.waitForSelector('.clavier');
  await p2.goto(U + '#/entrainement/reco?n=3'); await p2.waitForSelector('.reco-visuel img');
  const imageOk = await p2.evaluate(() => new Promise(r => { const i = document.querySelector('.reco-visuel img'); i.complete ? r(i.naturalWidth > 0) : (i.onload = () => r(true), i.onerror = () => r(false)); }));
  t.ok(imageOk, 'sans réseau : l\'app s\'ouvre, cas de panne, calculs HTA et images disponibles');

  for (const h of ['#/entrainement', '#/entrainement/reco', '#/entrainement/reco?n=3', '#/entrainement/calcul', '#/entrainement/calcul?n=3', '#/entrainement/panne', '#/entrainement/panne?c=variateur-surtension', '#/entrainement/panne?d=hta', '#/entrainement/reco?d=securite', '#/entrainement/banc', '#/profil']) {
    await p.goto(U + h); await p.waitForTimeout(250);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) t.ok(false, 'débordement horizontal sur ' + h);
  }
  t.ok(true, 'aucun débordement horizontal (11 écrans)');

  await ctx2.close();
  await importSecurise(t, U, navigateur, dossierTemp);
  t.ok(errs.length === 0, 'console : ' + (errs.length ? errs.join(' | ') : 'aucune erreur'));
  await ctx.close();
  fs.rmSync(dossierTemp, { recursive: true, force: true });
}

// ---------- H. Import de sauvegarde sécurisé (par l'écran Carnet, comme sur le téléphone) ----------

async function importSecurise(t, U, navigateur, dossierTemp) {
  t.section('H. Import de sauvegarde sécurisé');
  const { contexte, page: p } = await nouvellePage(navigateur);
  p.on('dialog', d => d.accept());
  const etat = () => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}'));
  const fichier = (nom, contenu) => { const f = path.join(dossierTemp, nom); fs.writeFileSync(f, contenu); return f; };
  const importer = async (nom, contenu) => {
    await p.goto(U + '#/entrainement'); await p.goto(U + '#/profil'); await p.waitForSelector('#btn-export');
    await p.setInputFiles('#fichier-import', fichier(nom, contenu));
    await p.waitForFunction(() => document.querySelector('#message')?.textContent.trim());
    return (await p.textContent('#message')).replace(/\s+/g, ' ').trim();
  };
  const sauvegarde = autres => JSON.stringify({ app: 'elec-learning', version: 1, xp: 300, fichesVues: {}, stats: {}, ...autres });

  await p.goto(U + '#/profil'); await p.waitForSelector('#btn-export');
  let message = await importer('base.json', sauvegarde({}));
  t.ok(message.includes('importée') && (await etat()).xp === 300, 'sauvegarde valide : importée (300 XP)');

  message = await importer('texte.json', sauvegarde({ xp: '100' }));
  t.ok(message.includes('refusée') && message.includes('xp') && (await etat()).xp === 300, `xp en texte : refusée, données intactes (« ${message.slice(0, 70)}… »)`);

  message = await importer('compteurs.json', sauvegarde({ stats: { reco: { sessions: -2 } } }));
  t.ok(message.includes('refusée') && (await etat()).xp === 300, 'compteur négatif dans les stats : refusée');

  message = await importer('proto.json', '{"app":"elec-learning","version":1,"xp":5,"stats":{"__proto__":{"pollue":1}}}');
  t.ok(message.includes('refusée') && await p.evaluate(() => ({}).pollue === undefined) && (await etat()).xp === 300, 'clé « __proto__ » : refusée, aucun objet pollué');

  message = await importer('enorme.json', sauvegarde({ stats: { reco: { sessions: 1, elements: Object.fromEntries(Array.from({ length: 60000 }, (_, i) => [`question-${i}`, { essais: 1, reussites: 1 }])) } } }));
  t.ok(message.includes('volumineux') && (await etat()).xp === 300, 'fichier de plus de 2 Mo : refusé');

  const somme = await p.evaluate(async () => { const xp = await import('/js/xp.js'); xp.gagnerXP(10); return xp.lireXP(); });
  t.ok(somme === 310, `après les tentatives, gagner 10 XP donne ${JSON.stringify(somme)} (une addition, pas « 30010 »)`);

  // Démarrage avec un stockage local abîmé : l'app nettoie et démarre.
  await p.evaluate(() => localStorage.setItem('elec-learning:v1', JSON.stringify({ version: 1, xp: '100', fichesVues: { ok: 1761900000000 }, stats: { reco: 'abîmé' }, preferences: { matiere: 'porcelaine' } })));
  await p.goto(U + '#/entrainement'); await p.reload(); await p.waitForSelector('.plaque');
  const apres = await p.evaluate(async () => { const xp = await import('/js/xp.js'); xp.gagnerXP(10); return { xp: xp.lireXP(), theme: document.documentElement.dataset.theme }; });
  t.ok(apres.xp === 10 && apres.theme === 'porcelaine', 'stockage local abîmé : l\'app démarre, xp remis à 0 puis +10 = 10, le reste (thème) est gardé');
  t.ok(p.erreurs.length === 0, 'import et nettoyage : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();
}
