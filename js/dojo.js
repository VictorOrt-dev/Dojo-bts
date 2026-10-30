// Accueil du Dojo + éléments d'interface partagés par les modes d'entraînement.

import { NIVEAUX, BAREME, lireXP, niveauPour, statsMode } from './xp.js';
import { frontispice, titreSection, deuxChiffres, ROMAINS } from './mise-en-page.js';
import { esc } from './util.js';

export const TAILLE_SESSION = 10;
export { deuxChiffres };

// Rang de l'opérateur : nom en italique, XP en mono, règle graduée vers le rang suivant.
export function carteNiveau() {
  const xp = lireXP();
  const n = niveauPour(xp);
  const rangs = NIVEAUX.map((_, i) => i === n.rang ? `<b>${ROMAINS[i]}</b>` : ROMAINS[i]).join(' · ');
  const suite = n.suivant
    ? `Encore <span class="mono">${n.reste}</span> XP avant le rang de ${esc(n.suivant.nom)}.`
    : 'Rang le plus haut atteint.';
  return `
    <section class="niveau">
      <div>
        <p class="rangs" aria-label="Rang ${n.rang + 1} sur ${NIVEAUX.length}">RANG ${rangs}</p>
        <p class="niveau-nom">${esc(n.nom)}</p>
      </div>
      <p class="niveau-xp"><span class="valeur">${String(xp).padStart(4, '0')}</span><span class="unite-xp">XP</span></p>
      <div class="regle" aria-hidden="true"><div class="regle-remplissage" style="width: ${Math.round(n.progression * 100)}%"></div></div>
      <p class="niveau-suite">${suite}</p>
    </section>`;
}

function record(mode) {
  const s = statsMode(mode);
  return s.sessions ? `Rec. ${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION}` : '—';
}

export function renderDojo({ vue, definirTitre }) {
  definirTitre('II — Dojo');
  vue.innerHTML = `
    ${frontispice({ surtitre: 'Chapitre II · Le Dojo', titre: 'Entraînement', italique: 'quotidien' })}

    ${carteNiveau()}

    <section>
      ${titreSection('§ 1', "Exercices")}
      <a class="ligne" href="#/dojo/reco">
        <span class="ligne-num">A.</span>
        <div>
          <h2 class="ligne-titre">Reconnaissance</h2>
          <p class="ligne-meta">Symboles IEC · matériel d'armoire · ${TAILLE_SESSION} planches</p>
        </div>
        <span class="ligne-fin">${record('reco')}</span>
      </a>
      <a class="ligne" href="#/dojo/calcul">
        <span class="ligne-num">B.</span>
        <div>
          <h2 class="ligne-titre">Calculs flash</h2>
          <p class="ligne-meta">${TAILLE_SESSION} calculs · 30 s chacun · tolérance ±2 %</p>
        </div>
        <span class="ligne-fin">${record('calcul')}</span>
      </a>
      <div class="ligne inactif">
        <span class="ligne-num">C.</span>
        <div>
          <h2 class="ligne-titre">Cas de panne</h2>
          <p class="ligne-meta">Diagnostic pas à pas</p>
        </div>
        <span class="ligne-fin">À venir</span>
      </div>
    </section>

    <section>
      ${titreSection('§ 2', 'Barème')}
      <table class="tableau corps">
        <tr><td>Bonne réponse</td><td>+${BAREME.bonneReponse} XP</td></tr>
        <tr><td>Calcul juste en moins de ${BAREME.seuilRapidite} s</td><td>+${BAREME.bonusRapidite} XP</td></tr>
        <tr><td>Session sans faute</td><td>+${BAREME.sessionParfaite} XP</td></tr>
        ${NIVEAUX.map((n, i) => `<tr><td>Rang ${ROMAINS[i]} · <em>${esc(n.nom)}</em></td><td>${n.seuil} XP</td></tr>`).join('')}
      </table>
    </section>`;
}

// En-tête d'une session : "Question 03/10" + score.
export function enteteSession(numero, score) {
  return `<div class="session-entete"><span>Question ${deuxChiffres(numero)}/${TAILLE_SESSION}</span><span class="session-score">Score ${deuxChiffres(score)}</span></div>`;
}

// Écran de fin de session.
export function afficherBilan(vue, { score, xpGagne, onRejouer }) {
  const parfait = score === TAILLE_SESSION;
  const message = parfait ? 'Sans faute.' : score >= 7 ? 'Travail solide.' : score >= 4 ? 'Ça vient, continue.' : 'Relis les fiches, puis reviens.';
  vue.innerHTML = `
    <section class="bilan">
      <p class="surtitre">Rapport de session</p>
      <p class="bilan-score">${deuxChiffres(score)}<small>/${TAILLE_SESSION}</small></p>
      <p class="bilan-message">${message}</p>
      <p class="bilan-xp">+${xpGagne} XP${parfait ? ' · dont bonus sans faute' : ''}</p>
    </section>
    ${carteNiveau()}
    <div class="actions">
      <button id="rejouer" class="btn principal" type="button">Rejouer</button>
      <a class="btn" href="#/dojo">Retour au Dojo</a>
    </div>`;
  vue.querySelector('#rejouer').addEventListener('click', onRejouer);
  window.scrollTo(0, 0);
}

// Message bref épinglé en haut de l'écran (ex. nouveau rang).
export function afficherToast(texte) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="marque-etat marque-attention" aria-hidden="true"></span><span>${esc(texte)}</span>`;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function annoncerMontee(resultat) {
  if (resultat.montee) afficherToast(`Nouveau rang : ${resultat.montee.nom}`);
}
