// Taxonomie par domaine technique (nature du réseau), en plus des 3 niveaux de difficulté.
// Chaque exercice, calcul, cas de panne et panne du banc porte un tableau `domaines` (le premier = domaine principal).
//
// Le repère couleur de chaque domaine reprend un vrai marquage de conducteurs :
//   TBT & CC    bleu foncé        NF EN 60204-1 : conducteurs des circuits de commande en courant continu
//   Monophasé   brun + bleu clair phase + neutre (NF C 15-100 / IEC 60445)
//   Triphasé    brun, noir, gris  L1, L2, L3 (IEC 60445)
//   Sécurité    vert-jaune        conducteur de protection PE
//   HTA         rouge             repère de danger (pas de couleur de conducteur imposée en HTA)

import { esc } from './util.js';

export const DOMAINES = [
  { id: 'tbt-cc', code: 'TBT·CC', nom: 'TBT & courant continu', desc: 'Circuits de commande, alimentations 24 V DC, capteurs et automatismes.' },
  { id: 'mono-bt', code: 'MONO', nom: 'Monophasé & basse tension', desc: 'Circuits terminaux, éclairage, prises, protection des personnes.' },
  { id: 'tri', code: 'TRI', nom: 'Triphasé & puissance', desc: 'Départs moteurs, transformateurs, couplages, énergie réactive.' },
  { id: 'securite', code: 'SÉCU', nom: 'Sécurité & habilitations', desc: 'Consignation, VAT, risques électriques, NF C 18-510.' },
  { id: 'hta', code: 'HTA', nom: 'Haute tension · postes', desc: 'Cellules HTA, protections de transformateur, sélectivité. Niveau expert.' }
];

export function domaine(id) {
  return DOMAINES.find(d => d.id === id) ?? null;
}

// Éléments d'un domaine (id absent ou inconnu = tous les domaines).
export function filtrerParDomaine(elements, id) {
  return domaine(id) ? elements.filter(e => e.domaines?.includes(id)) : elements;
}

// Petit repère « gaine colorée + code » à côté d'un titre.
export function puceDomaine(id) {
  const d = domaine(id);
  return d ? `<span class="puce-domaine" title="${esc(d.nom)}"><span class="gaine dom-${d.id}" aria-hidden="true"></span>${esc(d.code)}</span>` : '';
}

export function pucesDomaines(ids = []) {
  return ids.map(puceDomaine).join('');
}

// Barre de filtres par domaine. href(id | '') donne le lien ; compter(id | '') le nombre d'éléments.
// Un domaine sans contenu est affiché grisé, sans lien.
export function barreDomaines({ actif = '', href, compter }) {
  const filtre = (id, libelle, gaine) => {
    const n = compter(id);
    const courant = (actif || '') === id;
    const contenu = `${gaine}${esc(libelle)}<sup>${n}</sup>`;
    return n || courant
      ? `<a class="filtre" href="${href(id)}"${courant ? ' aria-current="true"' : ''}>${contenu}</a>`
      : `<span class="filtre sans-contenu" aria-disabled="true">${contenu}</span>`;
  };
  return `
    <nav class="filtres filtres-domaines" aria-label="Domaines techniques">
      ${filtre('', 'Tous', '')}
      ${DOMAINES.map(d => filtre(d.id, d.code, `<span class="gaine dom-${d.id}" aria-hidden="true"></span>`)).join('')}
    </nav>
    ${domaine(actif) ? `<p class="domaine-desc"><strong>${esc(domaine(actif).nom)}.</strong> ${esc(domaine(actif).desc)}</p>` : ''}`;
}
