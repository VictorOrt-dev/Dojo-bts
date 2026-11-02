// Révision des erreurs : répétition espacée en 5 boîtes (Leitner).
//
// Toute réponse fausse (question, calcul, cas de panne pas sans faute, panne du banc avec alerte de sécurité) place
// l'élément en boîte 1, à revoir tout de suite. Chaque réussite le fait monter d'une boîte et repousse sa prochaine
// révision (0, 1, 3, 7 puis 15 jours) ; réussi en boîte 5, il sort de la révision. Une erreur le renvoie en boîte 1.
// La logique pure est dans leitner.js (vérifiée par tests/unitaires.mjs) ; ce fichier affiche l'écran « À réviser ».

import * as stockage from './storage.js';
import { chargerQuestions } from './quiz.js';
import { chargerPannes } from './panne.js';
import { GENERATEURS } from './calcul.js';
import { chargerScenarios } from './isolement.js';
import { chargerBanc } from './banc.js';
import { CIRCUITS } from './banc-profils.js';
import { frontispice, titreSection } from './mise-en-page.js';
import { etiquetteNiveau } from './difficulte.js';
import { typo } from './mise-en-page.js';
import { esc } from './util.js';

import { BOITES, MODES_REVISION, enRevision } from './leitner.js';

const JOUR = 24 * 60 * 60 * 1000;

// ---------- Écran « À réviser » ----------

const NOMS = { reco: 'Reconnaissance', calcul: 'Calculs', panne: 'Cas de panne', banc: 'Banc de mesure', isolement: 'Mesure d\'isolement' };

function quand(revoir, maintenant) {
  const jours = Math.ceil((revoir - maintenant) / JOUR);
  return jours <= 0 ? 'maintenant' : jours === 1 ? 'demain' : `dans ${jours} jours`;
}

export async function renderRevision({ vue, definirTitre }) {
  definirTitre('À réviser');
  const [questions, cas, bancs, iso] = await Promise.all([
    chargerQuestions(), chargerPannes(), Promise.all(CIRCUITS.map(c => chargerBanc(c.id))), chargerScenarios()
  ]);
  const banc = { pannes: bancs.flatMap(b => b.pannes) };
  const maintenant = Date.now();
  const tout = enRevision(stockage.lire(), maintenant);
  const titre = r => r.mode === 'reco' ? questions.find(q => q.id === r.id)?.question
    : r.mode === 'calcul' ? GENERATEURS.find(g => g.id === r.id)?.titre
      : r.mode === 'panne' ? cas.find(c => c.id === r.id)?.titre
        : r.mode === 'isolement' ? iso.find(x => x.id === r.id)?.titre : banc.pannes.find(p => p.id === r.id)?.symptome;
  const niveau = r => r.mode === 'reco' ? questions.find(q => q.id === r.id)?.niveau
    : r.mode === 'calcul' ? GENERATEURS.find(g => g.id === r.id)?.niveau
      : r.mode === 'panne' ? cas.find(c => c.id === r.id)?.niveau
        : r.mode === 'isolement' ? iso.find(x => x.id === r.id)?.niveau : banc.pannes.find(p => p.id === r.id)?.niveau;
  const lien = r => r.mode === 'panne' ? `#/entrainement/panne?c=${encodeURIComponent(r.id)}`
    : r.mode === 'banc' ? `#/entrainement/banc?panne=${encodeURIComponent(r.id)}`
      : r.mode === 'isolement' ? `#/entrainement/isolement?s=${encodeURIComponent(r.id)}` : null;
  const existants = tout.filter(r => titre(r));
  const dus = existants.filter(r => r.du);
  const lancer = mode => {
    const n = dus.filter(r => r.mode === mode).length;
    return n ? `<a class="btn principal" href="#/entrainement/${mode}?revision=1">Réviser ${n} ${mode === 'reco' ? `question${n > 1 ? 's' : ''}` : `calcul${n > 1 ? 's' : ''}`}</a>` : '';
  };
  const ligne = r => {
    const href = lien(r);
    const contenu = `<span class="revision-titre">${esc(typo(titre(r)))}</span>
      <span class="revision-meta">${etiquetteNiveau(niveau(r))} · boîte ${r.boite}/${BOITES} · ${quand(r.revoir, maintenant)}</span>`;
    return href && r.du ? `<li><a class="ligne-revision du" href="${href}">${contenu}</a></li>` : `<li class="ligne-revision${r.du ? ' du' : ''}">${contenu}</li>`;
  };

  vue.innerHTML = `
    ${frontispice({ surtitre: 'Carnet', titre: 'À', italique: 'réviser', chapo: 'Chaque erreur revient ici, puis s\'espace à chaque réussite : tout de suite, le lendemain, à 3, 7 puis 15 jours. Les erreurs de sécurité y reviennent comme les autres, jusqu\'à ce qu\'elles soient acquises.' })}
    ${existants.length ? '' : '<p class="vide-revision">Rien à réviser : aucune erreur enregistrée pour l\'instant. Elles viendront s\'ajouter ici d\'elles-mêmes.</p>'}
    ${MODES_REVISION.map(mode => {
      const liste = existants.filter(r => r.mode === mode);
      if (!liste.length) return '';
      const n = liste.filter(r => r.du).length;
      return `<section class="bloc-revision" data-mode="${mode}">
        ${titreSection(String(MODES_REVISION.indexOf(mode) + 1).padStart(2, '0'), `${NOMS[mode]} · ${n} à revoir maintenant`)}
        <ul class="liste-revision">${liste.map(ligne).join('')}</ul>
        ${['reco', 'calcul'].includes(mode) ? `<div class="actions">${lancer(mode)}</div>` : ''}
      </section>`;
    }).join('')}
    <div class="actions pousse-bas"><a class="btn" href="#/profil">Retour au Carnet</a></div>`;
}
