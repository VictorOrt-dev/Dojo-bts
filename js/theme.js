// Thème d'affichage : sombre (par défaut, noir OLED) ou clair (plein soleil).
// Les identifiants enregistrés restent 'bakelite' / 'porcelaine' pour la compatibilité des sauvegardes.

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
