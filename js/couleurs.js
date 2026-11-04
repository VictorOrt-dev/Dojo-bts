// Couleurs en toutes lettres (daltonisme) : toute image dont les couleurs portent l'information (fils d'un câble,
// d'un capteur, arrêt d'urgence) reçoit sous le visuel la légende de ses couleurs, avec le code normalisé
// (IEC 60757 : BN, BU, GNYE, BK…). L'audit (outils/audit.mjs) vérifie qu'aucune image colorée n'en est privée.

import { esc } from './util.js';

export const COULEURS = {
  marron: { nom: 'Marron', code: 'BN' },
  bleu: { nom: 'Bleu clair', code: 'BU' },
  'vert-jaune': { nom: 'Vert-jaune', code: 'GNYE' },
  noir: { nom: 'Noir', code: 'BK' },
  gris: { nom: 'Gris', code: 'GY' },
  rouge: { nom: 'Rouge', code: 'RD' },
  jaune: { nom: 'Jaune', code: 'YE' }
};

// Pour chaque image : [couleur, où la voir], dans l'ordre de lecture.
export const IMAGES_COULEURS = {
  'img/reco/mat-conducteurs.svg': [['marron', 'Fil du haut'], ['bleu', 'Fil du milieu'], ['vert-jaune', 'Fil du bas']],
  'img/reco/mat-capteur.svg': [['marron', 'Fil du haut'], ['bleu', 'Fil du milieu'], ['noir', 'Fil du bas']],
  'img/reco/mat-arret-urgence.svg': [['rouge', 'Coup de poing'], ['jaune', 'Fond']],
  'img/reco/mat-disjoncteur-modulaire.svg': [['rouge', 'Témoin de position']],
  'img/reco/mat-relais-thermique.svg': [['rouge', 'Bouton en façade']],
  'img/reco/mat-cadenas.svg': [['rouge', 'Cadenas et cadre de la pancarte']],
  'img/reco/mat-megohmmetre.svg': [['rouge', 'Bouton de test']]
};

// Teintes qui portent une information dans les images (fils, voyants, marquage de sécurité).
export const TEINTES_SIGNIFIANTES = ['#7c4a22', '#60a5fa', '#3b82f6', '#16a34a', '#dc2626'];

export const nomCouleur = c => `${COULEURS[c].nom} (${COULEURS[c].code})`;

export function legendeCouleurs(image) {
  const l = IMAGES_COULEURS[image];
  if (!l) return '';
  return `<p class="legende-couleurs">${l.map(([c, ou]) => `<span class="couleur"><span class="echantillon ech-${c}" aria-hidden="true"></span>${esc(ou)} : <strong>${esc(nomCouleur(c))}</strong></span>`).join('')}</p>`;
}
