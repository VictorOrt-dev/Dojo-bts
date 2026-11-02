// Premier lancement : « Où en es-tu ? ». Trois choix, enregistrés dans le profil (modifiable dans le Carnet).

import * as stockage from './storage.js';
import { PROFILS } from './parcours.js';
import { frontispice } from './mise-en-page.js';
import { esc } from './util.js';
import { BLOCS } from './blocs.js';

const SUITE = {
  debutant: 'On commence par reconnaître les appareils et les symboles, une séance à la fois.',
  formation: 'On consolide les fondations, puis calculs, cas de panne et banc de mesure.',
  confirme: 'Un test de 12 questions valide d\'office ce que tu maîtrises déjà.'
};

export function renderBienvenue({ vue, definirTitre }) {
  definirTitre('Bienvenue');
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
    <ol class="bienvenue-blocs" aria-label="Le parcours en 3 blocs">
      ${BLOCS.map((b, i) => `<li><span class="bloc-num">${i + 1}</span><span><strong>${esc(b.titre)}</strong><span class="bloc-desc">${esc(b.desc)}</span></span></li>`).join('')}
    </ol>
    <h2 class="titre-section-bienvenue">Où en es-tu ?</h2>
    <p class="discret">Choisis ton point de départ : l'app te proposera une séance à la fois, dans le bon ordre. Rien n'est verrouillé, et tu pourras changer d'avis dans le Carnet.</p>
    <div class="modes choix-profils pousse-bas">
      ${PROFILS.map((p, i) => `
        <button type="button" class="mode mode-profil mode-profil-${p.id}" data-profil="${p.id}">
          <span class="mode-bouton">${i + 1}</span>
          <span>
            <span class="mode-titre">${esc(p.nom)}</span>
            <span class="mode-desc">${esc(p.desc)}</span>
            <span class="mode-detail">${esc(SUITE[p.id])}</span>
          </span>
          <span></span>
        </button>`).join('')}
    </div>`;
  vue.querySelectorAll('[data-profil]').forEach(b => b.addEventListener('click', () => {
    stockage.modifier(e => { e.profil = b.dataset.profil; });
    location.replace('#/entrainement');
  }));
}
