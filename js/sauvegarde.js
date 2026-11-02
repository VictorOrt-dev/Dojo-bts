// Contrôle strict des données de l'utilisateur (sauvegarde importée ou contenu de localStorage).
// Module pur : aucun accès au DOM ni au stockage, testable directement avec Node (tests/unitaires.mjs).
//
// controler(donnees) renvoie { etat, anomalies } :
// - etat : une copie propre, construite champ par champ ; tout champ mal typé est remplacé par sa valeur par défaut ;
// - anomalies : la liste lisible de ce qui a été refusé.
// storage.js REFUSE une sauvegarde importée dès qu'il y a une anomalie (rien n'est modifié), et se contente
// de NETTOYER le contenu de localStorage au démarrage (l'app ne doit jamais planter sur des données abîmées).

import { dateValide, joursValides } from './badges.js';

export const VERSION = 1;
export const MODES = ['reco', 'calcul', 'panne', 'banc', 'isolement'];
export const MATIERES = ['auto', 'bakelite', 'porcelaine'];   // auto = suit le réglage clair / sombre du téléphone
export const PROFILS = ['debutant', 'formation', 'confirme'];
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
    preferences: { matiere: 'auto', visiteBanc: false },
    profil: null,            // 'debutant' | 'formation' | 'confirme' ; null = premier lancement pas encore fait
    positionnement: null,    // { niveau: 0 à 3, score: 0 à 12, date, niveaux?: { reco, calcul, panne } } : test de positionnement
    activite: { jours: [] }, // jours d'entraînement (« AAAA-MM-JJ », heure locale) : séries
    jalons: { memosApresErreur: 0, isolementPropre: [] },   // accomplissements suivis pour les insignes
    badges: {}               // insignes obtenus : { id: date d'obtention }
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
  const base = { essais: valeur.essais, reussites: valeur.reussites };
  // Réponses récentes (aiguillage) : jusqu'à 10 caractères « 0 » ou « 1 », jamais plus que d'essais.
  if (valeur.recents !== undefined) {
    if (typeof valeur.recents === 'string' && /^[01]{0,10}$/.test(valeur.recents) && valeur.recents.length <= valeur.essais) base.recents = valeur.recents;
    else anomalies.push(`${chemin} : réponses récentes attendues (« 0 » / « 1 », 10 au plus)`);
  }
  // Révision (Leitner) : boîte 1 à 5 et date de prochaine révision, toujours ensemble.
  if (valeur.boite === undefined && valeur.revoir === undefined) return base;
  if (!(Number.isSafeInteger(valeur.boite) && valeur.boite >= 1 && valeur.boite <= 5 && estHorodatage(valeur.revoir))) {
    anomalies.push(`${chemin} : révision attendue { boite 1 à 5, revoir (date) }`);
    return base;
  }
  return { ...base, boite: valeur.boite, revoir: valeur.revoir };
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
    if (estObjet(donnees.preferences) && donnees.preferences.visiteBanc !== undefined) {
      if (typeof donnees.preferences.visiteBanc === 'boolean') etat.preferences.visiteBanc = donnees.preferences.visiteBanc;
      else anomalies.push('preferences.visiteBanc doit être vrai ou faux');
    }
  }

  if (donnees.profil !== undefined && donnees.profil !== null) {
    if (PROFILS.includes(donnees.profil)) etat.profil = donnees.profil;
    else anomalies.push(`profil doit valoir ${PROFILS.join(', ')}`);
  }

  if (donnees.positionnement !== undefined && donnees.positionnement !== null) {
    const p = donnees.positionnement;
    const niveauMode = v => Number.isSafeInteger(v) && v >= 0 && v <= p.niveau;
    const niveauxOk = p.niveaux === undefined
      || (estObjet(p.niveaux) && Object.keys(p.niveaux).every(k => ['reco', 'calcul', 'panne'].includes(k)) && Object.values(p.niveaux).every(niveauMode));
    if (estObjet(p) && Number.isSafeInteger(p.niveau) && p.niveau >= 0 && p.niveau <= 3
      && Number.isSafeInteger(p.score) && p.score >= 0 && p.score <= 12 && estHorodatage(p.date) && niveauxOk) {
      etat.positionnement = { niveau: p.niveau, score: p.score, date: p.date };
      if (p.niveaux) etat.positionnement.niveaux = { reco: p.niveaux.reco ?? 0, calcul: p.niveaux.calcul ?? 0, panne: p.niveaux.panne ?? 0 };
    } else anomalies.push('positionnement : attendu { niveau 0 à 3, score 0 à 12, date, niveaux { reco, calcul, panne } ≤ niveau }');
  }

  // Jours d'entraînement (séries) : dates « AAAA-MM-JJ », au plus 400.
  // Date impossible : fichier abîmé, refusé. Date future (horloge avancée) : ignorée, elle ne compte jamais.
  if (donnees.activite !== undefined) {
    const j = donnees.activite?.jours;
    if (estObjet(donnees.activite) && Array.isArray(j) && j.length <= 400 && j.every(dateValide)) {
      etat.activite = { jours: joursValides(j) };
    } else anomalies.push('activite : attendu { jours: [dates réelles « AAAA-MM-JJ »…] } (400 au plus)');
  }

  // Jalons des insignes.
  if (donnees.jalons !== undefined) {
    const j = donnees.jalons;
    const memosOk = j?.memosApresErreur === undefined || (estEntierPositif(j.memosApresErreur) && j.memosApresErreur <= 1_000_000);
    const isoOk = j?.isolementPropre === undefined || (Array.isArray(j.isolementPropre) && j.isolementPropre.length <= 100 && j.isolementPropre.every(cleValide));
    if (estObjet(j) && memosOk && isoOk) {
      etat.jalons = { memosApresErreur: j.memosApresErreur ?? 0, isolementPropre: [...new Set(j.isolementPropre ?? [])] };
    } else anomalies.push('jalons : attendu { memosApresErreur (entier), isolementPropre [identifiants] }');
  }

  // Insignes obtenus : identifiant → date d'obtention.
  if (donnees.badges !== undefined) {
    if (!estObjet(donnees.badges) || Object.keys(donnees.badges).length > 50) anomalies.push('badges : attendu { identifiant: date }');
    else etat.badges = filtrerEntrees(donnees.badges, 'badges', anomalies, (v, c) => {
      if (!estHorodatage(v)) { anomalies.push(`${c} : date d'obtention attendue`); return undefined; }
      return v;
    });
  }

  return { etat, anomalies };
}
