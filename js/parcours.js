// Parcours guidé : profil de l'utilisateur, « Ta prochaine séance » et déblocage souple.
//
// Rien n'est jamais verrouillé : un niveau ou un cas « en avance » reste ouvrable d'un toucher, il porte
// seulement la mention « Conseillé après… ». Les fonctions de calcul sont pures (elles reçoivent l'état et la
// liste des cas de panne) : tests/unitaires.mjs les vérifie sans navigateur.

export const PROFILS = [
  { id: 'debutant', court: 'Grand débutant', nom: 'Grand débutant', desc: 'Je découvre l\'électricité : les bases, sans jargon.', parcours: 'Débutant' },
  { id: 'formation', court: 'En formation', nom: 'En formation', desc: 'CAP, Bac Pro, BTS ou alternance.', parcours: 'Formation' },
  { id: 'confirme', court: 'Confirmé / Pro', nom: 'Confirmé / Pro', desc: 'Accès direct aux modes avancés et au banc.', parcours: 'Confirmé' }
];

export const SEUIL = 8;  // un niveau est acquis à 8/10 (80 %) sur une séance « tous domaines »

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

// Premier lancement : ni profil, ni progression (un utilisateur qui a déjà joué n'est pas renvoyé à l'accueil).
export function premierLancement(etat) {
  if (etat.profil) return false;
  const joue = Object.values(etat.stats ?? {}).some(m => m.sessions > 0);
  return !joue && !(etat.xp > 0);
}

const MODE_DE = { R: 'reco', C: 'calcul', P: 'panne' };
const casNonHta = cas => cas.filter(c => !c.domaines?.includes('hta'));

// Niveau validé d'office par le test de positionnement pour un mode. Le test pose des questions de reconnaissance,
// de calcul et de cas de panne : chaque mode n'est validé que par ses propres questions. Un ancien résultat
// (questions de reconnaissance seulement, sans `niveaux`) ne valide plus que la reconnaissance.
export function niveauPositionnement(etat, mode) {
  const p = etat.positionnement;
  if (!p) return 0;
  if (p.niveaux) return p.niveaux[mode] ?? 0;
  return mode === 'reco' ? p.niveau ?? 0 : 0;
}

// Un niveau est acquis par la pratique (80 % en séance, ou un cas sans faute) ou par le test de positionnement.
export function niveauAcquis(etat, mode, n, tousLesCas = []) {
  if (n <= 0) return true;
  if (niveauPositionnement(etat, mode) >= n) return true;
  const stats = etat.stats?.[mode];
  if (!stats) return false;
  if (mode === 'panne') return tousLesCas.some(c => c.niveau === n && stats.elements?.[c.id]?.reussites > 0);
  return (stats.niveaux?.[n] ?? 0) >= SEUIL;
}

function etapeAcquise(etat, code, tousLesCas) {
  if (code === 'T') return !!etat.positionnement;
  // Banc : une panne réparée sans alerte de sécurité valide l'étape, indices compris (l'aide s'efface ensuite d'elle-même).
  if (code === 'B') return Object.values(etat.stats?.banc?.elements ?? {}).some(e => e.reussites > 0);
  return niveauAcquis(etat, MODE_DE[code[0]], Number(code[1]), tousLesCas);
}

const NOMS_NIVEAU = ['', 'I', 'II', 'III'];

function decrire(code, etat, tousLesCas) {
  if (code === 'T') return { href: '#/entrainement/positionnement', titre: 'Test de positionnement', desc: '12 questions (reconnaissance, calculs, cas de panne), environ 6 minutes. Il valide d\'office ce que tu maîtrises déjà.' };
  if (code === 'B') return { href: '#/entrainement/banc', titre: 'Banc de mesure', desc: 'Une panne cachée sur un départ moteur : mesure, consigne, répare.' };
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
    ? `Conseillé après un cas de niveau ${precedent} réussi sans faute`
    : `Conseillé après ${SEUIL * 10} % au niveau ${precedent}`;
}

// Un cas de panne : HTA et niveaux avancés portent une mention tant que les fondations ne sont pas acquises.
export function conseilCas(etat, cas, tousLesCas) {
  if (cas.domaines?.includes('hta') && !niveauAcquis(etat, 'panne', 2, tousLesCas)) return 'Domaine HTA : conseillé après un cas de niveau II réussi';
  return conseilNiveau(etat, 'panne', cas.niveau, { tousLesCas });
}

// Le banc : conseillé après un premier cas de panne réussi (pour qui démarre).
export function conseilBanc(etat, tousLesCas) {
  if (etat.profil === 'confirme' || niveauAcquis(etat, 'panne', 1, tousLesCas)) return null;
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
export function niveauValide(scores) {
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
  const niveau = niveauValide(scores);
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
