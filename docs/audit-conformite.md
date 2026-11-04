# Audit d'intégrité normatif et technique

*Généré par `node outils/audit.mjs` (aussi exécuté par la CI à chaque envoi) : ne pas modifier à la main.*

**205 éléments, 3082 contrôles automatiques, 0 anomalie.**

| Famille | Éléments | Contrôles | Anomalies |
|---|---|---|---|
| Reconnaissance | 70 | 691 | 0 |
| Calcul | 37 | 348 | 0 |
| Cas de panne | 30 | 505 | 0 |
| Banc · Départ moteur direct | 5 | 101 | 0 |
| Banc · Éclairage de couloir par télérupteur | 5 | 101 | 0 |
| Banc · Démarrage étoile-triangle | 4 | 79 | 0 |
| Mesure d'isolement | 8 | 103 | 0 |
| Couleurs | 7 | 14 | 0 |
| Lexique | 39 | 1140 | 0 |

## Ce qui est contrôlé

1. **Normes** : chaque élément cite une référence ; chaque norme citée a son édition (`js/normes.js`) ; la protection
   contre les chocs électriques se cite dans l'IEC 60364-4-41 (§ 411), les autres paragraphes dans la NF C 15-100:2002.
2. **Calculs** : 200 tirages par type de calcul : réponse finie et positive, valeur retrouvée dans le calcul posé, erreurs
   typiques distinctes de la bonne réponse, explication et piège rédigés. Les valeurs elles-mêmes sont recalculées par
   une formule indépendante dans `tests/non-regression.mjs` (300 tirages).
3. **Seuils** : mesures d'isolement conformes à l'IEC 60364-6 (250 V DC et 0,5 MΩ en TBT ; 500 V DC et 1 MΩ jusqu'à 500 V ;
   1 000 V DC et 1 MΩ au-delà).
4. **Sécurité** : « Le risque, en vrai » sur chaque élément, « Le piège en armoire » sur chaque cas, panne, mesure et calcul.
5. **Structure** : une seule bonne démarche par étape, embranchements valides, pannes du banc réparables, démarches de
   référence cohérentes avec le circuit.
6. **Lexique** : chaque définition tient en 20 mots ; chaque terme technique du contenu de niveau I (questions, calculs,
   cas, pannes du banc, guide du banc) a sa définition dans `js/lexique.js`.


## Détail

| Famille | Identifiant | Niv. | Référence (édition) | Contrôles | État |
|---|---|---|---|---|---|
| Reconnaissance | `sym-contact-no` | I | IEC 60617 (base en ligne) · IEC 60947-5-1:2016 | 10 | ✔ |
| Reconnaissance | `sym-contact-nf` | I | IEC 60617 (base en ligne) · NF EN 60204-1:2018 | 10 | ✔ |
| Reconnaissance | `sym-bobine` | I | IEC 60617 (base en ligne) · IEC 60947-4-1:2018 | 10 | ✔ |
| Reconnaissance | `sym-moteur` | I | IEC 60617 (base en ligne) · IEC 60034-1:2022 | 10 | ✔ |
| Reconnaissance | `sym-fusible` | I | IEC 60617 (base en ligne) · NF EN 60269 (série) | 10 | ✔ |
| Reconnaissance | `sym-voyant` | I | NF EN 60204-1:2018 (§ 10.3) | 9 | ✔ |
| Reconnaissance | `sym-transfo` | I | IEC 60617 (base en ligne) · NF EN 61558 (série) | 10 | ✔ |
| Reconnaissance | `mat-disjoncteur-modulaire` | I | NF EN 60898-1:2019 · NF C 15-100:2002 | 11 | ✔ |
| Reconnaissance | `mat-contacteur` | I | IEC 60947-4-1:2018 | 9 | ✔ |
| Reconnaissance | `mat-arret-urgence` | I | ISO 13850:2015 · NF EN 60204-1:2018 (§ 10.7) | 11 | ✔ |
| Reconnaissance | `mat-relais-thermique` | II | IEC 60947-4-1:2018 | 10 | ✔ |
| Reconnaissance | `mat-disjoncteur-moteur` | II | IEC 60947-2:2016 · IEC 60947-4-1:2018 | 10 | ✔ |
| Reconnaissance | `sym-sectionneur` | II | IEC 60617 (base en ligne) · NF C 18-510:2012+A1:2020 | 10 | ✔ |
| Reconnaissance | `sym-disjoncteur` | II | IEC 60617 (base en ligne) · IEC 60947-2:2016 | 10 | ✔ |
| Reconnaissance | `sym-bp-no` | II | IEC 60617 (base en ligne) · NF EN 60204-1:2018 (§ 10.2) | 10 | ✔ |
| Reconnaissance | `sym-bp-nf` | II | IEC 60617 (base en ligne) · NF EN 60204-1:2018 | 10 | ✔ |
| Reconnaissance | `sym-thermique` | II | IEC 60617 (base en ligne) · IEC 60947-4-1:2018 | 10 | ✔ |
| Reconnaissance | `reco-thermique-bornes` | II | IEC 60947-4-1:2018 · IEC 60947-1:2020 | 11 | ✔ |
| Reconnaissance | `reco-contacteur-bobine` | II | IEC 60947-4-1:2018 | 9 | ✔ |
| Reconnaissance | `reco-c16` | II | NF EN 60898-1:2019 · NF C 15-100:2002 | 11 | ✔ |
| Reconnaissance | `reco-no-bornes` | II | IEC 60947-1:2020 (repérage des bornes) | 9 | ✔ |
| Reconnaissance | `reco-nf-bornes` | II | IEC 60947-1:2020 (repérage des bornes) | 9 | ✔ |
| Reconnaissance | `reco-reglage-molette` | II | IEC 60947-4-1:2018 | 9 | ✔ |
| Reconnaissance | `reco-au-categorie` | III | ISO 13850:2015 · NF EN 60204-1:2018 (§ 9.2.2) | 11 | ✔ |
| Reconnaissance | `reco-moteur-81346` | III | IEC 81346-2:2019 | 9 | ✔ |
| Reconnaissance | `reco-contacteur-protection` | III | IEC 60947-4-1:2018 (classes de déclenchement) · IEC 60269 (série) (fusibles aM) | 10 | ✔ |
| Reconnaissance | `reco-sectionneur-charge` | III | IEC 60947-3:2020 · NF C 18-510:2012+A1:2020 | 10 | ✔ |
| Reconnaissance | `reco-icc-transfo` | III | NF C 15-100:2002 (§ 434) · IEC 60076-5:2006 | 10 | ✔ |
| Reconnaissance | `reco-reglage-thermique` | III | IEC 60947-4-1:2018 · IEC 60034-1:2022 | 11 | ✔ |
| Reconnaissance | `reco-voyant-couleur` | II | NF EN 60204-1:2018 (§ 10.3.2) | 9 | ✔ |
| Reconnaissance | `sym-alim-dc` | I | IEC 60617 (base en ligne) · NF EN 60204-1:2018 (§ 9.4.3) | 10 | ✔ |
| Reconnaissance | `sym-diode-roue-libre` | II | IEC 60617 (base en ligne) | 9 | ✔ |
| Reconnaissance | `sym-sectionneur-terre` | III | NF C 18-510:2012+A1:2020 · IEC 60617 (base en ligne) | 10 | ✔ |
| Reconnaissance | `reco-couplage-dyn11` | III | IEC 60076-1:2011 | 9 | ✔ |
| Reconnaissance | `sym-differentiel` | I | IEC 60364-4-41:2005 (§ 411.3.3) · NF EN 61008:2012 / 61009 | 10 | ✔ |
| Reconnaissance | `reco-commande-lampe` | I | NF C 15-100:2002 (commande unipolaire sur la phase) | 9 | ✔ |
| Reconnaissance | `reco-tn-c-ddr` | III | IEC 60364-4-41:2005 (§ 411.4.5, schéma TN-C) | 9 | ✔ |
| Reconnaissance | `reco-led-allumee` | III | NF C 15-100:2002 · NF EN 61243-3:2014 (VAT) | 10 | ✔ |
| Reconnaissance | `reco-domaine-hta` | I | NF C 18-510:2012+A1:2020 (domaines de tension) | 9 | ✔ |
| Reconnaissance | `reco-habilitation-b1v` | II | NF C 18-510:2012+A1:2020 (symboles d'habilitation) | 9 | ✔ |
| Reconnaissance | `reco-dgpt2` | II | NF C 13-100:2015 · NF EN 50216 (série) | 10 | ✔ |
| Reconnaissance | `reco-fusible-percuteur` | II | IEC 62271-105:2021 (combinés interrupteur-fusibles) | 9 | ✔ |
| Reconnaissance | `sym-terre-protection` | I | IEC 60417-5019 · NF EN 60204-1:2018 (§ 8.2) | 10 | ✔ |
| Reconnaissance | `reco-epi-vat` | II | NF C 18-510:2012+A1:2020 · NF EN 60903:2003 (gants isolants) | 11 | ✔ |
| Reconnaissance | `reco-prises-25` | II | NF C 15-100:2002 (partie 7-771, circuits de prises) | 10 | ✔ |
| Reconnaissance | `reco-sens-rotation` | I | IEC 60034-8:2007 (repérage des bornes et sens de rotation) | 9 | ✔ |
| Reconnaissance | `reco-cat-marquage` | II | IEC 61010-2-030:2017 · NF C 18-510:2012+A1:2020 | 10 | ✔ |
| Reconnaissance | `reco-vat-appareil` | I | NF C 18-510:2012+A1:2020 · NF EN 61243-3:2014 | 10 | ✔ |
| Reconnaissance | `reco-cadenas-pancarte` | I | NF C 18-510:2012+A1:2020 (consignation) | 10 | ✔ |
| Reconnaissance | `reco-couleur-neutre` | I | IEC 60445:2021 · NF C 15-100:2002 | 11 | ✔ |
| Reconnaissance | `reco-decouverte-tension` | I | IEC 61010-1:2010 · NF C 15-100:2002 | 10 | ✔ |
| Reconnaissance | `reco-decouverte-courant` | I | IEC 80000-6:2022 (grandeurs électriques) | 9 | ✔ |
| Reconnaissance | `reco-decouverte-phase` | I | IEC 60445:2021 · NF C 15-100:2002 | 11 | ✔ |
| Reconnaissance | `reco-decouverte-terre` | I | NF C 15-100:2002 · IEC 60445:2021 | 10 | ✔ |
| Reconnaissance | `reco-decouverte-multimetre` | I | IEC 61010-1:2010 | 9 | ✔ |
| Reconnaissance | `reco-cat-tgbt` | II | IEC 61010-2-030:2017 · NF C 18-510:2012+A1:2020 | 10 | ✔ |
| Reconnaissance | `reco-capteur-3fils` | II | IEC 60947-5-2:2019 | 10 | ✔ |
| Reconnaissance | `reco-renvoi-folio` | II | IEC 61082-1:2014 (documents électrotechniques) | 9 | ✔ |
| Reconnaissance | `reco-repere-bornier` | II | IEC 81346-2:2019 · IEC 61666:2010 | 10 | ✔ |
| Reconnaissance | `reco-megohmmetre-prep` | II | IEC 61557-2:2019 · IEC 60364-6:2016 · NF C 18-510:2012+A1:2020 | 12 | ✔ |
| Reconnaissance | `reco-plaque-poles` | II | IEC 60034-1:2022 | 9 | ✔ |
| Reconnaissance | `reco-cat-fusibles` | III | IEC 61010-2-030:2017 · NF C 18-510:2012+A1:2020 | 10 | ✔ |
| Reconnaissance | `reco-auto-maintien` | III | IEC 60617 (base en ligne) · NF EN 60204-1:2018 | 10 | ✔ |
| Reconnaissance | `reco-au-deux-canaux` | III | ISO 13849-1:2023 · ISO 13850:2015 · NF EN 60204-1:2018 | 12 | ✔ |
| Reconnaissance | `reco-ddr-type-f` | III | NF C 15-100:2002 · IEC 62423:2009 | 10 | ✔ |
| Reconnaissance | `reco-irve-qualification` | I | Décret n° 2017-26 (qualification IRVE) · IEC 60364-7-722:2018 | 9 | ✔ |
| Reconnaissance | `reco-irve-ddr` | II | IEC 60364-7-722:2018 (§ 722.531) · NF C 15-100:2002 | 10 | ✔ |
| Reconnaissance | `reco-pv-continu` | II | UTE C 15-712-1:2013 · IEC 60364-7-712:2017 | 10 | ✔ |
| Reconnaissance | `reco-driver-led` | I | IEC 61347-2-13:2014 | 9 | ✔ |
| Reconnaissance | `reco-variateur-ddr` | II | IEC 61800-5-1:2022 · NF C 15-100:2002 | 10 | ✔ |
| Calcul | `ohm` | I | IEC 80000-6:2022 (grandeurs et unités électriques) | 9 | ✔ |
| Calcul | `puissance` | I | IEC 80000-6:2022 (puissance et énergie) | 9 | ✔ |
| Calcul | `tension-attendue` | I | NF C 15-100:2002 (§ 525) | 9 | ✔ |
| Calcul | `alim-24v` | I | IEC 61131-2:2017 (24 V DC : plage 20,4 à 28,8 V) | 9 | ✔ |
| Calcul | `tensions-reseau` | I | IEC 60038:2009 (tensions normales) | 9 | ✔ |
| Calcul | `kilovolts` | I | IEC 60038:2009 (tensions normales) | 9 | ✔ |
| Calcul | `courant-corps` | I | IEC 60479-1:2018 · IEC 60364-4-41:2005 (§ 411) | 10 | ✔ |
| Calcul | `rapport-transfo` | II | IEC 60076-1:2011 | 9 | ✔ |
| Calcul | `tensions-industrie` | II | IEC 60038:2009 (tensions normales) | 9 | ✔ |
| Calcul | `triphase` | II | IEC 80000-6:2022 (puissances active, réactive, apparente) | 9 | ✔ |
| Calcul | `intensite` | II | IEC 60947-4-1:2018 | 9 | ✔ |
| Calcul | `couplage` | II | IEC 60034-1:2022 (plaque moteur) | 9 | ✔ |
| Calcul | `chute-mono` | II | NF C 15-100:2002 (§ 525) | 9 | ✔ |
| Calcul | `charge-moteur` | II | IEC 60034-1:2022 | 9 | ✔ |
| Calcul | `chute-24v` | II | IEC 61131-2:2017 · NF C 15-100:2002 (§ 525) | 10 | ✔ |
| Calcul | `contact-tt` | II | IEC 60364-4-41:2005 (§ 411.5, schéma TT) · UL = 50 V en local sec | 9 | ✔ |
| Calcul | `prise-transfo` | II | IEC 60076-1:2011 · NF C 18-510:2012+A1:2020 | 10 | ✔ |
| Calcul | `continuite-pe` | II | IEC 60364-6:2016 · IEC 61557-4:2007 | 10 | ✔ |
| Calcul | `test-ddr` | II | IEC 61008-1:2010 · IEC 61557-6:2019 | 10 | ✔ |
| Calcul | `terre-mesuree` | II | IEC 60364-4-41:2005 (§ 411.5, schéma TT) · IEC 61557-5:2007 | 10 | ✔ |
| Calcul | `chute-tri` | III | NF C 15-100:2002 (§ 525) | 9 | ✔ |
| Calcul | `compensation` | III | IEC 60831-1:2014 | 9 | ✔ |
| Calcul | `boucherot` | III | IEC 80000-6:2022 · NF C 15-100:2002 (bilan de puissance) | 10 | ✔ |
| Calcul | `transfo` | III | NF C 15-100:2002 (§ 434) · IEC 60076-5:2006 | 10 | ✔ |
| Calcul | `desequilibre` | III | IEC 60034-26:2006 | 9 | ✔ |
| Calcul | `hta-courant` | III | NF C 13-100:2015 · IEC 60076-1:2011 | 10 | ✔ |
| Calcul | `lmax-tn` | III | IEC 60364-4-41:2005 (§ 411.4, schéma TN) · guide UTE C 15-105:2003 | 10 | ✔ |
| Calcul | `boucle-4-20` | III | IEC 60381-1:1982 · NAMUR NE 43 | 9 | ✔ |
| Calcul | `neutre-coupe` | III | NF C 15-100:2002 (le neutre ne doit jamais être coupé seul, sans les phases) | 9 | ✔ |
| Calcul | `magnetique-courbe` | I | IEC 60898-1:2015 | 9 | ✔ |
| Calcul | `energie-condensateur` | II | NF C 18-510:2012+A1:2020 (énergies résiduelles) · IEC 61800-5-1:2022 | 10 | ✔ |
| Calcul | `sortie-api` | I | IEC 61131-2:2017 | 9 | ✔ |
| Calcul | `iz-correction` | II | NF C 15-100:2002 (§ 523) · IEC 60364-5-52:2009 | 10 | ✔ |
| Calcul | `isolement-attendu` | II | IEC 60364-6:2016 · IEC 61557-2:2019 | 10 | ✔ |
| Calcul | `glissement` | II | IEC 60034-1:2022 | 9 | ✔ |
| Calcul | `icc-aval` | III | IEC 60909-0:2016 · NF C 15-100:2002 (§ 434) | 10 | ✔ |
| Calcul | `reglage-ir` | III | NF C 15-100:2002 (§ 433) · IEC 60947-2:2016 | 10 | ✔ |
| Cas de panne | `commande-hs` | I | NF EN 60204-1:2018 (§ 9.4.3) | 15 | ✔ |
| Cas de panne | `differentiel-perceuse` | I | IEC 60364-4-41:2005 (§ 411.3.3, différentiel 30 mA) · NF C 15-100:2002 | 16 | ✔ |
| Cas de panne | `consignation-contacteur` | I | NF C 18-510:2012+A1:2020 · NF EN 61243-3:2014 (VAT) | 19 | ✔ |
| Cas de panne | `poste-general-bt` | I | NF C 18-510:2012+A1:2020 · NF C 13-100:2015 · NF C 15-100:2002 | 17 | ✔ |
| Cas de panne | `moteur-grogne` | II | IEC 60947-4-1:2018 · IEC 60034-1:2022 | 19 | ✔ |
| Cas de panne | `capteur-convoyeur` | II | IEC 61131-2:2017 · NF EN 60204-1:2018 | 16 | ✔ |
| Cas de panne | `retour-lampe-neutre` | II | NF C 15-100:2002 (commande unipolaire sur la phase) · NF C 18-510:2012+A1:2020 | 16 | ✔ |
| Cas de panne | `barrette-terre` | II | IEC 60364-4-41:2005 (§ 411.5, schéma TT) · NF C 15-100:2002 (§ 542, prises de terre) · NF C 18-510:2012+A1:2020 | 17 | ✔ |
| Cas de panne | `hta-enclenchement` | II | NF C 13-100:2015 · IEC 60255 (série) · NF C 18-510:2012+A1:2020 | 17 | ✔ |
| Cas de panne | `variateur-surtension` | III | IEC 61800-5-1:2022 | 18 | ✔ |
| Cas de panne | `differentiel-variateurs` | III | IEC 60364-4-41:2005 (§ 411.5, schéma TT) · NF C 15-100:2002 (§ 531.2, dispositifs différentiels) | 16 | ✔ |
| Cas de panne | `hta-dgpt2` | III | NF C 18-510:2012+A1:2020 · NF C 13-100:2015 · IEC 60076 (série) | 17 | ✔ |
| Cas de panne | `sorties-grillees` | III | NF EN 60204-1:2018 · IEC 61131-2:2017 | 16 | ✔ |
| Cas de panne | `neutre-tgbt` | III | NF C 15-100:2002 (le neutre ne doit jamais être coupé seul, sans les phases) · NF C 18-510:2012+A1:2020 | 16 | ✔ |
| Cas de panne | `vat-procedure` | I | NF C 18-510:2012+A1:2020 (consignation, VAT) · NF EN 61243-3:2014 (détecteurs de tension) | 16 | ✔ |
| Cas de panne | `isolement-moteur-lavage` | II | IEC 60364-6:2016 (mesure d'isolement) · IEC 61557-2:2019 (mégohmmètres) · NF C 18-510:2012+A1:2020 | 17 | ✔ |
| Cas de panne | `it-premier-defaut` | III | IEC 60364-4-41:2005 (§ 411.6, schéma IT) · IEC 61557-8:2014 (CPI) · IEC 61557-9:2014 (recherche de défaut) | 17 | ✔ |
| Cas de panne | `selectivite-tgbt` | III | NF C 15-100:2002 (§ 535, sélectivité) · IEC 60947-2:2016 | 16 | ✔ |
| Cas de panne | `hta-manoeuvre-serrures` | III | NF C 18-510:2012+A1:2020 (manœuvres et consignation HTA) · NF C 13-100:2015 (poste de livraison) · IEC 62271-200:2021 | 17 | ✔ |
| Cas de panne | `telerupteur-couloir` | I | NF C 15-100:2002 · IEC 60669-2-2:2006 (télérupteurs) | 16 | ✔ |
| Cas de panne | `moteur-sens-inverse` | I | NF EN 60204-1:2018 (§ 18, vérifications) · IEC 60034-8:2007 (sens de rotation) | 16 | ✔ |
| Cas de panne | `capteur-pnp-npn` | II | IEC 60947-5-2:2019 (détecteurs de proximité) · IEC 61131-2:2017 (entrées automate) | 16 | ✔ |
| Cas de panne | `neutre-partage-ddr` | II | NF C 15-100:2002 (un neutre propre à chaque circuit) | 15 | ✔ |
| Cas de panne | `double-source` | II | NF C 18-510:2012+A1:2020 (séparation de toutes les sources, VAT) | 15 | ✔ |
| Cas de panne | `energie-residuelle-variateur` | II | NF C 18-510:2012+A1:2020 (énergies résiduelles) · IEC 61800-5-1:2022 (variateurs) | 16 | ✔ |
| Cas de panne | `demarrage-intempestif-24v` | III | NF EN 60204-1:2018 (§ 9.4.3, défauts à la terre du circuit de commande) | 15 | ✔ |
| Cas de panne | `pompe-thermique-rearme` | III | IEC 60947-4-1:2018 (relais thermiques) · NF EN 60204-1:2018 (§ 7.3, protection des moteurs) | 24 | ✔ |
| Cas de panne | `tgbt-reenclenchement` | III | NF C 18-510:2012+A1:2020 · NF C 15-100:2002 (§ 434) · IEC 60947-2:2016 | 21 | ✔ |
| Cas de panne | `verif-continuite-pe` | I | IEC 60364-6:2016 · IEC 61557-4:2007 | 16 | ✔ |
| Cas de panne | `verif-differentiel` | II | IEC 61008-1:2010 · IEC 61557-6:2019 · IEC 60364-6:2016 | 17 | ✔ |
| Banc · Départ moteur direct | `fu1-fondu` | I | NF EN 60204-1:2018 (§ 7.2.4) | 19 | ✔ |
| Banc · Départ moteur direct | `contact-95-96` | II | IEC 60947-4-1:2018 | 19 | ✔ |
| Banc · Départ moteur direct | `bobine-coupee` | I | NF EN 61243-3:2014 (VAT) | 20 | ✔ |
| Banc · Départ moteur direct | `cable-pupitre` | III | NF EN 60204-1:2018 (§ 13) | 21 | ✔ |
| Banc · Départ moteur direct | `fusible-l2` | II | NF EN 60269 (série) (fusibles aM) | 22 | ✔ |
| Banc · Éclairage de couloir par télérupteur | `lampe-h2` | I | NF C 15-100:2002 · NF C 18-510:2012+A1:2020 | 19 | ✔ |
| Banc · Éclairage de couloir par télérupteur | `bobine-kl` | I | IEC 60669-2-2:2006 · NF C 15-100:2002 | 19 | ✔ |
| Banc · Éclairage de couloir par télérupteur | `cable-s3` | II | NF C 15-100:2002 · NF C 18-510:2012+A1:2020 | 21 | ✔ |
| Banc · Éclairage de couloir par télérupteur | `neutre-boite` | II | NF C 18-510:2012+A1:2020 (VAT sur tous les conducteurs actifs, neutre compris) · NF C 15-100:2002 | 21 | ✔ |
| Banc · Éclairage de couloir par télérupteur | `contact-kl` | III | IEC 60669-2-2:2006 · NF C 15-100:2002 | 21 | ✔ |
| Banc · Démarrage étoile-triangle | `maintien-coupe` | I | NF EN 60204-1:2018 (§ 7.5, redémarrage après coupure) | 16 | ✔ |
| Banc · Démarrage étoile-triangle | `tempo-hs` | II | IEC 60947-4-1:2018 (démarreurs étoile-triangle) · IEC 60947-5-1:2016 | 20 | ✔ |
| Banc · Démarrage étoile-triangle | `enroulement-desequilibre` | II | IEC 60034-1:2022 · IEC 60034-26:2006 (déséquilibre) | 21 | ✔ |
| Banc · Démarrage étoile-triangle | `basculement-colle` | III | IEC 60947-4-1:2018 (contacts miroirs, annexe F) · NF EN 60204-1:2018 (§ 9.3.4, verrouillages) | 22 | ✔ |
| Mesure d'isolement | `iso-prises-neuves` | I | IEC 60364-6:2016 (vérification initiale) · NF C 15-100:2002 · IEC 61557-2:2019 | 13 | ✔ |
| Mesure d'isolement | `iso-eclairage-clou` | I | IEC 60364-6:2016 · NF C 15-100:2002 · IEC 61557-2:2019 | 13 | ✔ |
| Mesure d'isolement | `iso-moteur-variateur` | II | IEC 60364-6:2016 · IEC 61557-2:2019 · NF C 18-510:2012+A1:2020 | 13 | ✔ |
| Mesure d'isolement | `iso-commande-24v` | II | IEC 60364-6:2016 (TBTS : 250 V, 0,5 MΩ) · NF EN 60204-1:2018 (§ 9.4.3) | 12 | ✔ |
| Mesure d'isolement | `iso-neutre-terre` | III | IEC 60364-6:2016 · IEC 60364-4-41:2005 (§ 411.5, schéma TT) | 12 | ✔ |
| Mesure d'isolement | `iso-cable-vieillissant` | III | IEC 60364-6:2016 · IEC 61557-2:2019 | 12 | ✔ |
| Mesure d'isolement | `iso-alternateur-humide` | II | IEC 60034-27-4:2018 · IEC 60364-6:2016 | 14 | ✔ |
| Mesure d'isolement | `iso-moteur-vernis` | III | IEC 60034-27-4:2018 · IEC 60364-6:2016 | 14 | ✔ |
| Couleurs | `mat-conducteurs.svg` | — |  | 2 | ✔ |
| Couleurs | `mat-capteur.svg` | — |  | 2 | ✔ |
| Couleurs | `mat-arret-urgence.svg` | — |  | 2 | ✔ |
| Couleurs | `mat-disjoncteur-modulaire.svg` | — |  | 2 | ✔ |
| Couleurs | `mat-relais-thermique.svg` | — |  | 2 | ✔ |
| Couleurs | `mat-cadenas.svg` | — |  | 2 | ✔ |
| Couleurs | `mat-megohmmetre.svg` | — |  | 2 | ✔ |
| Lexique | `tension` | — |  | 3 | ✔ |
| Lexique | `courant` | — |  | 3 | ✔ |
| Lexique | `phase` | — |  | 3 | ✔ |
| Lexique | `neutre` | — |  | 3 | ✔ |
| Lexique | `pe` | — |  | 3 | ✔ |
| Lexique | `multimetre` | — |  | 3 | ✔ |
| Lexique | `loz` | — |  | 3 | ✔ |
| Lexique | `fantome` | — |  | 3 | ✔ |
| Lexique | `vat` | — |  | 3 | ✔ |
| Lexique | `consignation` | — |  | 3 | ✔ |
| Lexique | `habilitation` | — |  | 3 | ✔ |
| Lexique | `tbt` | — |  | 3 | ✔ |
| Lexique | `bt` | — |  | 3 | ✔ |
| Lexique | `hta` | — |  | 3 | ✔ |
| Lexique | `contacteur` | — |  | 3 | ✔ |
| Lexique | `bobine` | — |  | 3 | ✔ |
| Lexique | `relais-thermique` | — |  | 3 | ✔ |
| Lexique | `sectionneur` | — |  | 3 | ✔ |
| Lexique | `disjoncteur` | — |  | 3 | ✔ |
| Lexique | `differentiel` | — |  | 3 | ✔ |
| Lexique | `fusible` | — |  | 3 | ✔ |
| Lexique | `am-gg` | — |  | 3 | ✔ |
| Lexique | `no` | — |  | 3 | ✔ |
| Lexique | `nf` | — |  | 3 | ✔ |
| Lexique | `com` | — |  | 3 | ✔ |
| Lexique | `ol` | — |  | 3 | ✔ |
| Lexique | `slt` | — |  | 3 | ✔ |
| Lexique | `selectivite` | — |  | 3 | ✔ |
| Lexique | `cat` | — |  | 3 | ✔ |
| Lexique | `megohmmetre` | — |  | 3 | ✔ |
| Lexique | `pince` | — |  | 3 | ✔ |
| Lexique | `bornier` | — |  | 3 | ✔ |
| Lexique | `variateur` | — |  | 3 | ✔ |
| Lexique | `court-circuit` | — |  | 3 | ✔ |
| Lexique | `irve` | — |  | 3 | ✔ |
| Lexique | `pv` | — |  | 3 | ✔ |
| Lexique | `onduleur` | — |  | 3 | ✔ |
| Lexique | `surcharge` | — |  | 3 | ✔ |
| Lexique | `couverture-niveau-I` | I |  | 1026 | ✔ |
