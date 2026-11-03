// Q. Rappels d'erreurs glissés dans les séances ordinaires ; R. Bilan · examen blanc chronométré.

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();
const JOUR = 86_400_000;

export default async function ({ t, url: U, navigateur }) {
  const questions = await (await fetch(U + 'data/reconnaissance.json')).json();

  // ---------- Q. Rappels dans les séances ----------
  t.section('Q. Répétition espacée : les erreurs d\'il y a quelques jours reviennent dans les séances ordinaires');
  {
    const [ancienne, recente] = questions.filter(q => q.niveau === 1);
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.addInitScript(({ ancienne, recente, J }) => {
      if (sessionStorage.getItem('prepare')) return;
      sessionStorage.setItem('prepare', '1');
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      const maintenant = Date.now();
      e.stats = {
        reco: { sessions: 1, meilleurScore: 5, derniereSession: 1, elements: {
          [ancienne]: { essais: 1, reussites: 0, recents: '0', boite: 1, revoir: maintenant - 4 * J },
          [recente]: { essais: 1, reussites: 0, recents: '0', boite: 1, revoir: maintenant - J / 2 }
        } },
        calcul: { sessions: 1, meilleurScore: 5, derniereSession: 1, elements: {
          ohm: { essais: 1, reussites: 0, recents: '0', boite: 1, revoir: maintenant - 3 * J }
        } }
      };
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    }, { ancienne: ancienne.id, recente: recente.id, J: JOUR });

    await p.goto(U + '#/entrainement/reco?n=2'); await p.waitForSelector('.choix-btn');
    const vus = [];
    for (let i = 0; i < 10; i++) {
      await p.waitForSelector('.choix-btn:not([disabled])');
      vus.push({ rappel: net(await p.textContent('.niveau-seance')).includes('Rappel d\'erreur'), image: await p.getAttribute('.planche img', 'src') });
      await p.click('.choix-btn >> nth=0'); await p.click('#suivant');
    }
    await p.waitForSelector('.bilan');
    const places = vus.map((v, i) => v.rappel ? i + 1 : 0).filter(Boolean);
    t.ok(places.join() === '6' && vus[5].image === ancienne.image, `séance de niveau II : l'erreur de niveau I d'il y a 4 jours revient en question ${places.join(', ')}, marquée « Rappel d'erreur »`);
    t.ok(!vus.some(v => v.image === recente.image), 'erreur d\'il y a 12 heures : pas encore rappelée (elle reste dans « À réviser »)');
    t.ok(/Dont 1 rappel d'erreurs passées : [01] retrouvé/.test(net(await p.textContent('.bilan'))), `rapport : « ${net(await p.textContent('.bilan-rappels'))} »`);
    const apres = await p.evaluate(id => JSON.parse(localStorage.getItem('elec-learning:v1')).stats.reco.elements[id], ancienne.id);
    t.ok(apres.essais === 2 && (apres.boite === 1 || apres.boite === 2), `réponse au rappel enregistrée dans la révision (boîte ${apres.boite})`);

    await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/calcul?n=3'); await p.waitForSelector('.exercice');
    const calc = await p.evaluate(async () => (await import('/js/calcul.js')).sessionEnCours().exercices.map(e => e.rappel ? e.generateur.id : ''));
    t.ok(calc.length === 10 && calc.filter(Boolean).join() === 'ohm' && calc.indexOf('ohm') === 5 && !net(await p.textContent('.niveau-seance')).includes('Rappel'),
      'calculs de niveau III : le calcul « loi d\'Ohm » raté il y a 3 jours revient au milieu de la séance, avec de nouvelles valeurs');
    await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/calcul?n=3&d=hta'); await p.waitForSelector('.exercice');
    const filtre = await p.evaluate(async () => (await import('/js/calcul.js')).sessionEnCours().exercices.filter(e => e.rappel).length);
    t.ok(filtre === 0, 'séance filtrée sur le domaine HTA : un rappel d\'un autre domaine n\'y entre pas');
    t.ok(p.erreurs.length === 0, 'rappels : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- R. Examen blanc ----------
  t.section('R. Bilan · examen blanc : 15 questions chronométrées, sans aide, bilan par compétence');
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.mode-examen');
    t.ok(net(await p.textContent('.mode-examen')).includes('Examen blanc') && (await p.$$eval('.modes .mode', l => l.length)) === 6, 'accueil : sixième mode « Bilan · Examen blanc »');
    await p.click('.mode-examen'); await p.waitForSelector('#commencer-examen');
    t.ok(net(await p.textContent('.regles-examen')).includes('15:00') && net(await p.textContent('.regles-examen')).includes('aucune'), 'consignes : 15 questions, 15:00, aucune aide, correction à la fin');
    await p.click('#commencer-examen'); await p.waitForSelector('.chrono');
    const etatExamen = () => p.evaluate(async () => { const e = (await import('/js/examen.js')).examenEnCours(); return { index: e.index, liste: e.liste.map(q => ({ bonne: q.choix.indexOf(q.bonne), n: q.choix.length, mode: q.mode, id: q.id })) }; });
    const { liste } = await etatExamen();
    t.ok(liste.length === 15 && liste.every(q => q.bonne >= 0) && new Set(liste.map(q => q.mode)).size === 2, '15 questions et calculs (QCM), la bonne réponse toujours proposée');
    await p.waitForTimeout(1200);
    t.ok(/^14:5\d$/.test(net(await p.textContent('#chrono'))), `chronomètre en marche : ${net(await p.textContent('#chrono'))}`);

    let aides = 0;
    for (let i = 0; i < 15; i++) {
      await p.waitForFunction(n => document.querySelector('.session-chiffres')?.textContent.includes(`Question ${String(n).padStart(2, '0')}/15`), i + 1);
      const q = liste[i];
      if (i === 10) { await p.click('#passer'); continue; }
      const choix = i < 10 ? q.bonne : (q.bonne + 1) % q.n;
      await p.click(`.choix-btn[data-i="${choix}"]`);
      aides += await p.locator('.explication, .zone-memo, .choix-btn.juste, .choix-btn.faux').count();
    }
    await p.waitForSelector('.bilan-examen');
    t.ok(aides === 0, 'pendant l\'examen : ni verdict, ni correction, ni fiche mémo');
    const rapport = net(await p.textContent('main'));
    t.ok(net(await p.textContent('.bilan-score')) === '10/15' && rapport.includes('13,5/20') && rapport.includes('Admissible, à consolider') && rapport.includes('1 sans réponse'),
      'rapport : 10/15, 13,5/20, « Admissible, à consolider », 1 sans réponse');
    t.ok(await p.locator('.competences .competence').count() >= 8 && await p.locator('.competence-verdict').first().isVisible(), 'bilan par compétence : 5 domaines, types et niveaux, avec un verdict chacun');
    await p.click('.corrige summary');
    t.ok(await p.locator('.liste-corrige li').count() === 15 && await p.locator('.liste-corrige li.faux').count() === 5 && net(await p.textContent('.liste-corrige')).includes('Sans réponse'),
      'corrigé après la fin : 15 questions, 5 erreurs avec la réponse attendue');
    const stock = await p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')).stats);
    const fautes = liste.slice(10);
    t.ok(stock.examen?.sessions === 1 && stock.examen.meilleurScore === 10 && fautes.every(q => stock[q.mode].elements[q.id]?.boite === 1),
      'examen enregistré (meilleur score 10) ; chaque erreur placée en révision');
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.mode-examen');
    t.ok(net(await p.textContent('.mode-examen .mode-record')) === '10/15', 'accueil : meilleur examen blanc « 10/15 »');

    // Temps écoulé
    await p.goto(U + '#/entrainement/examen?duree=3'); await p.waitForSelector('#commencer-examen');
    await p.click('#commencer-examen'); await p.waitForSelector('.choix-btn');
    await p.click('.choix-btn >> nth=0');
    await p.waitForSelector('.bilan-examen', { timeout: 6000 });
    t.ok(net(await p.textContent('.bilan-xp')).includes('temps écoulé') && net(await p.textContent('.bilan-xp')).includes('14 sans réponse'),
      'temps écoulé : l\'examen s\'arrête seul, les 14 questions restantes comptées sans réponse');
    t.ok(p.erreurs.length === 0, 'examen blanc : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }
}
