// Contrôle strict des données de l'utilisateur (sauvegarde importée ou contenu de localStorage).
// Module pur : aucun accès au DOM ni au stockage, testable directement avec Node (tests/unitaires.mjs).
//
// controler(donnees) renvoie { etat, anomalies } :
// - etat : une copie propre, construite champ par champ ; tout champ mal typé est remplacé par sa valeur par défaut ;
// - anomalies : la liste lisible de ce qui a été refusé.
// storage.js REFUSE une sauvegarde importée dès qu'il y a une anomalie (rien n'est modifié), et se contente
// de NETTOYER le contenu de localStorage au démarrage (l'app ne doit jamais planter sur des données abîmées).

export const VERSION = 1;
export const MODES = ['reco', 'calcul', 'panne', 'banc'];
export const MATIERES = ['bakelite', 'porcelaine'];
export const XP_MAX = 10_000_000;      // très au-delà du dernier rang (3 000 XP) : au-delà, c'est une donnée trafiquée
export const TAILLE_MAX = 2_000_000;   // octets : une vraie sauvegarde fait quelques dizaines de Ko
const ID_MAX = 100;                    // longueur maximale d'un identifiant de question, de calcul ou de panne
const CLES_INTERDITES = new Set(['__proto__', 'constructor', 'prototype']);

export function etatParDefaut() {
  return {
    version: VERSION,
    xp: 0,
    stats: {},               // résultats des exercices, par mode
    derniereSauvegarde: null, // horodatage du dernier export
    preferences: { matiere: 'bakelite' }
  };
}

// ---------- Prédicats ----------

const estObjet = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const estPositif = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;  // refuse "100", NaN, Infinity, -5
const estEntierPositif = v => Number.isSafeInteger(v) && v >= 0;
const estHorodatage = v => estPositif(v) && v <= 8.64e15;                       // borne des dates JavaScript
const apercu = v => (typeof v === 'string' ? `« ${v.slice(0, 20)} » (texte)` : String(v).slice(0, 30));
const cleValide = c => typeof c === 'string' && c.length > 0 && c.length <= ID_MAX && !CLES_INTERDITES.has(c);

// Parcourt un objet clé → valeur ; ne garde que les entrées valides (Object.fromEntries : pas de pollution de prototype).
function filtrerEntrees(objet, chemin, anomalies, valider) {
  if (objet === undefined) return {};
  if (!estObjet(objet)) { anomalies.push(`${chemin} n'est pas un objet`); return {}; }
  const garde = [];
  for (const [cle, valeur] of Object.entries(objet)) {
    if (!cleValide(cle)) { anomalies.push(`${chemin} : clé « ${String(cle).slice(0, 30)} » refusée`); continue; }
    const propre = valider(valeur, `${chemin}.${cle}`);
    if (propre !== undefined) garde.push([cle, propre]);
  }
  return Object.fromEntries(garde);
}

// ---------- Contrôle des stats d'un mode ----------

function controlerElement(valeur, chemin, anomalies) {
  if (!estObjet(valeur) || !estEntierPositif(valeur.essais) || !estEntierPositif(valeur.reussites) || valeur.reussites > valeur.essais) {
    anomalies.push(`${chemin} : attendu { essais, reussites } entiers, avec reussites ≤ essais`);
    return undefined;
  }
  return { essais: valeur.essais, reussites: valeur.reussites };
}

function controlerMode(m, chemin, anomalies) {
  if (!estObjet(m)) { anomalies.push(`${chemin} n'est pas un objet`); return undefined; }
  const propre = { sessions: 0, meilleurScore: 0, derniereSession: null, elements: {} };
  if (m.sessions !== undefined) {
    if (estEntierPositif(m.sessions)) propre.sessions = m.sessions;
    else anomalies.push(`${chemin}.sessions doit être un entier positif`);
  }
  if (m.meilleurScore !== undefined) {
    if (estPositif(m.meilleurScore)) propre.meilleurScore = m.meilleurScore;
    else anomalies.push(`${chemin}.meilleurScore doit être un nombre positif`);
  }
  if (m.derniereSession !== undefined && m.derniereSession !== null) {
    if (estHorodatage(m.derniereSession)) propre.derniereSession = m.derniereSession;
    else anomalies.push(`${chemin}.derniereSession doit être une date (horodatage)`);
  }
  if (m.niveaux !== undefined) {
    propre.niveaux = filtrerEntrees(m.niveaux, `${chemin}.niveaux`, anomalies, (v, c) => {
      if (!['1', '2', '3'].includes(c.split('.').pop()) || !estPositif(v)) { anomalies.push(`${c} : niveau 1 à 3 et score positif attendus`); return undefined; }
      return v;
    });
  }
  propre.elements = filtrerEntrees(m.elements, `${chemin}.elements`, anomalies, (v, c) => controlerElement(v, c, anomalies));
  return propre;
}

// ---------- Point d'entrée ----------

export function controler(donnees) {
  const anomalies = [];
  const etat = etatParDefaut();
  if (!estObjet(donnees)) return { etat, anomalies: ['le contenu n\'est pas un objet JSON'] };

  if (donnees.version !== undefined && !(estEntierPositif(donnees.version) && donnees.version >= 1)) {
    anomalies.push('version doit être un entier ≥ 1');
  }

  if (donnees.xp !== undefined) {
    if (estPositif(donnees.xp) && donnees.xp <= XP_MAX) etat.xp = Math.round(donnees.xp);
    else anomalies.push(`xp doit être un nombre positif (au plus ${XP_MAX}), reçu : ${apercu(donnees.xp)}`);
  }

  // « fichesVues » (module Cours, retiré) : présent dans les anciennes sauvegardes, simplement ignoré.

  etat.stats = filtrerEntrees(donnees.stats, 'stats', anomalies, (v, c) => {
    const mode = c.slice('stats.'.length);
    if (!MODES.includes(mode)) { anomalies.push(`stats : mode inconnu « ${mode} »`); return undefined; }
    return controlerMode(v, c, anomalies);
  });

  if (donnees.derniereSauvegarde !== undefined && donnees.derniereSauvegarde !== null) {
    if (estHorodatage(donnees.derniereSauvegarde)) etat.derniereSauvegarde = donnees.derniereSauvegarde;
    else anomalies.push('derniereSauvegarde doit être une date (horodatage)');
  }

  if (donnees.preferences !== undefined) {
    if (!estObjet(donnees.preferences)) anomalies.push('preferences n\'est pas un objet');
    else if (donnees.preferences.matiere !== undefined) {
      if (MATIERES.includes(donnees.preferences.matiere)) etat.preferences.matiere = donnees.preferences.matiere;
      else anomalies.push(`preferences.matiere doit valoir ${MATIERES.join(' ou ')}`);
    }
  }

  return { etat, anomalies };
}
