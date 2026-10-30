// Ambiance d'affichage : Papier (par défaut) ou Encre (pour le soir).

import * as stockage from './storage.js';

export function themeActuel() {
  return stockage.lire().preferences?.ambiance === 'encre' ? 'encre' : 'papier';
}

export function appliquerTheme(theme = themeActuel()) {
  if (theme === 'encre') document.documentElement.dataset.theme = 'encre';
  else delete document.documentElement.dataset.theme;
}

export function changerTheme(theme) {
  stockage.modifier(e => { e.preferences = { ...e.preferences, ambiance: theme }; });
  appliquerTheme(theme);
}
