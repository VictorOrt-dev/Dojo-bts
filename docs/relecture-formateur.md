# Relecture formateur

*Fichier généré par `node outils/relecture.mjs` : ne pas modifier à la main.*

**123 éléments sur 123 à valider.** Pour chaque ligne, le formateur vérifie l'exactitude
technique, le niveau, le risque et la référence normative (édition comprise), puis passe `"verifie": true` dans le fichier source
(`data/*.json` ; pour un calcul, ajouter `verifie: true` au générateur dans `js/calcul.js`).

Les éditions sont ajoutées automatiquement depuis `js/normes.js` : les confirmer aussi.

## Normes citées sans édition connue

- IEC 60417-5019
- NF EN 50216
- NF EN 60898-1
- NF EN 60903
- NF EN 61008
- NF EN 61558

## Contenu

| Mode | Identifiant | Niv. | Domaines | Intitulé | Référence (édition) | Relu |
|---|---|---|---|---|---|---|
| Reconnaissance | `sym-contact-no` | I | tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · IEC 60947-5-1:2016 | ☐ |
| Reconnaissance | `sym-contact-nf` | I | tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF EN 60204-1:2018 | ☐ |
| Reconnaissance | `sym-bobine` | I | tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `sym-moteur` | I | tri | Que représente ce symbole ? | IEC 60617 (base en ligne) · IEC 60034-1:2022 | ☐ |
| Reconnaissance | `sym-fusible` | I | mono-bt, tri | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF EN 60269 (série) | ☐ |
| Reconnaissance | `sym-voyant` | I | tbt-cc | Que représente ce symbole ? | NF EN 60204-1:2018 (§ 10.3) | ☐ |
| Reconnaissance | `sym-transfo` | I | tri, tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF EN 61558 | ☐ |
| Reconnaissance | `mat-disjoncteur-modulaire` | I | mono-bt | Quel est ce matériel ? | NF EN 60898-1 · NF C 15-100:2002 | ☐ |
| Reconnaissance | `mat-contacteur` | I | tri | Quel est ce matériel ? | IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `mat-arret-urgence` | I | securite, tbt-cc | Quel est ce matériel ? | ISO 13850:2015 · NF EN 60204-1:2018 (§ 10.7) | ☐ |
| Reconnaissance | `mat-relais-thermique` | II | tri | Quel est ce matériel ? | IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `mat-disjoncteur-moteur` | II | tri | Quel est ce matériel ? | IEC 60947-2:2016 · IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `sym-sectionneur` | II | securite, tri | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF C 18-510:2012+A1:2020 | ☐ |
| Reconnaissance | `sym-disjoncteur` | II | mono-bt, tri | Que représente ce symbole ? | IEC 60617 (base en ligne) · IEC 60947-2:2016 | ☐ |
| Reconnaissance | `sym-bp-no` | II | tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF EN 60204-1:2018 (§ 10.2) | ☐ |
| Reconnaissance | `sym-bp-nf` | II | tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF EN 60204-1:2018 | ☐ |
| Reconnaissance | `sym-thermique` | II | tri | Que représente ce symbole ? | IEC 60617 (base en ligne) · IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `reco-thermique-bornes` | II | tbt-cc, tri | Quelles bornes de ce relais câbles-tu dans le circuit de commande pour couper le contacteu | IEC 60947-4-1:2018 · IEC 60947-1:2020 | ☐ |
| Reconnaissance | `reco-contacteur-bobine` | II | tbt-cc | Sur ce contacteur, quelles bornes alimentent la bobine ? | IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `reco-c16` | II | mono-bt | Sur un disjoncteur modulaire comme celui-ci, que signifie le marquage « C16 » ? | NF EN 60898-1 · NF C 15-100:2002 | ☐ |
| Reconnaissance | `reco-no-bornes` | II | tbt-cc | Ce symbole est le premier contact auxiliaire d'un contacteur. Quelles bornes porte-t-il ? | IEC 60947-1:2020 (repérage des bornes) | ☐ |
| Reconnaissance | `reco-nf-bornes` | II | tbt-cc | Ce contact est le deuxième contact auxiliaire d'un appareil. Quelles bornes porte-t-il ? | IEC 60947-1:2020 (repérage des bornes) | ☐ |
| Reconnaissance | `reco-reglage-molette` | II | tri | Sur quelle valeur règles-tu la molette de ce disjoncteur moteur ? | IEC 60947-4-1:2018 | ☐ |
| Reconnaissance | `reco-au-categorie` | III | securite | Quel contact et quelle catégorie d'arrêt pour cet arrêt d'urgence (IEC 60204-1) ? | ISO 13850:2015 · NF EN 60204-1:2018 (§ 9.2.2) | ☐ |
| Reconnaissance | `reco-moteur-81346` | III | tri | Quel repère IEC 81346 donnes-tu à ce moteur sur le schéma ? | IEC 81346-2:2019 | ☐ |
| Reconnaissance | `reco-contacteur-protection` | III | tri | Départ moteur : fusibles aM 16 A, contacteur, relais thermique réglé à 11 A. Une cartouche | IEC 60947-4-1:2018 (classes de déclenchement) · IEC 60269 (série) (fusibles aM) | ☐ |
| Reconnaissance | `reco-sectionneur-charge` | III | securite, tri | Peut-on manœuvrer cet appareil en charge ? | IEC 60947-3:2020 · NF C 18-510:2012+A1:2020 | ☐ |
| Reconnaissance | `reco-icc-transfo` | III | tri, hta | Ce transformateur a une tension de court-circuit ucc = 5 %. Au secondaire, le courant de c | NF C 15-100:2002 (§ 434) · IEC 60076-5:2006 | ☐ |
| Reconnaissance | `reco-reglage-thermique` | III | tri | Plaque moteur : 230/400 V – 19/11 A. Réseau 400 V, couplage étoile. Sur combien règles-tu  | IEC 60947-4-1:2018 · IEC 60034-1:2022 | ☐ |
| Reconnaissance | `reco-voyant-couleur` | II | tbt-cc, securite | Ce voyant signale une condition anormale (surchauffe imminente, niveau bas…). Quelle coule | NF EN 60204-1:2018 (§ 10.3.2) | ☐ |
| Reconnaissance | `sym-alim-dc` | I | tbt-cc | Que représente ce symbole ? | IEC 60617 (base en ligne) · NF EN 60204-1:2018 (§ 9.4.3) | ☐ |
| Reconnaissance | `sym-diode-roue-libre` | II | tbt-cc | Ce composant est câblé en parallèle sur la bobine d'un relais 24 V DC. Que représente-t-il | IEC 60617 (base en ligne) | ☐ |
| Reconnaissance | `sym-sectionneur-terre` | III | hta, securite | Que représente ce symbole, que l'on trouve dans les cellules HTA ? | NF C 18-510:2012+A1:2020 · IEC 60617 (base en ligne) | ☐ |
| Reconnaissance | `reco-couplage-dyn11` | III | hta, tri | La plaque de ce transformateur de poste HTA/BT indique « Dyn11 ». Que signifie la lettre « | IEC 60076-1:2011 | ☐ |
| Reconnaissance | `sym-differentiel` | I | mono-bt, securite | Que représente ce symbole, en tête d'un tableau de bureaux ? | NF C 15-100:2002 (§ 411.3.3) · NF EN 61008 / 61009 | ☐ |
| Reconnaissance | `reco-commande-lampe` | I | mono-bt, securite | Ce point lumineux est commandé par un interrupteur simple. Quel conducteur l'interrupteur  | NF C 15-100:2002 (commande unipolaire sur la phase) | ☐ |
| Reconnaissance | `reco-tn-c-ddr` | III | mono-bt, tri | Le tableau est en schéma TN-C (conducteur PEN commun). Peut-on protéger un départ avec ce  | NF C 15-100:2002 (§ 411.4.5) | ☐ |
| Reconnaissance | `reco-led-allumee` | III | mono-bt | Interrupteur ouvert, la lampe LED de ce couloir reste faiblement allumée. Le câble fait 40 | NF C 15-100:2002 · NF EN 61243-3:2014 (VAT) | ☐ |
| Reconnaissance | `reco-domaine-hta` | I | hta, securite | Ce transformateur de poste est alimenté en 20 kV alternatif. Dans quel domaine de tension  | NF C 18-510:2012+A1:2020 (domaines de tension) | ☐ |
| Reconnaissance | `reco-habilitation-b1v` | I | hta, securite | Ton titre d'habilitation porte « B1V ». Peux-tu manœuvrer l'interrupteur-sectionneur d'une | NF C 18-510:2012+A1:2020 (symboles d'habilitation) | ☐ |
| Reconnaissance | `reco-dgpt2` | II | hta, tri | Sur ce transformateur immergé, un relais DGPT2 est monté sur le couvercle. Que surveille-t | NF C 13-100:2015 · NF EN 50216 | ☐ |
| Reconnaissance | `reco-fusible-percuteur` | II | hta | Dans une cellule HTA interrupteur-fusibles, ce fusible est dit « à percuteur ». À quoi ser | IEC 62271-105:2021 (combinés interrupteur-fusibles) | ☐ |
| Reconnaissance | `sym-terre-protection` | I | securite, tri | Ce symbole est gravé à côté d'une borne, dans la boîte à bornes d'un moteur. Qu'indique-t- | IEC 60417-5019 · NF EN 60204-1:2018 (§ 8.2) | ☐ |
| Reconnaissance | `reco-epi-vat` | II | securite | Tu dois vérifier l'absence de tension en aval de ce disjoncteur, dans une armoire 400 V. Q | NF C 18-510:2012+A1:2020 · NF EN 60903 (gants isolants) | ☐ |
| Reconnaissance | `reco-prises-25` | II | mono-bt | Circuit de prises 16 A en cuivre 2,5 mm². Calibre maximal du disjoncteur qui le protège ? | NF C 15-100:2002 (partie 7-771, circuits de prises) | ☐ |
| Reconnaissance | `reco-sens-rotation` | I | tri | Ce moteur triphasé tourne à l'envers après un remplacement. Comment inverses-tu son sens d | IEC 60034-8:2007 (repérage des bornes et sens de rotation) | ☐ |
| Reconnaissance | `reco-cat-marquage` | I | securite | Ce multimètre porte le marquage « CAT III 1000 V ». Que garantit la catégorie de mesure ? | IEC 61010-2-030:2017 · NF C 18-510:2012+A1:2020 | ☐ |
| Reconnaissance | `reco-vat-appareil` | I | securite | Quel appareil utilises-tu pour la vérification d'absence de tension (VAT) avant de toucher | NF C 18-510:2012+A1:2020 · NF EN 61243-3:2014 | ☐ |
| Reconnaissance | `reco-cadenas-pancarte` | I | securite | Ce cadenas et cette pancarte sont posés sur la poignée d'un sectionneur ouvert. À quoi ser | NF C 18-510:2012+A1:2020 (consignation) | ☐ |
| Reconnaissance | `reco-couleur-neutre` | I | mono-bt | Dans ce câble d'un circuit monophasé, à quoi est réservé le conducteur bleu clair ? | IEC 60445:2021 · NF C 15-100:2002 | ☐ |
| Reconnaissance | `reco-cat-tgbt` | II | securite | Tu dois mesurer à l'origine de l'installation, juste en aval du disjoncteur de branchement | IEC 61010-2-030:2017 · NF C 18-510:2012+A1:2020 | ☐ |
| Reconnaissance | `reco-capteur-3fils` | II | tbt-cc | Détecteur inductif PNP à trois fils. Sur quel fil arrive le signal envoyé à l'entrée de l' | IEC 60947-5-2:2019 | ☐ |
| Reconnaissance | `reco-renvoi-folio` | II | tbt-cc | Sur le folio 3 d'un schéma, ce conducteur se termine par une flèche portant le repère « 5. | IEC 61082-1:2014 (documents électrotechniques) | ☐ |
| Reconnaissance | `reco-repere-bornier` | II | tbt-cc | Sur le schéma, un conducteur passe par le repère « -X1:12 ». Où le trouves-tu dans l'armoi | IEC 81346-2:2019 · IEC 61666:2010 | ☐ |
| Reconnaissance | `reco-megohmmetre-prep` | II | securite, tri | Avant de mesurer au mégohmmètre (500 V DC) l'isolement du câble d'un moteur alimenté par v | IEC 61557-2:2019 · IEC 60364-6:2016 · NF C 18-510:2012+A1:2020 | ☐ |
| Reconnaissance | `reco-plaque-poles` | II | tri | Plaque d'un moteur asynchrone : 1 450 tr/min, 50 Hz. Combien de pôles a-t-il ? | IEC 60034-1:2022 | ☐ |
| Reconnaissance | `reco-cat-fusibles` | III | securite | Pourquoi un multimètre de catégorie III ou IV protège-t-il sa borne « A » par un fusible s | IEC 61010-2-030:2017 · NF C 18-510:2012+A1:2020 | ☐ |
| Reconnaissance | `reco-auto-maintien` | III | tbt-cc | Le contact 13-14 de KM1 doit être câblé en parallèle du bouton Marche. Que se passe-t-il s | IEC 60617 (base en ligne) · NF EN 60204-1:2018 | ☐ |
| Reconnaissance | `reco-au-deux-canaux` | III | securite, tbt-cc | Pourquoi l'arrêt d'urgence d'une machine récente passe-t-il souvent par un module de sécur | ISO 13849-1:2023 · ISO 13850:2015 · NF EN 60204-1:2018 | ☐ |
| Reconnaissance | `reco-ddr-type-f` | III | mono-bt, securite | Ce différentiel protège une pompe à chaleur à variateur monophasé. Quel type choisis-tu, s | NF C 15-100:2002 · IEC 62423:2009 | ☐ |
| Calcul | `ohm` | I | tbt-cc, mono-bt | Loi d'Ohm |  | ☐ |
| Calcul | `puissance` | I | mono-bt | Puissance et énergie | NF C 15-100:2002 | ☐ |
| Calcul | `tension-attendue` | I | mono-bt | Tension attendue au récepteur | NF C 15-100:2002 (§ 525) | ☐ |
| Calcul | `alim-24v` | I | tbt-cc | Alimentation 24 V DC | IEC 61131-2:2017 (24 V DC : plage 20,4 à 28,8 V) | ☐ |
| Calcul | `tensions-reseau` | I | tri | Tension simple et tension composée | IEC 60038:2009 (tensions normales) | ☐ |
| Calcul | `courant-corps` | I | securite | Courant à travers le corps | IEC 60479-1:2018 · NF C 15-100:2002 (§ 411) | ☐ |
| Calcul | `rapport-transfo` | I | hta, tri | Rapport d'un transformateur de poste | IEC 60076-1:2011 | ☐ |
| Calcul | `triphase` | II | tri | Puissances en triphasé |  | ☐ |
| Calcul | `intensite` | II | tri | Intensité nominale moteur | IEC 60947-4-1:2018 | ☐ |
| Calcul | `couplage` | II | tri | Couplage étoile / triangle | IEC 60034-1:2022 (plaque moteur) | ☐ |
| Calcul | `chute-mono` | II | mono-bt | Chute de tension en monophasé | NF C 15-100:2002 (§ 525) | ☐ |
| Calcul | `charge-moteur` | II | tri | Courant mesuré et plaque moteur | IEC 60034-1:2022 | ☐ |
| Calcul | `chute-24v` | II | tbt-cc | Chute de tension en 24 V DC | IEC 61131-2:2017 · NF C 15-100:2002 (§ 525) | ☐ |
| Calcul | `contact-tt` | II | securite, mono-bt | Défaut d'isolement en schéma TT | NF C 15-100:2002 (§ 411.5) · UL = 50 V en local sec | ☐ |
| Calcul | `prise-transfo` | II | hta | Prises de réglage d'un transformateur | IEC 60076-1:2011 · NF C 18-510:2012+A1:2020 | ☐ |
| Calcul | `chute-tri` | III | tri | Chute de tension en triphasé | NF C 15-100:2002 (§ 525) | ☐ |
| Calcul | `compensation` | III | tri | Compensation du réactif | IEC 60831-1:2014 | ☐ |
| Calcul | `boucherot` | III | tri | Méthode de Boucherot |  | ☐ |
| Calcul | `transfo` | III | tri, hta | Transformateur : In et Icc | NF C 15-100:2002 (§ 434) · IEC 60076-5:2006 | ☐ |
| Calcul | `desequilibre` | III | tri | Déséquilibre entre phases | IEC 60034-26:2006 | ☐ |
| Calcul | `hta-courant` | III | hta, tri | Courant côté HTA d'un poste | NF C 13-100:2015 · IEC 60076-1:2011 | ☐ |
| Calcul | `lmax-tn` | III | securite, mono-bt | Longueur maximale protégée en TN | NF C 15-100:2002 (§ 411.4) · guide UTE C 15-105:2003 | ☐ |
| Calcul | `boucle-4-20` | III | tbt-cc | Boucle de courant 4-20 mA | IEC 60381-1:1982 · NAMUR NE 43 | ☐ |
| Calcul | `neutre-coupe` | III | mono-bt, tri | Neutre coupé | NF C 15-100:2002 (le neutre n'est jamais coupé ni protégé seul) | ☐ |
| Calcul | `magnetique-courbe` | I | mono-bt | Seuil magnétique d'un disjoncteur | IEC 60898-1:2015 | ☐ |
| Calcul | `energie-condensateur` | I | securite, tri | Énergie restée dans un variateur | NF C 18-510:2012+A1:2020 (énergies résiduelles) · IEC 61800-5-1:2022 | ☐ |
| Calcul | `sortie-api` | I | tbt-cc | Courant d'une sortie d'automate | IEC 61131-2:2017 | ☐ |
| Calcul | `iz-correction` | II | mono-bt, tri | Courant admissible corrigé d'un câble | NF C 15-100:2002 (§ 523) · IEC 60364-5-52:2009 | ☐ |
| Calcul | `isolement-attendu` | II | securite, tri | Résistance d'isolement attendue | IEC 60364-6:2016 · IEC 61557-2:2019 | ☐ |
| Calcul | `glissement` | II | tri | Glissement d'un moteur asynchrone | IEC 60034-1:2022 | ☐ |
| Calcul | `icc-aval` | III | tri | Courant de court-circuit en aval d'un câble | IEC 60909-0:2016 · NF C 15-100:2002 (§ 434) | ☐ |
| Calcul | `reglage-ir` | III | tri, mono-bt | Réglage du thermique d'un disjoncteur | NF C 15-100:2002 (§ 433) · IEC 60947-2:2016 | ☐ |
| Cas de panne | `commande-hs` | I | tbt-cc | La pompe ne démarre plus, rien ne se passe | NF EN 60204-1:2018 (§ 9.4.3) | ☐ |
| Cas de panne | `differentiel-perceuse` | I | mono-bt, securite | Le différentiel saute quand on branche la perceuse | NF C 15-100:2002 (§ 411.3.3) | ☐ |
| Cas de panne | `consignation-contacteur` | I | securite, tri | Changer le contacteur d'un départ moteur : la consignation | NF C 18-510:2012+A1:2020 · NF EN 61243-3:2014 (VAT) | ☐ |
| Cas de panne | `poste-general-bt` | I | hta, securite | Coupure générale : le disjoncteur BT du poste a déclenché | NF C 18-510:2012+A1:2020 · NF C 13-100:2015 · NF C 15-100:2002 | ☐ |
| Cas de panne | `moteur-grogne` | II | tri | Le moteur grogne et ne démarre pas | IEC 60947-4-1:2018 · IEC 60034-1:2022 | ☐ |
| Cas de panne | `capteur-convoyeur` | II | tbt-cc | Le convoyeur ne s'arrête plus en fin de course | IEC 61131-2:2017 · NF EN 60204-1:2018 | ☐ |
| Cas de panne | `retour-lampe-neutre` | II | mono-bt, securite | Décharge électrique en changeant une ampoule, interrupteur éteint | NF C 15-100:2002 (commande unipolaire sur la phase) · NF C 18-510:2012+A1:2020 | ☐ |
| Cas de panne | `barrette-terre` | II | securite, mono-bt | Mesure de la prise de terre : la barrette de coupure | NF C 15-100:2002 (§ 411.5, § 542) · NF C 18-510:2012+A1:2020 | ☐ |
| Cas de panne | `hta-enclenchement` | II | hta | Le disjoncteur HTA déclenche à chaque remise sous tension | NF C 13-100:2015 · IEC 60255 (série) · NF C 18-510:2012+A1:2020 | ☐ |
| Cas de panne | `variateur-surtension` | III | tri | Variateur en défaut « surtension » à chaque arrêt | IEC 61800-5-1:2022 | ☐ |
| Cas de panne | `differentiel-variateurs` | III | securite, tri | Le différentiel général déclenche « sans raison » | NF C 15-100:2002 (§ 411.5, § 531.2) | ☐ |
| Cas de panne | `hta-dgpt2` | III | hta, securite | Poste HTA/BT : le transformateur a déclenché sur son DGPT2 | NF C 18-510:2012+A1:2020 · NF C 13-100:2015 · IEC 60076 (série) | ☐ |
| Cas de panne | `sorties-grillees` | III | tbt-cc | Une sortie d'automate grille pour la deuxième fois en un mois | NF EN 60204-1:2018 · IEC 61131-2:2017 | ☐ |
| Cas de panne | `neutre-tgbt` | III | mono-bt, tri | Lundi matin : onduleurs grillés et lampes qui brillent trop | NF C 15-100:2002 (le neutre n'est jamais coupé ni protégé seul) · NF C 18-510:2012+A1:2020 | ☐ |
| Cas de panne | `vat-procedure` | I | securite, mono-bt | Remplacer un disjoncteur : consigner et vérifier l'absence de tension | NF C 18-510:2012+A1:2020 (consignation, VAT) · NF EN 61243-3:2014 (détecteurs de tension) | ☐ |
| Cas de panne | `isolement-moteur-lavage` | II | tri, securite | Défaut terre au démarrage après le lavage haute pression | IEC 60364-6:2016 (mesure d'isolement) · IEC 61557-2:2019 (mégohmmètres) · NF C 18-510:2012+A1:2020 | ☐ |
| Cas de panne | `it-premier-defaut` | III | securite, mono-bt | Schéma IT : le contrôleur d'isolement sonne en pleine production | NF C 15-100:2002 (§ 411.6, schéma IT) · IEC 61557-8:2014 (CPI) · IEC 61557-9:2014 (recherche de défaut) | ☐ |
| Cas de panne | `selectivite-tgbt` | III | tri, mono-bt | Un court-circuit sur une meuleuse arrête tout l'atelier | NF C 15-100:2002 (§ 535, sélectivité) · IEC 60947-2:2016 | ☐ |
| Cas de panne | `hta-manoeuvre-serrures` | III | hta, securite | Poste HTA : mettre le transformateur hors tension par les serrures | NF C 18-510:2012+A1:2020 (manœuvres et consignation HTA) · NF C 13-100:2015 (poste de livraison) · IEC 62271-200:2021 | ☐ |
| Cas de panne | `telerupteur-couloir` | I | mono-bt | Les lampes du couloir restent allumées et le tableau bourdonne | NF C 15-100:2002 · IEC 60669-2-2:2006 (télérupteurs) | ☐ |
| Cas de panne | `moteur-sens-inverse` | I | tri | Moteur neuf, extraction très faible dans la cabine de peinture | NF EN 60204-1:2018 (§ 18, vérifications) · IEC 60034-8:2007 (sens de rotation) | ☐ |
| Cas de panne | `capteur-pnp-npn` | II | tbt-cc | Détecteur remplacé : le convoyeur ne s'arrête plus | IEC 60947-5-2:2019 (détecteurs de proximité) · IEC 61131-2:2017 (entrées automate) | ☐ |
| Cas de panne | `neutre-partage-ddr` | II | mono-bt, securite | Le différentiel de l'éclairage saute quand on branche l'établi | NF C 15-100:2002 (un neutre propre à chaque circuit) | ☐ |
| Cas de panne | `double-source` | II | securite, mono-bt | Circuit consigné, mais le VAT indique encore 230 V | NF C 18-510:2012+A1:2020 (séparation de toutes les sources, VAT) | ☐ |
| Cas de panne | `energie-residuelle-variateur` | II | securite, tri | Variateur consigné : peut-on ouvrir le capot ? | NF C 18-510:2012+A1:2020 (énergies résiduelles) · IEC 61800-5-1:2022 (variateurs) | ☐ |
| Cas de panne | `demarrage-intempestif-24v` | III | tbt-cc, securite | La presse a démarré seule pendant un réglage | NF EN 60204-1:2018 (§ 9.4.3, défauts à la terre du circuit de commande) | ☐ |
| Banc | `fu1-fondu` | I | mono-bt, tri | Rien ne se passe à l'appui sur Marche. Le voyant « sous tension » H1 est éteint. | NF EN 60204-1:2018 (§ 7.2.4) | ☐ |
| Banc | `contact-95-96` | II | mono-bt, tri | Rien ne se passe à l'appui sur Marche. Le voyant H1 est allumé. Le relais thermique ne sem | IEC 60947-4-1:2018 | ☐ |
| Banc | `bobine-coupee` | I | mono-bt, tri | Rien ne se passe à l'appui sur Marche, pas même le claquement du contacteur. Le voyant H1  | NF EN 61243-3:2014 (VAT) | ☐ |
| Banc | `cable-pupitre` | III | mono-bt, tri | Rien ne se passe à l'appui sur Marche, pas même le claquement du contacteur. Le voyant H1  | NF EN 60204-1:2018 (§ 13) | ☐ |
| Banc | `fusible-l2` | II | tri | Au démarrage, le moteur grogne, puis tout s'arrête au bout de quelques secondes. L'opérate | NF EN 60269 (série) (fusibles aM) | ☐ |
