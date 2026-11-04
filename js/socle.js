// Le socle : les 4 piliers à comprendre avant tout le reste (tension, courant, résistance, phase / neutre / terre),
// chacun avec une manipulation, puis un mini-quiz de 3 questions corrigé sur-le-champ, sans pénalité.
// Proposé au grand débutant juste après le premier lancement ; toujours accessible ensuite (#/entrainement/socle).
// Les données et courant() sont pures : tests/unitaires.mjs les vérifie sans navigateur.
// Les réponses du quiz rejoignent la révision espacée (une erreur revient plus tard), sans XP ni « Pas encore ».

import * as stockage from './storage.js';
import { noterReponse } from './xp.js';
import { frontispice, typo } from './mise-en-page.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';

const nb = (v, d = 2) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });

// Loi d'Ohm : I = U / R (U en volts, R en ohms, I en ampères).
export const courant = (U, R) => U / R;

// Pilier 1 : des tensions de tous les jours, de la pile au poste HTA.
export const SOURCES = [
  { id: 'pile', nom: 'Pile', tension: 1.5, verdict: 'Sans danger au toucher.', niveau: 'ok' },
  { id: 'batterie', nom: 'Batterie de voiture', tension: 12, verdict: 'Très basse tension (TBT) : sans danger au toucher en milieu sec, mais un court-circuit brûle.', niveau: 'ok' },
  { id: 'prise', nom: 'Prise de courant', tension: 230, verdict: 'Mortel : on ne touche jamais sans couper et vérifier l\'absence de tension.', niveau: 'danger' },
  { id: 'hta', nom: 'Ligne d\'un poste HTA', tension: 20000, verdict: 'L\'arc peut jaillir avant même le contact : on reste à distance, seul un habilité HTA approche.', niveau: 'danger' }
];

// Pilier 4 : les trois conducteurs, couleurs en toutes lettres (daltonisme).
export const CONDUCTEURS = [
  { id: 'phase', nom: 'Phase', couleurs: 'Marron (BN), noir (BK) ou gris (GY)', role: 'Elle amène la tension : 230 V par rapport à la terre.', danger: 'Dangereuse au toucher, toujours.', classe: 'phase' },
  { id: 'neutre', nom: 'Neutre', couleurs: 'Bleu clair (BU)', role: 'Il ramène le courant vers la source.', danger: 'Proche de 0 V en temps normal, mais un neutre coupé peut monter à 230 V : jamais touché sans vérifier.', classe: 'neutre' },
  { id: 'terre', nom: 'Terre (PE)', couleurs: 'Vert-jaune (GNYE)', role: 'Il relie les carcasses métalliques à la terre et emmène un courant de défaut.', danger: 'Il ne porte rien en temps normal. Coupé, il ne protège plus personne.', classe: 'terre' }
];

export const PILIERS = [
  {
    id: 'tension', numero: 1, titre: 'La tension', unite: 'en volts (V)', image: 'la « pression », la hauteur d\'eau d\'un château d\'eau',
    texte: 'La tension est la différence de « pression » électrique entre deux points. Plus elle est haute, plus elle pousse fort. Elle existe même quand rien ne fonctionne : une prise a ses 230 V, appareil branché ou non.',
    retenir: 'La tension attend. On la mesure entre deux points, au multimètre en V.'
  },
  {
    id: 'courant', numero: 2, titre: 'Le courant', unite: 'en ampères (A)', image: 'le débit, l\'eau qui coule quand on ouvre le robinet',
    texte: 'Le courant, c\'est l\'électricité qui circule : un débit d\'électrons. Il ne passe que si le circuit est fermé, de la source jusqu\'au récepteur et retour. C\'est lui qui chauffe, fait tourner, éclaire… et électrise.',
    retenir: 'Pas de circuit fermé, pas de courant. Ton corps peut fermer le circuit.'
  },
  {
    id: 'resistance', numero: 3, titre: 'La résistance', unite: 'en ohms (Ω)', image: 'le frein, le tuyau plus ou moins étroit',
    texte: 'La résistance freine le courant. Pour une même tension, plus elle est grande, moins le courant passe. Les trois sont liés par la loi d\'Ohm : U = R × I, donc I = U / R.',
    retenir: 'U = R × I. Petite résistance sous 230 V : gros courant, danger.'
  },
  {
    id: 'conducteurs', numero: 4, titre: 'Phase, neutre et terre', unite: 'trois conducteurs, trois rôles', image: 'l\'aller, le retour, et la sortie de secours',
    texte: 'Dans un câble, chaque conducteur a son rôle et sa couleur. La phase amène la tension, le neutre ramène le courant, la terre protège en évacuant un défaut. La couleur oriente ; seule une vérification au détecteur le prouve.',
    retenir: 'La phase est dangereuse. On repère à la couleur, on confirme toujours par une VAT.'
  }
];

// Mini-quiz : une bonne réponse par question, le pilier à revoir, et l'élément de la révision qu'elle alimente.
export const QUIZ = [
  {
    id: 'q-tension-courant', pilier: 'courant', revision: ['reco', 'reco-decouverte-courant'],
    question: 'Une lampe est branchée, interrupteur ouvert. Qu\'y a-t-il à la prise ?',
    choix: ['La tension, mais pas de courant', 'Du courant, mais pas de tension', 'Ni tension ni courant du tout'],
    bonne: 0,
    explication: 'La prise garde ses 230 V : la tension attend. Interrupteur ouvert, le circuit n\'est pas fermé : aucun courant ne circule.'
  },
  {
    id: 'q-ohm', pilier: 'resistance', revision: ['calcul', 'ohm'],
    question: 'Une résistance de 100 Ω est branchée sous 230 V. Quel courant la traverse ? (I = U / R)',
    choix: ['2,3 A', '23 000 A', '0,43 A'],
    bonne: 0,
    explication: 'I = U / R = 230 / 100 = 2,3 A. Multiplier donne 23 000 (c\'est U × R), et R / U donne 0,43 : on divise bien la tension par la résistance.'
  },
  {
    id: 'q-conducteurs', pilier: 'conducteurs', revision: ['reco', 'reco-decouverte-phase'],
    question: 'Quel conducteur est dangereux au toucher en temps normal ?',
    choix: ['La phase : marron, noir ou gris', 'Le neutre, toujours bleu clair', 'La terre, toujours vert-jaune'],
    bonne: 0,
    explication: 'La phase porte 230 V par rapport à la terre. Le neutre est proche de 0 V en temps normal (mais jamais touché sans vérifier) ; la terre ne porte rien hors défaut.'
  }
];

// Réponse à une question : { juste, explication }.
export function corriger(q, i) {
  return { juste: i === q.bonne, explication: q.explication };
}

// ---------- Écran ----------

let socleCourant = null;
export const socleEnCours = () => socleCourant;   // utilisé par les tests automatisés

export function renderSocle({ vue, definirTitre, params }) {
  definirTitre('Le socle');
  const s = socleCourant = {
    etape: Math.min(Math.max(Number(params?.get('p')) || 1, 1), PILIERS.length), quiz: false,
    question: 0, reponses: [], ordres: QUIZ.map(q => melanger(q.choix.map((_, i) => i))),
    source: null, ferme: false, U: 230, R: 100, conducteur: null
  };

  const interaction = p => {
    if (p.id === 'tension') return `
      <div class="socle-jeu" role="group" aria-label="Choisis une source de tension">
        <p class="socle-consigne">Touche une source pour voir sa tension :</p>
        <div class="socle-sources">${SOURCES.map(x => `<button type="button" class="btn" data-source="${x.id}" aria-pressed="${s.source === x.id}">${esc(x.nom)}</button>`).join('')}</div>
        ${s.source ? (x => `<p class="socle-verdict ${x.niveau}" role="status"><strong class="mono">${esc(nb(x.tension, 1))} V</strong> · ${esc(typo(x.verdict))}</p>`)(SOURCES.find(x => x.id === s.source)) : ''}
      </div>`;
    if (p.id === 'courant') {
      const I = s.ferme ? courant(230, 880) : 0;
      return `
      <div class="socle-jeu socle-circuit ${s.ferme ? 'ferme' : 'ouvert'}">
        <svg viewBox="0 0 240 120" aria-hidden="true">
          <path d="M30 30H90M150 30H210V90H30V30" fill="none" stroke="currentColor" stroke-width="3"/>
          <path class="interrupteur" d="${s.ferme ? 'M90 30H150' : 'M90 30L142 12'}" fill="none" stroke="currentColor" stroke-width="3"/>
          <circle cx="120" cy="90" r="14" fill="${s.ferme ? '#facc15' : 'none'}" stroke="currentColor" stroke-width="3"/>
          <path d="M110 80l20 20M130 80l-20 20" stroke="currentColor" stroke-width="2"/>
          <rect x="20" y="48" width="20" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="3"/>
        </svg>
        <button type="button" class="btn principal" id="socle-interrupteur">${s.ferme ? 'Ouvrir l\'interrupteur' : 'Fermer l\'interrupteur'}</button>
        <p class="socle-verdict" role="status">Tension : <strong class="mono">230 V</strong> · Courant : <strong class="mono">${nb(I, 2)} A</strong> · Lampe ${s.ferme ? 'allumée' : 'éteinte'}.
          ${s.ferme ? 'Circuit fermé : le courant circule.' : 'Circuit ouvert : la tension est là, mais rien ne circule.'}</p>
      </div>`;
    }
    if (p.id === 'resistance') {
      const I = courant(s.U, s.R);
      return `
      <div class="socle-jeu">
        <div class="selecteur trois" role="group" aria-label="Tension">${[12, 24, 230].map(u => `<button type="button" data-u="${u}" aria-pressed="${s.U === u}">${u} V</button>`).join('')}</div>
        <label class="socle-curseur">Résistance : <strong class="mono" id="socle-r">${s.R} Ω</strong>
          <input type="range" id="socle-resistance" min="10" max="1000" step="10" value="${s.R}" aria-label="Résistance en ohms"></label>
        <p class="socle-verdict" role="status" id="socle-ohm">I = U / R = ${s.U} / ${s.R} = <strong class="mono">${nb(I, 2)} A</strong>${I > 10 ? ' · gros courant : ça chauffe fort' : ''}</p>
      </div>`;
    }
    return `
      <div class="socle-jeu socle-conducteurs" role="group" aria-label="Les trois conducteurs">
        ${CONDUCTEURS.map(c => `<button type="button" class="socle-fil fil-${c.classe}" data-conducteur="${c.id}" aria-expanded="${s.conducteur === c.id}">
          <span class="fil-trait" aria-hidden="true"></span><span><strong>${esc(c.nom)}</strong><span class="fil-couleur">${esc(c.couleurs)}</span></span></button>`).join('')}
        ${s.conducteur ? (c => `<p class="socle-verdict ${c.id === 'phase' ? 'danger' : ''}" role="status"><strong>${esc(c.nom)}</strong> · ${esc(typo(c.role))} ${esc(typo(c.danger))}</p>`)(CONDUCTEURS.find(c => c.id === s.conducteur)) : '<p class="socle-consigne">Touche un conducteur pour voir son rôle.</p>'}
      </div>`;
  };

  const afficherPilier = () => {
    const p = PILIERS[s.etape - 1];
    vue.innerHTML = `
      ${frontispice({ surtitre: 'Le socle · 4 piliers', titre: p.titre, italique: '', chapo: '' })}
      <ol class="socle-progression" aria-label="Pilier ${p.numero} sur ${PILIERS.length}">${PILIERS.map((x, i) => `<li class="${i + 1 < s.etape ? 'fait' : i + 1 === s.etape ? 'en-cours' : ''}"><span>${x.numero}</span></li>`).join('')}<li class="${s.quiz ? 'en-cours' : ''}"><span>?</span></li></ol>
      <p class="socle-unite"><strong>${esc(p.unite)}</strong> · ${esc(typo(p.image))}</p>
      <p class="socle-texte">${esc(typo(p.texte))}</p>
      ${interaction(p)}
      <div class="lecon socle-retenir"><p class="lecon-titre">À retenir</p><p>${esc(typo(p.retenir))}</p></div>
      <div class="actions pousse-bas">
        <button type="button" class="btn principal" id="socle-suivant">${s.etape < PILIERS.length ? `Pilier ${s.etape + 1} : ${esc(PILIERS[s.etape].titre.toLowerCase())}` : 'Je vérifie en 3 questions'}</button>
        ${s.etape > 1 ? '<button type="button" class="btn" id="socle-precedent">Pilier précédent</button>' : ''}
      </div>`;
    vue.querySelectorAll('[data-source]').forEach(b => b.addEventListener('click', () => { s.source = b.dataset.source; afficherPilier(); }));
    vue.querySelector('#socle-interrupteur')?.addEventListener('click', () => { s.ferme = !s.ferme; afficherPilier(); });
    vue.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => { s.U = Number(b.dataset.u); afficherPilier(); }));
    vue.querySelector('#socle-resistance')?.addEventListener('input', ev => {
      s.R = Number(ev.target.value);
      vue.querySelector('#socle-r').textContent = `${s.R} Ω`;
      const I = courant(s.U, s.R);
      vue.querySelector('#socle-ohm').innerHTML = `I = U / R = ${s.U} / ${s.R} = <strong class="mono">${nb(I, 2)} A</strong>${I > 10 ? ' · gros courant : ça chauffe fort' : ''}`;
    });
    vue.querySelectorAll('[data-conducteur]').forEach(b => b.addEventListener('click', () => { s.conducteur = b.dataset.conducteur; afficherPilier(); }));
    vue.querySelector('#socle-suivant').addEventListener('click', () => {
      if (s.etape < PILIERS.length) { s.etape++; afficherPilier(); } else { s.quiz = true; afficherQuestion(); }
      window.scrollTo(0, 0);
    });
    vue.querySelector('#socle-precedent')?.addEventListener('click', () => { s.etape--; afficherPilier(); window.scrollTo(0, 0); });
  };

  // Le quiz : pas de mot du lexique touchable (il soufflerait les réponses).
  const afficherQuestion = () => {
    const q = QUIZ[s.question];
    const r = s.reponses[s.question];
    const ordre = s.ordres[s.question];
    vue.innerHTML = `
      <div data-sans-lexique>
        <p class="surtitre">Le socle · vérification ${s.question + 1}/${QUIZ.length}</p>
        <h2 class="question">${esc(typo(q.question))}</h2>
        <div class="choix">
          ${ordre.map((i, rang) => `<button type="button" class="choix-btn${r ? (i === q.bonne ? ' juste' : i === r.choisi ? ' faux' : '') : ''}" data-choix="${i}"${r ? ' disabled' : ''}><span class="choix-touche">${'ABC'[rang]}</span><span>${esc(typo(q.choix[i]))}</span></button>`).join('')}
        </div>
        ${r ? `<section class="explication ${r.juste ? 'est-juste' : 'est-decouverte'}">
          <p class="verdict"><span class="tampon${r.juste ? '' : ' tampon-decouverte'}">${r.juste ? 'Juste.' : 'Presque : voici l\'idée.'}</span></p>
          <div class="lecon"><p class="lecon-titre">L'explication</p><p>${esc(typo(q.explication))}</p></div>
          ${r.juste ? '' : `<p class="note-decouverte">Aucun point perdu : cette notion reviendra dans ta révision. <a href="#/entrainement/socle?p=${PILIERS.find(p => p.id === q.pilier).numero}">Revoir le pilier</a></p>`}
          <div class="action-collee"><button type="button" class="btn principal" id="socle-question-suivante">${s.question < QUIZ.length - 1 ? 'Question suivante' : 'Terminer'}</button></div>
        </section>` : ''}
      </div>`;
    vue.querySelectorAll('[data-choix]').forEach(b => b.addEventListener('click', () => {
      const choisi = Number(b.dataset.choix);
      const c = corriger(q, choisi);
      s.reponses[s.question] = { choisi, juste: c.juste };
      noterReponse(q.revision[0], q.revision[1], c.juste);   // une erreur rejoint la révision espacée
      afficherQuestion();
      vue.querySelector('.explication')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
    vue.querySelector('#socle-question-suivante')?.addEventListener('click', () => {
      if (s.question < QUIZ.length - 1) { s.question++; afficherQuestion(); window.scrollTo(0, 0); } else terminer();
    });
  };

  const terminer = () => {
    const score = s.reponses.filter(r => r.juste).length;
    stockage.modifier(e => { e.socle = { fait: true, score, date: Date.now() }; e.profil ??= 'debutant'; });
    vue.innerHTML = `
      <section class="bilan bilan-socle">
        <p class="surtitre">Le socle</p>
        <p class="bilan-score">${score}<small>/${QUIZ.length}</small></p>
        <p class="bilan-message">${score === QUIZ.length ? 'Socle validé.' : 'Socle vu : les bases sont posées.'}</p>
        <p class="bilan-xp">${score === QUIZ.length ? 'Les 4 piliers sont en place.' : 'Les notions manquées reviendront dans ta révision, à quelques jours d\'écart.'}</p>
      </section>
      <ul class="stats socle-recap">${PILIERS.map(p => `<li><span>${p.numero}. ${esc(p.titre)}</span><span class="mono">${esc(p.unite)}</span></li>`).join('')}</ul>
      <p class="discret espace">Ta prochaine étape : reconnaître les appareils et les symboles, une séance à la fois. Un mot te bloque ? Touche-le : sa définition s'affiche.</p>
      <div class="actions pousse-bas">
        <a class="btn principal" href="#/entrainement">Commencer mon parcours</a>
        <a class="btn" href="#/entrainement/socle?r=${Date.now()}">Revoir le socle</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  afficherPilier();
}
