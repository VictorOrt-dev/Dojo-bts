// Insignes de terrain et séries de jours d'entraînement : logique pure (aucun accès au DOM ni au stockage),
// vérifiée par tests/unitaires.mjs. L'affichage et la persistance sont dans insignes.js.
//
// L'état lu : stats (réponses par mode), activite.jours (jours d'entraînement, « AAAA-MM-JJ », heure locale),
// jalons (memosApresErreur : fiches ouvertes après une erreur ; isolementPropre : mesures réussies sans dégât),
// badges ({ id: date d'obtention }).

// Cas de niveau III à embranchements et scénarios d'isolement (le test U8 vérifie qu'ils suivent les données).
export const CAS_EMBRANCHEMENTS = ['pompe-thermique-rearme', 'tgbt-reenclenchement'];
export const SCENARIOS_ISOLEMENT = ['iso-prises-neuves', 'iso-eclairage-clou', 'iso-moteur-variateur', 'iso-commande-24v', 'iso-neutre-terre', 'iso-cable-vieillissant'];
export const CAS_CONSIGNATION = ['consignation-contacteur', 'vat-procedure'];
const JOURS_GARDES = 400;

// ---------- Jours d'activité et séries ----------

const deux = n => String(n).padStart(2, '0');
export const jourLocal = (d = new Date()) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
const versDate = j => { const [a, m, d] = j.split('-').map(Number); return new Date(a, m - 1, d); };
const ecartJours = (a, b) => Math.round((versDate(b) - versDate(a)) / 86_400_000);   // b − a, en jours

// Une vraie date du calendrier (« 2026-13-45 » ou « 2026-02-30 » refusées).
export function dateValide(j) {
  if (typeof j !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(j)) return false;
  const [a, m, d] = j.split('-').map(Number);
  const date = new Date(a, m - 1, d);
  return date.getFullYear() === a && date.getMonth() === m - 1 && date.getDate() === d && a >= 2000;
}

// Jours comptables : dates réelles, jamais dans le futur (horloge avancée puis remise à l'heure).
export const joursValides = (jours = [], aujourdhui = jourLocal()) =>
  [...new Set(jours)].filter(j => dateValide(j) && j <= aujourdhui).sort();

export function ajouterJour(jours = [], jour = jourLocal()) {
  return [...new Set([...jours.filter(dateValide), ...(dateValide(jour) ? [jour] : [])])].sort().slice(-JOURS_GARDES);
}

// Série en cours : jours consécutifs jusqu'à aujourd'hui (ou hier, tant que la journée n'est pas finie).
export function serieEnCours(jours = [], aujourdhui = jourLocal()) {
  const tries = joursValides(jours, aujourdhui);
  let dernier = tries.at(-1);
  if (!dernier || ecartJours(dernier, aujourdhui) > 1) return 0;
  let n = 1;
  for (let i = tries.length - 2; i >= 0; i--) {
    if (ecartJours(tries[i], dernier) !== 1) break;
    n++; dernier = tries[i];
  }
  return n;
}

export function meilleureSerie(jours = [], aujourdhui = jourLocal()) {
  const tries = joursValides(jours, aujourdhui);
  let meilleure = 0, courante = 0;
  tries.forEach((j, i) => { courante = i && ecartJours(tries[i - 1], j) === 1 ? courante + 1 : 1; meilleure = Math.max(meilleure, courante); });
  return meilleure;
}

// ---------- Insignes ----------

const elements = (etat, mode) => Object.entries(etat.stats?.[mode]?.elements ?? {});
const reussi = (etat, mode, id) => etat.stats?.[mode]?.elements?.[id]?.reussites > 0;

// Icônes 48 × 48, trait seul (currentColor) : des pictogrammes d'armoire, pas des médailles.
const svg = corps => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corps}</svg>`;

export const BADGES = [
  {
    id: 'habilite-banc', nom: 'Habilité au banc', critere: 'Réparer une première panne au banc sans alerte de sécurité.',
    icone: svg('<rect x="13" y="6" width="22" height="34" rx="4"/><rect x="17" y="10" width="14" height="8" rx="1.5"/><circle cx="24" cy="27" r="5"/><path d="M24 27l3-3"/><path d="M18 40v4M30 40v4"/>'),
    progression: e => ({ valeur: elements(e, 'banc').some(([, s]) => s.reussites > 0) ? 1 : 0, cible: 1 })
  },
  {
    id: 'megohmmetre', nom: 'Maître du mégohmmètre', critere: 'Réussir les 6 mesures d\'isolement sans endommager de matériel.',
    icone: svg('<rect x="6" y="10" width="36" height="28" rx="4"/><path d="M13 28a11 11 0 0 1 22 0"/><path d="M24 28l6-8"/><path d="M10 38v4M38 38v4"/>'),
    progression: e => ({ valeur: SCENARIOS_ISOLEMENT.filter(id => e.jalons?.isolementPropre?.includes(id)).length, cible: SCENARIOS_ISOLEMENT.length })
  },
  {
    id: 'chasseur-pannes', nom: 'Chasseur de pannes', critere: 'Mener 5 cas de panne différents jusqu\'au diagnostic final.',
    icone: svg('<circle cx="20" cy="20" r="12"/><path d="M29 29l12 12"/><path d="M22 12l-5 9h6l-4 8"/>'),
    progression: e => ({ valeur: Math.min(5, elements(e, 'panne').filter(([, s]) => s.essais > 0).length), cible: 5 })
  },
  {
    id: 'rigueur-normative', nom: 'Rigueur normative', critere: 'Ouvrir 10 fiches mémo après une erreur.',
    icone: svg('<path d="M12 6h17l7 7v29H12z"/><path d="M29 6v7h7"/><path d="M17 22h14M17 28h14"/><path d="M18 35l3 3 6-6"/>'),
    progression: e => ({ valeur: Math.min(10, e.jalons?.memosApresErreur ?? 0), cible: 10 })
  },
  {
    id: 'zero-piege', nom: 'Zéro piège', critere: 'Réussir sans faute, du premier coup, un cas de niveau III à embranchements.',
    icone: svg('<path d="M24 42V26"/><path d="M24 26L12 12M24 26l12-14"/><circle cx="12" cy="10" r="3"/><path d="M33 9l3 3 5-6"/>'),
    progression: e => ({ valeur: CAS_EMBRANCHEMENTS.some(id => { const s = e.stats?.panne?.elements?.[id]; return s?.essais === 1 && s?.reussites === 1; }) || e.badges?.['zero-piege'] ? 1 : 0, cible: 1 })
  },
  {
    id: 'regularite', nom: 'Régularité de chantier', critere: 'S\'entraîner 3 jours de suite.',
    icone: svg('<rect x="7" y="10" width="34" height="30" rx="3"/><path d="M7 18h34M16 6v8M32 6v8"/><path d="M14 30l3 3 4-5M22 30l3 3 4-5M30 30l3 3 4-5"/>'),
    progression: e => ({ valeur: Math.min(3, meilleureSerie(e.activite?.jours)), cible: 3 })
  },
  {
    id: 'consignateur', nom: 'Consignateur', critere: 'Réussir sans faute les deux cas de consignation et de VAT.',
    icone: svg('<path d="M16 22v-6a8 8 0 0 1 16 0v6"/><rect x="11" y="22" width="26" height="20" rx="3"/><path d="M24 30v5"/>'),
    progression: e => ({ valeur: CAS_CONSIGNATION.filter(id => reussi(e, 'panne', id)).length, cible: CAS_CONSIGNATION.length })
  },
  {
    id: 'sans-faute', nom: 'Sans faute', critere: 'Terminer une séance de 10 questions ou de 10 calculs à 10/10.',
    icone: svg('<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="10"/><path d="M19 24l4 4 7-8"/>'),
    progression: e => ({ valeur: Math.max(e.stats?.reco?.meilleurScore ?? 0, e.stats?.calcul?.meilleurScore ?? 0) >= 10 ? 1 : 0, cible: 1 })
  }
];

export const badge = id => BADGES.find(b => b.id === id) ?? null;

// Insignes dont la condition est remplie dans l'état donné.
export function badgesMerites(etat) {
  return BADGES.filter(b => { const p = b.progression(etat); return p.valeur >= p.cible; }).map(b => b.id);
}

// Insignes à décerner maintenant (mérités et pas encore enregistrés).
export const nouveauxBadges = etat => badgesMerites(etat).filter(id => !etat.badges?.[id]);
