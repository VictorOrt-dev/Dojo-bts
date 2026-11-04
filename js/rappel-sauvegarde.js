// Rappel de sauvegarde mensuel : la progression ne vit que dans ce téléphone. Une fois par mois, au lancement, un
// bandeau discret de l'accueil propose d'exporter la sauvegarde (JSON) dans ses fichiers, contre un nettoyage du
// navigateur ou un changement de téléphone. rappelDu() est pure : tests/unitaires.mjs la vérifie sans navigateur.

import * as stockage from './storage.js';
import { esc } from './util.js';

const JOUR = 86_400_000;
export const INTERVALLE_RAPPEL_JOURS = 30;

const debutActivite = etat => {
  const j = etat.activite?.jours?.[0];
  if (!j) return 0;
  const [a, m, d] = j.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
};

// Le rappel est dû quand il y a une progression à perdre et que ni export, ni rappel, ni début d'activité ne datent
// de moins de 30 jours.
export function rappelDu(etat, maintenant = Date.now()) {
  const progres = (etat.xp ?? 0) > 0 || Object.values(etat.stats ?? {}).some(m => m?.sessions > 0);
  if (!progres) return false;
  const reference = Math.max(etat.derniereSauvegarde ?? 0, etat.preferences?.rappelSauvegarde ?? 0, debutActivite(etat));
  // Sans aucune date (ancienne sauvegarde) : on ne harcèle pas, on commence à compter (voir bandeauSauvegarde).
  return reference > 0 && maintenant - reference >= INTERVALLE_RAPPEL_JOURS * JOUR;
}

let affiche = false;   // montré pendant cette ouverture de l'app : il reste là tant qu'on n'a pas répondu

// Le bandeau de l'accueil (chaîne vide s'il n'est pas dû). Le marquer « vu » le repousse d'un mois.
export function bandeauSauvegarde(etat) {
  const progres = (etat.xp ?? 0) > 0 || Object.values(etat.stats ?? {}).some(m => m?.sessions > 0);
  if (progres && !etat.derniereSauvegarde && !etat.preferences?.rappelSauvegarde && !etat.activite?.jours?.length) {
    stockage.modifier(e => { e.preferences = { ...e.preferences, rappelSauvegarde: Date.now() }; });   // point de départ
    return '';
  }
  if (!affiche && !rappelDu(etat)) return '';
  if (!affiche) {
    affiche = true;
    stockage.modifier(e => { e.preferences = { ...e.preferences, rappelSauvegarde: Date.now() }; });
  }
  const jours = etat.derniereSauvegarde ? Math.floor((Date.now() - etat.derniereSauvegarde) / JOUR) : null;
  return `
    <aside class="rappel-sauvegarde" role="status" aria-label="Rappel de sauvegarde">
      <p class="rappel-sauvegarde-titre">Mets ta progression à l'abri</p>
      <p>${esc(jours === null ? 'Elle n\'existe que sur ce téléphone, et tu ne l\'as jamais exportée.' : `Dernière sauvegarde il y a ${jours} jours.`)} Un fichier dans tes documents la protège d'un nettoyage du navigateur ou d'un changement de téléphone.</p>
      <div class="rappel-sauvegarde-actions">
        <button type="button" class="btn principal" id="rappel-exporter">Exporter maintenant</button>
        <button type="button" class="btn" id="rappel-plus-tard">Plus tard</button>
      </div>
    </aside>`;
}

export function brancherBandeau(vue) {
  const b = vue.querySelector('.rappel-sauvegarde');
  if (!b) return;
  const fermer = texte => {
    affiche = false;
    b.innerHTML = texte ? `<p class="rappel-sauvegarde-titre">${esc(texte)}</p>` : '';
    if (!texte) b.remove();
  };
  vue.querySelector('#rappel-plus-tard').addEventListener('click', () => fermer(''));
  vue.querySelector('#rappel-exporter').addEventListener('click', async () => {
    try { if (await stockage.exporter()) fermer('Sauvegarde exportée. Prochain rappel dans un mois.'); }
    catch { fermer('Export impossible : réessaie depuis le Carnet, section Sauvegarde.'); }
  });
}
