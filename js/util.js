// Petits utilitaires partagés.

// Échappe un texte avant de l'injecter dans du HTML (innerHTML).
export function esc(texte) {
  return String(texte ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Minuscules sans accents, pour une recherche tolérante ("securite" trouve "Sécurité").
export function normaliser(texte) {
  return String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function plurielS(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}
