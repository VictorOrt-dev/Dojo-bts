// Parcours guidé : profil de l'utilisateur, « Ta prochaine séance » et déblocage souple.
//
// Rien n'est jamais verrouillé : un niveau ou un cas « en avance » reste ouvrable d'un toucher, il porte
// seulement la mention « Conseillé après… ». Les fonctions de calcul sont pures (elles reçoivent l'état et la
// liste des cas de panne) : tests/unitaires.mjs les vérifie sans navigateur.
//
// Validation d'un niveau : voir validation.js (règles) et seuils.js (seuils). Ici, un niveau est « franchi » pour le
// parcours quand il est validé, ou quand le test de positionnement l'a placé au-dessus : le test fixe le point de
// départ (étapes sautées, conseils levés) mais ne valide aucun niveau.

import { SEUILS } from './seuils.js';
import { etatNiveau, etatCas, etatBanc, niveauValide as regleValide, texteManque } from './validation.js';

export const PROFILS = [
  { id: 'debutant', court: 'Grand débutant', nom: 'Grand débutant', desc: 'Je découvre l\'électricité : les bases, sans jargon.', parcours: 'Débutant' },
  { id: 'formation', court: 'En formation', nom: 'En formation', desc: 'CAP, Bac Pro, BTS ou alternance.', parcours: 'Formation' },
  { id: 'confirme', court: 'Confirmé / Pro', nom: 'Confirmé / Pro', desc: 'Accès direct aux modes avancés et au banc.', parcours: 'Confirmé' }
];

// Score d'une séance de 10 qui la compte comme réussie (80 % : seuils.js).
export const SEUIL = Math.ceil(SEUILS.niveau.taux * 10);

// Ordre recommandé des étapes. R = Reconnaissance, C = Calculs, P = Cas de panne, B = Banc, T = test de positionnement.
const ORDRES = {
  debutant: ['R1', 'C1', 'P1', 'B', 'R2', 'C2', 'P2', 'R3', 'C3', 'P3'],
  formation: ['R1', 'C1', 'R2', 'C2', 'P1', 'B', 'P2', 'R3', 'C3', 'P3'],
  confirme: ['T', 'B', 'P2', 'C2', 'P3', 'C3', 'R3', 'R2', 'R1', 'C1', 'P1']
};

// Ordre des cartes de l'accueil : la progression d'abord pour qui démarre, la simulation d'abord pour un confirmé.
export function ordreModes(profil) {
  return profil === 'confirme' ? ['banc', 'isolement', 'panne', 'calcul', 'reco', 'examen'] : ['reco', 'calcul', 'panne', 'banc', 'isolement', 'examen'];
}

// Sas d'entrée : tant qu'aucun profil n'est choisi, l'app reste verrouillée (même avec de la progression : un ancien
// utilisateur choisit une fois son profil, sa progression est gardée).
export function premierLancement(etat) {
  return !etat.profil;
}

const MODE_DE = { R: 'reco', C: 'calcul', P: 'panne' };
const casNonHta = cas => cas.filter(c => !c.domaines?.includes('hta'));

// Niveau franchi au test de positionnement pour un mode (point de départ du parcours, pas une validation). Le test pose des questions de reconnaissance,
// de calcul et de cas de panne : chaque mode n'est placé que par ses propres questions. Un ancien résultat
// (questions de reconnaissance seulement, sans `niveaux`) ne place que la reconnaissance.
export function niveauPositionnement(etat, mode) {
  const p = etat.positionnement;
  if (!p) return 0;
  if (p.niveaux) return p.niveaux[mode] ?? 0;
  return mode === 'reco' ? p.niveau ?? 0 : 0;
}

// Niveau validé selon les règles de validation.js (sans le positionnement). contenu : la liste des cas (ancienne
// signature) ou { reco, calcul, panne } ; à défaut, le contenu chargé (catalogue.js).
export function niveauValide(etat, mode, n, contenu) {
  if (n <= 0) return true;
  return regleValide(etat, mode, n, contenu);
}

// Niveau franchi pour le parcours, les conseils, le guidage et l'examen : validé, ou dépassé au test de positionnement.
export function niveauAcquis(etat, mode, n, contenu) {
  if (n <= 0) return true;
  return niveauPositionnement(etat, mode) >= n || niveauValide(etat, mode, n, contenu);
}

// Ce qui manque pour valider le niveau n d'un mode (« 18/26 questions vues · 1 séance réussie sur 2 »), ou l'étape banc.
export function progressionNiveau(etat, mode, n, contenu) {
  const e = mode === 'banc' ? etatBanc(etat) : mode === 'panne' ? etatCas(etat, n, contenu) : etatNiveau(etat, mode, n, contenu);
  return { ...e, texte: texteManque(e) };
}

function etapeAcquise(etat, code, tousLesCas) {
  if (code === 'T') return !!etat.positionnement;
  // Banc : au moins 3 pannes différentes réparées sans alerte de sécurité (seuils.js).
  if (code === 'B') return etatBanc(etat).valide;
  return niveauAcquis(etat, MODE_DE[code[0]], Number(code[1]), tousLesCas);
}

const NOMS_NIVEAU = ['', 'I', 'II', 'III'];

function decrire(code, etat, tousLesCas) {
  const d = decrireEtape(code, etat, tousLesCas);
  if (code === 'T') return d;
  const p = code === 'B' ? progressionNiveau(etat, 'banc') : progressionNiveau(etat, MODE_DE[code[0]], Number(code[1]), tousLesCas);
  return { ...d, manque: p.texte };
}

function decrireEtape(code, etat, tousLesCas) {
  if (code === 'T') return { href: '#/entrainement/positionnement', titre: 'Test de positionnement', desc: '12 questions (reconnaissance, calculs, cas de panne), environ 6 minutes. Ton parcours saute ce que tu maîtrises déjà.' };
  if (code === 'B') return { href: '#/entrainement/banc', titre: 'Banc de mesure', desc: `Une panne cachée : mesure, consigne, répare. ${SEUILS.banc.pannes} pannes différentes à réparer sans alerte.` };
  const n = Number(code[1]);
  if (code[0] === 'R') return { href: `#/entrainement/reco?n=${n}`, titre: `Reconnaissance · niveau\u00A0${NOMS_NIVEAU[n]}`, desc: n === 1 ? 'Les symboles et les appareils que tu croiseras dans toutes les armoires.' : 'Repérages, réglages, symboles moins courants.' };
  if (code[0] === 'C') return { href: `#/entrainement/calcul?n=${n}`, titre: `Calculs · niveau\u00A0${NOMS_NIVEAU[n]}`, desc: n === 1 ? 'Loi d\'Ohm, puissances, tensions : la valeur à lire avant de mesurer.' : 'Dimensionner, vérifier une mesure, repérer l\'anomalie.' };
  // Cas de panne : le premier cas de ce niveau pas encore réussi sans faute (hors HTA d'abord).
  const duNiveau = tousLesCas.filter(c => c.niveau === n);
  const reussi = c => etat.stats?.panne?.elements?.[c.id]?.reussites > 0;
  const cas = [...casNonHta(duNiveau), ...duNiveau.filter(c => c.domaines?.includes('hta'))].find(c => !reussi(c)) ?? duNiveau[0];
  return cas
    ? { href: `#/entrainement/panne?c=${encodeURIComponent(cas.id)}`, titre: `Cas de panne · niveau\u00A0${NOMS_NIVEAU[n]}`, desc: cas.titre }
    : { href: '#/entrainement/panne', titre: `Cas de panne · niveau\u00A0${NOMS_NIVEAU[n]}`, desc: 'Une intervention pas à pas.' };
}

// La séance recommandée : la première étape du parcours qui n'est pas encore acquise.
export function prochaineSeance(etat, tousLesCas = []) {
  const profil = etat.profil ?? 'formation';
  const ordre = ORDRES[profil];
  const index = ordre.findIndex(code => !etapeAcquise(etat, code, tousLesCas));
  const parcours = PROFILS.find(p => p.id === profil).parcours;
  if (index === -1) {
    return { code: 'libre', href: '#/entrainement/banc', titre: 'Entraînement libre', desc: 'Parcours terminé. Une nouvelle panne cachée t\'attend au banc.', etape: `Parcours ${parcours} terminé`, fait: ordre.length, total: ordre.length };
  }
  return { code: ordre[index], ...decrire(ordre[index], etat, tousLesCas), etape: `Étape ${index + 1} sur ${ordre.length} · parcours ${parcours}`, fait: index, total: ordre.length };
}

// ---------- Déblocage souple : mentions « Conseillé après… » ----------

// Niveau n d'un mode (et éventuellement d'un domaine) : conseil, ou null si rien à signaler.
export function conseilNiveau(etat, mode, n, { domaine = '', tousLesCas = [] } = {}) {
  if (domaine === 'hta' && n < 3 && !niveauAcquis(etat, mode, 2, tousLesCas)) {
    return 'Domaine expert : conseillé après le niveau II';
  }
  if (n <= 1 || niveauAcquis(etat, mode, n - 1, tousLesCas)) return null;
  const precedent = NOMS_NIVEAU[n - 1];
  return mode === 'panne'
    ? `Conseillé après la validation des cas de niveau ${precedent}`
    : `Conseillé après la validation du niveau ${precedent}`;
}

// Un cas de panne : HTA et niveaux avancés portent une mention tant que les fondations ne sont pas acquises.
export function conseilCas(etat, cas, tousLesCas) {
  if (cas.domaines?.includes('hta') && !niveauAcquis(etat, 'panne', 2, tousLesCas)) return 'Domaine HTA : conseillé après la validation des cas de niveau II';
  return conseilNiveau(etat, 'panne', cas.niveau, { tousLesCas });
}

// Le banc : conseillé après un premier cas de panne réussi (pour qui démarre).
export function conseilBanc(etat, tousLesCas) {
  if (etat.profil === 'confirme' || niveauPositionnement(etat, 'panne') >= 1 || tousLesCas.some(c => etat.stats?.panne?.elements?.[c.id]?.reussites > 0)) return null;
  return 'Conseillé après un premier cas de panne réussi';
}

// ---------- Banc : pannes graduées ----------

// Niveau de la prochaine panne cachée : le premier niveau (I, II, III) dont aucune panne n'est encore réparée
// sans alerte de sécurité. 0 = tous franchis : tirage libre parmi toutes les pannes.
export function niveauBanc(etat, pannes) {
  const reussie = p => etat.stats?.banc?.elements?.[p.id]?.reussites > 0;
  for (const n of [1, 2, 3]) {
    const duNiveau = pannes.filter(p => p.niveau === n);
    if (duNiveau.length && !duNiveau.some(reussie)) return n;
  }
  return 0;
}

// Pannes candidates au prochain tirage (jamais deux fois de suite la même, quand c'est possible).
export function pannesCandidates(etat, pannes, derniere = null) {
  const n = niveauBanc(etat, pannes);
  const pool = n ? pannes.filter(p => p.niveau === n) : pannes;
  const autres = pool.filter(p => p.id !== derniere);
  return autres.length ? autres : pool;
}

// ---------- Test de positionnement ----------

// 12 questions, 4 par niveau : 2 de reconnaissance, 1 calcul, 1 situation de cas de panne.
export const COMPOSITION = { reco: 2, calcul: 1, panne: 1 };
export const PAR_NIVEAU = Object.values(COMPOSITION).reduce((a, b) => a + b);   // 4
export const TOTAL_POSITIONNEMENT = PAR_NIVEAU * 3;                              // 12
export const REQUIS = { 1: 3, 2: 3, 3: 3 };   // bonnes réponses sur 4 nécessaires pour valider chaque niveau

// Niveau validé (0 à 3) : chaque niveau exige les précédents.
export function niveauTest(scores) {
  let v = 0;
  for (const n of [1, 2, 3]) {
    if ((scores[n] ?? 0) >= REQUIS[n]) v = n; else break;
  }
  return v;
}

// Résultat du test : niveau global et niveau validé pour chaque mode.
// resultats : [{ niveau, mode: 'reco' | 'calcul' | 'panne', juste }]
// Un mode est validé jusqu'au niveau n si le niveau global atteint n ET si, à chaque niveau ≤ n, ses propres
// questions sont réussies (au moins la moitié). La reconnaissance ne valide jamais seule les calculs ou les cas.
export function resultatPositionnement(resultats) {
  const scores = { 1: 0, 2: 0, 3: 0 };
  resultats.forEach(r => { if (r.juste) scores[r.niveau]++; });
  const niveau = niveauTest(scores);
  const niveaux = {};
  for (const mode of Object.keys(COMPOSITION)) {
    let v = 0;
    for (let n = 1; n <= niveau; n++) {
      const siens = resultats.filter(r => r.mode === mode && r.niveau === n);
      if (siens.length && siens.filter(r => r.juste).length * 2 >= siens.length) v = n; else break;
    }
    niveaux[mode] = v;
  }
  return { niveau, scores, niveaux, score: resultats.filter(r => r.juste).length };
}
