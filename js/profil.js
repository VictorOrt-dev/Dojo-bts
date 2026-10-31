// Écran Carnet (profil) : plaque de l'opérateur, progression, matière d'affichage, sauvegarde, remise à zéro.

import * as stockage from './storage.js';
import { chargerFiches } from './cours.js';
import { carteNiveau, TAILLE_SESSION } from './entrainement.js';
import { statsMode } from './xp.js';
import { themeActuel, changerTheme, appliquerTheme } from './theme.js';
import { frontispice, titreSection, ligneEtat, deuxChiffres } from './mise-en-page.js';
import { esc, plurielS } from './util.js';

const JOUR = 24 * 60 * 60 * 1000;

function etatSauvegarde(ts) {
  if (!ts) return { etat: 'attention', texte: 'Aucune sauvegarde exportée.' };
  const jours = Math.floor((Date.now() - ts) / JOUR);
  const texte = jours === 0 ? "Dernière sauvegarde : aujourd'hui." : `Dernière sauvegarde : il y a ${plurielS(jours, 'jour')}.`;
  return { etat: jours >= 7 ? 'attention' : 'ok', texte };
}

function ligneStats(libelle, mode) {
  const s = statsMode(mode);
  const valeur = s.sessions ? `Rec. ${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION} · ${s.sessions} sess.` : '—';
  return `<li><span>${libelle}</span><span class="mono">${valeur}</span></li>`;
}

function estInstallee() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export async function renderProfil({ vue, definirTitre }) {
  definirTitre('Carnet');
  const etat = stockage.lire();
  const fiches = await chargerFiches().catch(() => []);
  const nbLues = fiches.filter(f => etat.fichesVues[f.id]).length;
  const persistant = await stockage.estPersistant();
  const sauvegarde = etatSauvegarde(etat.derniereSauvegarde);
  const theme = themeActuel();

  vue.innerHTML = `
    ${frontispice({ surtitre: 'Registre personnel', titre: 'Le carnet', italique: "de l'opérateur" })}
    ${stockage.disponible() ? '' : `<p class="note-marge">Le stockage du navigateur est bloqué (navigation privée ?). Rien ne sera enregistré.</p>`}

    ${carteNiveau()}

    <section>
      ${titreSection('01', 'Progression')}
      <div class="corps">
        <div class="compteur"><span>Fiches lues</span><span class="mono">${deuxChiffres(nbLues)}/${deuxChiffres(fiches.length)}</span></div>
        <div class="regle" aria-hidden="true"><div class="regle-remplissage" style="width: ${fiches.length ? Math.round(nbLues / fiches.length * 100) : 0}%"></div></div>
        <ul class="stats">
          ${ligneStats('Reconnaissance', 'reco')}
          ${ligneStats('Calculs flash', 'calcul')}
        </ul>
      </div>
    </section>

    <section>
      ${titreSection('02', 'Matière')}
      <div class="corps">
        <div class="selecteur" role="group" aria-label="Matière d'affichage">
          <button type="button" data-theme="bakelite" aria-pressed="${theme === 'bakelite'}">Bakélite</button>
          <button type="button" data-theme="porcelaine" aria-pressed="${theme === 'porcelaine'}">Porcelaine</button>
        </div>
        <p class="discret petit espace">Bakélite : sombre, économe sur écran OLED. Porcelaine : claire, lisible en plein soleil.</p>
      </div>
    </section>

    <section class="sauvegarde">
      ${titreSection('03', 'Sauvegarde')}
      <div class="corps">
        ${ligneEtat(sauvegarde.etat, sauvegarde.texte)}
        <p class="discret petit">Tes données restent sur ce téléphone. Exporte un fichier régulièrement (Fichiers, iCloud, Drive ou mail).</p>
        <div class="actions">
          <button id="btn-export" class="btn principal" type="button">Exporter la sauvegarde</button>
          <label class="btn">Importer une sauvegarde
            <input id="fichier-import" type="file" accept="application/json,.json" hidden>
          </label>
        </div>
        <div id="message" class="message espace" role="status"></div>
      </div>
    </section>

    <section>
      ${titreSection('04', 'Appareil')}
      <div class="corps">
        ${estInstallee()
          ? ligneEtat('ok', 'App installée sur l’écran d’accueil.')
          : ligneEtat('attention', 'App non installée : sur iPhone, Partager › « Sur l’écran d’accueil ». Sinon Safari peut effacer tes données après 7 jours sans visite.')}
        ${navigator.serviceWorker?.controller
          ? ligneEtat('ok', 'Disponible hors connexion : l’app s’ouvre même sans réseau.')
          : ligneEtat('neutre', 'Mode hors connexion en préparation : il sera actif au prochain lancement.')}
        ${persistant
          ? ligneEtat('ok', 'Stockage protégé par le navigateur.')
          : ligneEtat('neutre', 'Stockage non garanti par le navigateur : l’export reste ta vraie sauvegarde.')}
      </div>
    </section>

    <section>
      ${titreSection('05', 'Remise à zéro')}
      <div class="corps">
        <button id="btn-effacer" class="btn danger" type="button">Tout effacer</button>
      </div>
    </section>`;

  const afficher = (texte, etatMessage) => {
    vue.querySelector('#message').innerHTML = ligneEtat(etatMessage, esc(texte));
  };

  vue.querySelectorAll('.selecteur button').forEach(b => b.addEventListener('click', () => {
    changerTheme(b.dataset.theme);
    vue.querySelectorAll('.selecteur button').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));

  vue.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      if (await stockage.exporter()) renderProfil({ vue, definirTitre });
    } catch (err) {
      afficher(`Export impossible : ${err.message}`, 'attention');
    }
  });

  vue.querySelector('#fichier-import').addEventListener('change', async (ev) => {
    const fichier = ev.target.files[0];
    ev.target.value = ''; // permet de réimporter le même fichier
    if (!fichier) return;
    if (!confirm('Remplacer toutes tes données actuelles par celles de ce fichier ?')) return;
    try {
      await stockage.importer(fichier);
      appliquerTheme();
      await renderProfil({ vue, definirTitre });
      afficher('Sauvegarde importée.', 'ok');
    } catch (err) {
      afficher(err.message, 'attention');
    }
  });

  vue.querySelector('#btn-effacer').addEventListener('click', () => {
    if (!confirm('Effacer définitivement ta progression ? Pense à exporter avant.')) return;
    stockage.toutEffacer();
    appliquerTheme();
    renderProfil({ vue, definirTitre });
  });
}
