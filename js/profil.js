// Écran Carnet (profil) : plaque de l'opérateur, progression, matière d'affichage, sauvegarde, remise à zéro.

import * as stockage from './storage.js';
import { carteNiveau, TAILLE_SESSION } from './entrainement.js';
import { statsMode } from './xp.js';
import { themeActuel, changerTheme, appliquerTheme } from './theme.js';
import { frontispice, titreSection, ligneEtat, deuxChiffres } from './mise-en-page.js';
import { enRevision } from './leitner.js';
import { esc, plurielS } from './util.js';
import { PROFILS } from './parcours.js';

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

// Interventions (cas de panne, banc) : nombre de cas différents réussis sans faute, et interventions faites.
function ligneInterventions(libelle, mode) {
  const s = statsMode(mode);
  const elements = Object.values(s.elements);
  const sansFaute = elements.filter(e => e.reussites > 0).length;
  const valeur = s.sessions ? `${sansFaute} sans faute · ${s.sessions} interv.` : '—';
  return `<li><span>${libelle}</span><span class="mono">${valeur}</span></li>`;
}

function estInstallee() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

// « Positionnement : 9/12 · reconnaissance II, calculs I, cas de panne I. » (ancien test : reconnaissance seule, sur 10).
function resumePositionnement(p) {
  const R = ['', 'I', 'II', 'III'];
  if (!p.niveaux) return `Positionnement : ${p.score}/10 (ancien test, reconnaissance seule)${p.niveau ? `, reconnaissance niveau ${R[p.niveau]} validée` : ''}. Refais-le pour valider aussi calculs et cas.`;
  const modes = [['reco', 'reconnaissance'], ['calcul', 'calculs'], ['panne', 'cas de panne']].map(([m, nom]) => `${nom} ${p.niveaux[m] ? R[p.niveaux[m]] : '—'}`);
  return `Positionnement : ${p.score}/12 · ${modes.join(', ')}.`;
}

// « À réviser » : erreurs enregistrées, revues à intervalles croissants (leitner.js).
function blocRevision(etat) {
  const tout = enRevision(etat);
  const dus = tout.filter(r => r.du).length;
  const texte = !tout.length ? 'À réviser : aucune erreur enregistrée.'
    : dus ? `À réviser : ${dus} élément${dus > 1 ? 's' : ''} à revoir maintenant (${tout.length} en révision).`
      : `À réviser : rien pour aujourd'hui (${tout.length} en révision, à revoir plus tard).`;
  return `<div class="revision-carnet">${ligneEtat(dus ? 'attention' : 'neutre', esc(texte))}
    ${tout.length ? `<div class="actions"><a class="btn${dus ? ' principal' : ''}" href="#/entrainement/revision">${dus ? 'Réviser mes erreurs' : 'Voir les éléments en révision'}</a></div>` : ''}</div>`;
}

export async function renderProfil({ vue, definirTitre }) {
  definirTitre('Carnet');
  const etat = stockage.lire();
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
        <ul class="stats">
          ${ligneStats('Reconnaissance', 'reco')}
          ${ligneStats('Calculs flash', 'calcul')}
          ${ligneInterventions('Cas de panne', 'panne')}
          ${ligneInterventions('Banc de mesure', 'banc')}
          ${ligneInterventions('Mesure d\'isolement', 'isolement')}
        </ul>
        ${blocRevision(etat)}
      </div>
    </section>

    <section>
      ${titreSection('02', 'Fiches mémo')}
      <div class="corps">
        <p class="discret">La formule, le schéma ou la règle à avoir en tête, en 30 secondes. Elles s'ouvrent aussi sous une correction quand tu te trompes.</p>
        <div class="actions"><a class="btn" href="#/entrainement/memos">Ouvrir les fiches mémo</a></div>
      </div>
    </section>

    <section>
      ${titreSection('03', 'Ton profil')}
      <div class="corps">
        <div class="selecteur selecteur-profil" role="group" aria-label="Profil">
          ${PROFILS.map(p => `<button type="button" data-profil="${p.id}" aria-pressed="${etat.profil === p.id}">${esc(p.court)}</button>`).join('')}
        </div>
        <p class="discret petit espace">Le profil règle l'ordre de ton parcours et de l'accueil. Rien n'est jamais verrouillé.</p>
        ${etat.positionnement
          ? ligneEtat('ok', resumePositionnement(etat.positionnement))
          : ligneEtat('neutre', 'Test de positionnement pas encore passé.')}
        <div class="actions"><a class="btn" href="#/entrainement/positionnement">${etat.positionnement ? 'Refaire le test de positionnement' : 'Passer le test de positionnement'}</a></div>
      </div>
    </section>

    <section>
      ${titreSection('04', 'Affichage')}
      <div class="corps">
        <div class="selecteur selecteur-theme" role="group" aria-label="Thème d'affichage">
          <button type="button" data-theme="auto" aria-pressed="${theme === 'auto'}">Auto</button>
          <button type="button" data-theme="bakelite" aria-pressed="${theme === 'bakelite'}">Sombre</button>
          <button type="button" data-theme="porcelaine" aria-pressed="${theme === 'porcelaine'}">Clair</button>
        </div>
        <p class="discret petit espace">Auto : suit le réglage clair / sombre du téléphone. Sombre : noir profond, économe sur écran OLED. Clair : lisible en plein soleil.</p>
      </div>
    </section>

    <section class="sauvegarde">
      ${titreSection('05', 'Sauvegarde')}
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
      ${titreSection('06', 'Appareil')}
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
      ${titreSection('07', 'Remise à zéro')}
      <div class="corps">
        <button id="btn-effacer" class="btn danger" type="button">Tout effacer</button>
      </div>
    </section>

    <section class="a-propos">
      <p class="a-propos-titre">Elec learning — Simulateur de terrain de l'électricien</p>
      <p>Conçu et éprouvé selon la réalité des armoires industrielles et la rigueur des normes en vigueur.</p>
      <p class="discret petit">Chaque mise à jour passe un audit d'intégrité automatique : normes citées avec leur édition, calculs recalculés, seuils de mesure, blocs « Le risque, en vrai » et « Le piège en armoire ».</p>
    </section>`;

  const afficher = (texte, etatMessage) => {
    vue.querySelector('#message').innerHTML = ligneEtat(etatMessage, esc(texte));
  };

  vue.querySelectorAll('[data-profil]').forEach(b => b.addEventListener('click', () => {
    stockage.modifier(e => { e.profil = b.dataset.profil; });
    renderProfil({ vue, definirTitre });
  }));

  vue.querySelectorAll('.selecteur button[data-theme]').forEach(b => b.addEventListener('click', () => {
    changerTheme(b.dataset.theme);
    vue.querySelectorAll('.selecteur button[data-theme]').forEach(x => x.setAttribute('aria-pressed', x === b));
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
