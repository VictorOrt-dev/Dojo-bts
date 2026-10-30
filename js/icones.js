// Icônes SVG au trait (remplacent les emojis). Couleur = currentColor.

const svg = (contenu, taille = 24) =>
  `<svg viewBox="0 0 24 24" width="${taille}" height="${taille}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenu}</svg>`;

export const ICONES = {
  chevron: svg('<path d="m9 6 6 6-6 6"/>', 20),
  reco: svg('<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M12 6.5V10M12 14v3.5M12 14 9.5 9.6"/>'),
  calcul: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8v3H8z"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>'),
  panne: svg('<path d="M2 12h4l2-5 4 10 2-5h8"/>'),
  exporter: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>', 20),
  importer: svg('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 19h16"/>', 20)
};
