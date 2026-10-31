// Point d'entrée : routeur par hash.
//   #/dojo (accueil)  #/dojo/reco  #/dojo/calcul  #/cours  #/fiche/<id>  #/profil
// Chaque écran est une fonction render*(ctx) qui remplit l'élément #vue.

import { renderCours, renderFiche } from './cours.js';
import { renderProfil } from './profil.js';
import { renderDojo } from './dojo.js';
import { renderReco } from './quiz.js';
import { renderCalcul } from './calcul.js';
import { appliquerTheme } from './theme.js';
import * as stockage from './storage.js';
import { esc } from './util.js';

const vue = document.getElementById('vue');
const titre = document.getElementById('titre');
const boutonRetour = document.getElementById('retour');
let navigationInterne = false; // vrai dès qu'on a navigué dans l'app : "Retour" peut alors utiliser l'historique
let nettoyages = [];           // fonctions à appeler en quittant l'écran courant (ex. arrêter un chrono)

function definirTitre(texte) {
  titre.textContent = texte;
  document.title = `${texte} · Dojo BTS`;
}

function lireHash() {
  const [chemin, requete = ''] = (location.hash.slice(2) || 'dojo').split('?');
  const [page, id] = chemin.split('/');
  return { page, id: id && decodeURIComponent(id), params: new URLSearchParams(requete) };
}

// Page vers laquelle revient le bouton "Retour" (null = pas de bouton).
function pageParente({ page, id }) {
  if (page === 'fiche') return '#/cours';
  if (page === 'dojo' && id) return '#/dojo';
  return null;
}

function renderErreur(err) {
  definirTitre('Oups');
  const fichierLocal = location.protocol === 'file:';
  vue.innerHTML = `
    <header class="frontispice">
      <p class="surtitre">Erreur</p>
      <h2 class="titre-chapitre">Page <em>illisible</em></h2>
    </header>
    <p class="note-marge">${esc(err.message)}</p>
    ${fichierLocal ? '<p class="espace">Le fichier a été ouvert directement. Lance un petit serveur : <code>python3 -m http.server</code>, puis ouvre <code>http://localhost:8000</code>.</p>' : ''}
    <div class="actions"><button class="btn principal" type="button" onclick="location.reload()">Réessayer</button></div>`;
  console.error(err);
}

async function router() {
  nettoyages.forEach(f => f());
  nettoyages = [];

  const route = lireHash();
  const { page, id, params } = route;
  const onglet = page === 'fiche' ? 'cours' : page;
  document.querySelectorAll('.tabbar a').forEach(a =>
    a.toggleAttribute('aria-current', a.dataset.onglet === onglet));
  boutonRetour.hidden = !pageParente(route);
  window.scrollTo(0, 0);

  const ctx = { vue, definirTitre, id, params, auNettoyage: f => nettoyages.push(f) };
  try {
    switch (page) {
      case 'cours': await renderCours(ctx); break;
      case 'fiche': await renderFiche(ctx); break;
      case 'dojo':
        if (!id) renderDojo(ctx);
        else if (id === 'reco') await renderReco(ctx);
        else if (id === 'calcul') renderCalcul(ctx);
        else location.replace('#/dojo');
        break;
      case 'profil': await renderProfil(ctx); break;
      default: location.replace('#/dojo');
    }
  } catch (err) {
    renderErreur(err);
  }
}

boutonRetour.addEventListener('click', () => {
  if (navigationInterne) history.back();
  else location.assign(pageParente(lireHash()) ?? '#/dojo');
});

window.addEventListener('hashchange', () => {
  navigationInterne = true;
  router();
});

appliquerTheme();
stockage.demanderPersistance();
router();
