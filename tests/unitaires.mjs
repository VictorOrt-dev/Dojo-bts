// Tests unitaires, sans navigateur : modules purs (solveur du banc, contrôle des sauvegardes).

import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { RACINE } from './outils.mjs';
import { tension, resistance } from '../js/circuit.js';
import { controler, etatParDefaut, XP_MAX } from '../js/sauvegarde.js';
import * as P from '../js/parcours.js';
import { resume, MOTS_POURQUOI, MOTS_RISQUE } from '../js/tuteur.js';
import * as L from '../js/leitner.js';
import { auditer } from '../outils/audit.mjs';
import * as G from '../js/guidage.js';
import { markdown, memoPour } from '../js/memos.js';
import * as B from '../js/badges.js';

export default async function ({ t }) {
  await auditIntegrite(t);
  physiqueDuBanc(t);
  controleDesSauvegardes(t);
  parcoursGuide(t);
  correctionEnDeuxTemps(t);
  revisionEspacee(t);
  bancEclairage(t);
  guidageEtMemos(t);
  insignesEtSeries(t);
  correctionsAudit360(t);
  await mesureIsolementDansLeTemps(t);
  rappelsDansLesSeances(t);
  await examenBlanc(t);
}

// ---------- Solveur électrique : lectures attendues pour chaque panne ----------

function physiqueDuBanc(t) {
  t.section('U1. Solveur du banc (circuit.js) : lectures attendues');
  const c = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/banc-depart-moteur.json'), 'utf8'));
  const fermes = (etat, ouverts = []) => c.elements.filter(e => !ouverts.includes(e.id) && (
    !e.commande || (e.commande === 'q1' && !etat.consigne) || (e.commande === 'km' && etat.km)
    || (e.commande === 'marche' && etat.marche) || (e.commande === 'relais' && !etat.relais)));
  const V = (etat, ouv, a, b, mode = 'hz') => tension(c, fermes(etat, ouv), a, b, mode);
  const R = (etat, ouv, a, b) => resistance(c, fermes(etat, ouv), a, b);
  const vaut = (mesure, attendu, tol = 1) => Math.abs(mesure - attendu) <= tol;
  const base = { consigne: false, km: false, marche: false, relais: false };
  const cons = { ...base, consigne: true };

  // Installation saine
  t.ok(vaut(V(base, [], 'p1', 'p2').valeur, 398.4, 1.5), 'sain : 400 V entre phases en aval des fusibles');
  t.ok(vaut(V(base, [], 'c0', 'n0').valeur, 228.5), 'sain : 230 V au secondaire de T1 (rapport 0,575)');
  t.ok(vaut(V(base, [], 'x2', 'n0').valeur, 0, 0.5) && vaut(V({ ...base, marche: true }, [], 'x2', 'n0').valeur, 228.5), 'sain : A1 à 0 V au repos, 230 V quand Marche est appuyé');
  t.ok(vaut(R(cons, [], 'x2', 'n0'), 450, 0.5), 'sain, consigné : bobine A1-A2 = 450 Ω');
  t.ok(vaut(V(cons, [], 'p1', 'p2').valeur, 0, 0.5) && vaut(V(cons, [], 'L1', 'L2').valeur, 398.4, 1.5), 'consigné : aval à 0 V, amont de Q1 toujours à 400 V');

  const panne = id => c.pannes.find(p => p.id === id);
  // FU1 fondu
  let o = panne('fu1-fondu').ouvre;
  t.ok(vaut(V(base, o, 'c1', 'n0').valeur, 0, 0.5) && vaut(V(base, o, 'c0', 'n0').valeur, 228.5), 'FU1 fondu : 230 V en amont du fusible, 0 V en aval');
  t.ok(vaut(R(cons, o, 'c0', 'c1'), 2403, 2), 'FU1 fondu mesuré EN PLACE : ≈ 2,4 kΩ (voyant + secondaire en parallèle), pas OL');
  // Contact 95-96
  o = panne('contact-95-96').ouvre;
  t.ok(vaut(V(base, o, 'c1', 'n0').valeur, 228.5) && vaut(V(base, o, 'x1', 'n0').valeur, 0, 0.5), 'contact 95-96 : 230 V sur 95, 0 V sur 96');
  t.ok(R(cons, o, 'c1', 'x1') === Infinity, 'contact 95-96, consigné : OL');
  // Bobine coupée : A1 en l'air → tension fantôme en haute impédance seulement
  o = panne('bobine-coupee').ouvre;
  const a1 = V(base, o, 'x2', 'n0');
  t.ok(vaut(a1.valeur, 91.4) && a1.instable, 'bobine coupée : A1 au repos = 91 V fantôme, lecture instable');
  t.ok(vaut(V(base, o, 'x2', 'n0', 'loz').valeur, 0, 0.5), 'bobine coupée : en LoZ, la fantôme disparaît');
  t.ok(vaut(V({ ...base, marche: true }, o, 'x2', 'n0').valeur, 228.5) && R(cons, o, 'x2', 'n0') === Infinity, 'bobine coupée : 230 V sur A1-A2 avec Marche, OL à l\'ohmmètre');
  // Câble du pupitre
  o = panne('cable-pupitre').ouvre;
  const s11 = V(base, o, 's11', 'n0');
  t.ok(vaut(V(base, o, 'x1', 'n0').valeur, 228.5) && vaut(s11.valeur, 91.4) && s11.instable && vaut(V(base, o, 'x3', 'n0').valeur, 91.4), 'câble coupé : 230 V sur X1:1, 91 V fantôme sur S1:11 et KM1:13');
  t.ok(vaut(V(base, o, 's11', 'n0', 'loz').valeur, 0, 0.5) && R(cons, o, 'x1', 's11') === Infinity, 'câble coupé : 0 V en LoZ, continuité X1:1 → S1:11 = OL');
  // Fusible L2 (relais déclenché)
  o = panne('fusible-l2').ouvre;
  const e = { ...base, relais: true };
  const l12 = V(e, o, 'p1', 'p2');
  t.ok(vaut(l12.valeur, 229.6, 1.5) && l12.instable && vaut(V(e, o, 'p1', 'p3').valeur, 398.4, 1.5), 'fusible L2 : 230 V instables entre L1 et L2 en aval, 400 V entre L1 et L3');
  t.ok(vaut(V(e, o, 'p1', 'p2', 'loz').valeur, 0, 0.5) && vaut(V(e, o, 'p2', 'PE').valeur, 0, 0.5), 'fusible L2 : 0 V en LoZ, 0 V entre L2 et la terre');
  t.ok(R(cons, o, 'a2', 'p2') === Infinity && vaut(R(cons, [], 'a2', 'p2'), 0.02, 0.01), 'cartouche L2 : OL fondue, 0,02 Ω saine');
  // Retour de phase : contacteur fermé, la phase coupée est réalimentée par les enroulements du moteur
  const retour = V({ ...e, km: true, relais: false }, o, 'p2', 'PE');
  t.ok(retour.valeur > 50 && !retour.instable, `retour de phase par le moteur, KM1 fermé : ${retour.valeur.toFixed(0)} V sur la phase coupée (modélisé)`);
}

// ---------- Contrôle strict des sauvegardes ----------

function controleDesSauvegardes(t) {
  t.section('U2. Contrôle des sauvegardes (sauvegarde.js)');
  const valide = {
    version: 1, xp: 1234,
    stats: {
      reco: { sessions: 3, meilleurScore: 10, derniereSession: 1761900000000, niveaux: { '1': 10, '2': 7 }, elements: { 'sym-contact-no': { essais: 3, reussites: 2 } } },
      banc: { sessions: 1, meilleurScore: 1, derniereSession: null, elements: { 'fu1-fondu': { essais: 1, reussites: 1 } } }
    },
    derniereSauvegarde: 1761900000000,
    preferences: { matiere: 'porcelaine', visiteBanc: true },
    profil: 'formation',
    positionnement: { niveau: 2, score: 8, date: 1761900000000, niveaux: { reco: 2, calcul: 1, panne: 0 } },
    activite: { jours: ['2026-10-30', '2026-10-31', '2026-11-01'] },
    jalons: { memosApresErreur: 4, isolementPropre: ['iso-prises-neuves'] },
    badges: { 'habilite-banc': 1761900000000 }
  };
  const r = controler(valide);
  t.ok(r.anomalies.length === 0 && isDeepStrictEqual(r.etat, valide), 'sauvegarde conforme : acceptée telle quelle');
  t.ok(controler({ version: 1 }).anomalies.length === 0 && isDeepStrictEqual(controler({ version: 1 }).etat, etatParDefaut()), 'champs absents : valeurs par défaut, sans anomalie');

  const refuse = (donnees, attendu, message) => {
    const { anomalies } = controler(donnees);
    t.ok(anomalies.length > 0 && anomalies.some(a => a.includes(attendu)), `${message} → refusé (« ${anomalies[0] ?? 'aucune anomalie !'} »)`);
  };
  refuse({ version: 1, xp: '100' }, 'xp', 'xp en texte (« 100 »)');
  refuse({ version: 1, xp: -50 }, 'xp', 'xp négatif');
  refuse(JSON.parse('{"version":1,"xp":1e400}'), 'xp', 'xp infini (1e400 dans le JSON)');
  refuse({ version: 1, xp: XP_MAX + 1 }, 'xp', 'xp démesuré');
  refuse({ version: 1, xp: null }, 'xp', 'xp nul');
  refuse({ version: '1' }, 'version', 'version en texte');
  refuse({ version: 1, stats: [] }, 'stats', 'stats en tableau');
  refuse({ version: 1, stats: { reco: { sessions: '3' } } }, 'sessions', 'nombre de séances en texte');
  refuse({ version: 1, stats: { reco: { meilleurScore: -1 } } }, 'meilleurScore', 'meilleur score négatif');
  refuse({ version: 1, stats: { calcul: { elements: { ohm: { essais: 2, reussites: 5 } } } } }, 'reussites ≤ essais', 'plus de réussites que d\'essais');
  refuse({ version: 1, stats: { calcul: { elements: { ohm: { essais: 1.5, reussites: 1 } } } } }, 'entiers', 'compteur non entier');
  refuse({ version: 1, stats: { reco: { niveaux: { 7: 10 } } } }, 'niveau', 'niveau de difficulté inexistant');
  refuse({ version: 1, stats: { triche: { sessions: 1 } } }, 'mode inconnu', 'mode d\'exercice inconnu');
  refuse({ version: 1, stats: { banc: { derniereSession: 'hier' } } }, 'derniereSession', 'date de séance en texte');
  refuse({ version: 1, derniereSauvegarde: 'hier' }, 'derniereSauvegarde', 'date de sauvegarde en texte');
  refuse({ version: 1, preferences: { matiere: '<img src=x onerror=alert(1)>' } }, 'matiere', 'thème inconnu (injection)');
  refuse({ version: 1, profil: 'expert' }, 'profil', 'profil inconnu');
  refuse({ version: 1, positionnement: { niveau: 5, score: 8, date: 1 } }, 'positionnement', 'niveau de positionnement hors de 0 à 3');
  refuse({ version: 1, positionnement: { niveau: 2, score: '8', date: 1 } }, 'positionnement', 'score de positionnement en texte');
  refuse({ version: 1, positionnement: { niveau: 1, score: 6, date: 1, niveaux: { calcul: 3 } } }, 'positionnement', 'niveau d\'un mode au-dessus du niveau atteint');
  refuse({ version: 1, positionnement: { niveau: 2, score: 8, date: 1, niveaux: { banc: 2 } } }, 'positionnement', 'mode inconnu dans le positionnement');
  t.ok(isDeepStrictEqual(controler({ version: 1, positionnement: { niveau: 2, score: 8, date: 1 } }).etat.positionnement, { niveau: 2, score: 8, date: 1 }),
    'ancien positionnement (sans niveaux par mode) : toujours accepté');
  refuse({ version: 1, stats: { reco: { elements: { ['x'.repeat(500)]: { essais: 1, reussites: 1 } } } } }, 'clé', 'identifiant démesuré');

  // Pollution de prototype : JSON.parse crée une vraie clé « __proto__ ».
  const piege = JSON.parse('{"version":1,"stats":{"__proto__":{"pollue":true},"reco":{"elements":{"__proto__":{"essais":1,"reussites":1}}}}}');
  const rp = controler(piege);
  t.ok(rp.anomalies.length >= 2 && ({}).pollue === undefined && rp.etat.stats.reco.elements.essais === undefined
    && Object.getPrototypeOf(rp.etat.stats) === Object.prototype, 'clé « __proto__ » : refusée, aucun objet pollué');

  // Module Cours retiré : une ancienne sauvegarde avec « fichesVues » reste acceptée, le champ est simplement ignoré.
  const ancienne = controler({ version: 1, xp: 450, fichesVues: { 'elt-ohm': 1761900000000, autre: 'x' }, stats: {} });
  t.ok(ancienne.anomalies.length === 0 && ancienne.etat.xp === 450 && !('fichesVues' in ancienne.etat), 'ancienne sauvegarde avec « fichesVues » (module Cours retiré) : acceptée, champ ignoré');

  for (const n of [null, [], 'texte', 42]) {
    const { anomalies, etat } = controler(n);
    if (!(anomalies.length === 1 && etat.xp === 0)) t.ok(false, `contenu non objet (${JSON.stringify(n)}) mal géré`);
  }
  t.ok(true, 'contenu qui n\'est pas un objet (null, tableau, texte, nombre) : refusé, état par défaut');

  // Mode « nettoyage » (démarrage) : on garde ce qui est bon, on remplace ce qui est abîmé.
  const abime = controler({ version: 1, xp: '100', stats: { reco: { sessions: 2, elements: { q: { essais: 1, reussites: 1 }, z: 'x' } }, calcul: 'abîmé' } });
  t.ok(abime.etat.xp === 0 && !abime.etat.stats.calcul && abime.etat.stats.reco.sessions === 2
    && Object.keys(abime.etat.stats.reco.elements).join() === 'q', 'nettoyage : seuls les champs abîmés reprennent leur valeur par défaut');
  const apres = abime.etat.xp + 10;
  t.ok(typeof apres === 'number' && apres === 10, 'après contrôle, xp + 10 est une addition (plus de concaténation « 100 » + 10)');
}

// ---------- Parcours guidé (parcours.js, logique pure) ----------

function parcoursGuide(t) {
  t.section('U3. Parcours guidé (parcours.js)');
  const cas = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/pannes.json'), 'utf8'));
  const etat = (autres = {}) => ({ ...etatParDefaut(), ...autres });
  const reco = n => ({ reco: { sessions: 1, meilleurScore: 9, derniereSession: 1, elements: {}, niveaux: { [n]: 9 } } });

  t.ok(P.premierLancement(etat()) && !P.premierLancement(etat({ profil: 'debutant' })) && !P.premierLancement(etat({ xp: 40 }))
    && !P.premierLancement(etat({ stats: reco(1) })), 'premier lancement : seulement sans profil ET sans progression (un ancien utilisateur n\'est pas renvoyé à l\'accueil)');

  const d = etat({ profil: 'debutant' });
  const suite = [];
  let e = d;
  // On acquiert les étapes une à une et on relève la recommandation à chaque fois.
  const acquerir = (x, code) => {
    const stats = structuredClone(x.stats);
    if (code === 'B') stats.banc = { sessions: 1, meilleurScore: 1, derniereSession: 1, elements: { 'fu1-fondu': { essais: 1, reussites: 1 } } };
    else if (code[0] === 'P') { const c = cas.find(k => k.niveau === Number(code[1])); stats.panne ??= { sessions: 0, meilleurScore: 0, derniereSession: null, elements: {} }; stats.panne.elements[c.id] = { essais: 1, reussites: 1 }; }
    else { const m = code[0] === 'R' ? 'reco' : 'calcul'; stats[m] ??= { sessions: 0, meilleurScore: 0, derniereSession: null, elements: {}, niveaux: {} }; stats[m].niveaux[code[1]] = 8; }
    return { ...x, stats };
  };
  for (let i = 0; i < 11; i++) { const p = P.prochaineSeance(e, cas); suite.push(p.code); if (p.code === 'libre') break; e = acquerir(e, p.code); }
  t.ok(suite.join(' ') === 'R1 C1 P1 B R2 C2 P2 R3 C3 P3 libre', `parcours Débutant : ${suite.join(' → ')}`);
  t.ok(P.prochaineSeance(d, cas).href === '#/entrainement/reco?n=1' && P.ordreModes('debutant').join() === 'reco,calcul,panne,banc,isolement,examen',
    'débutant : première séance Reconnaissance niveau I ; accueil ordonné Reconnaissance → Calculs → Cas → Banc');
  t.ok(P.ordreModes('confirme')[0] === 'banc' && P.prochaineSeance(etat({ profil: 'confirme' }), cas).code === 'T', 'confirmé : le banc en premier, et la première recommandation est le test de positionnement');
  t.ok(P.prochaineSeance(etat({ stats: reco(1) }), cas).code === 'C1', 'reconnaissance niveau I à 80 % : la séance suivante passe aux calculs');
  const p1 = P.prochaineSeance(acquerir(acquerir(d, 'R1'), 'C1'), cas);
  t.ok(p1.code === 'P1' && !cas.find(c => p1.href.endsWith(encodeURIComponent(c.id))).domaines.includes('hta'), 'premier cas de panne proposé : un cas de niveau I hors HTA');

  t.ok(P.conseilNiveau(d, 'reco', 1) === null && /80 % au niveau I/.test(P.conseilNiveau(d, 'reco', 2)) && /niveau II/.test(P.conseilNiveau(d, 'calcul', 3)),
    'mentions : niveau I libre, niveau II « conseillé après 80 % au niveau I », niveau III après le II');
  t.ok(P.conseilNiveau(etat({ stats: reco(1) }), 'reco', 2) === null, 'niveau I acquis : plus de mention sur le niveau II');
  t.ok(/expert/.test(P.conseilNiveau(d, 'reco', 1, { domaine: 'hta' })), 'domaine HTA : mention « domaine expert » même au niveau I tant que le II n\'est pas acquis');
  const hta = cas.find(c => c.domaines.includes('hta') && c.niveau === 1);
  t.ok(/HTA/.test(P.conseilCas(d, hta, cas)) && P.conseilCas(d, cas.find(c => c.niveau === 1 && !c.domaines.includes('hta')), cas) === null, 'cas de panne : HTA mentionné, niveau I hors HTA libre');
  t.ok(P.conseilBanc(d, cas) && P.conseilBanc(etat({ profil: 'confirme' }), cas) === null, 'banc : conseillé après un premier cas réussi (sauf profil confirmé)');

  t.ok(P.niveauValide({ 1: 4, 2: 3, 3: 3 }) === 3 && P.niveauValide({ 1: 3, 2: 3, 3: 0 }) === 2 && P.niveauValide({ 1: 2, 2: 4, 3: 4 }) === 0 && P.niveauValide({ 1: 3, 2: 2, 3: 4 }) === 1,
    'positionnement : 3 bonnes réponses sur 4 par niveau, et un niveau n\'est validé que si les précédents le sont');
  const pos = etat({ profil: 'confirme', positionnement: { niveau: 2, score: 8, date: 1, niveaux: { reco: 2, calcul: 2, panne: 2 } } });
  t.ok(P.conseilNiveau(pos, 'reco', 3) === null && P.conseilCas(pos, hta, cas) === null && P.prochaineSeance(pos, cas).code === 'B',
    'positionnement niveau II dans les trois modes : mentions levées jusqu\'au niveau III et HTA, parcours repris au banc');
  t.ok(P.TOTAL_POSITIONNEMENT === 12 && P.PAR_NIVEAU === 4 && P.COMPOSITION.reco === 2 && P.COMPOSITION.calcul === 1 && P.COMPOSITION.panne === 1,
    'test de positionnement : 12 questions, 4 par niveau (2 reconnaissances, 1 calcul, 1 cas de panne)');

  // Le positionnement ne valide un mode que par ses propres questions.
  const rep = (n, reco, calcul, panne) => [{ niveau: n, mode: 'reco', juste: reco >= 1 }, { niveau: n, mode: 'reco', juste: reco >= 2 }, { niveau: n, mode: 'calcul', juste: calcul }, { niveau: n, mode: 'panne', juste: panne }];
  const tout = P.resultatPositionnement([...rep(1, 2, true, true), ...rep(2, 2, true, true), ...rep(3, 2, true, true)]);
  t.ok(tout.score === 12 && tout.niveau === 3 && tout.niveaux.reco === 3 && tout.niveaux.calcul === 3 && tout.niveaux.panne === 3, 'positionnement 12/12 : niveau III validé dans les trois modes');
  const symboles = P.resultatPositionnement([...rep(1, 2, true, false), ...rep(2, 2, false, true), ...rep(3, 2, true, true)]);
  t.ok(symboles.niveau === 3 && symboles.niveaux.reco === 3 && symboles.niveaux.calcul === 1 && symboles.niveaux.panne === 0,
    'calcul raté au niveau II, cas raté au niveau I : reconnaissance III, calculs I seulement, cas de panne rien');
  const ancien = etat({ positionnement: { niveau: 3, score: 10, date: 1 } });
  t.ok(P.niveauAcquis(ancien, 'reco', 3) && !P.niveauAcquis(ancien, 'calcul', 1) && !P.niveauAcquis(ancien, 'panne', 1),
    'ancien test (reconnaissance seule) : ne valide plus que la reconnaissance, ni les calculs ni les cas');

  // Banc : pannes graduées et étape validée avec indices.
  const banc = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/banc-depart-moteur.json'), 'utf8')).pannes;
  const bancReussi = ids => etat({ stats: { banc: { sessions: 1, meilleurScore: 1, derniereSession: 1, elements: Object.fromEntries(ids.map(id => [id, { essais: 1, reussites: 1 }])) } } });
  t.ok(banc.every(p => [1, 2, 3].includes(p.niveau)) && [1, 2, 3].every(n => banc.some(p => p.niveau === n)), 'banc : chaque panne porte un niveau, les trois niveaux sont représentés');
  t.ok(P.pannesCandidates(etat(), banc).every(p => p.niveau === 1) && Math.max(...banc.filter(p => p.niveau === 1).map(p => p.reference)) < 60,
    'débutant au banc : seules des pannes de niveau I (référence < 1 h) peuvent tomber');
  t.ok(P.niveauBanc(bancReussi(['fu1-fondu']), banc) === 2 && P.niveauBanc(bancReussi(['fu1-fondu', 'fusible-l2']), banc) === 3
    && P.niveauBanc(bancReussi(banc.map(p => p.id)), banc) === 0 && P.pannesCandidates(bancReussi(banc.map(p => p.id)), banc).length === banc.length - 0,
    'banc : niveau II après une panne de niveau I réparée, III après le II, puis tirage libre');
  t.ok(P.pannesCandidates(etat(), banc, 'fu1-fondu').every(p => p.id !== 'fu1-fondu'), 'banc : jamais deux fois de suite la même panne');
}

// ---------- Correction en deux temps : l'essentiel tient en une soixantaine de mots, partout ----------

function correctionEnDeuxTemps(t) {
  t.section('U4. Correction en deux temps (tuteur.js) : essentiel ≤ 70 mots sur tout le contenu');
  const mots = x => String(x ?? '').trim().split(/\s+/).filter(Boolean).length;
  const lire = f => JSON.parse(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  const PLAFOND = 70;
  const r = resume('Voir la NF C 15-100, § 411.3.3, et la tension 2,4 kΩ. Deuxième phrase ici.', 12);
  t.ok(r.court === 'Voir la NF C 15-100, § 411.3.3, et la tension 2,4 kΩ.' && !r.complet, 'phrases entières : « § 411.3.3 » et « 2,4 kΩ » ne coupent pas une phrase');
  const long = resume('Une phrase très longue, avec une articulation au milieu : puis encore beaucoup de mots qui dépassent largement la limite fixée pour le résumé court.', 12);
  t.ok(long.court.endsWith('…') && mots(long.court) <= 12 && !long.complet, `première phrase trop longue : coupée à une articulation, avec « … » (« ${long.court} »)`);

  const pires = [];
  for (const q of lire('data/reconnaissance.json')) {
    for (const pp of Object.values(q.pourquoiPas)) {
      // « Pas encore. » + « Il fallait reconnaître : <nom>. » + « Pourquoi pas ce choix » + pourquoi + « Le risque, en vrai » + risque
      pires.push({ id: q.id, n: 2 + 3 + mots(q.nom) + 4 + mots(resume(pp, MOTS_POURQUOI).court) + 4 + mots(resume(q.risque, MOTS_RISQUE).court) });
    }
  }
  for (const c of lire('data/pannes.json')) pires.push({ id: c.id, n: 2 + mots(resume(c.conclusion.cause, MOTS_POURQUOI).court) + 4 + mots(resume(c.conclusion.risque, MOTS_RISQUE).court) });
  for (const b of lire('data/banc-depart-moteur.json').pannes) pires.push({ id: b.id, n: 2 + mots(resume(b.cause, MOTS_POURQUOI).court) + 4 + mots(resume(b.risque, MOTS_RISQUE).court) });
  pires.sort((a, b) => b.n - a.n);
  t.ok(pires[0].n <= PLAFOND, `reconnaissance, cas de panne, banc : essentiel le plus long = ${pires[0].n} mots (${pires[0].id}), plafond ${PLAFOND}`);
}

// ---------- Révision des erreurs : 5 boîtes de Leitner (leitner.js) ----------

function bancEclairage(t) {
  t.section('U6. Solveur du banc : circuit d\'éclairage par télérupteur');
  const b = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/banc-eclairage.json'), 'utf8'));
  const fermes = e => b.elements.filter(el => !(e.ouverts ?? []).includes(el.id) && (!el.commande || (el.commande === 'q1' && !e.consigne) || (el.commande === 'tl' && e.tl) || (el.commande === 'appui' && e.appui) || (el.commande === 'marche' && e.marche)));
  const v = (e, a, c, m = 'hz') => Math.round(tension(b, fermes(e), a, c, m).valeur);
  t.ok(v({ appui: true }, 'r', 'an') === 230 && v({ marche: true }, 'r', 'an') === 230 && v({}, 'r', 'an') === 0, 'bobine du télérupteur : 230 V pendant l\'appui sur S1 ou S3, 0 V au repos');
  t.ok(v({ tl: true }, 'd', 'h1n') === 230 && v({ tl: true }, 'd2', 'h2n') === 230 && v({}, 'd', 'h1n') === 0, 'contact fermé : 230 V aux bornes des deux lampes');
  t.ok(v({ tl: true, ouverts: ['n-boite'] }, 'nb', 'PE') === 230 && v({ tl: true, ouverts: ['n-boite'] }, 'd', 'h1n') === 0, 'neutre coupé dans la boîte : neutre des lampes à 230 V, lampes éteintes');
  t.ok(tension(b, fermes({ ouverts: ['n-boite'] }), 'nb', 'PE').instable && v({ ouverts: ['n-boite'] }, 'nb', 'PE', 'loz') === 0, 'neutre coupé, contact ouvert : tension fantôme instable, effacée en LoZ');
  t.ok(v({ marche: true, ouverts: ['cbl-s3'] }, 's3a', 'PE') === 0 && v({ marche: true, ouverts: ['cbl-s3'] }, 'b', 'PE') === 230, 'câble vers S3 coupé : 230 V à la boîte de commande, 0 V à S3');
  t.ok(Math.round(resistance(b, fermes({ tl: true, consigne: true, ouverts: ['h2'] }), 'd2', 'h2n')) === 2645 && resistance(b, fermes({ consigne: true, ouverts: ['kl'] }), 'r', 'an') === Infinity,
    'Ω : lampe H2 coupée mesurée en place = H1 en parallèle (2 645 Ω) ; bobine coupée = OL');
}

function revisionEspacee(t) {
  t.section('U5. Révision des erreurs (leitner.js) : répétition espacée en 5 boîtes');
  const J = 24 * 60 * 60 * 1000, t0 = 1_800_000_000_000;
  const rate = L.appliquerResultat(undefined, false, t0);
  t.ok(rate.essais === 1 && rate.reussites === 0 && rate.boite === 1 && rate.revoir === t0, 'erreur : boîte 1, à revoir tout de suite');
  t.ok(isDeepStrictEqual(L.appliquerResultat(undefined, true, t0), { essais: 1, reussites: 1, recents: '1' }), 'réussi du premier coup : n\'entre pas en révision');
  let e = rate; const dates = [];
  for (let i = 0; i < 4; i++) { e = L.appliquerResultat(e, true, t0); dates.push((e.revoir - t0) / J); }
  t.ok(e.boite === 5 && dates.join() === '1,3,7,15', `réussites successives : boîtes 2 à 5, revues après ${dates.join(', ')} jours`);
  const sorti = L.appliquerResultat(e, true, t0);
  t.ok(sorti.boite === undefined && sorti.revoir === undefined && sorti.reussites === 5, 'réussi en boîte 5 : acquis, sort de la révision');
  t.ok(L.appliquerResultat(e, false, t0).boite === 1, 'une erreur en boîte 4 ou 5 renvoie en boîte 1');
  const etat = { stats: {
    reco: { elements: { a: { essais: 2, reussites: 1, boite: 1, revoir: t0 - 1 }, b: { essais: 3, reussites: 3 } } },
    calcul: { elements: { ohm: { essais: 2, reussites: 1, boite: 3, revoir: t0 + 3 * J } } },
    panne: { elements: { 'vat-procedure': { essais: 1, reussites: 0, boite: 1, revoir: t0 } } }
  } };
  const liste = L.enRevision(etat, t0);
  t.ok(liste.length === 3 && liste.filter(r => r.du).map(r => r.id).sort().join() === 'a,vat-procedure' && L.aReviser(etat, 'calcul', t0).length === 0
    && L.aReviser(etat, 'calcul', t0 + 3 * J).length === 1, 'à réviser : seulement les éléments dont la date est arrivée, tous modes confondus');
  const sauve = controler({ version: 1, stats: { reco: { elements: { a: { essais: 2, reussites: 1, boite: 2, revoir: t0 } } } } });
  t.ok(sauve.anomalies.length === 0 && sauve.etat.stats.reco.elements.a.boite === 2, 'sauvegarde : boîte et date de révision conservées');
  const abimee = controler({ version: 1, stats: { reco: { elements: { a: { essais: 2, reussites: 1, boite: 9, revoir: 'demain' } } } } });
  t.ok(abimee.anomalies.some(a => a.includes('révision')) && abimee.etat.stats.reco.elements.a.boite === undefined && abimee.etat.stats.reco.elements.a.essais === 2,
    'sauvegarde : révision abîmée refusée, compteurs gardés');
}

// ---------- Audit d'intégrité normatif et technique (outils/audit.mjs) ----------

async function auditIntegrite(t) {
  t.section('U0. Audit d\'intégrité normatif et technique de tout le contenu (outils/audit.mjs)');
  const r = await auditer();
  const familles = [...new Set(r.lignes.map(l => l.famille))];
  t.ok(r.lignes.length >= 130 && familles.length >= 6, `${r.lignes.length} éléments audités (${familles.join(', ')})`);
  t.ok(r.anomalies.length === 0, `${r.controles} contrôles : normes datées, calculs, seuils d'isolement, blocs de sécurité, structure` + (r.anomalies.length ? ' — ' + r.anomalies.slice(0, 5).join(' | ') : ''));
  const sources = fs.readdirSync(path.join(RACINE, 'js')).map(f => fs.readFileSync(path.join(RACINE, 'js', f), 'utf8')).join('\n')
    + ['data/reconnaissance.json', 'data/pannes.json', 'data/isolement.json'].map(f => fs.readFileSync(path.join(RACINE, f), 'utf8')).join('\n');
  t.ok(!/pas encore validé|validé par un formateur|"verifie"/.test(sources), 'plus aucune mention « contenu non validé » ni champ « verifie » dans l\'application');
}

// ---------- Guidage dynamique de l'accueil (guidage.js) et fiches mémo (memos.js) ----------

function guidageEtMemos(t) {
  t.section('U7. Guidage par domaine (guidage.js) et fiches mémo (memos.js)');
  const lire = f => JSON.parse(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  const catalogue = {
    reco: [{ id: 'r1', niveau: 1, domaines: ['tri'] }, { id: 'r2', niveau: 1, domaines: ['mono-bt'] }],
    calcul: [{ id: 'c1', niveau: 2, domaines: ['tri'] }, { id: 'c2', niveau: 1, domaines: ['tri'] }, { id: 'c3', niveau: 1, domaines: ['securite'] }],
    panne: [{ id: 'p1', niveau: 2, domaines: ['securite'] }]
  };
  const st = (reco, calcul, panne = {}) => ({ stats: { reco: { elements: reco }, calcul: { elements: calcul }, panne: { elements: panne } } });
  const prochaine = { code: 'R1', href: '#/entrainement/reco?n=1', titre: 'Reconnaissance · niveau I', desc: '…' };
  const e1 = st({ r1: { essais: 3, reussites: 2 }, r2: { essais: 4, reussites: 4 } }, { c1: { essais: 6, reussites: 1 }, c2: { essais: 2, reussites: 2 } });
  const b = G.bilanDomaines(e1, catalogue);
  t.ok(b.tri.essais === 11 && b.tri.reussites === 5 && b['mono-bt'].essais === 4 && b.securite.essais === 0, 'bilan par domaine : réponses cumulées par domaine principal (Triphasé 5/11, Monophasé 4/4)');
  const r1 = G.recommandation(e1, catalogue, prochaine);
  t.ok(r1.type === 'lacune' && r1.titre === 'Taux d\'échec élevé en Triphasé (55 %)' && r1.href === '#/entrainement/calcul?n=2&d=tri',
    `lacune : « ${r1.titre} » → séance ciblée sur le mode et le niveau qui concentrent les erreurs (${r1.href})`);
  const e2 = st({}, { c3: { essais: 2, reussites: 2 } }, { p1: { essais: 5, reussites: 1 } });
  const r2 = G.recommandation(e2, catalogue, prochaine);
  t.ok(r2.type === 'lacune' && r2.domaine === 'securite' && r2.href === '#/entrainement/panne?c=p1', 'lacune portée par un cas de panne : le cas le plus raté est rouvert directement');
  const e3 = st({ r1: { essais: 3, reussites: 0 } }, {});
  t.ok(G.recommandation(e3, catalogue, prochaine).type === 'parcours', `moins de ${G.ESSAIS_MIN} réponses dans un domaine : pas de conclusion hâtive, suite du parcours`);
  const e4 = { ...st({ r1: { essais: 10, reussites: 8 } }, { c1: { essais: 10, reussites: 7 } }), profil: 'formation' };
  e4.stats.reco.niveaux = { 1: 9 }; e4.stats.calcul.niveaux = { 1: 8 };
  const r4 = G.recommandation(e4, catalogue, { code: 'R2', href: '#/entrainement/reco?n=2', titre: '', desc: '' });
  t.ok(r4.type === 'niveau' && r4.titre === 'Fondations acquises — Passe au niveau II' && r4.href === '#/entrainement/reco?n=2', 'niveau I acquis en reconnaissance et en calculs : « Fondations acquises — Passe au niveau II »');

  const memos = lire('data/memos.json');
  const contenu = {
    reco: lire('data/reconnaissance.json').map(q => q.id),
    panne: lire('data/pannes.json').map(c => c.id),
    isolement: lire('data/isolement.json').map(x => x.id),
    calcul: [...fs.readFileSync(path.join(RACINE, 'js/calcul.js'), 'utf8').matchAll(/\n    id: '([^']+)'/g)].map(m => m[1])
  };
  const sansMemo = Object.entries(contenu).flatMap(([mode, ids]) => ids.filter(id => !memoPour(memos, mode, id)).map(id => `${mode}:${id}`));
  const doublons = Object.entries(contenu).flatMap(([mode, ids]) => ids.filter(id => memos.filter(m => m.cibles?.[mode]?.includes(id)).length > 1));
  const cibles = Object.entries(contenu).every(([mode]) => memos.every(m => (m.cibles?.[mode] ?? []).every(id => contenu[mode].includes(id))));
  t.ok(sansMemo.length === 0 && doublons.length === 0 && cibles, `chaque question, calcul, cas et mesure a sa fiche mémo (${Object.values(contenu).flat().length} éléments, ${memos.length} fiches), aucune cible inconnue` + (sansMemo.length ? ' — sans fiche : ' + sansMemo.join(', ') : ''));
  const mots = m => (m.texte.match(/[\p{L}\d]+/gu) ?? []).length;
  t.ok(memos.every(m => mots(m) <= 100 && m.titre && G && ['tbt-cc', 'mono-bt', 'tri', 'securite', 'hta'].includes(m.domaine)) && new Set(memos.map(m => m.id)).size === memos.length,
    `fiches de 30 secondes : ${Math.max(...memos.map(mots))} mots au plus (plafond 100), domaine valide, ids uniques`);
  const html = markdown('Règle **forte** et `U = R × I`\n\n- un\n- deux\n\n```\nA ── B\n```\n> Jamais <script>alert(1)</script>');
  t.ok(html.includes('<strong>forte</strong>') && html.includes('<code>U = R × I</code>') && html.includes('<ul><li>un</li><li>deux</li></ul>')
    && html.includes('<pre class="memo-schema">A ── B</pre>') && html.includes('memo-regle') && !html.includes('<script>'), 'Markdown des fiches : gras, code, listes, schéma en texte, règle ; HTML échappé');
}

// ---------- Insignes de terrain et séries (badges.js) ----------

function insignesEtSeries(t) {
  t.section('U8. Insignes de terrain et séries de jours (badges.js)');
  const lire = f => JSON.parse(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  t.ok(B.jourLocal(new Date(2026, 0, 5)) === '2026-01-05' && B.ajouterJour(['2026-01-05'], '2026-01-05').length === 1
    && B.ajouterJour(['2026-01-06'], '2026-01-05').join() === '2026-01-05,2026-01-06', 'jour local « AAAA-MM-JJ », sans doublon, trié');
  const j = ['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-05'];
  t.ok(B.serieEnCours(j, '2026-03-05') === 1 && B.serieEnCours(j, '2026-03-06') === 1 && B.serieEnCours(j, '2026-03-07') === 0,
    'série en cours : compte encore le lendemain, retombe à 0 après un jour sans entraînement');
  t.ok(B.serieEnCours(j.slice(0, 4), '2026-03-01') === 4 && B.meilleureSerie(j) === 4, 'série à cheval sur la fin février (28 jours) : 4 jours, meilleure série 4');
  t.ok(B.serieEnCours(['2026-03-29', '2026-03-30'], '2026-03-30') === 2, 'passage à l\'heure d\'été : la série ne se casse pas');
  t.ok(B.serieEnCours([], '2026-03-01') === 0 && B.meilleureSerie([]) === 0, 'aucun jour : série 0');

  const cas = lire('data/pannes.json');
  t.ok(B.CAS_EMBRANCHEMENTS.join() === cas.filter(c => c.etapes.some(e => e.branche)).map(c => c.id).join()
    && B.SCENARIOS_ISOLEMENT.join() === lire('data/isolement.json').map(x => x.id).join()
    && B.CAS_CONSIGNATION.every(id => cas.some(c => c.id === id)), 'listes des insignes à jour avec les données (cas à embranchements, mesures d\'isolement, cas de consignation)');
  t.ok(B.BADGES.length >= 6 && B.BADGES.length <= 8 && new Set(B.BADGES.map(b => b.id)).size === B.BADGES.length
    && B.BADGES.every(b => b.icone.startsWith('<svg') && !/<text/.test(b.icone) && b.nom && b.critere), `${B.BADGES.length} insignes : icône SVG sans texte, nom et critère`);

  const vide = { stats: {}, activite: { jours: [] }, jalons: {}, badges: {} };
  t.ok(B.badgesMerites(vide).length === 0, 'nouvel utilisateur : aucun insigne');
  const el = (n, ok = true) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, { essais: 1, reussites: ok ? 1 : 0 }]));
  const plein = {
    stats: {
      banc: { elements: { 'fu1-fondu': { essais: 2, reussites: 1 } } },
      panne: { elements: { ...el(4, false), 'pompe-thermique-rearme': { essais: 1, reussites: 1 }, 'consignation-contacteur': { essais: 2, reussites: 1 }, 'vat-procedure': { essais: 1, reussites: 1 } } },
      calcul: { meilleurScore: 10, elements: {} }
    },
    activite: { jours: ['2026-03-01', '2026-03-02', '2026-03-03'] },
    jalons: { memosApresErreur: 10, isolementPropre: [...B.SCENARIOS_ISOLEMENT] },
    badges: {}
  };
  t.ok(B.badgesMerites(plein).length === B.BADGES.length, 'toutes les conditions remplies : les 8 insignes mérités');
  const presque = structuredClone(plein);
  presque.stats.banc.elements['fu1-fondu'].reussites = 0;
  presque.jalons.memosApresErreur = 9; presque.jalons.isolementPropre.pop();
  presque.stats.panne.elements['pompe-thermique-rearme'] = { essais: 2, reussites: 1 };
  presque.activite.jours = ['2026-03-01', '2026-03-02', '2026-03-04'];
  presque.stats.calcul.meilleurScore = 9;
  t.ok(B.badgesMerites(presque).sort().join() === 'chasseur-pannes,consignateur', 'une condition manquée de peu : insigne refusé (banc avec alerte, 9 fiches, une mesure manquante, embranchement au 2e essai, série coupée, 9/10)');
  t.ok(B.nouveauxBadges({ ...plein, badges: { 'habilite-banc': 1 } }).length === B.BADGES.length - 1, 'insigne déjà enregistré : pas décerné une seconde fois');
  const prog = B.badge('chasseur-pannes').progression(presque);
  t.ok(prog.valeur === 5 && prog.cible === 5 && B.badge('megohmmetre').progression(presque).valeur === B.SCENARIOS_ISOLEMENT.length - 1, `progression affichable : 5/5 cas, ${B.SCENARIOS_ISOLEMENT.length - 1}/${B.SCENARIOS_ISOLEMENT.length} mesures`);

  const abime = controler({ version: 1, activite: { jours: ['hier'] }, jalons: { memosApresErreur: -1 }, badges: { 'habilite-banc': 'jamais' } });
  t.ok(abime.anomalies.some(a => a.startsWith('activite')) && abime.anomalies.some(a => a.startsWith('jalons')) && abime.anomalies.some(a => a.includes('badges'))
    && abime.etat.activite.jours.length === 0 && Object.keys(abime.etat.badges).length === 0, 'sauvegarde : jours, jalons ou insignes abîmés refusés, valeurs par défaut au démarrage');
}

// ---------- Corrections de l'audit 360° (C1, C2) ----------

function correctionsAudit360(t) {
  t.section('U9. Audit 360° : aiguillage sur les 10 dernières réponses (C1), dates de série (C2)');
  // C1 — un progrès efface la lacune
  let el;
  for (let i = 0; i < 10; i++) el = L.appliquerResultat(el, false, 1);
  for (let i = 0; i < 10; i++) el = L.appliquerResultat(el, true, 1);
  t.ok(el.essais === 20 && el.reussites === 10 && el.recents === '1111111111', 'historique : 20 réponses comptées, seules les 10 dernières gardées (« 1111111111 »)');
  const cat = { reco: [{ id: 'a', niveau: 1, domaines: ['tri'] }], calcul: [], panne: [] };
  const prochaine = { code: 'R1', href: '#/entrainement/reco?n=1', titre: 'Suite du parcours', desc: '' };
  const progres = { stats: { reco: { elements: { a: el } } } };
  t.ok(G.recommandation(progres, cat, prochaine).type === 'parcours', '10 erreurs puis 10 réussites : plus de « taux d\'échec élevé », retour au parcours');
  let rechute = el;
  for (let i = 0; i < 7; i++) rechute = L.appliquerResultat(rechute, false, 1);
  const r = G.recommandation({ stats: { reco: { elements: { a: rechute } } } }, cat, prochaine);
  t.ok(r.type === 'lacune' && r.titre.includes('(70 %)'), `7 erreurs dans les 10 dernières réponses : « ${r.titre} »`);
  const ancien = G.recentes({ essais: 40, reussites: 10 });
  t.ok(ancien.essais === 10 && ancien.reussites === 3, 'ancienne sauvegarde sans historique récent : ramenée à 10 réponses, même proportion');
  t.ok(controler({ version: 1, stats: { reco: { elements: { a: { essais: 3, reussites: 1, recents: '101' } } } } }).anomalies.length === 0
    && controler({ version: 1, stats: { reco: { elements: { a: { essais: 2, reussites: 1, recents: '101' } } } } }).anomalies.length > 0
    && controler({ version: 1, stats: { reco: { elements: { a: { essais: 3, reussites: 1, recents: '1<b' } } } } }).anomalies.length > 0,
    'sauvegarde : historique récent contrôlé (« 0 » / « 1 », jamais plus long que le nombre d\'essais)');

  // C2 — dates impossibles ou futures
  t.ok(B.dateValide('2028-02-29') && !B.dateValide('2026-02-29') && !B.dateValide('2026-13-45') && !B.dateValide('2026-04-31') && !B.dateValide('26-01-01') && !B.dateValide(20260101),
    'dates : 29 février bissextile acceptée ; mois 13, 30/31 inexistants, format erroné refusés');
  t.ok(B.serieEnCours(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-02') === 2 && B.meilleureSerie(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-02') === 2,
    'horloge avancée puis remise à l\'heure : les jours futurs ne comptent pas dans la série');
  t.ok(B.serieEnCours(['2026-13-45', '2026-11-02'], '2026-11-02') === 1 && B.ajouterJour(['2026-13-45'], '2026-11-02').join() === '2026-11-02' && B.ajouterJour([], 'n\'importe quoi').length === 0,
    'une date impossible ne compte jamais comme jour d\'entraînement');
  const imp = controler({ version: 1, activite: { jours: ['2026-10-31', '2026-13-45'] } });
  const fut = controler({ version: 1, activite: { jours: ['2026-10-31', '2999-01-01'] } });
  t.ok(imp.anomalies.some(a => a.startsWith('activite')) && fut.anomalies.length === 0 && fut.etat.activite.jours.join() === '2026-10-31',
    'sauvegarde : date impossible refusée (fichier abîmé) ; date future ignorée sans bloquer l\'import');
}

// ---------- Mégohmmètre : lecture à 1 minute, DAR et indice de polarisation ----------

async function mesureIsolementDansLeTemps(t) {
  t.section('U10. Mégohmmètre : lecture à 1 minute, DAR et indice de polarisation (isolement.js)');
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const I = await import('../js/isolement.js');
  const iso = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/isolement.json'), 'utf8'));
  const s = iso.find(x => x.id === 'iso-moteur-vernis');
  const essai = (sc, duree, extra = {}) => I.lecture(sc, { consigne: true, debranche: true, tension: 500, a: sc.points[0], b: 'PE', duree, ...extra });
  const r60 = essai(s, 60), r15 = essai(s, 15), r600 = essai(s, 600);
  t.ok(r60.valeur === 80 && !r60.methode && !r60.ip && I.lecture(s, { consigne: true, tension: 500, a: 'U1', b: 'PE' }).valeur === 80,
    'lecture à 1 minute par défaut : 80 MΩ, sans erreur de méthode');
  t.ok(r15.valeur === 68.8 && r15.methode === 'Lecture prise avant 1 minute' && r15.note.includes('on lit à 1 minute'),
    'lecture à 15 s sur un enroulement : 68,8 MΩ, valeur sous-estimée, erreur de méthode');
  t.ok(r600.ip && r600.ip.r30 === 73.6 && r600.ip.r60 === 80 && r600.ip.r600 === 104 && r600.ip.dar === 1.09 && r600.ip.ip === 1.3 && r600.valeur === 104,
    `essai de 10 minutes : R30 s 73,6 · R1 min 80 · R10 min 104 MΩ → DAR ${r600.ip?.dar}, IP ${r600.ip?.ip}`);
  t.ok(/DAR = 1,09 \(douteux\)/.test(r600.note) && /IP = 1,30 \(douteux/.test(r600.note) && r600.note.includes('au-dessus du seuil'),
    'note : DAR et IP calculés et interprétés, la valeur à 1 minute comparée au seuil');
  const h = essai(iso.find(x => x.id === 'iso-alternateur-humide'), 600);
  t.ok(h.ip.dar === 1.02 && h.ip.ip === 1.04, `alternateur humide : DAR ${h.ip.dar}, IP ${h.ip.ip} (le courant de fuite domine)`);
  t.ok(['dangereux', 'douteux', 'bon', 'tres-bon'].join() === [0.8, 1.5, 2.5, 4.5].map(v => I.interpreterIP(v).niveau).join()
    && I.interpreterIP(2).niveau === 'bon' && I.interpreterIP(1).niveau === 'douteux'
    && ['dangereux', 'douteux', 'bon', 'tres-bon'].join() === [0.9, 1.1, 1.4, 1.7].map(v => I.interpreterDAR(v).niveau).join(),
    'interprétation : IP < 1 dangereux, 1 à 2 douteux, 2 à 4 bon, ≥ 4 très bon ; DAR < 1, < 1,25, < 1,6, au-delà');
  const cable = iso.find(x => x.id === 'iso-cable-vieillissant');
  t.ok(!essai(cable, 600).ip && essai(cable, 600).note.includes('l\'IP n\'apporte rien') && !essai(cable, 15).methode,
    'câble sans enroulement : pas d\'IP calculé, lecture stable dès 15 s');
  t.ok(essai(iso.find(x => x.id === 'iso-alternateur-humide'), 600, { debranche: false }).degat?.includes('régulateur'),
    'régulateur (AVR) resté raccordé : matériel endommagé, même pendant un essai de 10 minutes');
  t.ok(iso.filter(x => x.ipRequis).every(x => x.absorption && x.verdicts.some(v => v.bon && /IP/.test(v.texte + v.explication))),
    'scénarios à IP exigé : absorption décrite, la bonne conclusion repose sur l\'IP');
}

// ---------- Répétition espacée : les erreurs reviennent dans les séances ordinaires ----------

function rappelsDansLesSeances(t) {
  t.section('U11. Rappels d\'erreurs glissés dans les séances ordinaires (leitner.js)');
  const J = 86_400_000, maintenant = Date.UTC(2026, 10, 3, 12);
  let el = L.appliquerResultat(undefined, false, maintenant - 3 * J);          // raté il y a 3 jours
  const etat = { stats: { reco: { elements: {
    ancien: el,
    hier: L.appliquerResultat(undefined, false, maintenant - 1 * J),            // raté hier : trop frais
    boite2: L.appliquerResultat(L.appliquerResultat(undefined, false, maintenant - 2 * J), true, maintenant - 1 * J),   // revu hier : dû aujourd'hui, mais trop frais
    boite3: { essais: 3, reussites: 2, boite: 3, revoir: maintenant - 1 * J },   // revu il y a 4 jours, échéance passée
    tresAncien: L.appliquerResultat(undefined, false, maintenant - 9 * J),
    autre: L.appliquerResultat(undefined, false, maintenant - 5 * J),
    acquis: { essais: 4, reussites: 4 }
  } } } };
  const ids = L.rappelsPourSeance(etat, 'reco', { maintenant, max: 10 });
  t.ok(ids.join() === 'tresAncien,autre,ancien,boite3', `éléments rappelés : ${ids.join(', ')} (erreurs d'au moins ${L.DELAI_RAPPEL_JOURS} jours, les plus en retard d'abord)`);
  t.ok(!ids.includes('hier') && !ids.includes('boite2') && !ids.includes('acquis'), 'erreur d\'hier, élément revu hier, élément jamais raté : pas de rappel');
  t.ok(L.rappelsPourSeance(etat, 'reco', { maintenant }).length === L.RAPPELS_MAX && L.rappelsPourSeance(etat, 'reco', { maintenant, admis: id => id === 'autre' }).join() === 'autre'
    && L.rappelsPourSeance(etat, 'calcul', { maintenant }).length === 0, `au plus ${L.RAPPELS_MAX} rappels par séance ; filtre de la séance (niveau, domaine) respecté ; mode respecté`);
  const base = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const serie = L.intercaler(base, ['R1', 'R2', 'R3'], 10);
  t.ok(serie.length === 10 && serie.indexOf('R1') === 2 && serie.indexOf('R2') === 5 && serie.indexOf('R3') === 7 && serie.slice(0, 2).join() === 'a,b',
    `rappels répartis dans la séance (places ${['R1', 'R2', 'R3'].map(r => serie.indexOf(r) + 1).join(', ')}), jamais en premier`);
  t.ok(L.intercaler(['a', 'b'], ['R1', 'R2', 'R3'], 10).join() === 'a,R1,R2,R3,b' && L.intercaler(base, [], 10).join() === base.join() && L.intercaler(['a'], [], 10).join() === 'a',
    'peu de questions au niveau : la séance raccourcit sans perdre de rappel ; sans rappel, séance inchangée');
  const apres = L.appliquerResultat(etat.stats.reco.elements.ancien, true, maintenant);
  t.ok(apres.boite === 2 && apres.revoir === maintenant + J && L.rappelsPourSeance({ stats: { reco: { elements: { x: apres } } } }, 'reco', { maintenant: maintenant + 2 * J }).join() === 'x',
    'rappel réussi : boîte 2, puis de retour dans une séance 2 jours plus tard');
}

// ---------- Bilan · examen blanc ----------

async function examenBlanc(t) {
  t.section('U12. Bilan · examen blanc : composition, note, bilan par compétence (examen.js)');
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const E = await import('../js/examen.js');
  const { GENERATEURS } = await import('../js/calcul.js');
  const questions = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/reconnaissance.json'), 'utf8'));
  const domaines = ['tbt-cc', 'mono-bt', 'tri', 'securite', 'hta'];
  let ok = true, mixte = true;
  for (let i = 0; i < 60; i++) {
    const l = E.composerExamen(questions, GENERATEURS);
    const cles = new Set(l.map(e => `${e.mode}:${e.id}`));
    ok &&= l.length === E.TAILLE_EXAMEN && cles.size === l.length && domaines.every(d => l.filter(e => e.domaine === d).length === 3);
    mixte &&= domaines.every(d => new Set(l.filter(e => e.domaine === d).map(e => e.mode)).size === 2);
  }
  t.ok(ok, `60 tirages : ${E.TAILLE_EXAMEN} éléments distincts, 3 par domaine`);
  t.ok(mixte, 'dans chaque domaine : questions et calculs mêlés');
  const peu = E.composerExamen(questions.filter(q => q.domaines[0] === 'tri'), GENERATEURS.filter(g => g.domaines[0] === 'tri'));
  t.ok(peu.length === 15 && peu.every(e => e.domaine === 'tri'), 'un domaine seul disponible : la série est complétée à 15 avec lui');

  const rep = (domaine, mode, niveau, juste, repondu = true) => ({ domaine, mode, niveau, juste, repondu });
  const reponses = [
    ...['tbt-cc', 'mono-bt', 'tri'].flatMap(d => [rep(d, 'reco', 1, true), rep(d, 'calcul', 2, true), rep(d, 'reco', 3, true)]),
    rep('securite', 'reco', 1, true), rep('securite', 'calcul', 2, false), rep('securite', 'reco', 3, false, false),
    rep('hta', 'reco', 1, false), rep('hta', 'calcul', 2, false), rep('hta', 'reco', 3, false)
  ];
  const b = E.bilanExamen(reponses);
  t.ok(b.score === 10 && b.total === 15 && b.sur20 === 13.5 && b.sansReponse === 1 && b.mention === 'Admissible, à consolider',
    `10/15 : ${b.sur20}/20, « ${b.mention} », 1 sans réponse`);
  t.ok(b.parDomaine.tri.verdict === 'acquis' && b.parDomaine.securite.verdict === 'a-consolider' && b.parDomaine.hta.verdict === 'a-retravailler'
    && b.parType.reco.total === 10 && b.parType.calcul.justes === 3 && b.parNiveau[3].justes === 3,
    'bilan par compétence : domaine acquis (3/3), à consolider (1/3), à retravailler (0/3) ; par type et par niveau');
  t.ok(E.bilanExamen(reponses.map(r => ({ ...r, juste: true }))).mention === 'Prêt pour l\'examen' && E.bilanExamen(reponses.slice(0, 8).concat(reponses.slice(9).map(r => ({ ...r, juste: false })))).mention === 'À retravailler',
    'mentions : ≥ 80 % « Prêt pour l\'examen », < 60 % « À retravailler »');
  t.ok(E.minutes(905) === '15:05' && E.minutes(59) === '00:59' && E.DUREE_EXAMEN === 900, 'chronomètre : 15 minutes, affichage mm:ss');
  t.ok(controler({ version: 1, stats: { examen: { sessions: 2, meilleurScore: 12, derniereSession: 1, elements: {} } } }).anomalies.length === 0,
    'sauvegarde : statistiques de l\'examen blanc acceptées à l\'import');
}
