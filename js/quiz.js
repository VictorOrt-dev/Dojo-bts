// Mode Reconnaissance visuelle : QCM à 4 propositions sur une image (symbole ou matériel),
// par niveau de difficulté. Le contenu vient de data/reconnaissance.json.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, enteteSession, afficherBilan, annoncerMontee } from './dojo.js';
import { DIFFICULTES, difficulte, etiquetteNiveau, renderChoixNiveau } from './difficulte.js';
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

export async function renderReco({ vue, definirTitre, params }) {
  definirTitre('Reconnaissance');
  const toutes = await chargerQuestions();
  const niveau = Number(params?.get('n'));
  const diff = difficulte(niveau);
  if (!diff) {
    renderChoixNiveau(vue, {
      mode: 'reco',
      titre: 'Reconnaissance',
      sousTitre: 'Symboles IEC, matériel d\'armoire, repérages et réglages.',
      href: n => `#/dojo/reco?n=${n}`,
      nombre: n => `${toutes.filter(q => q.niveau === n).length} planches`
    });
    return;
  }

  const session = {
    questions: melanger(toutes.filter(q => q.niveau === niveau)).slice(0, TAILLE_SESSION),
    index: 0,
    score: 0,
    xp: 0,
    resultats: [] // vrai / faux pour chaque question jouée (bornier)
  };

  const afficherQuestion = () => {
    const q = session.questions[session.index];
    const choix = melanger([q.nom, ...q.faux]);

    vue.innerHTML = `
      <p class="niveau-seance">${etiquetteNiveau(niveau, { long: true })}</p>
      ${enteteSession(session.index + 1, session.score, session.resultats)}
      <figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}">
        <div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div>
        <figcaption class="reco-legende">Planche ${deuxChiffres(session.index + 1)} · ${LEGENDES[q.type] ?? ''}</figcaption>
      </figure>
      <h2 class="question">${esc(typo(q.question))}</h2>
      <div class="choix">
        ${choix.map((c, i) => `<button class="choix-btn" type="button"><span class="choix-touche">${TOUCHES[i]}</span><span>${esc(typo(c))}</span></button>`).join('')}
      </div>
      <div id="explication"></div>`;

    vue.querySelectorAll('.choix-btn').forEach((bouton, i) =>
      bouton.addEventListener('click', () => repondre(q, choix, i)));
    window.scrollTo(0, 0);
  };

  const repondre = (q, choix, iChoisi) => {
    const choisi = choix[iChoisi];
    const juste = choisi === q.nom;
    vue.querySelectorAll('.choix-btn').forEach((b, i) => {
      b.disabled = true;
      if (choix[i] === q.nom) b.classList.add('juste');
      else if (i === iChoisi) b.classList.add('faux');
    });

    session.resultats.push(juste);
    vue.querySelectorAll('.borne')[session.index].className = `borne ${juste ? 'juste' : 'faux'}`;
    noterReponse('reco', q.id, juste);
    let gain = 0;
    if (juste) {
      session.score++;
      gain = diff.xp;
      session.xp += gain;
      annoncerMontee(gagnerXP(gain));
    }

    const lecon = `<div class="lecon"><p class="lecon-titre">Explication</p><p>${esc(typo(q.explication))}</p></div>`;
    const ficheTechnique = `
      <dl class="fiche-technique">
        <dt>Repérage</dt><dd>${esc(typo(q.reperage))}</dd>
        <dt>Sur le terrain</dt><dd>${esc(typo(q.role))}</dd>
      </dl>`;
    const pourquoiPas = q.pourquoiPas?.[choisi];

    const derniere = session.index === session.questions.length - 1;
    const zone = vue.querySelector('#explication');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        ${juste
          ? `<p class="verdict"><span class="tampon">Juste.</span><span class="gain">+${gain} XP</span></p>
             ${ficheTechnique}
             <details class="approfondir"><summary>Pourquoi c'est ça</summary>${lecon}</details>`
          : `<p class="verdict"><span class="tampon">Pas encore.</span></p>
             <p class="attendu">Il fallait reconnaître : <strong>${esc(typo(q.nom))}</strong>.</p>
             ${pourquoiPas ? `<div class="diagnostic"><p class="lecon-titre">Pourquoi pas « ${esc(typo(choisi))} »</p><p>${esc(typo(pourquoiPas))}</p></div>` : ''}
             ${lecon}
             ${ficheTechnique}`}
        ${q.verifie ? '' : '<p class="note-marge">Contenu à vérifier avec ton cours.</p>'}
        <div class="action-collee"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le rapport' : 'Question suivante'}</button></div>
      </section>`;
    zone.querySelector('#suivant').addEventListener('click', suivant);
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const suivant = () => {
    session.index++;
    if (session.index < session.questions.length) return afficherQuestion();

    if (session.score === session.questions.length) {
      session.xp += BAREME.sessionParfaite;
      annoncerMontee(gagnerXP(BAREME.sessionParfaite));
    }
    noterSession('reco', session.score, niveau);
    const suivantNiveau = DIFFICULTES.find(d => d.n === niveau + 1);
    afficherBilan(vue, {
      score: session.score,
      xpGagne: session.xp,
      onRejouer: () => renderReco({ vue, definirTitre, params }),
      suite: session.score >= 8 && suivantNiveau ? { href: `#/dojo/reco?n=${suivantNiveau.n}`, libelle: `Passer au niveau ${suivantNiveau.romain}` } : null
    });
  };

  afficherQuestion();
}
