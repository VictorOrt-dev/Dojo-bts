// Mode Reconnaissance visuelle : QCM à 4 propositions sur une image (symbole ou matériel).
// Le contenu vient de data/reconnaissance.json.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, enteteSession, afficherBilan, annoncerMontee } from './dojo.js';
import { deuxChiffres, typo } from './mise-en-page.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';

const LEGENDES = {
  symbole: 'Symbole · IEC 60617',
  materiel: "Matériel · armoire électrique"
};
const TOUCHES = ['A', 'B', 'C', 'D'];

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
      <figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}">
        <div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div>
        <figcaption class="reco-legende">Planche ${deuxChiffres(session.index + 1)} — ${LEGENDES[q.type] ?? ''}</figcaption>
      </figure>
      <h2 class="question">${esc(q.question)}</h2>
      <div class="choix">
        ${choix.map((c, i) => `<button class="choix-btn" type="button"><span class="choix-touche">${TOUCHES[i]}</span><span>${esc(typo(c))}</span></button>`).join('')}
      </div>
      <div id="explication"></div>`;

    vue.querySelectorAll('.choix-btn').forEach((bouton, i) =>
      bouton.addEventListener('click', () => repondre(q, choix, i)));
    window.scrollTo(0, 0);
  };

  const repondre = (q, choix, iChoisi) => {
    const juste = choix[iChoisi] === q.nom;
    vue.querySelectorAll('.choix-btn').forEach((b, i) => {
      b.disabled = true;
      if (choix[i] === q.nom) b.classList.add('juste');
      else if (i === iChoisi) b.classList.add('faux');
    });

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
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        ${juste
          ? `<p class="verdict"><span class="tampon">Juste</span><span class="gain">+${gain} XP</span></p>`
          : `<p class="verdict"><span class="tampon">Faux</span></p>
             <p class="attendu">Il fallait reconnaître : <strong>${esc(typo(q.nom))}</strong>.</p>`}
        <dl class="fiche-technique">
          <dt>Repérage</dt><dd>${esc(typo(q.reperage))}</dd>
          <dt>Rôle</dt><dd>${esc(typo(q.role))}</dd>
        </dl>
        ${q.verifie ? '' : '<p class="note-marge">Note — à vérifier avec ton cours.</p>'}
        <div class="actions"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le rapport' : 'Question suivante'}</button></div>
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
