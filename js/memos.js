// Fiches mémo flash : 30 secondes de lecture pour comprendre la notion derrière une erreur.
// Le contenu est dans data/memos.json : { id, titre, domaine, cibles: { reco, calcul, panne, isolement : [ids] }, texte }.
// Le texte est un Markdown volontairement réduit : paragraphes, listes « - », **gras**, `code`, citations « > »
// et blocs ``` pour les formules et les schémas en texte. Tout est échappé avant mise en forme.

import { esc } from './util.js';
import { typo, frontispice } from './mise-en-page.js';
import { DOMAINES, puceDomaine } from './domaines.js';

let promesse = null;
export function chargerMemos() {
  promesse ??= fetch('data/memos.json').then(r => {
    if (!r.ok) throw new Error(`data/memos.json introuvable (HTTP ${r.status})`);
    return r.json();
  }).catch(err => { promesse = null; throw err; });
  return promesse;
}

// Mise en forme du texte d'une ligne : échappement, puis **gras** et `code`.
const enLigne = t => esc(typo(t))
  .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

export function markdown(md) {
  const html = [];
  let liste = null, bloc = null, paragraphe = [];
  const fermerParagraphe = () => { if (paragraphe.length) { html.push(`<p>${enLigne(paragraphe.join(' '))}</p>`); paragraphe = []; } };
  const fermerListe = () => { if (liste) { html.push(`<ul>${liste.map(li => `<li>${enLigne(li)}</li>`).join('')}</ul>`); liste = null; } };
  for (const ligne of String(md ?? '').split('\n')) {
    if (ligne.trim().startsWith('```')) {
      if (bloc) { html.push(`<pre class="memo-schema">${esc(bloc.join('\n'))}</pre>`); bloc = null; }
      else { fermerParagraphe(); fermerListe(); bloc = []; }
      continue;
    }
    if (bloc) { bloc.push(ligne); continue; }
    if (/^\s*-\s+/.test(ligne)) { fermerParagraphe(); (liste ??= []).push(ligne.replace(/^\s*-\s+/, '')); continue; }
    if (/^>\s?/.test(ligne)) { fermerParagraphe(); fermerListe(); html.push(`<p class="memo-regle">${enLigne(ligne.replace(/^>\s?/, ''))}</p>`); continue; }
    if (!ligne.trim()) { fermerParagraphe(); fermerListe(); continue; }
    fermerListe();
    paragraphe.push(ligne.trim());
  }
  if (bloc) html.push(`<pre class="memo-schema">${esc(bloc.join('\n'))}</pre>`);
  fermerParagraphe(); fermerListe();
  return html.join('');
}

// La fiche qui explique un élément (question, calcul, cas, mesure), ou null.
export const memoPour = (memos, mode, id) => memos.find(m => m.cibles?.[mode]?.includes(id)) ?? null;

// Encart repliable « Comprendre la notion » sous une correction.
export function blocMemo(m, { ouvert = false, etiquette = 'Comprendre la notion' } = {}) {
  if (!m) return '';
  return `<details class="memo" data-memo="${esc(m.id)}"${ouvert ? ' open' : ''}>
    <summary><span class="memo-etiquette">${esc(etiquette)}</span><span class="memo-titre">${esc(typo(m.titre))}</span></summary>
    <div class="memo-corps">${markdown(m.texte)}<p class="memo-lien"><a href="#/entrainement/memos?m=${encodeURIComponent(m.id)}">Toutes les fiches mémo</a></p></div>
  </details>`;
}

// Remplit une zone (<div data-memo-mode data-memo-id>) dès que les fiches sont chargées.
export function remplirMemo(zone) {
  if (!zone) return;
  chargerMemos().then(memos => {
    if (!zone.isConnected) return;
    const ouvert = zone.dataset.memoOuvert === '1';   // « Je ne sais pas encore » : la fiche arrive dépliée
    zone.innerHTML = blocMemo(memoPour(memos, zone.dataset.memoMode, zone.dataset.memoId), ouvert ? { ouvert, etiquette: 'La notion, en 30 secondes' } : {});
    // Une fiche ouverte après une erreur compte pour l'insigne « Rigueur normative » (une fois par correction).
    zone.querySelector('.memo')?.addEventListener('toggle', ev => {
      if (!ev.target.open || zone.dataset.compte) return;
      zone.dataset.compte = '1';
      import('./insignes.js').then(m => m.noterMemoOuvert());
    });
  }).catch(() => {});
}

export const zoneMemo = (mode, id, { ouvert = false } = {}) => `<div class="zone-memo" data-memo-mode="${esc(mode)}" data-memo-id="${esc(id)}"${ouvert ? ' data-memo-ouvert="1"' : ''}></div>`;

// ---------- Écran « Fiches mémo » (depuis le Carnet) ----------
export async function renderMemos({ vue, definirTitre, params }) {
  definirTitre('Fiches mémo');
  const memos = await chargerMemos();
  const choisi = params?.get('m');
  vue.innerHTML = `
    ${frontispice({ surtitre: 'Carnet', titre: 'Fiches', italique: 'mémo', chapo: `${memos.length} fiches de 30 secondes : la formule, le schéma ou la règle à avoir en tête. Elles s'ouvrent aussi d'elles-mêmes sous une correction quand tu te trompes.` })}
    ${DOMAINES.filter(d => memos.some(m => m.domaine === d.id)).map(d => `
      <section class="bloc-memos">
        <h3 class="section-titre"><span class="section-num">${puceDomaine(d.id)}</span><span>${esc(d.nom)}</span></h3>
        ${memos.filter(m => m.domaine === d.id).map(m => blocMemo(m, { ouvert: m.id === choisi, etiquette: 'Fiche mémo · 30 s' })).join('')}
      </section>`).join('')}
    <div class="actions pousse-bas"><a class="btn" href="#/profil">Retour au Carnet</a></div>`;
  vue.querySelectorAll('.memo-lien').forEach(p => p.remove());
  if (choisi) setTimeout(() => vue.querySelector(`.memo[data-memo="${CSS.escape(choisi)}"]`)?.scrollIntoView({ block: 'start' }), 50);
}
