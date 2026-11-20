// Seuils de validation : tous ici, et nulle part ailleurs. Les règles qui s'en servent sont dans validation.js.

export const SEUILS = {
  // Reconnaissance et calculs : un niveau est validé quand tout son contenu a été vu au moins une fois ET quand
  // l'apprenant a réussi (taux ≥ 80 %) au moins 2 séances complètes du niveau, espacées d'au moins 24 h.
  niveau: { taux: 0.8, seances: 2, ecartHeures: 24, toutVoir: true },
  // Cas de panne : au moins la moitié des cas du niveau réussis sans faute, sur au moins 2 jours différents.
  panne: { part: 0.5, jours: 2 },
  // Banc : au moins 3 pannes différentes réparées sans alerte de sécurité.
  banc: { pannes: 3 },
  // Taille des journaux gardés dans la sauvegarde.
  journal: { seancesMax: 60, joursReussisMax: 10 }
};
