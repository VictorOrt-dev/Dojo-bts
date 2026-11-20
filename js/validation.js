// Règles de validation des niveaux, des cas de panne et du banc (seuils dans seuils.js). Logique pure : elle reçoit
// l'état et le contenu ; tests/unitaires.mjs la vérifie sans navigateur.
//
// Migration (sauvegarde v1 → v2) : un niveau validé avec l'ancienne règle (un seul 8/10, un cas réussi, une panne
// réparée, ou le test de positionnement) le reste : `acquisAncienneRegle` le garde, et l'écran montre ce qui manque
// pour la nouvelle règle. Rien ne recule.

import { SEUILS } from './seuils.js';
import { catalogue } from './catalogue.js';

const H = 3_600_000;
const deux = n => String(n).padStart(2, '0');
export const jourDe = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`; };

// Le contenu accepte l'ancien paramètre (la liste des cas) ou un objet { reco, calcul, panne }.
export const contenuDe = c => Array.isArray(c) ? { ...catalogue(), panne: c } : { ...catalogue(), ...(c ?? {}) };

// Séances réussies comptées une fois espacées : la première, puis chacune au moins `ecartHeures` après la précédente.
export function seancesEspacees(dates, ecartHeures = SEUILS.niveau.ecartHeures) {
  const comptees = [];
  for (const t of [...dates].sort((a, b) => a - b)) if (!comptees.length || t - comptees.at(-1) >= ecartHeures * H) comptees.push(t);
  return comptees;
}

// Tirage d'une séance de niveau : d'abord ce qui n'a jamais été vu, puis les erreurs à réviser (les plus urgentes
// d'abord), puis le reste ; la sélection est ensuite mélangée. melanger : fonction de mélange (hasard.js).
export function tirerPriorites(liste, elements, nombre, melanger) {
  const jamais = [], erreurs = [], reste = [];
  for (const x of melanger(liste)) {
    const e = elements?.[x.id];
    (!e?.essais ? jamais : e.boite ? erreurs : reste).push(x);
  }
  erreurs.sort((a, b) => elements[a.id].revoir - elements[b.id].revoir);
  return melanger([...jamais, ...erreurs, ...reste].slice(0, Math.max(0, nombre)));
}

// Reconnaissance ou calculs, niveau n.
export function etatNiveau(etat, mode, n, contenu) {
  const S = SEUILS.niveau;
  const items = (contenuDe(contenu)[mode] ?? []).filter(e => e.niveau === n);
  const el = etat.stats?.[mode]?.elements ?? {};
  const vues = items.filter(e => el[e.id]?.essais > 0).length;
  const reussies = (etat.stats?.[mode]?.seances ?? []).filter(s => s.n === n && s.total > 0 && s.score / s.total >= S.taux).map(s => s.t);
  const comptees = seancesEspacees(reussies, S.ecartHeures);
  const ancien = !!etat.acquisAncienneRegle?.[mode]?.includes(n);
  const nouveau = items.length > 0 && (!S.toutVoir || vues >= items.length) && comptees.length >= S.seances;
  return {
    mode, n, valide: ancien || nouveau, ancien: ancien && !nouveau,
    vues, total: items.length, seancesReussies: Math.min(comptees.length, S.seances), seancesRequises: S.seances,
    // Une séance réussie trop tôt ne compte pas encore : la prochaine compte à partir de cette date.
    prochaineLe: comptees.length && comptees.length < S.seances ? comptees.at(-1) + S.ecartHeures * H : null
  };
}

// Cas de panne, niveau n.
export function etatCas(etat, n, contenu) {
  const S = SEUILS.panne;
  const items = (contenuDe(contenu).panne ?? []).filter(c => c.niveau === n);
  const el = etat.stats?.panne?.elements ?? {};
  const reussis = items.filter(c => el[c.id]?.reussites > 0);
  const jours = new Set(reussis.flatMap(c => el[c.id].joursReussis ?? []));
  const requis = Math.max(1, Math.ceil(items.length * S.part));
  const ancien = !!etat.acquisAncienneRegle?.casNiveaux?.includes(n) || items.some(c => etat.acquisAncienneRegle?.cas?.includes(c.id));
  const nouveau = items.length > 0 && reussis.length >= requis && jours.size >= S.jours;
  return { mode: 'panne', n, valide: ancien || nouveau, ancien: ancien && !nouveau, reussis: reussis.length, requis, total: items.length, jours: Math.min(jours.size, S.jours), joursRequis: S.jours };
}

// Banc : pannes différentes réparées sans alerte de sécurité.
export function etatBanc(etat) {
  const S = SEUILS.banc;
  const reparees = Object.values(etat.stats?.banc?.elements ?? {}).filter(e => e.reussites > 0).length;
  const ancien = !!etat.acquisAncienneRegle?.banc;
  const nouveau = reparees >= S.pannes;
  return { mode: 'banc', valide: ancien || nouveau, ancien: ancien && !nouveau, reparees: Math.min(reparees, S.pannes), requises: S.pannes };
}

export const niveauValide = (etat, mode, n, contenu) => (mode === 'panne' ? etatCas(etat, n, contenu) : etatNiveau(etat, mode, n, contenu)).valide;

// « aujourd'hui à 14 h 05 », « demain à 9 h 00 », « le 22/11 à 9 h 00 ».
export function quand(t) {
  const d = new Date(t), h = `à ${d.getHours()} h ${deux(d.getMinutes())}`;
  if (jourDe(t) === jourDe()) return `aujourd'hui ${h}`;
  if (jourDe(t) === jourDe(Date.now() + 86_400_000)) return `demain ${h}`;
  return `le ${deux(d.getDate())}/${deux(d.getMonth() + 1)} ${h}`;
}

// Ce qui manque pour valider, en clair (« 18/26 questions vues · 1 séance réussie sur 2 »).
export function texteManque(e) {
  let t;
  if (e.mode === 'banc') t = `${e.reparees}/${e.requises} pannes différentes réparées sans alerte`;
  else if (e.mode === 'panne') t = `${e.reussis}/${e.requis} cas réussis sans faute · ${e.jours}/${e.joursRequis} jours différents`;
  else {
    const s = e.seancesReussies;
    t = `${e.vues}/${e.total} ${e.mode === 'calcul' ? 'types de calcul vus' : 'questions vues'} · ${s} séance${s > 1 ? 's' : ''} réussie${s > 1 ? 's' : ''} sur ${e.seancesRequises}`;
    if (e.prochaineLe && e.prochaineLe > Date.now()) t += ` (la prochaine compte à partir de ${quand(e.prochaineLe)})`;
  }
  if (e.valide && e.ancien) return `Validé (ancienne règle) · pour la nouvelle : ${t}`;
  return e.valide ? 'Validé' : t;
}

// Migration v1 → v2 : ce qui était validé avec l'ancienne règle (un 8/10, un cas réussi, une panne réparée,
// le test de positionnement). Calculé sur l'état déjà contrôlé.
export function acquisAncienneRegle(etat) {
  const p = etat.positionnement;
  const test = mode => p ? (p.niveaux ? p.niveaux[mode] ?? 0 : mode === 'reco' ? p.niveau ?? 0 : 0) : 0;
  const niveaux = mode => [1, 2, 3].filter(n => (etat.stats?.[mode]?.niveaux?.[n] ?? 0) >= 8 || test(mode) >= n);
  return {
    reco: niveaux('reco'),
    calcul: niveaux('calcul'),
    casNiveaux: [1, 2, 3].filter(n => test('panne') >= n),
    cas: Object.entries(etat.stats?.panne?.elements ?? {}).filter(([, e]) => e.reussites > 0).map(([id]) => id),
    banc: Object.values(etat.stats?.banc?.elements ?? {}).some(e => e.reussites > 0)
  };
}
