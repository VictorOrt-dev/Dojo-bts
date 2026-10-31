// Blocs « tuteur de terrain » communs à tous les modes : le risque humain et machine d'une erreur,
// et la référence normative. Un contenu sans risque ni norme n'affiche rien.

import { esc } from './util.js';
import { typo } from './mise-en-page.js';

export function blocRisque(risque) {
  return risque ? `<div class="risque"><p class="lecon-titre">Le risque, en vrai</p><p>${esc(typo(risque))}</p></div>` : '';
}

export function ligneNorme(norme) {
  return norme ? `<p class="norme"><span>Réf.</span> ${esc(typo(norme))}</p>` : '';
}
