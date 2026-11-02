// Points d'expérience, rangs et statistiques des exercices.
// Tout est enregistré via storage.js : e.xp (nombre) et e.stats[mode].

import * as stockage from './storage.js';
import { appliquerResultat } from './leitner.js';

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

// Résultat d'une question (id = id de la question ou du générateur de calcul).
// Ces compteurs serviront plus tard à la révision ciblée des erreurs.
export function noterReponse(mode, id, reussi) {
  stockage.modifier(e => {
    e.stats ??= {};
    const m = (e.stats[mode] ??= statsVides());
    m.elements[id] = appliquerResultat(m.elements[id], reussi);   // compteurs + boîte de révision (revision.js)
  });
}

// niveau (1, 2 ou 3) : garde aussi le meilleur score par niveau de difficulté.
export function noterSession(mode, score, niveau) {
  stockage.modifier(e => {
    e.stats ??= {};
    const m = (e.stats[mode] ??= statsVides());
    m.sessions++;
    m.meilleurScore = Math.max(m.meilleurScore, score);
    m.derniereSession = Date.now();
    if (niveau) {
      m.niveaux ??= {};
      m.niveaux[niveau] = Math.max(m.niveaux[niveau] ?? 0, score);
    }
  });
}

export function statsMode(mode) {
  return stockage.lire().stats?.[mode] ?? statsVides();
}
