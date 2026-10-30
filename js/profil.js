// Écran Profil : niveau, progression, affichage, sauvegarde (export / import), remise à zéro.

import * as stockage from './storage.js';
import { chargerFiches } from './cours.js';
import { carteNiveau, TAILLE_SESSION, deuxChiffres } from './dojo.js';
import { statsMode } from './xp.js';
import { themeActuel, changerTheme, appliquerTheme } from './theme.js';
import { ICONES } from './icones.js';
import { esc, plurielS } from './util.js';

const JOUR = 24 * 60 * 60 * 1000;

function etatSauvegarde(ts) {
  if (!ts) return { led: 'jaune', texte: 'Aucune sauvegarde exportée' };
  const jours = Math.floor((Date.now() - ts) / JOUR);
  const texte = jours === 0 ? "Dernière sauvegarde : aujourd'hui" : `Dernière sauvegarde : il y a ${plurielS(jours, 'jour')}`;
  return { led: jours >= 7 ? 'jaune' : 'vert', texte };
}

function ligneStats(libelle, mode) {
  const s = statsMode(mode);
  const valeur = s.sessions ? `REC ${deuxChiffres(s.meilleurScore)}/${TAILLE_SESSION} · ${s.sessions} SESS.` : '—';
  return `<li><span>${libelle}</span><span class="mono">${valeur}</span></li>`;
}

const ligneEtat = (led, texte) => `<p class="ligne-etat"><span class="led led-${led}"></span><span>${texte}</span></p>`;

function estInstallee() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export async function renderProfil({ vue, definirTitre }) {
  definirTitre('Profil');
  const etat = stockage.lire();
  const fiches = await chargerFiches().catch(() => []);
  const nbLues = fiches.filter(f => etat.fichesVues[f.id]).length;
  const persistant = await stockage.estPersistant();
  const sauvegarde = etatSauvegarde(etat.derniereSauvegarde);
  const theme = themeActuel();

  vue.innerHTML = `
    ${stockage.disponible() ? '' : `<section class="carte">${ligneEtat('rouge', 'Stockage du navigateur bloqué (navigation privée ?). Rien ne sera enregistré.')}</section>`}

    ${carteNiveau()}

    <section class="carte">
      <p class="panneau-titre">Progression</p>
      <div class="compteur"><span>Fiches lues</span><span class="mono">${deuxChiffres(nbLues)}/${deuxChiffres(fiches.length)}</span></div>
      <div class="bargraphe"><div class="bargraphe-remplissage" style="width: ${fiches.length ? Math.round(nbLues / fiches.length * 100) : 0}%"></div></div>
      <ul class="stats">
        ${ligneStats('Reconnaissance', 'reco')}
        ${ligneStats('Calculs Flash', 'calcul')}
      </ul>
    </section>

    <section class="carte">
      <p class="panneau-titre">Affichage</p>
      <div class="selecteur" role="group" aria-label="Thème d'affichage">
        <button type="button" data-theme="nuit" aria-pressed="${theme === 'nuit'}">Nuit</button>
        <button type="button" data-theme="jour" aria-pressed="${theme === 'jour'}">Plein jour</button>
      </div>
      <p class="discret petit espace">Plein jour : contraste renforcé pour l'atelier ou l'extérieur.</p>
    </section>

    <section class="carte sauvegarde">
      <p class="panneau-titre">Sauvegarde</p>
      ${ligneEtat(sauvegarde.led, sauvegarde.texte)}
      <p class="discret petit espace">Tes données restent sur ce téléphone. Exporte un fichier régulièrement (Fichiers, iCloud, Drive ou mail).</p>
      <div class="actions">
        <button id="btn-export" class="btn principal" type="button">${ICONES.exporter}Exporter</button>
        <label class="btn">${ICONES.importer}Importer
          <input id="fichier-import" type="file" accept="application/json,.json" hidden>
        </label>
      </div>
      <p id="message" class="message" role="status"></p>
    </section>

    <section class="carte">
      <p class="panneau-titre">Appareil</p>
      ${estInstallee()
        ? ligneEtat('vert', 'App installée sur l’écran d’accueil')
        : ligneEtat('jaune', 'App non installée : sur iPhone, Partager › « Sur l’écran d’accueil ». Sinon Safari peut effacer tes données après 7 jours sans visite.')}
      ${persistant
        ? ligneEtat('vert', 'Stockage protégé par le navigateur')
        : ligneEtat('jaune', 'Stockage non garanti par le navigateur : l’export reste ta vraie sauvegarde.')}
    </section>

    <section class="carte">
      <p class="panneau-titre">Zone dangereuse</p>
      <button id="btn-effacer" class="btn danger plein" type="button">Tout effacer</button>
    </section>`;

  const afficher = (texte, led) => {
    vue.querySelector('#message').innerHTML = ligneEtat(led, esc(texte));
  };

  vue.querySelectorAll('.selecteur button').forEach(b => b.addEventListener('click', () => {
    changerTheme(b.dataset.theme);
    vue.querySelectorAll('.selecteur button').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));

  vue.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      if (await stockage.exporter()) renderProfil({ vue, definirTitre });
    } catch (err) {
      afficher(`Export impossible : ${err.message}`, 'rouge');
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
      afficher('Sauvegarde importée.', 'vert');
    } catch (err) {
      afficher(err.message, 'rouge');
    }
  });

  vue.querySelector('#btn-effacer').addEventListener('click', () => {
    if (!confirm('Effacer définitivement ta progression ? Pense à exporter avant.')) return;
    stockage.toutEffacer();
    appliquerTheme();
    renderProfil({ vue, definirTitre });
  });
}
