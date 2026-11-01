// Thème d'affichage : « auto » (par défaut, suit le réglage clair / sombre du téléphone), sombre ou clair.
// Les identifiants enregistrés restent 'bakelite' (sombre) / 'porcelaine' (clair) pour la compatibilité des sauvegardes.

import * as stockage from './storage.js';

const systemeClair = matchMedia('(prefers-color-scheme: light)');

// Choix enregistré : 'auto', 'bakelite' ou 'porcelaine'.
export function themeActuel() {
  const m = stockage.lire().preferences?.matiere;
  return m === 'porcelaine' || m === 'bakelite' ? m : 'auto';
}

// Thème réellement affiché, une fois « auto » résolu d'après le téléphone.
export function themeEffectif(theme = themeActuel()) {
  if (theme === 'auto') return systemeClair.matches ? 'porcelaine' : 'bakelite';
  return theme;
}

export function appliquerTheme(theme = themeActuel()) {
  const clair = themeEffectif(theme) === 'porcelaine';
  if (clair) document.documentElement.dataset.theme = 'porcelaine';
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', clair ? '#F2F2F4' : '#000000');
}

export function changerTheme(theme) {
  stockage.modifier(e => { e.preferences = { ...e.preferences, matiere: theme }; });
  appliquerTheme(theme);
}

// En mode « auto », l'app suit le téléphone en direct (passage jour / nuit, réglage modifié).
systemeClair.addEventListener('change', () => { if (themeActuel() === 'auto') appliquerTheme(); });
