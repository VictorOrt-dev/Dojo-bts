// Tests unitaires, sans navigateur : modules purs (solveur du banc, contrôle des sauvegardes).

import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { RACINE } from './outils.mjs';
import { tension, resistance } from '../js/circuit.js';
import { controler, etatParDefaut, XP_MAX } from '../js/sauvegarde.js';

export default async function ({ t }) {
  physiqueDuBanc(t);
  controleDesSauvegardes(t);
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
    fichesVues: { 'elt-ohm': 1761900000000 },
    stats: {
      reco: { sessions: 3, meilleurScore: 10, derniereSession: 1761900000000, niveaux: { '1': 10, '2': 7 }, elements: { 'sym-contact-no': { essais: 3, reussites: 2 } } },
      banc: { sessions: 1, meilleurScore: 1, derniereSession: null, elements: { 'fu1-fondu': { essais: 1, reussites: 1 } } }
    },
    derniereSauvegarde: 1761900000000,
    preferences: { matiere: 'porcelaine' }
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
  refuse({ version: 1, fichesVues: { 'elt-ohm': 'hier' } }, 'fichesVues', 'date de lecture en texte');
  refuse({ version: 1, derniereSauvegarde: 'hier' }, 'derniereSauvegarde', 'date de sauvegarde en texte');
  refuse({ version: 1, preferences: { matiere: '<img src=x onerror=alert(1)>' } }, 'matiere', 'thème inconnu (injection)');
  refuse({ version: 1, fichesVues: { ['x'.repeat(500)]: 1 } }, 'clé', 'identifiant démesuré');

  // Pollution de prototype : JSON.parse crée une vraie clé « __proto__ ».
  const piege = JSON.parse('{"version":1,"fichesVues":{"__proto__":{"pollue":true}},"stats":{"__proto__":{"pollue":true}}}');
  const rp = controler(piege);
  t.ok(rp.anomalies.length >= 2 && ({}).pollue === undefined && rp.etat.fichesVues.pollue === undefined
    && Object.getPrototypeOf(rp.etat.stats) === Object.prototype, 'clé « __proto__ » : refusée, aucun objet pollué');

  for (const n of [null, [], 'texte', 42]) {
    const { anomalies, etat } = controler(n);
    if (!(anomalies.length === 1 && etat.xp === 0)) t.ok(false, `contenu non objet (${JSON.stringify(n)}) mal géré`);
  }
  t.ok(true, 'contenu qui n\'est pas un objet (null, tableau, texte, nombre) : refusé, état par défaut');

  // Mode « nettoyage » (démarrage) : on garde ce qui est bon, on remplace ce qui est abîmé.
  const abime = controler({ version: 1, xp: '100', fichesVues: { a: 1, b: 'x' }, stats: { reco: { sessions: 2, elements: { q: { essais: 1, reussites: 1 }, z: 'x' } } } });
  t.ok(abime.etat.xp === 0 && Object.keys(abime.etat.fichesVues).join() === 'a' && abime.etat.stats.reco.sessions === 2
    && Object.keys(abime.etat.stats.reco.elements).join() === 'q', 'nettoyage : seuls les champs abîmés reprennent leur valeur par défaut');
  const apres = abime.etat.xp + 10;
  t.ok(typeof apres === 'number' && apres === 10, 'après contrôle, xp + 10 est une addition (plus de concaténation « 100 » + 10)');
}
