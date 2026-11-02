// Insignes : décerner (et garder) ceux qui sont mérités, l'annoncer sobrement, et la vitrine du Carnet.
// La logique (conditions, séries) est dans badges.js ; ici, le stockage et l'affichage.

import * as stockage from './storage.js';
import { BADGES, badge, nouveauxBadges, serieEnCours, meilleureSerie } from './badges.js';
import { esc } from './util.js';

// Retour haptique bref, seulement après un geste de l'utilisateur (les navigateurs refusent sinon).
export const vibrer = ms => { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(ms); } catch { /* pas de vibreur : sans effet */ } };

// Annonce d'un insigne : l'icône se pose comme un tampon, puis le bandeau s'efface. Jamais bloquant.
function annoncer(b) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = 'insigne-obtenu';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="insigne-obtenu-icone">${b.icone}</span>
    <span><span class="insigne-obtenu-surtitre">Insigne obtenu</span><span class="insigne-obtenu-nom">${esc(b.nom)}</span></span>`;
  document.body.append(el);
  vibrer([20, 40, 30]);
  setTimeout(() => el.classList.add('sortie'), 3000);
  setTimeout(() => el.remove(), 3400);
}

// Décerne les insignes mérités et pas encore enregistrés. Renvoie les ids décernés.
export function verifierBadges({ annoncer: avecAnnonce = true } = {}) {
  const nouveaux = nouveauxBadges(stockage.lire());
  if (!nouveaux.length) return [];
  const maintenant = Date.now();
  stockage.modifier(e => { e.badges = { ...(e.badges ?? {}), ...Object.fromEntries(nouveaux.map(id => [id, maintenant])) }; });
  if (avecAnnonce) nouveaux.forEach((id, i) => setTimeout(() => annoncer(badge(id)), i * 3500));
  return nouveaux;
}

// Une fiche mémo ouverte sous une correction ratée.
export function noterMemoOuvert() {
  stockage.modifier(e => { e.jalons = { ...e.jalons, memosApresErreur: (e.jalons?.memosApresErreur ?? 0) + 1 }; });
  verifierBadges();
}

// Une mesure d'isolement réussie sans endommager de matériel.
export function noterIsolementPropre(id) {
  stockage.modifier(e => {
    const liste = e.jalons?.isolementPropre ?? [];
    e.jalons = { ...e.jalons, isolementPropre: liste.includes(id) ? liste : [...liste, id] };
  });
  verifierBadges();
}

// Petit indicateur de série pour l'accueil (rien tant qu'aucun jour n'est enregistré).
export function indicateurSerie(etat) {
  const n = serieEnCours(etat.activite?.jours);
  if (!n) return '';
  return `<p class="serie-jours" aria-label="Série en cours : ${n} jour${n > 1 ? 's' : ''} d'entraînement consécutifs"><span class="serie-marques" aria-hidden="true">${'<span></span>'.repeat(Math.min(n, 7))}</span>Série : ${n} jour${n > 1 ? 's' : ''}</p>`;
}

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Vitrine « Qualifications & insignes » du Carnet.
export function vitrine(etat) {
  const obtenus = BADGES.filter(b => etat.badges?.[b.id]).length;
  const serie = serieEnCours(etat.activite?.jours);
  const meilleure = meilleureSerie(etat.activite?.jours);
  return `
    <p class="vitrine-resume"><strong>${obtenus}/${BADGES.length}</strong> insignes · série en cours : <strong>${serie} jour${serie > 1 ? 's' : ''}</strong> · meilleure : ${meilleure} jour${meilleure > 1 ? 's' : ''}</p>
    <ul class="vitrine">
      ${BADGES.map(b => {
        const date = etat.badges?.[b.id];
        const p = b.progression(etat);
        return `<li class="insigne ${date ? 'obtenu' : 'verrouille'}" data-badge="${b.id}">
          <span class="insigne-icone">${b.icone}</span>
          <span class="insigne-nom">${esc(b.nom)}</span>
          <span class="insigne-critere">${esc(b.critere)}</span>
          <span class="insigne-etat">${date ? `Obtenu le ${esc(DATE.format(date))}` : `Verrouillé · ${Math.min(p.valeur, p.cible)}/${p.cible}`}</span>
        </li>`;
      }).join('')}
    </ul>`;
}
