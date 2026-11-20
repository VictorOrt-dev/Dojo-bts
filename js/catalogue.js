// Registre du contenu chargé (identifiant, niveau, domaines), pour les règles de validation : « tout le niveau vu »
// demande de connaître le niveau. Chaque module le remplit quand il charge son contenu (quiz.js, calcul.js, panne.js).
// Sans dépendance : il ne crée aucun cycle d'imports.

const registre = { reco: [], calcul: [], panne: [] };

export function definirCatalogue(mode, elements) {
  registre[mode] = elements.map(e => ({ id: e.id, niveau: e.niveau, domaines: e.domaines ?? [] }));
}

export const catalogue = () => registre;
