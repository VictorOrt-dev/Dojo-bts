# Audit d'impact : Elec learning face à un débutant total

*3 novembre 2026 · branche `main` (commit `17880ab`).*

**Point de vue :** expert en sciences de l'éducation, UX designer et formateur en électrotechnique.

**Public visé :** un élève de première année de CAP ou de BAC Pro, ou un adulte en reconversion, qui n'a jamais tenu un
multimètre.

**Méthode :** parcours « Débutant total » joué dans Chromium (profil iPhone 13, 390 × 844), du premier lancement au
banc. À chaque écran, on a mesuré :
- le nombre de mots ;
- la hauteur, en écrans ;
- la présence de 40 termes techniques ;
- les aides de vocabulaire (infobulles, lexique).

Le contenu a aussi été lu en entier : 60 questions, 32 calculs, 28 cas, 3 circuits de banc, 8 mesures d'isolement et
23 fiches.

## Synthèse

| Axe | Note | En une phrase |
|---|---|---|
| 1. Accessibilité pour un non-initié | **5,5 / 10** | Très bien accueilli et guidé, mais vite face à un vocabulaire jamais expliqué et à un « niveau I » pensé pour un futur pro, pas pour un débutant total |
| 2. Efficacité pédagogique | **7,5 / 10** | Une vraie boucle d'ancrage (erreur → fiche → rappel espacé → examen), avec un défaut : pour un novice, on évalue avant d'avoir montré |
| 3. Ergonomie cognitive et mobile | **7 / 10** | Le banc est devenu lisible et « sous le pouce » ; l'accueil et le Carnet restent denses pour un premier contact |

**Le constat central.** Elec learning est excellent pour **consolider**. Il ne sait pas encore **faire découvrir**.

Pour un apprenti qui a déjà vu un contacteur en atelier, la boucle actuelle est l'une des meilleures qu'on puisse
proposer sur mobile : tester, corriger tout de suite, rappeler plus tard, refaire un examen.

Un débutant total, lui, devine d'abord, apprend ensuite. Les quatre recommandations ci-dessous visent ce « mur
d'entrée », sans toucher à ce qui marche.

---

## 1. Accessibilité pour un non-initié — 5,5 / 10

### Ce qui marche

- **L'accueil sait à qui il parle.**
  - « Où en es-tu ? » propose trois profils et ne verrouille rien.
  - Le profil « Débutant total » mène à une seule carte, « Ta prochaine séance » : Reconnaissance niveau I, étape 1
    sur 10.
  - Le débutant n'a jamais à choisir parmi six modes pour commencer.
- **Le parcours est ordonné** pour ce profil : reconnaissance, puis calculs, puis cas, puis banc. Un niveau se valide
  à 80 %. La mention « Conseillé après… » prévient sans interdire.
- **Le guide du banc** joue une intervention complète. Il met en surbrillance ce qu'il faut toucher. Il rattrape les
  écarts, par exemple « déconsigne d'abord ».

### Les frictions

**1. Aucun terme n'est expliqué là où il apparaît.**
- On compte **0** aide de vocabulaire sur tous les écrans mesurés.
- Dès l'accueil, le débutant croise LoZ, VAT, TBT, HTA et IEC.
- La première étape du guide du banc emploie 7 termes ou repères jamais définis : contacteur, relais thermique, aM,
  bobine, KM1, F2, Q1.
- Le guide dit « Avant l'ohmmètre, consigne. », mais n'explique pas ce qu'est consigner.
- Les fiches mémo définissent bien ces notions. Mais elles n'apparaissent qu'**après une erreur**, ou dans le Carnet.
  Le débutant ne sait pas qu'elles existent au moment où il bute sur le mot.

**2. Le niveau I est le « socle du professionnel », pas celui du novice.**
- Sur les 21 questions de niveau I, plusieurs supposent déjà une culture de chantier :
  - le titre d'habilitation « B1V » face à une cellule HTA ;
  - la catégorie de mesure « CAT III 1 000 V » ;
  - le domaine de tension d'un primaire 20 kV.
- Sur les 10 calculs de niveau I, on trouve :
  - une constante de temps 5·R·C sur des condensateurs en µF et une résistance en kΩ ;
  - un transformateur 20,4 kV / 410 V ;
  - un réseau 690 V ;
  - le seuil magnétique d'un D16.
- Mesuré : la toute première question tirée pour un débutant portait sur l'habilitation HTA (« la lettre B ne vaut
  qu'en BT »).
- C'est juste techniquement, mais un élève de CAP au premier jour décroche dès ce moment-là.

**3. On demande de « reconnaître » ce qu'on n'a jamais vu.**
- La séance 1 est un QCM de 4 choix sur des symboles : NO, NF, bobine…
- Sans exposition préalable, le novice répond au hasard : 1 chance sur 4.
- Ses « erreurs » mesurent alors son ignorance, pas sa compréhension. Pourtant, elles nourrissent la révision et
  l'aiguillage.

**4. Le guide du banc fait réussir, mais il fait suivre plus qu'il ne fait comprendre.**
- Il dicte les points : « rouge sur F2 : 96 / X1 : 1 ».
- L'élève doit retrouver ce libellé dans une liste de 27 points de mesure, sans voir où ils sont, puisque le schéma est
  replié.
- Il découvre la logique (« suivre le courant ») en la lisant, sans jamais avoir à la **prévoir**.
- Résultat : il refera le geste, mais il ne transposera pas encore le raisonnement à une autre panne.

**5. L'examen blanc ne tient pas compte du niveau.**
- Mesuré pour un profil débutant : **7 questions de niveau III sur 15**.
- Une première note autour de 5/20 et la mention « À retravailler » découragent au lieu de situer.

---

## 2. Efficacité pédagogique — 7,5 / 10

### Une vraie boucle d'ancrage

```
erreur ──► correction en deux temps ──► fiche mémo (30 s) ──► « À réviser » (0, 1, 3, 7, 15 jours)
   ▲                                                                      │
   └──── examen blanc ◄── rappel glissé dans une séance ordinaire (≥ 2 jours) ◄┘
```

- **Récupération active** (tester plutôt que relire), **espacement** et **entrelacement** sont tous présents. Les
  rappels sont mêlés aux questions du jour, jamais en premier.
- Ce sont les trois leviers les mieux établis par la recherche sur la mémorisation. Peu d'outils de la filière les
  réunissent.
- **L'aiguillage** ne regarde que les 10 dernières réponses de chaque élément. Un progrès efface donc une lacune. Il
  attend 6 réponses avant de parler de lacune : c'est juste.
- **Les rappels sont bien dosés.** On en compte 3 au plus par séance de 10. Ils s'espacent à chaque réussite
  (2, 4, 7, puis 14 jours environ). Ils sont signalés « Rappel d'erreur », ce qui est honnête et motivant.

### Des corrections qui vont droit au but

Sur une mauvaise réponse, l'essentiel tient en **56 mots** à l'écran :
- ce qu'il fallait trouver ;
- le pourquoi, en 22 mots au plus ;
- « Le risque, en vrai », en 26 mots au plus.

Le détail reste replié sous « En savoir plus ». Côté contenu, les blocs « risque » font 34 mots en moyenne (49 au plus)
et les explications 39 mots (62 au plus).

Pour un profil junior, c'est la bonne densité. « Le risque, en vrai » est le point fort émotionnel de l'outil : il
donne du sens à la règle.

### Les limites

- **On évalue avant d'enseigner.**
  - Pour le débutant total, la première rencontre avec une notion est un échec. La recherche admet un léger bénéfice
    au « test avant cours », mais à condition que l'échec soit vécu comme normal et suivi d'un apport.
  - Ici, l'écran dit « Pas encore. », et la fiche n'est qu'un lien.
- **La fiche mémo reste facultative.** Elle s'ouvre par « Comprendre la notion » sous la correction. Le débutant qui
  enchaîne vite ne l'ouvre jamais.
  - L'insigne « Rigueur normative » récompense l'ouverture des fiches. C'est une bonne idée, mais elle touche
    surtout les élèves déjà motivés.
- **L'examen blanc tire tous les niveaux au hasard.**
  - Pour un débutant, il mesure surtout la distance au niveau III.
  - Le bilan par compétence reste très bon : chaque domaine a un verdict et un lien « s'entraîner ».

---

## 3. Ergonomie cognitive et mobile — 7 / 10

### Ce qui marche

- **Banc « sous le pouce » :**
  - l'appareil de mesure est fixé en bas de l'écran ;
  - « Mesurer » se trouve à 522 px de haut pendant le guide ;
  - toutes les commandes font au moins 44 px, et aucun texte ne descend sous 12 px, en clair comme en sombre ;
  - le bon d'intervention, le schéma et le mode d'emploi s'ouvrent en accordéon, un seul à la fois ;
  - le symptôme reste affiché en une ligne.
- **Guidage visuel du banc :**
  - la commande à toucher clignote ;
  - l'onglet utile s'ouvre tout seul ;
  - la progression s'affiche en 4 segments ;
  - le guide ne laisse jamais l'élève « sans savoir quoi toucher ».
- **Sous le sélecteur du multimètre :**
  - une légende par fonction : « Tension ? », « Anti-fantôme », « Hors tension » ;
  - une aide qui passe en alerte si Ω est choisi alors que le départ n'est pas consigné ;
  - c'est la bonne information, au bon endroit.
- **Une question de reconnaissance tient sur un écran** (1,1 écran) ; un calcul aussi (0,9).

### Les points de charge mentale

| Écran | Mots | Hauteur | Remarque |
|---|---|---|---|
| Bienvenue | 189 | 1,7 écran | Correct |
| Accueil débutant | 265 | 2,9 écrans | 6 modes, 3 blocs, 2 notices, sous la carte prioritaire |
| Correction (erreur) | 137 | 1,9 écran | L'essentiel est en haut ; le reste est replié |
| Banc, guide étape 1 | 176 | 1,5 écran | La fiche du guide et l'appareil occupent le bas de l'écran |
| Carnet | 439 | 4,8 écrans | 8 sections, aucune repliée |

- **L'accueil propose trop de portes d'entrée** pour un débutant. La carte « Ta prochaine séance » est bien en tête,
  mais elle est suivie de 6 modes, puis de 3 blocs qui redoublent en partie ces modes.
- **Les codes de domaine (TBT, MONO, TRI, SÉCU, HTA) sont affichés sur chaque question.** Leur légende est cachée dans
  une notice de l'accueil. Pour un novice, c'est une couche de jargon de plus, sans intérêt immédiat.
- **Au banc, pendant le guide, la fiche et l'appareil occupent tout l'écran.** L'élève ne voit plus le schéma, alors
  qu'on lui demande de trouver « S1 : 11 » dans une liste de 27 points.

---

## Recommandations : 4 chantiers simples, par ordre d'impact

### R1. Un lexique tactile (≈ 1 jour)

**Le contenu**
- Un fichier `data/lexique.json` d'une trentaine de termes : LoZ, VAT, consigner, TBT, BT, HTA, contacteur, relais
  thermique, bobine, sectionneur, fusible aM, PE, NO, NF, COM, OL, tension fantôme, SLT, TT, TN, IT, sélectivité,
  habilitation, CAT III…
- Pour chaque terme :
  - une définition de 20 mots au plus, sans autre jargon ;
  - une ligne « Sur le terrain ».

**L'affichage**
- Dans `typo()`, qui traite déjà tous les textes, la **première occurrence par écran** d'un terme devient un mot
  souligné en pointillé.
- Toucher ce mot ouvre une bulle. Il faut garder une cible d'au moins 44 px et le support du lecteur d'écran.
- Une section « Lexique » s'ajoute dans le Carnet.

**Le test**
- Chaque terme de la liste présent dans le contenu de niveau I a une définition. On l'ajoute à l'audit
  d'intégrité.

*Effet attendu : le mur de vocabulaire tombe sans rien retirer au contenu expert.*

### R2. « Je ne sais pas encore » au lieu de deviner (≈ ½ jour)

- En Reconnaissance et en Calculs, ajouter un bouton **« Je ne sais pas encore »** sous les choix.
- Il affiche directement la bonne réponse **et la fiche mémo dépliée**, pas un simple lien.
- L'élément part en révision, comme une erreur. Mais l'écran ne dit pas « Pas encore. » : il dit « On le découvre
  ensemble », sans XP perdu.
- Pour le profil débutant, l'élément vu pour la première fois peut aussi afficher sa fiche **avant** la question, en
  mode « Découvrir, puis vérifier ».

*Effet attendu : on supprime le hasard (1 chance sur 4), la révision et l'aiguillage reçoivent un signal propre, et le
premier contact avec une notion devient un apport, pas un échec.*

### R3. Un vrai niveau « socle » pour le débutant total (≈ ½ jour de contenu)

**Reclasser** au niveau II les éléments de niveau I qui demandent une culture de chantier :
- l'habilitation B1V face à la HTA ;
- la catégorie « CAT III » ;
- le domaine de tension du primaire 20 kV ;
- les calculs « 690 V », « 20,4 kV / 410 V », « seuil magnétique D16 », « décharge 5·R·C » et « alimentation 24 V
  à charges multiples ».

**Compléter** le niveau I par 4 à 6 notions de découverte :
- tension et courant ;
- circuit ouvert ou fermé ;
- phase, neutre et terre ;
- ce que mesure un multimètre ;
- le danger du courant.

Ajouter à l'audit une règle : pas de terme du lexique « avancé » au niveau I.

**Au banc :** dans le guide, au lieu de dicter le point, poser **une question de prédiction** à l'étape 4.
- Avant de consigner : « 230 V en X1 : 1, 0 V en LoZ au pupitre. Où est le défaut ? » (armoire / câble / bouton S1).
- Ouvrir aussi le schéma à l'étape 2, avec la zone du point à trouver (« Commande (armoire) », « Pupitre distant »).

*Effet attendu : la progressivité se rétablit, et le guide entraîne le raisonnement, plus seulement le geste.*

### R4. Un examen blanc à la mesure de l'élève, et un accueil allégé (≈ ½ jour)

**L'examen**
- Tirer les questions jusqu'au niveau atteint + 1. Par exemple, pour un débutant : 10 de niveau I et 5 de niveau II,
  aucune de niveau III.
- Annoncer la composition avant le départ.
- Garder un mode « Examen complet » pour les profils confirmés.

**L'accueil du débutant**
- Replier les 6 modes sous « Tous les modes ». Seules restent visibles la carte prioritaire et la jauge de son bloc.
- Masquer les codes de domaine pour ce profil, ou leur donner un nom en clair (« Sécurité » au lieu de « SÉCU »).

*Effet attendu : moins de choix et moins de codes au premier contact, et une première note d'examen qui situe au lieu
de décourager.*

---

## À surveiller, sans urgence

- **Le Carnet** fait 4,8 écrans : replier les sections 04 à 08 par défaut.
- **L'élève ne sait pas que les fiches existent.** Après la première erreur, une phrase unique suffit : « Chaque erreur
  vient avec une fiche de 30 secondes : touche « Comprendre la notion ». »
- **Valider les recommandations sur le terrain.** Deux ou trois élèves de CAP en tests utilisateurs de 20 minutes (en
  pensant à voix haute) diront plus que toute mesure automatique. Le premier écran du banc et la première séance de
  reconnaissance sont les deux moments à observer en priorité.
