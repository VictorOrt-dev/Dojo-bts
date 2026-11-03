// Accueil d'Elec learning, simulateur de terrain de l'électricien (écran Entraînement)
// + éléments partagés par les modes d'entraînement.

import { NIVEAUX, BAREME, lireXP, niveauPour, statsMode } from './xp.js';
import { plaqueOperateur, bornier, salutation } from './atelier.js';
import { deuxChiffres } from './mise-en-page.js';
import { DIFFICULTES } from './difficulte.js';
import { esc } from './util.js';
import { DOMAINES, puceDomaine } from './domaines.js';
import * as stockage from './storage.js';
import { prochaineSeance, ordreModes, conseilBanc } from './parcours.js';
import { aReviser } from './leitner.js';
import { recommandation } from './guidage.js';
import { indicateurSerie, verifierBadges, vibrer } from './insignes.js';
import { BLOCS } from './blocs.js';
import { chargerPannes } from './panne.js';

export const TAILLE_SESSION = 10;
export const SEANCE_MIN_BONUS = 5; // bonus « sans faute » : seulement pour une séance d'au moins 5 questions
export { deuxChiffres };

// Plaque signalétique de l'opérateur (rang, XP, galvanomètre).
export function carteNiveau() {
  const xp = lireXP();
  const sessions = ['reco', 'calcul', 'panne', 'banc', 'isolement', 'examen'].reduce((total, mode) => total + statsMode(mode).sessions, 0);
  return plaqueOperateur({ xp, n: niveauPour(xp), total: NIVEAUX.length, sessions });
}

// Nombre de cas de panne réussis sans faute.
function casSansFaute() {
  const reussis = Object.values(statsMode('panne').elements).filter(e => e.reussites > 0).length;
  return reussis ? `${reussis} sans faute` : '';
}

// Nombre de pannes différentes réparées au banc sans alerte de sécurité (indices compris).
function bancsReussis() {
  const n = Object.values(statsMode('banc').elements).filter(e => e.reussites > 0).length;
  return n ? `${n} réparée${n > 1 ? 's' : ''}` : '';
}

function mesuresReussies() {
  const n = Object.values(statsMode('isolement').elements).filter(e => e.reussites > 0).length;
  return n ? `${n} réussie${n > 1 ? 's' : ''}` : '';
}

function recordExamen() {
  const s = statsMode('examen');
  return s.sessions ? `${deuxChiffres(s.meilleurScore)}/15` : '';
}

function record(mode) {
  const s = statsMode(mode);
  return s.sessions ? `${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION}` : '';
}

// Les 6 modes de l'accueil ; leur ordre dépend du profil (voir parcours.ordreModes).
const MODES = {
  banc: { titre: 'Banc de mesure', desc: 'Panne cachée sur 3 circuits : départ moteur direct, étoile-triangle, éclairage par télérupteur · multimètre, LoZ, pince, consignation', record: () => bancsReussis() },
  panne: { titre: 'Cas de panne', desc: 'Interventions pas à pas, de la VAT au poste HTA · par domaine', record: () => casSansFaute() },
  calcul: { titre: 'Calculs flash', desc: 'La valeur à lire avant de mesurer · par domaine et par niveau', record: () => record('calcul') },
  reco: { titre: 'Reconnaissance', desc: 'Symboles IEC, matériel, repérages · par domaine et par niveau', record: () => record('reco') },
  isolement: { titre: 'Mesure d\'isolement', desc: 'Mégohmmètre 250 / 500 / 1 000 V DC · lecture à 1 min, indice de polarisation', record: () => mesuresReussies() },
  examen: { titre: 'Bilan · Examen blanc', desc: '15 questions et calculs tirés au sort, 15 minutes, sans aide ni correction avant la fin · bilan par compétence', record: () => recordExamen() }
};

// Encart « Prochaine étape » : l'action prioritaire de l'accueil, choisie par guidage.js d'après les réponses
// enregistrées (lacune par domaine, niveau à franchir, ou suite du parcours). p : parcours ; r : recommandation.
function carteProchaine(p, r) {
  const progression = Math.round(p.fait / p.total * 100);
  const diagnostic = DOMAINES.filter(d => r.bilan[d.id].essais)
    .map(d => { const b = r.bilan[d.id]; const ok = Math.round(100 * b.reussites / b.essais); return `<span class="diag-domaine${d.id === r.domaine ? ' faible' : ''}">${esc(d.code)} ${ok} %</span>`; });
  return `
    <a class="prochaine prochaine-${r.type}" href="${r.href}" data-type="${r.type}">
      <span class="prochaine-surtitre">${esc(r.surtitre)}</span>
      <span class="prochaine-titre">${esc(r.titre)}</span>
      <span class="prochaine-desc">${esc(r.desc)}</span>
      ${diagnostic.length ? `<span class="prochaine-diagnostic" aria-label="Réussite par domaine">${diagnostic.join('')}</span>` : ''}
      <span class="prochaine-etape"><span>${esc(p.etape)}</span><span class="prochaine-jauge" aria-hidden="true"><span style="width: ${progression}%"></span></span></span>
      <span class="prochaine-go" aria-hidden="true">${esc(r.action)} →</span>
    </a>`;
}

export async function renderEntrainement({ vue, definirTitre }) {
  definirTitre('Entraînement');
  const { mot, jour } = salutation();
  const n = niveauPour(lireXP());
  const etat = stockage.lire();
  const cas = await chargerPannes().catch(() => []);
  const prochaine = prochaineSeance(etat, cas);
  // Catalogue du contenu (domaine et niveau de chaque élément) pour le diagnostic par domaine.
  const [questions, generateurs] = await Promise.all([
    import('./quiz.js').then(m => m.chargerQuestions()).catch(() => []),
    import('./calcul.js').then(m => m.GENERATEURS).catch(() => [])
  ]);
  const reduire = l => l.map(e => ({ id: e.id, niveau: e.niveau, domaines: e.domaines }));
  verifierBadges();   // un état importé ou ancien peut déjà mériter des insignes
  const reco = recommandation(etat, { reco: reduire(questions), calcul: reduire(generateurs), panne: reduire(cas) }, prochaine, cas);
  const conseilDuBanc = conseilBanc(etat, cas);
  vue.innerHTML = `
    <header class="salut">
      <p class="salut-date">${esc(jour)}</p>
      ${indicateurSerie(etat)}
      <h2 class="salut-titre">${mot}, <em>${esc(n.nom.toLowerCase())}.</em></h2>
      <p class="devise">Simulateur de terrain de l'électricien</p>
      <p class="devise-sous">Conçu et éprouvé selon la réalité des armoires industrielles et la rigueur des normes en vigueur.</p>
    </header>

    ${carteProchaine(prochaine, reco)}
    ${(n => n ? `<a class="rappel-revision" href="#/entrainement/revision"><strong>À réviser :</strong> ${n} erreur${n > 1 ? 's' : ''} à revoir aujourd'hui →</a>` : '')(aReviser(etat).length)}

    ${carteNiveau()}

    <nav class="modes pousse-bas" aria-label="Modes d'entraînement">
      ${ordreModes(etat.profil).map((id, i) => `
      <a class="mode mode-${id}" href="#/entrainement/${id}">
        <span class="mode-bouton">${'ABCDEF'[i]}</span>
        <span><span class="mode-titre">${MODES[id].titre}</span><span class="mode-desc">${MODES[id].desc}</span>${id === 'banc' && conseilDuBanc ? `<span class="conseil">${esc(conseilDuBanc)}</span>` : ''}</span>
        <span class="mode-record">${MODES[id].record()}</span>
      </a>`).join('')}
    </nav>

    <section class="blocs-parcours" aria-label="Le parcours en 3 blocs">
      <h3 class="blocs-titre">Le parcours en 3 blocs</h3>
      ${BLOCS.map((b, i) => `
        <nav class="bloc" aria-label="${esc(b.titre)}" data-bloc="${b.id}">
          <p class="bloc-entete"><span class="bloc-num">${i + 1}</span><span><strong>${esc(b.titre)}</strong><span class="bloc-desc">${esc(b.desc)}</span></span></p>
          <div class="bloc-liens">${b.liens.map(l => `<a href="${l.href}">${esc(l.libelle)}</a>`).join('')}</div>
        </nav>`).join('')}
    </section>

    <details class="notice">
      <summary>Notice · domaines techniques</summary>
      <table class="tableau">
        ${DOMAINES.map(d => `<tr><td>${puceDomaine(d.id)}<br><span class="discret petit">${esc(d.desc)}</span></td><td>${esc(d.nom)}</td></tr>`).join('')}
      </table>
      <p class="discret petit">Repères couleur : bleu foncé = commande en courant continu (NF EN 60204-1) ; brun et bleu clair = phase et neutre ; brun, noir, gris = L1, L2, L3 ; vert-jaune = PE ; rouge = danger HTA.</p>
    </details>

    <details class="notice">
      <summary>Notice · barème</summary>
      <table class="tableau">
        ${DIFFICULTES.map(d => `<tr><td>Bonne réponse · niveau ${d.romain} (${esc(d.nom.toLowerCase())})</td><td>+${d.xp} XP</td></tr>`).join('')}
        <tr><td>Séance sans faute (5 questions ou plus)</td><td>+${BAREME.sessionParfaite} XP</td></tr>
        <tr><td>Rapidité</td><td>sans effet</td></tr>
        ${NIVEAUX.map(niv => `<tr><td>${esc(niv.nom)}</td><td>${niv.seuil} XP</td></tr>`).join('')}
      </table>
    </details>`;
}

// En-tête d'une séance : numéro, score, et le bornier (une borne par question).
// total : nombre de questions de la séance (moins de 10 quand un domaine en compte peu).
export function enteteSession(numero, score, resultats = [], total = TAILLE_SESSION) {
  return `
    <div class="session-entete">
      <div class="session-chiffres"><span>Question ${deuxChiffres(numero)}/${deuxChiffres(total)}</span><span class="session-score">Score ${deuxChiffres(score)}</span></div>
      ${bornier(numero - 1, resultats, total)}
    </div>`;
}

// Rapport de fin de séance.
// suite (facultatif) : { href, libelle } pour proposer le niveau supérieur après une bonne séance.
// valide : la séance valide un niveau (8/10 sur une séance de niveau, tous domaines) → tampon « Niveau validé ».
export function afficherBilan(vue, { score, total = TAILLE_SESSION, xpGagne, onRejouer, suite = null, valide = false, rappels = null }) {
  const parfait = score === total;
  const taux = score / total;
  const message = parfait ? 'Sans faute.' : taux >= 0.7 ? 'Belle séance.' : taux >= 0.4 ? 'Ça vient, continue.' : 'Reprends les explications, puis recommence.';
  vue.innerHTML = `
    <section class="bilan">
      <p class="surtitre">Rapport de séance</p>
      <p class="bilan-score">${deuxChiffres(score)}<small>/${deuxChiffres(total)}</small></p>
      ${valide ? '<p class="tampon-valide" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Niveau validé</p>' : ''}
      <p class="bilan-message">${message}</p>
      <p class="bilan-xp">+${xpGagne} XP${parfait && total >= SEANCE_MIN_BONUS ? ' · bonus sans faute' : ''}</p>
      ${rappels ? `<p class="bilan-rappels">Dont ${rappels.total} rappel${rappels.total > 1 ? 's' : ''} d'erreurs passées : ${rappels.reussis} retrouvé${rappels.reussis > 1 ? 's' : ''}${rappels.reussis === rappels.total ? ', bien ancré' + (rappels.total > 1 ? 's' : '') : ''}.</p>` : ''}
    </section>
    ${carteNiveau()}
    <div class="actions pousse-bas">
      ${suite ? `<a class="btn principal" href="${suite.href}">${esc(suite.libelle)}</a>` : ''}
      <button id="rejouer" class="btn${suite ? '' : ' principal'}" type="button">Une autre séance de ce niveau</button>
      <a class="btn" href="#/entrainement">Retour aux exercices</a>
    </div>`;
  vue.querySelector('#rejouer').addEventListener('click', onRejouer);
  if (valide) vibrer(30);
  window.scrollTo(0, 0);
}

// Message bref, comme une étiquette qu'on vient de poser (ex. nouveau rang).
export function afficherToast(texte) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="marque-etat" aria-hidden="true"></span><span>${esc(texte)}</span>`;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function annoncerMontee(resultat) {
  if (resultat.montee) afficherToast(`Nouveau rang : ${resultat.montee.nom}`);
}
