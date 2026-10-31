// Matière d'affichage : Bakélite (sombre, par défaut, économe sur OLED) ou Porcelaine (claire, plein soleil).

import * as stockage from './storage.js';

export function themeActuel() {
  return stockage.lire().preferences?.matiere === 'porcelaine' ? 'porcelaine' : 'bakelite';
}

export function appliquerTheme(theme = themeActuel()) {
  if (theme === 'porcelaine') document.documentElement.dataset.theme = 'porcelaine';
  else delete document.documentElement.dataset.theme;
}

export function changerTheme(theme) {
  stockage.modifier(e => { e.preferences = { ...e.preferences, matiere: theme }; });
  appliquerTheme(theme);
}
