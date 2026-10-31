// Mode Calculs Flash : 10 calculs chronométrés (30 s), réponse acceptée à ±2 %.
// Chaque générateur fabrique un exercice avec des valeurs tirées au hasard.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, enteteSession, afficherBilan, annoncerMontee } from './dojo.js';
import { entier, parmi, melanger } from './hasard.js';
import { esc } from './util.js';
import { typo } from './mise-en-page.js';

export const DUREE = 30;        // secondes par calcul
export const TOLERANCE = 0.02;  // ±2 %
const RACINE3 = Math.sqrt(3);
const RHO_CUIVRE = 0.0225;      // Ω·mm²/m : valeur conventionnelle du cuivre en service (NF C 15-100)

// Nombre affiché à la française : 1234.5 → "1 234,5".
const nb = (x, decimales = 2) => x.toLocaleString('fr-FR', { maximumFractionDigits: decimales });

// Un exercice = { enonce, aide?, unite, reponse (nombre), solution, donnees }
//            ou { enonce, choix: [...], reponse (un des choix), solution, donnees } pour un QCM.
export const GENERATEURS = [
  {
    id: 'ohm',
    titre: "Loi d'Ohm",
    creer() {
      const R = parmi([4.7, 10, 22, 47, 100, 220]);
      const I = parmi([0.1, 0.2, 0.5, 1.5, 2, 2.5]);
      const U = R * I;
      const donnees = { R, I, U };
      return parmi([
        () => ({
          enonce: `Une résistance de ${nb(R)} Ω est parcourue par ${nb(I)} A. Tension U à ses bornes ?`,
          unite: 'V', reponse: U, donnees,
          solution: `U = R × I = ${nb(R)} × ${nb(I)} = ${nb(U)} V`
        }),
        () => ({
          enonce: `On applique ${nb(U)} V aux bornes d'une résistance de ${nb(R)} Ω. Courant I ?`,
          unite: 'A', reponse: I, donnees,
          solution: `I = U / R = ${nb(U)} / ${nb(R)} = ${nb(I)} A`
        }),
        () => ({
          enonce: `Un récepteur résistif absorbe ${nb(I)} A sous ${nb(U)} V. Résistance R ?`,
          unite: 'Ω', reponse: R, donnees,
          solution: `R = U / I = ${nb(U)} / ${nb(I)} = ${nb(R)} Ω`
        })
      ])();
    }
  },

  {
    id: 'triphase',
    titre: 'Puissances en triphasé',
    creer() {
      const U = 400;
      const I = entier(4, 60);
      const cos = parmi([0.75, 0.8, 0.85, 0.9]);
      const sin = Math.sqrt(1 - cos ** 2);
      const S = RACINE3 * U * I / 1000;
      const P = S * cos;
      const Q = S * sin;
      const donnees = { U, I, cos };
      const contexte = `Récepteur triphasé sur réseau 400 V : I = ${I} A, cos φ = ${nb(cos)}.`;
      return parmi([
        () => ({
          enonce: `${contexte} Puissance active P ?`,
          unite: 'kW', reponse: P, donnees,
          solution: `P = √3 × U × I × cos φ = 1,732 × 400 × ${I} × ${nb(cos)} = ${nb(P * 1000, 0)} W ≈ ${nb(P)} kW`
        }),
        () => ({
          enonce: `${contexte} Puissance apparente S ?`,
          unite: 'kVA', reponse: S, donnees,
          solution: `S = √3 × U × I = 1,732 × 400 × ${I} = ${nb(S * 1000, 0)} VA ≈ ${nb(S)} kVA`
        }),
        () => ({
          enonce: `${contexte} Puissance réactive Q ?`,
          unite: 'kvar', reponse: Q, donnees,
          solution: `sin φ = √(1 − cos²φ) = ${nb(sin, 3)} ; Q = √3 × U × I × sin φ = 1,732 × 400 × ${I} × ${nb(sin, 3)} ≈ ${nb(Q)} kvar`
        })
      ])();
    }
  },

  {
    id: 'chute',
    titre: 'Chute de tension',
    creer() {
      const { S, I } = parmi([
        { S: 1.5, I: 10 }, { S: 2.5, I: 16 }, { S: 2.5, I: 20 },
        { S: 4, I: 25 }, { S: 6, I: 32 }, { S: 10, I: 40 }
      ]);
      const L = parmi([15, 20, 25, 30, 40, 50]);
      const aide = `ρ cuivre = 0,0225 Ω·mm²/m · cos φ = 1 (réactance négligée)`;
      const donnees = { S, I, L, rho: RHO_CUIVRE };
      const duMono = 2 * RHO_CUIVRE * L * I / S;
      const duTri = RACINE3 * RHO_CUIVRE * L * I / S;
      const cable = `câble cuivre ${nb(S)} mm², L = ${L} m, I = ${I} A`;
      return parmi([
        () => ({
          enonce: `Circuit monophasé 230 V, ${cable}. Chute de tension ΔU ?`,
          aide, unite: 'V', reponse: duMono, donnees: { ...donnees, reseau: 'mono', en: 'V' },
          solution: `ΔU = 2 × ρ × L × I / S = 2 × 0,0225 × ${L} × ${I} / ${nb(S)} = ${nb(duMono)} V (le 2 = aller + retour)`
        }),
        () => ({
          enonce: `Circuit monophasé 230 V, ${cable}. Chute de tension en % ?`,
          aide, unite: '%', reponse: duMono / 230 * 100, donnees: { ...donnees, reseau: 'mono', en: '%' },
          solution: `ΔU = 2 × ρ × L × I / S = ${nb(duMono)} V ; ΔU % = ${nb(duMono)} / 230 × 100 = ${nb(duMono / 230 * 100)} %`
        }),
        () => ({
          enonce: `Ligne triphasée 400 V, ${cable}. Chute de tension en % ?`,
          aide, unite: '%', reponse: duTri / 400 * 100, donnees: { ...donnees, reseau: 'tri', en: '%' },
          solution: `ΔU = √3 × ρ × L × I / S = 1,732 × 0,0225 × ${L} × ${I} / ${nb(S)} = ${nb(duTri)} V ; ΔU % = ${nb(duTri)} / 400 × 100 = ${nb(duTri / 400 * 100)} %`
        })
      ])();
    }
  },

  {
    id: 'couplage',
    titre: 'Couplage étoile / triangle',
    creer() {
      return parmi([
        () => {
          const cas = parmi([
            { plaque: '230/400 V', reponse: 'Étoile', explication: "Chaque enroulement supporte la plus petite tension de la plaque : 230 V. Sur 400 V, l'étoile donne 400 / √3 = 230 V par enroulement → étoile." },
            { plaque: '400/690 V', reponse: 'Triangle', explication: 'Chaque enroulement supporte la plus petite tension de la plaque : 400 V. Sur 400 V, le triangle met 400 V sur chaque enroulement → triangle.' }
          ]);
          return {
            enonce: `Plaque moteur : ${cas.plaque}. Réseau triphasé 400 V. Quel couplage ?`,
            choix: ['Étoile', 'Triangle'], reponse: cas.reponse, donnees: { plaque: cas.plaque },
            solution: cas.explication
          };
        },
        () => {
          const U = parmi([400, 690]);
          const V = U / RACINE3;
          return {
            enonce: `Moteur couplé en étoile sur un réseau ${U} V. Tension aux bornes d'un enroulement ?`,
            unite: 'V', reponse: V, donnees: { U },
            solution: `En étoile : V = U / √3 = ${U} / 1,732 = ${nb(V)} V`
          };
        },
        () => {
          const I = entier(8, 60);
          const J = I / RACINE3;
          return {
            enonce: `Moteur couplé en triangle, courant de ligne I = ${I} A. Courant J dans un enroulement ?`,
            unite: 'A', reponse: J, donnees: { I },
            solution: `En triangle : J = I / √3 = ${I} / 1,732 = ${nb(J)} A`
          };
        },
        () => {
          const Id = parmi([60, 90, 120, 150, 180, 240]);
          return {
            enonce: `Démarrage étoile-triangle : en direct (triangle), le courant de démarrage serait de ${Id} A. Courant de démarrage en étoile ?`,
            unite: 'A', reponse: Id / 3, donnees: { Id },
            solution: `En étoile, le courant de ligne au démarrage est divisé par 3 (le couple aussi) : ${Id} / 3 = ${nb(Id / 3)} A`
          };
        }
      ])();
    }
  },

  {
    id: 'intensite',
    titre: 'Intensité nominale moteur',
    creer() {
      const Pu = parmi([1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15]);
      const eta = parmi([0.82, 0.85, 0.87, 0.89, 0.91]);
      const cos = parmi([0.78, 0.8, 0.82, 0.85]);
      const In = Pu * 1000 / (RACINE3 * 400 * eta * cos);
      return {
        enonce: `Moteur triphasé 400 V : Pu = ${nb(Pu)} kW, η = ${nb(eta)}, cos φ = ${nb(cos)}. Intensité nominale In ?`,
        unite: 'A', reponse: In, donnees: { Pu, eta, cos },
        solution: `In = Pu / (√3 × U × η × cos φ) = ${nb(Pu * 1000, 0)} / (1,732 × 400 × ${nb(eta)} × ${nb(cos)}) = ${nb(In)} A (Pu = puissance utile de la plaque)`
      };
    }
  }
];

// "12,5" ou "12.5" ou "1 500" → nombre ; texte invalide → NaN.
export function lireNombre(texte) {
  const t = String(texte).replace(/\s/g, '').replace(',', '.');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

export function estJuste(valeur, attendu) {
  return Math.abs(valeur - attendu) <= TOLERANCE * Math.abs(attendu);
}

export function creerSession() {
  const generateurs = melanger(Array.from({ length: TAILLE_SESSION }, (_, i) => GENERATEURS[i % GENERATEURS.length]));
  return {
    exercices: generateurs.map(g => ({ generateur: g, ...g.creer() })),
    index: 0,
    score: 0,
    xp: 0
  };
}

let sessionCourante = null;
export const sessionEnCours = () => sessionCourante; // utilisé par les tests automatisés

// Clavier à l'écran : remplace le clavier iOS, qui masquerait l'énoncé et le chrono.
// Disposition d'un pavé numérique : Valider est la grande touche verticale sous le pouce droit.
const TOUCHES_CLAVIER = ['7', '8', '9', '⌫', '4', '5', '6', '1', '2', '3', '0', ','];
const LONGUEUR_MAX = 9;

export function renderCalcul({ vue, definirTitre, auNettoyage }) {
  definirTitre('Calculs flash');
  const session = sessionCourante = creerSession();
  session.resultats = [];
  let minuteur = null;
  let saisie = '';
  const arreterMinuteur = () => { clearInterval(minuteur); minuteur = null; };
  const exerciceCourant = () => session.exercices[session.index];

  const taper = touche => {
    if (touche === '⌫') saisie = saisie.slice(0, -1);
    else if (touche === ',') { if (!saisie.includes(',') && saisie.length < LONGUEUR_MAX) saisie = (saisie || '0') + ','; }
    else if (saisie.length < LONGUEUR_MAX) saisie = saisie === '0' ? touche : saisie + touche;
    vue.querySelector('#reponse').textContent = saisie;
    vue.querySelector('#erreur-saisie').textContent = '';
  };

  const valider = () => {
    const valeur = lireNombre(saisie);
    if (Number.isNaN(valeur)) {
      vue.querySelector('#erreur-saisie').textContent = 'Compose ta réponse sur le clavier.';
      return;
    }
    terminer(exerciceCourant(), valeur);
  };

  // Clavier physique (ordinateur, clavier Bluetooth) en plus du clavier à l'écran.
  const surTouche = ev => {
    const ex = exerciceCourant();
    if (!ex || ex.termine || ex.choix || ev.metaKey || ev.ctrlKey) return;
    if (/^[0-9]$/.test(ev.key)) taper(ev.key);
    else if (ev.key === ',' || ev.key === '.') taper(',');
    else if (ev.key === 'Backspace') taper('⌫');
    else if (ev.key === 'Enter') valider();
    else return;
    ev.preventDefault();
  };
  document.addEventListener('keydown', surTouche);
  auNettoyage(() => { arreterMinuteur(); document.removeEventListener('keydown', surTouche); });

  const afficherExercice = () => {
    const ex = exerciceCourant();
    saisie = '';
    vue.innerHTML = `
      ${enteteSession(session.index + 1, session.score, session.resultats)}
      <div class="meche chrono">
        <div class="meche-piste"><div class="chrono-barre"></div></div>
        <span class="chrono-valeur"><span id="secondes">${DUREE}</span><small>s</small></span>
      </div>
      <section class="exercice">
        <p class="surtitre">${esc(ex.generateur.titre)}</p>
        <p class="enonce">${esc(typo(ex.enonce))}</p>
        ${ex.aide ? `<p class="aide">${esc(typo(ex.aide))}</p>` : ''}
      </section>
      <div class="pousse-bas">
        ${ex.choix
          ? `<div class="choix choix-2">${ex.choix.map((c, i) => `<button class="choix-btn" type="button" data-valeur="${esc(c)}"><span class="choix-touche">${'AB'[i]}</span><span>${esc(c)}</span></button>`).join('')}</div>`
          : `<div class="nixie"><output id="reponse" class="nixie-valeur" aria-live="polite"></output><span class="unite">${esc(ex.unite)}</span></div>
             <div id="saisie" class="clavier">
               ${TOUCHES_CLAVIER.map(t => `<button class="btn${t === '⌫' ? ' effacer' : t === '0' ? ' zero' : ''}" type="button" data-touche="${t}" aria-label="${t === '⌫' ? 'Effacer' : t}">${t}</button>`).join('')}
               <button class="btn valider" type="button">Valider</button>
             </div>`}
        <p id="erreur-saisie" class="erreur-saisie" role="alert"></p>
      </div>
      <div id="correction"></div>`;

    if (ex.choix) {
      vue.querySelectorAll('.choix-btn').forEach((b, i) =>
        b.addEventListener('click', () => terminer(ex, ex.choix[i])));
    } else {
      vue.querySelectorAll('[data-touche]').forEach(b => b.addEventListener('click', () => taper(b.dataset.touche)));
      vue.querySelector('.clavier .valider').addEventListener('click', valider);
    }

    const chrono = vue.querySelector('.chrono');
    const barre = vue.querySelector('.chrono-barre');
    const secondes = vue.querySelector('#secondes');
    ex.debut = Date.now();
    minuteur = setInterval(() => {
      const restant = Math.max(0, DUREE - (Date.now() - ex.debut) / 1000);
      barre.style.width = `${restant / DUREE * 100}%`;
      chrono.classList.toggle('critique', restant <= 10);
      secondes.textContent = Math.ceil(restant);
      if (restant <= 0) terminer(ex, null);
    }, 200);
    window.scrollTo(0, 0);
  };

  // valeur : nombre saisi, choix touché, ou null si le temps est écoulé.
  const terminer = (ex, valeur) => {
    if (ex.termine) return;
    ex.termine = true;
    arreterMinuteur();
    const duree = (Date.now() - ex.debut) / 1000;
    const juste = valeur !== null && (ex.choix ? valeur === ex.reponse : estJuste(valeur, ex.reponse));

    session.resultats.push(juste);
    vue.querySelectorAll('.borne')[session.index].className = `borne ${juste ? 'juste' : 'faux'}`;
    vue.querySelector('.clavier')?.remove(); // le clavier laisse la place à la correction
    vue.querySelector('.nixie')?.classList.add(juste ? 'juste' : 'faux');
    vue.querySelector('#erreur-saisie').textContent = '';
    if (ex.choix) {
      vue.querySelectorAll('.choix-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.valeur === ex.reponse) b.classList.add('juste');
        else if (b.dataset.valeur === valeur) b.classList.add('faux');
      });
    }

    noterReponse('calcul', ex.generateur.id, juste);
    let gain = 0;
    const rapide = duree < BAREME.seuilRapidite;
    if (juste) {
      gain = BAREME.bonneReponse + (rapide ? BAREME.bonusRapidite : 0);
      session.score++;
      session.xp += gain;
      annoncerMontee(gagnerXP(gain));
    }

    const attendu = ex.choix ? ex.reponse : `${nb(ex.reponse)} ${ex.unite}`;
    let verdict;
    if (juste) verdict = `<p class="verdict"><span class="tampon">Juste.</span><span class="gain">+${gain} XP${rapide ? ' · rapide' : ''}</span></p>`;
    else if (valeur === null) verdict = `<p class="verdict"><span class="tampon">Temps dépassé.</span></p>
      <p class="attendu">Il fallait trouver <strong class="mono">${esc(typo(attendu))}</strong>.</p>`;
    else verdict = `<p class="verdict"><span class="tampon">Raté.</span></p>
      <p class="attendu">Ta réponse : <strong class="mono">${esc(typo(ex.choix ? valeur : `${nb(valeur)} ${ex.unite}`))}</strong> — il fallait <strong class="mono">${esc(typo(attendu))}</strong>.</p>`;

    const derniere = session.index === session.exercices.length - 1;
    const zone = vue.querySelector('#correction');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        ${verdict}
        <p class="surtitre">Le calcul posé</p>
        <p class="solution">${esc(typo(ex.solution))}</p>
        <div class="action-collee"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le rapport' : 'Calcul suivant'}</button></div>
      </section>`;
    zone.querySelector('#suivant').addEventListener('click', suivant);
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const suivant = () => {
    session.index++;
    if (session.index < session.exercices.length) return afficherExercice();

    if (session.score === TAILLE_SESSION) {
      session.xp += BAREME.sessionParfaite;
      annoncerMontee(gagnerXP(BAREME.sessionParfaite));
    }
    noterSession('calcul', session.score);
    afficherBilan(vue, { score: session.score, xpGagne: session.xp, onRejouer: () => renderCalcul({ vue, definirTitre, auNettoyage }) });
  };

  afficherExercice();
}
