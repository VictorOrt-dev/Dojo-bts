// Ce qui distingue chaque circuit du banc de mesure : textes, organes à contrôler, pince, voyants, et ce qui se
// passe à l'essai. Le reste (multimètre, consignation, indices, rapport) est commun, dans banc.js.
//
// essai(ctx, via) reçoit ctx = { etat, lire(a, b, mode, etatTemporaire?), danger(titre, texte) } et via = 'essai'
// (bouton d'essai) ou 'collegue' (un collègue maintient la commande) ; il renvoie { courants, texte } et met à jour
// l'état (etat.resolu quand l'installation fonctionne de nouveau, sans pièce en défaut).

export const CIRCUITS = [
  { id: 'depart-moteur', fichier: 'data/banc-depart-moteur.json', court: 'Départ moteur' },
  { id: 'eclairage', fichier: 'data/banc-eclairage.json', court: 'Éclairage' }
];

const pastille = (libelle, valeur, etat) => `<li class="pastille ${etat}"><span>${libelle}</span><b>${valeur}</b></li>`;

export const PROFILS = {
  'depart-moteur': {
    mission: 'trouver la pièce en panne, la remplacer, puis faire redémarrer le moteur.',
    reussite: 'si le moteur tourne, c\'est gagné',
    mesureDepart: { rouge: 'c0', noir: 'n0' },
    amont: ['L1', 'L2', 'L3'],
    organe: 'Q1',
    consigner: 'Consigner le départ (Q1 + VAT)',
    deconsigner: 'Déconsigner (refermer Q1)',
    consigneTexte: 'Départ consigné : Q1 ouvert et cadenassé, VAT vérifié. L\'amont du sectionneur (arrivée L1, L2, L3) reste sous tension.',
    essaiLibelle: 'Essai : appuyer sur Marche',
    collegue: ['Un collègue maintient Marche', 'Le collègue relâche Marche'],
    collegueJournal: ['Un collègue maintient Marche enfoncé', 'Le collègue relâche Marche'],
    rearmer: true,
    controles: [{ id: 'fu1', libelle: 'FU1 (commande)' }, { id: 'fu-l1', libelle: 'Q1 · L1' }, { id: 'fu-l2', libelle: 'Q1 · L2' }, { id: 'fu-l3', libelle: 'Q1 · L3' }],
    controleNom: 'Fusible',
    pince: [{ id: 0, libelle: 'L1 (borne U)' }, { id: 1, libelle: 'L2 (borne V)' }, { id: 2, libelle: 'L3 (borne W)' }],
    pinceNote: i => (i > 30 ? '(courant de démarrage bloqué : plaque 11 A)' : ''),
    pastilles({ etat, lire }) {
      const h1 = lire('c1', 'n0', 'loz').valeur > 150;
      return [
        pastille('Q1', etat.consigne ? 'consigné' : 'fermé', etat.consigne ? 'neutre' : 'ok'),
        pastille('Voyant H1', h1 ? 'allumé' : 'éteint', h1 ? 'ok' : 'neutre'),
        pastille('KM1', etat.km ? 'collé' : 'retombé', etat.km ? 'ok' : 'neutre'),
        pastille('Relais F2', etat.relais ? 'déclenché' : 'normal', etat.relais ? 'alerte' : 'neutre'),
        pastille('Moteur', etat.moteur, etat.moteur === 'tourne' ? 'ok' : 'neutre'),
        etat.marche ? pastille('Marche', 'maintenu', 'alerte') : ''
      ].join('');
    },
    // Appui sur Marche (par toi ou par le collègue). Renvoie les courants de ligne pendant l'essai.
    essai({ etat, lire, danger }) {
      const bobineOk = !etat.ouverts.has('bobine');
      const appel = lire('x2', 'n0', 'hz', { ...etat, marche: true });
      if (!bobineOk || appel.instable || appel.valeur < 150) {
        etat.km = false;
        return { courants: [0, 0, 0], texte: bobineOk ? 'Rien ne se passe : le contacteur ne colle pas.' : 'Rien ne se passe : le contacteur ne colle pas, aucun claquement.' };
      }
      etat.km = true;
      // Une phase manque si sa cartouche est fondue. (Contacteur fermé, la phase coupée est réalimentée par les
      // enroulements du moteur : un voltmètre en aval y lirait une tension de retour trompeuse.)
      const phases = ['fu-l1', 'fu-l2', 'fu-l3'].map(f => !etat.ouverts.has(f));
      if (phases.every(Boolean)) {
        const maintien = lire('x2', 'n0', 'hz');
        if (maintien.valeur > 150 && !maintien.instable) {
          etat.moteur = 'tourne';
          if (etat.ouverts.size === 0) etat.resolu = true;
          return { courants: [8.1, 8.3, 8.0], texte: 'Le contacteur colle et reste maintenu : le moteur démarre et tourne normalement.' };
        }
        etat.km = false;
        return { courants: [0, 0, 0], texte: 'Le contacteur colle tant que Marche est appuyé, puis retombe : l\'auto-maintien ne tient pas.' };
      }
      etat.essaisBloques++;
      etat.km = false;
      etat.relais = true;
      etat.moteur = 'arrêté';
      const texte = 'Le contacteur colle, le moteur grogne sans démarrer… au bout de 8 s, le relais thermique déclenche et le contacteur retombe.';
      if (etat.essaisBloques === 3) danger('Moteur relancé bloqué à répétition', `${texte} C'est le troisième essai moteur bloqué : le bobinage chauffe à chaque fois, il sent le chaud. On arrête de relancer et on cherche.`);
      return { courants: phases.map(ok => (ok ? 67 : 0)), texte };
    }
  },

  eclairage: {
    mission: 'trouver la pièce en panne, la remplacer, puis rallumer tout le couloir depuis les poussoirs.',
    reussite: 'si les deux lampes s\'allument, c\'est gagné',
    mesureDepart: { rouge: 'a', noir: 'an' },
    amont: ['L', 'N'],
    organe: 'Q1',
    consigner: 'Consigner le circuit (Q1 + VAT)',
    deconsigner: 'Déconsigner (refermer Q1)',
    consigneTexte: 'Circuit consigné : Q1 ouvert et cadenassé, VAT vérifié sur la phase et le neutre. L\'arrivée du tableau (amont de Q1) reste sous tension.',
    essaiLibelle: 'Essai : appuyer sur S1 (entrée)',
    collegue: ['Un collègue maintient S3 (fond)', 'Le collègue relâche S3'],
    collegueJournal: ['Un collègue maintient S3 appuyé, au fond du couloir', 'Le collègue relâche S3'],
    rearmer: false,
    controles: [{ id: 'h1', libelle: 'Lampe H1 (hors douille)' }, { id: 'h2', libelle: 'Lampe H2 (hors douille)' }],
    controleNom: 'Pièce',
    pince: [{ id: 0, libelle: 'Retour lampes' }, { id: 1, libelle: 'Neutre lampes' }],
    pinceNote: () => '(deux lampes de 20 W : environ 0,17 A)',
    allumees({ etat, lire }) {
      return [['d', 'h1n', 'h1'], ['d2', 'h2n', 'h2']].map(([a, b, id]) => !etat.ouverts.has(id) && lire(a, b, 'hz').valeur > 150);
    },
    pastilles(ctx) {
      const { etat } = ctx;
      const [h1, h2] = this.allumees(ctx);
      return [
        pastille('Q1', etat.consigne ? 'consigné' : 'fermé', etat.consigne ? 'neutre' : 'ok'),
        pastille('Télérupteur', etat.tl ? 'position allumé' : 'position éteint', etat.tl ? 'ok' : 'neutre'),
        pastille('Lampe H1', h1 ? 'allumée' : 'éteinte', h1 ? 'ok' : 'neutre'),
        pastille('Lampe H2', h2 ? 'allumée' : 'éteinte', h2 ? 'ok' : 'neutre'),
        etat.marche ? pastille('S3', 'maintenu', 'alerte') : ''
      ].join('');
    },
    // Appui sur S1 (via 'essai') ou maintien de S3 par le collègue (via 'collegue', etat.marche déjà vrai).
    essai(ctx, via = 'essai') {
      const { etat, lire } = ctx;
      const appuye = via === 'essai' ? { ...etat, appui: true } : etat;
      const bobine = lire('r', 'an', 'hz', appuye);
      const poussoir = via === 'essai' ? 'S1' : 'S3';
      if (etat.ouverts.has('kl') || bobine.instable || bobine.valeur < 150) {
        return { courants: [0, 0], texte: `Appui sur ${poussoir} : aucun claquement au tableau, le télérupteur ne bascule pas.` };
      }
      etat.tl = !etat.tl;
      if (etat.ouverts.size === 0) {
        etat.tl = true;
        etat.resolu = true;
        return { courants: [0.17, 0.17], texte: `Appui sur ${poussoir} : clac, le couloir s'allume, les deux lampes fonctionnent.` };
      }
      const [h1, h2] = this.allumees(ctx);
      const lampes = h1 && h2 ? 'les deux lampes s\'allument' : h1 ? 'seule H1 s\'allume' : h2 ? 'seule H2 s\'allume' : 'rien ne s\'allume';
      const i = (h1 ? 0.087 : 0) + (h2 ? 0.087 : 0);
      return { courants: [i, i], texte: `Appui sur ${poussoir} : clac, le télérupteur bascule en position « ${etat.tl ? 'allumé' : 'éteint'} » ; ${etat.tl ? lampes : 'le couloir est éteint'}.` };
    }
  }
};
