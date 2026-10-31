// Module Cours : liste des fiches par module + affichage d'une fiche.
// Le contenu vient de data/fiches.json ; ce fichier ne fait que l'afficher.

import * as stockage from './storage.js';
import { frontispice, titreSection, deuxChiffres, typo } from './mise-en-page.js';
import { fil } from './atelier.js';
import { esc, normaliser } from './util.js';

// Le champ "module" de chaque fiche doit correspondre exactement à un "nom" ci-dessous.
// "code" = repère court ; chaque module prend la couleur d'une gaine de conducteur
// (brun = phase, gris = phase, bleu = neutre, vert-jaune = terre de protection pour la Sécurité).
export const MODULES = [
  { nom: 'Électrotechnique', code: 'ELT' },
  { nom: 'Automatismes', code: 'AUT' },
  { nom: 'Réseaux', code: 'RES' },
  { nom: 'Sécurité', code: 'SEC' }
];

function moduleDe(nom) {
  return MODULES.find(m => m.nom === nom) ?? { nom, code: 'DIV' };
}


let promesseFiches = null;

export function chargerFiches() {
  promesseFiches ??= fetch('data/fiches.json')
    .then(rep => {
      if (!rep.ok) throw new Error(`data/fiches.json introuvable (HTTP ${rep.status})`);
      return rep.json();
    })
    .catch(err => {
      promesseFiches = null; // permet de réessayer au prochain affichage
      throw err;
    });
  return promesseFiches;
}

function texteRecherche(fiche) {
  return normaliser([
    fiche.titre,
    fiche.module,
    ...fiche.definitions.flatMap(d => [d.terme, d.def]),
    ...fiche.formules.flatMap(f => [f.nom, f.expr, f.unites]),
    ...fiche.pieges
  ].join(' '));
}

// ---------- Sommaire des fiches ----------

const gaine = code => `<span class="gaine gaine-${code}" aria-hidden="true"></span>`;

export async function renderCours({ vue, definirTitre, params }) {
  definirTitre('Cours');
  const fiches = await chargerFiches();
  const moduleActif = params.get('m') ?? '';
  const recherche = params.get('q') ?? '';
  const vues = stockage.lire().fichesVues;
  const nbLues = fiches.filter(f => vues[f.id]).length;

  const filtre = (mod, libelle, nb) => {
    const href = mod ? `#/cours?m=${encodeURIComponent(mod.nom)}` : '#/cours';
    const actif = (mod?.nom ?? '') === moduleActif ? ' aria-current="true"' : '';
    return `<a class="filtre" href="${href}"${actif}>${mod ? gaine(mod.code) : ''}${esc(libelle)}<sup>${nb}</sup></a>`;
  };

  vue.innerHTML = `
    ${frontispice({
      surtitre: `${deuxChiffres(nbLues)} lues sur ${deuxChiffres(fiches.length)}`,
      titre: 'Les fiches',
      italique: 'de révision'
    })}
    <nav class="filtres" aria-label="Modules">
      ${filtre(null, 'Toutes', fiches.length)}
      ${MODULES.map(m => filtre(m, m.nom, fiches.filter(f => f.module === m.nom).length)).join('')}
    </nav>
    <input id="recherche" class="recherche" type="search" enterkeyhint="search"
           placeholder="cos φ, VAT, masque…" aria-label="Rechercher dans les fiches" value="${esc(recherche)}">
    <div id="liste"></div>`;

  const champ = vue.querySelector('#recherche');
  const afficherListe = () => {
    const q = normaliser(champ.value.trim());
    const resultat = fiches.filter(f =>
      (!moduleActif || f.module === moduleActif) && (!q || texteRecherche(f).includes(q)));

    vue.querySelector('#liste').innerHTML = resultat.length
      ? resultat.map(f => ligneFiche(f, Boolean(vues[f.id]))).join('')
      : `<p class="vide">Aucune fiche${q ? ' pour cette recherche' : ' dans ce module pour l’instant'}.</p>`;
  };

  champ.addEventListener('input', () => {
    // Met la recherche dans l'URL sans relancer le routeur (garde le focus du clavier).
    const p = new URLSearchParams();
    if (moduleActif) p.set('m', moduleActif);
    if (champ.value) p.set('q', champ.value);
    history.replaceState(null, '', `#/cours${p.size ? '?' + p : ''}`);
    afficherListe();
  });

  afficherListe();
}

function ligneFiche(fiche, lue) {
  const mod = moduleDe(fiche.module);
  return `
    <a class="ligne ligne-fiche" href="#/fiche/${encodeURIComponent(fiche.id)}">
      <div>
        <p class="ligne-meta">${gaine(mod.code)}${esc(mod.nom)}</p>
        <h2 class="ligne-titre">${esc(typo(fiche.titre))}</h2>
      </div>
      <span class="ligne-fin">${lue ? '<span class="etat-lu">Lue</span>' : 'À lire'}</span>
    </a>`;
}

// ---------- Fiche ----------

export async function renderFiche({ vue, definirTitre, id }) {
  const fiches = await chargerFiches();
  const fiche = fiches.find(f => f.id === id);
  if (!fiche) {
    definirTitre('Fiche introuvable');
    vue.innerHTML = `
      ${frontispice({ surtitre: 'Erreur de renvoi', titre: 'Fiche', italique: 'introuvable' })}
      <p class="vide">Cette fiche n'existe pas (ou plus).</p>
      <a class="btn pousse-bas" href="#/cours">Retour aux fiches</a>`;
    return;
  }

  const mod = moduleDe(fiche.module);
  const numero = fiches.indexOf(fiche) + 1;
  definirTitre(`Fiche ${deuxChiffres(numero)}`);
  stockage.modifier(e => { e.fichesVues[fiche.id] = Date.now(); });

  // Fiches précédente / suivante dans le même module.
  const memeModule = fiches.filter(f => f.module === fiche.module);
  const i = memeModule.indexOf(fiche);
  const prec = memeModule[i - 1];
  const suiv = memeModule[i + 1];
  const renvoi = (f, sens) => f
    ? `<a href="#/fiche/${encodeURIComponent(f.id)}"><p class="surtitre">${sens === 'prec' ? '← Précédente' : 'Suivante →'}</p><p class="fiche-nav-titre">${esc(typo(f.titre))}</p></a>`
    : '<span></span>';

  vue.innerHTML = `
    <article class="fiche">
      <header class="frontispice">
        <p class="fiche-module">${gaine(mod.code)}${esc(mod.nom)}</p>
        <h2 class="titre-chapitre">${esc(typo(fiche.titre))}</h2>
      </header>
      ${fiche.verifie ? '' : '<p class="note-marge">Contenu pas encore vérifié. Relis-le avec ton cours, puis passe <code>"verifie": true</code> dans fiches.json.</p>'}

      <section>
        ${titreSection('01', 'Définitions clés')}
        <dl>
          ${fiche.definitions.map(d => `<dt>${esc(typo(d.terme))}</dt><dd>${esc(typo(d.def))}</dd>`).join('')}
        </dl>
      </section>

      ${fil()}
      <section>
        ${titreSection('02', 'Formules & lois')}
        <div class="formules">
          ${fiche.formules.map(f => `
            <div class="formule">
              <p class="formule-nom">${esc(f.nom)}</p>
              <p class="formule-expr">${esc(f.expr)}</p>
              <p class="formule-unites">${esc(typo(f.unites))}</p>
            </div>`).join('')}
        </div>
      </section>

      ${fil()}
      <section class="bloc-pieges">
        ${titreSection('03', 'Pièges de terrain')}
        <ol class="pieges">
          ${fiche.pieges.map(p => `<li><span>${esc(typo(p))}</span></li>`).join('')}
        </ol>
      </section>
    </article>

    <nav class="fiche-nav" aria-label="Fiches du même module">${renvoi(prec, 'prec')}${renvoi(suiv, 'suiv')}</nav>`;
}
