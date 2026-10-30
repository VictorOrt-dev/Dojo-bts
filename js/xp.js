// Points d'expérience, niveaux et statistiques du Dojo.
// Tout est enregistré via storage.js : e.xp (nombre) et e.stats[mode].

import * as stockage from './storage.js';

export const NIVEAUX = [
  { nom: 'Apprenti', seuil: 0, icone: '🔰' },
  { nom: 'Compagnon', seuil: 200, icone: '🔧' },
  { nom: 'Technicien', seuil: 600, icone: '⚡' },
  { nom: 'Technicien Confirmé', seuil: 1500, icone: '🛠️' },
  { nom: 'Expert Senior', seuil: 3000, icone: '🏆' }
];

export const BAREME = {
  bonneReponse: 10,     // toute bonne réponse
  bonusRapidite: 5,     // Calculs Flash : bonne réponse en moins de seuilRapidite secondes
  seuilRapidite: 10,
  sessionParfaite: 20   // 10/10 sur une session
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
    const s = (m.elements[id] ??= { essais: 0, reussites: 0 });
    s.essais++;
    if (reussi) s.reussites++;
  });
}

export function noterSession(mode, score) {
  stockage.modifier(e => {
    e.stats ??= {};
    const m = (e.stats[mode] ??= statsVides());
    m.sessions++;
    m.meilleurScore = Math.max(m.meilleurScore, score);
    m.derniereSession = Date.now();
  });
}

export function statsMode(mode) {
  return stockage.lire().stats?.[mode] ?? statsVides();
}
