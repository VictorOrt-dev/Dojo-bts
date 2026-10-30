// Éléments de mise en page éditoriale partagés par les écrans.

import { esc } from './util.js';

export const ROMAINS = ['I', 'II', 'III', 'IV', 'V'];

export const deuxChiffres = n => String(n).padStart(2, '0');

// Ouverture de page : sur-titre en capitales mono + grand titre serif (+ partie en italique) + chapô.
export function frontispice({ surtitre, titre, italique = '', chapo = '' }) {
  return `
    <header class="frontispice">
      <p class="surtitre">${esc(surtitre)}</p>
      <h2 class="titre-chapitre">${esc(titre)}${italique ? ` <em>${esc(italique)}</em>` : ''}</h2>
      ${chapo ? `<p class="chapo">${chapo}</p>` : ''}
    </header>`;
}

// Titre de section : numéro dans la gouttière + intitulé en italique.
export function titreSection(numero, texte) {
  return `<h3 class="section-titre"><span class="section-num">${esc(numero)}</span><span>${esc(texte)}</span></h3>`;
}

// Petit carré d'état : 'ok' (encre), 'attention' (vermillon), 'neutre' (contour).
export function ligneEtat(etat, html) {
  const classe = etat === 'ok' ? '' : ` marque-${etat}`;
  return `<p class="ligne-etat"><span class="marque-etat${classe}" aria-hidden="true"></span><span>${html}</span></p>`;
}

// Typographie française : espace insécable entre un nombre et son unité,
// espace fine insécable devant ? ! ; : » et après «.
export function typo(texte) {
  return String(texte ?? '')
    .replace(/(\d) (?=[A-Za-zΩµ%°])/g, '$1\u00A0')
    .replace(/\b(NF C|NF|IEC|ISO|EN) (?=\d)/g, (m, sigle) => sigle.replace(' ', '\u00A0') + '\u00A0')
    .replace(/ ([?!;:»])/g, '\u202F$1')
    .replace(/« /g, '«\u202F');
}
