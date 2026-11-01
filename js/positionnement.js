// Test de positionnement : 10 questions de reconnaissance (3 de niveau I, 4 de niveau II, 3 de niveau III),
// sans XP. Il valide d'office les niveaux maîtrisés : leurs mentions « Conseillé après… » disparaissent et le
// parcours « Ta prochaine séance » saute les étapes correspondantes.

import * as stockage from './storage.js';
import { chargerQuestions } from './quiz.js';
import { enteteSession } from './entrainement.js';
import { etiquetteNiveau } from './difficulte.js';
import { typo } from './mise-en-page.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';
import { COMPOSITION, REQUIS, niveauValide } from './parcours.js';

const NOMS = ['aucun', 'I', 'II', 'III'];

// 10 questions, en variant les domaines à chaque niveau.
function tirer(questions) {
  return [1, 2, 3].flatMap(n => {
    const vus = new Set();
    const ordre = melanger(questions.filter(q => q.niveau === n));
    const varie = [...ordre.filter(q => !vus.has(q.domaines[0]) && vus.add(q.domaines[0])), ...ordre];
    return [...new Set(varie)].slice(0, COMPOSITION[n]);
  });
}

export async function renderPositionnement({ vue, definirTitre }) {
  definirTitre('Positionnement');
  const questions = tirer(await chargerQuestions());
  const partie = { index: 0, resultats: [], scores: { 1: 0, 2: 0, 3: 0 } };

  const afficher = () => {
    const q = questions[partie.index];
    const choix = melanger([q.nom, ...q.faux]);
    vue.innerHTML = `
      <p class="niveau-seance">${etiquetteNiveau(q.niveau, { long: true })}</p>
      ${enteteSession(partie.index + 1, partie.resultats.filter(Boolean).length, partie.resultats, questions.length)}
      <figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}">
        <div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div>
      </figure>
      <h2 class="question">${esc(typo(q.question))}</h2>
      <div class="choix">
        ${choix.map((c, i) => `<button class="choix-btn" type="button"><span class="choix-touche">${'ABCD'[i]}</span><span>${esc(typo(c))}</span></button>`).join('')}
      </div>
      <div id="explication"></div>`;
    vue.querySelectorAll('.choix-btn').forEach((b, i) => b.addEventListener('click', () => repondre(q, choix, i)));
    window.scrollTo(0, 0);
  };

  const repondre = (q, choix, i) => {
    const juste = choix[i] === q.nom;
    vue.querySelectorAll('.choix-btn').forEach((b, j) => {
      b.disabled = true;
      if (choix[j] === q.nom) b.classList.add('juste'); else if (j === i) b.classList.add('faux');
    });
    partie.resultats.push(juste);
    if (juste) partie.scores[q.niveau]++;
    vue.querySelectorAll('.borne')[partie.index].className = `borne ${juste ? 'juste' : 'faux'}`;
    const derniere = partie.index === questions.length - 1;
    const zone = vue.querySelector('#explication');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        <p class="verdict"><span class="tampon">${juste ? 'Juste.' : 'Noté.'}</span></p>
        ${juste ? '' : `<p class="attendu">La réponse : <strong>${esc(typo(q.nom))}</strong>. Pas d'explication pendant le test : elles t'attendent en séance.</p>`}
        <div class="action-collee"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir mon positionnement' : 'Question suivante'}</button></div>
      </section>`;
    zone.querySelector('#suivant').addEventListener('click', () => {
      partie.index++;
      if (partie.index < questions.length) afficher(); else finir();
    });
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const finir = () => {
    const score = partie.resultats.filter(Boolean).length;
    const niveau = niveauValide(partie.scores);
    stockage.modifier(e => { e.positionnement = { niveau, score, date: Date.now() }; });
    const message = niveau === 3 ? 'Tout est validé.' : niveau === 0 ? 'On part des fondations.' : `Niveau ${NOMS[niveau]} validé.`;
    vue.innerHTML = `
      <section class="bilan">
        <p class="surtitre">Test de positionnement</p>
        <p class="bilan-score">${String(score).padStart(2, '0')}<small>/10</small></p>
        <p class="bilan-message">${message}</p>
      </section>
      <ul class="stats">
        ${[1, 2, 3].map(n => `<li><span>Niveau ${NOMS[n]}</span><span class="mono">${partie.scores[n]}/${COMPOSITION[n]} ${n <= niveau ? '· validé' : `· ${REQUIS[n]} requis`}</span></li>`).join('')}
      </ul>
      <p class="discret espace">${niveau
        ? `Les niveaux validés ne portent plus la mention « Conseillé après… », et ton parcours saute ces étapes. Ce test ne rapporte pas d'XP : l'XP se gagne en séance.`
        : 'Aucun niveau validé d\'office : ton parcours commence par les fondations. Ce test ne rapporte pas d\'XP.'}</p>
      <div class="actions pousse-bas">
        <a class="btn principal" href="#/entrainement">Voir ma prochaine séance</a>
        <a class="btn" href="#/entrainement/positionnement?r=${Date.now()}">Refaire le test</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  afficher();
}

