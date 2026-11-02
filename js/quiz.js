// Mode Reconnaissance visuelle : QCM à 4 propositions sur une image (symbole ou matériel),
// par niveau de difficulté et par domaine technique. Le contenu vient de data/reconnaissance.json.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, SEANCE_MIN_BONUS, enteteSession, afficherBilan, annoncerMontee } from './entrainement.js';
import { DIFFICULTES, difficulte, etiquetteNiveau, renderChoixNiveau, lienSeance } from './difficulte.js';
import { domaine, filtrerParDomaine, pucesDomaines } from './domaines.js';
import { blocRisque, risqueComplet, ligneNorme, enSavoirPlus, resume, MOTS_POURQUOI } from './tuteur.js';
import { conseilNiveau } from './parcours.js';
import * as stockage from './storage.js';
import { deuxChiffres, typo } from './mise-en-page.js';
import { melanger } from './hasard.js';
import { aReviser } from './leitner.js';
import { zoneMemo, remplirMemo } from './memos.js';
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
  const dom = domaine(params?.get('d'))?.id ?? '';
  // Révision : les questions ratées dont la date de révision est arrivée (tous niveaux confondus).
  const revision = params?.get('revision') === '1';
  const dues = revision ? new Set(aReviser(stockage.lire(), 'reco').map(r => r.id)) : null;
  const diff = difficulte(niveau);
  const disponibles = revision ? toutes.filter(q => dues.has(q.id)) : diff ? filtrerParDomaine(toutes, dom).filter(q => q.niveau === niveau) : [];
  if (revision && !disponibles.length) { location.hash = '#/entrainement/revision'; return; }
  if (!disponibles.length) {
    renderChoixNiveau(vue, {
      mode: 'reco',
      base: '#/entrainement/reco',
      titre: 'Reconnaissance',
      sousTitre: 'Symboles IEC, matériel d\'armoire, repérages et réglages : ce que tu dois lire d\'un coup d\'œil devant l\'armoire.',
      nombre: (n, d) => filtrerParDomaine(toutes, d).filter(q => q.niveau === n).length,
      unite: 'planches',
      domaine: dom,
      conseil: (n, d) => conseilNiveau(stockage.lire(), 'reco', n, { domaine: d })
    });
    return;
  }

  const session = {
    questions: melanger(disponibles).slice(0, TAILLE_SESSION),
    index: 0,
    score: 0,
    xp: 0,
    resultats: [] // vrai / faux pour chaque question jouée (bornier)
  };

  const afficherQuestion = () => {
    const q = session.questions[session.index];
    const choix = melanger([q.nom, ...q.faux]);

    vue.innerHTML = `
      <p class="niveau-seance">${revision ? `<span class="pastille-revision">Révision</span> ${etiquetteNiveau(q.niveau)}` : etiquetteNiveau(niveau, { long: true })}${dom ? ` ${pucesDomaines([dom])}` : ''}</p>
      ${enteteSession(session.index + 1, session.score, session.resultats, session.questions.length)}
      <figure class="reco-visuel ${q.type === 'symbole' ? 'symbole' : 'materiel'}">
        <div class="planche"><img src="${esc(q.image)}" alt="Image à identifier"></div>
        <figcaption class="reco-legende">Planche ${deuxChiffres(session.index + 1)} · ${LEGENDES[q.type] ?? ''}</figcaption>
        <p class="reco-domaines">${pucesDomaines(q.domaines)}</p>
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
      gain = difficulte(q.niveau).xp;
      session.xp += gain;
      annoncerMontee(gagnerXP(gain));
    }

    const lecon = `<div class="lecon"><p class="lecon-titre">Explication</p><p>${esc(typo(q.explication))}</p></div>`;
    const ficheTechnique = `
      <dl class="fiche-technique">
        <dt>Repérage</dt><dd>${esc(typo(q.reperage))}</dd>
        <dt>Sur le terrain</dt><dd>${esc(typo(q.role))}</dd>
      </dl>
      ${ligneNorme(q.norme)}`;
    const pourquoiPas = q.pourquoiPas?.[choisi];

    // Correction en deux temps : l'essentiel d'abord, le reste sous « En savoir plus ».
    const pourquoi = resume(pourquoiPas ?? q.explication, MOTS_POURQUOI);
    const blocPourquoi = texte => `<div class="diagnostic"><p class="lecon-titre">${pourquoiPas ? 'Pourquoi pas ce choix' : 'Pourquoi'}</p><p>${esc(typo(texte))}</p></div>`;

    const derniere = session.index === session.questions.length - 1;
    const zone = vue.querySelector('#explication');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        ${juste
          ? `<p class="verdict"><span class="tampon">Juste.</span><span class="gain">+${gain} XP</span></p>
             ${enSavoirPlus(`${lecon}${blocRisque(q.risque)}${ficheTechnique}`, 'Pourquoi c\'est ça, et le risque')}`
          : `<p class="verdict"><span class="tampon">Pas encore.</span></p>
             <div class="essentiel">
               <p class="attendu">Il fallait reconnaître : <strong>${esc(typo(q.nom))}</strong>.</p>
               ${blocPourquoi(pourquoi.court)}
               ${blocRisque(q.risque, { court: true })}
             </div>
             ${zoneMemo('reco', q.id)}
             ${enSavoirPlus(`${pourquoi.complet || !pourquoiPas ? '' : blocPourquoi(pourquoiPas)}${lecon}${risqueComplet(q.risque)}${ficheTechnique}`)}`}
        <div class="action-collee"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le rapport' : 'Question suivante'}</button></div>
      </section>`;
    remplirMemo(zone.querySelector('.zone-memo'));
    zone.querySelector('#suivant').addEventListener('click', suivant);
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const suivant = () => {
    session.index++;
    if (session.index < session.questions.length) return afficherQuestion();

    const total = session.questions.length;
    if (session.score === total && total >= SEANCE_MIN_BONUS) {
      session.xp += BAREME.sessionParfaite;
      annoncerMontee(gagnerXP(BAREME.sessionParfaite));
    }
    noterSession('reco', session.score, dom || revision ? undefined : niveau); // records par niveau : séances « tous domaines » seulement
    const suivantNiveau = revision ? null : DIFFICULTES.find(d => d.n === niveau + 1 && filtrerParDomaine(toutes, dom).some(q => q.niveau === d.n));
    afficherBilan(vue, {
      score: session.score,
      total,
      xpGagne: session.xp,
      onRejouer: () => renderReco({ vue, definirTitre, params }),
      suite: revision ? { href: '#/entrainement/revision', libelle: 'Retour à « À réviser »' } : session.score >= Math.ceil(total * 0.8) && suivantNiveau ? { href: lienSeance('#/entrainement/reco', suivantNiveau.n, dom), libelle: `Passer au niveau ${suivantNiveau.romain}` } : null
    });
  };

  afficherQuestion();
}
