// Mode Cas de panne : interventions de dépannage pas à pas, sans chrono.
// À chaque étape, on choisit une démarche ; chaque choix est expliqué. Une démarche fausse ou
// dangereuse ne bloque pas : on lit pourquoi, puis on choisit autre chose.
// Le contenu vient de data/pannes.json.

import { gagnerXP, noterReponse, noterSession, statsMode, BAREME } from './xp.js';
import { annoncerMontee } from './entrainement.js';
import { DIFFICULTES, difficulte, etiquetteNiveau } from './difficulte.js';
import { bornier } from './atelier.js';
import { frontispice, typo, deuxChiffres } from './mise-en-page.js';
import { melanger } from './hasard.js';
import { esc } from './util.js';
import { domaine, filtrerParDomaine, pucesDomaines, barreDomaines } from './domaines.js';
import { blocRisque, risqueComplet, ligneNorme, enSavoirPlus, resume, MOTS_POURQUOI } from './tuteur.js';
import { conseilCas } from './parcours.js';
import * as stockage from './storage.js';

// suite : le choix permet-il de passer à l'étape suivante ?
const VERDICTS = {
  bon: { tampon: 'Bonne démarche.', classe: 'est-juste', bloc: 'lecon', titre: 'Pourquoi c\'est la bonne démarche', suite: true, borne: 'juste' },
  acceptable: { tampon: 'Possible, mais…', classe: 'est-moyen', bloc: 'piege-terrain', titre: 'Ce qui serait mieux', suite: true, borne: 'moyen' },
  mauvais: { tampon: 'Pas encore.', classe: 'est-faux', bloc: 'diagnostic', titre: 'Pourquoi ce n\'est pas ça', suite: false, borne: 'faux' },
  danger: { tampon: 'Danger.', classe: 'est-danger', bloc: 'alerte-securite', titre: 'Pourquoi c\'est dangereux', suite: false, borne: 'faux' }
};

let promessePannes = null;

export function chargerPannes() {
  promessePannes ??= fetch('data/pannes.json')
    .then(rep => {
      if (!rep.ok) throw new Error(`data/pannes.json introuvable (HTTP ${rep.status})`);
      return rep.json();
    })
    .catch(err => {
      promessePannes = null;
      throw err;
    });
  return promessePannes;
}

export async function renderPanne({ vue, definirTitre, params }) {
  definirTitre('Cas de panne');
  const cas = await chargerPannes();
  const choisi = cas.find(c => c.id === params?.get('c'));
  if (choisi) jouer(vue, choisi, cas);
  else afficherListe(vue, cas, domaine(params?.get('d'))?.id ?? '');
}

function afficherListe(vue, tousLesCas, dom) {
  const cas = filtrerParDomaine(tousLesCas, dom);
  const suivi = statsMode('panne').elements;
  const etat = id => suivi[id]?.reussites ? '<span class="etat-lu">Sans faute</span>' : suivi[id]?.essais ? 'Faite' : 'À faire';
  vue.innerHTML = `
    ${frontispice({
      surtitre: 'Cas de panne',
      titre: 'Interventions',
      italique: 'pas à pas',
      chapo: 'Des pannes de terrain. À chaque étape, choisis ta démarche : la sécurité d\'abord, puis la méthode. Le tuteur explique chaque choix, et ce qu\'il aurait coûté.'
    })}
    ${barreDomaines({
      actif: dom,
      href: d => (d ? `#/entrainement/panne?d=${d}` : '#/entrainement/panne'),
      compter: d => filtrerParDomaine(tousLesCas, d).length
    })}
    ${DIFFICULTES.filter(d => cas.some(c => c.niveau === d.n)).map(d => `
      <section>
        <h3 class="section-titre"><span class="section-num">${d.romain}</span><span>${esc(d.nom)}</span></h3>
        ${cas.filter(c => c.niveau === d.n).map(c => `
          <a class="ligne ligne-panne" href="#/entrainement/panne?c=${encodeURIComponent(c.id)}">
            <div>
              <p class="ligne-meta">${pucesDomaines(c.domaines)}${etiquetteNiveau(c.niveau)}</p>
              <h2 class="ligne-titre">${esc(typo(c.titre))}</h2>
              ${(m => m ? `<p class="conseil">${esc(m)}</p>` : '')(conseilCas(stockage.lire(), c, tousLesCas))}
            </div>
            <span class="ligne-fin">${etat(c.id)}</span>
          </a>`).join('')}
      </section>`).join('')}`;
}

function jouer(vue, c, tousLesCas) {
  const diff = difficulte(c.niveau);
  const partie = {
    etape: 0,
    reussies: 0,      // étapes réussies du premier coup
    alertes: 0,       // choix dangereux
    resultats: [],    // état de chaque borne : 'juste' | 'moyen' | 'faux'
    tentes: new Set(),
    ordre: []
  };

  const afficherEtape = () => {
    const e = c.etapes[partie.etape];
    partie.tentes = new Set();
    partie.ordre = melanger(e.choix.map((_, i) => i)); // la bonne démarche n'est jamais toujours en A
    const bon = `<div class="bon-intervention"><p class="lecon-titre">Bon d'intervention</p><p>${esc(typo(c.contexte))}</p></div>`;
    vue.innerHTML = `
      <p class="niveau-seance">${etiquetteNiveau(c.niveau, { long: true })}</p>
      <header class="frontispice frontispice-panne">
        <p class="surtitre">Cas de panne</p>
        <p class="reco-domaines">${pucesDomaines(c.domaines)}</p>
        <h2 class="titre-chapitre">${esc(typo(c.titre))}</h2>
      </header>
      ${partie.etape === 0 ? bon : `<details class="approfondir"><summary>Relire le bon d'intervention</summary>${bon}</details>`}
      <div class="session-entete">
        <div class="session-chiffres">
          <span>Étape ${deuxChiffres(partie.etape + 1)}/${deuxChiffres(c.etapes.length)}</span>
          <span class="session-score">${partie.alertes ? `${partie.alertes} alerte${partie.alertes > 1 ? 's' : ''} sécurité` : ''}</span>
        </div>
        ${bornier(partie.etape, partie.resultats, c.etapes.length)}
      </div>
      <section class="etape">
        <p class="situation">${esc(typo(e.situation))}</p>
        <h3 class="question">${esc(typo(e.question))}</h3>
        <div class="choix">
          ${partie.ordre.map((i, rang) => `<button class="choix-btn" type="button" data-i="${i}"><span class="choix-touche">${'ABCD'[rang]}</span><span>${esc(typo(e.choix[i].texte))}</span></button>`).join('')}
        </div>
        <div id="retour-choix"></div>
      </section>`;
    vue.querySelectorAll('.choix-btn').forEach(b => b.addEventListener('click', () => choisir(Number(b.dataset.i))));
    window.scrollTo(0, 0);
  };

  const choisir = i => {
    const e = c.etapes[partie.etape];
    const ch = e.choix[i];
    const v = VERDICTS[ch.verdict];
    const premierChoix = partie.tentes.size === 0;
    partie.tentes.add(i);
    if (ch.verdict === 'danger') partie.alertes++;
    if (premierChoix) {
      partie.resultats.push(v.borne);
      if (ch.verdict === 'bon') partie.reussies++;
      vue.querySelectorAll('.borne')[partie.etape].className = `borne ${v.borne}`;
    }

    vue.querySelectorAll('.choix-btn').forEach(b => {
      const j = Number(b.dataset.i);
      b.disabled = true;
      if (j === i) b.classList.add(v.suite ? (ch.verdict === 'bon' ? 'juste' : 'moyen') : 'faux');
    });

    const derniere = partie.etape === c.etapes.length - 1;
    const libelle = v.suite ? (derniere ? 'Voir le diagnostic final' : 'Étape suivante') : 'Choisir une autre démarche';
    const zone = vue.querySelector('#retour-choix');
    zone.innerHTML = `
      <section class="explication ${v.classe}">
        <p class="verdict"><span class="tampon">${v.tampon}</span>${ch.verdict === 'danger' ? '<span class="gain">Alerte sécurité</span>' : ''}</p>
        <div class="${v.bloc}"><p class="lecon-titre">${v.titre}</p><p>${esc(typo(ch.explication))}</p></div>
        <div class="action-collee"><button id="suite" class="btn principal" type="button">${libelle}</button></div>
      </section>`;
    zone.querySelector('#suite').addEventListener('click', () => {
      if (!v.suite) return reessayer();
      partie.etape++;
      if (partie.etape < c.etapes.length) afficherEtape();
      else finir();
    });
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Après une démarche fausse : les choix déjà tentés restent barrés, les autres redeviennent possibles.
  const reessayer = () => {
    vue.querySelector('#retour-choix').innerHTML = '';
    vue.querySelectorAll('.choix-btn').forEach(b => {
      if (partie.tentes.has(Number(b.dataset.i))) { b.classList.add('faux'); b.disabled = true; }
      else b.disabled = false;
    });
    vue.querySelector('.etape .question').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const finir = () => {
    const parfait = partie.reussies === c.etapes.length && partie.alertes === 0;
    const xp = partie.reussies * diff.xp + (parfait ? BAREME.sessionParfaite : 0);
    if (xp) annoncerMontee(gagnerXP(xp));
    noterReponse('panne', c.id, parfait);
    noterSession('panne', partie.reussies, c.niveau);

    const cause = resume(c.conclusion.cause, MOTS_POURQUOI);
    const message = parfait ? 'Intervention exemplaire.' : partie.alertes ? 'Panne trouvée. Attention à la sécurité.' : 'Panne trouvée.';
    const prochain = tousLesCas[tousLesCas.indexOf(c) + 1];
    vue.innerHTML = `
      <section class="bilan">
        <p class="surtitre">Diagnostic final</p>
        <p class="bilan-score">${deuxChiffres(partie.reussies)}<small>/${deuxChiffres(c.etapes.length)}</small></p>
        <p class="bilan-message">${message}</p>
        <p class="bilan-xp">+${xp} XP · étapes réussies du premier coup${partie.alertes ? ` · ${partie.alertes} alerte${partie.alertes > 1 ? 's' : ''} sécurité` : ''}</p>
      </section>
      <section class="rapport-panne">
        <div class="essentiel">
          <div class="lecon"><p class="lecon-titre">La cause</p><p>${esc(typo(cause.court))}</p></div>
          ${blocRisque(c.conclusion.risque, { court: true })}
        </div>
        ${enSavoirPlus(`
          ${cause.complet ? '' : `<div class="lecon"><p class="lecon-titre">La cause, en détail</p><p>${esc(typo(c.conclusion.cause))}</p></div>`}
          <div class="lecon"><p class="lecon-titre">Le remède</p><p>${esc(typo(c.conclusion.remede))}</p></div>
          ${c.conclusion.piege ? `<div class="piege-terrain"><p class="lecon-titre">Le piège en armoire</p><p>${esc(typo(c.conclusion.piege))}</p></div>` : ''}
          <div class="${c.conclusion.piege ? 'lecon' : 'piege-terrain'}"><p class="lecon-titre">À retenir</p><p>${esc(typo(c.conclusion.lecon))}</p></div>
          ${risqueComplet(c.conclusion.risque)}
          ${ligneNorme(c.conclusion.norme)}
          ${c.verifie ? '' : '<p class="note-marge">Contenu pas encore validé par un formateur.</p>'}`, 'En savoir plus : remède, piège, à retenir, norme')}
      </section>
      <div class="actions pousse-bas">
        ${prochain ? `<a class="btn principal" href="#/entrainement/panne?c=${encodeURIComponent(prochain.id)}">Cas suivant</a>` : ''}
        <button id="recommencer" class="btn${prochain ? '' : ' principal'}" type="button">Refaire ce cas</button>
        <a class="btn" href="#/entrainement/panne">Tous les cas</a>
      </div>`;
    vue.querySelector('#recommencer').addEventListener('click', () => jouer(vue, c, tousLesCas));
    window.scrollTo(0, 0);
  };

  afficherEtape();
}
