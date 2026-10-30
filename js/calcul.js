// Mode Calculs Flash : 10 calculs chronométrés (30 s), réponse acceptée à ±2 %.
// Chaque générateur fabrique un exercice avec des valeurs tirées au hasard.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, enteteSession, afficherBilan, annoncerMontee } from './dojo.js';
import { entier, parmi, melanger } from './hasard.js';
import { esc } from './util.js';

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

export function renderCalcul({ vue, definirTitre, auNettoyage }) {
  definirTitre('Calculs Flash');
  const session = sessionCourante = creerSession();
  let minuteur = null;
  const arreterMinuteur = () => { clearInterval(minuteur); minuteur = null; };
  auNettoyage(arreterMinuteur); // stoppe le chrono si on quitte l'écran

  const afficherExercice = () => {
    const ex = session.exercices[session.index];
    vue.innerHTML = `
      ${enteteSession(session.index + 1, session.score)}
      <div class="chrono"><div class="chrono-barre"></div></div>
      <p class="chrono-texte"><span id="secondes">${DUREE}</span> s</p>
      <section class="carte exercice">
        <p class="badge">${esc(ex.generateur.titre)}</p>
        <p class="enonce">${esc(ex.enonce)}</p>
        ${ex.aide ? `<p class="discret petit">${esc(ex.aide)}</p>` : ''}
        ${ex.choix
          ? `<div class="choix choix-2">${ex.choix.map(c => `<button class="btn choix-btn" type="button">${esc(c)}</button>`).join('')}</div>`
          : `<form id="saisie" class="saisie" autocomplete="off">
               <input id="reponse" type="text" inputmode="decimal" enterkeyhint="done" placeholder="Ta réponse" aria-label="Ta réponse en ${esc(ex.unite)}">
               <span class="unite">${esc(ex.unite)}</span>
               <button class="btn principal" type="submit">Valider</button>
             </form>`}
        <p id="erreur-saisie" class="alerte petit" role="alert"></p>
      </section>
      <div id="correction"></div>`;

    if (ex.choix) {
      vue.querySelectorAll('.choix-btn').forEach((b, i) =>
        b.addEventListener('click', () => terminer(ex, ex.choix[i])));
    } else {
      const champ = vue.querySelector('#reponse');
      vue.querySelector('#saisie').addEventListener('submit', ev => {
        ev.preventDefault();
        const valeur = lireNombre(champ.value);
        if (Number.isNaN(valeur)) {
          vue.querySelector('#erreur-saisie').textContent = 'Entre un nombre, par exemple 12,5';
          return;
        }
        terminer(ex, valeur);
      });
      champ.focus();
    }

    const barre = vue.querySelector('.chrono-barre');
    const secondes = vue.querySelector('#secondes');
    ex.debut = Date.now();
    minuteur = setInterval(() => {
      const restant = Math.max(0, DUREE - (Date.now() - ex.debut) / 1000);
      barre.style.width = `${restant / DUREE * 100}%`;
      barre.classList.toggle('urgent', restant <= 10);
      secondes.textContent = Math.ceil(restant);
      if (restant <= 0) terminer(ex, null);
    }, 200);
    window.scrollTo(0, 0);
  };

  // valeur : nombre saisi, choix cliqué, ou null si le temps est écoulé.
  const terminer = (ex, valeur) => {
    if (ex.termine) return;
    ex.termine = true;
    arreterMinuteur();
    const duree = (Date.now() - ex.debut) / 1000;
    const juste = valeur !== null && (ex.choix ? valeur === ex.reponse : estJuste(valeur, ex.reponse));

    vue.querySelectorAll('.exercice input, .exercice button').forEach(el => { el.disabled = true; });
    vue.querySelector('#reponse')?.blur(); // range le clavier pour laisser voir la correction
    vue.querySelector('#erreur-saisie').textContent = '';
    if (ex.choix) {
      vue.querySelectorAll('.choix-btn').forEach(b => {
        if (b.textContent === ex.reponse) b.classList.add('juste');
        else if (b.textContent === valeur) b.classList.add('faux');
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
    if (juste) verdict = `✅ Juste ! <span class="gain">+${gain} XP${rapide ? ' (bonus rapidité)' : ''}</span>`;
    else if (valeur === null) verdict = `⏱️ Temps écoulé. Réponse : <strong>${esc(attendu)}</strong>`;
    else verdict = `❌ Ta réponse : ${esc(ex.choix ? valeur : `${nb(valeur)} ${ex.unite}`)}. Attendu : <strong>${esc(attendu)}</strong>`;

    const derniere = session.index === session.exercices.length - 1;
    const zone = vue.querySelector('#correction');
    zone.innerHTML = `
      <section class="carte explication ${juste ? 'est-juste' : 'est-faux'}">
        <p class="verdict">${verdict}</p>
        <p class="solution">${esc(ex.solution)}</p>
        <button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le résultat' : 'Calcul suivant'}</button>
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
