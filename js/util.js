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

export function plurielS(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}
