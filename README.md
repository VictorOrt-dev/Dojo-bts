# Elec learning — simulateur de terrain de l'électricien (PWA)

> *Simulateur de terrain de l'électricien — Conçu et éprouvé selon la réalité des armoires industrielles et la rigueur
> des normes en vigueur.*

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
js/app.js               routeur par hash : #/entrainement (accueil), #/entrainement/banc, /panne, /calcul, /reco, /isolement, /examen, #/profil
                        (anciens liens redirigés : #/dojo… → #/entrainement… ; #/cours et #/fiche/… → accueil)
js/storage.js           SEUL fichier qui touche localStorage (clé "elec-learning:v1", reprend l'ancienne clé "dojo:v1")
js/sauvegarde.js        contrôle strict des données (import refusé à la moindre anomalie, stockage local nettoyé au démarrage)
js/profil.js            progression, export/import, remise à zéro
js/entrainement.js      accueil : « Ta prochaine séance », modes dans l'ordre du profil, carte de l'opérateur ; en-tête de séance, rapport, toast
js/parcours.js          parcours guidé, logique pure : profils, prochaine séance, mentions « Conseillé après… », règle du positionnement
js/bienvenue.js         premier lancement : « Où en es-tu ? » (3 profils)
js/positionnement.js    test de positionnement (12 questions : reconnaissance, calculs, cas de panne ; sans XP)
js/examen.js            Bilan · examen blanc (15 questions et calculs chronométrés, sans aide, bilan par compétence)
js/normes.js            éditions des normes citées, ajoutées d'elles-mêmes à la ligne « Réf. »
js/mise-a-jour.js       enregistrement du service worker, bandeau « Nouvelle version prête »
js/domaines.js          les 5 domaines techniques, repères couleur, filtre (barreDomaines), puces
js/tuteur.js            correction en deux temps : resume() (essentiel ≤ ~60 mots), « le risque, en vrai », norme, « En savoir plus »
js/panne.js             mode Cas de panne (interventions pas à pas, démarches expliquées, filtre par domaine)
js/banc.js              mode Banc de mesure (panne cachée, multimètre V~ / LoZ / Ω, pince, consignation, horloge, rapport)
js/tutoriel-banc.js     guide « Première intervention » du banc : 4 étapes, geste courant et surbrillance (logique pure)
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
data/banc-*.json        CIRCUITS et pannes du banc de mesure (départ moteur, étoile-triangle, éclairage)
img/banc/               schémas du banc (depart-moteur.svg, etoile-triangle.svg, eclairage.svg)
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
`node tests/lancer.mjs non-regression`, `banc`, `parcours`, `isolement`, `guidage`, `insignes`, `lancement`, `ergonomie` ou `service-worker`. Le code de sortie vaut 0 si tout passe, 1 sinon.

| Fichier | Contenu |
|---|---|
| `tests/lancer.mjs` | Point d'entrée : choisit les suites, démarre le serveur et Chromium, affiche le bilan |
| `tests/outils.mjs` | Serveur statique, page iPhone 13 qui collecte les erreurs de console, compteur de vérifications |
| `tests/unitaires.mjs` | Sans navigateur. **U1** : solveur du banc (`circuit.js`), lectures attendues pour l'installation saine et chaque panne (tension fantôme, LoZ, fusible mesuré en place, retour de phase). **U2** : contrôle des sauvegardes (`sauvegarde.js`) : xp en texte, négatif, infini ou démesuré, compteurs incohérents, mode inconnu, profil et positionnement, `__proto__`, nettoyage au démarrage. **U3** : parcours guidé (`parcours.js`) : premier lancement, enchaînement des 10 étapes, mentions, règle du positionnement. **U0** : audit d'intégrité normatif et technique (`outils/audit.mjs`). **U4** : correction en deux temps : essentiel ≤ 70 mots sur tout le contenu. **U5** à **U9** : révision espacée, banc éclairage, guidage et fiches, insignes, corrections de l'audit 360°. **U10** : mégohmmètre dans le temps (lecture à 15 s, 1 min, IP et DAR, interprétation). **U11** : rappels d'erreurs dans les séances (délai, plafond, filtre, places dans la séance). **U12** : examen blanc (3 par domaine, note sur 20, mentions, bilan par compétence). **U13** : guide du banc (cas de démonstration cohérent avec le circuit, étapes, geste courant, surbrillance, écarts rattrapés) |
| `tests/non-regression.mjs` | Dans le navigateur. **A** : chaque générateur × 300 tirages, valeur recalculée indépendamment, contenus (domaines, risque, norme sur chaque élément, les 5 domaines couverts), équilibre des réponses, images muettes. **B** Reconnaissance. **C** Calculs. **D** domaines (filtres, séances filtrées, niveaux vides grisés) et retrait du module Cours. **E** Cas de panne (chaque cas joué jusqu'au diagnostic final). **F** ancien nom. **G** hors connexion (`sw.js` doit lister exactement les fichiers de l'app). **H** import de sauvegarde par l'écran Carnet (fichiers trafiqués refusés, données intactes, stockage abîmé nettoyé) |
| `tests/parcours.mjs` | **J** : premier lancement (« Où en es-tu ? »), « Ta prochaine séance », ordre des modes, mentions sans verrou, progression, test de positionnement, profil dans le Carnet |
| `tests/ergonomie.mjs` | **L** : banc sous le pouce (console, « Mesurer » sans défilement), bon replié au premier geste, aides du multimètre, volets en accordéon, appareil mémorisé, guide « Première intervention » joué au doigt de bout en bout (déclenchement au premier accès, surbrillances, fin, bouton « ? Guide du banc », « Quitter le guide »), aucun texte sous 12 px sur 12 écrans (graduations du cadran comprises), thème Auto qui suit le téléphone |
| `tests/service-worker.mjs` | **K** : service worker en conditions de production (version injectée) : ouverture depuis le cache avec un réseau à 8 s par requête, hors ligne, mise à jour en arrière-plan avec bandeau, ancien cache supprimé |
| `tests/apprentissage.mjs` | **Q** : une erreur d'il y a 4 jours revient en 6e question d'une séance de niveau II, marquée « Rappel d'erreur » ; une erreur de 12 h n'y revient pas ; calculs rappelés avec de nouvelles valeurs ; filtre de domaine respecté. **R** : examen blanc joué au doigt (chronomètre, ni verdict ni fiche pendant l'épreuve, 10/15 → 13,5/20, bilan par compétence, corrigé, erreurs en révision, record à l'accueil, arrêt au bout du temps) |
| `tests/banc.mjs` | **I** : les pannes des 3 circuits du banc résolues au doigt dans l'interface : mesures, alertes de sécurité, pièce inutile, réarmement, rapport (avec risque et norme) ; chaque panne résolue en suivant seulement les indices, lectures en clair |

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
  | Débutant | R1 → C1 → P1 → B → R2 → C2 → P2 → R3 → C3 → P3 | Reconnaissance, Calculs, Cas, Banc, Isolement, Examen blanc |
  | En formation | R1 → C1 → R2 → C2 → P1 → B → P2 → R3 → C3 → P3 | idem |
  | Confirmé | T → B → P2 → C2 → P3 → C3 → R3 → … | Banc, Isolement, Cas, Calculs, Reconnaissance, Examen blanc |

  Une étape est acquise à 80 % sur une séance « tous domaines » (Reconnaissance, Calculs), par un cas réussi sans faute
  (Cas de panne), par une panne réparée sans alerte de sécurité, indices compris (Banc), ou par le test de positionnement.
- **Déblocage souple, jamais de verrou.** Niveaux II et III, domaine HTA, et le Banc pour un débutant portent une mention
  « Conseillé après… » tant que le niveau précédent n'est pas acquis ; ils restent ouvrables d'un toucher.
- **Test de positionnement** (12 questions, 4 par niveau : 2 reconnaissances, 1 calcul en QCM, 1 situation de cas de panne ;
  sans XP). Un niveau est atteint à 3/4, chaque niveau exigeant les précédents. **Chaque mode n'est validé que par ses
  propres questions** (`resultatPositionnement`) : réussir les symboles ne valide ni les calculs ni les cas. Un ancien
  résultat (reconnaissance seule) ne valide plus que la reconnaissance. Proposé en premier aux confirmés.

## Normes et audit d'intégrité (`js/normes.js`, `outils/audit.mjs`)

- Chaque référence est complétée de l'édition de la norme (« NF C 18-510:2012+A1:2020 »). Ajouter une norme = une ligne
  dans `EDITIONS` ; l'audit refuse toute norme citée sans édition.
- **Règle de citation** : les paragraphes de la NF C 15-100 suivent son édition 2002 (433 surcharges, 434 courts-circuits,
  523 courants admissibles, 525 chute de tension, 531 différentiels, 535 sélectivité, 542 prises de terre, 771 locaux
  d'habitation) ; la protection contre les chocs électriques (schémas TT, TN, IT, différentiel 30 mA) se cite dans
  l'IEC 60364-4-41:2005, § 411.x.
- `node outils/audit.mjs` : **audit d'intégrité normatif et technique** de tout le contenu (136 éléments, environ
  1 600 contrôles), écrit `docs/audit-conformite.md` et sort en erreur à la moindre anomalie. Il contrôle les normes et
  leurs éditions, 200 tirages de chaque calcul (valeur retrouvée dans le calcul posé, erreurs typiques distinctes), les
  seuils d'isolement (IEC 60364-6), la présence des blocs « Le risque, en vrai » et « Le piège en armoire », et la
  structure (une seule bonne démarche, embranchements, pannes réparables, démarches cohérentes avec le circuit).
  La suite `unitaires` l'exécute : la CI bloque tout envoi qui le casse.

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
  "conclusion": { "cause": "…", "remede": "…", "lecon": "…", "piege": "…", "risque": "…", "norme": "…" }
}
```

**Embranchements (niveau III).** Une étape peut porter `"id"` et `"branche": true` (hors du chemin normal) ; un choix
peut porter `"vers": "<id d'étape>"` et `"consequence": { "texte": "…", "minutes": 240 }`. Le choix s'applique quel que
soit son verdict : la machine change d'état (carter brûlant, moteur grillé…), on ne le rattrape pas, et le rapport
liste « Ce que tes choix ont coûté » avec les heures d'arrêt. Dans une étape « branche », la bonne démarche rejoint
le chemin normal par `vers`. Exemples : `pompe-thermique-rearme`, `tgbt-reenclenchement`.

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

Trois circuits : un départ moteur direct (Q1 porte-fusibles aM, KM1, F2, M1 ; commande 230 V par T1, pupitre Marche / Arrêt
distant), un démarrage étoile-triangle et un éclairage de couloir par télérupteur (voir « Trois circuits » plus bas).
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
- **Trois circuits** (`js/banc-profils.js`, sélecteur en tête du banc, `?circuit=eclairage`) : le départ moteur direct
  et l'**éclairage de couloir par télérupteur** (`data/banc-eclairage.json`, schéma `img/banc/eclairage.svg`) : Q1
  bipolaire, poussoirs S1 et S3 (25 m), télérupteur KL, boîte de dérivation, lampes H1 et H2. Cinq pannes graduées :
  lampe H2 (I), bobine du télérupteur (I), câble vers S3 (II), neutre coupé dans la boîte (II, neutre des lampes à
  230 V), contact du télérupteur brûlé (III, même symptôme que le neutre coupé : c'est la mesure du retour lampes qui
  tranche). Un profil de circuit fournit les textes, les voyants, la pince, les pièces à contrôler hors circuit et ce
  qui se passe à l'essai ; multimètre, consignation, indices et rapport sont communs. Nouveau type de piste : `{ appui: true }`.
- **Démarrage étoile-triangle** (`data/banc-etoile-triangle.json`, schéma `img/banc/etoile-triangle.svg`, `?circuit=etoile-triangle`) :
  KM1 ligne, KM3 étoile, KM2 triangle (en amont de F2, qui voit le courant d'enroulement), temporisateur KT (55-56 repos,
  67-68 travail), verrouillages croisés NF. Quatre pannes : fil de maintien KM1 13-14 coupé (I : le moteur ne tourne que
  bouton appuyé), temporisateur hors service (II : reste en étoile), enroulement V déséquilibré (II : 1,3 Ω au lieu de
  2,1 Ω, courants de ligne 24 / 31 / 31 A à la pince, F2 déclenche), contacteur étoile KM3 collé (III : KM2 bloqué par
  le NF de KM3, couplage étoile au-delà de la temporisation, F2 déclenche).
  Deux types de pannes s'ajoutent à `ouvre` : `resistances` (`{ élément: Ω }`, une résistance modifiée) et `soudes`
  (contacteurs aux pôles collés, une commande logique toujours fermée). Nouveau type de piste : `{ pince: n }` (index de la
  pince à lire, l'indice ouvre l'onglet Pince).
- **Sous le pouce** : la console d'instruments (onglets Multimètre / Pince / Actions, V~ / LoZ / Ω, pointe rouge et COM,
  afficheur et « Mesurer » côte à côte) est fixée au-dessus des onglets ; le contenu (symptôme, bon d'intervention, état
  de l'armoire, schéma, résultat, journal) défile au-dessus. Le bon d'intervention se replie au premier geste.
  L'appareil **arrive replié** en une barre « Appareil de mesure » toujours visible (dernière mesure affichée, bouton
  « Indice » à côté) : la toucher le déplie ou le replie ; « Indice » le déplie de lui-même.
- **Guide « Première intervention »** (`js/tutoriel-banc.js`, logique pure) : au tout premier passage au banc (sans
  `?circuit=` ni `?panne=`), ou à tout moment par le bouton **« ? Guide du banc »** (`?tuto=1`). Un cas de démonstration
  toujours identique, le câble du pupitre coupé, joué en 4 étapes et 9 gestes : 1. lire le symptôme du bon
  d'intervention ; 2. poser les pointes (rouge sur le point testé, COM sur le 0 V) en armoire, puis au pupitre ;
  3. V~ ou LoZ : 91 V qui hésitent, la LoZ les fait tomber à 0 V (tension fantôme) ; 4. localiser le câble, consigner,
  confirmer à l'ohmmètre (OL), remplacer, déconsigner, essai. La fiche du guide est en tête de la console, sous le pouce,
  avec la progression en 4 segments ; ce qu'il faut toucher est **mis en surbrillance** (`.tuto-cible`) et l'onglet
  utile s'ouvre de lui-même. Un écart est rattrapé (« déconsigne d'abord », « consigne d'abord »). La fin rappelle les
  4 réflexes et lance « Ma première vraie panne ». La démonstration ne compte ni en statistiques ni en XP ; elle est
  mémorisée dans `preferences.tutoBanc` (un apprenti qui avait fait l'ancienne visite, `visiteBanc`, n'y est pas forcé).
- **Volets en accordéon** : « Comment ça marche ? », le bon d'intervention et le schéma de l'armoire sont des
  `<details name="volets-banc">` : un seul ouvert à la fois. Le symptôme signalé reste affiché en une ligne.
- **Aides du multimètre** : sous chaque fonction, une légende (V~ « Tension ? », V~ LoZ « Anti-fantôme »,
  Ω « Hors tension ») ; sous le sélecteur, l'aide de la fonction choisie (`#aide-fonction`, reliée par
  `aria-describedby`), qui passe en alerte si Ω est choisi départ non consigné. Un geste dangereux à la mesure est
  rappelé dans la console même.
- **Appareil mémorisé** : replié à la toute première intervention, il garde ensuite l'état choisi
  (`preferences.consoleBanc`) : laissé ouvert, il revient ouvert, « Mesurer » sous le pouce sans aucun geste.

## Mesure d'isolement (`js/isolement.js`, `data/isolement.json`)

- Un scénario = un circuit (`points`, `tensionReseau`), la tension d'essai conseillée (`essaiConseille` : 250 V DC en TBT,
  500 V DC jusqu'à 500 V), le `seuil` en MΩ, l'électronique à débrancher (`electronique` : variateur, automate, regulateur ou null),
  la valeur des paires saines (`sain`) et des paires en défaut (`mesures`, clé « A|B » triée), les mesures indispensables
  (`cles`), trois conclusions dont une seule bonne, et une conclusion (cause, remède, piège, risque, norme).
- Trois temps : préparer (consigner + VAT, débrancher l'électronique), mesurer (tension d'essai, deux pointes,
  « Tester »), conclure. Essai sous tension = alerte sécurité ; électronique raccordée = matériel endommagé et mesure
  sans valeur ; mauvaise tension d'essai = erreur de méthode. Une conclusion n'est validée que si les mesures clés ont
  été faites correctement. `lecture()` est pure.
- **Dimension temporelle** : durée d'essai 15 s, 1 min (par défaut, la lecture de référence) ou 10 min · IP. Un
  enroulement de machine tournante porte `absorption` : `{ "15", "30", "600" }`, la valeur à 15 s, 30 s et 10 min
  rapportée à celle d'1 minute (le diélectrique se polarise, R monte). L'essai de 10 minutes affiche R30 s, R1 min,
  R10 min, **DAR = R1 min / R30 s** et **IP = R10 min / R1 min** (IEC 60034-27-4), interprétés : IP < 1 dangereux,
  1 à 2 douteux, 2 à 4 bon, ≥ 4 très bon ; DAR < 1 mauvais, < 1,25 douteux, < 1,6 bon. Lire à 15 s sur un enroulement
  est une erreur de méthode (valeur sous-estimée). Sans `absorption` (câble, prises), la lecture est stable et l'IP
  n'apporte rien. `ipRequis` : la conclusion n'est validée qu'avec un IP mesuré sur une paire clé.
- Huit scénarios, dont deux machines tournantes : un alternateur de groupe resté à l'arrêt en local humide (3,2 MΩ,
  IP 1,04 : sécher avant démarrage, régulateur AVR à débrancher) et un moteur de broyeur de 22 ans (80 MΩ, IP 1,30 :
  vernis vieilli, réimprégnation à planifier). L'audit recalcule l'IP et vérifie qu'il figure dans la cause.
- XP : 30 si juste, − 15 par alerte, − 10 par dégât, − 5 par erreur de méthode (minimum 10), + 20 sans faute.

## Prise en main et parcours en 3 blocs (`js/bienvenue.js`, `js/blocs.js`)

- **Premier lancement** : l'objectif en deux phrases (simulateur de terrain ; hors connexion, sans compte, progression
  sur le téléphone), les 3 blocs du parcours, puis « Où en es-tu ? » (3 profils).
- **Les 3 blocs** (`BLOCS`), rappelés sur l'accueil avec des raccourcis directs :
  1. Bases & monophasé : Reconnaissance I, calculs monophasé, cas de sécurité ;
  2. Armoire & banc : banc départ moteur, banc éclairage, cas TBT et commande ;
  3. Triphasé, mégohmmètre & HTA : calculs triphasé, mesure d'isolement, cas HTA.

## Données 100 % locales

- Aucune donnée ne quitte l'appareil : pas de compte, pas de serveur, pas de mesure d'audience, polices embarquées.
- **Politique de sécurité de contenu** (`index.html`) : tout vient de l'app elle-même, aucun script en ligne, aucun hôte
  externe (images, requêtes, cadres, objets interdits) ; styles en ligne seuls autorisés. Vérifiée par la suite P, qui
  tente un script injecté, une image et une requête externes.
- **Écriture impossible** (stockage plein, navigation privée) : bandeau d'alerte « Progression non enregistrée », une
  fois par ouverture, qui invite à exporter.
  Le Carnet le dit : « Tes données de progression restent 100 % locales sur ton appareil. Zéro compte requis, zéro
  serveur externe. »
- Export JSON (partage iOS ou téléchargement) et import contrôlé ; la suite **P** vérifie l'aller-retour complet
  export → tout effacer → import (statistiques, révision, positionnement, insignes, série, jalons).

## Prochaine étape : guidage par domaine (`js/guidage.js`)

- L'encart de l'accueil est choisi d'après les **10 dernières réponses** de chaque question, calcul et cas (`recents`,
  « 1 » juste / « 0 » faux, dans `stats.<mode>.elements`), cumulées par **domaine principal** : un progrès efface la
  lacune. Une ancienne sauvegarde sans historique récent est ramenée à 10 réponses, à la même proportion :
  1. **lacune** : un domaine avec au moins 6 réponses et 35 % d'échec ou plus (le plus faible d'abord) → « Taux d'échec
     élevé en Triphasé (42 %) — Lancer la séance ciblée », vers le mode et le niveau qui concentrent les erreurs
     (`#/entrainement/calcul?n=2&d=tri`) ou le cas le plus raté (`#/entrainement/panne?c=…`) ;
  2. **niveau** : reconnaissance et calculs acquis à un niveau, pas au suivant → « Fondations acquises — Passe au niveau II » ;
  3. sinon, la suite du **parcours guidé** (`parcours.js`).
- L'encart affiche aussi la réussite par domaine (« TRI 58 % ») et garde l'avancement du parcours.

## Fiches mémo (`js/memos.js`, `data/memos.json`)

- 23 fiches de 30 secondes (100 mots au plus) : formule, schéma en texte ou règle critique. Chaque fiche porte ses
  `cibles` (`reco`, `calcul`, `panne`, `isolement`) : **chaque** question, calcul, cas et mesure a sa fiche (vérifié par U7).
- Texte en Markdown réduit, échappé avant mise en forme : paragraphes, listes `-`, `**gras**`, `` `code` ``, règle `>`,
  blocs ``` pour les formules et schémas.
- Après une erreur (question ratée, calcul faux, démarche mauvaise ou dangereuse, conclusion d'isolement fausse) :
  encart replié « Comprendre la notion · titre » sous la correction.
- Toutes les fiches, rangées par domaine : Carnet › Fiches mémo (`#/entrainement/memos`, `?m=<id>` en ouvre une).

## Insignes de terrain et séries (`js/badges.js`, `js/insignes.js`)

- **8 insignes** (Carnet › Qualifications & insignes), pictogrammes SVG au trait, verrouillés avec leur progression
  ou « Obtenu le … » :

  | Insigne | Condition |
  |---|---|
  | Habilité au banc | une panne réparée au banc sans alerte de sécurité |
  | Maître du mégohmmètre | les 6 mesures d'isolement réussies sans endommager de matériel |
  | Chasseur de pannes | 5 cas de panne différents menés jusqu'au diagnostic final |
  | Rigueur normative | 10 fiches mémo ouvertes sous une correction ratée |
  | Zéro piège | un cas de niveau III à embranchements réussi sans faute du premier coup |
  | Régularité de chantier | 3 jours d'entraînement consécutifs |
  | Consignateur | les cas de consignation et de VAT réussis sans faute |
  | Sans faute | une séance de 10 questions ou 10 calculs à 10/10 |

- Stockage : `activite.jours` (jours d'entraînement, heure locale), `jalons` (`memosApresErreur`, `isolementPropre`),
  `badges` (`{ id: date }`), contrôlés à l'import. Les insignes sont vérifiés après chaque réponse et à l'ouverture
  de l'accueil et du Carnet ; un insigne obtenu le reste.
- Seules les dates réelles comptent : une date impossible rend une sauvegarde invalide, une date future (horloge
  avancée) est ignorée.
- **Série** : jours consécutifs jusqu'à aujourd'hui (ou hier, tant que la journée n'est pas finie), affichée
  discrètement sur l'accueil (« Série : 3 jours ») et dans la vitrine avec la meilleure série.
- **Retours visuels** : annonce « Insigne obtenu » dont l'icône se pose comme un tampon (jamais bloquante,
  `pointer-events: none`), tampon « Niveau validé » sur le rapport d'une séance de niveau à 8/10 ou plus ; vibration
  brève après un geste de l'utilisateur ; animations coupées si le téléphone demande moins de mouvement.

## À réviser : répétition espacée (`js/leitner.js`, `js/revision.js`)

- Toute erreur (question ratée, calcul faux, cas pas sans faute, panne du banc avec alerte de sécurité) place l'élément
  en **boîte 1**, à revoir tout de suite. Chaque réussite le fait monter d'une boîte : revu après 1, 3, 7 puis 15 jours ;
  réussi en boîte 5, il sort de la révision. Une erreur le renvoie en boîte 1. Stocké dans `stats.<mode>.elements[id]`
  (`boite`, `revoir`), contrôlé à l'import.
- Écran `#/entrainement/revision` (depuis le Carnet ou le rappel de l'accueil) : éléments à revoir par mode ;
  `#/entrainement/reco?revision=1` et `#/entrainement/calcul?revision=1` lancent une séance des seuls éléments dus,
  les cas et les pannes du banc s'ouvrent directement.
- **Rappels dans les séances ordinaires** (`rappelsPourSeance`, `intercaler`) : une question ou un calcul raté revient
  de lui-même dans une séance ordinaire de reconnaissance ou de calculs, **quelques jours plus tard** : arrivé à échéance
  et dont la dernière réponse remonte à 2 jours au moins (`DELAI_RAPPEL_JOURS`). Au plus 3 par séance de 10
  (`RAPPELS_MAX`), les plus en retard d'abord, répartis dans la séance (jamais en premier : places 3, 6 et 8 pour trois
  rappels), de même niveau ou d'un niveau inférieur, dans le domaine de la séance. Marqués « Rappel d'erreur » ; un calcul
  revient avec de nouvelles valeurs. Le rapport indique « Dont N rappels d'erreurs passées : M retrouvés ». La réponse
  fait avancer (ou redescendre) l'élément dans ses boîtes, comme en révision.

## Bilan · examen blanc (`js/examen.js`)

- `#/entrainement/examen`, sixième mode de l'accueil. 15 éléments tirés au sort (`composerExamen`) : **3 par domaine**,
  questions de reconnaissance et calculs alternés, tous niveaux ; les calculs passent en QCM (`calculEnQcm`).
- **15 minutes** au chronomètre (`DUREE_EXAMEN`, `?duree=` en secondes pour les tests) ; passé 2 minutes restantes, il
  passe en couleur d'alerte. Au bout du temps, l'examen s'arrête seul : les questions restantes comptent sans réponse.
- **Aucune aide pendant l'épreuve** : ni verdict, ni correction, ni fiche mémo ; « Passer la question » compte comme une
  erreur.
- **Rapport** (`bilanExamen`) : score sur 15, note sur 20 (au demi-point), mention (≥ 80 % « Prêt pour l'examen »,
  ≥ 60 % « Admissible, à consolider », sinon « À retravailler »), temps passé, puis **bilan par compétence** : chaque
  domaine, chaque type (reconnaissance, calculs) et chaque niveau, avec une jauge et un verdict (≥ 2/3 acquis, ≥ 1/3 à
  consolider, sinon à retravailler) et, pour un domaine non acquis, un lien vers une séance ciblée. Le corrigé des 15
  questions vient ensuite.
- Les réponses sont enregistrées comme en séance (XP du niveau, révision espacée) ; `stats.examen` garde le nombre
  d'examens et le meilleur score, affiché sur la carte de l'accueil.

## XP et niveaux (`js/xp.js`)

| Action | XP |
|---|---|
| Bonne réponse, niveau I | +10 |
| Bonne réponse, niveau II | +15 |
| Bonne réponse, niveau III | +20 |
| Séance sans faute (au moins 5 questions) | +20 |
| Rapidité | sans effet |

Niveaux : N1 Apprenti (0) · N2 Compagnon (200) · N3 Technicien (600) · N4 Technicien Confirmé (1 500) · N5 Expert Senior (3 000).
Les résultats par question sont gardés dans `stats.reco.elements` / `stats.calcul.elements` (base de la révision espacée et des rappels) ;
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
- [x] Audit pédagogique, P2 : « À réviser » (répétition espacée en 5 boîtes), cas de niveau III à embranchements, module Mesure d'isolement (6 scénarios), second circuit au banc (éclairage par télérupteur)
- [x] Audit 360° et corrections C1 à C6 : aiguillage sur les 10 dernières réponses, dates de série contrôlées, libellés du banc, CSP, alerte d'écriture
- [x] Lancement : première prise en main en 2 phrases, parcours en 3 blocs, mention « 100 % locales », audit ergonomique iPhone (touches ≥ 44 px, textes ≥ 12 px, clair et sombre)
- [x] Phase 2 : 8 insignes de terrain, séries de jours, tampons « Insigne obtenu » et « Niveau validé »
- [x] Phase 1 : prochaine étape guidée par domaine (lacunes), 23 fiches mémo sous les corrections et dans le Carnet
- [x] Validation par audit d'intégrité normatif et technique automatique (`outils/audit.mjs`), contenu revu en entier
- [x] Audit pédagogique, P1 : 12 cas de panne (VAT, isolement, schéma IT, sélectivité, serrures HTA…), 14 questions (CAT III / IV, lecture de schéma, composants d'armoire), 8 calculs de terrain (Iz corrigé, Icc en aval, seuils magnétiques, réglage Ir, isolement attendu, énergie résiduelle, sortie d'automate, glissement)
- [x] Enrichissement terrain : banc étoile-triangle (4 pannes), mégohmmètre à 1 minute avec DAR et indice de polarisation, rappels d'erreurs dans les séances, Bilan · examen blanc
- [x] Banc pour non-initié : guide « Première intervention » en 4 étapes, volets en accordéon, aides du multimètre, appareil mémorisé
- [ ] Banc : VAT faite par l'élève, nouveaux circuits (inverseur, différentiel)

## Renommer le dépôt (facultatif)

Le dépôt GitHub s'appelle encore `Dojo-bts`, donc l'adresse reste `…/Dojo-bts/`. Pour la changer : GitHub › Settings › General › Repository name.
Les données restent sur le téléphone (même domaine `github.io`), mais l'app installée pointe vers l'ancienne adresse :
exporter la sauvegarde, supprimer l'app de l'écran d'accueil, l'installer depuis la nouvelle adresse, puis importer la sauvegarde.
