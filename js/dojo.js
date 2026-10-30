// Accueil du Dojo + éléments d'interface partagés par les modes d'entraînement.

import { NIVEAUX, BAREME, lireXP, niveauPour, statsMode } from './xp.js';
import { esc } from './util.js';

export const TAILLE_SESSION = 10;

export function carteNiveau() {
  const xp = lireXP();
  const n = niveauPour(xp);
  const suite = n.suivant
    ? `Encore <strong>${n.reste} XP</strong> pour ${n.suivant.icone} ${esc(n.suivant.nom)}`
    : 'Niveau maximum atteint. Respect.';
  return `
    <section class="carte niveau">
      <div class="niveau-haut">
        <span class="niveau-icone" aria-hidden="true">${n.icone}</span>
        <div>
          <p class="niveau-nom">${esc(n.nom)}</p>
          <p class="discret">Niveau ${n.rang + 1} / ${NIVEAUX.length} · ${xp} XP</p>
        </div>
      </div>
      <progress max="1" value="${n.progression}"></progress>
      <p class="discret">${suite}</p>
    </section>`;
}

function record(mode) {
  const s = statsMode(mode);
  return s.sessions ? `Record ${s.meilleurScore}/${TAILLE_SESSION} · ${s.sessions} session${s.sessions > 1 ? 's' : ''}` : 'Pas encore joué';
}

export function renderDojo({ vue, definirTitre }) {
  definirTitre('Le Dojo');
  vue.innerHTML = `
    ${carteNiveau()}

    <a class="carte mode" href="#/dojo/reco">
      <span class="mode-icone" aria-hidden="true">👁️</span>
      <span>
        <strong>Reconnaissance visuelle</strong>
        <span class="discret">Symboles IEC et matériel d'armoire</span>
        <span class="mode-record">${record('reco')}</span>
      </span>
    </a>

    <a class="carte mode" href="#/dojo/calcul">
      <span class="mode-icone" aria-hidden="true">🧮</span>
      <span>
        <strong>Calculs Flash</strong>
        <span class="discret">30 s par calcul · tolérance ±2 %</span>
        <span class="mode-record">${record('calcul')}</span>
      </span>
    </a>

    <div class="carte mode inactif">
      <span class="mode-icone" aria-hidden="true">🩺</span>
      <span>
        <strong>Cas de panne</strong>
        <span class="discret">Arrive à l'étape 3</span>
      </span>
    </div>

    <details class="carte bareme">
      <summary>Barème et niveaux</summary>
      <ul>
        <li>Bonne réponse : +${BAREME.bonneReponse} XP</li>
        <li>Calcul juste en moins de ${BAREME.seuilRapidite} s : +${BAREME.bonusRapidite} XP</li>
        <li>Session parfaite (${TAILLE_SESSION}/${TAILLE_SESSION}) : +${BAREME.sessionParfaite} XP</li>
      </ul>
      <ul>
        ${NIVEAUX.map(n => `<li>${n.icone} ${esc(n.nom)} : dès ${n.seuil} XP</li>`).join('')}
      </ul>
    </details>`;
}

// En-tête d'une session : "Question 3/10" + score.
export function enteteSession(numero, score) {
  return `<div class="session-entete"><span>Question ${numero}/${TAILLE_SESSION}</span><span>Score ${score}</span></div>`;
}

// Écran de fin de session.
export function afficherBilan(vue, { score, xpGagne, onRejouer }) {
  const parfait = score === TAILLE_SESSION;
  const message = parfait ? 'Sans faute !' : score >= 7 ? 'Solide.' : score >= 4 ? 'Ça vient, continue.' : 'Revois les fiches et retente.';
  vue.innerHTML = `
    <section class="carte bilan">
      <p class="bilan-score">${score}<small>/${TAILLE_SESSION}</small></p>
      <p class="bilan-message">${message}</p>
      <p class="ok">+${xpGagne} XP${parfait ? ' (dont bonus session parfaite)' : ''}</p>
    </section>
    ${carteNiveau()}
    <div class="actions">
      <button id="rejouer" class="btn principal" type="button">Rejouer</button>
      <a class="btn" href="#/dojo">Retour au Dojo</a>
    </div>`;
  vue.querySelector('#rejouer').addEventListener('click', onRejouer);
  window.scrollTo(0, 0);
}

// Petit message temporaire en haut de l'écran (ex. montée de niveau).
export function afficherToast(texte) {
  const toast = Object.assign(document.createElement('div'), { className: 'toast', textContent: texte });
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3500);
}

export function annoncerMontee(resultat) {
  if (resultat.montee) afficherToast(`🎉 Nouveau niveau : ${resultat.montee.icone} ${resultat.montee.nom}`);
}
