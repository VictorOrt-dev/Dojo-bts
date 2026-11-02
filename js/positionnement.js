// Test de positionnement : 12 questions, 4 par niveau (2 de reconnaissance, 1 calcul, 1 situation de cas de panne),
// sans XP. Il valide d'office les niveaux maîtrisés, mode par mode : un calcul ne se valide que par un calcul, un cas
// de panne par une situation de panne. Les mentions « Conseillé après… » disparaissent et le parcours
// « Ta prochaine séance » saute les étapes correspondantes.

import * as stockage from './storage.js';
import { chargerQuestions } from './quiz.js';
import { chargerPannes } from './panne.js';
import { GENERATEURS } from './calcul.js';
import { enteteSession } from './entrainement.js';
import { etiquetteNiveau } from './difficulte.js';
import { typo } from './mise-en-page.js';
import { melanger, parmi } from './hasard.js';
import { esc } from './util.js';
import { COMPOSITION, PAR_NIVEAU, TOTAL_POSITIONNEMENT, REQUIS, resultatPositionnement } from './parcours.js';

const NOMS = ['aucun', 'I', 'II', 'III'];
const MODES = { reco: 'Reconnaissance', calcul: 'Calcul', panne: 'Cas de panne' };

// Valeur numérique lisible : 3 chiffres significatifs au plus, virgule française.
const chiffre = v => {
  const a = Math.abs(v);
  const decimales = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return Number(v.toFixed(decimales)).toLocaleString('fr-FR', { maximumFractionDigits: decimales });
};

// Un calcul transformé en QCM : la bonne valeur, les erreurs typiques prévues par le générateur, puis des écarts
// classiques (√3, × 2, ÷ 10…) pour compléter à 4 choix.
export function calculEnQcm(ex) {
  if (ex.choix) return { enonce: ex.enonce, choix: [...ex.choix], bonne: ex.reponse };
  const bonne = `${chiffre(ex.reponse)} ${ex.unite}`;
  const candidats = [...(ex.erreurs ?? []).map(e => e.valeur), ...melanger([Math.sqrt(3), 1 / Math.sqrt(3), 2, 0.5, 10, 0.1].map(k => ex.reponse * k))];
  const choix = [bonne];
  for (const v of candidats) {
    if (!Number.isFinite(v) || v <= 0 || Math.abs(v - ex.reponse) / ex.reponse < 0.05) continue;
    const texte = `${chiffre(v)} ${ex.unite}`;
    if (!choix.includes(texte)) choix.push(texte);
    if (choix.length === 4) break;
  }
  return { enonce: ex.enonce, choix, bonne };
}

// Questions d'un niveau : 2 reconnaissances de domaines différents, 1 calcul, 1 première étape de cas de panne.
function tirerNiveau(n, questions, cas) {
  const vus = new Set();
  const ordre = melanger(questions.filter(q => q.niveau === n));
  const reco = [...new Set([...ordre.filter(q => !vus.has(q.domaines[0]) && vus.add(q.domaines[0])), ...ordre])]
    .slice(0, COMPOSITION.reco)
    .map(q => ({ mode: 'reco', niveau: n, image: q.image, type: q.type, question: q.question, choix: [q.nom, ...q.faux], bonne: q.nom }));

  const generateur = parmi(GENERATEURS.filter(g => g.niveau === n));
  const qcm = calculEnQcm(generateur.creer());
  const calcul = { mode: 'calcul', niveau: n, titre: generateur.titre, question: qcm.enonce, choix: qcm.choix, bonne: qcm.bonne };

  // Cas de panne : hors HTA de préférence (domaine expert), première étape seulement.
  const duNiveau = cas.filter(c => c.niveau === n);
  const c = parmi(duNiveau.filter(x => !x.domaines.includes('hta')).length ? duNiveau.filter(x => !x.domaines.includes('hta')) : duNiveau);
  const etape = c.etapes[0];
  const panne = {
    mode: 'panne', niveau: n, titre: c.titre, contexte: c.contexte, situation: etape.situation, question: etape.question,
    choix: etape.choix.map(x => x.texte), bonne: etape.choix.find(x => x.verdict === 'bon').texte
  };
  return [...reco, calcul, panne];
}

let partieCourante = null;
export const positionnementEnCours = () => partieCourante;   // utilisé par les tests automatisés

export async function renderPositionnement({ vue, definirTitre }) {
  definirTitre('Positionnement');
  const [questions, cas] = await Promise.all([chargerQuestions(), chargerPannes()]);
  const liste = [1, 2, 3].flatMap(n => tirerNiveau(n, questions, cas));
  liste.forEach(q => { q.choix = melanger(q.choix); });
  const partie = partieCourante = { questions: liste, index: 0, resultats: [] };

  const afficher = () => {
    const q = liste[partie.index];
    const visuel = q.mode === 'reco'
      ? `<figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}"><div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div></figure>`
      : q.mode === 'panne'
        ? `<p class="titre-cas-test">${esc(typo(q.titre))}</p><p class="situation">${esc(typo(q.contexte))}</p><p class="situation">${esc(typo(q.situation))}</p>`
        : `<p class="titre-cas-test">${esc(typo(q.titre))}</p>`;
    vue.innerHTML = `
      <p class="niveau-seance">${etiquetteNiveau(q.niveau, { long: true })} <span class="mode-test">${MODES[q.mode]}</span></p>
      ${enteteSession(partie.index + 1, partie.resultats.filter(r => r.juste).length, partie.resultats.map(r => r.juste), liste.length)}
      ${visuel}
      <h2 class="question">${esc(typo(q.question))}</h2>
      <div class="choix">
        ${q.choix.map((c, i) => `<button class="choix-btn" type="button"><span class="choix-touche">${'ABCD'[i]}</span><span>${esc(typo(c))}</span></button>`).join('')}
      </div>
      <div id="explication"></div>`;
    vue.querySelectorAll('.choix-btn').forEach((b, i) => b.addEventListener('click', () => repondre(q, i)));
    window.scrollTo(0, 0);
  };

  const repondre = (q, i) => {
    const juste = q.choix[i] === q.bonne;
    vue.querySelectorAll('.choix-btn').forEach((b, j) => {
      b.disabled = true;
      if (q.choix[j] === q.bonne) b.classList.add('juste'); else if (j === i) b.classList.add('faux');
    });
    partie.resultats.push({ mode: q.mode, niveau: q.niveau, juste });
    vue.querySelectorAll('.borne')[partie.index].className = `borne ${juste ? 'juste' : 'faux'}`;
    const derniere = partie.index === liste.length - 1;
    const zone = vue.querySelector('#explication');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        <p class="verdict"><span class="tampon">${juste ? 'Juste.' : 'Noté.'}</span></p>
        ${juste ? '' : `<p class="attendu">La réponse : <strong>${esc(typo(q.bonne))}</strong>. Pas d'explication pendant le test : elles t'attendent en séance.</p>`}
        <div class="action-collee"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir mon positionnement' : 'Question suivante'}</button></div>
      </section>`;
    zone.querySelector('#suivant').addEventListener('click', () => {
      partie.index++;
      if (partie.index < liste.length) afficher(); else finir();
    });
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const finir = () => {
    const r = resultatPositionnement(partie.resultats);
    stockage.modifier(e => { e.positionnement = { niveau: r.niveau, score: r.score, date: Date.now(), niveaux: r.niveaux }; });
    const message = r.niveau === 3 && Object.values(r.niveaux).every(v => v === 3) ? 'Tout est validé.'
      : r.niveau === 0 ? 'On part des fondations.' : `Niveau ${NOMS[r.niveau]} atteint.`;
    const parMode = Object.entries(MODES).map(([m, nom]) =>
      `<li><span>${nom}</span><span class="mono">${r.niveaux[m] ? `niveau ${NOMS[r.niveaux[m]]} validé` : 'rien de validé d\'office'}</span></li>`).join('');
    vue.innerHTML = `
      <section class="bilan">
        <p class="surtitre">Test de positionnement</p>
        <p class="bilan-score">${String(r.score).padStart(2, '0')}<small>/${TOTAL_POSITIONNEMENT}</small></p>
        <p class="bilan-message">${message}</p>
      </section>
      <ul class="stats">
        ${[1, 2, 3].map(n => `<li><span>Niveau ${NOMS[n]}</span><span class="mono">${r.scores[n]}/${PAR_NIVEAU} ${n <= r.niveau ? '· atteint' : `· ${REQUIS[n]} requis`}</span></li>`).join('')}
      </ul>
      <p class="surtitre espace">Validé d'office, mode par mode</p>
      <ul class="stats positionnement-modes">${parMode}</ul>
      <p class="discret espace">Chaque mode n'est validé que par ses propres questions : réussir les symboles ne valide pas les calculs. ${r.niveau
        ? 'Les niveaux validés ne portent plus la mention « Conseillé après… », et ton parcours saute ces étapes.'
        : 'Ton parcours commence par les fondations.'} Ce test ne rapporte pas d'XP : l'XP se gagne en séance.</p>
      <div class="actions pousse-bas">
        <a class="btn principal" href="#/entrainement">Voir ma prochaine séance</a>
        <a class="btn" href="#/entrainement/positionnement?r=${Date.now()}">Refaire le test</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  afficher();
}
