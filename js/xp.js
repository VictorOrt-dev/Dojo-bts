// Points d'expérience, rangs et statistiques des exercices.
// Tout est enregistré via storage.js : e.xp (nombre) et e.stats[mode].

import * as stockage from './storage.js';
import { appliquerResultat } from './leitner.js';
import { ajouterJour } from './badges.js';
import { verifierBadges } from './insignes.js';
import { SEUILS } from './seuils.js';
import { jourDe } from './validation.js';

export const NIVEAUX = [
  { nom: 'Apprenti', seuil: 0, icone: '🔰' },
  { nom: 'Compagnon', seuil: 200, icone: '🔧' },
  { nom: 'Technicien', seuil: 600, icone: '⚡' },
  { nom: 'Technicien Confirmé', seuil: 1500, icone: '🛠️' },
  { nom: 'Expert Senior', seuil: 3000, icone: '🏆' }
];

// Pas de bonus de vitesse : le score ne dépend que de la justesse.
// Les XP par bonne réponse dépendent du niveau de difficulté (voir difficulte.js : 10, 15, 20).
export const BAREME = {
  bonneReponse: 10,     // valeur par défaut (niveau I)
  sessionParfaite: 20   // 10/10 sur une séance
};

export function lireXP() {
  return stockage.lire().xp ?? 0;
}

// Niveau atteint pour un total d'XP, avec la progression vers le suivant (0 → 1).
export function niveauPour(xp) {
  const rang = NIVEAUX.findLastIndex(n => xp >= n.seuil);
  const niveau = NIVEAUX[rang];
  const suivant = NIVEAUX[rang + 1] ?? null;
  return {
    ...niveau,
    rang,
    suivant,
    progression: suivant ? (xp - niveau.seuil) / (suivant.seuil - niveau.seuil) : 1,
    reste: suivant ? suivant.seuil - xp : 0
  };
}

// Ajoute des XP. Retourne le nouveau niveau, et `montee` si un niveau vient d'être franchi.
export function gagnerXP(points) {
  const avant = niveauPour(lireXP());
  stockage.modifier(e => { e.xp = (e.xp ?? 0) + points; });
  const apres = niveauPour(lireXP());
  return { points, niveau: apres, montee: apres.rang > avant.rang ? apres : null };
}

function statsVides() {
  return { sessions: 0, meilleurScore: 0, derniereSession: null, elements: {} };
}

// Résultat d'une réponse (id de la question, du générateur de calcul, du cas, de la panne ou de la mesure) :
// compteurs, 10 dernières réponses (aiguillage de l'accueil) et boîte de révision (leitner.js), jour d'activité (séries).
export function noterReponse(mode, id, reussi) {
  stockage.modifier(e => {
    e.stats ??= {};
    const m = (e.stats[mode] ??= statsVides());
    const avant = m.elements[id];
    m.elements[id] = appliquerResultat(avant, reussi);   // compteurs + boîte de révision (revision.js)
    // Cas de panne et banc : les jours de réussite (règle « sur au moins 2 jours différents », validation.js).
    const jours = avant?.joursReussis ?? [];
    if (reussi && (mode === 'panne' || mode === 'banc')) {
      m.elements[id].joursReussis = [...new Set([...jours, jourDe()])].slice(-SEUILS.journal.joursReussisMax);
    } else if (jours.length) m.elements[id].joursReussis = jours;
    e.activite = { jours: ajouterJour(e.activite?.jours) };       // un jour d'entraînement de plus pour la série
  });
  verifierBadges();
}

// niveau (1, 2 ou 3) : garde aussi le meilleur score par niveau de difficulté.
// total : séance complète d'un niveau (tous domaines, hors révision) en reconnaissance ou en calculs → elle entre
// dans le journal des séances, qui sert à la règle « 80 % sur 2 séances espacées d'au moins 24 h » (validation.js).
export function noterSession(mode, score, niveau, total) {
  stockage.modifier(e => {
    e.stats ??= {};
    const m = (e.stats[mode] ??= statsVides());
    m.sessions++;
    m.meilleurScore = Math.max(m.meilleurScore, score);
    m.derniereSession = Date.now();
    if (niveau) {
      m.niveaux ??= {};
      m.niveaux[niveau] = Math.max(m.niveaux[niveau] ?? 0, score);
      if (total) m.seances = [...(m.seances ?? []), { n: niveau, t: Date.now(), score, total }].slice(-SEUILS.journal.seancesMax);
    }
  });
  verifierBadges();
}

export function statsMode(mode) {
  return stockage.lire().stats?.[mode] ?? statsVides();
}
