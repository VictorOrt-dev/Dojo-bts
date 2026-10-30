// Écran Profil : progression + sauvegarde (export / import) + remise à zéro.

import * as stockage from './storage.js';
import { chargerFiches } from './cours.js';
import { plurielS } from './util.js';

const JOUR = 24 * 60 * 60 * 1000;

function texteDerniereSauvegarde(ts) {
  if (!ts) return { texte: 'Jamais sauvegardé', alerte: true };
  const jours = Math.floor((Date.now() - ts) / JOUR);
  const texte = jours === 0 ? "Dernière sauvegarde : aujourd'hui" : `Dernière sauvegarde : il y a ${plurielS(jours, 'jour')}`;
  return { texte, alerte: jours >= 7 };
}

function estInstallee() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export async function renderProfil({ vue, definirTitre }) {
  definirTitre('Profil & sauvegarde');
  const etat = stockage.lire();
  const fiches = await chargerFiches().catch(() => []);
  const nbLues = fiches.filter(f => etat.fichesVues[f.id]).length;
  const persistant = await stockage.estPersistant();
  const sauvegarde = texteDerniereSauvegarde(etat.derniereSauvegarde);

  vue.innerHTML = `
    ${stockage.disponible() ? '' : '<p class="alerte">❌ Le stockage du navigateur est bloqué (navigation privée ?). Rien ne sera enregistré.</p>'}

    <section class="carte">
      <h2>Progression</h2>
      <p>${plurielS(nbLues, 'fiche')} lue${nbLues > 1 ? 's' : ''} sur ${fiches.length}</p>
      <progress max="${fiches.length || 1}" value="${nbLues}"></progress>
      <p class="discret">XP et niveaux arrivent avec le Dojo (étape 2).</p>
    </section>

    <section class="carte">
      <h2>Sauvegarde</h2>
      <p class="discret">Tes données restent sur ce téléphone, dans le navigateur. Exporte un fichier de sauvegarde régulièrement (dans Fichiers, iCloud, Drive ou par mail).</p>
      <p class="${sauvegarde.alerte ? 'alerte' : 'ok'}">${sauvegarde.texte}</p>
      <div class="actions">
        <button id="btn-export" class="btn principal" type="button">⬇️ Exporter ma sauvegarde</button>
        <label class="btn">⬆️ Importer une sauvegarde
          <input id="fichier-import" type="file" accept="application/json,.json" hidden>
        </label>
      </div>
      <p id="message" class="message" role="status"></p>
    </section>

    <section class="carte">
      <h2>Appareil</h2>
      <ul class="etat-appareil">
        <li>${estInstallee() ? '✅ App installée sur l’écran d’accueil' : '⚠️ App non installée : sur iPhone, Partager › « Sur l’écran d’accueil ». Sinon Safari peut effacer tes données après 7 jours sans visite.'}</li>
        <li>${persistant ? '✅ Stockage protégé par le navigateur' : 'ℹ️ Stockage non garanti par le navigateur : l’export reste ta vraie sauvegarde.'}</li>
      </ul>
    </section>

    <section class="carte">
      <h2>Zone dangereuse</h2>
      <button id="btn-effacer" class="btn danger" type="button">Tout effacer</button>
    </section>`;

  const message = vue.querySelector('#message');
  const afficher = (texte, type = 'ok') => {
    message.textContent = texte;
    message.className = `message ${type}`;
  };

  vue.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      if (await stockage.exporter()) renderProfil({ vue, definirTitre });
    } catch (err) {
      afficher(`Export impossible : ${err.message}`, 'alerte');
    }
  });

  vue.querySelector('#fichier-import').addEventListener('change', async (ev) => {
    const fichier = ev.target.files[0];
    ev.target.value = ''; // permet de réimporter le même fichier
    if (!fichier) return;
    if (!confirm('Remplacer toutes tes données actuelles par celles de ce fichier ?')) return;
    try {
      await stockage.importer(fichier);
      await renderProfil({ vue, definirTitre });
      vue.querySelector('#message').textContent = '✅ Sauvegarde importée.';
      vue.querySelector('#message').className = 'message ok';
    } catch (err) {
      afficher(err.message, 'alerte');
    }
  });

  vue.querySelector('#btn-effacer').addEventListener('click', () => {
    if (!confirm('Effacer définitivement ta progression ? Pense à exporter avant.')) return;
    stockage.toutEffacer();
    renderProfil({ vue, definirTitre });
  });
}
