// Mode Calculs flash : 10 calculs d'un niveau de difficulté (et, au choix, d'un domaine technique),
// sans chrono, réponse acceptée à ±2 %. Chaque générateur fabrique un exercice avec des valeurs tirées
// au hasard, son calcul posé, un rappel de méthode, un piège de terrain, le risque humain et machine
// d'une erreur, la référence normative et les erreurs types qu'il sait reconnaître.

import { gagnerXP, noterReponse, noterSession, BAREME } from './xp.js';
import { TAILLE_SESSION, SEANCE_MIN_BONUS, enteteSession, afficherBilan, annoncerMontee } from './entrainement.js';
import { DIFFICULTES, difficulte, etiquetteNiveau, renderChoixNiveau, lienSeance } from './difficulte.js';
import { domaine, filtrerParDomaine, pucesDomaines } from './domaines.js';
import { blocRisque, ligneNorme } from './tuteur.js';
import { entier, parmi, melanger } from './hasard.js';
import { esc } from './util.js';
import { typo } from './mise-en-page.js';

export const TOLERANCE = 0.02;  // ±2 %
const RACINE3 = Math.sqrt(3);
const RHO_CUIVRE = 0.0225;      // Ω·mm²/m : valeur conventionnelle du cuivre en service (NF C 15-100)

// Nombre affiché à la française : 1234.5 → "1 234,5".
const nb = (x, decimales = 2) => x.toLocaleString('fr-FR', { maximumFractionDigits: decimales });
const tanDe = cos => Math.tan(Math.acos(cos));

// Un exercice = { enonce, aide?, unite, reponse (nombre), tolerance?, solution, explication, piege, erreurs, donnees }
//            ou { enonce, choix: [...], reponse (un des choix), solution, explication, piege, donnees } pour un QCM.
// erreurs : [{ valeur, message }] — si la réponse donnée tombe à ±2 % d'une de ces valeurs, le message s'affiche.
export const GENERATEURS = [
  // ---------------------------------------------------------------- Niveau I · Fondations
  {
    id: 'ohm',
    niveau: 1,
    titre: "Loi d'Ohm",
    domaines: ["tbt-cc", "mono-bt"],
    risque: "Sous-estimer un courant, c'est choisir un fil, un fusible ou un contact trop faibles : échauffement, isolant qui fond, départ de feu dans la goulotte. Se tromper d'un facteur 1 000 (Ω au lieu de kΩ) sur une résistance de limitation, c'est la faire brûler au premier essai.",
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
    domaines: ["mono-bt"],
    norme: "NF C 15-100",
    risque: "Une puissance mal évaluée fait sous-dimensionner câble et protection : le circuit chauffe en permanence sans déclencher, comme une rallonge enroulée sur son touret. L'isolant vieillit, puis c'est l'incendie.",
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
    id: 'tension-attendue',
    niveau: 1,
    titre: 'Tension attendue au récepteur',
    domaines: ["mono-bt"],
    norme: "NF C 15-100 (§ 525)",
    risque: "Une chute de tension excessive fait chauffer les moteurs (couple réduit, courant en hausse) et décrocher les contacteurs. Et quand elle vient d'une connexion desserrée, ce point chauffe jusqu'à fondre l'isolant et amorcer.",
    creer() {
      return parmi([
        () => {
          const depart = parmi([229, 231, 233, 235]);
          const chute = parmi([4.6, 6.9, 9.2, 11.5, 13.8]);
          const arrivee = depart - chute;
          return {
            enonce: `Charge en marche, tu mesures ${nb(depart)} V au tableau et ${nb(arrivee)} V aux bornes du récepteur. Chute de tension en % (par rapport à 230 V) ?`,
            unite: '%', reponse: chute / 230 * 100, donnees: { type: 'mesure', depart, arrivee },
            solution: `ΔU = ${nb(depart)} − ${nb(arrivee)} = ${nb(chute)} V ; ΔU % = ${nb(chute)} / 230 × 100 = ${nb(chute / 230 * 100)} %`,
            explication: 'Deux mesures en charge, au départ et à l\'arrivée, donnent directement la chute de tension réelle de la ligne : ΔU = U départ − U arrivée, rapportée à la tension nominale (230 V). Repère NF C 15-100 (réseau public BT) : 3 % pour l\'éclairage, 5 % pour les autres usages.',
            piege: 'Mesurer à vide : sans courant, il n\'y a pas de chute, et les deux valeurs sont identiques. La mesure ne vaut qu\'avec le récepteur en marche.',
            erreurs: [
              { valeur: chute, message: 'Tu as donné la chute en volts : divise par 230 et multiplie par 100 pour l\'avoir en %.' },
              { valeur: arrivee / 230 * 100, message: 'Ça, c\'est la tension restante en % de 230 V, pas la chute.' }
            ]
          };
        },
        () => {
          const { S, I } = parmi([{ S: 1.5, I: 10 }, { S: 2.5, I: 16 }, { S: 2.5, I: 20 }, { S: 4, I: 25 }]);
          const L = parmi([20, 25, 30, 40]);
          const depart = parmi([230, 232, 234]);
          const du = 2 * RHO_CUIVRE * L * I / S;
          return {
            enonce: `Tu mesures ${depart} V au départ d'un circuit monophasé : câble cuivre ${nb(S)} mm², ${L} m, récepteur de ${I} A en marche. Quelle tension dois-tu lire aux bornes du récepteur ?`,
            aide: 'ρ cuivre = 0,0225 Ω·mm²/m · cos φ = 1 · réponse au volt près',
            unite: 'V', reponse: depart - du, tolerance: 0.004, donnees: { type: 'estimation', S, I, L, depart },
            solution: `ΔU = 2 × ρ × L × I / S = 2 × 0,0225 × ${L} × ${I} / ${nb(S)} = ${nb(du)} V ; U attendue = ${depart} − ${nb(du)} = ${nb(depart - du)} V`,
            explication: 'Avant de mesurer, calcule ce que tu devrais lire : U attendue = U départ − ΔU, avec ΔU = 2 × ρ × L × I / S en monophasé. Si la mesure est nettement plus basse que la valeur attendue, cherche une résistance en trop : connexion desserrée, borne oxydée, section plus faible que prévu.',
            piege: 'Une chute anormale localisée vient souvent d\'un seul point de connexion qui chauffe : la caméra thermique ou une mesure de tension borne par borne le trouve vite.',
            erreurs: [
              { valeur: depart - du / 2, message: 'Tu n\'as compté qu\'un seul conducteur : en monophasé, le courant fait l\'aller et le retour (facteur 2).' },
              { valeur: du, message: 'Tu as donné la chute ΔU, pas la tension que tu dois lire au récepteur.' },
              { valeur: depart + du, message: 'La chute se retranche de la tension de départ, elle ne s\'ajoute pas.' }
            ]
          };
        }
      ])();
    }
  },

  {
    id: 'alim-24v',
    niveau: 1,
    titre: 'Alimentation 24 V DC',
    domaines: ['tbt-cc'],
    norme: 'IEC 61131-2 (24 V DC : plage 20,4 à 28,8 V)',
    risque: "Une alimentation calculée au plus juste s'écroule quand les bobines collent ensemble : la tension passe sous 20 V, l'automate redémarre, des sorties retombent en plein cycle et la machine fait des mouvements incohérents.",
    creer() {
      const api = parmi([0.4, 0.5, 0.6, 0.8]);
      const nCapteurs = parmi([6, 8, 10, 12, 16]);
      const iCapteur = 0.025;
      const nEv = parmi([2, 3, 4, 5]);
      const pEv = parmi([4.8, 7.2, 9.6]);
      const charge = api + nCapteurs * iCapteur + nEv * pEv / 24;
      const I = charge * 1.25;
      return {
        enonce: `Une alimentation 24 V DC doit fournir : un automate (${nb(api)} A), ${nCapteurs} capteurs à 25 mA et ${nEv} électrovannes de ${nb(pEv)} W. Avec 25 % de réserve, quel courant minimal doit-elle délivrer ?`,
        aide: 'Électrovanne : I = P / 24 V',
        unite: 'A', reponse: I, donnees: { api, nCapteurs, nEv, pEv },
        solution: `I = ${nb(api)} + ${nCapteurs} × 0,025 + ${nEv} × ${nb(pEv)} / 24 = ${nb(charge, 3)} A ; avec la réserve : ${nb(charge, 3)} × 1,25 = ${nb(I, 3)} A`,
        explication: 'On additionne toutes les consommations en ampères (P / U pour les charges données en watts), puis on ajoute une réserve de 20 à 30 % pour les appels de courant des bobines et les extensions futures. On choisit ensuite le calibre standard juste au-dessus (2,5 / 5 / 10 / 20 A).',
        piege: 'Les électrovannes et les relais ont un courant d\'appel : une alimentation calculée sans réserve décroche au moment précis où tout colle en même temps. Et un capteur à 25 mA « ne compte pas » jusqu\'à ce qu\'il y en ait seize.',
        erreurs: [
          { valeur: charge, message: 'Tu as oublié la réserve de 25 % : multiplie la somme des courants par 1,25.' },
          { valeur: (api + nCapteurs * iCapteur + nEv * pEv) * 1.25, message: 'Tu as additionné les watts des électrovannes comme des ampères : convertis d\'abord, I = P / 24.' },
          { valeur: (api + nEv * pEv / 24) * 1.25, message: 'Tu as oublié les capteurs : ' + nCapteurs + ' × 25 mA, ça compte.' }
        ]
      };
    }
  },

  {
    id: 'tensions-reseau',
    niveau: 1,
    titre: 'Tension simple et tension composée',
    domaines: ['tri'],
    norme: 'IEC 60038 (tensions normales)',
    risque: "Brancher un récepteur 230 V entre deux phases d'un réseau 400 V le détruit instantanément (alimentation électronique, bobine de contacteur), parfois avec un départ de feu. Et lire une plaque « 230/400 V » de travers mène au mauvais couplage du moteur.",
    creer() {
      const U = parmi([400, 690, 230]);
      const V = U / RACINE3;
      const explication = 'En triphasé équilibré, la tension composée (entre deux phases) vaut √3 fois la tension simple (entre une phase et le neutre) : U = V × √3. Réseau 400 V → 230 V phase-neutre ; réseau 690 V (gros moteurs, éolien) → 400 V ; ancien réseau 230 V triphasé → 133 V.';
      const piege = 'Sur un réseau trois fils, sans neutre distribué, il n\'y a pas de tension simple à lire : une mesure phase-terre y dépend du schéma de liaison à la terre (en IT, une phase peut se retrouver presque au potentiel de la terre).';
      return parmi([
        () => ({
          enonce: `Réseau triphasé ${U} V entre phases, neutre distribué. Quelle tension dois-tu lire entre une phase et le neutre ?`,
          unite: 'V', reponse: V, donnees: { U, demande: 'V' },
          solution: `V = U / √3 = ${U} / 1,732 = ${nb(V, 1)} V`,
          explication, piege,
          erreurs: [
            { valeur: U * RACINE3, message: 'Tu as multiplié par √3 : la tension simple est la plus petite des deux, V = U / √3.' },
            { valeur: U / 2, message: 'Ce n\'est pas une moitié : en triphasé, le rapport entre U et V vaut √3 (1,732), pas 2.' }
          ]
        }),
        () => ({
          enonce: `Entre une phase et le neutre d'un réseau triphasé, tu lis ${nb(V, 0)} V. Quelle tension dois-tu lire entre deux phases ?`,
          unite: 'V', reponse: U, donnees: { U, demande: 'U' },
          solution: `U = V × √3 = ${nb(V, 0)} × 1,732 = ${nb(U, 0)} V`,
          explication, piege,
          erreurs: [
            { valeur: V / RACINE3, message: 'Tu as divisé par √3 : entre deux phases, la tension est plus grande, U = V × √3.' },
            { valeur: V * 2, message: 'Les deux tensions simples ne s\'additionnent pas : elles sont décalées de 120°. U = V × √3, pas 2 × V.' }
          ]
        })
      ])();
    }
  },

  {
    id: 'courant-corps',
    niveau: 1,
    titre: 'Courant à travers le corps',
    domaines: ['securite'],
    norme: 'IEC 60479-1 · NF C 15-100 (§ 411)',
    risque: "À 230 V, quelques centaines de milliampères peuvent traverser le corps : fibrillation cardiaque, brûlures internes, chute de hauteur. La TBT n'est pas « sans risque » : en local mouillé, la tension limite tombe à 25 V, et à 12 V là où le corps est immergé.",
    creer() {
      const U = parmi([50, 230, 400]);
      const R = parmi([1000, 2000, 5000]);
      const I = U / R * 1000;
      return {
        enonce: `Contact main-pieds avec une pièce sous ${U} V. Résistance totale (corps et chaussures) : ${nb(R, 0)} Ω. Courant qui traverse le corps, en mA ?`,
        unite: 'mA', reponse: I, donnees: { U, R },
        solution: `I = U / R = ${U} / ${nb(R, 0)} = ${nb(U / R, 3)} A = ${nb(I, 1)} mA`,
        explication: 'Loi d\'Ohm appliquée au corps : I = U / R. Ordres de grandeur en 50 Hz (IEC 60479-1) : 0,5 mA, seuil de perception ; une dizaine de mA, contraction musculaire, on ne peut plus lâcher ; au-delà de quelques dizaines de mA pendant une fraction de seconde, risque de fibrillation cardiaque. D\'où les 30 mA des différentiels de protection des personnes.',
        piege: 'La résistance du corps n\'est pas fixe : elle chute avec la tension, la sueur, l\'eau et la surface de contact. La même pièce sous 230 V peut faire passer quelques dizaines de mA mains sèches et plusieurs centaines pieds dans l\'eau.',
        erreurs: [
          { valeur: U / R, message: 'Résultat en ampères : multiplie par 1 000 pour l\'avoir en milliampères.' },
          { valeur: R / U, message: 'Tu as divisé R par U : le courant, c\'est I = U / R.' }
        ]
      };
    }
  },

  {
    id: 'rapport-transfo',
    niveau: 1,
    titre: 'Rapport d\'un transformateur de poste',
    domaines: ['hta', 'tri'],
    norme: 'IEC 60076-1',
    risque: "Une BT durablement trop haute fait vieillir les isolants et griller lampes et électronique ; trop basse, les moteurs chauffent et les contacteurs vibrent. La correction se fait par les prises du transformateur, hors tension, par du personnel habilité HTA.",
    creer() {
      const U1 = parmi([19.6, 20.4, 20.8, 21]);
      const U2 = U1 * 410 / 20;
      return {
        enonce: `Transformateur 20 kV / 410 V, à vide, prise centrale. La HTA est à ${nb(U1, 1)} kV. Tension entre phases au secondaire ?`,
        aide: 'Réponse au volt près',
        unite: 'V', reponse: U2, tolerance: 0.004, donnees: { U1 },
        solution: `U2 = U1 × U2n / U1n = ${nb(U1, 1)} × 410 / 20 = ${nb(U2, 1)} V`,
        explication: 'À vide, le transformateur divise toutes les tensions dans son rapport : U2 = U1 × U2n / U1n. La HTA varie de quelques % autour de 20 kV, la BT suit dans la même proportion. La plaque indique 410 V à vide : en charge, la chute interne ramène vers 400 V.',
        piege: 'Une BT « trop haute » le dimanche et « trop basse » en semaine n\'est pas une panne : c\'est la HTA qui varie avec la charge du réseau. On compare à la tension HTA du moment avant d\'accuser le transformateur.',
        erreurs: [
          { valeur: U1 * 400 / 20, message: 'Tu as pris 400 V : la plaque d\'un transformateur de poste donne la tension à vide, ici 410 V.' },
          { valeur: 410, message: 'La BT ne reste pas fixe à 410 V : elle suit les variations de la HTA, dans le rapport du transformateur.' }
        ]
      };
    }
  },

  // ---------------------------------------------------------------- Niveau II · Pratique courante
  {
    id: 'triphase',
    niveau: 2,
    titre: 'Puissances en triphasé',
    domaines: ["tri"],
    risque: "Confondre kW, kVA et kvar, c'est mal choisir un transformateur ou un groupe électrogène, qui se dimensionnent en kVA : choisi sur des kW avec un mauvais cos φ, le groupe s'écroule à la première grosse charge inductive.",
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
    domaines: ["tri"],
    norme: "IEC 60947-4-1",
    risque: "Un In mal calculé fausse le réglage de la protection : trop haut, le moteur grille sur une surcharge sans que rien ne déclenche ; trop bas, la machine s'arrête en production, et quelqu'un finit par « monter le réglage ».",
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
    domaines: ["tri"],
    norme: "IEC 60034-1 (plaque moteur)",
    risque: "Un moteur 230/400 V couplé en triangle sur un réseau 400 V voit 400 V sur chaque enroulement au lieu de 230 V : courant multiplié, isolant détruit en quelques minutes, fumée dans l'armoire.",
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
    domaines: ["mono-bt"],
    norme: "NF C 15-100 (§ 525)",
    risque: "Câble trop long ou trop fin : la chute de tension fait mal démarrer les moteurs monophasés, et la section trop faible chauffe. Une longue rallonge restée enroulée peut fondre.",
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

  {
    id: 'charge-moteur',
    niveau: 2,
    titre: 'Courant mesuré et plaque moteur',
    domaines: ["tri"],
    norme: "IEC 60034-1",
    risque: "Un moteur qui tire durablement plus que son In vieillit vite : chaque dizaine de degrés de trop divise environ par deux la durée de vie de son isolant. Un courant très inférieur à l'In peut aussi signaler un accouplement cassé ou une pompe désamorcée.",
    creer() {
      const moteur = parmi([{ P: 4, I: 8.2 }, { P: 5.5, I: 11 }, { P: 7.5, I: 14.8 }, { P: 11, I: 21.5 }]);
      const plaque = parmi([
        { tensions: '230/400 V', courants: [moteur.I * RACINE3, moteur.I], In: moteur.I, autre: moteur.I * RACINE3, couplage: 'étoile' },
        { tensions: '400/690 V', courants: [moteur.I, moteur.I / RACINE3], In: moteur.I, autre: moteur.I / RACINE3, couplage: 'triangle' }
      ]);
      const taux = parmi([0.55, 0.7, 0.85, 0.95, 1.08]);
      const mesures = [1.01, 0.98, 1.0].map(k => Math.round(moteur.I * taux * k * 10) / 10);
      const moyenne = mesures.reduce((a, b) => a + b, 0) / 3;
      const reponse = moyenne / plaque.In * 100;
      const lecture = `${nb(plaque.courants[0], 1)}/${nb(plaque.courants[1], 1)} A`;
      return {
        enonce: `Plaque moteur : ${nb(moteur.P)} kW, ${plaque.tensions}, ${lecture}. Réseau 400 V. À la pince, tu mesures ${mesures.map(m => nb(m, 1)).join(' A, ')} A. Charge du moteur en % de son In ?`,
        unite: '%', reponse, donnees: { In: plaque.In, mesures },
        solution: `Sur 400 V, le moteur est couplé en ${plaque.couplage} : In = ${nb(plaque.In, 1)} A. I moyen = (${mesures.map(m => nb(m, 1)).join(' + ')}) / 3 = ${nb(moyenne)} A ; charge = ${nb(moyenne)} / ${nb(plaque.In, 1)} × 100 = ${nb(reponse, 1)} %`,
        explication: 'Sur la plaque, chaque courant correspond à une tension : on prend celui de la tension du réseau (ici 400 V). Comparer le courant mesuré à cet In dit tout de suite si le moteur est sain : durablement au-dessus de 100 %, il chauffe (surcharge mécanique, tension basse, déséquilibre) ; très en dessous de 50 %, il est surdimensionné et son cos φ se dégrade.',
        piege: 'Lire le mauvais courant sur la plaque, ou mesurer en sortie de variateur avec une pince non TRMS : elle sous-estime nettement le courant sur une forme d\'onde déformée.',
        erreurs: [
          { valeur: moyenne / plaque.autre * 100, message: 'Tu as pris l\'autre courant de la plaque : sur un réseau 400 V, c\'est celui qui correspond à 400 V qui compte.' },
          { valeur: plaque.In / moyenne * 100, message: 'Rapport inversé : charge = I mesuré / In × 100.' }
        ]
      };
    }
  },

  {
    id: 'chute-24v',
    niveau: 2,
    titre: 'Chute de tension en 24 V DC',
    domaines: ['tbt-cc'],
    norme: 'IEC 61131-2 · NF C 15-100 (§ 525)',
    risque: "Sous-alimentée, une électrovanne colle mal ou vibre, sa bobine chauffe, et le vérin peut ne pas finir sa course : capteur de fin de course jamais atteint, machine bloquée en cycle, ou mouvement incomplet là où quelqu'un croit la pièce bloquée.",
    creer() {
      const P = parmi([12, 18, 24]);
      const I = P / 24;
      const S = parmi([0.5, 0.75, 1]);
      const L = parmi([40, 50, 60, 80]);
      const du = 2 * RHO_CUIVRE * L * I / S;
      const U = 24 - du;
      return {
        enonce: `Électrovanne 24 V DC de ${P} W, à ${L} m de l'alimentation, câble cuivre ${nb(S)} mm². L'alimentation délivre 24,0 V. Quelle tension dois-tu lire aux bornes de l'électrovanne, bobine alimentée ?`,
        aide: 'ρ cuivre = 0,0225 Ω·mm²/m · I = P / 24 V · réponse au dixième de volt',
        unite: 'V', reponse: U, tolerance: 0.004, donnees: { P, S, L },
        solution: `I = ${P} / 24 = ${nb(I, 3)} A ; ΔU = 2 × 0,0225 × ${L} × ${nb(I, 3)} / ${nb(S)} = ${nb(du)} V ; U = 24 − ${nb(du)} = ${nb(U)} V`,
        explication: 'Même formule qu\'en monophasé : ΔU = 2 × ρ × L × I / S, aller et retour (le + et le 0 V). En 24 V, chaque volt perdu pèse lourd : 1 V, c\'est déjà plus de 4 %. Beaucoup d\'électrovannes ne garantissent leur fonctionnement que jusqu\'à −10 % (21,6 V) : vérifie la notice.',
        piege: 'Une longueur sans importance en 230 V devient critique en 24 V. Mesure toujours bobine alimentée : à vide, tu lis 24 V partout et la chute reste invisible.',
        erreurs: [
          { valeur: 24 - du / 2, message: 'Tu n\'as compté qu\'un conducteur : le courant va par le + et revient par le 0 V (facteur 2).' },
          { valeur: du, message: 'Tu as donné la chute ΔU, pas la tension à lire aux bornes de l\'électrovanne.' },
          { valeur: 24 + du, message: 'La chute se retranche de la tension de départ, elle ne s\'ajoute pas.' }
        ]
      };
    }
  },

  {
    id: 'contact-tt',
    niveau: 2,
    titre: 'Défaut d\'isolement en schéma TT',
    domaines: ['securite', 'mono-bt'],
    norme: 'NF C 15-100 (§ 411.5) · UL = 50 V en local sec',
    risque: "Une prise de terre trop résistante laisse une masse en défaut sous une tension dangereuse : si le courant de défaut reste sous le seuil du différentiel, rien ne coupe, et la personne qui touche la carcasse est traversée par le courant.",
    creer() {
      return parmi([
        () => {
          const Ra = parmi([30, 50, 80, 100]);   // toujours au moins 2 × Rb : l'erreur « Rb × Id » reste distincte
          const Rb = parmi([5, 10, 15]);
          const Id = 230 / (Ra + Rb);
          const Uc = Ra * Id;
          return {
            enonce: `Schéma TT. Une phase touche la carcasse métallique d'une machine. Prise de terre des masses Ra = ${Ra} Ω, prise de terre du neutre Rb = ${Rb} Ω. Tension de contact sur la carcasse ?`,
            aide: 'U0 = 230 V · on néglige les câbles',
            unite: 'V', reponse: Uc, donnees: { type: 'uc', Ra, Rb },
            solution: `Id = 230 / (${Ra} + ${Rb}) = ${nb(Id)} A ; Uc = Ra × Id = ${Ra} × ${nb(Id)} = ${nb(Uc, 1)} V`,
            explication: 'En TT, le courant de défaut traverse les deux prises de terre en série : Id = U0 / (Ra + Rb). La carcasse monte à Uc = Ra × Id. Au-delà de 50 V (local sec), c\'est dangereux : le différentiel doit couper.',
            piege: 'Le courant de défaut ne fait que quelques ampères : un disjoncteur de 16 A ne le voit même pas. En TT, seul le différentiel protège contre ce défaut.',
            erreurs: [
              { valeur: Rb * Id, message: 'Tu as calculé la tension aux bornes de Rb (la terre du neutre). La personne touche la carcasse : c\'est Ra × Id.' },
              { valeur: 230, message: 'Les deux prises de terre forment un diviseur de tension : la carcasse ne monte pas à 230 V, mais à Ra / (Ra + Rb) × 230.' }
            ]
          };
        },
        () => {
          const IdnMA = parmi([30, 100, 300, 500]);
          const RaMax = 50 / (IdnMA / 1000);
          return {
            enonce: `Schéma TT, local sec (UL = 50 V). Les masses sont protégées par un différentiel de ${IdnMA} mA. Valeur maximale de la prise de terre Ra ?`,
            unite: 'Ω', reponse: RaMax, donnees: { type: 'ramax', IdnMA },
            solution: `Ra ≤ UL / IΔn = 50 / ${nb(IdnMA / 1000, 3)} = ${nb(RaMax, 1)} Ω`,
            explication: 'Condition de protection en TT : Ra × IΔn ≤ UL. Au seuil de déclenchement du différentiel, la carcasse ne doit pas dépasser 50 V (25 V en local mouillé). D\'où Ra ≤ UL / IΔn, avec IΔn en ampères.',
            piege: 'Le 30 mA des prises protège même avec une terre médiocre, mais un différentiel de tête à 300 ou 500 mA exige une terre bien plus basse. Ra se mesure (telluromètre ou boucle de défaut), elle ne se suppose pas.',
            erreurs: [
              { valeur: 25 / (IdnMA / 1000), message: '25 V, c\'est la limite des locaux mouillés. Ici, local sec : UL = 50 V.' },
              { valeur: 50 * IdnMA / 1000, message: 'Tu as multiplié : la condition Ra × IΔn ≤ UL donne Ra ≤ UL / IΔn.' }
            ]
          };
        }
      ])();
    }
  },

  {
    id: 'prise-transfo',
    niveau: 2,
    titre: 'Prises de réglage d\'un transformateur',
    domaines: ['hta'],
    norme: 'IEC 60076-1 · NF C 18-510',
    risque: "Manœuvrer le changeur de prises sous tension, c'est ouvrir un enroulement en charge dans la cuve : arc dans l'huile, gaz, déclenchement du DGPT2 au mieux, éclatement de la cuve au pire. Et une prise réglée dans le mauvais sens aggrave l'écart de tension sur tout le site.",
    creer() {
      const { U1, p } = parmi([{ U1: 20.6, p: 2.5 }, { U1: 20.8, p: 2.5 }, { U1: 21.2, p: 5 }, { U1: 19.4, p: -2.5 }, { U1: 19.2, p: -2.5 }]);
      const U2 = U1 * 410 / (20 * (1 + p / 100));
      const prise = `${p > 0 ? '+' : '−'}${nb(Math.abs(p), 1)} %`;
      return {
        enonce: `Transformateur 20 kV / 410 V, à vide. La HTA est à ${nb(U1, 1)} kV ; pour corriger la BT, la prise a été passée sur ${prise}. Tension BT à vide ?`,
        aide: 'Réponse au volt près',
        unite: 'V', reponse: U2, tolerance: 0.004, donnees: { U1, p },
        solution: `Primaire réglé pour 20 × (1 ${p > 0 ? '+' : '−'} ${nb(Math.abs(p) / 100, 3)}) = ${nb(20 * (1 + p / 100), 2)} kV ; U2 = ${nb(U1, 1)} × 410 / ${nb(20 * (1 + p / 100), 2)} = ${nb(U2, 1)} V`,
        explication: 'Une prise « +2,5 % » ajoute des spires au primaire : le transformateur attend 20,5 kV pour donner 410 V. À HTA égale, la BT baisse donc de 2,5 %. Pour baisser une BT trop haute, on monte la prise ; pour la remonter, on la baisse. U2 = U1 × 410 / (20 × (1 + prise)).',
        piege: 'Le sens des prises se trompe facilement : on raisonne sur le primaire, pas sur la BT. Et le changeur de prises se manœuvre transformateur hors tension, consigné côté HTA et côté BT.',
        erreurs: [
          { valeur: U1 * 410 / 20 * (1 + p / 100), message: 'Tu as appliqué la prise dans le mauvais sens : une prise positive ajoute des spires au primaire, elle fait BAISSER la BT.' },
          { valeur: U1 * 410 / 20, message: 'Tu as oublié la prise : le transformateur n\'est plus réglé pour 20 kV mais pour 20 × (1 + prise).' }
        ]
      };
    }
  },

  // ---------------------------------------------------------------- Niveau III · Cas complexes
  {
    id: 'chute-tri',
    niveau: 3,
    titre: 'Chute de tension en triphasé',
    domaines: ["tri"],
    norme: "NF C 15-100 (§ 525)",
    risque: "Au démarrage, le courant vaut 6 à 8 fois l'In : une ligne déjà limite en régime établi fait chuter la tension au point que le moteur ne décolle pas, chauffe, et que les contacteurs voisins retombent.",
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
    domaines: ["tri"],
    norme: "IEC 60831-1",
    risque: "Une batterie de condensateurs surdimensionnée surcompense : surtensions, résonance avec les harmoniques des variateurs, condensateurs qui gonflent ou éclatent. Et une batterie reste chargée après coupure : on attend la décharge et on vérifie avant d'intervenir.",
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
    domaines: ["tri"],
    risque: "Additionner directement des kVA de cos φ différents fausse le bilan : transformateur ou groupe mal choisi, protection de tête mal réglée, déclenchements à la mise en route de l'atelier.",
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
    domaines: ["tri", "hta"],
    norme: "NF C 15-100 (§ 434) · IEC 60076-5",
    risque: "Un Icc sous-estimé fait installer des disjoncteurs dont le pouvoir de coupure est trop faible : au premier court-circuit franc près du transformateur, l'appareil explose au lieu de couper, devant la personne qui se trouve face à l'armoire.",
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
  },

  {
    id: 'desequilibre',
    niveau: 3,
    titre: 'Déséquilibre entre phases',
    domaines: ["tri"],
    norme: "IEC 60034-26",
    risque: "Quelques % de déséquilibre de tension donnent un déséquilibre de courant bien plus fort et un échauffement supplémentaire du moteur, qui doit alors être déclassé. C'est souvent le signe d'une connexion qui chauffe ou d'un contact usé sur une phase.",
    creer() {
      const ecarts = parmi([[1.02, 0.95, 1.01], [1.05, 0.97, 0.99], [0.96, 1.03, 1.04], [1.0, 1.06, 0.93]]);
      const pct = valeurs => {
        const moy = valeurs.reduce((a, b) => a + b, 0) / 3;
        return { moy, ecart: Math.max(...valeurs.map(v => Math.abs(v - moy))), etendue: Math.max(...valeurs) - Math.min(...valeurs) };
      };
      const methode = 'Déséquilibre (%) = écart maximal à la moyenne / moyenne × 100 : c\'est la définition la plus utilisée sur le terrain (NEMA MG1).';
      return parmi([
        () => {
          const base = parmi([12, 18, 25, 32]);
          const I = ecarts.map(k => Math.round(base * k * 10) / 10);
          const { moy, ecart, etendue } = pct(I);
          return {
            enonce: `À la pince, sur les trois phases d'un moteur : ${I.map(v => nb(v, 1)).join(' A, ')} A. Déséquilibre de courant en % ?`,
            unite: '%', reponse: ecart / moy * 100, donnees: { valeurs: I },
            solution: `I moyen = ${nb(moy)} A ; écart maximal = ${nb(ecart)} A ; déséquilibre = ${nb(ecart)} / ${nb(moy)} × 100 = ${nb(ecart / moy * 100)} %`,
            explication: `${methode} Quelques % de déséquilibre de courant sont courants ; au-delà d'une dizaine de %, on cherche la cause.`,
            piege: 'Pour savoir d\'où vient un déséquilibre de courant, permute les trois phases au départ moteur (consigné) : s\'il suit la phase, c\'est le réseau ; s\'il reste sur la même borne du moteur, c\'est le moteur ou sa liaison.',
            erreurs: [{ valeur: etendue / moy * 100, message: 'Tu as pris l\'écart entre la plus grande et la plus petite valeur : on compare l\'écart maximal à la MOYENNE.' }]
          };
        },
        () => {
          const U = ecarts.map(k => Math.round(400 * (1 + (k - 1) / 4)));
          const { moy, ecart, etendue } = pct(U);
          return {
            enonce: `Tensions entre phases au départ d'un moteur : ${U.join(' V, ')} V. Déséquilibre de tension en % ?`,
            unite: '%', reponse: ecart / moy * 100, donnees: { valeurs: U },
            solution: `U moyenne = ${nb(moy)} V ; écart maximal = ${nb(ecart)} V ; déséquilibre = ${nb(ecart)} / ${nb(moy)} × 100 = ${nb(ecart / moy * 100)} %`,
            explication: `${methode} Un faible déséquilibre de tension crée un déséquilibre de courant bien plus fort (de l'ordre de 6 à 10 fois) : au-delà d'environ 1 %, le moteur chauffe et doit être déclassé.`,
            piege: 'Un déséquilibre de tension vient souvent d\'un récepteur monophasé important branché sur une seule phase, ou d\'une connexion qui chauffe en amont.',
            erreurs: [{ valeur: etendue / moy * 100, message: 'Tu as pris l\'écart entre la plus grande et la plus petite tension : on compare l\'écart maximal à la MOYENNE.' }]
          };
        }
      ])();
    }
  },

  {
    id: 'hta-courant',
    niveau: 3,
    titre: 'Courant côté HTA d\'un poste',
    domaines: ['hta', 'tri'],
    norme: 'NF C 13-100 · IEC 60076-1',
    risque: "Un fusible HTA trop petit fond à l'enclenchement du transformateur (courant d'appel magnétisant) ; trop gros, il ne protège plus contre un défaut interne. Le calibre se choisit sur les tableaux du constructeur, jamais au jugé, et toute manœuvre HTA demande l'habilitation correspondante.",
    creer() {
      return parmi([
        () => {
          const S = parmi([250, 400, 630, 1000, 1250]);
          const I = S / (RACINE3 * 20);
          return {
            enonce: `Transformateur de poste ${S} kVA, 20 kV / 400 V. Courant nominal côté HTA ?`,
            unite: 'A', reponse: I, donnees: { type: 'in', S },
            solution: `I = S / (√3 × U) = ${S} / (1,732 × 20) = ${nb(I)} A`,
            explication: 'Même formule qu\'en BT, I = S / (√3 × U), mais avec U = 20 kV : la tension est 50 fois plus élevée qu\'en 400 V, le courant 50 fois plus faible. Un 630 kVA tire environ 18 A en HTA pour 909 A en BT.',
            piege: 'Un courant HTA faible ne veut pas dire un danger faible : en 20 kV, l\'arc s\'amorce à distance, sans contact. Les distances et l\'habilitation HTA s\'appliquent avant même de toucher quoi que ce soit.',
            erreurs: [
              { valeur: S / (RACINE3 * 0.4), message: 'Tu as pris 400 V : c\'est le courant côté BT. Côté HTA, la tension vaut 20 kV.' },
              { valeur: S / 20, message: 'Tu as oublié √3 : en triphasé, I = S / (√3 × U).' }
            ]
          };
        },
        () => {
          const Ibt = parmi([350, 500, 640, 800]);
          const I = Ibt * 0.4 / 20;
          return {
            enonce: `Tu mesures ${Ibt} A sur une phase BT d'un transformateur 20 kV / 400 V. Quel courant circule dans une phase HTA (charge équilibrée, pertes négligées) ?`,
            unite: 'A', reponse: I, donnees: { type: 'rapport', Ibt },
            solution: `Même puissance des deux côtés : I HTA = I BT × U BT / U HTA = ${Ibt} × 0,4 / 20 = ${nb(I)} A`,
            explication: 'La puissance traverse le transformateur : √3 × U HTA × I HTA = √3 × U BT × I BT (pertes négligées). Les courants sont dans le rapport inverse des tensions : 20 kV / 400 V = 50, donc I HTA = I BT / 50.',
            piege: 'Le rapport s\'applique entre courants de ligne et tensions composées : le couplage Dyn ne change pas ce résultat, le √3 s\'élimine des deux côtés.',
            erreurs: [
              { valeur: Ibt * 50, message: 'Tu as multiplié par 50 : côté HTA, la tension est plus élevée, donc le courant plus faible. Divise.' }
            ]
          };
        }
      ])();
    }
  },

  {
    id: 'lmax-tn',
    niveau: 3,
    titre: 'Longueur maximale protégée en TN',
    domaines: ['securite', 'mono-bt'],
    norme: 'NF C 15-100 (§ 411.4) · guide UTE C 15-105',
    risque: "Au-delà de Lmax, un défaut franc phase-masse ne fait pas déclencher le magnétique à temps : la masse reste à près de 100 V pendant que le thermique « réfléchit », des secondes ou des minutes. Celui qui la touche est électrisé.",
    creer() {
      const { S, In } = parmi([{ S: 1.5, In: 16 }, { S: 2.5, In: 20 }, { S: 4, In: 25 }, { S: 6, In: 32 }]);
      const courbe = parmi(['B', 'C']);
      const k = courbe === 'B' ? 5 : 10;
      const L = 0.8 * 230 * S / (RHO_CUIVRE * 2 * k * In);
      const erreurs = [
        { valeur: L / 0.8, message: 'Tu as oublié le coefficient 0,8 : la méthode conventionnelle suppose qu\'il ne reste que 80 % de U0 au départ du circuit pendant le défaut.' },
        { valeur: 2 * L, message: courbe === 'C'
          ? 'Facteur 2 en trop : tu as oublié le retour par le PE (1 + m = 2), ou pris Ia = 5 In alors qu\'en courbe C le magnétique n\'est garanti qu\'à 10 In.'
          : 'Facteur 2 en trop : tu as oublié le retour du courant par le PE (1 + m = 2).' }
      ];
      if (courbe === 'B') erreurs.push({ valeur: L / 2, message: 'Tu as pris Ia = 10 In : c\'est la courbe C. En courbe B, le magnétique est garanti à 5 In.' });
      return {
        enonce: `Schéma TN-S, 230 V. Circuit en cuivre ${nb(S)} mm², PE de même section, protégé par un disjoncteur ${courbe}${In}. Longueur maximale protégée contre les contacts indirects ?`,
        aide: 'ρ = 0,0225 Ω·mm²/m · m = S phase / S PE = 1 · courbe B : Ia = 5 In ; courbe C : Ia = 10 In',
        unite: 'm', reponse: L, donnees: { S, In, k },
        solution: `Lmax = 0,8 × U0 × S / (ρ × (1 + m) × Ia) = 0,8 × 230 × ${nb(S)} / (0,0225 × 2 × ${k} × ${In}) = ${nb(L, 1)} m`,
        explication: 'En TN, un défaut phase-masse est un court-circuit qui revient par le PE : son courant doit faire déclencher le magnétique (Ia) en moins de 0,4 s sous 230 V. La méthode conventionnelle suppose 80 % de U0 au départ du circuit : Id = 0,8 × U0 × S / (ρ × (1 + m) × L). D\'où Lmax = 0,8 × U0 × S / (ρ × (1 + m) × Ia).',
        piege: 'Un câble rallongé lors d\'un déplacement de machine peut dépasser Lmax sans que rien ne le montre : tout fonctionne, jusqu\'au défaut. On recalcule à chaque modification de longueur, ou on ajoute un différentiel.',
        erreurs
      };
    }
  },

  {
    id: 'boucle-4-20',
    niveau: 3,
    titre: 'Boucle de courant 4-20 mA',
    domaines: ['tbt-cc'],
    norme: 'IEC 60381-1 · NAMUR NE 43',
    risque: "Une boucle coupée (0 mA) lue comme « mesure nulle » par un automate mal paramétré : la régulation pousse la pompe à fond sur un circuit déjà en pression. Le zéro décalé à 4 mA sert justement à distinguer zéro et fil coupé, encore faut-il traiter le défaut (moins de 3,6 mA) dans le programme.",
    creer() {
      return parmi([
        () => {
          const P = parmi([6, 10, 16, 25]);
          const I = parmi([6.4, 8, 12, 15.2, 18.4]);
          const v = P * (I - 4) / 16;
          return {
            enonce: `Capteur de pression 0-${P} bar, sortie 4-20 mA. À la pince milliampèremétrique, tu lis ${nb(I, 1)} mA dans la boucle. Pression mesurée ?`,
            unite: 'bar', reponse: v, donnees: { type: 'mesure', P, I },
            solution: `p = (I − 4) / 16 × pleine échelle = (${nb(I, 1)} − 4) / 16 × ${P} = ${nb(v, 2)} bar`,
            explication: 'Échelle linéaire à zéro décalé : 4 mA = début d\'échelle, 20 mA = pleine échelle, soit 16 mA d\'étendue. Valeur = (I − 4) / 16 × pleine échelle.',
            piege: 'Un capteur qui affiche toujours 0 alors que le process tourne : mesure le courant. 4 mA, c\'est un vrai zéro ; 0 mA, c\'est la boucle ouverte (fil coupé, fusible, alimentation).',
            erreurs: [
              { valeur: P * I / 20, message: 'Tu as oublié le zéro décalé : 0 bar correspond à 4 mA, pas à 0 mA. Valeur = (I − 4) / 16 × pleine échelle.' },
              { valeur: P * (I - 4) / 20, message: 'L\'étendue fait 16 mA (de 4 à 20), pas 20 mA.' }
            ]
          };
        },
        () => {
          const Re = parmi([250, 500]);
          const Rc = parmi([10, 20, 40]);
          const U = 24 - 0.02 * (Re + Rc);
          return {
            enonce: `Boucle 4-20 mA alimentée en 24 V DC : entrée analogique de l'automate ${Re} Ω, câble ${Rc} Ω (aller-retour). Tension disponible aux bornes du capteur au courant maximal ?`,
            aide: 'Calcule à 20 mA',
            unite: 'V', reponse: U, donnees: { type: 'budget', Re, Rc },
            solution: `U capteur = 24 − 0,020 × (${Re} + ${Rc}) = 24 − ${nb(0.02 * (Re + Rc), 2)} = ${nb(U, 2)} V`,
            explication: 'La boucle est en série : l\'alimentation doit couvrir la chute dans l\'entrée de l\'automate et dans le câble, et laisser au capteur sa tension minimale de fonctionnement (souvent 10 à 12 V, voir la notice). On calcule au courant maximal, 20 mA, là où les chutes sont les plus fortes.',
            piege: 'Un capteur qui marche au banc et « décroche » en haut d\'échelle sur site : la boucle manque de tension à 20 mA. Le défaut n\'apparaît qu\'en haut de la mesure, c\'est ce qui le rend pernicieux.',
            erreurs: [
              { valeur: 24 - 0.004 * (Re + Rc), message: 'Tu as calculé à 4 mA : le cas critique est le courant maximal, 20 mA.' },
              { valeur: 0.02 * (Re + Rc), message: 'Ça, c\'est la chute dans la boucle : la tension disponible au capteur est 24 V moins cette chute.' }
            ]
          };
        }
      ])();
    }
  },

  {
    id: 'neutre-coupe',
    niveau: 3,
    titre: 'Neutre coupé',
    domaines: ['mono-bt', 'tri'],
    norme: 'NF C 15-100 (le neutre n\'est jamais coupé ni protégé seul)',
    risque: "Neutre coupé : les appareils peu chargés reçoivent jusqu'à 400 V. Alimentations électroniques détruites, condensateurs qui éclatent, multiprises qui fondent ; et aucune protection ne déclenche, puisque rien ne fuit à la terre. D'où le serrage au couple et la surveillance des connexions de neutre.",
    creer() {
      const { P1, P2 } = parmi([{ P1: 500, P2: 2000 }, { P1: 300, P2: 1500 }, { P1: 1000, P2: 3000 }, { P1: 200, P2: 2200 }]);
      const U1 = 400 * P2 / (P1 + P2);
      return {
        enonce: `Bâtiment en 400 V + N. Sur L1-N, un appareil résistif de ${P1} W ; sur L2-N, un radiateur de ${P2} W. Le neutre se coupe en amont. Tension aux bornes de l'appareil de ${P1} W ?`,
        aide: 'Récepteurs résistifs : R = 230² / P · tension entre phases 400 V',
        unite: 'V', reponse: U1, donnees: { P1, P2 },
        solution: `R1 = 230² / ${P1} = ${nb(230 ** 2 / P1, 1)} Ω ; R2 = 230² / ${P2} = ${nb(230 ** 2 / P2, 1)} Ω ; en série sous 400 V : U1 = 400 × R1 / (R1 + R2) = ${nb(U1, 0)} V`,
        explication: 'Neutre coupé, les deux récepteurs ne sont plus reliés au point neutre : ils se retrouvent en série entre L1 et L2, sous 400 V. La tension se partage au prorata des résistances : U1 = 400 × R1 / (R1 + R2), avec R = U² / P. Le plus petit consommateur, qui a la plus forte résistance, prend la plus grosse part.',
        piege: 'Le symptôme trompe : des lampes qui brillent trop dans un bureau et trop peu dans l\'autre, un onduleur qui grille, mais le différentiel ne bouge pas. Mesurer phase-neutre et neutre-terre révèle le défaut.',
        erreurs: [
          { valeur: 230, message: 'Sans neutre, l\'appareil ne voit plus 230 V : les deux récepteurs sont en série sous la tension entre phases, 400 V.' },
          { valeur: 400 * P1 / (P1 + P2), message: 'Tu as calculé la tension du radiateur. Le petit appareil, de plus forte résistance, prend la plus grosse part.' },
          { valeur: 200, message: 'La tension ne se partage pas en deux moitiés : elle se répartit au prorata des résistances.' }
        ]
      };
    }
  }
];

// "12,5" ou "12.5" ou "1 500" → nombre ; texte invalide → NaN.
export function lireNombre(texte) {
  const t = String(texte).replace(/\s/g, '').replace(',', '.');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

// tolerance : relative (0,02 = ±2 %) ; un exercice peut fixer la sienne (ex. tension au volt près).
export function estJuste(valeur, attendu, tolerance = TOLERANCE) {
  return Math.abs(valeur - attendu) <= tolerance * Math.abs(attendu);
}

// Devine l'erreur la plus probable derrière une mauvaise réponse numérique (ou null).
export function diagnostiquer(ex, valeur) {
  for (const e of ex.erreurs ?? []) if (estJuste(valeur, e.valeur, ex.tolerance)) return e.message;
  const facteur = f => estJuste(valeur, ex.reponse * f) || estJuste(valeur, ex.reponse / f);
  if (facteur(1000)) return 'Ton résultat est 1 000 fois trop grand ou trop petit : vérifie les unités (W / kW, A / kA, Wh / kWh, mA / A).';
  if (facteur(10)) return 'Ton résultat est décalé d\'un facteur 10 : vérifie la position de la virgule.';
  if (facteur(RACINE3)) return 'Un facteur √3 (1,732) de trop ou en moins : vérifie si tu dois utiliser la tension simple V ou composée U.';
  return null;
}

// Générateurs d'un niveau, éventuellement limités à un domaine ('' = tous).
export function generateursDe(niveau, dom = '') {
  return filtrerParDomaine(GENERATEURS, dom).filter(g => g.niveau === niveau);
}

// Une séance compte toujours 10 calculs : les générateurs disponibles sont repris à tour de rôle.
export function creerSession(niveau, dom = '') {
  const dispo = generateursDe(niveau, dom);
  const generateurs = melanger(Array.from({ length: TAILLE_SESSION }, (_, i) => dispo[i % dispo.length]));
  return {
    niveau,
    domaine: dom,
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
  const dom = domaine(params?.get('d'))?.id ?? '';
  const diff = difficulte(niveau);
  if (!diff || !generateursDe(niveau, dom).length) {
    renderChoixNiveau(vue, {
      mode: 'calcul',
      base: '#/entrainement/calcul',
      titre: 'Calculs flash',
      sousTitre: 'Dix calculs, des valeurs différentes à chaque séance : la valeur que tu dois lire avant de sortir le multimètre. Réponse acceptée à ±2 % (au volt près pour une tension à lire).',
      nombre: (n, d) => generateursDe(n, d).length,
      unite: 'types de calcul',
      domaine: dom
    });
    return;
  }

  const session = sessionCourante = creerSession(niveau, dom);
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
      <p class="niveau-seance">${etiquetteNiveau(niveau, { long: true })}${dom ? ` ${pucesDomaines([dom])}` : ''}</p>
      ${enteteSession(session.index + 1, session.score, session.resultats)}
      <section class="exercice">
        <p class="surtitre">${esc(ex.generateur.titre)}</p>
        <p class="reco-domaines">${pucesDomaines(ex.generateur.domaines)}</p>
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
    const juste = ex.choix ? valeur === ex.reponse : estJuste(valeur, ex.reponse, ex.tolerance);

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
    const piege = `<div class="piege-terrain"><p class="lecon-titre">Piège en armoire</p><p>${esc(typo(ex.piege))}</p></div>`;
    const risque = `${blocRisque(ex.generateur.risque)}${ligneNorme(ex.generateur.norme)}`;

    const derniere = session.index === session.exercices.length - 1;
    const zone = vue.querySelector('#correction');
    zone.innerHTML = `
      <section class="explication ${juste ? 'est-juste' : 'est-faux'}">
        ${juste
          ? `<p class="verdict"><span class="tampon">Juste.</span><span class="gain">+${gain} XP</span></p>
             ${calculPose}
             <details class="approfondir"><summary>Revoir la méthode et le risque</summary>${rappel}${piege}${risque}</details>`
          : `<p class="verdict"><span class="tampon">Pas encore.</span></p>
             <p class="attendu">Ta réponse : <strong class="mono">${esc(typo(ex.choix ? valeur : `${nb(valeur)} ${ex.unite}`))}</strong> — il fallait <strong class="mono">${esc(typo(attendu))}</strong>.</p>
             ${diagnostic ? `<div class="diagnostic"><p class="lecon-titre">Ce qui s'est sans doute passé</p><p>${esc(typo(diagnostic))}</p></div>` : ''}
             ${rappel}
             ${calculPose}
             ${piege}
             ${risque}`}
        <div class="action-collee"><button id="suivant" class="btn principal" type="button">${derniere ? 'Voir le rapport' : 'Calcul suivant'}</button></div>
      </section>`;
    zone.querySelector('#suivant').addEventListener('click', suivant);
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const suivant = () => {
    session.index++;
    if (session.index < session.exercices.length) return afficherExercice();

    if (session.score === TAILLE_SESSION && TAILLE_SESSION >= SEANCE_MIN_BONUS) {
      session.xp += BAREME.sessionParfaite;
      annoncerMontee(gagnerXP(BAREME.sessionParfaite));
    }
    noterSession('calcul', session.score, dom ? undefined : niveau); // records par niveau : séances « tous domaines » seulement
    const suivantNiveau = DIFFICULTES.find(d => d.n === niveau + 1 && generateursDe(d.n, dom).length);
    afficherBilan(vue, {
      score: session.score,
      xpGagne: session.xp,
      onRejouer: () => renderCalcul({ vue, definirTitre, auNettoyage, params }),
      suite: session.score >= 8 && suivantNiveau ? { href: lienSeance('#/entrainement/calcul', suivantNiveau.n, dom), libelle: `Passer au niveau ${suivantNiveau.romain}` } : null
    });
  };

  afficherExercice();
}
