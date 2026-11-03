// Bilan · examen blanc : 15 questions et calculs tirés au sort dans les 5 domaines, en temps limité, sans fiche mémo
// ni correction avant la fin. Le rapport donne la note, la mention et un bilan par compétence (domaine, type, niveau),
// puis le corrigé. Les réponses alimentent la révision espacée comme en séance.
// composerExamen() et bilanExamen() sont pures : tests/unitaires.mjs les vérifie sans navigateur.

import { chargerQuestions } from './quiz.js';
import { GENERATEURS } from './calcul.js';
import { calculEnQcm } from './positionnement.js';
import { gagnerXP, noterReponse, noterSession } from './xp.js';
import { annoncerMontee } from './entrainement.js';
import { DOMAINES, pucesDomaines } from './domaines.js';
import { DIFFICULTES, difficulte, etiquetteNiveau } from './difficulte.js';
import { deuxChiffres, frontispice, typo } from './mise-en-page.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';

export const TAILLE_EXAMEN = 15;
export const DUREE_EXAMEN = 15 * 60;          // secondes : une minute par question en moyenne
const PAR_DOMAINE = TAILLE_EXAMEN / DOMAINES.length;
const TOUCHES = ['A', 'B', 'C', 'D'];
const NOMS_TYPE = { reco: 'Reconnaissance', calcul: 'Calculs' };

// ---------- Logique pure ----------

// Tire 15 éléments : 3 par domaine (questions et calculs alternés), complétés au hasard si un domaine en manque,
// puis mélangés. questions : [{ id, niveau, domaines }] ; generateurs : idem.
export function composerExamen(questions, generateurs, taille = TAILLE_EXAMEN) {
  const pool = [
    ...questions.map(q => ({ mode: 'reco', id: q.id, niveau: q.niveau, domaine: q.domaines?.[0] })),
    ...generateurs.map(g => ({ mode: 'calcul', id: g.id, niveau: g.niveau, domaine: g.domaines?.[0] }))
  ];
  const choisis = [];
  for (const d of DOMAINES) {
    // Questions et calculs alternés, en commençant au hasard par l'un ou l'autre.
    const [a, b] = melanger(['reco', 'calcul']).map(m => melanger(pool.filter(e => e.domaine === d.id && e.mode === m)));
    const alternes = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) alternes.push(...[a[i], b[i]].filter(Boolean));
    choisis.push(...alternes.slice(0, PAR_DOMAINE));
  }
  const reste = melanger(pool.filter(e => !choisis.includes(e)));
  while (choisis.length < taille && reste.length) choisis.push(reste.shift());
  return melanger(choisis).slice(0, taille);
}

export const verdictTaux = taux => taux >= 2 / 3 ? 'acquis' : taux >= 1 / 3 ? 'a-consolider' : 'a-retravailler';
const LIBELLES_VERDICT = { acquis: 'Acquis', 'a-consolider': 'À consolider', 'a-retravailler': 'À retravailler' };

// reponses : [{ mode, id, niveau, domaine, juste, repondu }]. Note sur 20 arrondie au demi-point.
export function bilanExamen(reponses) {
  const total = reponses.length;
  const score = reponses.filter(r => r.juste).length;
  const grouper = cle => {
    const g = {};
    for (const r of reponses) {
      const x = (g[r[cle]] ??= { total: 0, justes: 0 });
      x.total++; if (r.juste) x.justes++;
    }
    for (const x of Object.values(g)) x.verdict = verdictTaux(x.justes / x.total);
    return g;
  };
  const taux = total ? score / total : 0;
  return {
    score, total, taux,
    sur20: Math.round(taux * 20 * 2) / 2,
    sansReponse: reponses.filter(r => !r.repondu).length,
    mention: taux >= 0.8 ? 'Prêt pour l\'examen' : taux >= 0.6 ? 'Admissible, à consolider' : 'À retravailler',
    parDomaine: grouper('domaine'),
    parType: grouper('mode'),
    parNiveau: grouper('niveau')
  };
}

export const minutes = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const nb = v => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

// ---------- Écran ----------

let examenCourant = null;
export const examenEnCours = () => examenCourant;   // utilisé par les tests automatisés

export async function renderExamen({ vue, definirTitre, params, auNettoyage }) {
  definirTitre('Examen blanc');
  const questions = await chargerQuestions();
  const duree = Number(params?.get('duree')) > 0 ? Number(params.get('duree')) : DUREE_EXAMEN;   // ?duree= : tests

  vue.innerHTML = `
    ${frontispice({ surtitre: 'Bilan', titre: 'Examen', italique: 'blanc', chapo: 'Quinze questions et calculs tirés au sort dans les cinq domaines, tous niveaux confondus. Comme le jour J : pas de fiche mémo, pas de correction avant la fin.' })}
    <ul class="stats regles-examen">
      <li><span>Questions</span><span class="mono">${TAILLE_EXAMEN} · ${PAR_DOMAINE} par domaine</span></li>
      <li><span>Temps</span><span class="mono">${minutes(duree)}</span></li>
      <li><span>Aides</span><span class="mono">aucune</span></li>
      <li><span>Correction</span><span class="mono">à la fin</span></li>
    </ul>
    <p class="discret espace">Une question passée compte comme une erreur. Au bout du temps, l'examen s'arrête et les questions restantes sont comptées sans réponse. Chaque erreur rejoint ensuite ta révision espacée.</p>
    <div class="actions pousse-bas">
      <button id="commencer-examen" class="btn principal" type="button">Commencer l'examen</button>
      <a class="btn" href="#/entrainement">Pas maintenant</a>
    </div>`;
  vue.querySelector('#commencer-examen').addEventListener('click', () => commencer({ vue, questions, duree, auNettoyage }));
}

function materialiser(e, questions) {
  if (e.mode === 'reco') {
    const q = questions.find(x => x.id === e.id);
    return { ...e, image: q.image, type: q.type, question: q.question, choix: melanger([q.nom, ...q.faux]), bonne: q.nom, domaines: q.domaines };
  }
  const g = GENERATEURS.find(x => x.id === e.id);
  const qcm = calculEnQcm(g.creer());
  return { ...e, titre: g.titre, question: qcm.enonce, choix: melanger(qcm.choix), bonne: qcm.bonne, domaines: g.domaines };
}

function commencer({ vue, questions, duree, auNettoyage }) {
  const liste = composerExamen(questions, GENERATEURS).map(e => materialiser(e, questions));
  const examen = examenCourant = { liste, index: 0, reponses: [], debut: Date.now(), duree, fini: false };
  const restant = () => Math.max(0, duree - Math.floor((Date.now() - examen.debut) / 1000));

  const horloge = setInterval(() => {
    const s = restant();
    const el = vue.querySelector('#chrono');
    if (el) { el.textContent = minutes(s); el.closest('.chrono')?.classList.toggle('presse', s <= Math.min(120, duree / 5)); }
    if (s <= 0) finir();
  }, 250);
  auNettoyage(() => clearInterval(horloge));

  const afficher = () => {
    const q = liste[examen.index];
    const visuel = q.mode === 'reco'
      ? `<figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}"><div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div></figure>`
      : `<p class="titre-cas-test">${esc(typo(q.titre))}</p>`;
    vue.innerHTML = `
      <div class="examen-entete">
        <p class="niveau-seance"><span class="pastille-examen">Examen blanc</span> ${etiquetteNiveau(q.niveau)} ${pucesDomaines(q.domaines)}</p>
        <p class="chrono" role="timer" aria-label="Temps restant"><span id="chrono">${minutes(restant())}</span></p>
      </div>
      <div class="session-entete">
        <div class="session-chiffres"><span>Question ${deuxChiffres(examen.index + 1)}/${deuxChiffres(liste.length)}</span><span>${NOMS_TYPE[q.mode]}</span></div>
        <div class="avancement-examen" aria-hidden="true"><span style="width: ${Math.round(examen.index / liste.length * 100)}%"></span></div>
      </div>
      ${visuel}
      <h2 class="question">${esc(typo(q.question))}</h2>
      <div class="choix">
        ${q.choix.map((c, i) => `<button class="choix-btn" type="button" data-i="${i}"><span class="choix-touche">${TOUCHES[i]}</span><span>${esc(typo(c))}</span></button>`).join('')}
      </div>
      <div class="actions"><button id="passer" class="btn" type="button">Passer la question</button></div>`;
    vue.querySelectorAll('.choix-btn').forEach(b => b.addEventListener('click', () => repondre(q, Number(b.dataset.i))));
    vue.querySelector('#passer').addEventListener('click', () => repondre(q, null));
    window.scrollTo(0, 0);
  };

  // Pas de verdict à l'écran : on enregistre et on passe à la suite.
  const repondre = (q, i) => {
    if (examen.fini) return;
    const choisi = i === null ? null : q.choix[i];
    examen.reponses.push({ mode: q.mode, id: q.id, niveau: q.niveau, domaine: q.domaine, repondu: i !== null, choisi, juste: choisi === q.bonne });
    examen.index++;
    if (examen.index < liste.length) afficher(); else finir();
  };

  const finir = () => {
    if (examen.fini) return;
    examen.fini = true;
    clearInterval(horloge);
    const tempsPasse = Math.min(duree, Math.round((Date.now() - examen.debut) / 1000));
    for (const q of liste.slice(examen.reponses.length)) {
      examen.reponses.push({ mode: q.mode, id: q.id, niveau: q.niveau, domaine: q.domaine, repondu: false, choisi: null, juste: false });
    }
    const b = examen.bilan = bilanExamen(examen.reponses);
    let xp = 0;
    examen.reponses.forEach(r => {
      noterReponse(r.mode, r.id, r.juste);
      if (r.juste) xp += difficulte(r.niveau).xp;
    });
    if (xp) annoncerMontee(gagnerXP(xp));
    noterSession('examen', b.score);
    rapport(b, tempsPasse, xp);
  };

  const ligneCompetence = (libelle, x, lien = '') => `
    <li class="competence ${x.verdict}">
      <span class="competence-nom">${libelle}</span>
      <span class="competence-score mono">${x.justes}/${x.total}</span>
      <span class="competence-jauge" aria-hidden="true"><span style="width: ${Math.round(x.justes / x.total * 100)}%"></span></span>
      <span class="competence-verdict">${LIBELLES_VERDICT[x.verdict]}${lien}</span>
    </li>`;

  const rapport = (b, tempsPasse, xp) => {
    const horsTemps = tempsPasse >= duree && b.sansReponse;
    // Pour un domaine à retravailler : séance ciblée sur le type et le niveau de la première erreur.
    const lienDomaine = d => {
      const x = b.parDomaine[d];
      if (!x || x.verdict === 'acquis') return '';
      const r = examen.reponses.find(y => y.domaine === d && !y.juste);
      return r ? ` · <a href="#/entrainement/${r.mode}?n=${r.niveau}&d=${d}">s'entraîner</a>` : '';
    };
    vue.innerHTML = `
      <section class="bilan bilan-examen">
        <p class="surtitre">Examen blanc · rapport</p>
        <p class="bilan-score">${deuxChiffres(b.score)}<small>/${deuxChiffres(b.total)}</small></p>
        <p class="bilan-note mono">${nb(b.sur20)}/20</p>
        <p class="bilan-message mention-${verdictTaux(b.taux)}">${b.mention}</p>
        <p class="bilan-xp">${xp ? `+${xp} XP` : 'Pas d\'XP cette fois'} · ${horsTemps ? 'temps écoulé' : `terminé en ${minutes(tempsPasse)}`}${b.sansReponse ? ` · ${b.sansReponse} sans réponse` : ''}</p>
      </section>

      <h3 class="surtitre espace">Bilan par compétence</h3>
      <ul class="competences" aria-label="Réussite par domaine">
        ${DOMAINES.filter(d => b.parDomaine[d.id]).map(d => ligneCompetence(esc(d.nom), b.parDomaine[d.id], lienDomaine(d.id))).join('')}
      </ul>
      <ul class="competences competences-types" aria-label="Réussite par type et par niveau">
        ${Object.entries(NOMS_TYPE).filter(([m]) => b.parType[m]).map(([m, nom]) => ligneCompetence(nom, b.parType[m])).join('')}
        ${DIFFICULTES.filter(d => b.parNiveau[d.n]).map(d => ligneCompetence(`Niveau ${d.romain}`, b.parNiveau[d.n])).join('')}
      </ul>

      <details class="approfondir corrige">
        <summary>Corrigé des ${b.total} questions</summary>
        <ol class="liste-corrige">
          ${liste.map((q, i) => {
            const r = examen.reponses[i];
            return `<li class="${r.juste ? 'juste' : 'faux'}">
              <p class="corrige-question">${esc(typo(q.mode === 'calcul' ? `${q.titre} — ${q.question}` : q.question))}</p>
              <p class="corrige-reponses">${r.juste ? `<strong>${esc(typo(q.bonne))}</strong> ✓` : `${r.repondu ? `Ta réponse : ${esc(typo(r.choisi))}` : 'Sans réponse'} · attendu : <strong>${esc(typo(q.bonne))}</strong>`}</p>
            </li>`;
          }).join('')}
        </ol>
      </details>
      <p class="discret espace">Les erreurs rejoignent ta révision : elles reviendront dans « À réviser », puis dans tes séances quelques jours plus tard.</p>
      <div class="actions pousse-bas">
        <a class="btn principal" href="#/entrainement/examen?r=${Date.now()}">Nouvel examen blanc</a>
        <a class="btn" href="#/entrainement/revision">Voir « À réviser »</a>
        <a class="btn" href="#/entrainement">Retour à l'accueil</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  afficher();
}
