// Répétition espacée en 5 boîtes (Leitner) : logique pure, sans dépendance (utilisée par xp.js et revision.js).

const JOUR = 24 * 60 * 60 * 1000;
export const BOITES = 5;
export const INTERVALLES_JOURS = [0, 1, 3, 7, 15];   // délai avant la révision suivante, boîte 1 à 5
export const MODES_REVISION = ['reco', 'calcul', 'panne', 'banc', 'isolement'];

export const RECENTS = 10;   // réponses récentes gardées par élément (aiguillage de l'accueil)

// Nouvel état d'un élément après une réponse. `recents` : les 10 dernières réponses, « 1 » juste, « 0 » faux.
export function appliquerResultat(element, reussi, maintenant = Date.now()) {
  const e = {
    essais: (element?.essais ?? 0) + 1,
    reussites: (element?.reussites ?? 0) + (reussi ? 1 : 0),
    recents: `${element?.recents ?? ''}${reussi ? 1 : 0}`.slice(-RECENTS)
  };
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


// ---------- Rappels dans les séances ordinaires ----------
// Une erreur ne reste pas cantonnée à l'écran « À réviser » : quelques jours plus tard, elle revient d'elle-même dans
// une séance ordinaire de reconnaissance ou de calculs, glissée entre les questions du jour (récupération espacée et
// entrelacée). Au plus RAPPELS_MAX par séance de 10, jamais en première position, et seulement si la dernière réponse
// à cet élément remonte à DELAI_RAPPEL_JOURS jours au moins.

export const RAPPELS_MAX = 3;
export const DELAI_RAPPEL_JOURS = 2;

// Date de la dernière réponse, déduite de la date de révision et de la boîte (revoir = réponse + intervalle).
export const derniereReponse = r => r.revoir - INTERVALLES_JOURS[r.boite - 1] * JOUR;

// Ids à glisser dans une séance ordinaire du mode : arrivés à échéance, assez anciens, admis par la séance (niveau,
// domaine). Les plus en retard d'abord.
export function rappelsPourSeance(etat, mode, { maintenant = Date.now(), max = RAPPELS_MAX, admis = () => true } = {}) {
  return aReviser(etat, mode, maintenant)
    .filter(r => maintenant - derniereReponse(r) >= DELAI_RAPPEL_JOURS * JOUR && admis(r.id))
    .slice(0, max)
    .map(r => r.id);
}

// Répartit les rappels à intervalles réguliers dans la séance (10 éléments, 3 rappels → places 3, 6 et 8).
export function intercaler(base, rappels, taille) {
  const total = Math.min(taille, base.length + rappels.length);
  const r = rappels.slice(0, total);
  const places = new Set(r.map((_, j) => Math.floor((j + 1) * total / (r.length + 1))));
  const sortie = [];
  let i = 0, j = 0;
  for (let p = 0; p < total; p++) sortie.push((places.has(p) && j < r.length) || i >= base.length ? r[j++] : base[i++]);
  return sortie;
}
