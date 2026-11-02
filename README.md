# Elec learning — simulateur de terrain de l'électricien (PWA)

Pas une app de révision : un **simulateur d'entraînement pour techniciens électriciens de maintenance**. Le cœur, c'est la
pratique : diagnostic au **banc de mesure** (panne cachée, multimètre, LoZ, pince, consignation), **cas de panne** pas à pas,
**calculs** des valeurs à lire avant de mesurer, **reconnaissance** des symboles et du matériel d'armoire. Chaque exercice est
classé par **niveau** (I à III) et par **domaine technique** ; chaque erreur est corrigée comme le ferait un tuteur de terrain :
le pourquoi physique, le piège en armoire, le risque humain et machine, la référence normative.

Les anciennes fiches de cours textuelles ont été retirées (dernière version : commit `3a0ae90`).
HTML/CSS/JS sans framework, sans build, sans npm (seuls les tests automatisés utilisent Playwright). Données de l'utilisateur dans `localStorage`. Fonctionne hors connexion.

En ligne : https://victorort-dev.github.io/Dojo-bts/ (le dépôt garde son nom d'origine, voir « Renommer le dépôt » plus bas).

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Ouvrir `index.html` directement (file://) ne marche pas : le navigateur bloque le chargement des JSON.

## Mettre en ligne (GitHub Pages)

La mise en ligne passe par le workflow `.github/workflows/test.yml` : à chaque push sur `main`, les tests tournent
d'abord ; **le site n'est publié que si toutes les vérifications passent**. Une pull request vers `main` lance les tests sans rien publier.

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
index.html              coquille : barre du haut, zone #vue, onglets Entraînement · Banc · Carnet
manifest.webmanifest    installation PWA (nom, icônes, couleurs)
css/style.css           tout le style ; jetons des thèmes sombre et clair en tête de fichier
sw.js                   service worker : cache d'abord en production (version injectée au déploiement), réseau d'abord en dev — liste FICHIERS à tenir à jour
js/app.js               routeur par hash : #/entrainement (accueil), #/entrainement/banc, /panne, /calcul, /reco, #/profil
                        (anciens liens redirigés : #/dojo… → #/entrainement… ; #/cours et #/fiche/… → accueil)
js/storage.js           SEUL fichier qui touche localStorage (clé "elec-learning:v1", reprend l'ancienne clé "dojo:v1")
js/sauvegarde.js        contrôle strict des données (import refusé à la moindre anomalie, stockage local nettoyé au démarrage)
js/profil.js            progression, export/import, remise à zéro
js/entrainement.js      accueil : « Ta prochaine séance », modes dans l'ordre du profil, carte de l'opérateur ; en-tête de séance, rapport, toast
js/parcours.js          parcours guidé, logique pure : profils, prochaine séance, mentions « Conseillé après… », règle du positionnement
js/bienvenue.js         premier lancement : « Où en es-tu ? » (3 profils)
js/positionnement.js    test de positionnement (12 questions : reconnaissance, calculs, cas de panne ; sans XP)
js/normes.js            éditions des normes citées, ajoutées d'elles-mêmes à la ligne « Réf. »
js/mise-a-jour.js       enregistrement du service worker, bandeau « Nouvelle version prête »
js/domaines.js          les 5 domaines techniques, repères couleur, filtre (barreDomaines), puces
js/tuteur.js            correction en deux temps : resume() (essentiel ≤ ~60 mots), « le risque, en vrai », norme, « En savoir plus »
js/panne.js             mode Cas de panne (interventions pas à pas, démarches expliquées, filtre par domaine)
js/banc.js              mode Banc de mesure (panne cachée, multimètre V~ / LoZ / Ω, pince, consignation, horloge, rapport)
js/circuit.js           petit solveur électrique du banc (potentiels en alternatif, transformateur, tensions fantômes, Ω)
js/atelier.js           plaque signalétique + galvanomètre, bornier de progression, salutation
js/xp.js                niveaux, barème, gain d'XP, statistiques par mode
js/quiz.js              mode Reconnaissance (QCM sur image, par niveau et par domaine)
js/calcul.js            mode Calculs flash (24 générateurs, 3 niveaux, 5 domaines, diagnostic d'erreur, clavier à l'écran)
js/difficulte.js        les 3 niveaux de difficulté + écran de choix niveau × domaine
js/hasard.js            tirages aléatoires (entier, parmi, melanger)
js/theme.js             thème Auto (défaut, suit le téléphone) / sombre / clair, mémorisé dans les préférences
js/mise-en-page.js      frontispice, titres de section, voyants d'état, typographie française (typo)
fonts/                  polices auto-hébergées (Archivo, JetBrains Mono — licence OFL)
js/util.js              esc(), plurielS()
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
`node tests/lancer.mjs non-regression`, `banc`, `parcours`, `ergonomie` ou `service-worker`. Le code de sortie vaut 0 si tout passe, 1 sinon.

| Fichier | Contenu |
|---|---|
| `tests/lancer.mjs` | Point d'entrée : choisit les suites, démarre le serveur et Chromium, affiche le bilan |
| `tests/outils.mjs` | Serveur statique, page iPhone 13 qui collecte les erreurs de console, compteur de vérifications |
| `tests/unitaires.mjs` | Sans navigateur. **U1** : solveur du banc (`circuit.js`), lectures attendues pour l'installation saine et chaque panne (tension fantôme, LoZ, fusible mesuré en place, retour de phase). **U2** : contrôle des sauvegardes (`sauvegarde.js`) : xp en texte, négatif, infini ou démesuré, compteurs incohérents, mode inconnu, profil et positionnement, `__proto__`, nettoyage au démarrage. **U3** : parcours guidé (`parcours.js`) : premier lancement, enchaînement des 10 étapes, mentions, règle du positionnement. **U4** : correction en deux temps : essentiel ≤ 70 mots sur tout le contenu |
| `tests/non-regression.mjs` | Dans le navigateur. **A** : chaque générateur × 300 tirages, valeur recalculée indépendamment, contenus (domaines, risque, norme sur chaque élément, les 5 domaines couverts), équilibre des réponses, images muettes. **B** Reconnaissance. **C** Calculs. **D** domaines (filtres, séances filtrées, niveaux vides grisés) et retrait du module Cours. **E** Cas de panne (chaque cas joué jusqu'au diagnostic final). **F** ancien nom. **G** hors connexion (`sw.js` doit lister exactement les fichiers de l'app). **H** import de sauvegarde par l'écran Carnet (fichiers trafiqués refusés, données intactes, stockage abîmé nettoyé) |
| `tests/parcours.mjs` | **J** : premier lancement (« Où en es-tu ? »), « Ta prochaine séance », ordre des modes, mentions sans verrou, progression, test de positionnement, profil dans le Carnet |
| `tests/ergonomie.mjs` | **L** : banc sous le pouce (console, « Mesurer » sans défilement), bon replié au premier geste, visite guidée en 3 gestes, aucun texte sous 12 px sur 12 écrans (graduations du cadran comprises), thème Auto qui suit le téléphone |
| `tests/service-worker.mjs` | **K** : service worker en conditions de production (version injectée) : ouverture depuis le cache avec un réseau à 8 s par requête, hors ligne, mise à jour en arrière-plan avec bandeau, ancien cache supprimé |
| `tests/banc.mjs` | **I** : les 5 pannes du banc résolues au doigt dans l'interface : mesures, alertes de sécurité, pièce inutile, réarmement, rapport (avec risque et norme) ; chaque panne résolue en suivant seulement les indices, lectures en clair |

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
- **Contenu ≠ code.** Le contenu pédagogique va dans `data/*.json` (et dans `GENERATEURS` pour les calculs). Pas de cours textuel :
  tout contenu est un exercice, avec `domaines`, `risque` et `norme` (les tests refusent un élément sans).
- **Stockage.** Seul `storage.js` lit/écrit `localStorage`, via `lire()` et `modifier(e => …)`. Nouveau champ = l'ajouter dans `etatParDefaut()` **et** dans `controler()` (tous deux dans `sauvegarde.js`), sinon il sera retiré à l'import et au démarrage. Changement de format = incrémenter `VERSION` et compléter `migrer()`.
- **Sécurité d'affichage.** Tout texte injecté dans `innerHTML` passe par `esc()`.
- **Un écran = une fonction `render…({ vue, definirTitre, id, params })`**, branchée dans le `switch` de `app.js`.
- **Langue.** Interface en français, tutoiement. Noms de variables et fonctions en français.
- **Normes.** Repérage : l'app indique les deux (IEC 81346 `-QA1`, `-KF1`… et usage français `Q1`, `KM1`…). _Noter ici celui de ton référentiel._ Symboles : IEC 60617. Unités SI, virgule décimale dans les textes.
- **Cache GitHub Pages (10 min).** Juste après une mise en ligne, le téléphone peut mélanger anciens et nouveaux fichiers JS. Pour une nouvelle fonction partagée, préférer un nouveau fichier plutôt qu'ajouter un export à un fichier existant.
- **Mode hors ligne.** Tout nouveau fichier (JS, données, image, police) doit être ajouté à la liste `FICHIERS` de `sw.js` ; les tests le vérifient.
  Ne jamais modifier la ligne `const VERSION = 'dev';` : le déploiement la remplace par le commit publié.
- **Une fonctionnalité par demande à l'IA, un commit Git dès que ça marche.**

## Charte « Graphite »

Sobre, élégante, « haut de gamme technique » : noir profond, surfaces graphite, très peu de couleur.

- **Fond et surfaces** : noir `#000` (économe sur OLED), cartes `--surface` `#111113`, boutons `--surface-2`, filets d'un pixel
  (`--filet`, blanc à 8 %). Thème **clair** pour le plein soleil (identifiant `porcelaine`, gardé pour la compatibilité des sauvegardes).
- **Typographie** : Archivo (grotesque grasse, interlettrage serré) pour tout le texte ; JetBrains Mono pour les mesures, les unités
  et l'afficheur. Grands titres et grands chiffres en **dégradé métallique** (`--metal`). Passer tout texte de contenu par `typo()`.
- **La couleur porte un sens, jamais une décoration** :
  - états : `--juste` vert, `--faux` rouge, `--attention` ambre ; action principale = pastille claire, texte noir ;
  - identité des modes : une **lueur de couleur** dans le coin de chaque carte (turquoise Banc, rouge Cas de panne, bleu Calculs, ambre Reconnaissance) ;
  - domaines : **repères de gaine** aux couleurs réelles des conducteurs.
- **Formes** : cartes à grands rayons (22 px), boutons 14 px, en-tête et onglets translucides (flou d'arrière-plan).
- **Lisibilité en atelier** : aucun texte sous 12 px (13 px pour les aides de calcul), tests à l'appui ; thème **Auto** par défaut,
  qui suit le réglage clair / sombre du téléphone, avec choix manuel Auto / Sombre / Clair dans le Carnet.
- **Ergonomie** : lecture en haut, actions dans la zone du pouce (`.pousse-bas`) ; « Suivant » collé au-dessus des onglets (`.action-collee`) ;
  cibles d'au moins 44 px.
- **Sobriété** : aucune animation en boucle, animations ≤ 180 ms sur `transform` / `opacity` (sauf le balayage de l'aiguille, une fois) ;
  `prefers-reduced-motion` respecté.
- **Contrastes** vérifiés WCAG : AA minimum partout, AAA pour le texte principal, dans les deux thèmes.

## Hors connexion et mises à jour (`sw.js`, `js/mise-a-jour.js`)

- **En production : « cache d'abord ».** Chaque fichier est servi depuis le cache du téléphone, sans attendre le réseau :
  l'app s'ouvre en une fraction de seconde, même en sous-sol, quand le réseau affiche des barres mais ne répond pas
  (mesuré : environ 0,1 s, contre 15,4 s avec l'ancienne stratégie « réseau d'abord », pour un réseau à 8 s par requête).
- **Mises à jour atomiques.** Le déploiement injecte le commit dans `VERSION` : à chaque mise en ligne, le téléphone télécharge
  **tous** les fichiers d'un bloc dans un cache neuf (tout ou rien), en arrière-plan. La nouvelle version attend : un bandeau
  « Nouvelle version prête · Recharger » la propose, sans jamais couper une séance ; sinon elle s'applique au prochain lancement
  à froid. Jamais de mélange d'anciens et de nouveaux fichiers. L'ancien cache est supprimé à l'activation.
- **En développement** (`VERSION = 'dev'`, serveur local) : « réseau d'abord », pour voir ses modifications aussitôt.
- La toute première ouverture demande du réseau (rien n'est encore en cache).

## Parcours guidé (`js/parcours.js`)

- **Premier lancement** (ni profil ni progression) : écran « Où en es-tu ? » à 3 choix, enregistré dans `profil`
  (`debutant`, `formation`, `confirme`), modifiable dans le Carnet. Un utilisateur qui a déjà joué n'y est jamais renvoyé.
- **« Ta prochaine séance »**, en tête de l'accueil : la première étape du parcours pas encore acquise.

  | Profil | Parcours (R = Reconnaissance, C = Calculs, P = Cas de panne, B = Banc, T = positionnement) | Ordre des modes |
  |---|---|---|
  | Débutant | R1 → C1 → P1 → B → R2 → C2 → P2 → R3 → C3 → P3 | Reconnaissance, Calculs, Cas, Banc |
  | En formation | R1 → C1 → R2 → C2 → P1 → B → P2 → R3 → C3 → P3 | idem |
  | Confirmé | T → B → P2 → C2 → P3 → C3 → R3 → … | Banc, Cas, Calculs, Reconnaissance |

  Une étape est acquise à 80 % sur une séance « tous domaines » (Reconnaissance, Calculs), par un cas réussi sans faute
  (Cas de panne), par une panne réparée sans alerte de sécurité, indices compris (Banc), ou par le test de positionnement.
- **Déblocage souple, jamais de verrou.** Niveaux II et III, domaine HTA, et le Banc pour un débutant portent une mention
  « Conseillé après… » tant que le niveau précédent n'est pas acquis ; ils restent ouvrables d'un toucher.
- **Test de positionnement** (12 questions, 4 par niveau : 2 reconnaissances, 1 calcul en QCM, 1 situation de cas de panne ;
  sans XP). Un niveau est atteint à 3/4, chaque niveau exigeant les précédents. **Chaque mode n'est validé que par ses
  propres questions** (`resultatPositionnement`) : réussir les symboles ne valide ni les calculs ni les cas. Un ancien
  résultat (reconnaissance seule) ne valide plus que la reconnaissance. Proposé en premier aux confirmés.

## Normes et relecture formateur (`js/normes.js`, `outils/relecture.mjs`)

- Chaque référence est complétée de l'édition de la norme (« NF C 18-510:2012+A1:2020 ») ; la NF C 15-100 porte une note :
  paragraphes de l'édition 2002, à recaler sur l'édition 2024. Ajouter une norme = une ligne dans `EDITIONS`.
- Tout contenu non relu (`"verifie": false`, ou calcul sans `verifie: true`) affiche « Contenu pas encore validé par un formateur ».
- `node outils/relecture.mjs` régénère `docs/relecture-formateur.md` : la liste à faire valider (mode, niveau, domaines,
  référence avec édition, case « relu ») et les normes citées sans édition connue. À relancer après chaque ajout de contenu.

## Domaines techniques (`js/domaines.js`)

En plus des 3 niveaux, chaque exercice porte un tableau `domaines` (le premier est le domaine principal). Le filtre est proposé
sur l'écran de choix du niveau (Reconnaissance, Calculs) et sur la liste des Cas de panne ; un niveau vide pour le domaine choisi est grisé.

| id | Domaine | Contenu | Repère couleur |
|---|---|---|---|
| `tbt-cc` | TBT & courant continu | circuits de commande, alimentations 24 V DC, capteurs, automatismes | bleu foncé (NF EN 60204-1 : commande en courant continu) |
| `mono-bt` | Monophasé & basse tension | circuits terminaux, éclairage, prises, protection des personnes | brun + bleu clair (phase + neutre) |
| `tri` | Triphasé & puissance | départs moteurs, transformateurs, couplages, réactif | brun, noir, gris (L1, L2, L3) |
| `securite` | Sécurité & habilitations | consignation, VAT, risques électriques, NF C 18-510 | vert-jaune (PE) |
| `hta` | Haute tension · postes | cellules HTA, protections de transformateur, sélectivité (niveau expert) | rouge (danger) |

**Couverture actuelle** (éléments par niveau I / II / III ; un élément peut compter dans plusieurs domaines) :

| Domaine | Reconnaissance (46) | Calculs (24 générateurs) | Cas de panne (14) |
|---|---|---|---|
| TBT & CC | 7 / 5 / 3 | 2 / 1 / 1 | 1 / 1 / 1 |
| Monophasé & BT | 4 / 3 / 2 | 3 / 2 / 2 | 1 / 2 / 1 |
| Triphasé & puissance | 6 / 7 / 8 | 2 / 4 / 7 | 1 / 1 / 3 |
| Sécurité & habilitations | 6 / 2 / 4 | 1 / 1 / 1 | 3 / 2 / 2 |
| HTA · postes | 2 / 2 / 3 | 1 / 1 / 2 | 1 / 1 / 1 |

Aucune case vide : chaque domaine se travaille à chaque niveau, dans chaque mode.

- Une séance filtrée peut compter moins de 10 questions (Reconnaissance) ; les Calculs restent à 10, les générateurs du domaine étant repris à tour de rôle.
- Les records par niveau ne comptent que les séances « tous domaines ». Le bonus sans faute exige au moins 5 questions.

## Pédagogie : un tuteur de terrain, pas un manuel

- **Pas de chrono.** Le score ne dépend que de la justesse : on prend le temps de poser son raisonnement.
- **Trois niveaux** (`js/difficulte.js`) : I Fondations (+10 XP), II Pratique courante (+15 XP), III Cas complexes et
  subtilités normatives (+20 XP). À partir de 80 % de bonnes réponses, le rapport propose le niveau supérieur (s'il existe dans le domaine).
- **Une erreur = une leçon de terrain.** La correction affiche, selon le mode :
  - le **pourquoi** : pourquoi la réponse choisie est fausse (`pourquoiPas`), le diagnostic de l'erreur de calcul (√3 oublié,
    aller-retour, W/kW…), l'explication physique, le calcul posé ;
  - le **piège en armoire** : ce qui trompe vraiment sur le terrain ;
  - **« le risque, en vrai »** (`risque`) : ce que l'erreur coûte à un humain (électrisation, arc, brûlure) ou à la machine
    (bobinage grillé, démarrage intempestif, appareil qui explose) ;
  - la **référence normative** (`norme`) : NF C 15-100, NF C 18-510, NF EN 60204-1, IEC 60947…
  **Correction en deux temps** (`js/tuteur.js`) : d'emblée, l'essentiel, une soixantaine de mots au plus (la bonne réponse,
  une phrase de pourquoi, « Le risque, en vrai » résumé en phrases entières) ; le reste (explication complète, calcul posé,
  piège, repérage, norme, remède) sous « En savoir plus ». Les tests vérifient le plafond sur tout le contenu.
  Une bonne réponse garde tout replié.

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
  "verifie": false,
  "domaines": ["tri"],
  "norme": "IEC 60947-4-1",
  "risque": "Un contacteur n'est pas un organe de séparation : ses contacts peuvent se souder…"
}
```

- `type` : `symbole` ou `materiel`. `faux` : exactement 3 réponses, toutes différentes de `nom`.
- `pourquoiPas` : une phrase par mauvaise réponse (mêmes textes que dans `faux`), affichée si on la choisit.
- `explication` : comment reconnaître, ce qu'il faut retenir. Une même image peut servir à plusieurs questions (repérage des bornes, réglage…).
- `domaines` : un ou plusieurs ids de domaine (voir « Domaines techniques »). `risque` : ce que l'erreur coûte, à l'humain ou à la machine.
  `norme` : la référence, courte (« NF EN 60204-1 (§ 10.3) »).
- Viser au moins 10 questions par niveau (une séance = 10 questions du niveau choisi, moins si un domaine en compte peu).

## Règles d'écriture des exercices (Reconnaissance et Cas de panne)

- **Pas de biais de longueur** : toutes les propositions d'une question ont la même longueur, le même niveau de détail et la même rigueur
  (la plus longue ≤ 1,45 × la plus courte). La bonne réponse ne doit pas être plus souvent la plus longue que le hasard (≤ 35 %). Les tests le vérifient.
- **Des fausses pistes crédibles** : des erreurs qu'un technicien fait vraiment (23-24 au lieu de 13-14, différentiel AC au lieu de B,
  vérifier 0 V sur L1-L2-L3 au lieu du bus continu…), jamais des énormités.
- **Des images muettes** : aucun repère de borne, calibre ni marquage écrit sur les illustrations (sauf ce qui fait partie du symbole IEC,
  comme « M 3~ »). Si la question porte sur un marquage, il est cité dans le texte de la question.
- `image` : SVG ou photo (`.jpg`/`.webp`, max ~200 Ko). Les visuels `mat-*.svg` sont des illustrations simplifiées : les remplacer par tes propres photos d'armoire (atelier, stage) dès que possible, en gardant le même champ `image`.
- Une séance tire 10 questions au hasard parmi celles du niveau (et du domaine) choisis.

## Format d'un cas de panne (`data/pannes.json`)

```json
{
  "id": "moteur-grogne",
  "niveau": 2,
  "domaines": ["tri"],
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
  "conclusion": { "cause": "…", "remede": "…", "lecon": "…", "piege": "…", "risque": "…", "norme": "…" },
  "verifie": false
}
```

- `verdict` : `bon` (on passe à l'étape suivante), `acceptable` (on passe, avec une remarque), `mauvais` ou `danger`
  (on lit l'explication, puis on choisit autre chose ; `danger` compte une alerte sécurité). Une seule réponse `bon` par étape.
- L'ordre des choix est mélangé à l'affichage. XP : niveau × étapes réussies du premier coup, + 20 si intervention sans faute.

## Calculs Flash (`js/calcul.js`)

Chaque générateur de `GENERATEURS` a un `id`, un `niveau` (1 à 3), un `titre`, des `domaines`, un `risque`, une `norme`
(facultative) et une fonction `creer()` qui renvoie
`{ enonce, aide?, unite, reponse, tolerance?, solution, explication, piege, erreurs, donnees }` (ou `{ enonce, choix, reponse, … }` pour un QCM).
`tolerance` (facultatif, relative) remplace les ±2 % par défaut : ex. 0,004 pour lire une tension au volt près.
Priorité aux **valeurs attendues** utiles sur le terrain (tension à lire au récepteur, charge d'un moteur d'après la pince et la plaque,
déséquilibre entre phases) plutôt qu'aux exercices de manuel.
`erreurs` liste les erreurs types : `[{ valeur, message }]` ; si la réponse tombe à ±2 % d'une valeur, son message s'affiche.
`diagnostiquer()` détecte aussi les erreurs d'unité (×1 000), de virgule (×10) et de √3.
Ajouter un type de calcul = ajouter un objet dans ce tableau, et sa valeur attendue dans le test A (`tests/non-regression.mjs`).
Une séance = 10 calculs répartis entre les générateurs du niveau (et du domaine) choisis.

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
- **Mission en une ligne** en tête d'écran (« trouver la pièce en panne, la remplacer, faire redémarrer le moteur ») et
  panneau repliable **« Comment ça marche ? »** : la démarche en 4 étapes (mesurer sous tension en suivant le courant,
  consigner, confirmer en Ω ou contrôler le fusible puis remplacer, déconsigner et essayer).
- **Bouton « Indice »** (console) : donne l'étape suivante de la démarche de référence de la panne (`pistes`), avec son
  pourquoi. Pour une mesure, il règle la fonction et place les deux pointes ; pour un geste, il ouvre Actions et
  surligne le bouton (`data-suggere`), en présélectionnant le fusible ou la pièce. Une étape déjà faite par l'élève
  est sautée ; un indice n'est compté qu'une fois par étape.
- **Lectures en clair** sous l'afficheur : « ≈ 230 V : la tension arrive bien entre ces deux points », « 0 V : pas de
  tension », « OL : circuit ouvert », « l'afficheur hésite : refais en LoZ », « l'amont reste sous tension, même consigné ».
- **Pannes graduées** (`niveau` 1 à 3 dans le JSON) : la panne cachée est tirée au niveau du premier palier pas encore
  franchi (`pannesCandidates` dans `js/parcours.js`) : niveau I (FU1, bobine) puis II (95-96, fusible L2) puis III (câble
  du pupitre), puis tirage libre. Un palier est franchi par une panne **réparée sans alerte de sécurité, indices compris** ;
  c'est aussi ce qui valide l'étape Banc du parcours. Le « sans faute » reste un bonus XP.
- **XP** : 50 si réparé, − 10 par pièce inutile, − 15 par alerte sécurité, − 5 par indice (minimum 10), + 20 si sans faute
  (aucune alerte, aucune pièce inutile, aucun indice, temps ≤ 1,3 × la référence). Le rapport affiche les indices utilisés.
- **Ajouter une panne** : un objet dans `pannes` : `{ id, symptome, ouvre: [éléments coupés], relaisDeclenche?,
  reference (minutes), domaines, cause, methode, piege, risque, norme, pistes }`. Elle doit être réparable par un élément de `composants[].repare`.
  `pistes` = la démarche de référence, une étape par objet, chacune avec un `pourquoi` : `{ mesure: [fonction, rouge, noir] }`,
  `{ consigner: true }`, `{ controle: 'fu1' | 'fu-l2' }`, `{ remplacer: id }`, `{ deconsigner: true }`, `{ collegue: true }`,
  `{ rearmer: true }`, `{ essai: true }`. Le test **I** vérifie que chaque panne se résout en suivant seulement les indices, sans alerte.
- `#/entrainement/banc?panne=<id>` force une panne précise (tests).
- **Sous le pouce** : la console d'instruments (onglets Multimètre / Pince / Actions, V~ / LoZ / Ω, pointe rouge et COM,
  afficheur et « Mesurer » côte à côte) est fixée au-dessus des onglets ; le contenu (symptôme, bon d'intervention, état
  de l'armoire, schéma, résultat, journal) défile au-dessus. Le bon d'intervention se replie au premier geste.
  L'appareil **arrive replié** en une barre « Appareil de mesure » toujours visible (dernière mesure affichée, bouton
  « Indice » à côté) : la toucher le déplie ou le replie ; « Indice » le déplie de lui-même.
- **Visite guidée** au premier passage (3 gestes : mesurer en V~, refaire en LoZ pour démasquer la tension fantôme,
  consigner), passable, mémorisée dans `preferences.visiteBanc`.

## XP et niveaux (`js/xp.js`)

| Action | XP |
|---|---|
| Bonne réponse, niveau I | +10 |
| Bonne réponse, niveau II | +15 |
| Bonne réponse, niveau III | +20 |
| Séance sans faute (au moins 5 questions) | +20 |
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
- [x] P0 : tests versionnés, import sécurisé, intégration continue
- [x] Pivot « simulateur de terrain » : fiches de cours retirées, 5 domaines techniques, risque et norme sur chaque exercice,
      nouveaux contenus TBT & CC, Sécurité (consignation / VAT) et HTA (DGPT2, couplage Dyn11, sectionneur de terre)
- [x] Contenu « niveau expert » : 12 questions, 7 calculs, 6 cas de panne ; plus aucune case vide niveau × domaine × mode
- [x] Audit UX, chantier 4 : service worker « cache d'abord » versionné, mises à jour atomiques
- [x] Audit UX, chantier 1 : premier lancement, « Ta prochaine séance », déblocage souple, test de positionnement
- [x] Audit UX, chantiers 2 et 3 : banc sous le pouce et visite guidée, correction en deux temps, textes ≥ 12 px, thème Auto
- [x] Banc plus simple : mission, « Comment ça marche ? », indices pas à pas, lectures en clair
- [x] Audit pédagogique, P0 : banc validé avec indices et gradué, positionnement mode par mode, 5 questions reclassées, éditions des normes
- [x] Audit pédagogique, P1 : 12 cas de panne (VAT, isolement, schéma IT, sélectivité, serrures HTA…), 14 questions (CAT III / IV, lecture de schéma, composants d'armoire), 8 calculs de terrain (Iz corrigé, Icc en aval, seuils magnétiques, réglage Ir, isolement attendu, énergie résiduelle, sortie d'automate, glissement)
- [ ] Relecture de tout le contenu par un formateur (`"verifie": true`)
- [ ] Répétition espacée (boîtes de Leitner) à partir de `stats.*.elements`
- [ ] Banc : VAT faite par l'élève, nouveaux circuits (étoile-triangle, inverseur, éclairage, différentiel)

## Renommer le dépôt (facultatif)

Le dépôt GitHub s'appelle encore `Dojo-bts`, donc l'adresse reste `…/Dojo-bts/`. Pour la changer : GitHub › Settings › General › Repository name.
Les données restent sur le téléphone (même domaine `github.io`), mais l'app installée pointe vers l'ancienne adresse :
exporter la sauvegarde, supprimer l'app de l'écran d'accueil, l'installer depuis la nouvelle adresse, puis importer la sauvegarde.
