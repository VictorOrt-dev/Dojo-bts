// Blocs « tuteur de terrain » communs à tous les modes, et la règle de la correction en deux temps :
// l'essentiel tout de suite (la réponse, une phrase de pourquoi, le risque), le reste sous « En savoir plus ».

import { esc } from './util.js';
import { typo } from './mise-en-page.js';

// Plafonds de l'essentiel affiché d'emblée (en mots) : ensemble, une soixantaine de mots.
export const MOTS_POURQUOI = 22;
export const MOTS_RISQUE = 26;

const compterMots = texte => String(texte ?? '').trim().split(/\s+/).filter(Boolean).length;

// Les premières phrases entières d'un texte, sans dépasser `max` mots.
// Une fin de phrase = . ! ? suivi d'une espace et d'une majuscule : « § 411.3.3 » ou « 2,4 kΩ » ne coupent rien.
// Si la première phrase dépasse déjà `max`, on la coupe à sa dernière articulation (virgule, point-virgule,
// deux-points) avant la limite, avec « … » ; le texte entier reste disponible sous « En savoir plus ».
export function resume(texte, max) {
  const t = String(texte ?? '').trim();
  const phrases = t.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ«])/);
  let court = '';
  for (const phrase of phrases) {
    if (compterMots(court) + compterMots(phrase) > max) break;
    court = court ? `${court} ${phrase}` : phrase;
  }
  if (!court) {
    const mots = phrases[0].split(/\s+/);
    let coupe = mots.slice(0, max).join(' ');
    const articulation = Math.max(coupe.lastIndexOf(', '), coupe.lastIndexOf(' ; '), coupe.lastIndexOf(' : '));
    if (articulation > coupe.length / 2) coupe = coupe.slice(0, articulation);
    court = `${coupe.replace(/[\s,;:]+$/, '')}…`;
  }
  return { court, complet: court.length >= t.length };
}

// Nombre de mots de l'essentiel d'une correction (utilisé par les tests pour tenir la promesse des ~60 mots).
export const motsEssentiel = (...textes) => textes.reduce((n, t) => n + compterMots(t), 0);

// Le risque : version courte dans l'essentiel ; version complète (si coupée) dans « En savoir plus ».
export function blocRisque(risque, { court = false } = {}) {
  if (!risque) return '';
  const texte = court ? resume(risque, MOTS_RISQUE).court : risque;
  return `<div class="risque"><p class="lecon-titre">Le risque, en vrai</p><p>${esc(typo(texte))}</p></div>`;
}

export function risqueComplet(risque) {
  return risque && !resume(risque, MOTS_RISQUE).complet
    ? `<div class="risque"><p class="lecon-titre">Le risque, en entier</p><p>${esc(typo(risque))}</p></div>`
    : '';
}

export function ligneNorme(norme) {
  return norme ? `<p class="norme"><span>Réf.</span> ${esc(typo(norme))}</p>` : '';
}

// Accordéon « En savoir plus » : tout ce qui n'est pas indispensable sur le moment.
export function enSavoirPlus(contenu, libelle = 'En savoir plus') {
  return contenu.trim() ? `<details class="approfondir en-savoir-plus"><summary>${esc(libelle)}</summary>${contenu}</details>` : '';
}
