// Mode Reconnaissance visuelle : QCM à 4 propositions sur une image (symbole ou matériel).
// Le contenu vient de data/reconnaissance.json.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, enteteSession, afficherBilan, annoncerMontee } from './dojo.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';

const LIBELLES_TYPE = {
  symbole: 'Symbole schématique (IEC 60617)',
  materiel: "Matériel d'armoire électrique"
};

let promesseQuestions = null;

export function chargerQuestions() {
  promesseQuestions ??= fetch('data/reconnaissance.json')
    .then(rep => {
      if (!rep.ok) throw new Error(`data/reconnaissance.json introuvable (HTTP ${rep.status})`);
      return rep.json();
    })
    .catch(err => {
      promesseQuestions = null;
      throw err;
    });
  return promesseQuestions;
}

export async function renderReco({ vue, definirTitre }) {
  definirTitre('Reconnaissance visuelle');
  const toutes = await chargerQuestions();

  const session = {
    questions: melanger(toutes).slice(0, TAILLE_SESSION),
    index: 0,
    score: 0,
    xp: 0
  };

  const afficherQuestion = () => {
    const q = session.questions[session.index];
    const choix = melanger([q.nom, ...q.faux]);

    vue.innerHTML = `
      ${enteteSession(session.index + 1, session.score)}
      <figure class="reco-visuel"><img src="${esc(q.image)}" alt="Image à identifier"></figure>
      <p class="reco-type">${LIBELLES_TYPE[q.type] ?? ''}</p>
      <h2 class="question">${esc(q.question)}</h2>
      <div class="choix">
        ${choix.map(c => `<button class="btn choix-btn" type="button">${esc(c)}</button>`).join('')}
      </div>
      <div id="explication"></div>`;

    vue.querySelectorAll('.choix-btn').forEach((bouton, i) =>
      bouton.addEventListener('click', () => repondre(q, choix[i], bouton)));
    window.scrollTo(0, 0);
  };

  const repondre = (q, choisi, boutonChoisi) => {
    const juste = choisi === q.nom;
    vue.querySelectorAll('.choix-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === q.nom) b.classList.add('juste');
    });
    if (!juste) boutonChoisi.classList.add('faux');

    noterReponse('reco', q.id, juste);
    let gain = 0;
    if (juste) {
      session.score++;
      gain = BAREME.bonneReponse;
      session.xp += gain;
      annoncerMontee(gagnerXP(gain));
    }

    const derniere = session.index === session.questions.length - 1;
    const zone = vue.querySelector('#explication');
    zone.innerHTML = `
      <section class="carte explication ${juste ? 'est-juste' : 'est-faux'}">
        <p class="verdict">${juste ? `✅ Bonne réponse ! <span class="gain">+${gain} XP</span>` : `❌ C'était : <strong>${esc(q.nom)}</strong>`}</p>
        <dl>
          <dt>Repérage</dt><dd>${esc(q.reperage)}</dd>
          <dt>Rôle</dt><dd>${esc(q.role)}</dd>
        </dl>
        ${q.verifie ? '' : '<p class="discret petit">⚠️ Contenu à vérifier avec ton cours.</p>'}
        <button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le résultat' : 'Question suivante'}</button>
      </section>`;
    zone.querySelector('#suivant').addEventListener('click', suivant);
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const suivant = () => {
    session.index++;
    if (session.index < session.questions.length) return afficherQuestion();

    if (session.score === TAILLE_SESSION) {
      session.xp += BAREME.sessionParfaite;
      annoncerMontee(gagnerXP(BAREME.sessionParfaite));
    }
    noterSession('reco', session.score);
    afficherBilan(vue, { score: session.score, xpGagne: session.xp, onRejouer: () => renderReco({ vue, definirTitre }) });
  };

  afficherQuestion();
}
