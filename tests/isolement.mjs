// M. Mesure d'isolement au mégohmmètre : préparation, tension d'essai, lectures, conclusion, rapport.

import { nouvellePage } from './outils.mjs';

export default async function ({ t, url: U, navigateur }) {
  t.section('M. Mesure d\'isolement : préparer, mesurer, conclure');
  const { contexte, page: p } = await nouvellePage(navigateur);
  const scenarios = await (await fetch(U + 'data/isolement.json')).json();
  t.ok(scenarios.length >= 6 && [1, 2, 3].every(n => scenarios.some(s => s.niveau === n))
    && scenarios.every(s => s.verdicts.filter(v => v.bon).length === 1 && s.cles.every(k => k.split('|').every(x => s.points.includes(x)))
      && Object.keys(s.mesures).every(k => k.split('|').every(x => s.points.includes(x)) && k === k.split('|').sort().join('|'))
      && [250, 500, 1000].includes(s.essaiConseille) && s.seuil > 0 && s.conclusion.risque.length > 60 && s.conclusion.norme && s.conclusion.piege),
    `${scenarios.length} scénarios, niveaux I à III : une seule bonne conclusion, mesures clés et points cohérents, risque, piège et norme`);

  await p.goto(U + '#/entrainement'); await p.waitForSelector('.mode-isolement');
  await p.click('.mode-isolement'); await p.waitForSelector('.ligne-isolement');
  t.ok(await p.locator('.ligne-isolement').count() === scenarios.length, 'accès depuis l\'accueil : liste des mesures par niveau');

  const ouvrir = async id => { await p.goto(U + '#/entrainement'); await p.goto(U + `#/entrainement/isolement?s=${id}`); await p.waitForSelector('#tester'); };
  const mesurer = async (a, b, u = 500) => {
    await p.click(`[data-tension="${u}"]`); await p.selectOption('#iso-a', a); await p.selectOption('#iso-b', b); await p.click('#tester');
    return { v: (await p.textContent('#iso-lecture')).trim(), note: await p.textContent('.note-mesure') };
  };
  const etat = () => p.evaluate(async () => { const m = await import('/js/isolement.js'); const e = m.essaiEnCours(); return { dangers: e.dangers.length, degats: e.degats.length, methode: e.methode.length }; });

  // Sous tension : refus et alerte
  await ouvrir('iso-moteur-variateur');
  let r = await mesurer('L1', 'PE');
  t.ok(r.v === '' && r.note.includes('consigné') && (await etat()).dangers === 1, 'essai sans consigner : aucune lecture, alerte de sécurité');
  // Variateur raccordé : dégât
  await p.click('[data-prep="consigne"]');
  r = await mesurer('L1', 'PE');
  t.ok(r.note.includes('variateur') && (await etat()).degats === 1, 'variateur resté raccordé : électronique endommagée, mesure sans valeur');
  // Bonne méthode
  await p.click('[data-prep="debranche"]');
  r = await mesurer('L1', 'PE');
  t.ok(r.v === '0,30' && r.note.includes('sous le seuil'), `consigné, variateur débranché, 500 V : L1-PE = ${r.v} MΩ, « sous le seuil » écrit en clair`);
  r = await mesurer('L1', 'L2');
  t.ok(r.v === '210' && r.note.includes('au-dessus'), 'entre phases : 210 MΩ, au-dessus du seuil');
  r = await mesurer('L2', 'PE', 250);
  t.ok((await etat()).methode === 1 && r.note.includes('peu probante'), '250 V sur un circuit 400 V : erreur de méthode signalée');
  await mesurer('L2', 'PE'); await mesurer('L3', 'PE');
  await p.click('.choix-btn:has-text("sécher")'); await p.waitForSelector('.bilan');
  const rapport = (await p.textContent('main')).replace(/\s+/g, ' ');
  t.ok(rapport.includes('Bonne conclusion') && /Alertes sécurité\s*1/.test(rapport) && /Matériel endommagé\s*1/.test(rapport) && await p.isVisible('.consequence'),
    'conclusion juste malgré les erreurs : rapport avec alerte, dégât et méthode');
  await p.click('.en-savoir-plus summary');
  const norme = await p.textContent('.norme');
  t.ok(await p.isVisible('.piege-terrain') && norme.includes('2016'), 'rapport : piège en armoire et norme datée' + (norme.includes('2016') ? '' : ` — ${norme}`));

  // Parcours sans faute, avec mesure clé N-PE
  await ouvrir('iso-neutre-terre');
  await p.click('[data-prep="consigne"]');
  r = await mesurer('L', 'PE');
  t.ok(r.v === '400', 'neutre à la terre : phase-terre à 400 MΩ (le piège)');
  await p.click('.choix-btn:has-text("chercher le point")'); await p.waitForSelector('.bilan');
  t.ok((await p.textContent('main')).includes('Mesures qui manquaient'), 'conclusion sans avoir mesuré N-PE : non validée, « Mesures qui manquaient »');
  await ouvrir('iso-neutre-terre');
  await p.click('[data-prep="consigne"]');
  r = await mesurer('N', 'PE');
  t.ok(r.v === '0,02', 'N-PE : 0,02 MΩ');
  await p.click('.choix-btn:has-text("chercher le point")'); await p.waitForSelector('.bilan');
  t.ok((await p.textContent('.bilan')).includes('Mesure de pro') && (await p.textContent('.bilan')).includes('+50 XP'), 'mesure clé faite, bonne conclusion, sans faute : « Mesure de pro », +50 XP');

  // TBTS : 250 V conseillé
  await ouvrir('iso-commande-24v');
  await p.click('[data-prep="consigne"]'); await p.click('[data-prep="debranche"]');
  r = await mesurer('+24 V', 'PE', 1000);
  t.ok(/250\s?V/.test(r.note) && (await etat()).methode === 1, 'circuit 24 V essayé sous 1 000 V : erreur de méthode (250 V conseillé)');

  // Machine tournante : lecture à 1 minute, DAR et indice de polarisation
  const duree = async d => { await p.click(`[data-duree="${d}"]`); };
  await ouvrir('iso-moteur-vernis');
  t.ok(await p.getAttribute('[data-duree="60"]', 'aria-pressed') === 'true' && await p.locator('[data-duree]').count() === 3,
    'mégohmmètre : durée d\'essai 15 s / 1 min / 10 min · IP, 1 minute par défaut');
  await p.click('[data-prep="consigne"]');
  for (const ph of ['U1', 'V1', 'W1']) r = await mesurer(ph, 'PE');
  t.ok(r.v === '80' && r.note.includes('au-dessus'), 'moteur de 22 ans : 80 MΩ à 1 minute, au-dessus du seuil');
  await p.click('.choix-btn:has-text("réimprégnation")'); await p.waitForSelector('.bilan');
  let txt = (await p.textContent('main')).replace(/\s+/g, ' ');
  t.ok(!txt.includes('Bonne conclusion') && txt.includes('Pas d\'indice de polarisation'), 'bonne réponse sans essai de 10 minutes : non validée, « Pas d\'indice de polarisation »');
  await ouvrir('iso-moteur-vernis');
  await p.click('[data-prep="consigne"]');
  await duree(15); r = await mesurer('U1', 'PE');
  t.ok(r.v === '68,8' && /on lit à 1\s?minute/.test(r.note) && (await etat()).methode === 1, 'lecture à 15 s : 68,8 MΩ, l\'aiguille monte encore, erreur de méthode');
  await duree(600); r = await mesurer('U1', 'PE');
  const ip = (await p.textContent('.iso-ip')).replace(/\s+/g, ' ');
  t.ok(r.v === '104' && /DAR\s?1,09/.test(ip) && /IP\s?1,30/.test(ip) && await p.locator('.iso-ip .indice-douteux').count() === 2,
    `essai de 10 minutes : R10 min 104 MΩ, tableau R30 s / R1 min / R10 min, DAR 1,09 et IP 1,30 signalés douteux`);
  await duree(60); await mesurer('V1', 'PE'); await mesurer('W1', 'PE');
  await p.click('.choix-btn:has-text("réimprégnation")'); await p.waitForSelector('.bilan');
  txt = (await p.textContent('main')).replace(/\s+/g, ' ');
  t.ok(txt.includes('Bonne conclusion') && /Erreurs de méthode\s*1/.test(txt) && (await p.textContent('#journal, .journal')).includes('IP 1,30'),
    'IP mesuré, bonne conclusion : validée, la lecture à 15 s comptée en erreur de méthode, IP dans le journal');

  const revision = await p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')).stats.isolement.elements['iso-moteur-variateur']);
  t.ok(revision.boite === 1, 'mesure avec alerte de sécurité : envoyée en révision (boîte 1)');
  t.ok(p.erreurs.length === 0, 'isolement : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();
}
