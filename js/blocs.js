// Les 3 grands blocs du parcours : présentés au premier lancement, et raccourcis directs sur l'accueil.

export const BLOCS = [
  {
    id: 'bases', titre: 'Bases & monophasé', desc: 'Symboles, appareils, loi d\'Ohm, circuits terminaux, consignation.',
    liens: [
      { libelle: 'Reconnaissance I', href: '#/entrainement/reco?n=1' },
      { libelle: 'Calculs monophasé', href: '#/entrainement/calcul?n=1&d=mono-bt' },
      { libelle: 'Cas sécurité', href: '#/entrainement/panne?d=securite' }
    ]
  },
  {
    id: 'armoire', titre: 'Armoire & banc', desc: 'Circuits de commande, départs moteurs, diagnostic au banc de mesure.',
    liens: [
      { libelle: 'Banc · départ moteur', href: '#/entrainement/banc?circuit=depart-moteur' },
      { libelle: 'Banc · éclairage', href: '#/entrainement/banc?circuit=eclairage' },
      { libelle: 'Cas TBT & commande', href: '#/entrainement/panne?d=tbt-cc' }
    ]
  },
  {
    id: 'puissance', titre: 'Triphasé, mégohmmètre & HTA', desc: 'Puissances et protections, mesure d\'isolement, poste de transformation.',
    liens: [
      { libelle: 'Calculs triphasé', href: '#/entrainement/calcul?n=2&d=tri' },
      { libelle: 'Mesure d\'isolement', href: '#/entrainement/isolement' },
      { libelle: 'Cas HTA', href: '#/entrainement/panne?d=hta' }
    ]
  }
];
