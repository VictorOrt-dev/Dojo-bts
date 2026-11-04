// Les 3 grands blocs du parcours : présentés au premier lancement, et raccourcis directs sur l'accueil.

export const BLOCS = [
  {
    id: 'bases', titre: 'Bases & monophasé', desc: 'Tension et courant, symboles, appareils, loi d\'Ohm, et la consignation : couper et cadenasser avant d\'intervenir.',
    liens: [
      { libelle: 'Le socle : 4 piliers', href: '#/entrainement/socle' },
      { libelle: 'Reconnaissance I', href: '#/entrainement/reco?n=1' },
      { libelle: 'Calculs en monophasé (230 V)', href: '#/entrainement/calcul?n=1&d=mono-bt' },
      { libelle: 'Cas sécurité', href: '#/entrainement/panne?d=securite' }
    ]
  },
  {
    id: 'armoire', titre: 'Armoire & banc', desc: 'Commande des moteurs dans l\'armoire, puis dépannage au banc de mesure, multimètre en main.',
    liens: [
      { libelle: 'Banc · départ moteur', href: '#/entrainement/banc?circuit=depart-moteur' },
      { libelle: 'Banc · éclairage', href: '#/entrainement/banc?circuit=eclairage' },
      { libelle: 'Cas en très basse tension (TBT, 24 V)', href: '#/entrainement/panne?d=tbt-cc' }
    ]
  },
  {
    id: 'puissance', titre: 'Triphasé, isolement & haute tension', desc: 'Triphasé 400 V, mesure d\'isolement au mégohmmètre, haute tension HTA (20 000 V) des postes de transformation.',
    liens: [
      { libelle: 'Calculs triphasé', href: '#/entrainement/calcul?n=2&d=tri' },
      { libelle: 'Mesure d\'isolement', href: '#/entrainement/isolement' },
      { libelle: 'Cas haute tension (HTA)', href: '#/entrainement/panne?d=hta' }
    ]
  }
];
