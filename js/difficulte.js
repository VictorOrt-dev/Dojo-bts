// Les trois niveaux de difficulté des exercices (reconnaissance, calculs, cas de panne)
// et l'écran de choix du niveau avant une séance.

import { statsMode } from './xp.js';
import { frontispice } from './mise-en-page.js';
import { esc } from './util.js';
import { domaine, barreDomaines } from './domaines.js';

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

// Écran de choix du niveau, avec le filtre par domaine technique en tête.
// base : adresse du mode (ex. '#/entrainement/reco') ; nombre(n, d) : éléments disponibles au niveau n, domaine d ('' = tous) ;
// unite : « planches », « types de calcul »… Un niveau vide pour le domaine choisi est affiché grisé.
// Les records par niveau ne concernent que les séances « tous domaines ».
export function lienSeance(base, n, d = '') {
  const params = new URLSearchParams();
  if (n) params.set('n', n);
  if (d) params.set('d', d);
  const requete = params.toString();
  return requete ? `${base}?${requete}` : base;
}

export function renderChoixNiveau(vue, { mode, base, titre, sousTitre, nombre, unite, domaine: actif = '' }) {
  const records = statsMode(mode).niveaux ?? {};
  const choisi = domaine(actif) ? actif : '';
  vue.innerHTML = `
    ${frontispice({ surtitre: titre, titre: 'Choisis', italique: 'ton niveau', chapo: esc(sousTitre) })}
    ${barreDomaines({
      actif: choisi,
      href: d => lienSeance(base, 0, d),
      compter: d => DIFFICULTES.reduce((t, x) => t + nombre(x.n, d), 0)
    })}
    <nav class="modes pousse-bas" aria-label="Niveaux">
      ${DIFFICULTES.map(d => {
        const n = nombre(d.n, choisi);
        const contenu = `
          <span class="mode-bouton">${d.romain}</span>
          <span>
            <span class="mode-titre">${esc(d.nom)}</span>
            <span class="mode-desc">${esc(d.desc)}</span>
            <span class="mode-detail">${n ? `${n} ${esc(unite)} · +${d.xp} XP par bonne réponse` : 'Rien dans ce domaine à ce niveau'}</span>
          </span>
          <span class="mode-record">${!choisi && records[d.n] !== undefined ? `${String(records[d.n]).padStart(2, '0')}/10` : ''}</span>`;
        return n ? `<a class="mode" href="${lienSeance(base, d.n, choisi)}">${contenu}</a>` : `<div class="mode inactif" aria-disabled="true">${contenu}</div>`;
      }).join('')}
    </nav>
    <p class="discret petit espace">Pas de chrono : prends le temps de poser ton raisonnement. À chaque erreur, le tuteur explique le pourquoi physique et le risque réel.</p>`;
}
