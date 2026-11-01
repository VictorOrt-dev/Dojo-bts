// Tests unitaires, sans navigateur : modules purs (solveur du banc, contrôle des sauvegardes).

import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { RACINE } from './outils.mjs';
import { tension, resistance } from '../js/circuit.js';
import { controler, etatParDefaut, XP_MAX } from '../js/sauvegarde.js';
import * as P from '../js/parcours.js';

export default async function ({ t }) {
  physiqueDuBanc(t);
  controleDesSauvegardes(t);
  parcoursGuide(t);
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
    preferences: { matiere: 'porcelaine' },
    profil: 'formation',
    positionnement: { niveau: 2, score: 8, date: 1761900000000 }
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
  t.ok(P.prochaineSeance(d, cas).href === '#/entrainement/reco?n=1' && P.ordreModes('debutant').join() === 'reco,calcul,panne,banc',
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

  t.ok(P.niveauValide({ 1: 3, 2: 4, 3: 3 }) === 3 && P.niveauValide({ 1: 2, 2: 3, 3: 0 }) === 2 && P.niveauValide({ 1: 1, 2: 4, 3: 3 }) === 0 && P.niveauValide({ 1: 3, 2: 2, 3: 3 }) === 1,
    'positionnement : un niveau n\'est validé que si les précédents le sont (3/3·4/4·3/3 → III ; 1/3 → aucun)');
  const pos = etat({ profil: 'confirme', positionnement: { niveau: 2, score: 8, date: 1 } });
  t.ok(P.conseilNiveau(pos, 'reco', 3) === null && P.conseilCas(pos, hta, cas) === null && P.prochaineSeance(pos, cas).code === 'B',
    'positionnement niveau II : mentions levées jusqu\'au niveau III et HTA, parcours repris au banc');
  t.ok(Object.values(P.COMPOSITION).reduce((a, b) => a + b) === 10, 'test de positionnement : 10 questions');
}
