// W. Reprise des séries quittées en route ; examen blanc : chrono en pause hors de l'écran, non traitées ≠ erreurs.

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();
const lire = p => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}'));
const enRevision = p => p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('elec-learning:v1')).stats ?? {})
  .reduce((n, m) => n + Object.values(m.elements ?? {}).filter(e => e.boite).length, 0));

export default async function ({ t, url: U, navigateur }) {
  t.section('W. Reprendre une série quittée ; examen blanc : chrono en pause, questions non traitées jamais comptées fausses');
  const { contexte, page: p } = await nouvellePage(navigateur);
  p.on('dialog', d => d.accept());
  const chiffres = async () => net(await p.textContent('.session-chiffres'));

  // ---------- Reconnaissance ----------
  await p.goto(U + '#/entrainement/reco?n=1'); await p.waitForSelector('.choix-btn');
  for (let i = 0; i < 3; i++) { await p.click('.choix-btn >> nth=0'); await p.click('#suivant'); }
  const score = (await chiffres()).match(/Score (\d+)/)[1];
  const avantDepart = (await lire(p)).stats.reco.elements;
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.carte-reprise');
  t.ok(net(await p.textContent('.carte-reprise')).includes('Reconnaissance · niveau I') && net(await p.textContent('.carte-reprise')).includes('3/10'),
    'séance quittée après 3 réponses : l\'accueil propose « À reprendre · Reconnaissance · niveau I · 3/10 »');
  t.ok(JSON.stringify((await lire(p)).stats.reco.elements) === JSON.stringify(avantDepart), 'rien n\'est compté pour les 7 questions non jouées');
  await p.click('.carte-reprise'); await p.waitForSelector('.choix-btn');
  t.ok(new RegExp(`^Question 04\\/10 ?Score ${score}`).test(await chiffres()), `un toucher : reprise à la question 4, score ${score} conservé`);
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/reco?n=1'); await p.waitForSelector('.bandeau-reprise');
  t.ok((await chiffres()).startsWith('Question 01/10') && net(await p.textContent('.bandeau-reprise')).includes('3 réponses sur 10'),
    'en rouvrant le même niveau : une série neuve, et un bandeau « Série en cours · 3 réponses sur 10 »');
  await p.click('#reprendre-serie');
  t.ok((await chiffres()).startsWith('Question 04/10'), '« Reprendre » : retour à la question 4');
  for (let i = 0; i < 7; i++) { await p.click('.choix-btn >> nth=0'); await p.click('#suivant'); }
  await p.waitForSelector('.bilan');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
  t.ok(!(await p.$('.carte-reprise')), 'série terminée : plus rien à reprendre');

  // ---------- Calculs : mêmes énoncés à la reprise ----------
  await p.goto(U + '#/entrainement/calcul?n=2'); await p.waitForSelector('.exercice');
  const enonces = await p.evaluate(async () => (await import('/js/calcul.js')).sessionEnCours().exercices.map(e => e.enonce));
  await p.click('#je-ne-sais-pas'); await p.click('#suivant');
  await p.goto(U + '#/entrainement'); await p.click('.carte-reprise:has-text("Calculs")'); await p.waitForSelector('.exercice');
  const repris = await p.evaluate(async () => (await import('/js/calcul.js')).sessionEnCours().exercices.map(e => e.enonce));
  t.ok(JSON.stringify(repris) === JSON.stringify(enonces) && (await chiffres()).startsWith('Question 02/10'), 'calculs repris à la question 2, avec exactement les mêmes valeurs');

  // ---------- Examen blanc ----------
  await p.goto(U + '#/entrainement/examen?duree=8'); await p.click('#commencer-examen'); await p.waitForSelector('.choix-btn');
  await p.click('.choix-btn >> nth=0'); await p.waitForTimeout(100); await p.click('.choix-btn >> nth=0');
  await p.goto(U + '#/entrainement'); await p.waitForTimeout(3000);   // 3 s ailleurs : le chrono ne tourne pas
  await p.goto(U + '#/entrainement/examen'); await p.waitForSelector('#reprendre-examen');
  const restant = Number(net(await p.textContent('.bandeau-reprise')).match(/00:0(\d) restantes/)?.[1]);
  t.ok(restant >= 6 && net(await p.textContent('.bandeau-reprise')).includes('question 3 sur 15'), `examen quitté à la question 3 : « Reprendre l'examen », ${restant} s restantes (le chrono s'est arrêté pendant l'absence)`);
  const revisionAvant = await enRevision(p);
  await p.click('#reprendre-examen'); await p.waitForSelector('.chrono');
  t.ok((await chiffres()).startsWith('Question 03/15'), 'reprise : question 3 sur 15');
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const fige = (await p.textContent('#chrono')).trim(); await p.waitForTimeout(1500);
  t.ok((await p.textContent('#chrono')).trim() === fige, `appli en arrière-plan : chrono figé à ${fige}`);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForSelector('.bilan-examen', { timeout: 15000 });
  const fin = net(await p.textContent('main'));
  t.ok(fin.includes('temps écoulé') && fin.includes('13 non traitées') && fin.includes('ne comptent pas comme des erreurs'), 'temps écoulé : « 13 non traitées », qui « ne comptent pas comme des erreurs »');
  t.ok(await enRevision(p) <= revisionAvant + 2, `seules les 2 questions répondues peuvent rejoindre la révision (${revisionAvant} → ${await enRevision(p)}), pas les 13 jamais vues`);
  await p.click('.corrige summary');
  t.ok(await p.locator('.liste-corrige li:has-text("Non traitée")').count() === 13, 'corrigé : les 13 questions marquées « Non traitée (temps écoulé) »');
  await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
  t.ok(!(await p.$('.carte-reprise:has-text("Examen")')), 'examen terminé : plus de carte de reprise');

  // ---------- Tout effacer ----------
  await p.goto(U + '#/entrainement/reco?n=2'); await p.waitForSelector('.choix-btn'); await p.click('.choix-btn >> nth=0');
  await p.goto(U + '#/profil'); await p.click('#btn-effacer'); await p.waitForSelector('#sas');
  t.ok(await p.evaluate(() => localStorage.getItem('elec-learning:en-cours')) === null, '« Tout effacer » efface aussi les séries en cours');
  t.ok(p.erreurs.length === 0, 'reprise : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();
}
