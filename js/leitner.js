// Répétition espacée en 5 boîtes (Leitner) : logique pure, sans dépendance (utilisée par xp.js et revision.js).

const JOUR = 24 * 60 * 60 * 1000;
export const BOITES = 5;
export const INTERVALLES_JOURS = [0, 1, 3, 7, 15];   // délai avant la révision suivante, boîte 1 à 5
export const MODES_REVISION = ['reco', 'calcul', 'panne', 'banc', 'isolement'];

// Nouvel état d'un élément { essais, reussites, boite?, revoir? } après une réponse.
export function appliquerResultat(element, reussi, maintenant = Date.now()) {
  const e = { essais: (element?.essais ?? 0) + 1, reussites: (element?.reussites ?? 0) + (reussi ? 1 : 0) };
  if (!reussi) return { ...e, boite: 1, revoir: maintenant };
  if (!element?.boite) return e;                              // jamais raté : rien à réviser
  const boite = element.boite + 1;
  if (boite > BOITES) return e;                               // acquis : sort de la révision
  return { ...e, boite, revoir: maintenant + INTERVALLES_JOURS[boite - 1] * JOUR };
}

// Éléments en révision : { mode, id, boite, revoir, du (à revoir maintenant) }, les plus urgents d'abord.
export function enRevision(etat, maintenant = Date.now()) {
  const liste = [];
  for (const mode of MODES_REVISION) {
    for (const [id, e] of Object.entries(etat.stats?.[mode]?.elements ?? {})) {
      if (e.boite) liste.push({ mode, id, boite: e.boite, revoir: e.revoir, du: e.revoir <= maintenant });
    }
  }
  return liste.sort((a, b) => a.revoir - b.revoir || a.boite - b.boite);
}

export const aReviser = (etat, mode, maintenant = Date.now()) =>
  enRevision(etat, maintenant).filter(r => r.du && (!mode || r.mode === mode));

