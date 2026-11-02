// SEUL module autorisé à lire ou écrire dans localStorage.
// Toutes les données de l'utilisateur tiennent dans un seul objet, sous une seule clé.

import { controler, etatParDefaut, VERSION, TAILLE_MAX } from './sauvegarde.js';

const CLE = 'elec-learning:v1';
const ANCIENNE_CLE = 'dojo:v1'; // nom de l'app avant « Elec learning » : migrée au premier lancement
const APP = 'elec-learning';
const ANCIENNES_APPS = ['dojo-bts']; // sauvegardes exportées avant le changement de nom

// Point unique pour faire évoluer le format : ajouter ici les conversions v1 → v2, etc., AVANT le contrôle.
// Le contrôle (sauvegarde.js) reconstruit l'état champ par champ : rien de mal typé ne passe.
function migrer(donnees) {
  return controler(donnees);
}

function charger() {
  try {
    let brut = localStorage.getItem(CLE);
    if (!brut && (brut = localStorage.getItem(ANCIENNE_CLE))) {
      localStorage.setItem(CLE, brut);       // reprend la progression enregistrée sous l'ancien nom
      localStorage.removeItem(ANCIENNE_CLE);
    }
    if (!brut) return etatParDefaut();
    // Au démarrage, on ne refuse rien : on nettoie (un champ abîmé reprend sa valeur par défaut, le reste est gardé).
    const { etat, anomalies } = migrer(JSON.parse(brut));
    if (anomalies.length) console.warn('Données locales nettoyées :', anomalies);
    return etat;
  } catch (err) {
    console.warn('Lecture du stockage impossible, état vierge utilisé.', err);
    return etatParDefaut();
  }
}

let etat = charger();

// Échec d'écriture (quota plein, navigation privée) : un bandeau visible, une fois par ouverture de l'app.
let echecSignale = false;
function signalerEchecEcriture(err) {
  if (echecSignale || typeof document === 'undefined') return;
  echecSignale = true;
  const plein = err?.name === 'QuotaExceededError' || err?.code === 22;
  const bandeau = document.createElement('div');
  bandeau.className = 'alerte-stockage';
  bandeau.setAttribute('role', 'alert');
  bandeau.innerHTML = `<p><strong>Progression non enregistrée.</strong> ${plein
    ? 'Le stockage de ton téléphone est plein pour cette app.'
    : 'Le navigateur refuse l\'enregistrement (navigation privée ?).'} Exporte ta sauvegarde depuis le Carnet pour ne rien perdre.</p>
    <button type="button" class="btn">Compris</button>`;
  bandeau.querySelector('button').addEventListener('click', () => bandeau.remove());
  document.body.append(bandeau);
}

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    return true;
  } catch (err) {
    console.error('Écriture du stockage impossible (navigation privée ou quota plein ?).', err);
    signalerEchecEcriture(err);
    return false;
  }
}

// Lecture seule : ne pas modifier l'objet retourné, passer par modifier().
export function lire() {
  return etat;
}

// Exemple : modifier(e => { e.xp += 10; });
export function modifier(fonction) {
  fonction(etat);
  return enregistrer();
}

export function disponible() {
  try {
    localStorage.setItem('elec-learning:test', '1');
    localStorage.removeItem('elec-learning:test');
    return true;
  } catch {
    return false;
  }
}

// Demande au navigateur de ne pas effacer nos données (Chrome/Android surtout).
export async function demanderPersistance() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export async function estPersistant() {
  return (await navigator.storage?.persisted?.()) ?? false;
}

// Exporte toutes les données dans un fichier JSON.
// Sur mobile : feuille de partage (Enregistrer dans Fichiers, Drive, mail…). Sinon : téléchargement.
export async function exporter() {
  const contenu = JSON.stringify({ app: APP, exporteLe: new Date().toISOString(), ...etat }, null, 2);
  const nom = `elec-learning-${new Date().toISOString().slice(0, 10)}.json`;
  const fichier = new File([contenu], nom, { type: 'application/json' });

  const mobile = matchMedia('(pointer: coarse)').matches;
  let partage = false;
  if (mobile && navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: 'Sauvegarde Elec learning' });
      partage = true;
    } catch (err) {
      if (err.name === 'AbortError') return false; // l'utilisateur a annulé
      // Autre erreur : on se rabat sur le téléchargement.
    }
  }
  if (!partage) {
    const url = URL.createObjectURL(fichier);
    const lien = Object.assign(document.createElement('a'), { href: url, download: nom });
    document.body.append(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  modifier(e => { e.derniereSauvegarde = Date.now(); });
  return true;
}

// Remplace toutes les données par celles d'un fichier exporté. Lève une Error lisible si le fichier est invalide.
// Contrôle strict : à la moindre anomalie (xp en texte, compteur négatif, clé suspecte…), la sauvegarde est
// refusée en entier et les données actuelles restent intactes.
export async function importer(fichier) {
  if (fichier.size > TAILLE_MAX) {
    throw new Error("Fichier trop volumineux pour être une sauvegarde Elec learning.");
  }
  let donnees;
  try {
    donnees = JSON.parse(await fichier.text());
  } catch {
    throw new Error("Fichier illisible : ce n'est pas un fichier JSON.");
  }
  if (![APP, ...ANCIENNES_APPS].includes(donnees?.app) || !Number.isSafeInteger(donnees.version)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Elec learning.");
  }
  if (donnees.version > VERSION) {
    throw new Error("Cette sauvegarde vient d'une version plus récente de l'app.");
  }
  const { app, exporteLe, ...contenu } = donnees;
  const { etat: propre, anomalies } = migrer(contenu);
  if (anomalies.length) {
    const autres = anomalies.length > 1 ? ` (et ${anomalies.length - 1} autre${anomalies.length > 2 ? 's' : ''} anomalie${anomalies.length > 2 ? 's' : ''})` : '';
    throw new Error(`Sauvegarde refusée, elle semble abîmée : ${anomalies[0]}${autres}. Tes données actuelles n'ont pas été modifiées.`);
  }
  const avant = etat;
  etat = propre;
  if (!enregistrer()) {
    etat = avant;
    throw new Error("Import lu, mais impossible d'écrire dans le stockage du navigateur.");
  }
}

export function toutEffacer() {
  etat = etatParDefaut();
  return enregistrer();
}
