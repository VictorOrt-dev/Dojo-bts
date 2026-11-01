# Audit UX et terrain : Elec learning (DA « Graphite »)

| | |
|---|---|
| **Version auditée** | `main`, commit `1321ee9` (DA Graphite en ligne) |
| **Date** | 1er novembre 2026 |
| **Méthode** | Parcours joués dans Chromium au format iPhone 13 (390 × 844 px), stockage vide (premier lancement) ; positions des actions mesurées en pixels ; texte compté mot à mot après une erreur ; tailles de police relevées sur 6 écrans ; 89 cibles tactiles mesurées ; contrastes calculés (WCAG) ; contenu analysé fichier par fichier. |
| **Limite** | Le comportement en réseau faible n'a pas pu être mesuré de façon fiable dans l'environnement de test : le chiffre donné en 2.4 est une **estimation calculée** d'après le code, signalée comme telle. |

---

## Verdict en une phrase

**Le contenu est celui d'un outil de compagnon ; l'emballage est celui d'une boîte à outils posée en vrac.** Un technicien confirmé s'y retrouve et y apprend des choses ; un débutant total est lâché dès l'accueil sur le mode le plus difficile, sans guide ni progression.

| Axe | Note | En une ligne |
|---|---|---|
| 1. Prise en main d'un débutant | **3 / 10** | Aucun accueil, aucun parcours, tout est ouvert, et le premier mode proposé est le plus dur. |
| 2. Parcours et zone du pouce | **6 / 10** | 1 à 2 touchers pour démarrer, aucune cible sous 44 px ; mais le banc cache ses instruments sous la ligne de flottaison, et une correction fait 1,3 écran. |
| 3. DA Graphite en atelier | **7 / 10** | Contrastes conformes partout ; mais 74 éléments de texte à 10-11 px, et le thème clair est caché dans le Carnet. |
| 4. Contenu métier | **8 / 10** | Crédible et rare (tension fantôme, fusible mesuré en place, DGPT2, barrette de terre) ; 0 élément sur 60 validé par un formateur, un seul circuit au banc. |

---

## 1. Prise en main et onboarding

### Clarté pour un novice : non

Mesures au premier lancement (stockage vide) :

- **Aucun texte d'accueil, aucun « par où commencer ».** L'écran affiche 96 mots : la date, « Bonjour, apprenti. », la carte de rang à 0 XP et quatre modes.
- **Le premier mode proposé est le plus difficile.** La carte A ouvre le **Banc de mesure**. Un débutant qui touche la première carte tombe sur un écran de 1,7 hauteur d'iPhone où l'on parle de LoZ, de haute impédance, de pointe COM, de consignation et de relais F2. Aucune explication de l'instrument, aucune démonstration, aucune première mesure guidée.
- **Le vocabulaire n'est jamais introduit.** « LoZ », « VAT », « TBT·CC », « HTA », « 95-96 », « Ra × IΔn » apparaissent sans glossaire ni infobulle. Un apprenti de première année décroche au deuxième écran.
- La carte de rang (« Prochain rang : 200 XP ») explique le jeu, pas le métier : rien ne dit **quoi** travailler en premier.

### Le piège de la submersion : oui, en plein dedans

Dès la première seconde, tout est accessible : 46 planches, 24 types de calcul, 14 cas de panne **dont 5 de niveau III**, le banc et les 5 domaines, HTA compris. L'app ne fait **aucun choix pour l'utilisateur**. Pour un technicien, c'est un bon outil de libre-service ; pour un débutant, c'est une bibliothèque sans bibliothécaire.

### Déblocage progressif : absent

| Ce qui existe | Ce qui manque |
|---|---|
| Choix libre du niveau (I, II, III) dans chaque mode | Aucun verrou : un débutant peut ouvrir le cas « poste HTA, DGPT2 » en premier |
| Après au moins 80 % de bonnes réponses, le rapport *propose* le niveau suivant | Les rangs (Apprenti → Expert Senior) **ne débloquent rien** : l'XP est décorative |
| Les statistiques par question sont enregistrées | Elles ne servent à rien : pas de révision des erreurs, pas de recommandation |

**Recommandation de Product Owner : un déblocage souple, jamais un mur.** Verrouiller durement le niveau III ou la HTA ferait fuir le public le plus précieux, les techniciens confirmés. La bonne mécanique :

- au premier lancement, **« Où en es-tu ? »** : Débutant / En formation / Technicien confirmé ;
- **pour un débutant** : les niveaux II et III et la HTA sont affichés **« conseillés après… »** (par exemple « après 80 % au niveau I de ce domaine »), mais restent ouvrables d'un toucher avec un avertissement ;
- **pour un confirmé** : tout est ouvert, avec un **test de positionnement** de 10 questions qui valide d'office les fondations.

---

## 2. Parcours utilisateurs (mesurés sur iPhone 13)

### Accès instantané : bon

| Démarrer… | Touchers depuis l'accueil |
|---|---|
| Le banc de mesure | **1** (onglet Banc) |
| Une séance de calculs | **2** (carte Calculs → niveau) |
| Un cas de panne | **2** (carte → cas) |
| Une séance de reconnaissance | **2 + défilement** : la carte D commence à 759 px, sous la barre d'onglets |

Aucun écran intermédiaire inutile. Point faible : on ne peut pas **reprendre là où on s'était arrêté**. Il n'y a pas de bouton « Continuer » et les séances ne sont pas conservées : quitter l'app pour répondre à un appel fait perdre la séance en cours et l'intervention au banc.

### Zone du pouce : bonne partout, sauf au banc

| Écran | Action critique | Position mesurée |
|---|---|---|
| Calculs | touche **Valider** (haute, sur 3 rangées) | 469 px depuis le haut : **sous le pouce** ✔ |
| Calculs | première rangée du pavé (7, 8, 9) | 407 px : atteignable ✔ |
| Reconnaissance | les 4 réponses | 466 à 682 px : **sous le pouce** ✔ |
| Toutes les corrections | « Suivant », collé au-dessus des onglets | toujours au même endroit ✔ |
| **Banc** | sélecteur V~ / LoZ / Ω | **901 px : hors de l'écran** ✘ |
| **Banc** | bouton **Mesurer** | **1 235 px : hors de l'écran** ✘ |

**Le banc, le mode phare, est le seul où il faut défiler avant chaque geste.** Le bon d'intervention, le tableau de bord, les 5 voyants d'état et le schéma occupent tout le premier écran ; les instruments commencent à 831 px.

**Cibles tactiles :** 89 cibles mesurées sur 8 écrans, **aucune sous 44 px**. Les 7 écarts relevés lors du premier audit (filtres et onglets du banc) sont corrigés.

### Densité après une erreur : trop lourde

| Correction d'une mauvaise réponse | Mots | Blocs | Hauteur |
|---|---|---|---|
| Reconnaissance (niveau II) | **198** | 6 | **1,4 écran** |
| Calcul (niveau II) | **206** | 5 | **1,3 écran** |

En moyenne, une question de Reconnaissance affiche après une erreur : 19 mots de « pourquoi pas », 40 mots d'explication, 38 mots de risque, puis le repérage, le rôle, la norme et l'avertissement « pas encore validé ». **Tout est déplié d'un coup.** Le bloc le plus important, « Le risque, en vrai », tombe sous la ligne de flottaison : sur le terrain, il ne sera pas lu.

### Hors connexion

- **Hors ligne franc** (mode avion, zone blanche) : l'app s'ouvre et tout fonctionne, images et données comprises. Vérifié à chaque mise en ligne par le test G.
- **Toute première ouverture sans réseau** : impossible, l'app n'est pas encore en cache. C'est inévitable ; il faut juste le dire à l'installation.
- **Réseau faible** (barres affichées, réseau inutilisable : le cas des sous-sols et des locaux techniques) : **c'est le point noir.** Le service worker essaie d'abord le réseau et n'abandonne qu'après **3 s par fichier**. Or l'app charge ses modules par vagues : la plus longue chaîne d'imports compte **7 niveaux** (`app.js → profil.js → entrainement.js → difficulte.js → xp.js → storage.js → sauvegarde.js`). **Estimation (calculée, non mesurée) : 20 à 25 s d'écran noir avant l'affichage.** C'est exactement le moment où le technicien range son téléphone.

> **Mesure faite après coup (2 novembre).** Le serveur de test retarde désormais lui-même ses réponses, ce qui donne une mesure fiable. Avec l'ancienne stratégie, ouverture en **15,4 s** pour un réseau à 8 s par requête : moins que l'estimation, mais le constat tient. Avec la stratégie « cache d'abord » (chantier 4) : **environ 0,1 s**.

---

## 3. DA « Graphite » en atelier

### Confort visuel : contrastes conformes

| Paire (thème sombre) | Ratio | Paire (thème clair) | Ratio |
|---|---|---|---|
| texte principal / fond | 19,3 : 1 | texte principal / fond | 17,6 : 1 |
| texte secondaire / fond | 8,4 : 1 | texte secondaire / fond | 7,9 : 1 |
| texte discret / carte | 5,2 : 1 | texte discret / carte | 6,3 : 1 |
| vert « juste » / carte | 10,1 : 1 | vert « juste » / carte | 5,0 : 1 |
| rouge « faux » / carte | 6,1 : 1 | rouge « faux » / carte | 5,3 : 1 |
| bouton principal | 18,2 : 1 | bouton principal | 18,1 : 1 |

Toutes les paires atteignent **AA minimum**. Le noir profond repose les yeux en zone sombre et économise la batterie.

**Deux défauts en conditions réelles :**

- **Sous un éclairage fort** (atelier, extérieur), un thème sombre se lit mal sur écran brillant, et le thème clair est rangé dans **Carnet › Affichage**. L'app ne suit pas le réglage automatique du téléphone (sombre la nuit, clair le jour).
- **Daltonisme** (environ 8 % des hommes) : les réponses sont doublées d'un ✓ ou d'un ✕ et d'un mot (« Juste. », « Pas encore. »), c'est bien ; mais **le bornier de progression ne distingue juste et faux que par la couleur**.

### Hiérarchie et lisibilité

- **Valeurs numériques : excellentes.** Afficheur en police à chasse fixe de 42 px, unités séparées, chiffres alignés : on lit 230 V d'un coup d'œil.
- **Consignes de sécurité : bien marquées.** Bloc rayé rouge « Pourquoi c'est dangereux », pastille « Alerte sécurité », bloc « Le risque, en vrai ». Sans ambiguïté.
- **Le défaut : les micro-textes.** Sur 6 écrans, **74 éléments sont à 10-11 px**, presque tous en police à chasse fixe : repères de domaine (« TBT·CC »), badges de niveau, légendes des planches, aides de calcul (« ρ cuivre = 0,0225… »). En atelier, téléphone tenu à bout de bras, gants ou lunettes de sécurité, c'est **illisible**. Or l'aide des calculs contient des données nécessaires au calcul.

---

## 4. Contenu métier

### Crédibilité : le point fort de l'app

Un vieux compagnon reconnaîtra ses propres pièges, ce qui est rare dans une app de formation :

- **tension fantôme** sur un conducteur en l'air (91 V en haute impédance, 0 V en LoZ), calculée par le moteur du banc et non écrite à la main ;
- **fusible mesuré en place** qui affiche 2,4 kΩ au lieu de « OL » (voyant et transformateur en parallèle) ;
- **réarmer sans réfléchir** : relais 95-96 usé, cartouches aM à changer par trois, relais à réarmer après réparation ;
- **interrupteur câblé sur le neutre**, **neutre coupé au TGBT**, **barrette de terre** laissée ouverte ou mal serrée, **diode de roue libre** oubliée, **sens des prises** d'un transformateur, **DGPT2** sur gaz ;
- chaque correction rattachée à une norme : NF C 18-510, NF C 15-100, NF EN 60204-1, IEC 60947…

**Les limites, sans détour :**

1. **0 élément sur 60 validé par un formateur** (questions et cas de panne). L'app l'affiche honnêtement, mais un formateur qui voit « Contenu pas encore validé » sur chaque écran ne la recommandera pas.
2. **Un seul circuit au banc, 5 pannes.** Au bout de 5 interventions, on connaît les pannes : le mode phare ne se rejoue plus.
3. **La Reconnaissance n'est plus vraiment visuelle :** 46 questions pour 22 images ; **24 questions réutilisent une image déjà vue** comme simple illustration d'une question de texte. Les illustrations de matériel sont des dessins simplifiés : aucune photo d'armoire réelle.
4. **Des trous métier importants :** aucun exercice sur la **mesure d'isolement au mégohmmètre**, geste quotidien du dépanneur ; rien sur la **lecture de schéma** (suivre un repère d'un folio à l'autre) ni sur les **paramètres de variateur** au-delà d'un cas.

### Équilibre des domaines : exploitable, mais déséquilibré

| Domaine | Reconnaissance | Calculs | Cas | Banc |
|---|---|---|---|---|
| Triphasé & puissance | 21 | 13 | 5 | 5 pannes |
| TBT & courant continu | 15 | 4 | 3 | — |
| Sécurité & habilitations | 12 | 3 | 7 | consignation intégrée |
| Monophasé & BT | 9 | 7 | 4 | 4 pannes (commande 230 V) |
| HTA · postes | 7 | 4 | 3 | — |

Plus aucune case n'est vide, et le filtre fonctionne. Mais le **triphasé écrase le reste**, et la **Sécurité n'a que 3 calculs**, alors que c'est le domaine où une erreur tue. La HTA est volontairement mince : c'est un domaine d'expert, et c'est cohérent.

---

## 5. Plan d'action : les 4 chantiers à lancer maintenant

Par ordre de priorité, du plus rentable au plus coûteux :

### 1. Un parcours pour le débutant (onboarding + déblocage souple)
- Premier lancement : **« Où en es-tu ? »** (Débutant / En formation / Confirmé), en 3 écrans au maximum.
- En tête d'accueil, **un seul gros bouton « Ta prochaine séance »**, choisi par l'app (domaine et niveau), au-dessus des 4 modes.
- **Déblocage souple :** niveaux II et III, HTA et banc marqués « conseillé après… » pour un débutant, ouvrables d'un toucher ; **test de positionnement** pour les confirmés.
- Pour un débutant, l'ordre des modes devient **Reconnaissance → Calculs → Cas de panne → Banc**.

### 2. Le banc sous le pouce
- Bon d'intervention et schéma **repliés** après la première lecture ; tableau de bord réduit à une ligne.
- **Panneau d'instrument fixé en bas d'écran** (fonction, pointes, Mesurer, lecture) : zéro défilement entre deux mesures.
- **Première visite guidée en 3 étapes** : une mesure en V~, la même en LoZ, consigner. Le débutant comprend l'instrument avant de chercher la panne.

### 3. Une correction en deux temps, lisible en atelier
- **Visible d'emblée, environ 60 mots au maximum :** la bonne réponse, **une phrase** sur le pourquoi, et **« Le risque, en vrai »**. Tout le reste (repérage, rôle, norme, calcul posé) sous « En savoir plus ».
- **Plus aucun texte sous 12 px** ; les aides de calcul passent en taille normale.
- Thème **automatique** (suit le réglage du téléphone) par défaut ; bornier doublé d'un ✓ ou d'un ✕.

### 4. Fiabilité en sous-sol, puis contenu
- **Service worker « cache d'abord » pour l'app** (affichage immédiat depuis le cache, mise à jour en arrière-plan, bandeau « Nouvelle version disponible ») : ouverture en moins d'une seconde, même en réseau faible. **C'est un chantier court, à fort effet terrain.**
- **Reprise de séance** après une interruption (appel, verrouillage du téléphone).
- **Contenu :** campagne de validation par un formateur (0 sur 60 aujourd'hui), module **mesure d'isolement**, **deuxième circuit au banc** (démarrage étoile-triangle ou éclairage sur télérupteur), **révision des erreurs** (répétition espacée) à partir des statistiques déjà enregistrées.

---

*Mesures reproductibles avec les scripts Playwright de la session ; les chiffres de contraste sont calculés à partir des couleurs de `css/style.css`.*
