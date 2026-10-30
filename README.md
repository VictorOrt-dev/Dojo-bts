# Dojo BTS — Cours & entraînement électricien (PWA)

Application web mobile perso : fiches de révision BTS Maintenance + « Dojo » d'entraînement pratique.
HTML/CSS/JS sans framework, sans build, sans npm. Données de l'utilisateur dans `localStorage`.

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Ouvrir `index.html` directement (file://) ne marche pas : le navigateur bloque le chargement des JSON.

## Mettre en ligne (GitHub Pages)

1. Créer un dépôt GitHub (ex. `dojo-bts`) et y pousser ce dossier.
2. Dans le dépôt : Settings › Pages › Source « Deploy from a branch » › branche `main`, dossier `/ (root)`.
3. L'app est servie sur `https://<pseudo>.github.io/dojo-bts/`.
4. Sur iPhone : ouvrir l'URL dans Safari › Partager › « Sur l'écran d'accueil ».

## Structure

```
index.html              coquille : barre du haut, zone #vue, onglets
manifest.webmanifest    installation PWA (nom, icônes, couleurs)
css/style.css           tout le style ; couleurs en variables (clair/sombre auto)
js/app.js               routeur par hash : #/cours, #/fiche/<id>, #/dojo, #/dojo/reco, #/dojo/calcul, #/profil
js/storage.js           SEUL fichier qui touche localStorage (clé "dojo:v1")
js/cours.js             liste + détail des fiches
js/profil.js            progression, export/import, remise à zéro
js/dojo.js              accueil du Dojo, carte de niveau, bilan de session, toast
js/xp.js                niveaux, barème, gain d'XP, statistiques par mode
js/quiz.js              mode Reconnaissance visuelle (QCM sur image)
js/calcul.js            mode Calculs Flash (générateurs, chrono 30 s, tolérance ±2 %)
js/hasard.js            tirages aléatoires (entier, parmi, melanger)
js/util.js              esc(), normaliser(), plurielS()
data/fiches.json        CONTENU des fiches (aucun code)
data/reconnaissance.json CONTENU des questions de reconnaissance
img/reco/               visuels des questions (sym-*.svg = symboles, mat-*.svg = matériel)
```

## Conventions (à donner à l'IA à chaque session)

- **Pas de framework, pas de npm, pas de build.** Modules ES natifs (`import`/`export`), chemins relatifs.
- **Contenu ≠ code.** Le contenu pédagogique va dans `data/*.json`. Ajouter une fiche = modifier uniquement `fiches.json`.
- **Stockage.** Seul `storage.js` lit/écrit `localStorage`, via `lire()` et `modifier(e => …)`. Nouveau champ = l'ajouter dans `etatParDefaut()`. Changement de format = incrémenter `VERSION` et compléter `migrer()`.
- **Sécurité d'affichage.** Tout texte injecté dans `innerHTML` passe par `esc()`.
- **Un écran = une fonction `render…({ vue, definirTitre, id, params })`**, branchée dans le `switch` de `app.js`.
- **Langue.** Interface en français, tutoiement. Noms de variables et fonctions en français.
- **Normes.** Repérage : le Dojo indique les deux (IEC 81346 `-QA1`, `-KF1`… et usage français `Q1`, `KM1`…). _Noter ici celui de ton référentiel._ Symboles : IEC 60617. Unités SI, virgule décimale dans les textes.
- **Cache GitHub Pages (10 min).** Juste après une mise en ligne, le téléphone peut mélanger anciens et nouveaux fichiers JS. Pour une nouvelle fonction partagée, préférer un nouveau fichier plutôt qu'ajouter un export à un fichier existant.
- **Une fonctionnalité par demande à l'IA, un commit Git dès que ça marche.**

## Format d'une fiche (`data/fiches.json`)

```json
{
  "id": "elec-puissances-tri",
  "module": "Électrotechnique",
  "titre": "Puissances en triphasé équilibré",
  "verifie": false,
  "definitions": [{ "terme": "…", "def": "…" }],
  "formules": [{ "nom": "…", "expr": "P = √3 · U · I · cos φ", "unites": "P en W · U en V · I en A" }],
  "pieges": ["…"]
}
```

- `module` doit être exactement l'un de : `Électrotechnique`, `Automatismes`, `Réseaux`, `Sécurité` (liste `MODULES` dans `js/cours.js`).
- `id` : unique, en minuscules avec tirets, ne plus le changer ensuite (la progression y est attachée).
- `verifie` : passer à `true` une fois la fiche relue avec le cours. Tant que c'est `false`, l'app affiche un avertissement.
- Écrire les formules en texte Unicode : `√ · ² ³ φ η Ω ≤ ≥ → ×`.

## Format d'une question de reconnaissance (`data/reconnaissance.json`)

```json
{
  "id": "mat-contacteur",
  "type": "materiel",
  "image": "img/reco/mat-contacteur.svg",
  "question": "Quel est ce matériel ?",
  "nom": "Contacteur tripolaire",
  "reperage": "-QA en IEC 81346 ; KM en usage français…",
  "role": "Établit et coupe à distance…",
  "faux": ["Relais thermique", "Disjoncteur moteur", "Sectionneur porte-fusibles"],
  "verifie": false
}
```

- `type` : `symbole` ou `materiel`. `faux` : exactement 3 réponses, toutes différentes de `nom`.
- `image` : SVG ou photo (`.jpg`/`.webp`, max ~200 Ko). Les visuels `mat-*.svg` sont des illustrations simplifiées : les remplacer par tes propres photos d'armoire (atelier, stage) dès que possible, en gardant le même champ `image`.
- Une session tire 10 questions au hasard parmi toutes celles du fichier.

## Calculs Flash (`js/calcul.js`)

Chaque générateur de `GENERATEURS` a un `id`, un `titre` et une fonction `creer()` qui renvoie
`{ enonce, aide?, unite, reponse, solution, donnees }` (ou `{ enonce, choix, reponse, … }` pour un QCM).
Ajouter un type de calcul = ajouter un objet dans ce tableau. Une session = 10 calculs répartis entre les générateurs.

## XP et niveaux (`js/xp.js`)

| Action | XP |
|---|---|
| Bonne réponse | +10 |
| Calcul juste en moins de 10 s | +5 |
| Session parfaite 10/10 | +20 |

Niveaux : 🔰 Apprenti (0) · 🔧 Compagnon (200) · ⚡ Technicien (600) · 🛠️ Technicien Confirmé (1 500) · 🏆 Expert Senior (3 000).
Les résultats par question sont gardés dans `stats.reco.elements` / `stats.calcul.elements` (base pour une future révision des erreurs).

## Feuille de route

- [x] Étape 1 : socle, module Cours, sauvegarde export/import, installable
- [x] Étape 2 : Dojo — Reconnaissance visuelle (QCM), Calculs Flash, XP & niveaux
- [ ] Étape 3 : Cas de panne (arbre de décision), mode hors-ligne (service worker)
