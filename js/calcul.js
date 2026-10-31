// Mode Calculs flash : 10 calculs d'un niveau de difficulté, sans chrono, réponse acceptée à ±2 %.
// Chaque générateur fabrique un exercice avec des valeurs tirées au hasard, son calcul posé,
// un rappel de méthode, un piège de terrain et les erreurs types qu'il sait reconnaître.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, enteteSession, afficherBilan, annoncerMontee } from './dojo.js';
import { DIFFICULTES, difficulte, etiquetteNiveau, renderChoixNiveau } from './difficulte.js';
import { entier, parmi, melanger } from './hasard.js';
import { esc } from './util.js';
import { typo } from './mise-en-page.js';

export const TOLERANCE = 0.02;  // ±2 %
const RACINE3 = Math.sqrt(3);
const RHO_CUIVRE = 0.0225;      // Ω·mm²/m : valeur conventionnelle du cuivre en service (NF C 15-100)

// Nombre affiché à la française : 1234.5 → "1 234,5".
const nb = (x, decimales = 2) => x.toLocaleString('fr-FR', { maximumFractionDigits: decimales });
const tanDe = cos => Math.tan(Math.acos(cos));

// Un exercice = { enonce, aide?, unite, reponse (nombre), solution, explication, piege, erreurs, donnees }
//            ou { enonce, choix: [...], reponse (un des choix), solution, explication, piege, donnees } pour un QCM.
// erreurs : [{ valeur, message }] — si la réponse donnée tombe à ±2 % d'une de ces valeurs, le message s'affiche.
export const GENERATEURS = [
  // ---------------------------------------------------------------- Niveau I · Fondations
  {
    id: 'ohm',
    niveau: 1,
    titre: "Loi d'Ohm",
    creer() {
      const R = parmi([4.7, 10, 22, 47, 100, 220]);
      const I = parmi([0.1, 0.2, 0.5, 1.5, 2, 2.5]);
      const U = R * I;
      const commun = {
        donnees: { R, I, U },
        explication: "Loi d'Ohm : U = R × I. On en tire I = U / R et R = U / I. Astuce du triangle : U en haut, R et I en bas ; cache la grandeur cherchée, il reste l'opération à faire.",
        piege: 'Convertis les sous-multiples avant de calculer : 4,7 kΩ = 4 700 Ω, 200 mA = 0,2 A.'
      };
      return parmi([
        () => ({
          ...commun,
          enonce: `Une résistance de ${nb(R)} Ω est parcourue par ${nb(I)} A. Tension U à ses bornes ?`,
          unite: 'V', reponse: U,
          solution: `U = R × I = ${nb(R)} × ${nb(I)} = ${nb(U)} V`,
          erreurs: [{ valeur: R / I, message: 'Tu as divisé R par I : pour la tension, on multiplie, U = R × I.' }]
        }),
        () => ({
          ...commun,
          enonce: `On applique ${nb(U)} V aux bornes d'une résistance de ${nb(R)} Ω. Courant I ?`,
          unite: 'A', reponse: I,
          solution: `I = U / R = ${nb(U)} / ${nb(R)} = ${nb(I)} A`,
          erreurs: [
            { valeur: R / U, message: "Tu as calculé R / U : c'est l'inverse, I = U / R." },
            { valeur: U * R, message: 'Tu as multiplié U par R : pour le courant, on divise, I = U / R.' }
          ]
        }),
        () => ({
          ...commun,
          enonce: `Un récepteur résistif absorbe ${nb(I)} A sous ${nb(U)} V. Résistance R ?`,
          unite: 'Ω', reponse: R,
          solution: `R = U / I = ${nb(U)} / ${nb(I)} = ${nb(R)} Ω`,
          erreurs: [
            { valeur: I / U, message: "Tu as calculé I / U : c'est l'inverse, R = U / I." },
            { valeur: U * I, message: "Tu as calculé U × I : c'est la puissance P (en W), pas la résistance." }
          ]
        })
      ])();
    }
  },

  {
    id: 'puissance',
    niveau: 1,
    titre: 'Puissance et énergie',
    creer() {
      const piegeCos = "P = U × I ne vaut qu'en continu ou pour un récepteur résistif ; pour un moteur en alternatif, il faut multiplier par cos φ.";
      return parmi([
        () => {
          const U = parmi([12, 24, 230]);
          const I = parmi([0.5, 2, 4, 8.7]);
          const P = U * I;
          return {
            enonce: `Un récepteur résistif alimenté en ${nb(U)} V absorbe ${nb(I)} A. Puissance P ?`,
            unite: 'W', reponse: P, donnees: { type: 'UI', U, I },
            solution: `P = U × I = ${nb(U)} × ${nb(I)} = ${nb(P)} W`,
            explication: 'Pour un récepteur résistif (ou en courant continu), la puissance vaut P = U × I, en watts.',
            piege: piegeCos,
            erreurs: [{ valeur: U / I, message: 'Tu as divisé U par I : ça donne une résistance (en Ω), pas une puissance.' }]
          };
        },
        () => {
          const R = parmi([10, 22, 47]);
          const I = parmi([3, 4, 5]);
          const P = R * I * I;
          return {
            enonce: `Une résistance de ${nb(R)} Ω est parcourue par ${nb(I)} A. Puissance dissipée P ?`,
            unite: 'W', reponse: P, donnees: { type: 'RI2', R, I },
            solution: `P = R × I² = ${nb(R)} × ${nb(I)}² = ${nb(R)} × ${nb(I * I)} = ${nb(P)} W`,
            explication: 'En remplaçant U par R × I dans P = U × I, on obtient P = R × I² : la puissance dissipée croît avec le carré du courant. C\'est l\'effet Joule.',
            piege: 'I² veut dire I × I. Doubler le courant multiplie par 4 l\'échauffement : c\'est pourquoi un câble sous-dimensionné chauffe si vite.',
            erreurs: [
              { valeur: R * I, message: 'R × I donne la tension U, pas la puissance : P = R × I² (le courant au carré).' },
              { valeur: R * I * 2, message: 'I² veut dire I × I, pas I × 2.' }
            ]
          };
        },
        () => {
          const U = 230;
          const R = parmi([52.9, 105.8, 529]);
          const P = U * U / R;
          return {
            enonce: `Une résistance de ${nb(R)} Ω est branchée sous 230 V. Puissance P ?`,
            unite: 'W', reponse: P, donnees: { type: 'U2R', U, R },
            solution: `P = U² / R = 230² / ${nb(R)} = ${nb(U * U, 0)} / ${nb(R)} = ${nb(P)} W`,
            explication: 'En remplaçant I par U / R dans P = U × I, on obtient P = U² / R. Pratique quand on connaît la tension et la résistance, mais pas le courant.',
            piege: piegeCos,
            erreurs: [{ valeur: U / R, message: 'U / R donne le courant I (en A). Pour la puissance : P = U² / R.' }]
          };
        },
        () => {
          const P = parmi([1500, 2000, 3000]);
          const t = parmi([2, 3, 4.5]);
          const W = P * t / 1000;
          return {
            enonce: `Un radiateur de ${nb(P)} W fonctionne ${nb(t)} h. Énergie consommée ?`,
            unite: 'kWh', reponse: W, donnees: { type: 'energie', P, t },
            solution: `W = P × t = ${nb(P)} × ${nb(t)} = ${nb(P * t)} Wh = ${nb(W)} kWh`,
            explication: "Énergie = puissance × durée. Avec P en W et t en heures, on obtient des Wh ; on divise par 1 000 pour des kWh, l'unité de la facture.",
            piege: 'Oublier de convertir les Wh en kWh (facteur 1 000), ou les minutes en heures (30 min = 0,5 h).',
            erreurs: [{ valeur: P * t, message: 'Tu as donné le résultat en Wh : divise par 1 000 pour obtenir des kWh.' }]
          };
        }
      ])();
    }
  },

  {
    id: 'resistances',
    niveau: 1,
    titre: 'Associations de résistances',
    creer() {
      const [R1, R2] = melanger([10, 22, 47, 100, 220]).slice(0, 2);
      const serie = R1 + R2;
      const parallele = R1 * R2 / (R1 + R2);
      return parmi([
        () => ({
          enonce: `Deux résistances de ${nb(R1)} Ω et ${nb(R2)} Ω sont montées en série. Résistance équivalente ?`,
          unite: 'Ω', reponse: serie, donnees: { R1, R2, montage: 'serie' },
          solution: `Req = R1 + R2 = ${nb(R1)} + ${nb(R2)} = ${nb(serie)} Ω`,
          explication: 'En série, le courant traverse les résistances l\'une après l\'autre : les résistances s\'additionnent. Req est plus grande que la plus grande des deux.',
          piege: 'Ne pas confondre avec le parallèle. Vérifie l\'ordre de grandeur : en série, le résultat dépasse chacune des résistances.',
          erreurs: [{ valeur: parallele, message: "Ça, c'est la formule du parallèle. En série, les résistances s'additionnent." }]
        }),
        () => ({
          enonce: `Deux résistances de ${nb(R1)} Ω et ${nb(R2)} Ω sont montées en parallèle. Résistance équivalente ?`,
          unite: 'Ω', reponse: parallele, donnees: { R1, R2, montage: 'parallele' },
          solution: `Req = R1 × R2 / (R1 + R2) = ${nb(R1 * R2, 0)} / ${nb(serie)} = ${nb(parallele)} Ω`,
          explication: 'En parallèle, le courant a plusieurs chemins : la résistance équivalente diminue. 1/Req = 1/R1 + 1/R2, soit pour deux résistances Req = R1 × R2 / (R1 + R2) (« produit sur somme »).',
          piege: 'Req est toujours plus petite que la plus petite des résistances : si ton résultat est plus grand, il y a une erreur.',
          erreurs: [
            { valeur: serie, message: 'Tu as additionné comme en série. En parallèle : Req = R1 × R2 / (R1 + R2).' },
            { valeur: (R1 + R2) / 2, message: 'La moyenne ne marche pas : en parallèle, Req est plus petite que la plus petite des deux.' }
          ]
        })
      ])();
    }
  },

  // ---------------------------------------------------------------- Niveau II · Pratique courante
  {
    id: 'triphase',
    niveau: 2,
    titre: 'Puissances en triphasé',
    creer() {
      const U = 400;
      const I = entier(4, 60);
      const cos = parmi([0.75, 0.8, 0.85, 0.9]);
      const sin = Math.sqrt(1 - cos ** 2);
      const S = RACINE3 * U * I / 1000;
      const P = S * cos;
      const Q = S * sin;
      const commun = {
        donnees: { U, I, cos },
        explication: 'En triphasé équilibré : P = √3 × U × I × cos φ (W), Q = √3 × U × I × sin φ (var), S = √3 × U × I (VA), avec U la tension composée (entre phases) et I le courant de ligne. Divise par 1 000 pour passer en kW, kvar, kVA.',
        piege: 'Utiliser la tension simple V = 230 V avec le √3 (résultat √3 fois trop petit), ou oublier de diviser par 1 000.'
      };
      const contexte = `Récepteur triphasé sur réseau 400 V : I = ${I} A, cos φ = ${nb(cos)}.`;
      return parmi([
        () => ({
          ...commun,
          enonce: `${contexte} Puissance active P ?`,
          unite: 'kW', reponse: P,
          solution: `P = √3 × U × I × cos φ = 1,732 × 400 × ${I} × ${nb(cos)} = ${nb(P * 1000, 0)} W ≈ ${nb(P)} kW`,
          erreurs: [
            { valeur: P / RACINE3, message: 'Résultat √3 fois trop petit : as-tu oublié le √3, ou pris V = 230 V au lieu de U = 400 V ?' },
            { valeur: S, message: "Tu as oublié cos φ : ça, c'est la puissance apparente S en kVA." }
          ]
        }),
        () => ({
          ...commun,
          enonce: `${contexte} Puissance apparente S ?`,
          unite: 'kVA', reponse: S,
          solution: `S = √3 × U × I = 1,732 × 400 × ${I} = ${nb(S * 1000, 0)} VA ≈ ${nb(S)} kVA`,
          erreurs: [
            { valeur: S / RACINE3, message: 'Résultat √3 fois trop petit : as-tu oublié le √3, ou pris V = 230 V au lieu de U = 400 V ?' },
            { valeur: P, message: "Tu as multiplié par cos φ : ça donne P (kW). S n'utilise pas cos φ." }
          ]
        }),
        () => ({
          ...commun,
          enonce: `${contexte} Puissance réactive Q ?`,
          unite: 'kvar', reponse: Q,
          solution: `sin φ = √(1 − cos²φ) = ${nb(sin, 3)} ; Q = √3 × U × I × sin φ = 1,732 × 400 × ${I} × ${nb(sin, 3)} ≈ ${nb(Q)} kvar`,
          erreurs: [
            { valeur: Q / RACINE3, message: 'Résultat √3 fois trop petit : as-tu oublié le √3, ou pris V = 230 V au lieu de U = 400 V ?' },
            { valeur: P, message: 'Tu as utilisé cos φ au lieu de sin φ : ça donne P.' },
            { valeur: S * (1 - cos), message: 'sin φ ≠ 1 − cos φ : on calcule sin φ = √(1 − cos²φ).' }
          ]
        })
      ])();
    }
  },

  {
    id: 'intensite',
    niveau: 2,
    titre: 'Intensité nominale moteur',
    creer() {
      const Pu = parmi([1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15]);
      const eta = parmi([0.82, 0.85, 0.87, 0.89, 0.91]);
      const cos = parmi([0.78, 0.8, 0.82, 0.85]);
      const In = Pu * 1000 / (RACINE3 * 400 * eta * cos);
      return {
        enonce: `Moteur triphasé 400 V : Pu = ${nb(Pu)} kW, η = ${nb(eta)}, cos φ = ${nb(cos)}. Intensité nominale In ?`,
        unite: 'A', reponse: In, donnees: { Pu, eta, cos },
        solution: `In = Pu / (√3 × U × η × cos φ) = ${nb(Pu * 1000, 0)} / (1,732 × 400 × ${nb(eta)} × ${nb(cos)}) = ${nb(In)} A`,
        explication: 'La plaque donne la puissance UTILE (mécanique). On remonte à la puissance absorbée Pa = Pu / η, puis au courant : I = Pa / (√3 × U × cos φ). D\'où In = Pu / (√3 × U × η × cos φ).',
        piege: 'Oublier η : on calcule alors le courant d\'un moteur parfait, trop faible. Et convertir les kW en W avant de diviser.',
        erreurs: [
          { valeur: In * eta * cos, message: 'Tu as oublié à la fois η et cos φ : I = Pu / (√3 × U) ne vaudrait que pour un moteur parfait.' },
          { valeur: In * eta, message: 'Tu as oublié le rendement η : la plaque donne la puissance utile, l\'absorbée vaut Pu / η.' },
          { valeur: In * cos, message: 'Tu as oublié cos φ au dénominateur.' },
          { valeur: In * RACINE3, message: 'Résultat √3 fois trop grand : as-tu oublié le √3 au dénominateur ?' }
        ]
      };
    }
  },

  {
    id: 'couplage',
    niveau: 2,
    titre: 'Couplage étoile / triangle',
    creer() {
      return parmi([
        () => {
          const cas = parmi([
            { plaque: '230/400 V', reponse: 'Étoile', solution: "Chaque enroulement supporte la plus petite tension de la plaque : 230 V. Sur 400 V, l'étoile donne 400 / √3 = 230 V par enroulement → étoile." },
            { plaque: '400/690 V', reponse: 'Triangle', solution: 'Chaque enroulement supporte la plus petite tension de la plaque : 400 V. Sur 400 V, le triangle met 400 V sur chaque enroulement → triangle.' }
          ]);
          return {
            enonce: `Plaque moteur : ${cas.plaque}. Réseau triphasé 400 V. Quel couplage ?`,
            choix: ['Étoile', 'Triangle'], reponse: cas.reponse, donnees: { plaque: cas.plaque },
            solution: cas.solution,
            explication: 'Règle : la PLUS PETITE tension de la plaque est celle que supporte un enroulement. On choisit le couplage qui met exactement cette tension sur chaque enroulement : en étoile, un enroulement reçoit U / √3 ; en triangle, il reçoit U.',
            piege: 'Coupler en triangle un moteur 230/400 V sur un réseau 400 V : chaque enroulement reçoit 400 V au lieu de 230 V, il chauffe et grille en quelques minutes.'
          };
        },
        () => {
          const U = parmi([400, 690]);
          const V = U / RACINE3;
          return {
            enonce: `Moteur couplé en étoile sur un réseau ${U} V. Tension aux bornes d'un enroulement ?`,
            unite: 'V', reponse: V, donnees: { U },
            solution: `En étoile : V = U / √3 = ${U} / 1,732 = ${nb(V)} V`,
            explication: 'En étoile, chaque enroulement est entre une phase et le point commun (le « neutre » du moteur) : il reçoit la tension simple V = U / √3. Le courant dans l\'enroulement est égal au courant de ligne.',
            piege: 'Diviser par 3 au lieu de √3 (1,732), ou multiplier par √3.',
            erreurs: [
              { valeur: U * RACINE3, message: 'Tu as multiplié par √3 : en étoile, la tension par enroulement est plus petite que U, on divise.' },
              { valeur: U / 3, message: 'On divise par √3 (1,732), pas par 3.' }
            ]
          };
        },
        () => {
          const I = entier(8, 60);
          const J = I / RACINE3;
          return {
            enonce: `Moteur couplé en triangle, courant de ligne I = ${I} A. Courant J dans un enroulement ?`,
            unite: 'A', reponse: J, donnees: { I },
            solution: `En triangle : J = I / √3 = ${I} / 1,732 = ${nb(J)} A`,
            explication: 'En triangle, chaque enroulement est branché entre deux phases (il reçoit U), et le courant de ligne se partage entre deux enroulements : J = I / √3.',
            piege: 'La pince ampèremétrique sur un câble d\'alimentation mesure I (courant de ligne), jamais J.',
            erreurs: [
              { valeur: I * RACINE3, message: 'Tu as multiplié par √3 : en triangle, le courant dans l\'enroulement est plus petit que le courant de ligne.' },
              { valeur: I / 3, message: 'On divise par √3, pas par 3.' }
            ]
          };
        },
        () => {
          const Id = parmi([60, 90, 120, 150, 180, 240]);
          return {
            enonce: `Démarrage étoile-triangle : en direct (triangle), le courant de démarrage serait de ${Id} A. Courant de démarrage en étoile ?`,
            unite: 'A', reponse: Id / 3, donnees: { Id },
            solution: `En étoile, le courant de ligne au démarrage est divisé par 3 : ${Id} / 3 = ${nb(Id / 3)} A`,
            explication: 'En étoile, chaque enroulement reçoit U / √3 au lieu de U : son courant est divisé par √3. Et en triangle, le courant de ligne valait déjà √3 fois le courant d\'enroulement. Au total : √3 × √3 = 3. Le couple de démarrage est lui aussi divisé par 3.',
            piege: 'Le démarrage étoile-triangle ne convient qu\'aux machines qui démarrent à vide ou peu chargées : avec un couple divisé par 3, une charge lourde ne démarre pas.',
            erreurs: [{ valeur: Id / RACINE3, message: 'Le rapport est 3, pas √3 : la tension par enroulement et le passage triangle → étoile apportent chacun un facteur √3.' }]
          };
        }
      ])();
    }
  },

  {
    id: 'chute-mono',
    niveau: 2,
    titre: 'Chute de tension en monophasé',
    creer() {
      const { S, I } = parmi([
        { S: 1.5, I: 10 }, { S: 2.5, I: 16 }, { S: 2.5, I: 20 },
        { S: 4, I: 25 }, { S: 6, I: 32 }, { S: 10, I: 40 }
      ]);
      const L = parmi([15, 20, 25, 30, 40, 50]);
      const du = 2 * RHO_CUIVRE * L * I / S;
      const cable = `câble cuivre ${nb(S)} mm², L = ${L} m, I = ${I} A`;
      const commun = {
        aide: 'ρ cuivre = 0,0225 Ω·mm²/m · cos φ = 1 (réactance négligée)',
        explication: 'En monophasé, le courant fait l\'aller ET le retour : ΔU = 2 × ρ × L × I / S. En % : ΔU% = ΔU / 230 × 100. Pour une installation alimentée par le réseau public BT, la NF C 15-100 limite la chute de tension à 3 % pour l\'éclairage et 5 % pour les autres usages.',
        piege: 'Oublier le facteur 2 de l\'aller-retour, ou prendre ρ = 0,017 (cuivre à 20 °C) au lieu de 0,0225 (cuivre en service, plus chaud).'
      };
      return parmi([
        () => ({
          ...commun,
          enonce: `Circuit monophasé 230 V, ${cable}. Chute de tension ΔU ?`,
          unite: 'V', reponse: du, donnees: { S, I, L, en: 'V' },
          solution: `ΔU = 2 × ρ × L × I / S = 2 × 0,0225 × ${L} × ${I} / ${nb(S)} = ${nb(du)} V`,
          erreurs: [{ valeur: du / 2, message: 'Résultat deux fois trop petit : as-tu oublié le 2 de l\'aller-retour ?' }]
        }),
        () => ({
          ...commun,
          enonce: `Circuit monophasé 230 V, ${cable}. Chute de tension en % ?`,
          unite: '%', reponse: du / 230 * 100, donnees: { S, I, L, en: '%' },
          solution: `ΔU = 2 × ρ × L × I / S = ${nb(du)} V ; ΔU % = ${nb(du)} / 230 × 100 = ${nb(du / 230 * 100)} %`,
          erreurs: [
            { valeur: du / 2 / 230 * 100, message: 'Résultat deux fois trop petit : as-tu oublié le 2 de l\'aller-retour ?' },
            { valeur: du, message: 'Tu as donné ΔU en volts : pour un pourcentage, divise par 230 et multiplie par 100.' }
          ]
        })
      ])();
    }
  },

  // ---------------------------------------------------------------- Niveau III · Cas complexes
  {
    id: 'chute-tri',
    niveau: 3,
    titre: 'Chute de tension en triphasé',
    creer() {
      const { S, I } = parmi([{ S: 2.5, I: 20 }, { S: 4, I: 25 }, { S: 6, I: 32 }, { S: 10, I: 50 }, { S: 16, I: 63 }]);
      const L = parmi([30, 40, 50, 60, 80]);
      const du = RACINE3 * RHO_CUIVRE * L * I / S;
      return {
        enonce: `Ligne triphasée 400 V, câble cuivre ${nb(S)} mm², L = ${L} m, I = ${I} A. Chute de tension en % ?`,
        aide: 'ρ cuivre = 0,0225 Ω·mm²/m · cos φ = 1 (réactance négligée)',
        unite: '%', reponse: du / 400 * 100, donnees: { S, I, L },
        solution: `ΔU = √3 × ρ × L × I / S = 1,732 × 0,0225 × ${L} × ${I} / ${nb(S)} = ${nb(du)} V ; ΔU % = ${nb(du)} / 400 × 100 = ${nb(du / 400 * 100)} %`,
        explication: 'En triphasé équilibré, aucun courant ne revient par le neutre : la chute de tension entre phases vaut ΔU = √3 × ρ × L × I / S, à rapporter à U = 400 V. (Formule générale NF C 15-100 : u = b × (ρ × L / S × cos φ + λ × L × sin φ) × I, avec b = 1 en triphasé et b = 2 en monophasé, u étant rapportée à la tension simple.)',
        piege: 'Mettre le facteur 2 du monophasé, ou rapporter une chute mesurée entre phases à 230 V.',
        erreurs: [
          { valeur: 2 * RHO_CUIVRE * L * I / S / 400 * 100, message: '2 au lieu de √3 : en triphasé équilibré, il n\'y a pas de retour par le neutre, le facteur est √3.' },
          { valeur: du / 230 * 100, message: 'Tu as rapporté une chute entre phases à 230 V : rapporte-la à U = 400 V.' }
        ]
      };
    }
  },

  {
    id: 'compensation',
    niveau: 3,
    titre: 'Compensation du réactif',
    creer() {
      const P = parmi([50, 80, 120, 200]);
      const cos1 = parmi([0.7, 0.75, 0.8]);
      const cos2 = parmi([0.93, 0.95]);
      const t1 = tanDe(cos1);
      const t2 = tanDe(cos2);
      const Qc = P * (t1 - t2);
      return {
        enonce: `Atelier : P = ${P} kW, cos φ = ${nb(cos1)}. On veut relever le cos φ à ${nb(cos2)}. Puissance réactive des condensateurs Qc ?`,
        unite: 'kvar', reponse: Qc, donnees: { P, cos1, cos2 },
        solution: `tan φ1 = tan(arccos ${nb(cos1)}) = ${nb(t1, 3)} ; tan φ2 = tan(arccos ${nb(cos2)}) = ${nb(t2, 3)} ; Qc = P × (tan φ1 − tan φ2) = ${P} × (${nb(t1, 3)} − ${nb(t2, 3)}) = ${nb(Qc)} kvar`,
        explication: 'Avant compensation, l\'atelier consomme Q1 = P × tan φ1 ; on veut ne plus prendre au réseau que Q2 = P × tan φ2. Les condensateurs fournissent la différence : Qc = P × (tan φ1 − tan φ2). P ne change pas : un condensateur ne consomme quasiment pas de puissance active.',
        piege: 'Soustraire les cos φ au lieu des tan φ, ou arrondir les tan φ trop tôt (garde au moins 3 décimales).',
        erreurs: [
          { valeur: P * (cos2 - cos1), message: 'On soustrait les tan φ, pas les cos φ : Qc = P × (tan φ1 − tan φ2).' },
          { valeur: P * t1, message: 'P × tan φ1, c\'est toute la réactive consommée : on ne compense que jusqu\'à tan φ2, pas jusqu\'à zéro.' },
          { valeur: P * t2, message: 'P × tan φ2, c\'est la réactive qui restera après compensation, pas celle à installer.' }
        ]
      };
    }
  },

  {
    id: 'boucherot',
    niveau: 3,
    titre: 'Méthode de Boucherot',
    creer() {
      const P1 = parmi([11, 15, 22]);
      const cos1 = parmi([0.8, 0.85]);
      const P2 = parmi([6, 9, 12]);
      const Q1 = P1 * tanDe(cos1);
      const P = P1 + P2;
      const S = Math.sqrt(P * P + Q1 * Q1);
      const sommeS = P1 / cos1 + P2;
      const versI = s => s * 1000 / (RACINE3 * 400);
      const contexte = `Sur un même départ 400 V : un moteur de ${P1} kW absorbés (cos φ = ${nb(cos1)}) et un four résistif de ${P2} kW.`;
      const commun = {
        donnees: { P1, cos1, P2 },
        explication: 'Méthode de Boucherot : P totale = ΣP, Q totale = ΣQ (le four résistif a Q = 0, le moteur Q = P × tan φ), puis S = √(P² + Q²) et I = S / (√3 × U). On n\'additionne jamais directement les S ni les courants.',
        piege: 'Additionner les puissances apparentes ou les courants de chaque récepteur : ils ne sont pas en phase, la somme arithmétique est fausse (et surestime le courant).'
      };
      const etapes = `Q1 = ${P1} × tan(arccos ${nb(cos1)}) = ${nb(Q1)} kvar ; P = ${P1} + ${P2} = ${P} kW ; S = √(${P}² + ${nb(Q1)}²) = ${nb(S)} kVA`;
      return parmi([
        () => ({
          ...commun,
          enonce: `${contexte} Puissance apparente totale S ?`,
          unite: 'kVA', reponse: S,
          solution: etapes,
          erreurs: [
            { valeur: sommeS, message: 'Tu as additionné les puissances apparentes : interdit (Boucherot). Additionne les P, puis les Q, puis calcule S = √(P² + Q²).' },
            { valeur: P, message: 'Tu as oublié la réactive du moteur : S = √(P² + Q²), pas P.' }
          ]
        }),
        () => ({
          ...commun,
          enonce: `${contexte} Courant de ligne total I ?`,
          unite: 'A', reponse: versI(S),
          solution: `${etapes} ; I = S / (√3 × U) = ${nb(S * 1000, 0)} / (1,732 × 400) = ${nb(versI(S))} A`,
          erreurs: [
            { valeur: versI(sommeS), message: 'Tu as additionné les puissances apparentes (ou les courants) : passe par ΣP et ΣQ, puis S = √(P² + Q²).' },
            { valeur: versI(P), message: 'Tu as oublié la réactive du moteur : le courant se calcule avec S, pas avec P.' }
          ]
        })
      ])();
    }
  },

  {
    id: 'transfo',
    niveau: 3,
    titre: 'Transformateur : In et Icc',
    creer() {
      const S = parmi([100, 160, 250, 400, 630]);
      const ucc = parmi([4, 6]);
      const In = S * 1000 / (RACINE3 * 400);
      const Icc = In * 100 / ucc / 1000;
      return parmi([
        () => ({
          enonce: `Transformateur ${S} kVA, secondaire 400 V. Intensité nominale In au secondaire ?`,
          unite: 'A', reponse: In, donnees: { S, ucc, demande: 'In' },
          solution: `In = S / (√3 × U) = ${nb(S * 1000, 0)} / (1,732 × 400) = ${nb(In)} A`,
          explication: 'Au secondaire d\'un transformateur triphasé : In = S / (√3 × U), avec S en VA et U la tension composée. Repère utile : sous 400 V, In ≈ 1,44 × S (S en kVA).',
          piege: 'Oublier le √3 (courant 1,73 fois trop grand) ou garder S en kVA sans le convertir.',
          erreurs: [{ valeur: S * 1000 / 400, message: 'Tu as oublié le √3 : en triphasé, In = S / (√3 × U).' }]
        }),
        () => ({
          enonce: `Transformateur ${S} kVA, secondaire 400 V, ucc = ${ucc} %. Courant de court-circuit Icc au secondaire ?`,
          unite: 'kA', reponse: Icc, donnees: { S, ucc, demande: 'Icc' },
          solution: `In = ${nb(S * 1000, 0)} / (1,732 × 400) = ${nb(In)} A ; Icc = In × 100 / ucc = ${nb(In)} × 100 / ${ucc} = ${nb(In * 100 / ucc, 0)} A ≈ ${nb(Icc)} kA`,
          explication: 'ucc est la tension (en % de la tension nominale) qu\'il faut appliquer au primaire pour faire circuler In dans le secondaire court-circuité. Sous la pleine tension, le courant est donc 100 / ucc fois plus grand : Icc ≈ In × 100 / ucc (impédance du réseau amont négligée).',
          piege: 'Multiplier par ucc au lieu de diviser, ou rendre le résultat en A au lieu de kA. Cette valeur sert à choisir le pouvoir de coupure des disjoncteurs.',
          erreurs: [
            { valeur: In * ucc / 100 / 1000, message: 'Tu as multiplié par ucc : c\'est l\'inverse, Icc = In × 100 / ucc.' },
            { valeur: In / 1000, message: 'Tu as donné In, pas Icc : il reste à multiplier par 100 / ucc.' }
          ]
        })
      ])();
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

// Devine l'erreur la plus probable derrière une mauvaise réponse numérique (ou null).
export function diagnostiquer(ex, valeur) {
  for (const e of ex.erreurs ?? []) if (estJuste(valeur, e.valeur)) return e.message;
  const facteur = f => estJuste(valeur, ex.reponse * f) || estJuste(valeur, ex.reponse / f);
  if (facteur(1000)) return 'Ton résultat est 1 000 fois trop grand ou trop petit : vérifie les unités (W / kW, A / kA, Wh / kWh, mA / A).';
  if (facteur(10)) return 'Ton résultat est décalé d\'un facteur 10 : vérifie la position de la virgule.';
  if (facteur(RACINE3)) return 'Un facteur √3 (1,732) de trop ou en moins : vérifie si tu dois utiliser la tension simple V ou composée U.';
  return null;
}

export function creerSession(niveau) {
  const dispo = GENERATEURS.filter(g => g.niveau === niveau);
  const generateurs = melanger(Array.from({ length: TAILLE_SESSION }, (_, i) => dispo[i % dispo.length]));
  return {
    niveau,
    exercices: generateurs.map(g => ({ generateur: g, ...g.creer() })),
    index: 0,
    score: 0,
    xp: 0,
    resultats: []
  };
}

let sessionCourante = null;
export const sessionEnCours = () => sessionCourante; // utilisé par les tests automatisés

// Clavier à l'écran : remplace le clavier iOS, qui masquerait l'énoncé.
// Disposition d'un pavé numérique : Valider est la grande touche verticale sous le pouce droit.
const TOUCHES_CLAVIER = ['7', '8', '9', '⌫', '4', '5', '6', '1', '2', '3', '0', ','];
const LONGUEUR_MAX = 9;

export function renderCalcul({ vue, definirTitre, auNettoyage, params }) {
  definirTitre('Calculs flash');
  const niveau = Number(params?.get('n'));
  const diff = difficulte(niveau);
  if (!diff) {
    renderChoixNiveau(vue, {
      mode: 'calcul',
      titre: 'Calculs flash',
      sousTitre: 'Dix calculs, des valeurs différentes à chaque séance. Réponse acceptée à ±2 %.',
      href: n => `#/dojo/calcul?n=${n}`,
      nombre: n => `${GENERATEURS.filter(g => g.niveau === n).length} types de calcul`
    });
    return;
  }

  const session = sessionCourante = creerSession(niveau);
  let saisie = '';
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
  auNettoyage(() => document.removeEventListener('keydown', surTouche));

  const afficherExercice = () => {
    const ex = exerciceCourant();
    saisie = '';
    vue.innerHTML = `
      <p class="niveau-seance">${etiquetteNiveau(niveau, { long: true })}</p>
      ${enteteSession(session.index + 1, session.score, session.resultats)}
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
    window.scrollTo(0, 0);
  };

  // valeur : nombre saisi ou choix touché.
  const terminer = (ex, valeur) => {
    if (ex.termine) return;
    ex.termine = true;
    const juste = ex.choix ? valeur === ex.reponse : estJuste(valeur, ex.reponse);

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
    if (juste) {
      gain = diff.xp;
      session.score++;
      session.xp += gain;
      annoncerMontee(gagnerXP(gain));
    }

    const attendu = ex.choix ? ex.reponse : `${nb(ex.reponse)} ${ex.unite}`;
    const diagnostic = !juste && !ex.choix ? diagnostiquer(ex, valeur) : null;
    const calculPose = `<p class="surtitre">Le calcul posé</p><p class="solution">${esc(typo(ex.solution))}</p>`;
    const rappel = `<div class="lecon"><p class="lecon-titre">Rappel</p><p>${esc(typo(ex.explication))}</p></div>`;
    const piege = `<div class="piege-terrain"><p class="lecon-titre">Piège à éviter</p><p>${esc(typo(ex.piege))}</p></div>`;

    const derniere = session.index === session.exercices.length - 1;
    const zone = vue.querySelector('#correction');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        ${juste
          ? `<p class="verdict"><span class="tampon">Juste.</span><span class="gain">+${gain} XP</span></p>
             ${calculPose}
             <details class="approfondir"><summary>Revoir la méthode</summary>${rappel}${piege}</details>`
          : `<p class="verdict"><span class="tampon">Pas encore.</span></p>
             <p class="attendu">Ta réponse : <strong class="mono">${esc(typo(ex.choix ? valeur : `${nb(valeur)} ${ex.unite}`))}</strong> — il fallait <strong class="mono">${esc(typo(attendu))}</strong>.</p>
             ${diagnostic ? `<div class="diagnostic"><p class="lecon-titre">Ce qui s'est sans doute passé</p><p>${esc(typo(diagnostic))}</p></div>` : ''}
             ${rappel}
             ${calculPose}
             ${piege}`}
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
    noterSession('calcul', session.score, niveau);
    const suivantNiveau = DIFFICULTES.find(d => d.n === niveau + 1);
    afficherBilan(vue, {
      score: session.score,
      xpGagne: session.xp,
      onRejouer: () => renderCalcul({ vue, definirTitre, auNettoyage, params }),
      suite: session.score >= 8 && suivantNiveau ? { href: `#/dojo/calcul?n=${suivantNiveau.n}`, libelle: `Passer au niveau ${suivantNiveau.romain}` } : null
    });
  };

  afficherExercice();
}
