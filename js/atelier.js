// Pièces d'atelier de la charte « Bakélite & Cuivre » :
// plaque signalétique avec galvanomètre, bornier de progression, fil de cuivre, salutation.

import { esc } from './util.js';

const ROMAINS = ['I', 'II', 'III', 'IV', 'V'];
const ANGLE_MAX = 68; // débattement de l'aiguille, en degrés de part et d'autre de la verticale

function point(angle, rayon) {
  const a = angle * Math.PI / 180;
  return [150 + rayon * Math.sin(a), 150 - rayon * Math.cos(a)].map(v => v.toFixed(1));
}

// Cadran de galvanomètre gradué du seuil du rang actuel au seuil du rang suivant.
function galvanometre(debut, fin, progression) {
  let graduations = '';
  for (let i = 0; i <= 20; i++) {
    const angle = -ANGLE_MAX + (2 * ANGLE_MAX * i) / 20;
    const majeure = i % 5 === 0;
    const [x1, y1] = point(angle, majeure ? 100 : 108);
    const [x2, y2] = point(angle, 118);
    graduations += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${majeure ? 2 : 1}"/>`;
    if (i % 10 === 0) {
      const [xt, yt] = point(angle, 80);
      const valeur = fin === null ? (i === 20 ? '∞' : i === 0 ? debut : '') : Math.round(debut + (fin - debut) * i / 20);
      graduations += `<text x="${xt}" y="${yt}" text-anchor="middle" dominant-baseline="middle">${valeur}</text>`;
    }
  }
  const angleAiguille = -ANGLE_MAX + 2 * ANGLE_MAX * Math.min(1, Math.max(0, progression));
  const [ax1, ay1] = point(-ANGLE_MAX, 118);
  const [ax2, ay2] = point(ANGLE_MAX, 118);
  return `
    <svg class="galva" viewBox="0 0 300 168" role="img" aria-label="Progression vers le rang suivant : ${Math.round(progression * 100)} %">
      <path d="M${ax1} ${ay1} A118 118 0 0 1 ${ax2} ${ay2}" fill="none" stroke="#1A120D" stroke-width="1"/>
      <g stroke="#1A120D" fill="#3D3127" font-family="JetBrains Mono, monospace" font-size="20" font-weight="700" stroke-linecap="round">${graduations}</g>
      <text x="150" y="128" text-anchor="middle" font-family="Young Serif, Georgia, serif" font-size="26" fill="#1A120D">XP</text>
      <g class="aiguille" style="transform: rotate(${angleAiguille.toFixed(1)}deg)">
        <line x1="150" y1="162" x2="150" y2="34" stroke="#1A120D" stroke-width="2" stroke-linecap="round"/>
        <circle cx="150" cy="166" r="5" fill="#B4642F"/>
      </g>
      <circle cx="150" cy="150" r="9" fill="#2A1E16"/>
      <circle cx="150" cy="150" r="3" fill="#B4642F"/>
    </svg>`;
}

// Plaque signalétique émaillée de l'opérateur.
// n = niveauPour(xp) ; total = nombre de rangs ; sessions = sessions jouées.
export function plaqueOperateur({ xp, n, total, sessions }) {
  return `
    <section class="plaque niveau">
      <span class="vis"></span><span class="vis"></span><span class="vis"></span><span class="vis"></span>
      <p class="plaque-bandeau"><span>Dojo · Atelier</span><span>Rang ${ROMAINS[n.rang]} / ${ROMAINS[total - 1]}</span></p>
      <div class="plaque-corps">
        ${galvanometre(n.seuil, n.suivant?.seuil ?? null, n.progression)}
        <div class="niveau-centre">
          <p class="niveau-nom">${esc(n.nom)}</p>
          <p class="niveau-xp"><span class="valeur">${xp}</span> XP</p>
          <dl class="plaque-grille">
            <div><dt>Prochain rang</dt><dd>${n.suivant ? `${n.reste} XP` : '—'}</dd></div>
            <div><dt>Séances</dt><dd>${sessions}</dd></div>
          </dl>
        </div>
      </div>
    </section>`;
}

// Bornier : une borne par question, reliées par le fil de cuivre.
export function bornier(index, resultats, total) {
  let bornes = '';
  for (let i = 0; i < total; i++) {
    const etat = i < resultats.length ? (resultats[i] ? ' juste' : ' faux') : i === index ? ' courante' : '';
    bornes += `<span class="borne${etat}"></span>`;
  }
  return `<div class="bornier" aria-hidden="true">${bornes}</div>`;
}

// Séparateur : un fil de cuivre qui fait une boucle.
export function fil() {
  return `<div class="fil" aria-hidden="true"><svg viewBox="0 0 34 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M0 13h7c6 0 11-10 7-10s-4 10 4 10c5 0 7-1 16-1"/></svg></div>`;
}

// « Bonjour » ou « Bonsoir », et la date du jour en toutes lettres.
export function salutation(date = new Date()) {
  const h = date.getHours();
  const mot = h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir';
  const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  return { mot, jour };
}
