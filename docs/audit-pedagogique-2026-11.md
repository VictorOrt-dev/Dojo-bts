# Audit pédagogique : contenu et système de formation

*Elec learning · 2 novembre 2026 · audit du contenu (`data/*.json`, `js/calcul.js`) et des règles de progression (`js/parcours.js`, `js/positionnement.js`, `js/xp.js`).*

Les chiffres viennent d'un comptage automatique des fichiers. Ils ne viennent pas d'une estimation.

---

## Synthèse

Elec learning a une qualité rare : **la correction**. Chaque mauvaise réponse est expliquée par le raisonnement qui y mène :
- `pourquoiPas` est rempli pour **46/46** questions de reconnaissance ;
- **41** erreurs typiques de calcul sont détectées à ±2 % ;
- le verdict « danger » est séparé du simple « mauvais » ;
- le risque réel et la norme sont présents sur 100 % des éléments.

Peu d'outils de formation en électrotechnique, payants compris, vont aussi loin.

Le **système** autour de ce contenu ne suit pas encore :

1. **Le volume est trop faible pour que la répétition reste un entraînement.**
   - Il y a 46 questions, 24 types de calcul, 14 cas de panne et 5 pannes au banc.
   - Sur les 15 cases niveau × domaine, **10** n'ont qu'**un seul cas de panne**, et aucune n'en a plus de 3.
   - Une séance de reconnaissance filtrée par domaine compte parfois **2 questions**.
2. **Le niveau III des cas de panne a la même forme que le niveau I.**
   - Même nombre d'étapes (3,2), même nombre de choix (3,5), même longueur de texte (≈ 90 mots).
   - Le saut est réel dans le contenu (cumul de fuites, neutre coupé, DGPT2), mais l'exercice demandé reste le même : un QCM à une bonne réponse par étape.
3. **Il manque des compétences centrales du métier.**
   - Aucun exercice n'est consacré à la mesure d'isolement, au schéma IT et à son contrôleur permanent d'isolement (CPI), à la consignation décomposée geste par geste, à la lecture d'un dossier de schémas, à la maintenance préventive ou au compte rendu d'intervention.
4. **Deux règles de progression sont mal calibrées.**
   - Le test de positionnement (reconnaissance seule) valide aussi les calculs et les cas de panne.
   - L'étape Banc du parcours exige une intervention parfaite.
5. **0 élément sur 60 est relu par un formateur** (`"verifie": false` partout). Pour un chef d'équipe, c'est le premier point qu'il regardera.

---

## 1. Le guidage étape par étape

### Ce qui fonctionne

- Il y a trois profils avec trois ordres de parcours. Le débutant suit l'ordre R1 → C1 → P1 → B → R2 → C2 → P2 → R3 → C3 → P3.
- La carte « Ta prochaine séance » indique toujours quoi faire.
- Le déblocage souple fonctionne : rien n'est verrouillé, une mention « Conseillé après… » apparaît, et la HTA est signalée comme domaine expert.
- Au banc, la visite guidée, la mission et les indices pas à pas réduisent nettement le choc de la première panne.

### Les quatre ruptures de complexité

**1. Du calcul au diagnostic (C1 → P1).**
- En C1, on applique une formule à des données fournies.
- En P1, il faut choisir une démarche dans une situation.
- Rien ne fait le lien entre les deux. Seul le calcul « tension attendue » s'en approche : prévoir une valeur avant de mesurer.
- Il manque un exercice charnière : « voici un schéma et trois mesures, laquelle est anormale ? ».

**2. Du QCM à la manipulation libre (P1 → Banc).**
- En P1, on choisit parmi 3 ou 4 réponses.
- Au banc, on a 30 points de mesure, 3 fonctions et 7 actions. Il faut aussi comprendre deux notions jamais vues dans un exercice de niveau I : la tension fantôme (LoZ) et le circuit ouvert lu en Ω.
- La panne du banc est **tirée au sort parmi les 5**, sans tenir compte de leur difficulté. Le temps de référence va de 31 min (FU1 fondu) à 72 min (câble du pupitre, avec tension fantôme). Un débutant peut tomber sur la plus difficile dès sa première intervention.

**3. La lecture de schéma n'est enseignée nulle part.**
- La reconnaissance traite des symboles isolés. Le banc suppose que l'on sait suivre un circuit de commande de folio en folio.
- Cette compétence est la plus transversale du métier, et aucun module ne la travaille.

**4. Aucune remédiation.**
- Un débutant qui échoue en C2 se voit reproposer… C2, sans diagnostic de ce qui bloque (puissance ? cos φ ? conversion d'unités ?).
- Les fiches de cours ont été retirées (c'était voulu). La seule source d'apprentissage est donc la correction après erreur, ce qui revient à apprendre en échouant.
- Pour un profil « je découvre l'électricité », c'est insuffisant. La recherche le montre : un novice apprend plus vite avec un **exemple résolu** qu'en cherchant seul (effet « worked example »).

### Deux jalons mal calibrés (à corriger en priorité)

| Règle | Constat | Effet |
|---|---|---|
| Positionnement : `niveauAcquis()` accepte `positionnement.niveau ≥ n` pour **tous les modes** | Le test ne pose que 10 questions de **reconnaissance** | Un confirmé qui reconnaît les symboles voit les Calculs III et les Cas III validés sans avoir rien calculé ni diagnostiqué |
| Étape B : validée par `reussites > 0`, et une réussite n'est comptée que pour une intervention **parfaite** | Une intervention parfaite demande : aucun indice, aucune alerte, aucune pièce inutile, temps ≤ 1,3 × la référence | Un débutant qui répare avec des indices reste bloqué à l'étape 4, sans explication. Retirer progressivement l'aide est une bonne idée, mais le critère doit être affiché et progressif |

### Jalons intermédiaires manquants

- **Un bilan de fin de niveau, tous modes confondus** : 5 reconnaissances, 3 calculs et 1 cas. C'est lui qui devrait valider le niveau, plutôt qu'un score de 8/10 dans un seul mode.
- **Une étape « Révision »** dans le parcours : rejouer ses erreurs avant de passer au niveau suivant.
- **Un banc gradué** : panne de niveau I d'abord (FU1, bobine), niveau II ensuite (95-96, fusible L2), niveau III en dernier (câble du pupitre, tension fantôme).

**Verdict.** Il y a une bonne rampe d'accès au premier écran, puis des marches irrégulières. Le parcours indique le prochain mode, mais il ne vérifie pas que la compétence nécessaire est acquise.

---

## 2. Couverture et équilibre des domaines

### Répartition actuelle

Le domaine principal est le premier de la liste `domaines`. Entre parenthèses : le nombre d'éléments qui touchent le domaine (c'est ce que comptent les filtres).

| Domaine | Reconnaissance | Calculs | Cas de panne | Banc | **Total principal** | Part |
|---|---|---|---|---|---|---|
| TBT & CC | 13 (15) | 4 (4) | 3 (3) | 0 | **20** | 22 % |
| Monophasé & BT | 9 (9) | 4 (7) | 3 (4) | 4 (4) | **20** | 22 % |
| Triphasé & puissance | 12 (21) | **10** (13) | **2** (5) | 1 (5) | **25** | 28 % |
| Sécurité & habilitations | 6 (12) | 3 (3) | 3 (7) | 0 | **12** | 14 % |
| HTA & postes | 6 (7) | 3 (4) | 3 (3) | 0 | **12** | 14 % |
| **Total** | 46 | 24 | 14 | 5 | **89** | |

### Lecture critique

**Triphasé : le déséquilibre est entre les modes, pas dans le total.**
- Pour un électricien de maintenance industrielle, qu'environ un tiers du contenu touche au triphasé est normal (44 éléments sur 89 le touchent, 25 en domaine principal).
- Le problème est ailleurs : le triphasé, c'est **42 % des calculs** mais seulement **2 cas de panne sur 14** (moteur qui grogne, variateur en surtension).
- Le cœur du métier, diagnostiquer un départ moteur, repose presque entièrement sur un seul circuit au banc.

**Sécurité : présente partout, mais peu entraînée en tant que telle.**
- Le risque est écrit sur 100 % des éléments, et la consignation est obligatoire au banc. C'est la bonne approche.
- En revanche, aucun exercice ne demande de :
  - remettre les étapes de la consignation dans l'ordre (séparer, condamner, identifier, vérifier l'absence de tension, mettre à la terre et en court-circuit) ;
  - choisir l'habilitation qui correspond à une tâche (B1V, B2V, BR, BC, BE Mesure, H0V…) ;
  - raisonner sur les zones d'environnement et la distance limite de voisinage ;
  - remplir ou lire une attestation de consignation ;
  - gérer les énergies résiduelles (condensateurs, bus continu des variateurs).
- Au banc, la consignation tient en **un seul bouton** : « Consigner le départ (Q1 + VAT) ». Le geste que l'application veut rendre réflexe est donc réduit à un clic.

**HTA : la quantité est correcte, l'angle est à revoir.**
- 12 éléments, c'est cohérent pour un domaine expert.
- Mais le technicien de maintenance BT ne calcule pas de courants HTA. Il **manœuvre** (H0V, BE Manœuvre), suit des **verrouillages par serrures** et relève un **DGPT2**.
- Il faut moins de calcul et plus de procédure.

**TBT & CC : l'automatisme est survolé.**
- Il y a un cas de capteur, un cas de sortie d'automate et la boucle 4-20 mA.
- Il manque :
  - les capteurs 2 et 3 fils, PNP et NPN ;
  - le relais de sécurité (catégorie, niveau de performance PL) ;
  - la chaîne d'arrêt d'urgence en diagnostic ;
  - l'alimentation 24 V, son 0 V et son raccordement à la terre.

**Angles morts communs à tous les domaines :**

| Compétence | Présence actuelle |
|---|---|
| Mesure d'isolement (mégohmmètre, 500 V DC, seuils, débrancher l'électronique) | quelques mentions, **aucun exercice** |
| Schéma IT et CPI (rechercher un premier défaut sans couper la production) | 1 mention, **aucun exercice** |
| Démarrage étoile-triangle, démarreur progressif | 2 calculs, **aucun cas ni banc** |
| Sélectivité, filiation | 3 mentions dans des cas, **aucun calcul** |
| Lecture de dossier technique (folios, renvois, nomenclature, borniers) | **absente** |
| Maintenance préventive (thermographie, resserrage, plan de maintenance) | **absente** |
| Compte rendu d'intervention, remise en service, essais | **absents** |
| Catégories de mesure CAT III / CAT IV et choix de l'appareil | **absentes** |

### Volume et répétition

| Mode | Taille d'une séance | Réserve | Conséquence mesurée |
|---|---|---|---|
| Reconnaissance, tous domaines | 10 questions | 14 à 17 par niveau | Au moins 3 questions déjà vues dès la 2ᵉ séance ; après 2 séances, 83 à 92 % du niveau a déjà été vu |
| Reconnaissance, filtrée par domaine | min(10, réserve) | **2 à 8** | 4 cases sur 15 donnent une séance de **2 questions**, 7 cases 3 questions ou moins : sous le seuil du bonus (5) |
| Calculs, filtrés par domaine | 10 calculs | **1 à 7** types | 7 cases sur 15 n'ont qu'**un seul type** : 10 fois le même énoncé avec d'autres valeurs |
| Cas de panne | 1 cas | **1 à 3** par case (1 dans 10 cases sur 15) | Un cas réussi est un cas appris par cœur ; il n'y a plus de diagnostic, seulement du souvenir |
| Banc | 1 panne | 5, sur 1 seul circuit | Après 5 interventions, toutes les pannes sont connues |

**Volume cible pour éviter la répétition excessive** (par case niveau × domaine) : **6 questions, 3 types de calcul, 3 cas**. Soit 90 questions, 45 calculs et 45 cas, contre 46, 24 et 14 aujourd'hui. Le plan d'action vise d'abord les cases où l'écart pèse le plus.

---

## 3. Graduation des niveaux I, II et III

### Reconnaissance : une graduation inégale

Les questions de niveau III ne demandent pas toutes un vrai saut. Un tiers relève de la **mémorisation d'un détail moins courant**, pas d'un raisonnement :

| Élément de niveau III | Problème | Proposition |
|---|---|---|
| `reco-no-bornes` (13-14), `reco-nf-bornes` (21-22) | Plus simples que `reco-thermique-bornes` (95-96), classé en **II** | Passer en **II** |
| `reco-reglage-molette`, `reco-contacteur-protection`, `reco-reglage-thermique` | **Trois questions sur la même notion** (relais réglé sur l'In) | Garder `reco-reglage-thermique` (plaque 19/11 A en étoile : vrai piège de couplage) en III, passer `reco-reglage-molette` en II, remplacer `reco-contacteur-protection` |
| `reco-voyant-couleur` (jaune) | Fait à retenir, aucun raisonnement | Passer en II, ou demander « quelle couleur pour ce cas précis, et pourquoi pas rouge ? » |

Les vraies questions de niveau III, à prendre pour modèle :
- `reco-tn-c-ddr` (le PEN traverse le tore) ;
- `reco-led-allumee` (couplage capacitif) ;
- `reco-icc-transfo` (Icc ≈ In / ucc) ;
- `reco-couplage-dyn11`.

Chacune oblige à **raisonner sur la physique** à partir d'un indice.

### Calculs : graduation réelle

- Le niveau I applique une formule (loi d'Ohm, P = U·I).
- Le niveau II enchaîne deux grandeurs (√3, cos φ, chute de tension).
- Le niveau III combine et interprète : Boucherot, compensation, neutre coupé, longueur maximale en TN, boucle 4-20 mA.
- C'est la partie la mieux graduée de l'application.
- Ce qui manque au niveau III, ce sont des calculs de **décision** : « cette mesure est-elle normale ? », « ce disjoncteur est-il sélectif avec celui du dessus ? », « faut-il un câble plus gros ou un disjoncteur plus petit ? ».

### Cas de panne : le contenu monte en difficulté, la forme ne bouge pas

| Niveau | Étapes par cas | Choix par étape | Mots de mise en situation |
|---|---|---|---|
| I | 3,3 | 3,5 | 89 |
| II | 3,2 | 3,6 | 82 |
| III | 3,2 | 3,6 | 95 |

Le contenu de niveau III est d'un bon niveau :
- cumul des courants de fuite des filtres CEM ;
- neutre coupé au TGBT ;
- diode de roue libre absente ;
- freinage de variateur ;
- DGPT2.

Mais l'**exercice** reste le même qu'au niveau I : trois questions, une bonne réponse à chaque fois. Une vraie panne de niveau III se reconnaît à d'autres traits :

- **l'information coûte** : on choisit quelle mesure demander, et chaque mesure prend du temps ;
- **plusieurs hypothèses** restent ouvertes : il faut les classer, pas en choisir une ;
- **la panne est intermittente** ou a deux causes : la première réparation ne suffit pas ;
- **les décisions s'enchaînent** : un mauvais choix mène vers une branche qui coûte cher, au lieu de s'arrêter sur un simple « mauvais » ;
- **une contrainte humaine** pèse : production qui presse, sous-traitant, astreinte de nuit. Le cas `differentiel-variateurs` l'amorce avec « régler le problème vite ». C'est à généraliser.

**Verdict.** Le saut de niveau est réel dans le **savoir**, mais pas dans le **savoir-faire** : le niveau III demande de mieux savoir, pas de raisonner autrement.

---

## 4. Pertinence du système pédagogique de terrain

### Ce qui forge déjà des réflexes de pro

- **« Le risque, en vrai »** : chaque erreur est reliée à ses conséquences, comme le feu dans la goulotte ou la carcasse sous tension. C'est ce qui ancre un réflexe.
- **Le verdict « danger »**, distinct de « mauvais » : l'élève apprend qu'il y a des erreurs graves et des erreurs coûteuses.
- **`pourquoiPas`** pour chaque mauvaise réponse : c'est la correction ciblée de l'idée fausse, le plus efficace en pédagogie.
- **Erreurs de calcul anticipées** (41 erreurs typiques) : la correction nomme l'erreur commise, pas seulement le bon résultat.
- **Au banc** : tension fantôme et LoZ, ohmmètre sous tension sanctionné, temps comparé à un confirmé, pièces changées pour rien comptées. C'est exactement ce qu'un chef d'équipe reproche à un débutant.

### Ce qui affaiblit la crédibilité

1. **Aucune relecture humaine (0/60).** Une seule erreur de norme, repérée par un formateur, peut discréditer tout l'outil à ses yeux.
2. **Les références normatives ne sont pas datées.**
   - La NF C 15-100 a été entièrement refondue : une nouvelle édition publiée en 2024 est découpée en parties.
   - Les paragraphes cités (§ 411.5, § 531.2…) suivent l'édition 2002.
   - Il faut indiquer l'édition visée et faire vérifier la correspondance par le formateur.
   - Certaines références ne sont qu'une paraphrase entre parenthèses (« le neutre n'est jamais coupé ni protégé seul »), sans numéro de paragraphe.
3. **« Le piège en armoire » n'est pas homogène.**
   - Il existe pour les calculs (35 pièges) et le banc.
   - Pour les cas de panne, il est remplacé par une « leçon ».
   - La reconnaissance n'en a pas.
   - Un rendez-vous fixe (« le piège ») marque davantage qu'un contenu présent ici et absent là.
4. **Les réflexes de sécurité ne sont pas surentraînés.** Un choix « danger » coûte des XP, puis on passe à la suite. Un réflexe vital doit être **revu jusqu'à ce qu'il soit automatique**.

### Ce qu'il faudrait pour qu'un formateur dise « Chapeau »

| # | Élément | Pourquoi un pro y tient |
|---|---|---|
| 1 | **Consignation geste par geste** (au banc et en exercice à remettre dans l'ordre) : séparer, condamner, identifier, VAT testé avant et après sur une source connue, mise à la terre et en court-circuit si nécessaire, attestation | C'est le réflexe qui sauve des vies ; un bouton unique ne l'entraîne pas |
| 2 | **Révision obligatoire des « danger »** : toute erreur de sécurité revient plus tard (boîtes de Leitner), jusqu'à 3 réussites espacées | Surentraînement des réflexes vitaux |
| 3 | **Indice de certitude** avant de valider (« sûr », « hésitant ») ; « sûr mais faux » est signalé à part | Repère l'idée fausse bien ancrée, la plus dangereuse sur le terrain |
| 4 | **Référentiel de compétences** visible (diagnostic de commande, mesure, consignation, réglage des protections…) relié au BTS MS, au Bac Pro MSPC et à la NF C 18-510, avec un **livret** exportable pour le tuteur d'alternance | Le formateur raisonne en compétences, pas en XP |
| 5 | **Cas de niveau III à embranchements, où l'information coûte** | C'est la vraie différence entre un compagnon et un expert |
| 6 | **Compte rendu d'intervention** en fin de banc : choisir les bonnes phrases (cause, remède, essais, préconisation) | Le rapport écrit fait partie du métier ; c'est aussi lui qui est relu en audit |
| 7 | **Exemple résolu de 60 secondes** avant le premier exercice de chaque notion. Ce n'est pas un retour des fiches : c'est un exemple commenté, intégré à la séance | Le débutant total apprend par l'exemple, pas par l'échec |
| 8 | **Épreuve blanche** : sans indice, domaines mélangés, notée par compétence, et proposée de nouveau à l'approche du recyclage de l'habilitation | Donne un résultat que le formateur peut montrer |
| 9 | **Contenu signé** : relecteur, date et édition de la norme sur chaque élément | La confiance du terrain se gagne ainsi |

---

## 5. Plan d'action

### P0 : corriger avant d'ajouter (1 à 2 jours)

| # | Action | Fichier |
|---|---|---|
| P0.1 | Le positionnement ne valide que la **reconnaissance**. Pour les calculs et les cas, il donne une mention « Niveau présumé ; une séance le confirmera », pas une validation | `js/parcours.js` (`niveauAcquis`) |
| P0.2 | Étape B validée par **une panne réparée sans alerte de sécurité** (indices autorisés). La version « sans faute » devient un objectif bonus affiché (« Refais-la sans indice ») | `js/parcours.js`, `js/banc.js` |
| P0.3 | Le banc tire les pannes **par niveau** : I (FU1, bobine), II (95-96, fusible L2), III (câble du pupitre). Ajouter `niveau` dans `data/banc-depart-moteur.json` | banc |
| P0.4 | Reclasser les questions de reconnaissance : `reco-no-bornes` et `reco-nf-bornes` en II, `reco-reglage-molette` en II, `reco-voyant-couleur` en II ; remplacer `reco-contacteur-protection` (doublon) | `data/reconnaissance.json` |
| P0.5 | Ajouter un champ `edition` à la norme (ex. « NF C 15-100:2002 ») et préparer la liste des 60 éléments à relire, avec une colonne « relu par / date » | toutes les données |

### P1 : combler les angles morts les plus graves (contenu à rédiger en premier)

**Cas de panne (12 nouveaux cas, priorité aux cases vides de compétences) :**

| Identifiant | Niv. | Domaines | Contenu | Piège central | Réf. |
|---|---|---|---|---|---|
| `vat-procedure` | I | sécu | Vérifier l'absence de tension avant de changer un disjoncteur | Utiliser un multimètre comme VAT ; oublier le test du VAT sur une source connue avant **et après** | NF C 18-510 · NF EN 61243-3 |
| `moteur-sens-inverse` | I | tri | Moteur remplacé, il tourne à l'envers | Permuter deux phases sans consigner, ou au mauvais endroit (sous le contacteur d'un inverseur) | NF EN 60204-1 (vérifications) |
| `thermique-surcharge` | I | tri | Le relais thermique déclenche au bout de 20 min | Monter le réglage au lieu de mesurer le courant à la pince et chercher la cause mécanique | NF EN 60947-4-1 |
| `isolement-moteur-lavage` | II | tri, sécu | Pompe en défaut après le lavage de l'atelier | Mesure au mégohmmètre sans débrancher le variateur ; confondre continuité et isolement | NF C 15-100 partie 6 (seuil à confirmer selon l'édition) |
| `capteur-pnp-npn` | II | tbt-cc | Capteur remplacé : sa LED s'allume, l'automate ne voit rien | Capteur NPN à la place d'un PNP ; brun, bleu et noir en 3 fils | IEC 60947-5-2 |
| `double-source` | II | sécu, mono | Sectionneur ouvert, le VAT indique encore une tension (onduleur, alimentation de commande séparée) | Croire le sectionneur ; ne pas identifier **toutes** les sources | NF C 18-510 (séparation de toutes les sources) |
| `energie-residuelle-variateur` | II | sécu, tri | Intervention sur un variateur juste après l'avoir coupé | Bus continu chargé pendant plusieurs minutes ; mesurer DC+ / DC- avant de toucher | NF C 18-510 · notice constructeur |
| `etoile-triangle-bascule` | III | tri | Le moteur démarre en étoile puis disjoncte au passage en triangle | Temporisation à zéro, verrouillage KM2/KM3 absent, court-circuit franc | NF EN 60947-4-1 · NF EN 60204-1 |
| `it-premier-defaut` | III | sécu, mono | Le CPI signale un premier défaut ; la production ne doit pas s'arrêter | Couper pour chercher, ou ignorer l'alarme ; recherche sous tension avec un injecteur et une pince sélective | NF C 15-100 (§ 411.6 en édition 2002) |
| `variateur-defaut-terre` | III | tri | Défaut terre intermittent sur un variateur, câble moteur de 80 m | Mégohmmètre câble branché sur le variateur ; capacité du câble long | IEC 61800-5-1 |
| `selectivite-tgbt` | III | tri, mono | Un court-circuit sur un départ fait déclencher le TGBT entier | Changer le disjoncteur de tête ; ne pas lire les courbes ni les réglages (Ir, Isd, temporisation) | NF C 15-100 (§ 535) |
| `hta-manoeuvre-serrures` | III | hta, sécu | Mettre le transformateur hors tension avec un verrouillage par serrures | Ordre des clés ; forcer un verrouillage ; ouvrir la porte du transformateur avant la mise à la terre | NF C 18-510 · NF C 13-100 |

**Reconnaissance (14 nouvelles questions, en priorité sur les cases à 2 questions) :**
- **Niv. I, sécu** :
  - catégories de mesure CAT III / CAT IV sur un multimètre ;
  - VAT ou multimètre ;
  - cadenas et pancarte de consignation ;
  - couleurs des conducteurs (bleu = neutre, vert-jaune = PE, interdits).
- **Niv. I, mono** : lire une plaque de disjoncteur différentiel (IΔn, type AC, A ou F).
- **Niv. II, tri** :
  - lire une plaque moteur (IP, classe d'isolation, cos φ, tr/min → nombre de pôles) ;
  - pince ampèremétrique ou pince de fuite.
- **Niv. II, tbt-cc** :
  - capteur inductif 3 fils (couleurs, PNP ou NPN) ;
  - module de relais de sécurité.
- **Niv. II, HTA** : cellule interrupteur-fusible, que signifie le voyant de présence de tension ?
- **Niv. III, sécu** :
  - quelle habilitation pour cette tâche (BR, BC, B2V, BE Mesure) ;
  - zone d'environnement et distance limite de voisinage.
- **Niv. III, mono** : DDR de type A, F ou B, lequel derrière ce variateur monophasé ?
- **Niv. III, tbt-cc** : chaîne d'arrêt d'urgence, catégorie de sécurité et pourquoi le double canal.

**Calculs (8 nouveaux générateurs, pour sortir des cases à un seul type) :**
- **C1 sécu** : énergie d'un condensateur (½·C·U²) et temps de décharge (≈ 5·R·C).
- **C1 tbt-cc** : courant d'une sortie d'automate, la bobine de relais passe-t-elle ?
- **C2 tri** :
  - glissement et nombre de pôles à partir de la plaque (n = 1 450 tr/min) ;
  - courant de démarrage en étoile-triangle (÷ 3).
- **C2 sécu** : lecture d'un mégohmmètre, résultat conforme ou non (seuil selon la tension d'essai).
- **C2 HTA** : courant au primaire d'un transformateur et choix du calibre du fusible HTA (rapport de calibre).
- **C3 tri** : sélectivité ampèremétrique (rapport des Ir, test du calibre amont).
- **C3 mono** : courant de défaut en TN et temps de coupure, le disjoncteur déclenche-t-il à temps ?

### P2 : changer de forme (le vrai saut en savoir-faire)

1. **Consignation décomposée au banc**, en 5 gestes dans l'ordre. Un geste oublié ou mal ordonné déclenche une alerte de sécurité, avec un pourquoi.
2. **Cas de niveau III à embranchements** : nouveau type d'étape `{ demander: [mesures possibles, coût en minutes] }`, avec conséquences reportées sur la suite. Prototype : `etoile-triangle-bascule`.
3. **Second circuit au banc** : démarrage étoile-triangle (6 pannes, du niveau I au niveau III, dont une d'isolement à trouver au mégohmmètre).
4. **Compte rendu d'intervention** en fin de banc : 4 rubriques à remplir en choisissant parmi des phrases proposées, évaluées.
5. **Révision des erreurs** (boîtes de Leitner) : les choix « danger » sont prioritaires, et la révision devient une étape du parcours avant chaque nouveau niveau.
6. **Indice de certitude** sur la reconnaissance et les cas de panne, avec un relevé « sûr mais faux » au Carnet.
7. **Exemple résolu de 60 secondes** à la première rencontre de chaque type de calcul (24 à rédiger, 3 à 5 lignes chacun).

### P3 : rendre l'outil présentable à un formateur

1. **Relecture signée** des 60 éléments, puis des nouveaux : champs `verifie`, `relecteur`, `date`, `edition`.
2. **Référentiel de compétences** : environ 12 compétences, chaque élément relié à une ou deux d'entre elles. Le Carnet affiche ensuite la maîtrise par compétence.
3. **Épreuve blanche** de 20 minutes, sans aide, notée par compétence, avec un bilan exportable (PDF ou impression) pour le tuteur.
4. **Bilan de fin de niveau** tous modes confondus, qui remplace le seuil 8/10 dans un seul mode comme critère de passage.

---

## Annexe : indicateurs mesurés

| Indicateur | Valeur |
|---|---|
| Questions de reconnaissance | 46 (I : 17, II : 15, III : 14) ; 32 symboles, 14 matériels |
| Types de calcul | 24 (I : 7, II : 8, III : 9) ; 41 erreurs typiques, 35 pièges |
| Cas de panne | 14 (I : 4, II : 5, III : 5) ; 3,2 étapes et 3,5 choix en moyenne |
| Pannes du banc | 5 sur 1 circuit ; démarche de référence de 7 à 9 étapes ; référence de 31 à 72 min |
| Explications « pourquoi pas » complètes | 46 / 46 |
| Risque et norme renseignés | 100 % |
| Éléments relus par un formateur | **0 / 60** |
| Cases niveau × domaine à un seul cas de panne | **10 / 15** (aucune au-delà de 3) |
| Cases à un seul type de calcul | 7 / 15 |
| Cases de reconnaissance à 2 questions | 4 / 15 (7 / 15 à 3 ou moins) |
| Références normatives citées | 86 ; NF C 15-100 (25), IEC 60947 (18), NF C 18-510 (14), NF EN 60204-1 (14), IEC 60617 (14), NF C 13-100 (5) |
