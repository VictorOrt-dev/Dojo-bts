// Mesure d'isolement au mégohmmètre : préparer (consigner, débrancher l'électronique), choisir la tension d'essai
// (250, 500 ou 1 000 V DC), mesurer entre deux points, puis conclure. Les scénarios sont dans data/isolement.json :
// chaque paire de points a sa valeur (mesures["A|B"], sinon « sain ») ; les mesures clés sont celles qui révèlent le cas.
// La fonction lecture() est pure : tests/unitaires.mjs la vérifie sans navigateur.

import * as stockage from './storage.js';
import { gagnerXP, noterReponse, noterSession, statsMode } from './xp.js';
import { annoncerMontee } from './entrainement.js';
import { frontispice, typo } from './mise-en-page.js';
import { DIFFICULTES, etiquetteNiveau } from './difficulte.js';
import { pucesDomaines } from './domaines.js';
import { blocRisque, risqueComplet, ligneNorme, enSavoirPlus } from './tuteur.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';

export const TENSIONS_ESSAI = [250, 500, 1000];
const NOMS_ELECTRONIQUE = { variateur: 'le variateur', automate: 'les cartes de l\'automate' };

export const cle = (a, b) => [a, b].sort().join('|');

// Résultat d'un essai : { valeur (MΩ) | null, danger?, degat?, methode?, note }.
export function lecture(s, { consigne, debranche, tension, a, b }) {
  if (a === b) return { valeur: null, note: 'Choisis deux points différents.' };
  if (!consigne) return { valeur: null, danger: 'Mesure d\'isolement sous tension', note: 'Le circuit n\'est pas consigné : le mégohmmètre injecte ses 500 V DC sur un réseau sous tension. Appareil détruit, opérateur exposé. On consigne et on vérifie l\'absence de tension d\'abord.' };
  const brute = s.mesures[cle(a, b)] ?? s.sain;
  const res = { valeur: brute, note: '' };
  if (s.electronique && !debranche) {
    res.degat = `${NOMS_ELECTRONIQUE[s.electronique] ?? 'l\'électronique'} soumis${s.electronique === 'automate' ? 'es' : ''} à ${tension} V DC`;
    res.valeur = Math.min(brute, 0.05);
    res.note = `L'électronique est restée raccordée : ${NOMS_ELECTRONIQUE[s.electronique]} a pris la tension d'essai (composants endommagés), et la mesure passe à travers elle : elle ne veut plus rien dire.`;
    return res;
  }
  if (tension > s.essaiConseille && s.tensionReseau <= 50) {
    res.methode = 'Tension d\'essai trop élevée pour un circuit TBT';
    res.note = `Un circuit ${s.tensionReseau} V s'essaie sous ${s.essaiConseille} V DC : ${tension} V peut claquer des composants restés raccordés (voyants, alimentations). `;
  } else if (tension < s.essaiConseille) {
    res.methode = 'Tension d\'essai trop faible';
    res.note = `Sous ${tension} V, un isolant fragilisé peut tenir alors qu'il claquerait sous la tension conseillée (${s.essaiConseille} V DC) : mesure peu probante. `;
  }
  res.note += brute < s.seuil
    ? `${formater(brute)} : sous le seuil de ${formater(s.seuil)}, isolement insuffisant entre ces deux points.`
    : `${formater(brute)} : au-dessus du seuil de ${formater(s.seuil)}.`;
  return res;
}

export function formater(v) {
  if (v === null || v === undefined) return '—';
  const texte = v >= 100 ? Math.round(v).toLocaleString('fr-FR') : v >= 10 ? v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${texte} MΩ`;
}

let promesse = null;
export function chargerScenarios() {
  promesse ??= fetch('data/isolement.json').then(r => {
    if (!r.ok) throw new Error(`data/isolement.json introuvable (HTTP ${r.status})`);
    return r.json();
  }).catch(err => { promesse = null; throw err; });
  return promesse;
}

let essaiCourant = null;
export const essaiEnCours = () => essaiCourant;   // utilisé par les tests automatisés

export async function renderIsolement({ vue, definirTitre, params }) {
  definirTitre('Mesure d\'isolement');
  const scenarios = await chargerScenarios();
  const s = scenarios.find(x => x.id === params?.get('s'));
  if (s) return jouer(vue, s, scenarios);
  const suivi = statsMode('isolement').elements;
  const statut = id => suivi[id]?.reussites ? '<span class="etat-lu">Réussie</span>' : suivi[id]?.essais ? 'Faite' : 'À faire';
  vue.innerHTML = `
    ${frontispice({ surtitre: 'Mesure d\'isolement', titre: 'Le', italique: 'mégohmmètre', chapo: 'Consigner, débrancher l\'électronique, choisir la tension d\'essai, mesurer chaque conducteur, puis conclure. Comme sur le terrain : une valeur ne dit rien sans son seuil, et parfois sans son historique.' })}
    ${DIFFICULTES.filter(d => scenarios.some(x => x.niveau === d.n)).map(d => `
      <section>
        <h3 class="section-titre"><span class="section-num">${d.romain}</span><span>${esc(d.nom)}</span></h3>
        ${scenarios.filter(x => x.niveau === d.n).map(x => `
          <a class="ligne ligne-isolement" href="#/entrainement/isolement?s=${encodeURIComponent(x.id)}">
            <div>
              <p class="ligne-meta">${pucesDomaines(x.domaines)}${etiquetteNiveau(x.niveau)}</p>
              <h2 class="ligne-titre">${esc(typo(x.titre))}</h2>
            </div>
            <span class="ligne-fin">${statut(x.id)}</span>
          </a>`).join('')}
      </section>`).join('')}`;
}

function jouer(vue, s, scenarios) {
  const etat = essaiCourant = {
    consigne: false, debranche: false, tension: 500, a: s.points[0], b: s.points[s.points.length - 1],
    journal: [], dangers: [], degats: [], methode: [], valides: new Set(), dernier: null, fini: false, choix: null
  };
  const ordreVerdicts = melanger(s.verdicts.map((_, i) => i));

  const afficher = () => {
    if (etat.fini) return rapport();
    const l = etat.dernier;
    vue.innerHTML = `
      <header class="frontispice frontispice-isolement">
        <p class="surtitre">Mesure d'isolement ${etiquetteNiveau(s.niveau, { long: true })}</p>
        <h2 class="titre-chapitre">${esc(typo(s.titre))}</h2>
      </header>
      <p class="reco-domaines">${pucesDomaines(s.domaines)}</p>
      <div class="bon-intervention"><p class="lecon-titre">Bon d'intervention</p><p>${esc(typo(s.contexte))}</p></div>

      <section class="iso-etape">
        <p class="surtitre">1 · Préparer</p>
        <div class="actions-iso">
          <button type="button" class="btn${etat.consigne ? ' fait' : ''}" data-prep="consigne" aria-pressed="${etat.consigne}">${etat.consigne ? '✓ Consigné, absence de tension vérifiée' : 'Consigner et vérifier l\'absence de tension'}</button>
          ${s.electronique ? `<button type="button" class="btn${etat.debranche ? ' fait' : ''}" data-prep="debranche" aria-pressed="${etat.debranche}">${etat.debranche ? `✓ ${NOMS_ELECTRONIQUE[s.electronique]} débranché${s.electronique === 'automate' ? 'es' : ''}` : `Débrancher ${NOMS_ELECTRONIQUE[s.electronique]}`}</button>` : ''}
        </div>
      </section>

      <section class="iso-etape instrument megohmmetre">
        <p class="surtitre">2 · Mesurer</p>
        <div class="selecteur trois" role="group" aria-label="Tension d'essai">
          ${TENSIONS_ESSAI.map(u => `<button type="button" data-tension="${u}" aria-pressed="${u === etat.tension}">${u} V DC</button>`).join('')}
        </div>
        <label class="pointe rouge"><span>Rouge</span><select id="iso-a" aria-label="Pointe rouge">${s.points.map(p => `<option${p === etat.a ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="pointe noire"><span>Noire</span><select id="iso-b" aria-label="Pointe noire">${s.points.map(p => `<option${p === etat.b ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <div class="lecture-ligne">
          <div class="nixie"><output id="iso-lecture" class="nixie-valeur">${l?.valeur != null ? esc(formater(l.valeur).replace(' MΩ', '')) : ''}</output><span class="unite">MΩ</span></div>
          <button id="tester" class="btn principal" type="button">Tester</button>
        </div>
        ${l?.note ? `<p class="note-mesure${l.danger || l.degat || l.methode || (l.valeur != null && l.valeur < s.seuil) ? ' alerte' : ''}">${esc(typo(l.note))}</p>` : ''}
      </section>

      ${etat.journal.length ? `<details class="approfondir journal" open><summary>Mesures relevées (${etat.journal.length})</summary>
        <ol>${etat.journal.map(j => `<li>${esc(j)}</li>`).join('')}</ol></details>` : ''}

      <section class="iso-etape">
        <p class="surtitre">3 · Conclure</p>
        <div class="choix">
          ${ordreVerdicts.map((i, rang) => `<button class="choix-btn" type="button" data-verdict="${i}"><span class="choix-touche">${'ABCD'[rang]}</span><span>${esc(typo(s.verdicts[i].texte))}</span></button>`).join('')}
        </div>
      </section>`;

    vue.querySelectorAll('[data-prep]').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.prep;
      if (p === 'consigne') etat.consigne = !etat.consigne;
      else etat.debranche = !etat.debranche;
      etat.journal.push(p === 'consigne' ? (etat.consigne ? 'Circuit consigné, VAT faite.' : 'Circuit déconsigné.') : (etat.debranche ? 'Électronique débranchée.' : 'Électronique rebranchée.'));
      afficher();
    }));
    vue.querySelectorAll('[data-tension]').forEach(b => b.addEventListener('click', () => { etat.tension = Number(b.dataset.tension); afficher(); }));
    vue.querySelector('#iso-a').addEventListener('change', ev => { etat.a = ev.target.value; });
    vue.querySelector('#iso-b').addEventListener('change', ev => { etat.b = ev.target.value; });
    vue.querySelector('#tester').addEventListener('click', () => {
      const r = etat.dernier = lecture(s, etat);
      if (r.danger) etat.dangers.push(r.danger);
      if (r.degat && !etat.degats.includes(r.degat)) etat.degats.push(r.degat);
      if (r.methode && !etat.methode.includes(r.methode)) etat.methode.push(r.methode);
      if (r.valeur != null) {
        etat.journal.push(`${etat.a} – ${etat.b} sous ${etat.tension} V DC : ${formater(r.valeur)}${r.degat ? ' (électronique raccordée)' : ''}`);
        if (!r.degat && !r.methode) etat.valides.add(cle(etat.a, etat.b));
      } else if (r.danger) etat.journal.push(`Essai sous tension refusé par la sécurité : ${r.danger.toLowerCase()}.`);
      afficher();
      vue.querySelector('.megohmmetre').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    vue.querySelectorAll('[data-verdict]').forEach(b => b.addEventListener('click', () => { etat.choix = Number(b.dataset.verdict); etat.fini = true; afficher(); }));
  };

  const rapport = () => {
    const v = s.verdicts[etat.choix];
    const manquantes = s.cles.filter(k => !etat.valides.has(k));
    const juste = v.bon && !manquantes.length;
    const parfait = juste && !etat.dangers.length && !etat.degats.length && !etat.methode.length;
    const xp = juste ? Math.max(10, 30 - 15 * etat.dangers.length - 10 * etat.degats.length - 5 * etat.methode.length) + (parfait ? 20 : 0) : 0;
    if (xp) annoncerMontee(gagnerXP(xp));
    noterReponse('isolement', s.id, juste && !etat.dangers.length);
    noterSession('isolement', juste ? 1 : 0);
    const message = parfait ? 'Mesure de pro.' : juste ? 'Bonne conclusion.' : v.bon ? 'Bonne intuition, mesures incomplètes.' : 'Conclusion à revoir.';
    const autre = scenarios[scenarios.indexOf(s) + 1];
    vue.innerHTML = `
      <section class="bilan">
        <p class="surtitre">Rapport de mesure</p>
        <p class="bilan-message">${message}</p>
        <p class="bilan-xp">${xp ? `+${xp} XP` : 'Pas d\'XP cette fois'}</p>
      </section>
      <ul class="stats">
        <li><span>Alertes sécurité</span><span class="mono">${etat.dangers.length}</span></li>
        <li><span>Matériel endommagé</span><span class="mono">${etat.degats.length}</span></li>
        <li><span>Erreurs de méthode</span><span class="mono">${etat.methode.length}</span></li>
        <li><span>Mesures relevées</span><span class="mono">${etat.journal.filter(j => j.includes(' V DC')).length}</span></li>
      </ul>
      ${etat.dangers.length ? `<div class="alerte-securite"><p class="lecon-titre">Gestes dangereux</p><p>${etat.dangers.map(esc).join(' · ')}</p></div>` : ''}
      ${etat.degats.length ? `<div class="consequence"><p class="lecon-titre">Matériel endommagé</p><p>${etat.degats.map(d => esc(typo(d.charAt(0).toUpperCase() + d.slice(1)))).join(' · ')}</p></div>` : ''}
      ${etat.methode.length ? `<div class="diagnostic"><p class="lecon-titre">Méthode</p><p>${etat.methode.map(esc).join(' · ')}</p></div>` : ''}
      ${manquantes.length ? `<div class="diagnostic"><p class="lecon-titre">Mesures qui manquaient</p><p>Sans mesure valable entre ${manquantes.map(k => k.replace('|', ' et ')).join(', ')}, la conclusion ne repose sur rien de solide.</p></div>` : ''}
      <div class="essentiel">
        <div class="${v.bon ? 'lecon' : 'diagnostic'}"><p class="lecon-titre">${v.bon ? 'Ta conclusion' : 'Pourquoi ce n\'est pas ça'}</p><p>${esc(typo(v.explication))}</p></div>
        <div class="lecon"><p class="lecon-titre">Ce qu'il y avait</p><p>${esc(typo(s.conclusion.cause))}</p></div>
        ${blocRisque(s.conclusion.risque, { court: true })}
      </div>
      ${enSavoirPlus(`
        <div class="lecon"><p class="lecon-titre">Le remède</p><p>${esc(typo(s.conclusion.remede))}</p></div>
        <div class="piege-terrain"><p class="lecon-titre">Le piège en armoire</p><p>${esc(typo(s.conclusion.piege))}</p></div>
        <div class="lecon"><p class="lecon-titre">Les bons réglages</p><p>${esc(typo(`Tension d'essai ${s.essaiConseille} V DC pour un circuit ${s.tensionReseau} V ; seuil ${formater(s.seuil)}.${s.electronique ? ` Débrancher ${NOMS_ELECTRONIQUE[s.electronique]} avant l'essai.` : ''}`))}</p></div>
        ${risqueComplet(s.conclusion.risque)}
        ${ligneNorme(s.conclusion.norme, { aRelire: !s.verifie })}`, 'En savoir plus : remède, piège, réglages, norme')}
      <details class="approfondir journal"><summary>Ton journal (${etat.journal.length})</summary><ol>${etat.journal.map(j => `<li>${esc(j)}</li>`).join('')}</ol></details>
      <div class="actions pousse-bas">
        ${autre ? `<a class="btn principal" href="#/entrainement/isolement?s=${encodeURIComponent(autre.id)}">Mesure suivante</a>` : ''}
        <a class="btn${autre ? '' : ' principal'}" href="#/entrainement/isolement?s=${encodeURIComponent(s.id)}&r=${Date.now()}">Refaire cette mesure</a>
        <a class="btn" href="#/entrainement/isolement">Toutes les mesures</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  afficher();
  window.scrollTo(0, 0);
}
