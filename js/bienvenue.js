// Sas d'entrée : tant qu'aucun profil n'est enregistré, l'application est recouverte par un écran plein écran
// « Choisis ton point de départ ». Ni croix, ni « Plus tard », ni touche Échap : seul un choix ouvre l'app. Le reste
// de la page (en-tête, écran, onglets) est inerte (attribut inert) : ni toucher, ni clavier, ni lecteur d'écran.
// Après le choix : profil enregistré tout de suite, le sas se replie (transition), l'accueil s'affiche aux couleurs du
// profil ; le grand débutant passe d'abord par le socle des 4 piliers. « Tout effacer » (Carnet) fait revenir le sas.

import * as stockage from './storage.js';
import { PROFILS } from './parcours.js';
import { esc } from './util.js';

const SUITE = {
  debutant: 'D\'abord les 4 piliers en 3 minutes (tension, courant, résistance, phase, neutre et terre), puis une séance à la fois.',
  formation: 'On consolide les fondations, puis calculs, cas de panne et banc de mesure.',
  confirme: 'Un test de 12 questions valide d\'office ce que tu maîtrises ; le banc et les modes avancés sont ouverts.'
};
const ORDRE = ['debutant', 'formation', 'confirme'];
const DUREE_REPLI = 360;   // ms, la transition CSS du sas

export const sasOuvert = () => !!document.getElementById('sas');

// Les couleurs du profil sur toute l'app (accent de l'accueil, pastille du profil).
export function appliquerProfil(profil = stockage.lire().profil) {
  if (profil) document.documentElement.dataset.profil = profil;
  else delete document.documentElement.dataset.profil;
}

const autresQueLeSas = () => [...document.body.children].filter(el => el.id !== 'sas');

// Ouvre le sas (s'il ne l'est pas déjà). apres(profil) est appelé une fois le choix fait et le sas replié.
export function ouvrirSas(apres) {
  if (sasOuvert()) return;
  appliquerProfil(null);
  const sas = document.createElement('div');
  sas.id = 'sas';
  sas.className = 'sas';
  sas.setAttribute('role', 'dialog');
  sas.setAttribute('aria-modal', 'true');
  sas.setAttribute('aria-labelledby', 'sas-titre');
  sas.tabIndex = -1;
  sas.innerHTML = `
    <div class="sas-contenu">
      <p class="sas-marque">Elec learning · simulateur de terrain</p>
      <h1 id="sas-titre" class="sas-titre">Bienvenue <em>sur le chantier.</em></h1>
      <p class="sas-accroche">Choisis ton point de départ pour adapter l'expérience.</p>
      <div class="sas-choix" role="group" aria-label="Ton point de départ">
        ${ORDRE.map((id, i) => {
          const p = PROFILS.find(x => x.id === id);
          return `
          <button type="button" class="mode mode-profil mode-profil-${p.id}" data-profil="${p.id}">
            <span class="mode-bouton">${i + 1}</span>
            <span>
              <span class="mode-titre">${esc(p.nom)}</span>
              <span class="mode-desc">${esc(p.desc)}</span>
              <span class="mode-detail">${esc(SUITE[p.id])}</span>
            </span>
            <span></span>
          </button>`;
        }).join('')}
      </div>
      <div class="bienvenue-intro">
        <p>Elec learning t'entraîne comme sur le terrain : banc de mesure à panne cachée, interventions pas à pas, mégohmmètre, calculs et reconnaissance, chaque erreur corrigée comme par un tuteur.</p>
        <p>Il fonctionne <strong>hors connexion</strong>, sans compte : ta progression reste sur ton téléphone.</p>
      </div>
      <p class="sas-note">Rien n'est verrouillé ensuite : tu pourras changer de profil dans le Carnet.</p>
    </div>`;
  document.body.append(sas);
  for (const el of autresQueLeSas()) { el.inert = true; el.setAttribute('aria-hidden', 'true'); }
  document.documentElement.classList.add('sas-actif');
  // Aucune sortie sans choix : Échap ne ferme rien.
  sas.addEventListener('keydown', ev => { if (ev.key === 'Escape') ev.preventDefault(); });
  sas.focus({ preventScroll: true });   // le focus sur le sas, pas sur un choix : aucun profil n'a l'air présélectionné

  sas.querySelectorAll('[data-profil]').forEach(b => b.addEventListener('click', () => {
    const profil = b.dataset.profil;
    stockage.modifier(e => { e.profil = profil; });   // enregistré tout de suite
    appliquerProfil(profil);
    sas.querySelectorAll('[data-profil]').forEach(x => { x.disabled = true; x.classList.toggle('choisi', x === b); });
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fermer = () => {
      sas.remove();
      for (const el of autresQueLeSas()) { el.inert = false; el.removeAttribute('aria-hidden'); }
      document.documentElement.classList.remove('sas-actif');
      apres?.(profil);
    };
    sas.classList.add('se-replie');
    setTimeout(fermer, reduit ? 0 : DUREE_REPLI);
  }, { once: true }));
}
