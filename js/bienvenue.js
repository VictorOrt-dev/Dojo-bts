// Premier lancement : « Où en es-tu ? ». Deux grands choix (grand débutant, confirmé / pro) et une option discrète
// (en formation), enregistrés dans le profil (modifiable dans le Carnet). Le grand débutant passe ensuite par le socle.

import * as stockage from './storage.js';
import { PROFILS } from './parcours.js';
import { frontispice } from './mise-en-page.js';
import { esc } from './util.js';

const SUITE = {
  debutant: 'D\'abord les 4 piliers en 3 minutes (tension, courant, résistance, phase, neutre et terre), puis une séance à la fois.',
  formation: 'On consolide les fondations, puis calculs, cas de panne et banc de mesure.',
  confirme: 'Un test de 12 questions valide d\'office ce que tu maîtrises ; le banc et les modes avancés sont ouverts.'
};

// Deux grands choix (grand débutant, confirmé) ; « en formation » reste possible, en option discrète.
export function renderBienvenue({ vue, definirTitre }) {
  definirTitre('Bienvenue');
  const carte = (p, i) => `
        <button type="button" class="mode mode-profil mode-profil-${p.id}" data-profil="${p.id}">
          <span class="mode-bouton">${i + 1}</span>
          <span>
            <span class="mode-titre">${esc(p.nom)}</span>
            <span class="mode-desc">${esc(p.desc)}</span>
            <span class="mode-detail">${esc(SUITE[p.id])}</span>
          </span>
          <span></span>
        </button>`;
  const formation = PROFILS.find(p => p.id === 'formation');
  vue.innerHTML = `
    ${frontispice({
      surtitre: 'Elec learning · simulateur de terrain',
      titre: 'Bienvenue',
      italique: 'sur le chantier.',
      chapo: ''
    })}
    <div class="bienvenue-intro">
      <p>Elec learning t'entraîne comme sur le terrain : banc de mesure à panne cachée, interventions pas à pas, mégohmmètre, calculs et reconnaissance, chaque erreur corrigée comme par un tuteur.</p>
      <p>Installé sur ton écran d'accueil, il fonctionne <strong>hors connexion</strong>, sans compte : ta progression reste sur ton téléphone.</p>
    </div>
    <h2 class="titre-section-bienvenue">Où en es-tu ?</h2>
    <div class="modes choix-profils pousse-bas">
      ${['debutant', 'confirme'].map((id, i) => carte(PROFILS.find(p => p.id === id), i)).join('')}
      <button type="button" class="choix-entre-deux" data-profil="formation">
        <strong>Entre les deux ?</strong> ${esc(formation.desc)} J'ai déjà quelques bases.
      </button>
    </div>
    <p class="discret petit">Rien n'est verrouillé : tu pourras changer de profil dans le Carnet.</p>`;
  vue.querySelectorAll('[data-profil]').forEach(b => b.addEventListener('click', () => {
    stockage.modifier(e => { e.profil = b.dataset.profil; });
    // Le grand débutant passe d'abord par le socle des 4 piliers.
    location.replace(b.dataset.profil === 'debutant' ? '#/entrainement/socle' : '#/entrainement');
  }));
}
