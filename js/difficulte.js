// Les trois niveaux de difficulté du contenu pédagogique (fiches, reconnaissance, calculs)
// et l'écran de choix du niveau avant une séance.

import { statsMode } from './xp.js';
import { frontispice } from './mise-en-page.js';
import { esc } from './util.js';

export const DIFFICULTES = [
  { n: 1, romain: 'I', nom: 'Fondations', rang: 'Apprenti', xp: 10, desc: 'Les symboles, les appareils et les lois de base.' },
  { n: 2, romain: 'II', nom: 'Pratique courante', rang: 'Compagnon', xp: 15, desc: 'Ce que tu croises tous les jours en armoire et sur le terrain.' },
  { n: 3, romain: 'III', nom: 'Cas complexes', rang: 'Expert', xp: 20, desc: 'Subtilités normatives, repérages, réglages et pièges.' }
];

export function difficulte(n) {
  return DIFFICULTES.find(d => d.n === Number(n)) ?? null;
}

// Petite étiquette « Niv. II · Pratique courante ».
export function etiquetteNiveau(n, { long = false } = {}) {
  const d = difficulte(n);
  if (!d) return '';
  return `<span class="niv niv-${d.n}" title="Niveau ${d.romain} · ${esc(d.nom)}">${long ? `Niv. ${d.romain} · ${esc(d.nom)}` : `Niv. ${d.romain}`}</span>`;
}

// Écran de choix du niveau. `href(n)` donne le lien de la séance pour le niveau n ;
// `nombre(n)` le nombre d'exercices disponibles.
export function renderChoixNiveau(vue, { mode, titre, sousTitre, href, nombre }) {
  const records = statsMode(mode).niveaux ?? {};
  vue.innerHTML = `
    ${frontispice({ surtitre: titre, titre: 'Choisis', italique: 'ton niveau', chapo: esc(sousTitre) })}
    <nav class="modes pousse-bas" aria-label="Niveaux">
      ${DIFFICULTES.map(d => `
        <a class="mode" href="${href(d.n)}">
          <span class="mode-bouton">${d.romain}</span>
          <span>
            <span class="mode-titre">${esc(d.nom)}</span>
            <span class="mode-desc">${esc(d.desc)}</span>
            <span class="mode-detail">${nombre(d.n)} · +${d.xp} XP par bonne réponse</span>
          </span>
          <span class="mode-record">${records[d.n] !== undefined ? `${String(records[d.n]).padStart(2, '0')}/10` : ''}</span>
        </a>`).join('')}
    </nav>
    <p class="discret petit espace">Pas de chrono : prends le temps de poser ton raisonnement. À chaque erreur, l'explication s'affiche.</p>`;
}
