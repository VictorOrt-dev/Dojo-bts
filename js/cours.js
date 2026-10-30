// Module Cours : liste des fiches par module + affichage d'une fiche.
// Le contenu vient de data/fiches.json ; ce fichier ne fait que l'afficher.

import * as stockage from './storage.js';
import { esc, normaliser, plurielS } from './util.js';

// Le champ "module" de chaque fiche doit correspondre exactement à un "nom" ci-dessous.
export const MODULES = [
  { nom: 'Électrotechnique', icone: '⚡', cle: 'elec' },
  { nom: 'Automatismes', icone: '⚙️', cle: 'auto' },
  { nom: 'Réseaux', icone: '🌐', cle: 'reseau' },
  { nom: 'Sécurité', icone: '🦺', cle: 'secu' }
];

function moduleDe(nom) {
  return MODULES.find(m => m.nom === nom) ?? { nom, icone: '📄', cle: 'autre' };
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

// ---------- Liste des fiches ----------

export async function renderCours({ vue, definirTitre, params }) {
  definirTitre('Cours & fiches');
  const fiches = await chargerFiches();
  const moduleActif = params.get('m') ?? '';
  const recherche = params.get('q') ?? '';

  const puce = (nom, libelle, nb) => {
    const href = nom ? `#/cours?m=${encodeURIComponent(nom)}` : '#/cours';
    const actif = nom === moduleActif ? ' aria-current="true"' : '';
    return `<a class="puce" href="${href}"${actif}>${esc(libelle)} <small>${nb}</small></a>`;
  };

  vue.innerHTML = `
    <div class="puces">
      ${puce('', 'Tous', fiches.length)}
      ${MODULES.map(m => puce(m.nom, `${m.icone} ${m.nom}`, fiches.filter(f => f.module === m.nom).length)).join('')}
    </div>
    <input id="recherche" class="recherche" type="search" enterkeyhint="search"
           placeholder="Rechercher : cos φ, VAT, masque…" value="${esc(recherche)}">
    <div id="liste" class="liste"></div>`;

  const champ = vue.querySelector('#recherche');
  const afficherListe = () => {
    const q = normaliser(champ.value.trim());
    const vues = stockage.lire().fichesVues;
    const resultat = fiches.filter(f =>
      (!moduleActif || f.module === moduleActif) && (!q || texteRecherche(f).includes(q)));

    vue.querySelector('#liste').innerHTML = resultat.length
      ? resultat.map(f => carteFiche(f, Boolean(vues[f.id]))).join('')
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

function carteFiche(fiche, lue) {
  const mod = moduleDe(fiche.module);
  return `
    <a class="carte carte-fiche mod-${mod.cle}" href="#/fiche/${encodeURIComponent(fiche.id)}">
      <div class="carte-haut">
        <span class="badge">${mod.icone} ${esc(mod.nom)}</span>
        ${lue ? '<span class="lue">✓ lue</span>' : ''}
      </div>
      <h2>${esc(fiche.titre)}</h2>
      <p class="meta">${plurielS(fiche.definitions.length, 'définition')} · ${plurielS(fiche.formules.length, 'formule')} · ${plurielS(fiche.pieges.length, 'piège')}</p>
    </a>`;
}

// ---------- Détail d'une fiche ----------

export async function renderFiche({ vue, definirTitre, id }) {
  const fiches = await chargerFiches();
  const fiche = fiches.find(f => f.id === id);
  if (!fiche) {
    definirTitre('Fiche introuvable');
    vue.innerHTML = `<p class="vide">Cette fiche n'existe pas (ou plus).</p><p><a class="btn" href="#/cours">Retour aux cours</a></p>`;
    return;
  }

  const mod = moduleDe(fiche.module);
  definirTitre(mod.nom);
  stockage.modifier(e => { e.fichesVues[fiche.id] = Date.now(); });

  // Fiches précédente / suivante dans le même module.
  const memeModule = fiches.filter(f => f.module === fiche.module);
  const i = memeModule.indexOf(fiche);
  const prec = memeModule[i - 1];
  const suiv = memeModule[i + 1];

  vue.innerHTML = `
    <article class="fiche mod-${mod.cle}">
      <p class="badge">${mod.icone} ${esc(mod.nom)}</p>
      <h2 class="fiche-titre">${esc(fiche.titre)}</h2>
      ${fiche.verifie ? '' : '<p class="a-verifier">⚠️ Contenu pas encore vérifié avec ton cours. Relis-le avec ton support avant de le réviser, puis passe <code>"verifie": true</code> dans fiches.json.</p>'}

      <section class="bloc bloc-def">
        <h3>📖 Définitions clés</h3>
        <dl>
          ${fiche.definitions.map(d => `<dt>${esc(d.terme)}</dt><dd>${esc(d.def)}</dd>`).join('')}
        </dl>
      </section>

      <section class="bloc bloc-formules">
        <h3>🧮 Formules &amp; lois</h3>
        ${fiche.formules.map(f => `
          <div class="formule">
            <p class="formule-nom">${esc(f.nom)}</p>
            <p class="formule-expr">${esc(f.expr)}</p>
            <p class="formule-unites">${esc(f.unites)}</p>
          </div>`).join('')}
      </section>

      <section class="bloc bloc-pieges">
        <h3>⚠️ Pièges de terrain</h3>
        <ul>
          ${fiche.pieges.map(p => `<li>${esc(p)}</li>`).join('')}
        </ul>
      </section>
    </article>

    <nav class="fiche-nav">
      ${prec ? `<a class="btn" href="#/fiche/${encodeURIComponent(prec.id)}">‹ ${esc(prec.titre)}</a>` : '<span></span>'}
      ${suiv ? `<a class="btn" href="#/fiche/${encodeURIComponent(suiv.id)}">${esc(suiv.titre)} ›</a>` : '<span></span>'}
    </nav>`;
}
