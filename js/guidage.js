// Guidage pédagogique dynamique de l'accueil : à partir des réponses enregistrées en local (stats.<mode>.elements),
// calcule la réussite par domaine technique et choisit l'encart « Prochaine étape » :
//   1. une lacune nette (domaine le plus faible, assez de réponses) → séance ciblée sur ce domaine ;
//   2. sinon, un niveau tout juste acquis → passage au niveau suivant ;
//   3. sinon, la suite du parcours guidé (parcours.js).
// Fonctions pures : elles reçoivent l'état et le catalogue du contenu ; tests/unitaires.mjs les vérifie sans navigateur.

import { DOMAINES } from './domaines.js';
import { niveauAcquis } from './parcours.js';

export const ESSAIS_MIN = 6;        // réponses dans un domaine avant de parler de lacune
export const ECHEC_ALERTE = 0.35;   // taux d'échec à partir duquel on propose une séance ciblée
const MODES = ['reco', 'calcul', 'panne'];
const ROMAIN = ['', 'I', 'II', 'III'];
const NOMS_MODE = { reco: 'Reconnaissance', calcul: 'Calculs', panne: 'Cas de panne' };
export const NOMS_COURTS = { 'tbt-cc': 'TBT et courant continu', 'mono-bt': 'Monophasé', tri: 'Triphasé', securite: 'Sécurité', hta: 'HTA' };

// catalogue : { reco: [{ id, niveau, domaines }], calcul: [...], panne: [...] }
// Résultat : { [domaine]: { essais, reussites, echec, modes: { [mode]: { essais, reussites, parNiveau: {n: {essais, reussites}}, elements: [{id, niveau, essais, reussites}] } } } }
export function bilanDomaines(etat, catalogue) {
  const bilan = Object.fromEntries(DOMAINES.map(d => [d.id, { essais: 0, reussites: 0, echec: 0, modes: {} }]));
  for (const mode of MODES) {
    const suivis = etat.stats?.[mode]?.elements ?? {};
    for (const el of catalogue[mode] ?? []) {
      const s = suivis[el.id];
      const dom = el.domaines?.[0];
      if (!s?.essais || !bilan[dom]) continue;
      const b = bilan[dom];
      const m = (b.modes[mode] ??= { essais: 0, reussites: 0, parNiveau: {}, elements: [] });
      const n = (m.parNiveau[el.niveau] ??= { essais: 0, reussites: 0 });
      b.essais += s.essais; b.reussites += s.reussites;
      m.essais += s.essais; m.reussites += s.reussites;
      n.essais += s.essais; n.reussites += s.reussites;
      m.elements.push({ id: el.id, niveau: el.niveau, essais: s.essais, reussites: s.reussites });
    }
  }
  for (const b of Object.values(bilan)) b.echec = b.essais ? 1 - b.reussites / b.essais : 0;
  return bilan;
}

const echecs = x => x.essais - x.reussites;

// Le domaine le plus faible, s'il y a assez de réponses et assez d'erreurs : { domaine, ...bilan } ou null.
export function domaineFaible(bilan) {
  const candidats = Object.entries(bilan)
    .filter(([, b]) => b.essais >= ESSAIS_MIN && b.echec >= ECHEC_ALERTE)
    .sort(([, a], [, b]) => b.echec - a.echec || b.essais - a.essais);
  return candidats.length ? { domaine: candidats[0][0], ...candidats[0][1] } : null;
}

// Où envoyer l'apprenti pour travailler une lacune : le mode et le niveau où il échoue le plus.
export function seanceCiblee(faible, catalogue) {
  const [mode, m] = Object.entries(faible.modes).sort(([, a], [, b]) => echecs(b) - echecs(a) || b.essais - a.essais)[0];
  if (mode === 'panne') {
    const cas = [...m.elements].sort((a, b) => echecs(b) - echecs(a))[0];
    return { mode, niveau: cas.niveau, href: `#/entrainement/panne?c=${encodeURIComponent(cas.id)}` };
  }
  const niveaux = Object.entries(m.parNiveau).sort(([, a], [, b]) => echecs(b) - echecs(a)).map(([n]) => Number(n));
  // Le niveau doit avoir du contenu dans ce domaine (sinon, le plus proche qui en a).
  const dispo = n => (catalogue[mode] ?? []).some(e => e.niveau === n && e.domaines?.includes(faible.domaine));
  const niveau = [...niveaux, 1, 2, 3].find(dispo) ?? 1;
  return { mode, niveau, href: `#/entrainement/${mode}?n=${niveau}&d=${faible.domaine}` };
}

// L'encart « Prochaine étape » de l'accueil.
// prochaine : résultat de parcours.prochaineSeance (suite du parcours guidé).
export function recommandation(etat, catalogue, prochaine, tousLesCas = []) {
  const bilan = bilanDomaines(etat, catalogue);
  const faible = domaineFaible(bilan);
  if (faible) {
    const d = DOMAINES.find(x => x.id === faible.domaine);
    const s = seanceCiblee(faible, catalogue);
    const pct = Math.round(faible.echec * 100);
    return {
      type: 'lacune', domaine: faible.domaine, bilan, href: s.href,
      surtitre: 'Prochaine étape · lacune détectée',
      titre: `Taux d'échec élevé en ${NOMS_COURTS[d.id]} (${pct} %)`,
      desc: `${echecs(faible)} erreurs sur ${faible.essais} réponses. Séance ciblée : ${NOMS_MODE[s.mode]}, niveau ${ROMAIN[s.niveau]}, domaine ${d.nom.toLowerCase()}.`,
      action: 'Lancer la séance ciblée'
    };
  }
  // Niveau tout juste acquis en reconnaissance et en calculs : on propose le suivant.
  for (const n of [1, 2]) {
    const acquis = ['reco', 'calcul'].every(m => niveauAcquis(etat, m, n, tousLesCas));
    const suivantAcquis = ['reco', 'calcul'].every(m => niveauAcquis(etat, m, n + 1, tousLesCas));
    if (acquis && !suivantAcquis) {
      const mode = niveauAcquis(etat, 'reco', n + 1, tousLesCas) ? 'calcul' : 'reco';
      const versParcours = prochaine?.code === `${mode === 'reco' ? 'R' : 'C'}${n + 1}`;
      return {
        type: 'niveau', bilan, href: versParcours ? prochaine.href : `#/entrainement/${mode}?n=${n + 1}`,
        surtitre: 'Prochaine étape',
        titre: n === 1 ? 'Fondations acquises — Passe au niveau II' : 'Pratique courante acquise — Passe au niveau III',
        desc: `${NOMS_MODE.reco} et ${NOMS_MODE.calcul.toLowerCase()} du niveau ${ROMAIN[n]} validés. Prochaine séance : ${NOMS_MODE[mode]}, niveau ${ROMAIN[n + 1]}.`,
        action: 'Commencer'
      };
    }
  }
  return { type: 'parcours', bilan, href: prochaine.href, surtitre: 'Ta prochaine séance', titre: prochaine.titre, desc: prochaine.desc, action: 'Commencer' };
}
