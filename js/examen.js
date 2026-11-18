// Bilan · examen blanc : 15 questions et calculs tirés au sort dans les 5 domaines, en temps limité, sans fiche mémo
// ni correction avant la fin. Le rapport donne la note, la mention et un bilan par compétence (domaine, type, niveau),
// puis le corrigé. Les réponses alimentent la révision espacée comme en séance.
// La difficulté suit le niveau réel (compositionExamen) : un débutant tire surtout du niveau I, un peu de II, jamais de
// III ; « Examen complet » reste au choix pour tous.
// composerExamen(), compositionExamen() et bilanExamen() sont pures : tests/unitaires.mjs les vérifie sans navigateur.

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
import { legendeCouleurs } from './couleurs.js';
import * as reprise from './reprise.js';
import * as stockage from './storage.js';
import { niveauAcquis } from './parcours.js';

export const TAILLE_EXAMEN = 15;
export const DUREE_EXAMEN = 15 * 60;          // secondes : une minute par question en moyenne
const PAR_DOMAINE = TAILLE_EXAMEN / DOMAINES.length;
const TOUCHES = ['A', 'B', 'C', 'D'];
const NOMS_TYPE = { reco: 'Reconnaissance', calcul: 'Calculs' };

// ---------- Logique pure ----------

// Répartition des niveaux selon le niveau atteint (0 : rien de validé … 3 : tout validé).
export const QUOTAS = {
  0: { 1: 10, 2: 5 },
  1: { 1: 5, 2: 7, 3: 3 },
  2: { 1: 3, 2: 6, 3: 6 },
  3: { 1: 5, 2: 5, 3: 5 }
};

// Niveau atteint : le plus haut niveau validé à la fois en reconnaissance et en calculs (séance ou positionnement).
// Un profil « confirmé » commence au moins au niveau II.
export function compositionExamen(etat, { complet = false } = {}) {
  let niveau = 0;
  for (const n of [1, 2, 3]) { if (['reco', 'calcul'].every(m => niveauAcquis(etat, m, n))) niveau = n; else break; }
  niveau = Math.max(niveau, etat.positionnement?.niveau ?? 0, etat.profil === 'confirme' ? 2 : 0);
  return { niveau, complet, quotas: QUOTAS[complet ? 3 : niveau] };
}

// Tire 15 éléments : 3 par domaine (questions et calculs alternés), complétés au hasard si un domaine en manque,
// puis mélangés. quotas ({ niveau: nombre }) : seuls ces niveaux sont tirés, au plus près de la répartition voulue.
// questions : [{ id, niveau, domaines }] ; generateurs : idem.
export function composerExamen(questions, generateurs, { taille = TAILLE_EXAMEN, quotas = null } = {}) {
  const reste = quotas ? { ...quotas } : null;
  const pool = [
    ...questions.map(q => ({ mode: 'reco', id: q.id, niveau: q.niveau, domaine: q.domaines?.[0] })),
    ...generateurs.map(g => ({ mode: 'calcul', id: g.id, niveau: g.niveau, domaine: g.domaines?.[0] }))
  ].filter(e => !reste || reste[e.niveau] !== undefined);
  const besoin = e => (reste ? reste[e.niveau] : 1);
  // Parmi des candidats, celui dont le niveau manque le plus (au hasard à égalité).
  const meilleur = liste => melanger(liste).sort((x, y) => besoin(y) - besoin(x))[0];
  const prendre = e => { choisis.push(e); if (reste) reste[e.niveau]--; };
  const choisis = [];
  for (const d of melanger(DOMAINES)) {
    // Questions et calculs alternés, en commençant au hasard par l'un ou l'autre.
    const ordre = melanger(['reco', 'calcul']);
    for (let k = 0; k < PAR_DOMAINE; k++) {
      const libres = pool.filter(e => e.domaine === d.id && !choisis.includes(e) && besoin(e) > 0);
      const duMode = libres.filter(e => e.mode === ordre[k % 2]);
      const e = meilleur(duMode.length ? duMode : libres);
      if (e) prendre(e);
    }
  }
  while (choisis.length < taille) {
    const libres = pool.filter(e => !choisis.includes(e));
    if (!libres.length) break;
    prendre(meilleur(libres.filter(e => besoin(e) > 0).length ? libres.filter(e => besoin(e) > 0) : libres));
  }
  return melanger(choisis).slice(0, taille);
}

export const verdictTaux = taux => taux >= 2 / 3 ? 'acquis' : taux >= 1 / 3 ? 'a-consolider' : 'a-retravailler';
const LIBELLES_VERDICT = { acquis: 'Acquis', 'a-consolider': 'À consolider', 'a-retravailler': 'À retravailler' };

// reponses : [{ mode, id, niveau, domaine, juste, repondu }]. Note sur 20 arrondie au demi-point.
export function bilanExamen(reponses) {
  const total = reponses.length;
  const score = reponses.filter(r => r.juste).length;
  // Une question non traitée (temps écoulé) vaut 0 dans la note, mais ne juge aucune compétence : on ne l'a pas vue.
  const vues = reponses.filter(r => r.repondu || r.passe);
  const grouper = cle => {
    const g = {};
    for (const r of vues) {
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
    passees: reponses.filter(r => r.passe).length,
    nonTraitees: reponses.filter(r => !r.repondu && !r.passe).length,
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
  const compo = compositionExamen(stockage.lire(), { complet: params?.get('complet') === '1' });
  const enCours = reprise.lire('examen');
  if (enCours && params?.get('reprendre') === '1') return commencer({ vue, questions, duree: enCours.duree, auNettoyage, etat: enCours });
  const repartition = Object.entries(compo.quotas).filter(([, n]) => n).map(([niv, n]) => `${n} de niveau ${DIFFICULTES.find(d => d.n === Number(niv)).romain}`).join(', ');

  vue.innerHTML = `
    ${frontispice({ surtitre: 'Bilan', titre: 'Examen', italique: 'blanc', chapo: 'Quinze questions et calculs tirés au sort dans les cinq domaines. Comme le jour J : pas de fiche mémo, pas de correction avant la fin.' })}
    <div class="composition-examen">
      <p><strong>${compo.complet ? 'Examen complet, tous niveaux' : 'Calibré sur ton niveau'}</strong> : ${repartition}.</p>
      <p class="discret">${compo.complet ? 'Le niveau III compte pour un tiers : c\'est l\'épreuve des confirmés.' : compo.niveau === 0 ? 'Rien de validé pour l\'instant : surtout des bases, un peu de pratique courante, aucun cas complexe.' : `Niveau ${DIFFICULTES.find(d => d.n === compo.niveau).romain} validé : la difficulté monte d'un cran.`}</p>
      <a class="lien-composition" href="#/entrainement/examen${compo.complet ? '' : '?complet=1'}">${compo.complet ? 'Revenir à l\'examen calibré' : 'Passer à l\'examen complet (tous niveaux)'}</a>
    </div>
    <ul class="stats regles-examen">
      <li><span>Questions</span><span class="mono">${TAILLE_EXAMEN} · ${PAR_DOMAINE} par domaine</span></li>
      <li><span>Temps</span><span class="mono">${minutes(duree)}</span></li>
      <li><span>Aides</span><span class="mono">aucune</span></li>
      <li><span>Correction</span><span class="mono">à la fin</span></li>
    </ul>
    <p class="discret espace">Une question passée compte comme une erreur et rejoint ta révision. Si le temps s'écoule, les questions restantes valent 0, sans être comptées comme des erreurs. Le chrono s'arrête quand tu quittes l'écran ou l'appli : tu reprendras là où tu en étais.</p>
    ${enCours ? `<div class="bandeau-reprise" role="status">
      <p><strong>Examen en cours</strong> · question ${enCours.resultats.length + 1} sur ${enCours.total}, ${minutes(Math.max(0, enCours.duree - enCours.ecoule))} restantes.</p>
      <button id="reprendre-examen" class="btn principal" type="button">Reprendre l'examen</button>
    </div>` : ''}
    <div class="actions pousse-bas">
      <button id="commencer-examen" class="btn${enCours ? '' : ' principal'}" type="button">${enCours ? 'Commencer un nouvel examen' : 'Commencer l\'examen'}</button>
      <a class="btn" href="#/entrainement">Pas maintenant</a>
    </div>`;
  vue.querySelector('#commencer-examen').addEventListener('click', () => { reprise.effacer('examen'); commencer({ vue, questions, duree, auNettoyage, quotas: compo.quotas }); });
  vue.querySelector('#reprendre-examen')?.addEventListener('click', () => commencer({ vue, questions, duree: enCours.duree, auNettoyage, etat: enCours }));
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

function commencer({ vue, questions, duree, auNettoyage, quotas, etat = null }) {
  const liste = etat ? etat.liste : composerExamen(questions, GENERATEURS, { quotas }).map(e => materialiser(e, questions));
  const reponses = etat ? [...etat.resultats] : [];
  const examen = examenCourant = { liste, index: reponses.length, reponses, ecoule: etat?.ecoule ?? 0, repere: Date.now(), duree, fini: false };
  // Le chrono ne compte que pendant que l'examen est à l'écran : quitter l'écran ou l'appli le met en pause.
  const ecouleMaintenant = () => examen.ecoule + (examen.repere ? (Date.now() - examen.repere) / 1000 : 0);
  const restant = () => Math.max(0, duree - Math.floor(ecouleMaintenant()));
  const pause = () => { if (examen.repere) { examen.ecoule = ecouleMaintenant(); examen.repere = null; } };
  const relancer = () => { if (!examen.repere && !examen.fini) examen.repere = Date.now(); };
  const sauver = () => {
    if (examen.fini || !examen.reponses.length) return;
    reprise.enregistrer('examen', {
      cle: 'examen', href: `#/entrainement/examen?reprendre=1`, libelle: 'Examen blanc', total: liste.length,
      resultats: examen.reponses, score: examen.reponses.filter(r => r.juste).length, liste, ecoule: Math.floor(ecouleMaintenant()), duree
    });
  };
  const visibilite = () => { if (document.hidden) { pause(); sauver(); } else relancer(); };
  document.addEventListener('visibilitychange', visibilite);

  const horloge = setInterval(() => {
    const s = restant();
    const el = vue.querySelector('#chrono');
    if (el) { el.textContent = minutes(s); el.closest('.chrono')?.classList.toggle('presse', s <= Math.min(120, duree / 5)); }
    if (s <= 0) finir();
  }, 250);
  auNettoyage(() => { clearInterval(horloge); document.removeEventListener('visibilitychange', visibilite); pause(); sauver(); });

  const afficher = () => {
    const q = liste[examen.index];
    const visuel = q.mode === 'reco'
      ? `<figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}"><div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div>${legendeCouleurs(q.image)}</figure>`
      : `<p class="titre-cas-test">${esc(typo(q.titre))}</p>`;
    vue.innerHTML = `
      <div class="examen-entete" data-sans-lexique>
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
    examen.reponses.push({ mode: q.mode, id: q.id, niveau: q.niveau, domaine: q.domaine, repondu: i !== null, passe: i === null, choisi, juste: choisi === q.bonne });
    examen.index++;
    sauver();
    if (examen.index < liste.length) afficher(); else finir();
  };

  const finir = () => {
    if (examen.fini) return;
    examen.fini = true;
    clearInterval(horloge);
    document.removeEventListener('visibilitychange', visibilite);
    reprise.effacer('examen');
    const tempsPasse = Math.min(duree, Math.round(ecouleMaintenant()));
    // Temps écoulé : les questions jamais vues valent 0, mais ne sont pas des erreurs (ni révision, ni statistiques).
    for (const q of liste.slice(examen.reponses.length)) {
      examen.reponses.push({ mode: q.mode, id: q.id, niveau: q.niveau, domaine: q.domaine, repondu: false, passe: false, choisi: null, juste: false });
    }
    const b = examen.bilan = bilanExamen(examen.reponses);
    let xp = 0;
    examen.reponses.filter(r => r.repondu || r.passe).forEach(r => {
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
    const horsTemps = tempsPasse >= duree && b.nonTraitees;
    const nonEvalues = DOMAINES.filter(d => !b.parDomaine[d.id]);
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
        <p class="bilan-xp">${xp ? `+${xp} XP` : 'Pas d\'XP cette fois'} · ${horsTemps ? 'temps écoulé' : `terminé en ${minutes(tempsPasse)}`}${b.passees ? ` · ${b.passees} passée${b.passees > 1 ? 's' : ''}` : ''}${b.nonTraitees ? ` · ${b.nonTraitees} non traitée${b.nonTraitees > 1 ? 's' : ''}` : ''}</p>
      </section>

      <h3 class="surtitre espace">Bilan par compétence</h3>
      <ul class="competences" aria-label="Réussite par domaine">
        ${DOMAINES.filter(d => b.parDomaine[d.id]).map(d => ligneCompetence(esc(d.nom), b.parDomaine[d.id], lienDomaine(d.id))).join('')}
      </ul>
      ${nonEvalues.length ? `<p class="discret">Pas évalué, faute de temps : ${nonEvalues.map(d => esc(d.nom)).join(', ')}.</p>` : ''}
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
              <p class="corrige-reponses">${r.juste ? `<strong>${esc(typo(q.bonne))}</strong> ✓` : `${r.repondu ? `Ta réponse : ${esc(typo(r.choisi))}` : r.passe ? 'Passée' : 'Non traitée (temps écoulé)'} · attendu : <strong>${esc(typo(q.bonne))}</strong>`}</p>
            </li>`;
          }).join('')}
        </ol>
      </details>
      <p class="discret espace">Les erreurs et les questions passées rejoignent ta révision : elles reviendront dans « À réviser », puis dans tes séances quelques jours plus tard.${b.nonTraitees ? ` Les ${b.nonTraitees > 1 ? `${b.nonTraitees} questions non traitées ne comptent` : 'question non traitée ne compte'} pas comme des erreurs.` : ''}</p>
      <div class="actions pousse-bas">
        <a class="btn principal" href="#/entrainement/examen?r=${Date.now()}">Nouvel examen blanc</a>
        <a class="btn" href="#/entrainement/revision">Voir « À réviser »</a>
        <a class="btn" href="#/entrainement">Retour à l'accueil</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  afficher();
}
