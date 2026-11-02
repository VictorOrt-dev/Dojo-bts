// Banc de mesure virtuel : un départ moteur avec une panne cachée tirée au sort.
// Tu choisis l'instrument, la fonction et l'endroit où poser les pointes ; la lecture est calculée par js/circuit.js
// à partir de l'état réel du circuit. Chaque geste coûte du temps simulé (pas de chrono réel) ;
// les gestes dangereux sont signalés. Le contenu vient de data/banc-depart-moteur.json.

import { tension, resistance } from './circuit.js';
import { gagnerXP, noterReponse, noterSession } from './xp.js';
import { annoncerMontee } from './entrainement.js';
import { frontispice, typo as typoBase } from './mise-en-page.js';
import { parmi } from './hasard.js';
import { esc } from './util.js';
import { pucesDomaines } from './domaines.js';
import { blocRisque, risqueComplet, ligneNorme, enSavoirPlus, resume, MOTS_POURQUOI } from './tuteur.js';
import * as stockage from './storage.js';

// Repères de borne (« X1 : 1 », « KM1 : 13 ») : jamais coupés en fin de ligne.
const typo = t => typoBase(t).replace(/\b([A-Z][A-Z0-9]*)\u202F: (?=[0-9A-Z])/g, '$1\u202F:\u00A0');

const FONCTIONS = [
  { id: 'hz', libelle: 'V~', aide: 'Multimètre classique (haute impédance)' },
  { id: 'loz', libelle: 'V~ LoZ', aide: 'Basse impédance : supprime les tensions fantômes' },
  { id: 'ohm', libelle: 'Ω', aide: 'Résistance / continuité, circuit consigné' }
];
// Visite guidée : les 3 gestes qui font comprendre le banc à un débutant.
const GUIDE = {
  1: "Ouvre l'appareil de mesure (barre du bas), choisis tes deux pointes, puis touche « Mesurer » en V~.",
  2: "Même mesure en V~ LoZ : si la valeur s'effondre, c'était une tension fantôme.",
  3: "Onglet « Actions » › « Consigner le départ » : avant tout Ω ou tout démontage.",
  fin: "Les trois gestes de base sont acquis. À toi de trouver la panne."
};
const PINCE = [{ id: 0, libelle: 'L1 (borne U)' }, { id: 1, libelle: 'L2 (borne V)' }, { id: 2, libelle: 'L3 (borne W)' }];
const FUSIBLES = [{ id: 'fu1', libelle: 'FU1 (commande)' }, { id: 'fu-l1', libelle: 'Q1 · L1' }, { id: 'fu-l2', libelle: 'Q1 · L2' }, { id: 'fu-l3', libelle: 'Q1 · L3' }];
const nb = (x, d = 1) => x.toLocaleString('fr-FR', { maximumFractionDigits: d });
const horloge = m => `${String(Math.floor(m / 60)).padStart(2, '0')} h ${String(m % 60).padStart(2, '0')}`;

let promesse = null;
function chargerBanc() {
  promesse ??= fetch('data/banc-depart-moteur.json')
    .then(r => { if (!r.ok) throw new Error(`data/banc-depart-moteur.json introuvable (HTTP ${r.status})`); return r.json(); })
    .catch(err => { promesse = null; throw err; });
  return promesse;
}

let derniereCasse = null;          // évite de retomber deux fois de suite sur la même panne
let interventionCourante = null;   // utilisée par les tests automatisés
export const interventionEnCours = () => interventionCourante;

export async function renderBanc({ vue, definirTitre, params }) {
  definirTitre('Banc de mesure');
  const banc = await chargerBanc();
  // ?panne=<id> force une panne précise (utilisé par les tests automatisés) ; sinon tirage au sort.
  const panne = banc.pannes.find(p => p.id === params?.get('panne')) ?? parmi(banc.pannes.filter(p => p.id !== derniereCasse));
  derniereCasse = panne.id;
  demarrer(vue, banc, panne);
}

function demarrer(vue, banc, panne) {
  const etat = interventionCourante = {
    panne: panne.id,
    consigne: false,
    km: false,
    marche: false,                 // un collègue maintient le bouton Marche
    relais: !!panne.relaisDeclenche,
    ouverts: new Set(panne.ouvre),
    minutes: 0,
    dangers: [],
    remplacements: [],
    journal: [],
    essaisBloques: 0,
    moteur: 'arrêté',
    resolu: false,
    onglet: 'multimetre',
    consoleOuverte: false,         // l'appareil de mesure arrive replié : le contenu d'abord
    mesure: { fonction: 'hz', rouge: 'c0', noir: 'n0', lecture: null },
    pince: 1,
    dernier: null,
    faits: new Set(),        // gestes accomplis, pour suivre la démarche (indices)
    indices: 0,              // nombre d'indices utilisés (rapport et XP)
    indicesVus: new Set(),
    suggestion: null,        // action mise en évidence par un indice
    selFusible: 'fu1',
    selPiece: null
  };
  const noeuds = banc.noeuds.filter(n => !n.interne);
  const label = id => banc.noeuds.find(n => n.id === id)?.label ?? id;

  // Éléments conducteurs dans l'état actuel du départ.
  const fermes = (e = etat) => banc.elements.filter(el => !e.ouverts.has(el.id) && (
    !el.commande ||
    (el.commande === 'q1' && !e.consigne) ||
    (el.commande === 'km' && e.km) ||
    (el.commande === 'marche' && e.marche) ||
    (el.commande === 'relais' && !e.relais)));
  const lire = (a, b, mode, e = etat) => tension(banc, fermes(e), a, b, mode);
  const voyantH1 = () => lire('c1', 'n0', 'loz').valeur > 150;

  // Ce que veut dire une lecture en volts, en une phrase.
  const lireEnClair = (m, amont) => {
    if (m.instable && m.valeur > 2) return 'L\'afficheur hésite : conducteur en l\'air ? Refais la mesure en LoZ.';
    if (amont) return 'Attention : l\'amont du sectionneur reste sous tension, même consigné.';
    if (m.valeur >= 300) return '≈ 400 V : la tension entre deux phases.';
    if (m.valeur >= 180) return '≈ 230 V : la tension arrive bien entre ces deux points.';
    if (m.valeur < 5) return '0 V : pas de tension entre ces deux points.';
    return 'Tension anormale : ni 0, ni 230, ni 400 V.';
  };

  const noter = (texte, minutes, type = 'info') => {
    etat.minutes += minutes;
    etat.journal.push({ t: etat.minutes, texte, type });
  };
  const signaler = (texte, type = 'info', titre = '') => { etat.dernier = { texte, type, titre }; };
  const danger = (titre, texte, minutes = 0) => {
    etat.dangers.push(titre);
    noter(`⚠ ${titre}`, minutes, 'danger');
    signaler(texte, 'danger', titre);
  };

  // Appui sur Marche (par toi ou par le collègue). Renvoie les courants de ligne pendant l'essai.
  const essai = () => {
    const bobineOk = !etat.ouverts.has('bobine');
    const appel = lire('x2', 'n0', 'hz', { ...etat, marche: true });
    if (!bobineOk || appel.instable || appel.valeur < 150) {
      etat.km = false;
      return { courants: [0, 0, 0], texte: bobineOk ? 'Rien ne se passe : le contacteur ne colle pas.' : 'Rien ne se passe : le contacteur ne colle pas, aucun claquement.' };
    }
    etat.km = true;
    // Une phase manque si sa cartouche est fondue. (Contacteur fermé, la phase coupée est réalimentée par les
    // enroulements du moteur : un voltmètre en aval y lirait une tension de retour trompeuse.)
    const phases = ['fu-l1', 'fu-l2', 'fu-l3'].map(f => !etat.ouverts.has(f));
    if (phases.every(Boolean)) {
      const maintien = lire('x2', 'n0', 'hz');
      if (maintien.valeur > 150 && !maintien.instable) {
        etat.moteur = 'tourne';
        if (etat.ouverts.size === 0) etat.resolu = true;
        return { courants: [8.1, 8.3, 8.0], texte: 'Le contacteur colle et reste maintenu : le moteur démarre et tourne normalement.' };
      }
      etat.km = false;
      return { courants: [0, 0, 0], texte: 'Le contacteur colle tant que Marche est appuyé, puis retombe : l\'auto-maintien ne tient pas.' };
    }
    etat.essaisBloques++;
    etat.km = false;
    etat.relais = true;
    etat.moteur = 'arrêté';
    const texte = 'Le contacteur colle, le moteur grogne sans démarrer… au bout de 8 s, le relais thermique déclenche et le contacteur retombe.';
    if (etat.essaisBloques === 3) danger('Moteur relancé bloqué à répétition', `${texte} C'est le troisième essai moteur bloqué : le bobinage chauffe à chaque fois, il sent le chaud. On arrête de relancer et on cherche.`);
    return { courants: phases.map(ok => (ok ? 67 : 0)), texte };
  };

  const actions = {
    mesurer() {
      const { fonction, rouge, noir } = etat.mesure;
      if (fonction === 'ohm') {
        if (!etat.consigne) {
          etat.mesure.lecture = null;
          return danger('Ohmmètre sur un circuit non consigné', 'Une mesure de résistance se fait hors tension : circuit consigné, absence de tension vérifiée. Sous tension, la lecture est fausse et tu grilles le fusible du multimètre (ou pire). Il faut aller en chercher un neuf.', 15);
        }
        if (['L1', 'L2', 'L3'].some(n => n === rouge || n === noir)) {
          etat.mesure.lecture = null;
          return danger('Ohmmètre sur l\'amont du sectionneur', 'L\'amont de Q1 reste sous tension même consigné : jamais d\'ohmmètre sur les bornes d\'arrivée. Fusible du multimètre grillé.', 15);
        }
        const r = resistance(banc, fermes(), rouge, noir);
        etat.mesure.lecture = { valeur: r === Infinity ? 'OL' : r < 1 ? nb(r, 2) : r < 1000 ? nb(r, 0) : nb(r / 1000, 2), unite: r !== Infinity && r >= 1000 ? 'kΩ' : 'Ω',
          note: r === Infinity ? 'OL : circuit ouvert, le courant ne passe pas entre ces deux points.' : r < 1 ? 'Bip : continuité, le courant passe.' : 'Résistance d\'un récepteur (bobine, voyant, enroulement).' };
        noter(`Ω ${label(rouge)} → ${label(noir)} : ${etat.mesure.lecture.valeur} ${etat.mesure.lecture.unite}`, banc.durees.mesure);
      } else {
        const m = lire(rouge, noir, fonction);
        const amont = etat.consigne && ['L1', 'L2', 'L3'].some(n => n === rouge || n === noir) && m.valeur > 50;
        etat.mesure.lecture = { valeur: nb(m.valeur, 0), unite: 'V~', note: lireEnClair(m, amont) };
        noter(`${fonction === 'loz' ? 'V~ LoZ' : 'V~'} ${label(rouge)} → ${label(noir)} : ${etat.mesure.lecture.valeur} V${m.instable && m.valeur > 2 ? ' (instable)' : ''}`, banc.durees.mesure);
      }
      signaler(null);
    },
    pince() {
      if (etat.consigne) return signaler('Le départ est consigné : pas d\'essai possible. Déconsigne d\'abord.', 'info');
      const r = essai();
      const i = r.courants[etat.pince];
      noter(`Pince sur ${PINCE[etat.pince].libelle} pendant un essai : ${nb(i, 1)} A`, banc.durees.pince);
      signaler(`${r.texte} La pince sur ${PINCE[etat.pince].libelle} indique ${nb(i, 1)} A ${i > 30 ? '(courant de démarrage bloqué : plaque 11 A)' : ''}`.trim(), r.courants.some(x => x > 30) ? 'alerte' : 'info');
    },
    essai() {
      if (etat.consigne) return signaler('Le départ est consigné : pas d\'essai possible. Déconsigne d\'abord.', 'info');
      const r = essai();
      noter(`Essai de démarrage : ${r.texte}`, banc.durees.essai);
      signaler(r.texte, etat.resolu ? 'ok' : 'info');
    },
    collegue() {
      if (etat.consigne) return signaler('Le départ est consigné : appuyer sur Marche ne sert à rien.', 'info');
      etat.marche = !etat.marche;
      noter(etat.marche ? 'Un collègue maintient Marche enfoncé' : 'Le collègue relâche Marche', banc.durees.collegue);
      if (etat.marche) {
        const r = essai();
        signaler(`Un collègue maintient Marche. ${r.texte}`, 'info');
      } else signaler('Le collègue relâche Marche.', 'info');
    },
    rearmer() {
      const etait = etat.relais && !etat.ouverts.has('f2-95');
      if (etat.relais) etat.relais = false;
      noter(etait ? 'Relais thermique réarmé' : 'Réarmement du relais : sans effet', banc.durees.rearmer);
      signaler(etait ? 'Le relais thermique était déclenché : il est réarmé.' : 'Le relais n\'était pas déclenché : le bouton de réarmement ne change rien.', 'info');
    },
    consigner() {
      if (etat.consigne) {
        etat.consigne = false;
        noter('Déconsignation : Q1 refermé', banc.durees.deconsigner);
        return signaler('Départ déconsigné : Q1 est refermé, l\'installation est de nouveau sous tension.', 'info');
      }
      etat.consigne = true; etat.km = false; etat.marche = false; etat.moteur = 'arrêté';
      noter('Consignation : Q1 ouvert et cadenassé, absence de tension vérifiée', banc.durees.consigner);
      signaler('Départ consigné : Q1 ouvert et cadenassé, VAT vérifié. L\'amont du sectionneur (arrivée L1, L2, L3) reste sous tension.', 'ok');
    },
    controlerFusible(id) {
      const f = FUSIBLES.find(x => x.id === id);
      if (!etat.consigne) return danger('Fusible retiré sans consignation', `Retirer une cartouche sous tension expose aux pièces nues et peut créer un arc si un courant circule. On consigne d'abord.`, 3);
      const fondu = etat.ouverts.has(id);
      noter(`Fusible ${f.libelle} sorti et contrôlé : ${fondu ? 'OL (fondu)' : '0,0 Ω (bon)'}`, 3);
      signaler(`Fusible ${f.libelle}, sorti de son support : ${fondu ? 'OL, il est fondu.' : '0,0 Ω, il est bon.'}`, 'info');
    },
    remplacer(id) {
      const c = banc.composants.find(x => x.id === id);
      if (!etat.consigne) return danger('Remplacement sans consignation', `On ne démonte jamais une pièce sous tension. Consigne le départ, vérifie l'absence de tension, puis remplace : ${c.libelle}.`, 2);
      const utile = c.repare.some(r => panne.ouvre.includes(r));
      c.repare.forEach(r => etat.ouverts.delete(r));
      if (id === 'relais') etat.relais = false;
      etat.remplacements.push({ id, libelle: c.libelle, utile });
      noter(`Remplacement : ${c.libelle} (${c.duree} min)`, c.duree, utile ? 'info' : 'alerte');
      signaler(`${c.libelle} remplacé${id === 'fusibles' ? 'es' : ''}. Déconsigne et fais un essai pour vérifier.`, 'info');
    }
  };

  const afficher = () => {
    if (etat.resolu || etat.abandon) return debrief();
    const { fonction, rouge, noir, lecture } = etat.mesure;
    const options = sel => {
      const zones = [...new Set(noeuds.map(n => n.zone))];
      return zones.map(z => `<optgroup label="${esc(z)}">${noeuds.filter(n => n.zone === z).map(n => `<option value="${n.id}"${n.id === sel ? ' selected' : ''}>${esc(n.label)}</option>`).join('')}</optgroup>`).join('');
    };
    const pastille = (libelle, valeur, etatPastille) => `<li class="pastille ${etatPastille}"><span>${libelle}</span><b>${valeur}</b></li>`;
    const dernier = etat.dernier && etat.dernier.texte
      ? `<div class="${etat.dernier.type === 'danger' ? 'alerte-securite' : etat.dernier.type === 'ok' ? 'lecon' : etat.dernier.type === 'indice' ? 'lecon indice' : etat.dernier.type === 'alerte' ? 'diagnostic' : 'bon-intervention resultat-action'}">${etat.dernier.titre ? `<p class="lecon-titre">${etat.dernier.type === 'danger' ? 'Danger : ' : ''}${esc(etat.dernier.titre)}</p>` : ''}<p>${esc(typo(etat.dernier.texte))}</p></div>`
      : '';

    const guideHtml = guide ? `
      <div class="guide-banc" role="status">
        <p><span class="guide-etape">${guide === 'fin' ? 'Visite terminée' : `Visite ${guide}/3`}</span> ${esc(typo(GUIDE[guide]))}</p>
        ${guide === 'fin' ? '' : '<button type="button" class="guide-passer">Passer</button>'}
      </div>` : '';

    vue.innerHTML = `
      <header class="frontispice frontispice-banc">
        <p class="surtitre">Banc de mesure · panne cachée</p>
        <h2 class="titre-chapitre">Départ moteur <em>direct</em></h2>
      </header>
      <p class="reco-domaines">${pucesDomaines(banc.domaines)}</p>
      <p class="mission"><strong>Ta mission :</strong> trouver la pièce en panne, la remplacer, puis faire redémarrer le moteur.</p>
      <details class="approfondir mode-emploi"><summary>Comment ça marche ?</summary>
        <ol class="etapes-banc">
          <li><strong>Ouvre l'appareil de mesure</strong> : la barre en bas de l'écran. Touche-la pour le déplier ou le replier.</li>
          <li><strong>Mesure sous tension</strong> (onglet Multimètre) : choisis deux points, touche « Mesurer ». On suit le courant depuis la source : là où la tension disparaît, la panne est juste avant.</li>
          <li><strong>Consigne</strong> (onglet Actions) avant de mesurer en Ω ou de démonter quoi que ce soit.</li>
          <li><strong>Confirme</strong> à l'ohmmètre ou en contrôlant le fusible, puis <strong>remplace</strong> la pièce.</li>
          <li><strong>Déconsigne et fais un essai</strong> : si le moteur tourne, c'est gagné. Le rapport compte ton temps, tes alertes sécurité et les pièces changées pour rien.</li>
        </ol>
        <p class="discret petit">Bloqué ? Le bouton « Indice » place les pointes pour toi et explique pourquoi.</p>
      </details>
      <p class="signale-court"><strong>Signalé :</strong> ${esc(typo(panne.symptome))}</p>
      <details class="approfondir bon-details"${etat.bonOuvert ?? true ? ' open' : ''}>
        <summary>Bon d'intervention</summary>
        <div class="bon-intervention"><p>${esc(typo(banc.description))}</p></div>
      </details>

      <div class="tableau-bord">
        <p class="horloge"><span>Temps d'intervention</span><b class="mono">${horloge(etat.minutes)}</b></p>
        <p class="alertes ${etat.dangers.length ? 'actif' : ''}"><span>Alertes sécurité</span><b class="mono">${etat.dangers.length}</b></p>
      </div>

      <ul class="etat-armoire">
        ${pastille('Q1', etat.consigne ? 'consigné' : 'fermé', etat.consigne ? 'neutre' : 'ok')}
        ${pastille('Voyant H1', voyantH1() ? 'allumé' : 'éteint', voyantH1() ? 'ok' : 'neutre')}
        ${pastille('KM1', etat.km ? 'collé' : 'retombé', etat.km ? 'ok' : 'neutre')}
        ${pastille('Relais F2', etat.relais ? 'déclenché' : 'normal', etat.relais ? 'alerte' : 'neutre')}
        ${pastille('Moteur', etat.moteur, etat.moteur === 'tourne' ? 'ok' : 'neutre')}
        ${etat.marche ? pastille('Marche', 'maintenu', 'alerte') : ''}
      </ul>

      <details class="approfondir"><summary>Voir le schéma</summary><div class="schema"><img src="img/banc/depart-moteur.svg" alt="Schéma du départ moteur : puissance à gauche, commande à droite"></div></details>

      ${etat.onglet === 'multimetre' ? `<p class="aide aide-fonction">${esc(FONCTIONS.find(f => f.id === fonction).libelle)} : ${esc(FONCTIONS.find(f => f.id === fonction).aide)}</p>` : ''}
      <div id="resultat-banc">${dernier}</div>

      <details class="approfondir journal"><summary>Journal d'intervention (${etat.journal.length})</summary>
        <ol>${etat.journal.map(j => `<li class="${j.type}"><span class="mono">${horloge(j.t)}</span> ${esc(typo(j.texte))}</li>`).join('') || '<li>Rien pour l\'instant.</li>'}</ol>
      </details>

      <section class="console-banc${etat.consoleOuverte ? ' ouverte' : ''}${animerOuverture ? ' s-ouvre' : ''}" aria-label="Appareil de mesure">
        ${guideHtml}
        <div class="poignee-ligne">
          <button type="button" class="poignee-console" aria-expanded="${etat.consoleOuverte}" aria-controls="corps-console">
            <span class="poignee-trait" aria-hidden="true"></span>
            <span class="poignee-titre">Appareil de mesure</span>
            <span class="poignee-lecture mono">${lecture ? `${esc(lecture.valeur)} ${esc(lecture.unite)}` : ''}</span>
            <span class="poignee-sens">${etat.consoleOuverte ? 'Replier' : 'Ouvrir'}</span>
          </button>
          <button type="button" class="bouton-indice">Indice</button>
        </div>
        <div id="corps-console" class="corps-console"${etat.consoleOuverte ? '' : ' hidden'}>
        <nav class="segments onglets-banc" aria-label="Instruments">
          ${[['multimetre', 'Multimètre'], ['pince', 'Pince'], ['actions', 'Actions']].map(([id, l]) => `<a href="#" data-onglet-banc="${id}"${etat.onglet === id ? ' aria-current="true"' : ''}>${l}</a>`).join('')}
        </nav>

        ${etat.onglet === 'multimetre' ? `
          <div class="instrument">
            <div class="selecteur fonctions" role="group" aria-label="Fonction">
              ${FONCTIONS.map(f => `<button type="button" data-fonction="${f.id}" aria-pressed="${f.id === fonction}">${f.libelle}</button>`).join('')}
            </div>
            <label class="pointe rouge"><span>Rouge</span><select id="rouge" aria-label="Pointe rouge">${options(rouge)}</select></label>
            <label class="pointe noire"><span>COM</span><select id="noir" aria-label="Pointe noire (COM)">${options(noir)}</select></label>
            <div class="lecture-ligne">
              <div class="nixie"><output id="lecture" class="nixie-valeur">${lecture ? esc(lecture.valeur) : ''}</output><span class="unite">${lecture ? esc(lecture.unite) : fonction === 'ohm' ? 'Ω' : 'V~'}</span></div>
              <button id="mesurer" class="btn principal" type="button">Mesurer</button>
            </div>
            ${lecture?.note ? `<p class="note-mesure${/hésite|Attention/.test(lecture.note) ? ' alerte' : ''}">${esc(lecture.note)}</p>` : ''}
          </div>` : ''}

        ${etat.onglet === 'pince' ? `
          <div class="instrument">
            <p class="aide">Courant d'un conducteur pendant un essai de démarrage.</p>
            <div class="selecteur trois" role="group" aria-label="Conducteur">
              ${PINCE.map(c => `<button type="button" data-pince="${c.id}" aria-pressed="${c.id === etat.pince}">${c.libelle}</button>`).join('')}
            </div>
            <button id="pince" class="btn principal" type="button">Lancer un essai, pince en place</button>
          </div>` : ''}

        ${etat.onglet === 'actions' ? `
          <div class="instrument actions-banc">
            <button class="btn ${etat.consigne ? '' : 'principal'}" type="button" data-action="consigner"${etat.suggestion === 'consigner' ? ' data-suggere="true"' : ''}>${etat.consigne ? 'Déconsigner (refermer Q1)' : 'Consigner le départ (Q1 + VAT)'}</button>
            <button class="btn" type="button" data-action="essai"${etat.suggestion === 'essai' ? ' data-suggere="true"' : ''}>Essai : appuyer sur Marche</button>
            <button class="btn" type="button" data-action="collegue"${etat.suggestion === 'collegue' ? ' data-suggere="true"' : ''}>${etat.marche ? 'Le collègue relâche Marche' : 'Un collègue maintient Marche'}</button>
            <button class="btn" type="button" data-action="rearmer"${etat.suggestion === 'rearmer' ? ' data-suggere="true"' : ''}>Réarmer le relais thermique</button>
            <div class="ligne-action">
              <select id="fusible" aria-label="Fusible à contrôler">${FUSIBLES.map(f => `<option value="${f.id}"${f.id === etat.selFusible ? ' selected' : ''}>${esc(f.libelle)}</option>`).join('')}</select>
              <button class="btn" type="button" data-action="controlerFusible"${etat.suggestion === 'controlerFusible' ? ' data-suggere="true"' : ''}>Contrôler</button>
            </div>
            <div class="ligne-action">
              <select id="piece" aria-label="Pièce à remplacer">${banc.composants.map(c => `<option value="${c.id}"${c.id === etat.selPiece ? ' selected' : ''}>${esc(c.libelle)} · ${c.duree} min</option>`).join('')}</select>
              <button class="btn" type="button" data-action="remplacer"${etat.suggestion === 'remplacer' ? ' data-suggere="true"' : ''}>Remplacer</button>
            </div>
            <button class="btn danger" type="button" data-action="abandonner">Abandonner et voir la panne</button>
          </div>` : ''}
        </div>
      </section>`;
    animerOuverture = false;

    // La console est fixée en bas : la page réserve sa hauteur pour que rien ne passe dessous.
    vue.classList.add('avec-console');
    const console_ = vue.querySelector('.console-banc');
    vue.style.setProperty('--console-h', `${console_.offsetHeight}px`);

    // Le bon d'intervention se replie dès le premier geste ; l'utilisateur peut le rouvrir (son choix est gardé).
    // (L'ouverture initiale déclenche aussi « toggle » : on ne retient que les changements faits par l'utilisateur.)
    vue.querySelector('.bon-details').addEventListener('toggle', ev => {
      if (ev.target.open !== (etat.bonOuvert ?? true)) etat.bonOuvert = ev.target.open;
    });
    const geste = () => { if (etat.bonOuvert === undefined) etat.bonOuvert = false; };

    // Le contenu ne doit jamais rester défilé dans le vide : sa fin se pose au plus bas juste au-dessus de la console.
    const fin = vue.querySelector('.journal').getBoundingClientRect().bottom + scrollY;
    const visible = innerHeight - console_.getBoundingClientRect().top;
    const maxUtile = Math.max(0, fin - (innerHeight - visible) + 12);
    if (scrollY > maxUtile) scrollTo(0, maxUtile);

    vue.querySelector('.guide-passer')?.addEventListener('click', () => { terminerGuide(); afficher(); });
    vue.querySelector('.poignee-console').addEventListener('click', () => {
      etat.consoleOuverte = !etat.consoleOuverte;
      animerOuverture = etat.consoleOuverte;
      afficher();
    });
    vue.querySelector('.bouton-indice').addEventListener('click', () => {
      if (!etat.consoleOuverte) { etat.consoleOuverte = true; animerOuverture = true; }
      indice(); apres();
    });
    vue.querySelector('#fusible')?.addEventListener('change', ev => { etat.selFusible = ev.target.value; });
    vue.querySelector('#piece')?.addEventListener('change', ev => { etat.selPiece = ev.target.value; });
    vue.querySelectorAll('[data-onglet-banc]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); etat.onglet = a.dataset.ongletBanc; afficher(); }));
    vue.querySelectorAll('[data-fonction]').forEach(b => b.addEventListener('click', () => { etat.mesure.fonction = b.dataset.fonction; etat.mesure.lecture = null; afficher(); }));
    vue.querySelectorAll('[data-pince]').forEach(b => b.addEventListener('click', () => { etat.pince = Number(b.dataset.pince); afficher(); }));
    vue.querySelector('#rouge')?.addEventListener('change', ev => { etat.mesure.rouge = ev.target.value; etat.mesure.lecture = null; afficher(); });
    vue.querySelector('#noir')?.addEventListener('change', ev => { etat.mesure.noir = ev.target.value; etat.mesure.lecture = null; afficher(); });
    const apres = () => { afficher(); vue.querySelector('#resultat-banc')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    vue.querySelector('#mesurer')?.addEventListener('click', () => {
      geste();
      actions.mesurer();
      constater('mesurer');
      avancerGuide({ mesure: etat.mesure.fonction });
      afficher();
    });
    vue.querySelector('#pince')?.addEventListener('click', () => { geste(); actions.pince(); apres(); });
    vue.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.action;
      geste();
      if (a === 'abandonner') { etat.abandon = true; return afficher(); }
      const detail = a === 'controlerFusible' ? vue.querySelector('#fusible').value : a === 'remplacer' ? vue.querySelector('#piece').value : null;
      if (a === 'controlerFusible') actions.controlerFusible(detail);
      else if (a === 'remplacer') actions.remplacer(detail);
      else actions[a]();
      if (etat.suggestion === a) etat.suggestion = null;
      constater(a, detail);
      avancerGuide({ action: a });
      apres();
    }));
  };

  // ---------- Indices : la démarche d'un pro (pistes de la panne), étape par étape ----------
  const utile = () => etat.remplacements.some(r => r.utile);
  const cleMesure = (f, a, b) => [`m:${f}:${a}:${b}`, `m:${f}:${b}:${a}`];
  // Enregistre ce qui vient d'être fait (appelé après chaque geste).
  const constater = (geste, detail) => {
    const f = etat.faits;
    if (geste === 'mesurer' && etat.mesure.lecture) f.add(cleMesure(etat.mesure.fonction, etat.mesure.rouge, etat.mesure.noir)[0]);
    if (geste === 'consigner') f.add(etat.consigne ? 'consigne' : utile() ? 'deconsigne-apres' : 'deconsigne');
    if (geste === 'controlerFusible' && etat.consigne) f.add(`f:${detail}`);
    if (geste === 'remplacer' && etat.consigne) f.add(`r:${detail}`);
    if (geste === 'collegue' && etat.marche) f.add('marche');
    if (geste === 'rearmer' && !etat.relais && utile()) f.add('rearme-apres');
  };
  const fait = etape => {
    const f = etat.faits;
    if (etape.mesure) return cleMesure(...etape.mesure).some(k => f.has(k));
    if (etape.consigner) return f.has('consigne');
    if (etape.controle) return f.has(`f:${etape.controle}`);
    if (etape.remplacer) return f.has(`r:${etape.remplacer}`);
    if (etape.deconsigner) return f.has('deconsigne-apres');
    if (etape.collegue) return f.has('marche');
    if (etape.rearmer) return f.has('rearme-apres') || (!etat.relais && utile() && f.has('deconsigne-apres'));
    if (etape.essai) return etat.resolu;
    return true;
  };
  const indice = () => {
    const index = (panne.pistes ?? []).findIndex(e => !fait(e));
    const etape = panne.pistes?.[index];
    if (!etape) return signaler('Tu as fait tout ce qu\'il fallait : lance un essai pour vérifier.', 'indice', 'Indice');
    if (!etat.indicesVus.has(index)) { etat.indicesVus.add(index); etat.indices++; }
    etat.suggestion = null;
    // Une mesure de tension se fait départ en service ; une mesure en Ω, départ consigné.
    if (etape.mesure && etape.mesure[0] !== 'ohm' && etat.consigne) {
      etat.onglet = 'actions'; etat.suggestion = 'consigner';
      return signaler('Pour mesurer une tension, le départ doit être en service : déconsigne d\'abord (onglet Actions).', 'indice', 'Indice');
    }
    if (etape.mesure) {
      const [fonction, rouge, noir] = etape.mesure;
      etat.onglet = 'multimetre';
      etat.mesure = { fonction, rouge, noir, lecture: null };
      return signaler(`${etape.pourquoi} Pointes placées : rouge sur « ${label(rouge)} », COM sur « ${label(noir)} ». Touche « Mesurer ».`, 'indice', 'Indice');
    }
    etat.onglet = 'actions';
    if (etape.consigner || etape.deconsigner) etat.suggestion = 'consigner';
    else if (etape.controle) { etat.suggestion = 'controlerFusible'; etat.selFusible = etape.controle; }
    else if (etape.remplacer) { etat.suggestion = 'remplacer'; etat.selPiece = etape.remplacer; }
    else if (etape.collegue) etat.suggestion = 'collegue';
    else if (etape.rearmer) etat.suggestion = 'rearmer';
    else if (etape.essai) etat.suggestion = 'essai';
    signaler(`${etape.pourquoi} Le bon bouton est mis en évidence dans l'onglet Actions.`, 'indice', 'Indice');
  };

  // ---------- Visite guidée (premier passage au banc) : 3 gestes ----------
  let animerOuverture = false;   // petite animation seulement au moment où l'on déplie
  let guide = stockage.lire().preferences?.visiteBanc ? null : 1;
  function terminerGuide() {
    guide = null;
    stockage.modifier(e => { e.preferences = { ...e.preferences, visiteBanc: true }; });
  }
  function avancerGuide({ mesure, action }) {
    if (guide === 'fin') guide = null;
    if (guide === 1 && mesure === 'hz' && etat.mesure.lecture) guide = 2;
    else if (guide === 2 && mesure === 'loz' && etat.mesure.lecture) guide = 3;
    else if (guide === 3 && action === 'consigner' && etat.consigne) { terminerGuide(); guide = 'fin'; }
  }

  const debrief = () => {
    vue.classList.remove('avec-console');
    const causeCourte = resume(panne.cause, MOTS_POURQUOI);
    const inutiles = etat.remplacements.filter(r => !r.utile);
    const rapide = etat.minutes <= Math.round(panne.reference * 1.3);
    const parfait = etat.resolu && !etat.dangers.length && !inutiles.length && !etat.indices && rapide;
    let xp = 0;
    if (etat.resolu) {
      xp = Math.max(10, 50 - 10 * inutiles.length - 15 * etat.dangers.length - 5 * etat.indices) + (parfait ? 20 : 0);
      annoncerMontee(gagnerXP(xp));
    }
    noterReponse('banc', panne.id, parfait);
    noterSession('banc', etat.resolu ? 1 : 0);
    const message = !etat.resolu ? 'Intervention abandonnée.' : parfait ? 'Diagnostic de pro.' : etat.dangers.length ? 'Réparé, mais pas en sécurité.' : 'Panne réparée.';
    vue.innerHTML = `
      <section class="bilan">
        <p class="surtitre">Rapport d'intervention</p>
        <p class="bilan-score horloge-bilan">${horloge(etat.minutes)}</p>
        <p class="bilan-message">${message}</p>
        <p class="bilan-xp">${etat.resolu ? `+${xp} XP · ` : ''}référence d'un technicien confirmé : ${horloge(panne.reference)}</p>
      </section>
      <ul class="stats">
        <li><span>Alertes sécurité</span><span class="mono">${etat.dangers.length}</span></li>
        <li><span>Pièces changées pour rien</span><span class="mono">${inutiles.length}</span></li>
        <li><span>Mesures et actions</span><span class="mono">${etat.journal.length}</span></li>
        <li><span>Indices utilisés</span><span class="mono">${etat.indices}</span></li>
      </ul>
      ${etat.dangers.length ? `<div class="alerte-securite"><p class="lecon-titre">Gestes dangereux</p><p>${etat.dangers.map(d => esc(d)).join(' · ')}</p></div>` : ''}
      ${inutiles.length ? `<div class="diagnostic"><p class="lecon-titre">Fausses pistes payées en pièces</p><p>${inutiles.map(r => esc(r.libelle)).join(' · ')}</p></div>` : ''}
      <p class="reco-domaines">${pucesDomaines(panne.domaines)}</p>
      <div class="essentiel">
        <div class="lecon"><p class="lecon-titre">La panne</p><p>${esc(typo(causeCourte.court))}</p></div>
        ${blocRisque(panne.risque, { court: true })}
      </div>
      ${enSavoirPlus(`
        ${causeCourte.complet ? '' : `<div class="lecon"><p class="lecon-titre">La panne, en détail</p><p>${esc(typo(panne.cause))}</p></div>`}
        <div class="lecon"><p class="lecon-titre">La démarche d'un pro</p><p>${esc(typo(panne.methode))}</p></div>
        <div class="piege-terrain"><p class="lecon-titre">Le piège de ce cas</p><p>${esc(typo(panne.piege))}</p></div>
        ${risqueComplet(panne.risque)}
        ${ligneNorme(panne.norme)}`, 'En savoir plus : la démarche d\'un pro, le piège, la norme')}
      <details class="approfondir journal"><summary>Ton journal d'intervention (${etat.journal.length})</summary>
        <ol>${etat.journal.map(j => `<li class="${j.type}"><span class="mono">${horloge(j.t)}</span> ${esc(typo(j.texte))}</li>`).join('')}</ol>
      </details>
      <div class="actions pousse-bas">
        <button id="autre" class="btn principal" type="button">Nouvelle panne cachée</button>
        <a class="btn" href="#/entrainement">Retour aux exercices</a>
      </div>`;
    vue.querySelector('#autre').addEventListener('click', () => {
      const suivante = parmi(banc.pannes.filter(p => p.id !== derniereCasse));
      derniereCasse = suivante.id;
      demarrer(vue, banc, suivante);
    });
    window.scrollTo(0, 0);
  };

  afficher();
  window.scrollTo(0, 0);
}
