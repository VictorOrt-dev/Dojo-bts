// Accueil des exercices (écran d'accueil d'Elec learning) + éléments partagés par les modes d'entraînement.

import { NIVEAUX, BAREME, lireXP, niveauPour, statsMode } from './xp.js';
import { plaqueOperateur, bornier, salutation } from './atelier.js';
import { deuxChiffres } from './mise-en-page.js';
import { DIFFICULTES } from './difficulte.js';
import { esc } from './util.js';

export const TAILLE_SESSION = 10;
export { deuxChiffres };

// Plaque signalétique de l'opérateur (rang, XP, galvanomètre).
export function carteNiveau() {
  const xp = lireXP();
  const sessions = ['reco', 'calcul', 'panne'].reduce((total, mode) => total + statsMode(mode).sessions, 0);
  return plaqueOperateur({ xp, n: niveauPour(xp), total: NIVEAUX.length, sessions });
}

// Nombre de cas de panne réussis sans faute.
function casSansFaute() {
  const reussis = Object.values(statsMode('panne').elements).filter(e => e.reussites > 0).length;
  return reussis ? `${reussis} sans faute` : '';
}

function record(mode) {
  const s = statsMode(mode);
  return s.sessions ? `${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION}` : '';
}

export function renderEntrainement({ vue, definirTitre }) {
  definirTitre('Exercices');
  const { mot, jour } = salutation();
  const n = niveauPour(lireXP());
  vue.innerHTML = `
    <header class="salut">
      <p class="salut-date">${esc(jour)}</p>
      <h2 class="salut-titre">${mot}, <em>${esc(n.nom.toLowerCase())}.</em></h2>
    </header>

    ${carteNiveau()}

    <nav class="modes pousse-bas" aria-label="Exercices">
      <a class="mode" href="#/entrainement/reco">
        <span class="mode-bouton">A</span>
        <span><span class="mode-titre">Reconnaissance</span><span class="mode-desc">Symboles, matériel, repérages · 3 niveaux</span></span>
        <span class="mode-record">${record('reco')}</span>
      </a>
      <a class="mode" href="#/entrainement/calcul">
        <span class="mode-bouton">B</span>
        <span><span class="mode-titre">Calculs flash</span><span class="mode-desc">Sans chrono · 11 types de calcul · 3 niveaux</span></span>
        <span class="mode-record">${record('calcul')}</span>
      </a>
      <a class="mode" href="#/entrainement/panne">
        <span class="mode-bouton">C</span>
        <span><span class="mode-titre">Cas de panne</span><span class="mode-desc">Interventions pas à pas · 3 niveaux</span></span>
        <span class="mode-record">${casSansFaute()}</span>
      </a>
    </nav>

    <details class="notice">
      <summary>Notice · barème</summary>
      <table class="tableau">
        ${DIFFICULTES.map(d => `<tr><td>Bonne réponse · niveau ${d.romain} (${esc(d.nom.toLowerCase())})</td><td>+${d.xp} XP</td></tr>`).join('')}
        <tr><td>Séance sans faute</td><td>+${BAREME.sessionParfaite} XP</td></tr>
        <tr><td>Rapidité</td><td>sans effet</td></tr>
        ${NIVEAUX.map(niv => `<tr><td>${esc(niv.nom)}</td><td>${niv.seuil} XP</td></tr>`).join('')}
      </table>
    </details>`;
}

// En-tête d'une séance : numéro, score, et le bornier (une borne par question).
export function enteteSession(numero, score, resultats = []) {
  return `
    <div class="session-entete">
      <div class="session-chiffres"><span>Question ${deuxChiffres(numero)}/${TAILLE_SESSION}</span><span class="session-score">Score ${deuxChiffres(score)}</span></div>
      ${bornier(numero - 1, resultats, TAILLE_SESSION)}
    </div>`;
}

// Rapport de fin de séance.
// suite (facultatif) : { href, libelle } pour proposer le niveau supérieur après une bonne séance.
export function afficherBilan(vue, { score, xpGagne, onRejouer, suite = null }) {
  const parfait = score === TAILLE_SESSION;
  const message = parfait ? 'Sans faute.' : score >= 7 ? 'Belle séance.' : score >= 4 ? 'Ça vient, continue.' : 'Relis les fiches, puis reviens.';
  vue.innerHTML = `
    <section class="bilan">
      <p class="surtitre">Rapport de séance</p>
      <p class="bilan-score">${deuxChiffres(score)}<small>/${TAILLE_SESSION}</small></p>
      <p class="bilan-message">${message}</p>
      <p class="bilan-xp">+${xpGagne} XP${parfait ? ' · bonus sans faute' : ''}</p>
    </section>
    ${carteNiveau()}
    <div class="actions pousse-bas">
      ${suite ? `<a class="btn principal" href="${suite.href}">${esc(suite.libelle)}</a>` : ''}
      <button id="rejouer" class="btn${suite ? '' : ' principal'}" type="button">Une autre séance de ce niveau</button>
      <a class="btn" href="#/entrainement">Retour aux exercices</a>
    </div>`;
  vue.querySelector('#rejouer').addEventListener('click', onRejouer);
  window.scrollTo(0, 0);
}

// Message bref, comme une étiquette qu'on vient de poser (ex. nouveau rang).
export function afficherToast(texte) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="marque-etat" aria-hidden="true"></span><span>${esc(texte)}</span>`;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function annoncerMontee(resultat) {
  if (resultat.montee) afficherToast(`Nouveau rang : ${resultat.montee.nom}`);
}
