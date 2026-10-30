// SEUL module autorisé à lire ou écrire dans localStorage.
// Toutes les données de l'utilisateur tiennent dans un seul objet, sous une seule clé.

const CLE = 'dojo:v1';
const VERSION = 1;

function etatParDefaut() {
  return {
    version: VERSION,
    xp: 0,                   // utilisé à l'étape 2
    fichesVues: {},          // { idFiche: timestamp de dernière lecture }
    stats: {},               // utilisé à l'étape 2 (résultats du Dojo)
    derniereSauvegarde: null, // timestamp du dernier export
    preferences: { ambiance: 'papier' }
  };
}

// Point unique pour faire évoluer le format : ajouter ici les conversions v1 → v2, etc.
function migrer(donnees) {
  const { app, exporteLe, ...etat } = donnees;
  return { ...etatParDefaut(), ...etat, version: VERSION };
}

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? migrer(JSON.parse(brut)) : etatParDefaut();
  } catch (err) {
    console.warn('Lecture du stockage impossible, état vierge utilisé.', err);
    return etatParDefaut();
  }
}

let etat = charger();

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    return true;
  } catch (err) {
    console.error('Écriture du stockage impossible (navigation privée ou quota plein ?).', err);
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
    localStorage.setItem('dojo:test', '1');
    localStorage.removeItem('dojo:test');
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
  const contenu = JSON.stringify({ app: 'dojo-bts', exporteLe: new Date().toISOString(), ...etat }, null, 2);
  const nom = `dojo-bts-${new Date().toISOString().slice(0, 10)}.json`;
  const fichier = new File([contenu], nom, { type: 'application/json' });

  const mobile = matchMedia('(pointer: coarse)').matches;
  let partage = false;
  if (mobile && navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: 'Sauvegarde Dojo BTS' });
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
export async function importer(fichier) {
  let donnees;
  try {
    donnees = JSON.parse(await fichier.text());
  } catch {
    throw new Error("Fichier illisible : ce n'est pas un fichier JSON.");
  }
  if (donnees?.app !== 'dojo-bts' || typeof donnees.version !== 'number') {
    throw new Error("Ce fichier n'est pas une sauvegarde Dojo BTS.");
  }
  if (donnees.version > VERSION) {
    throw new Error("Cette sauvegarde vient d'une version plus récente de l'app.");
  }
  etat = migrer(donnees);
  if (!enregistrer()) throw new Error("Import lu, mais impossible d'écrire dans le stockage du navigateur.");
}

export function toutEffacer() {
  etat = etatParDefaut();
  return enregistrer();
}
