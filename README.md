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
js/app.js               routeur par hash : #/cours, #/fiche/<id>, #/dojo, #/profil
js/storage.js           SEUL fichier qui touche localStorage (clé "dojo:v1")
js/cours.js             liste + détail des fiches
js/profil.js            progression, export/import, remise à zéro
js/util.js              esc(), normaliser(), plurielS()
data/fiches.json        CONTENU des fiches (aucun code)
img/                    icônes ; plus tard photos et symboles du Dojo
```

## Conventions (à donner à l'IA à chaque session)

- **Pas de framework, pas de npm, pas de build.** Modules ES natifs (`import`/`export`), chemins relatifs.
- **Contenu ≠ code.** Le contenu pédagogique va dans `data/*.json`. Ajouter une fiche = modifier uniquement `fiches.json`.
- **Stockage.** Seul `storage.js` lit/écrit `localStorage`, via `lire()` et `modifier(e => …)`. Nouveau champ = l'ajouter dans `etatParDefaut()`. Changement de format = incrémenter `VERSION` et compléter `migrer()`.
- **Sécurité d'affichage.** Tout texte injecté dans `innerHTML` passe par `esc()`.
- **Un écran = une fonction `render…({ vue, definirTitre, id, params })`**, branchée dans le `switch` de `app.js`.
- **Langue.** Interface en français, tutoiement. Noms de variables et fonctions en français.
- **Normes.** Repérage : _à choisir et noter ici_ (IEC 81346 `-QA1`, `-KF1`… ou usage français `Q1`, `KM1`…). Symboles : IEC 60617. Unités SI, virgule décimale dans les textes.
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

## Feuille de route

- [x] Étape 1 : socle, module Cours, sauvegarde export/import, installable
- [ ] Étape 2 : Dojo — Reconnaissance visuelle (QCM), Calculs Flash, XP & niveaux
- [ ] Étape 3 : Cas de panne (arbre de décision), mode hors-ligne (service worker)
