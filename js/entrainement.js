// Accueil d'Elec learning, simulateur de terrain de l'électricien (écran Entraînement)
// + éléments partagés par les modes d'entraînement.

import { NIVEAUX, BAREME, lireXP, niveauPour, statsMode } from './xp.js';
import { plaqueOperateur, bornier, salutation } from './atelier.js';
import { deuxChiffres } from './mise-en-page.js';
import { DIFFICULTES } from './difficulte.js';
import { esc } from './util.js';
import { DOMAINES, puceDomaine } from './domaines.js';

export const TAILLE_SESSION = 10;
export const SEANCE_MIN_BONUS = 5; // bonus « sans faute » : seulement pour une séance d'au moins 5 questions
export { deuxChiffres };

// Plaque signalétique de l'opérateur (rang, XP, galvanomètre).
export function carteNiveau() {
  const xp = lireXP();
  const sessions = ['reco', 'calcul', 'panne', 'banc'].reduce((total, mode) => total + statsMode(mode).sessions, 0);
  return plaqueOperateur({ xp, n: niveauPour(xp), total: NIVEAUX.length, sessions });
}

// Nombre de cas de panne réussis sans faute.
function casSansFaute() {
  const reussis = Object.values(statsMode('panne').elements).filter(e => e.reussites > 0).length;
  return reussis ? `${reussis} sans faute` : '';
}

// Nombre de pannes différentes réussies sans faute au banc de mesure.
function bancsReussis() {
  const n = Object.values(statsMode('banc').elements).filter(e => e.reussites > 0).length;
  return n ? `${n} sans faute` : '';
}

function record(mode) {
  const s = statsMode(mode);
  return s.sessions ? `${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION}` : '';
}

export function renderEntrainement({ vue, definirTitre }) {
  definirTitre('Entraînement');
  const { mot, jour } = salutation();
  const n = niveauPour(lireXP());
  vue.innerHTML = `
    <header class="salut">
      <p class="salut-date">${esc(jour)}</p>
      <h2 class="salut-titre">${mot}, <em>${esc(n.nom.toLowerCase())}.</em></h2>
      <p class="devise">Simulateur de terrain de l'électricien</p>
    </header>

    ${carteNiveau()}

    <nav class="modes pousse-bas" aria-label="Modes d'entraînement">
      <a class="mode" href="#/entrainement/banc">
        <span class="mode-bouton">A</span>
        <span><span class="mode-titre">Banc de mesure</span><span class="mode-desc">Panne cachée sur un départ moteur · multimètre, LoZ, pince, consignation</span></span>
        <span class="mode-record">${bancsReussis()}</span>
      </a>
      <a class="mode" href="#/entrainement/panne">
        <span class="mode-bouton">B</span>
        <span><span class="mode-titre">Cas de panne</span><span class="mode-desc">Interventions pas à pas, de la VAT au poste HTA · par domaine</span></span>
        <span class="mode-record">${casSansFaute()}</span>
      </a>
      <a class="mode" href="#/entrainement/calcul">
        <span class="mode-bouton">C</span>
        <span><span class="mode-titre">Calculs flash</span><span class="mode-desc">La valeur à lire avant de mesurer · par domaine et par niveau</span></span>
        <span class="mode-record">${record('calcul')}</span>
      </a>
      <a class="mode" href="#/entrainement/reco">
        <span class="mode-bouton">D</span>
        <span><span class="mode-titre">Reconnaissance</span><span class="mode-desc">Symboles IEC, matériel, repérages · par domaine et par niveau</span></span>
        <span class="mode-record">${record('reco')}</span>
      </a>
    </nav>

    <details class="notice">
      <summary>Notice · domaines techniques</summary>
      <table class="tableau">
        ${DOMAINES.map(d => `<tr><td>${puceDomaine(d.id)}<br><span class="discret petit">${esc(d.desc)}</span></td><td>${esc(d.nom)}</td></tr>`).join('')}
      </table>
      <p class="discret petit">Repères couleur : bleu foncé = commande en courant continu (NF EN 60204-1) ; brun et bleu clair = phase et neutre ; brun, noir, gris = L1, L2, L3 ; vert-jaune = PE ; rouge = danger HTA.</p>
    </details>

    <details class="notice">
      <summary>Notice · barème</summary>
      <table class="tableau">
        ${DIFFICULTES.map(d => `<tr><td>Bonne réponse · niveau ${d.romain} (${esc(d.nom.toLowerCase())})</td><td>+${d.xp} XP</td></tr>`).join('')}
        <tr><td>Séance sans faute (5 questions ou plus)</td><td>+${BAREME.sessionParfaite} XP</td></tr>
        <tr><td>Rapidité</td><td>sans effet</td></tr>
        ${NIVEAUX.map(niv => `<tr><td>${esc(niv.nom)}</td><td>${niv.seuil} XP</td></tr>`).join('')}
      </table>
    </details>`;
}

// En-tête d'une séance : numéro, score, et le bornier (une borne par question).
// total : nombre de questions de la séance (moins de 10 quand un domaine en compte peu).
export function enteteSession(numero, score, resultats = [], total = TAILLE_SESSION) {
  return `
    <div class="session-entete">
      <div class="session-chiffres"><span>Question ${deuxChiffres(numero)}/${deuxChiffres(total)}</span><span class="session-score">Score ${deuxChiffres(score)}</span></div>
      ${bornier(numero - 1, resultats, total)}
    </div>`;
}

// Rapport de fin de séance.
// suite (facultatif) : { href, libelle } pour proposer le niveau supérieur après une bonne séance.
export function afficherBilan(vue, { score, total = TAILLE_SESSION, xpGagne, onRejouer, suite = null }) {
  const parfait = score === total;
  const taux = score / total;
  const message = parfait ? 'Sans faute.' : taux >= 0.7 ? 'Belle séance.' : taux >= 0.4 ? 'Ça vient, continue.' : 'Reprends les explications, puis recommence.';
  vue.innerHTML = `
    <section class="bilan">
      <p class="surtitre">Rapport de séance</p>
      <p class="bilan-score">${deuxChiffres(score)}<small>/${deuxChiffres(total)}</small></p>
      <p class="bilan-message">${message}</p>
      <p class="bilan-xp">+${xpGagne} XP${parfait && total >= SEANCE_MIN_BONUS ? ' · bonus sans faute' : ''}</p>
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
