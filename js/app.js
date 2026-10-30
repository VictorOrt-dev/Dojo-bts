// Point d'entrée : routeur par hash (#/cours, #/fiche/<id>, #/dojo, #/profil).
// Chaque écran est une fonction render*(ctx) qui remplit l'élément #vue.

import { renderCours, renderFiche } from './cours.js';
import { renderProfil } from './profil.js';
import * as stockage from './storage.js';
import { esc } from './util.js';

const vue = document.getElementById('vue');
const titre = document.getElementById('titre');
const boutonRetour = document.getElementById('retour');
let navigationInterne = false; // vrai dès qu'on a navigué dans l'app : "Retour" peut alors utiliser l'historique

function definirTitre(texte) {
  titre.textContent = texte;
  document.title = `${texte} · Dojo BTS`;
}

function lireHash() {
  const [chemin, requete = ''] = (location.hash.slice(2) || 'cours').split('?');
  const [page, id] = chemin.split('/');
  return { page, id: id && decodeURIComponent(id), params: new URLSearchParams(requete) };
}

function renderDojo({ definirTitre }) {
  definirTitre('Le Dojo');
  vue.innerHTML = `
    <section class="carte">
      <h2>🥋 Bientôt : étape 2</h2>
      <p class="discret">Les modes d'entraînement arrivent ici :</p>
      <ul>
        <li>👁️ Reconnaissance visuelle (composants et symboles IEC)</li>
        <li>🧮 Calculs Flash chronométrés</li>
        <li>🔧 Cas de panne industrielle (étape 3)</li>
      </ul>
    </section>`;
}

function renderErreur(err) {
  definirTitre('Oups');
  const fichierLocal = location.protocol === 'file:';
  vue.innerHTML = `
    <section class="carte">
      <p class="alerte">Impossible d'afficher cette page.</p>
      <p class="discret">${esc(err.message)}</p>
      ${fichierLocal ? '<p>Le fichier a été ouvert directement. Lance un petit serveur : <code>python3 -m http.server</code>, puis ouvre <code>http://localhost:8000</code>.</p>' : ''}
      <button class="btn" type="button" onclick="location.reload()">Réessayer</button>
    </section>`;
  console.error(err);
}

async function router() {
  const { page, id, params } = lireHash();
  const onglet = page === 'fiche' ? 'cours' : page;
  document.querySelectorAll('.tabbar a').forEach(a =>
    a.toggleAttribute('aria-current', a.dataset.onglet === onglet));
  boutonRetour.hidden = page !== 'fiche';
  window.scrollTo(0, 0);

  const ctx = { vue, definirTitre, id, params };
  try {
    switch (page) {
      case 'cours': await renderCours(ctx); break;
      case 'fiche': await renderFiche(ctx); break;
      case 'dojo': renderDojo(ctx); break;
      case 'profil': await renderProfil(ctx); break;
      default: location.replace('#/cours');
    }
  } catch (err) {
    renderErreur(err);
  }
}

boutonRetour.addEventListener('click', () => {
  if (navigationInterne) history.back();
  else location.assign('#/cours');
});

window.addEventListener('hashchange', () => {
  navigationInterne = true;
  router();
});

stockage.demanderPersistance();
router();
