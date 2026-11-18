// Reprise des séries : une séance de reconnaissance ou de calculs, ou un examen blanc, quittée en cours de route
// (retour à l'accueil, autre appli, téléphone qui se verrouille) se reprend là où on l'a laissée. Rien n'est perdu,
// et rien de ce qui n'a pas été joué n'est compté.
// La série est enregistrée après chaque réponse (storage.js, clé à part, hors sauvegarde exportée) et effacée à la fin.
// cle() et estValide() sont pures : tests/unitaires.mjs les vérifie sans navigateur.

import * as stockage from './storage.js';
import { esc } from './util.js';

export const DUREE_REPRISE_JOURS = 7;
const JOUR = 86_400_000;

// Signature d'une série : le mode et ses réglages (niveau, domaine, révision), sans les paramètres techniques.
export function cle(mode, params) {
  const p = new URLSearchParams(params ?? '');
  for (const k of ['r', 'reprendre']) p.delete(k);
  p.sort();
  return `${mode}?${p}`;
}

// Une série sauvegardée est reprenable si elle est récente, a au moins une réponse et n'est pas finie.
export function estValide(s, maintenant = Date.now()) {
  return !!s && typeof s === 'object' && typeof s.cle === 'string' && Array.isArray(s.resultats)
    && Number.isSafeInteger(s.total) && s.total > 0 && s.resultats.length > 0 && s.resultats.length <= s.total
    && Number.isFinite(s.date) && maintenant - s.date < DUREE_REPRISE_JOURS * JOUR;
}

export function enregistrer(mode, donnees) {
  stockage.ecrireSerieEnCours(mode, { ...donnees, date: Date.now() });
}

// La série en cours de ce mode, si elle correspond à ces réglages (ou à n'importe lesquels si cleVoulue est omise).
export function lire(mode, cleVoulue) {
  const s = stockage.lireSeriesEnCours()[mode];
  return estValide(s) && (!cleVoulue || s.cle === cleVoulue) ? s : null;
}

export const effacer = mode => stockage.effacerSerieEnCours(mode);

// Toutes les séries reprenables, pour l'accueil : [{ mode, href, libelle, progression }].
export function seriesEnCours() {
  return Object.entries(stockage.lireSeriesEnCours())
    .filter(([, s]) => estValide(s))
    .map(([mode, s]) => ({ mode, href: s.href, libelle: s.libelle, progression: `${s.resultats.length}/${s.total}` }));
}

// Bandeau « Tu avais une série en cours » en tête d'une nouvelle série (non bloquant : répondre l'écrase).
export const bandeauReprise = s => `
  <div class="bandeau-reprise" role="status">
    <p><strong>Série en cours</strong> · ${s.resultats.length} réponse${s.resultats.length > 1 ? 's' : ''} sur ${s.total}, score ${s.score ?? 0}. Tu peux la reprendre là où tu l'as laissée.</p>
    <button type="button" class="btn principal" id="reprendre-serie">Reprendre</button>
  </div>`;

// Cartes de l'accueil.
export function cartesReprise() {
  const l = seriesEnCours();
  if (!l.length) return '';
  return `<div class="reprises" aria-label="Séries à reprendre">${l.map(s => `
    <a class="carte-reprise" href="${esc(s.href)}">
      <span class="carte-reprise-surtitre">À reprendre</span>
      <span class="carte-reprise-titre">${esc(s.libelle)}</span>
      <span class="carte-reprise-desc">${esc(s.progression)} déjà fait · reprendre là où tu t'es arrêté →</span>
    </a>`).join('')}</div>`;
}
