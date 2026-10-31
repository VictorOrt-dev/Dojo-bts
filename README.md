# Elec learning — Cours & entraînement électricien (PWA)

Application web mobile perso : fiches de révision BTS Maintenance + exercices pratiques (reconnaissance, calculs, cas de panne).
HTML/CSS/JS sans framework, sans build, sans npm (seuls les tests automatisés utilisent Playwright). Données de l'utilisateur dans `localStorage`. Fonctionne hors connexion.

En ligne : https://victorort-dev.github.io/Dojo-bts/ (le dépôt garde son nom d'origine, voir « Renommer le dépôt » plus bas).

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Ouvrir `index.html` directement (file://) ne marche pas : le navigateur bloque le chargement des JSON.

## Mettre en ligne (GitHub Pages)

La mise en ligne passe par le workflow `.github/workflows/test.yml` : à chaque push sur `main`, les tests tournent
d'abord ; **le site n'est publié que si les 141 vérifications passent**. Une pull request vers `main` lance les tests sans rien publier.

1. Une seule fois : dans le dépôt, Settings › Pages › Build and deployment › Source : **« GitHub Actions »**.
   (Avec l'ancien réglage « Deploy from a branch », GitHub publie `main` à chaque push sans attendre les tests.)
2. Pousser sur `main`. Suivre le résultat dans l'onglet **Actions** : ✅ tests puis déploiement, ❌ rien n'est publié
   (cliquer sur le job « Tests automatisés » pour lire la vérification en échec).
3. L'app est servie sur `https://<pseudo>.github.io/<nom-du-depot>/`. Seuls les fichiers de l'app sont publiés
   (pas `tests/`, `docs/`, ni le README).
4. Sur iPhone : ouvrir l'URL dans Safari › Partager › « Sur l'écran d'accueil ».

Pour relancer à la main (ex. après avoir changé le réglage Pages) : onglet Actions › « Tests et déploiement » › Run workflow.

## Structure

```
index.html              coquille : barre du haut, zone #vue, onglets
manifest.webmanifest    installation PWA (nom, icônes, couleurs)
css/style.css           tout le style ; jetons Bakélite / Porcelaine en tête de fichier
sw.js                   service worker : mode hors connexion (réseau d'abord, cache en secours) — liste FICHIERS à tenir à jour
js/app.js               routeur par hash : #/entrainement (accueil), #/entrainement/reco, /calcul, /panne, /banc, #/cours, #/fiche/<id>, #/profil
                        (les anciens liens #/dojo… sont redirigés)
js/storage.js           SEUL fichier qui touche localStorage (clé "elec-learning:v1", reprend l'ancienne clé "dojo:v1")
js/sauvegarde.js        contrôle strict des données (import refusé à la moindre anomalie, stockage local nettoyé au démarrage)
js/cours.js             liste + détail des fiches
js/profil.js            progression, export/import, remise à zéro
js/entrainement.js      accueil (Exercices), plaque de l'opérateur, en-tête de séance, rapport, toast
js/panne.js             mode Cas de panne (interventions pas à pas, démarches expliquées)
js/banc.js              mode Banc de mesure (panne cachée, multimètre V~ / LoZ / Ω, pince, consignation, horloge, rapport)
js/circuit.js           petit solveur électrique du banc (potentiels en alternatif, transformateur, tensions fantômes, Ω)
js/atelier.js           plaque signalétique + galvanomètre, bornier de progression, fil de cuivre, salutation
js/xp.js                niveaux, barème, gain d'XP, statistiques par mode
js/quiz.js              mode Reconnaissance (QCM sur image, par niveau, explications en cas d'erreur)
js/calcul.js            mode Calculs flash (13 générateurs sur 3 niveaux, valeurs attendues, diagnostic d'erreur, clavier à l'écran)
js/difficulte.js        les 3 niveaux de difficulté (I Fondations, II Pratique courante, III Cas complexes) + écran de choix
js/hasard.js            tirages aléatoires (entier, parmi, melanger)
js/theme.js             matière Bakélite (défaut) / Porcelaine, mémorisée dans les préférences
js/mise-en-page.js      frontispice, titres de section, voyants d'état, typographie française (typo)
fonts/                  polices auto-hébergées (Young Serif, Atkinson Hyperlegible, JetBrains Mono — licence OFL)
js/util.js              esc(), normaliser(), plurielS()
data/fiches.json        CONTENU des fiches (aucun code)
data/reconnaissance.json CONTENU des questions de reconnaissance
data/pannes.json        CONTENU des cas de panne
data/banc-depart-moteur.json CIRCUIT et pannes du banc de mesure
img/banc/               schéma du banc (depart-moteur.svg)
img/reco/               visuels des questions (sym-*.svg = symboles, mat-*.svg = matériel)
tests/                  tests automatisés (voir « Tests automatisés ») — hors de l'app, jamais mis en cache
.github/workflows/      test.yml : tests puis déploiement sur GitHub Pages
docs/                   rapports d'audit
```

## Tests automatisés

Les tests sont versionnés dans `tests/` et se lancent depuis la racine du dépôt.
Ils démarrent eux-mêmes un petit serveur local : rien d'autre à lancer.

**Prérequis.** Node.js 18 ou plus récent. Pour les suites qui pilotent un navigateur, Playwright et Chromium, à installer une
seule fois (le dossier `node_modules/` créé est ignoré par Git ; l'app, elle, n'en a pas besoin) :

```bash
npm install --no-save playwright && npx playwright install chromium
```

**Lancer.**

```bash
node tests/lancer.mjs
```

On peut lancer une seule suite : `node tests/lancer.mjs unitaires` (quelques secondes, sans navigateur),
`node tests/lancer.mjs non-regression` ou `node tests/lancer.mjs banc`. Le code de sortie vaut 0 si tout passe, 1 sinon.

| Fichier | Contenu |
|---|---|
| `tests/lancer.mjs` | Point d'entrée : choisit les suites, démarre le serveur et Chromium, affiche le bilan |
| `tests/outils.mjs` | Serveur statique, page iPhone 13 qui collecte les erreurs de console, compteur de vérifications |
| `tests/unitaires.mjs` | Sans navigateur. **U1** : solveur du banc (`circuit.js`), lectures attendues pour l'installation saine et chaque panne (tension fantôme, LoZ, fusible mesuré en place, retour de phase). **U2** : contrôle des sauvegardes (`sauvegarde.js`) : xp en texte, négatif, infini ou démesuré, compteurs incohérents, mode inconnu, `__proto__`, nettoyage au démarrage |
| `tests/non-regression.mjs` | Dans le navigateur. **A** : 13 générateurs × 300 tirages, contenus, équilibre des réponses, images muettes. **B** Reconnaissance. **C** Calculs. **D** Cours. **E** Cas de panne. **F** ancien nom. **G** hors connexion (`sw.js` doit lister exactement les fichiers de l'app). **H** import de sauvegarde par l'écran Carnet (fichiers trafiqués refusés, données intactes, stockage abîmé nettoyé) |
| `tests/banc.mjs` | **I** : les 5 pannes du banc résolues au doigt dans l'interface : mesures, alertes de sécurité, pièce inutile, réarmement, rapport |

**Intégration continue.** GitHub relance toute la suite à chaque push sur `main` (Ubuntu 24.04, Node 22, Playwright 1.63.0 figés dans
`.github/workflows/test.yml`, Chromium mis en cache) et bloque le déploiement en cas d'échec. Changer de version de Playwright :
modifier `PLAYWRIGHT_VERSION` dans le workflow.

**Règles.**
- Lancer `node tests/lancer.mjs` avant de pousser : c'est plus rapide que d'attendre l'échec dans l'onglet Actions.
- Nouvelle fonction = nouvelle vérification dans la suite concernée.
- Un test qui échoue après une modification voulue (ex. : nouvelle question) se met à jour en même temps que le contenu, jamais en le supprimant.
- Pour les tests, un écran peut exposer son état (`sessionEnCours()`, `interventionEnCours()`) ou accepter un paramètre (`?panne=<id>` au banc). L'interface ne doit jamais en dépendre.

## Conventions (à donner à l'IA à chaque session)

- **Pas de framework, pas de npm, pas de build.** Modules ES natifs (`import`/`export`), chemins relatifs.
- **Contenu ≠ code.** Le contenu pédagogique va dans `data/*.json`. Ajouter une fiche = modifier uniquement `fiches.json`.
- **Stockage.** Seul `storage.js` lit/écrit `localStorage`, via `lire()` et `modifier(e => …)`. Nouveau champ = l'ajouter dans `etatParDefaut()` **et** dans `controler()` (tous deux dans `sauvegarde.js`), sinon il sera retiré à l'import et au démarrage. Changement de format = incrémenter `VERSION` et compléter `migrer()`.
- **Sécurité d'affichage.** Tout texte injecté dans `innerHTML` passe par `esc()`.
- **Un écran = une fonction `render…({ vue, definirTitre, id, params })`**, branchée dans le `switch` de `app.js`.
- **Langue.** Interface en français, tutoiement. Noms de variables et fonctions en français.
- **Normes.** Repérage : l'app indique les deux (IEC 81346 `-QA1`, `-KF1`… et usage français `Q1`, `KM1`…). _Noter ici celui de ton référentiel._ Symboles : IEC 60617. Unités SI, virgule décimale dans les textes.
- **Cache GitHub Pages (10 min).** Juste après une mise en ligne, le téléphone peut mélanger anciens et nouveaux fichiers JS. Pour une nouvelle fonction partagée, préférer un nouveau fichier plutôt qu'ajouter un export à un fichier existant.
- **Mode hors ligne.** Tout nouveau fichier (JS, données, image, police) doit être ajouté à la liste `FICHIERS` de `sw.js` ; les tests le vérifient. Pas de numéro de version à changer.
- **Une fonctionnalité par demande à l'IA, un commit Git dès que ça marche.**

## Charte « Bakélite & Cuivre »

Les matières du métier deviennent l'interface.

- **Matières** : fond bakélite `#140E0A` (quasi noir, économe sur OLED) avec un grain fin ; texte porcelaine `#F1EADF` ;
  **cuivre** `--cuivre` pour l'action (boutons, voyant de l'onglet, score) ; **vert-de-gris** `--vert-de-gris` (cuivre oxydé) pour
  « juste » ; **rouge fusible** `--fusible` pour une réponse fausse. Matière **Porcelaine** claire pour le plein soleil.
- **Typographie** : Young Serif (titres, chaleureux, début XXᵉ) · Atkinson Hyperlegible (texte et interface, conçue pour la
  lisibilité maximale) · JetBrains Mono (chiffres, unités, XP ; lueur de tube Nixie sur l'afficheur des calculs).
  Passer tout texte de contenu par `typo()` (espaces insécables).
- **Pièces signature** :
  - plaque signalétique émaillée avec vis et **galvanomètre** dont l'aiguille balaie jusqu'à l'XP (`atelier.js`) ;
  - **bornier** : une borne par question, reliée par le fil de cuivre, qui s'allume juste / raté ;
  - **clavier en bakélite** (pavé numérique, grande touche Valider) à la place du clavier iOS ;
  - **gaines de conducteurs** comme couleurs de module (brun, gris, bleu, vert-jaune = terre pour la Sécurité) ;
  - formules sur petites **plaques émaillées** ; séparateurs en **fil de cuivre bouclé** ;
  - barre d'onglets en **touches de poste radio** : la touche active reste enfoncée, son voyant s'allume.
- **Ergonomie** : les Exercices sont l'écran d'accueil ; lecture en haut, actions dans la zone du pouce (`.pousse-bas`) ;
  « Suivant » reste collé au-dessus des onglets (`.action-collee`) ; toutes les cibles font au moins 44 px.
- **Sobriété** : aucune animation en boucle, animations ≤ 180 ms sur `transform` / `opacity`
  (sauf le balayage de l'aiguille, une fois) ; `prefers-reduced-motion` respecté.
- **Contrastes** vérifiés WCAG : AAA pour le texte dans les deux matières, AA minimum pour les couleurs d'état.

## Pédagogie : progresser sans pression

- **Pas de chrono.** Le score ne dépend que de la justesse : on prend le temps de poser son raisonnement.
- **Trois niveaux** pour chaque module (fiches, reconnaissance, calculs), définis dans `js/difficulte.js` :
  I Fondations (Apprenti, +10 XP), II Pratique courante (Compagnon, +15 XP), III Cas complexes et subtilités normatives (Expert, +20 XP).
  On choisit le niveau avant chaque séance ; à partir de 8/10, le rapport propose le niveau supérieur.
- **Une erreur = une leçon.** En cas de mauvaise réponse, l'app affiche :
  - Reconnaissance : pourquoi la réponse choisie n'est pas la bonne (`pourquoiPas`), l'explication détaillée, le repérage et le rôle ;
  - Calculs : ce qui s'est sans doute passé (diagnostic des erreurs types : √3 oublié, facteur 2 de l'aller-retour, W/kW…),
    le rappel de la formule, le calcul posé et le piège de terrain.
  Une bonne réponse garde l'explication repliée (« Pourquoi c'est ça », « Revoir la méthode »).

## Format d'une fiche (`data/fiches.json`)

```json
{
  "id": "elec-puissances-tri",
  "module": "Électrotechnique",
  "niveau": 2,
  "titre": "Puissances en triphasé équilibré",
  "verifie": false,
  "definitions": [{ "terme": "…", "def": "…" }],
  "formules": [{ "nom": "…", "expr": "P = √3 · U · I · cos φ", "unites": "P en W · U en V · I en A" }],
  "pieges": ["…"]
}
```

- `niveau` : 1, 2 ou 3 (Fondations, Pratique courante, Cas complexes). Viser une fiche par niveau et par module.
- `module` doit être exactement l'un de : `Électrotechnique`, `Automatismes`, `Réseaux`, `Sécurité` (liste `MODULES` dans `js/cours.js`).
- `id` : unique, en minuscules avec tirets, ne plus le changer ensuite (la progression y est attachée).
- `verifie` : passer à `true` une fois la fiche relue avec le cours. Tant que c'est `false`, l'app affiche un avertissement.
- Écrire les formules en texte Unicode : `√ · ² ³ φ η Ω ≤ ≥ → ×`.

## Format d'une question de reconnaissance (`data/reconnaissance.json`)

```json
{
  "id": "mat-contacteur",
  "niveau": 1,
  "type": "materiel",
  "image": "img/reco/mat-contacteur.svg",
  "question": "Quel est ce matériel ?",
  "nom": "Contacteur tripolaire",
  "reperage": "-QA en IEC 81346 ; KM en usage français…",
  "role": "Établit et coupe à distance…",
  "faux": ["Relais thermique", "Disjoncteur moteur", "Sectionneur porte-fusibles"],
  "pourquoiPas": {
    "Relais thermique": "Le relais thermique porte une molette de réglage et un bouton RESET…",
    "Disjoncteur moteur": "…",
    "Sectionneur porte-fusibles": "…"
  },
  "explication": "Trois pôles de puissance, une bobine A1-A2 et un contact 13-14 : la signature d'un contacteur.",
  "verifie": false
}
```

- `type` : `symbole` ou `materiel`. `faux` : exactement 3 réponses, toutes différentes de `nom`.
- `pourquoiPas` : une phrase par mauvaise réponse (mêmes textes que dans `faux`), affichée si on la choisit.
- `explication` : comment reconnaître, ce qu'il faut retenir. Une même image peut servir à plusieurs questions (repérage des bornes, réglage…).
- Viser 10 questions par niveau (une séance = 10 questions du niveau choisi).

## Règles d'écriture des exercices (Reconnaissance et Cas de panne)

- **Pas de biais de longueur** : toutes les propositions d'une question ont la même longueur, le même niveau de détail et la même rigueur
  (la plus longue ≤ 1,45 × la plus courte). La bonne réponse ne doit pas être plus souvent la plus longue que le hasard (≤ 35 %). Les tests le vérifient.
- **Des fausses pistes crédibles** : des erreurs qu'un technicien fait vraiment (23-24 au lieu de 13-14, différentiel AC au lieu de B,
  vérifier 0 V sur L1-L2-L3 au lieu du bus continu…), jamais des énormités.
- **Des images muettes** : aucun repère de borne, calibre ni marquage écrit sur les illustrations (sauf ce qui fait partie du symbole IEC,
  comme « M 3~ »). Si la question porte sur un marquage, il est cité dans le texte de la question.
- `image` : SVG ou photo (`.jpg`/`.webp`, max ~200 Ko). Les visuels `mat-*.svg` sont des illustrations simplifiées : les remplacer par tes propres photos d'armoire (atelier, stage) dès que possible, en gardant le même champ `image`.
- Une session tire 10 questions au hasard parmi toutes celles du fichier.

## Format d'un cas de panne (`data/pannes.json`)

```json
{
  "id": "moteur-grogne",
  "niveau": 2,
  "module": "Électrotechnique",
  "titre": "Le moteur grogne et ne démarre pas",
  "contexte": "Bon d'intervention : machine, symptômes signalés…",
  "etapes": [
    {
      "situation": "Ce que tu constates à cette étape.",
      "question": "Ta première action ?",
      "choix": [
        { "texte": "Consigner le départ moteur", "verdict": "bon", "explication": "Pourquoi c'est la bonne démarche." },
        { "texte": "Réarmer et relancer", "verdict": "mauvais", "explication": "Pourquoi ce n'est pas ça." },
        { "texte": "Surrégler le relais thermique", "verdict": "danger", "explication": "Pourquoi c'est dangereux." }
      ]
    }
  ],
  "conclusion": { "cause": "…", "remede": "…", "lecon": "…" },
  "verifie": false
}
```

- `verdict` : `bon` (on passe à l'étape suivante), `acceptable` (on passe, avec une remarque), `mauvais` ou `danger`
  (on lit l'explication, puis on choisit autre chose ; `danger` compte une alerte sécurité). Une seule réponse `bon` par étape.
- L'ordre des choix est mélangé à l'affichage. XP : niveau × étapes réussies du premier coup, + 20 si intervention sans faute.

## Calculs Flash (`js/calcul.js`)

Chaque générateur de `GENERATEURS` a un `id`, un `niveau` (1 à 3), un `titre` et une fonction `creer()` qui renvoie
`{ enonce, aide?, unite, reponse, tolerance?, solution, explication, piege, erreurs, donnees }` (ou `{ enonce, choix, reponse, … }` pour un QCM).
`tolerance` (facultatif, relative) remplace les ±2 % par défaut : ex. 0,004 pour lire une tension au volt près.
Priorité aux **valeurs attendues** utiles sur le terrain (tension à lire au récepteur, charge d'un moteur d'après la pince et la plaque,
déséquilibre entre phases) plutôt qu'aux exercices de manuel.
`erreurs` liste les erreurs types : `[{ valeur, message }]` ; si la réponse tombe à ±2 % d'une valeur, son message s'affiche.
`diagnostiquer()` détecte aussi les erreurs d'unité (×1 000), de virgule (×10) et de √3.
Ajouter un type de calcul = ajouter un objet dans ce tableau. Une séance = 10 calculs répartis entre les générateurs du niveau.

## Banc de mesure (`js/banc.js`, `js/circuit.js`, `data/banc-depart-moteur.json`)

Un départ moteur direct (Q1 porte-fusibles aM, KM1, F2, M1 ; commande 230 V par T1, pupitre Marche / Arrêt distant).
Une panne cachée est tirée au sort parmi celles du fichier (jamais deux fois de suite). L'élève mesure, consigne, contrôle
et remplace ; chaque geste avance une **horloge d'intervention simulée** (pas de chronomètre réel). Le rapport compare
son temps à celui d'un technicien confirmé, liste les alertes sécurité et les pièces changées pour rien, puis explique
la cause, la démarche d'un pro et le piège du cas.

- **Les lectures sont calculées, pas écrites à la main** : `circuit.js` résout le circuit dans l'état du moment
  (contacts ouverts ou fermés, Marche maintenu, panne). Un conducteur « en l'air » affiche une tension fantôme
  (fraction de `fantomes[nœud].couplage`) au multimètre classique, avec un afficheur instable ; en LoZ, elle disparaît.
- **Gestes dangereux** (alerte sécurité + temps perdu) : ohmmètre sans consigner, ohmmètre sur l'amont de Q1,
  retirer un fusible ou démonter une pièce sous tension, 3e essai sur un moteur bloqué.
- **XP** : 50 si réparé, − 10 par pièce inutile, − 15 par alerte sécurité (minimum 10), + 20 si sans faute (aucune alerte, aucune pièce inutile, temps ≤ 1,3 × la référence).
- **Ajouter une panne** : un objet dans `pannes` : `{ id, symptome, ouvre: [éléments coupés], relaisDeclenche?,
  reference (minutes), cause, methode, piege }`. Elle doit être réparable par un élément de `composants[].repare`.
- `#/entrainement/banc?panne=<id>` force une panne précise (tests).

## XP et niveaux (`js/xp.js`)

| Action | XP |
|---|---|
| Bonne réponse, niveau I | +10 |
| Bonne réponse, niveau II | +15 |
| Bonne réponse, niveau III | +20 |
| Séance sans faute 10/10 | +20 |
| Rapidité | sans effet |

Niveaux : N1 Apprenti (0) · N2 Compagnon (200) · N3 Technicien (600) · N4 Technicien Confirmé (1 500) · N5 Expert Senior (3 000).
Les résultats par question sont gardés dans `stats.reco.elements` / `stats.calcul.elements` (base pour une future révision des erreurs) ;
le meilleur score par niveau dans `stats.reco.niveaux` / `stats.calcul.niveaux`.

## Feuille de route

- [x] Étape 1 : socle, module Cours, sauvegarde export/import, installable
- [x] Étape 2 : Exercices — Reconnaissance visuelle (QCM), Calculs Flash, XP & niveaux
- [x] Étape 3 : Cas de panne (interventions pas à pas), mode hors ligne (service worker), nom « Elec learning »
- [x] Audit, phase 1 : choix équilibrés, images muettes, calculs de valeurs attendues
- [x] Audit, phase 2 : banc de mesure virtuel (panne cachée, multimètre, pince, consignation)

## Renommer le dépôt (facultatif)

Le dépôt GitHub s'appelle encore `Dojo-bts`, donc l'adresse reste `…/Dojo-bts/`. Pour la changer : GitHub › Settings › General › Repository name.
Les données restent sur le téléphone (même domaine `github.io`), mais l'app installée pointe vers l'ancienne adresse :
exporter la sauvegarde, supprimer l'app de l'écran d'accueil, l'installer depuis la nouvelle adresse, puis importer la sauvegarde.
