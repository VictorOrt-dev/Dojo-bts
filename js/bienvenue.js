// Premier lancement : « Où en es-tu ? ». Trois choix, enregistrés dans le profil (modifiable dans le Carnet).

import * as stockage from './storage.js';
import { PROFILS } from './parcours.js';
import { frontispice } from './mise-en-page.js';
import { esc } from './util.js';

const SUITE = {
  debutant: 'On commence par reconnaître les appareils et les symboles, une séance à la fois.',
  formation: 'On consolide les fondations, puis calculs, cas de panne et banc de mesure.',
  confirme: 'Un test de 10 questions valide d\'office ce que tu maîtrises déjà.'
};

export function renderBienvenue({ vue, definirTitre }) {
  definirTitre('Bienvenue');
  vue.innerHTML = `
    ${frontispice({
      surtitre: 'Elec learning · simulateur de terrain',
      titre: 'Où en',
      italique: 'es-tu ?',
      chapo: 'Choisis ton point de départ : l\'app te proposera ensuite une séance à la fois, dans le bon ordre. Rien n\'est verrouillé, et tu pourras changer d\'avis dans le Carnet.'
    })}
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
