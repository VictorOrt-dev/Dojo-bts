// Tutoriel « Première intervention » du banc : un cas de démonstration joué pas à pas (câble du pupitre coupé sur le
// départ moteur). Quatre étapes, découpées en gestes : lire le symptôme, poser les pointes, choisir V~ ou LoZ pour
// démasquer la tension fantôme, trouver la pièce et valider le diagnostic par un essai.
// Logique pure : l'étape courante et la commande à mettre en surbrillance se déduisent de l'état de l'intervention
// (etat.faits, etat.mesure, etat.onglet…). tests/unitaires.mjs la vérifie sans navigateur ; banc.js l'affiche.

export const CIRCUIT_TUTO = 'depart-moteur';
export const PANNE_TUTO = 'cable-pupitre';
export const NB_ETAPES = 4;

export const TITRES = ['Lis le symptôme', 'Pose les pointes', 'V~ ou LoZ ?', 'Trouve et valide'];

const mesuree = (e, [f, a, b]) => e.faits.has(`m:${f}:${a}:${b}`) || e.faits.has(`m:${f}:${b}:${a}`);

// Chaque geste : l'étape (1 à 4) à laquelle il appartient, son titre court, son explication, et ce qu'il attend.
//   mesure : [fonction, rouge, noir]   action : bouton de l'onglet Actions   lu : bouton « Suivant » de la fiche
//   prediction : question « Où est le défaut ? » posée avant d'agir (raisonner, pas seulement suivre)
//   schema : la fiche propose d'ouvrir le schéma de l'armoire
export const GESTES = [
  {
    etape: 1, titre: 'Lis le symptôme', lu: true,
    texte: 'Rien ne démarre, mais le voyant H1 est allumé : la commande a ses 230 V dans l\'armoire. Ta question : où se perdent-ils avant la bobine de KM1 ?'
  },
  {
    etape: 2, titre: 'Pose les pointes', mesure: ['hz', 'x1', 'n0'], schema: true,
    texte: 'Rouge sur le point à tester, COM sur la référence (le 0 V, déjà en place). Commence en armoire : rouge sur « F2 : 96 / X1 : 1 » (groupe « Commande »), puis « Mesurer ».'
  },
  {
    etape: 2, titre: 'Suis le courant', mesure: ['hz', 's11', 'n0'], schema: true,
    texte: '230 V au bornier X1 : la commande sort bien de l\'armoire. Suis-la jusqu\'au pupitre, 40 m plus loin : rouge sur « Pupitre S1 : 11 », puis « Mesurer ».'
  },
  {
    etape: 3, titre: 'V~ ou LoZ ?', mesure: ['loz', 's11', 'n0'],
    texte: 'Environ 90 V qui hésitent, ni 0 ni 230 : signature d\'une tension fantôme, captée par un fil coupé. Passe en V~ LoZ et mesure au même endroit.'
  },
  {
    etape: 4, titre: 'Où est le défaut ?',
    texte: '0 V en LoZ : il n\'y a pas de vraie tension au pupitre. Avant de toucher à quoi que ce soit, d\'après tes deux mesures, où est le défaut ?',
    prediction: {
      choix: ['Dans l\'armoire, avant X1 : 1', 'Dans le câble, entre X1 : 1 et S1', 'Dans le bouton Arrêt S1'],
      bonne: 1,
      retours: [
        'Pas là : tu as lu 230 V en X1 : 1, la sortie de l\'armoire. Jusque-là, tout va bien.',
        '',
        'Pas encore : la borne 11 de S1 ne reçoit déjà plus de vraie tension. Le défaut est avant le bouton.'
      ]
    }
  },
  {
    etape: 4, titre: 'Localise, puis consigne', action: 'consigner', fait: e => e.faits.has('consigne'),
    texte: 'Bien vu : 230 V en X1 : 1, rien en S1 : 11, et entre les deux il n\'y a que le câble. Pour le prouver à l\'ohmmètre, consigne d\'abord.'
  },
  {
    etape: 4, titre: 'Confirme à l\'ohmmètre', mesure: ['ohm', 'x1', 's11'],
    texte: 'Consigné : l\'ohmmètre est permis. En Ω, rouge sur « F2 : 96 / X1 : 1 », COM sur « Pupitre S1 : 11 ». Un fil sain sonne ; coupé, il affiche OL.'
  },
  {
    etape: 4, titre: 'Remplace la pièce', action: 'remplacer', piece: 'cable', fait: e => e.faits.has('r:cable'),
    texte: 'OL : le conducteur est coupé, ton diagnostic tient. Remplace le câble du pupitre (déjà choisi dans la liste).'
  },
  {
    etape: 4, titre: 'Remets sous tension', action: 'consigner', fait: e => e.faits.has('deconsigne-apres'),
    texte: 'Pièce changée : déconsigne pour remettre le départ sous tension.'
  },
  {
    etape: 4, titre: 'Valide par un essai', action: 'essai', fait: e => !!e.resolu,
    texte: 'Dernier geste d\'un pro : l\'essai. Si le moteur démarre et tient, le diagnostic est validé.'
  }
];

export const gesteFait = (g, e) => g.lu ? !!e.tuto?.lu : g.prediction ? !!e.tuto?.prediction : g.mesure ? mesuree(e, g.mesure) : g.fait(e);

// Réponse à la question « Où est le défaut ? » : { juste, retour }. Une mauvaise réponse explique et laisse rejouer.
export function predire(e, i) {
  const g = GESTES.find(x => x.prediction);
  const juste = i === g.prediction.bonne;
  e.tuto.essaisPrediction = (e.tuto.essaisPrediction ?? 0) + 1;
  if (juste) e.tuto.prediction = true;
  e.tuto.retour = juste ? null : g.prediction.retours[i];
  return { juste, retour: e.tuto.retour };
}

// Index du geste en cours (le premier pas encore fait), ou GESTES.length quand tout est fait.
export function gesteCourant(e) {
  const i = GESTES.findIndex(g => !gesteFait(g, e));
  return i === -1 ? GESTES.length : i;
}

// Ce qu'il faut toucher maintenant : { onglet?, selecteur, remarque? }. Guide le débutant d'un contrôle à l'autre,
// et rattrape un écart (départ consigné alors qu'il faut une tension, Ω demandé sans consignation…).
export function cible(e, g = GESTES[gesteCourant(e)]) {
  if (!g) return null;
  if (g.lu) return { selecteur: '.bloc-symptome' };
  if (g.prediction) return { selecteur: '.tuto-choix' };
  if (g.mesure) {
    const [f, rouge, noir] = g.mesure;
    if (f !== 'ohm' && e.consigne) return { onglet: 'actions', selecteur: '[data-action="consigner"]', remarque: 'Le départ est consigné : pour mesurer une tension, déconsigne d\'abord.' };
    if (f === 'ohm' && !e.consigne) return { onglet: 'actions', selecteur: '[data-action="consigner"]', remarque: 'L\'ohmmètre ne se pose que départ consigné : consigne d\'abord.' };
    if (e.mesure.fonction !== f) return { onglet: 'multimetre', selecteur: `[data-fonction="${f}"]` };
    if (e.mesure.rouge !== rouge) return { onglet: 'multimetre', selecteur: '.pointe.rouge' };
    if (e.mesure.noir !== noir) return { onglet: 'multimetre', selecteur: '.pointe.noire' };
    return { onglet: 'multimetre', selecteur: '#mesurer' };
  }
  return { onglet: 'actions', selecteur: `[data-action="${g.action}"]` };
}
