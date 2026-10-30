// Accueil du Dojo + éléments d'interface partagés par les modes d'entraînement.

import { NIVEAUX, BAREME, lireXP, niveauPour, statsMode } from './xp.js';
import { ICONES } from './icones.js';
import { esc } from './util.js';

export const TAILLE_SESSION = 10;

export const deuxChiffres = n => String(n).padStart(2, '0');

export function carteNiveau() {
  const xp = lireXP();
  const n = niveauPour(xp);
  const suite = n.suivant
    ? `Encore <span class="mono">${n.reste}</span> XP pour passer ${esc(n.suivant.nom)}`
    : 'Niveau maximum atteint.';
  return `
    <section class="carte niveau">
      <p class="panneau-titre">Niveau opérateur · N${n.rang + 1}/${NIVEAUX.length}</p>
      <div class="niveau-ligne">
        <div>
          <p class="niveau-nom">${esc(n.nom)}</p>
          <div class="rangs" role="img" aria-label="Niveau ${n.rang + 1} sur ${NIVEAUX.length}">
            ${NIVEAUX.map((_, i) => `<span class="rang${i <= n.rang ? ' atteint' : ''}"></span>`).join('')}
          </div>
        </div>
        <p class="niveau-xp"><span class="valeur">${xp}</span><span class="unite-xp">XP TOTAL</span></p>
      </div>
      <div class="bargraphe"><div class="bargraphe-remplissage" style="width: ${Math.round(n.progression * 100)}%"></div></div>
      <p class="niveau-suite">${suite}</p>
    </section>`;
}

function record(mode) {
  const s = statsMode(mode);
  return s.sessions ? `REC ${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION} · ${s.sessions} SESSION${s.sessions > 1 ? 'S' : ''}` : 'AUCUNE SESSION';
}

export function renderDojo({ vue, definirTitre }) {
  definirTitre('Le Dojo');
  vue.innerHTML = `
    ${carteNiveau()}

    <p class="panneau-titre">Modes d'entraînement</p>

    <a class="carte mode" href="#/dojo/reco">
      <span class="mode-icone">${ICONES.reco}</span>
      <span class="mode-texte">
        <span class="mode-titre">Reconnaissance</span>
        <span class="mode-desc">Symboles IEC et matériel d'armoire</span>
        <span class="mode-record">${record('reco')}</span>
      </span>
      <span class="chevron">${ICONES.chevron}</span>
    </a>

    <a class="carte mode" href="#/dojo/calcul">
      <span class="mode-icone">${ICONES.calcul}</span>
      <span class="mode-texte">
        <span class="mode-titre">Calculs Flash</span>
        <span class="mode-desc">30 s par calcul · tolérance ±2 %</span>
        <span class="mode-record">${record('calcul')}</span>
      </span>
      <span class="chevron">${ICONES.chevron}</span>
    </a>

    <div class="carte mode inactif">
      <span class="mode-icone">${ICONES.panne}</span>
      <span class="mode-texte">
        <span class="mode-titre">Cas de panne</span>
        <span class="mode-desc">Diagnostic pas à pas</span>
        <span class="mode-record">VERROUILLÉ · ÉTAPE 3</span>
      </span>
    </div>

    <details class="carte bareme">
      <summary>Barème et niveaux</summary>
      <table class="tableau">
        <tr><td>Bonne réponse</td><td>+${BAREME.bonneReponse} XP</td></tr>
        <tr><td>Calcul juste en moins de ${BAREME.seuilRapidite} s</td><td>+${BAREME.bonusRapidite} XP</td></tr>
        <tr><td>Session parfaite ${TAILLE_SESSION}/${TAILLE_SESSION}</td><td>+${BAREME.sessionParfaite} XP</td></tr>
        ${NIVEAUX.map((n, i) => `<tr class="seuil"><td>N${i + 1} · ${esc(n.nom)}</td><td>${n.seuil} XP</td></tr>`).join('')}
      </table>
    </details>`;
}

// En-tête d'une session : "Q 03/10" + score.
export function enteteSession(numero, score) {
  return `<div class="session-entete"><span>Q ${deuxChiffres(numero)}/${TAILLE_SESSION}</span><span class="session-score">SCORE ${deuxChiffres(score)}</span></div>`;
}

// Écran de fin de session.
export function afficherBilan(vue, { score, xpGagne, onRejouer }) {
  const parfait = score === TAILLE_SESSION;
  const message = parfait ? 'Sans faute' : score >= 7 ? 'Solide' : score >= 4 ? 'Ça vient, continue' : 'Revois les fiches et retente';
  vue.innerHTML = `
    <section class="carte bilan">
      <p class="panneau-titre">Rapport de session</p>
      <p class="bilan-score">${deuxChiffres(score)}<small>/${TAILLE_SESSION}</small></p>
      <p class="bilan-message">${message}</p>
      <p class="bilan-xp">+${xpGagne} XP${parfait ? ' · bonus 10/10' : ''}</p>
    </section>
    ${carteNiveau()}
    <div class="actions">
      <button id="rejouer" class="btn principal" type="button">Rejouer</button>
      <a class="btn" href="#/dojo">Retour au Dojo</a>
    </div>`;
  vue.querySelector('#rejouer').addEventListener('click', onRejouer);
  window.scrollTo(0, 0);
}

// Message d'alarme court en haut de l'écran (ex. montée de niveau).
export function afficherToast(texte) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="led led-vert"></span><span>${esc(texte)}</span>`;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function annoncerMontee(resultat) {
  if (resultat.montee) afficherToast(`Niveau atteint : ${resultat.montee.nom}`);
}
