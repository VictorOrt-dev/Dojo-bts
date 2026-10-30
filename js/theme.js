// Affichage Nuit (par défaut) ou Plein jour (contraste renforcé pour l'extérieur).

import * as stockage from './storage.js';

export function themeActuel() {
  return stockage.lire().preferences?.theme === 'jour' ? 'jour' : 'nuit';
}

export function appliquerTheme(theme = themeActuel()) {
  if (theme === 'jour') document.documentElement.dataset.theme = 'jour';
  else delete document.documentElement.dataset.theme;
}

export function changerTheme(theme) {
  stockage.modifier(e => { e.preferences = { ...e.preferences, theme }; });
  appliquerTheme(theme);
}
