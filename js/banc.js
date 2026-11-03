// Banc de mesure virtuel : un départ moteur avec une panne cachée tirée au sort.
// Tu choisis l'instrument, la fonction et l'endroit où poser les pointes ; la lecture est calculée par js/circuit.js
// à partir de l'état réel du circuit. Chaque geste coûte du temps simulé (pas de chrono réel) ;
// les gestes dangereux sont signalés. Le contenu vient de data/banc-depart-moteur.json.

import { tension, resistance } from './circuit.js';
import { gagnerXP, noterReponse, noterSession } from './xp.js';
import { annoncerMontee } from './entrainement.js';
import { frontispice, typo as typoBase } from './mise-en-page.js';
import { parmi } from './hasard.js';
import { pannesCandidates } from './parcours.js';
import { CIRCUITS, PROFILS } from './banc-profils.js';
import { etiquetteNiveau } from './difficulte.js';
import { esc } from './util.js';
import { pucesDomaines } from './domaines.js';
import { blocRisque, risqueComplet, ligneNorme, enSavoirPlus, resume, MOTS_POURQUOI } from './tuteur.js';
import * as stockage from './storage.js';
import * as T from './tutoriel-banc.js';

// Repères de borne (« X1 : 1 », « KM1 : 13 ») : jamais coupés en fin de ligne.
const typo = t => typoBase(t).replace(/\b([A-Z][A-Z0-9]*)\u202F: (?=[0-9A-Z])/g, '$1\u202F:\u00A0');

// Les trois fonctions du multimètre : une légende d'un coup d'œil sous chaque bouton, et l'aide de la fonction choisie.
const FONCTIONS = [
  { id: 'hz', libelle: 'V~', legende: 'Tension ?', aide: 'Voit la tension, mais aussi la fantôme d\'un fil coupé.' },
  { id: 'loz', libelle: 'V~ LoZ', legende: 'Anti-fantôme', aide: 'Une fantôme tombe à 0 V ; une vraie tension reste.' },
  { id: 'ohm', libelle: 'Ω', legende: 'Hors tension', aide: 'Départ consigné, VAT faite. Jamais en amont de Q1.' }
];
const nb = (x, d = 1) => x.toLocaleString('fr-FR', { maximumFractionDigits: d });
const horloge = m => `${String(Math.floor(m / 60)).padStart(2, '0')} h ${String(m % 60).padStart(2, '0')}`;

const promesses = new Map();
export function chargerBanc(id = 'depart-moteur') {
  const c = CIRCUITS.find(x => x.id === id) ?? CIRCUITS[0];
  if (!promesses.has(c.id)) {
    promesses.set(c.id, fetch(c.fichier)
      .then(r => { if (!r.ok) throw new Error(`${c.fichier} introuvable (HTTP ${r.status})`); return r.json(); })
      .catch(err => { promesses.delete(c.id); throw err; }));
  }
  return promesses.get(c.id);
}

let derniereCasse = null;          // évite de retomber deux fois de suite sur la même panne
let interventionCourante = null;   // utilisée par les tests automatisés
export const interventionEnCours = () => interventionCourante;

export async function renderBanc({ vue, definirTitre, params }) {
  definirTitre('Banc de mesure');
  // ?circuit=<id> choisit le circuit (départ moteur par défaut) ; ?panne=<id> force une panne précise (tests).
  const voulu = params?.get('panne');
  // Tutoriel « Première intervention » : au tout premier passage au banc (sans circuit ni panne demandés), ou par le
  // bouton « ? Guide du banc ». Toujours le même cas de démonstration.
  const prefs = stockage.lire().preferences ?? {};
  if (params?.get('tuto') === '1' || (!voulu && !params?.get('circuit') && !prefs.tutoBanc && !prefs.visiteBanc)) {
    const b = await chargerBanc(T.CIRCUIT_TUTO);
    return demarrer(vue, b, b.pannes.find(p => p.id === T.PANNE_TUTO), { tuto: true });
  }
  let banc = await chargerBanc(params?.get('circuit') ?? 'depart-moteur');
  if (voulu && !banc.pannes.some(p => p.id === voulu)) {
    for (const c of CIRCUITS) { const b = await chargerBanc(c.id); if (b.pannes.some(p => p.id === voulu)) banc = b; }
  }
  // Pannes graduées : un débutant commence par une panne de niveau I, jamais par la plus difficile.
  const panne = banc.pannes.find(p => p.id === params?.get('panne')) ?? parmi(pannesCandidates(stockage.lire(), banc.pannes, derniereCasse));
  derniereCasse = panne.id;
  demarrer(vue, banc, panne);
}

function demarrer(vue, banc, panne, { tuto = false } = {}) {
  const P = PROFILS[banc.id];
  const etat = interventionCourante = {
    tuto: tuto ? { lu: false, vu: -1 } : null,   // tutoriel : bon lu, dernier geste affiché
    circuit: banc.id,
    tl: false,                     // éclairage : position du télérupteur (allumé / éteint)
    appui: false,                  // éclairage : appui bref sur S1 pendant un essai
    panne: panne.id,
    consigne: false,
    km: false,
    marche: false,                 // un collègue maintient le bouton Marche
    relais: !!panne.relaisDeclenche,
    ouverts: new Set(panne.ouvre),
    modifies: new Map(Object.entries(panne.resistances ?? {})),   // résistances altérées (ex. spires en court-circuit)
    soudes: new Set(panne.soudes ?? []),                          // contacteurs aux pôles soudés
    km1: false, km2: false, km3: false, tempo: false,             // étoile-triangle : contacteurs et temporisateur
    minutes: 0,
    dangers: [],
    remplacements: [],
    journal: [],
    essaisBloques: 0,
    moteur: 'arrêté',
    resolu: false,
    onglet: 'multimetre',
    // L'appareil arrive replié la première fois ; ensuite, il garde l'état choisi par l'utilisateur.
    consoleOuverte: !tuto && !!stockage.lire().preferences?.consoleBanc,
    mesure: { fonction: 'hz', ...P.mesureDepart, lecture: null },
    pince: 1,
    dernier: null,
    faits: new Set(),        // gestes accomplis, pour suivre la démarche (indices)
    indices: 0,              // nombre d'indices utilisés (rapport et XP)
    indicesVus: new Set(),
    suggestion: null,        // action mise en évidence par un indice
    selFusible: P.controles[0]?.id ?? null,
    selPiece: null
  };
  const noeuds = banc.noeuds.filter(n => !n.interne);
  const label = id => banc.noeuds.find(n => n.id === id)?.label ?? id;

  // Éléments conducteurs dans l'état actuel du départ. Les commandes propres à un circuit (contacteurs d'un
  // étoile-triangle, temporisateur…) sont résolues par son profil ; une résistance altérée par la panne remplace la nominale.
  const COMMUNES = ['q1', 'km', 'marche', 'relais', 'tl', 'appui'];
  const fermes = (e = etat) => banc.elements.filter(el => !e.ouverts.has(el.id) && (
    !el.commande ||
    (el.commande === 'q1' && !e.consigne) ||
    (el.commande === 'km' && e.km) ||
    (el.commande === 'marche' && e.marche) ||
    (el.commande === 'relais' && !e.relais) ||
    (el.commande === 'tl' && e.tl) ||
    (el.commande === 'appui' && e.appui) ||
    (!COMMUNES.includes(el.commande) && !!P.commande?.(el.commande, e))))
    .map(el => (e.modifies?.has(el.id) ? { ...el, R: e.modifies.get(el.id) } : el));
  const lire = (a, b, mode, e = etat) => tension(banc, fermes(e), a, b, mode);

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

  // Ce qui se passe à l'essai dépend du circuit (banc-profils.js).
  const essai = (via = 'essai') => P.essai({ etat, lire, danger }, via);

  const actions = {
    mesurer() {
      const { fonction, rouge, noir } = etat.mesure;
      if (fonction === 'ohm') {
        if (!etat.consigne) {
          etat.mesure.lecture = null;
          return danger('Ohmmètre sur un circuit non consigné', 'Une mesure de résistance se fait hors tension : circuit consigné, absence de tension vérifiée. Sous tension, la lecture est fausse et tu grilles le fusible du multimètre (ou pire). Il faut aller en chercher un neuf.', 15);
        }
        if (P.amont.some(n => n === rouge || n === noir)) {
          etat.mesure.lecture = null;
          return danger('Ohmmètre sur l\'amont du sectionneur', 'L\'amont de Q1 reste sous tension même consigné : jamais d\'ohmmètre sur les bornes d\'arrivée. Fusible du multimètre grillé.', 15);
        }
        const r = resistance(banc, fermes(), rouge, noir);
        etat.mesure.lecture = { valeur: r === Infinity ? 'OL' : r < 1 ? nb(r, 2) : r < 100 ? nb(r, 1) : r < 1000 ? nb(r, 0) : nb(r / 1000, 2), unite: r !== Infinity && r >= 1000 ? 'kΩ' : 'Ω',
          note: r === Infinity ? 'OL : circuit ouvert, le courant ne passe pas entre ces deux points.' : r < 1 ? 'Bip : continuité, le courant passe.' : 'Résistance d\'un récepteur (bobine, voyant, enroulement).' };
        noter(`Ω ${label(rouge)} → ${label(noir)} : ${etat.mesure.lecture.valeur} ${etat.mesure.lecture.unite}`, banc.durees.mesure);
      } else {
        const m = lire(rouge, noir, fonction);
        const amont = etat.consigne && P.amont.some(n => n === rouge || n === noir) && m.valeur > 50;
        etat.mesure.lecture = { valeur: nb(m.valeur, 0), unite: 'V~', note: lireEnClair(m, amont) };
        noter(`${fonction === 'loz' ? 'V~ LoZ' : 'V~'} ${label(rouge)} → ${label(noir)} : ${etat.mesure.lecture.valeur} V${m.instable && m.valeur > 2 ? ' (instable)' : ''}`, banc.durees.mesure);
      }
      signaler(null);
    },
    pince() {
      if (etat.consigne) return signaler('Le départ est consigné : pas d\'essai possible. Déconsigne d\'abord.', 'info');
      const r = essai(P.pinceVia ?? 'essai');   // étoile-triangle : courants relevés avant que le thermique ne déclenche
      const i = r.courants[etat.pince];
      noter(`Pince sur ${P.pince[etat.pince].libelle} pendant un essai : ${nb(i, 2)} A`, banc.durees.pince);
      signaler(`${r.texte} La pince sur ${P.pince[etat.pince].libelle} indique ${nb(i, 2)} A ${i > 0 ? P.pinceNote(i) : ''}`.trim(), r.courants.some(x => x > 30) ? 'alerte' : 'info');
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
      noter(P.collegueJournal[etat.marche ? 0 : 1], banc.durees.collegue);
      if (etat.marche) {
        const r = essai('collegue');
        signaler(`${P.collegueJournal[0]}. ${r.texte}`, 'info');
      } else { P.relacher?.(etat); signaler(`${P.collegueJournal[1]}.`, 'info'); }
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
        noter(`Déconsignation : ${P.organe} refermé`, banc.durees.deconsigner);
        return signaler(`Déconsigné : ${P.organe} est refermé, l'installation est de nouveau sous tension.`, 'info');
      }
      etat.consigne = true; etat.km = false; etat.marche = false; etat.moteur = 'arrêté';
      etat.km1 = etat.km2 = etat.km3 = etat.tempo = false;
      noter(`Consignation : ${P.organe} ouvert et cadenassé, absence de tension vérifiée`, banc.durees.consigner);
      signaler(P.consigneTexte, 'ok');
    },
    controlerFusible(id) {
      const f = P.controles.find(x => x.id === id);
      const fusible = P.controleNom === 'Fusible';
      if (!etat.consigne) return fusible
        ? danger('Fusible retiré sans consignation', `Retirer une cartouche sous tension expose aux pièces nues et peut créer un arc si un courant circule. On consigne d'abord.`, 3)
        : danger('Pièce démontée sans consignation', `${f.libelle} : on ne démonte rien sous tension, même une lampe. Consigne d'abord, vérifie l'absence de tension.`, 3);
      const fondu = etat.ouverts.has(id);
      noter(`${fusible ? `Fusible ${f.libelle} sorti et contrôlé` : `Contrôle : ${f.libelle}`} : ${fondu ? (fusible ? 'OL (fondu)' : 'OL (coupée)') : '0,0 Ω (bon)'}`, 3);
      signaler(fusible ? `Fusible ${f.libelle}, sorti de son support : ${fondu ? 'OL, il est fondu.' : '0,0 Ω, il est bon.'}`
        : `${f.libelle}, à l'ohmmètre : ${fondu ? 'OL, elle est coupée : hors service.' : 'continuité correcte, elle est bonne.'}`, 'info');
    },
    remplacer(id) {
      const c = banc.composants.find(x => x.id === id);
      if (!etat.consigne) return danger('Remplacement sans consignation', `On ne démonte jamais une pièce sous tension. Consigne le départ, vérifie l'absence de tension, puis remplace : ${c.libelle}.`, 2);
      const utile = c.repare.some(r => panne.ouvre.includes(r) || panne.resistances?.[r] !== undefined || panne.soudes?.includes(r));
      c.repare.forEach(r => { etat.ouverts.delete(r); etat.modifies.delete(r); etat.soudes.delete(r); });
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

    // Tutoriel : au changement de geste, on ouvre ce qu'il faut (onglet, appareil, pièce présélectionnée).
    const gi = etat.tuto ? T.gesteCourant(etat) : -1;
    const g = T.GESTES[gi];
    if (etat.tuto && gi !== etat.tuto.vu) {
      etat.tuto.vu = gi;
      const c = T.cible(etat, g);
      if (c?.onglet) etat.onglet = c.onglet;
      if (gi > 0) { if (!etat.consoleOuverte) animerOuverture = true; etat.consoleOuverte = true; }
      if (g?.piece) etat.selPiece = g.piece;
      etat.bonOuvert = gi === 0 ? true : etat.bonOuvert;
    }
    const ciblage = etat.tuto && g ? T.cible(etat, g) : null;
    const tutoHtml = etat.tuto && g ? `
      <div class="tuto-carte" role="region" aria-label="Guide du banc" aria-live="polite" data-geste="${gi}">
        <div class="tuto-tete">
          <p class="tuto-etape">Étape ${g.etape}/${T.NB_ETAPES} · ${esc(T.TITRES[g.etape - 1])}</p>
          <button type="button" id="tuto-quitter" class="tuto-quitter">Quitter le guide</button>
        </div>
        <ol class="tuto-progression" aria-hidden="true">${T.TITRES.map((_, i) => `<li class="${i + 1 < g.etape ? 'fait' : i + 1 === g.etape ? 'en-cours' : ''}"></li>`).join('')}</ol>
        <p class="tuto-texte"><strong>${esc(typo(g.titre))}${/[?!]$/.test(g.titre) ? '' : '.'}</strong> ${esc(typo(g.texte))}</p>
        ${ciblage?.remarque ? `<p class="tuto-remarque">${esc(typo(ciblage.remarque))}</p>` : ''}
        ${g.lu ? '<button type="button" id="tuto-suivant" class="btn principal">J\'ai lu le bon : étape 2</button>' : ''}
      </div>` : '';
    const fonctionActive = FONCTIONS.find(f => f.id === fonction);

    vue.innerHTML = `
      <header class="frontispice frontispice-banc">
        <p class="surtitre">${etat.tuto ? 'Guide du banc · première intervention' : `Banc de mesure · panne cachée ${etiquetteNiveau(panne.niveau, { long: true })}`}</p>
        <h2 class="titre-chapitre">${banc.titreHtml}</h2>
      </header>
      ${etat.tuto ? '' : `<nav class="segments choix-circuit" aria-label="Circuit du banc">
        ${CIRCUITS.map(c => `<a href="#/entrainement/banc?circuit=${c.id}"${c.id === banc.id ? ' aria-current="true"' : ''}>${esc(c.court)}</a>`).join('')}
      </nav>`}
      <p class="reco-domaines">${pucesDomaines(banc.domaines)}</p>
      <div class="mission-ligne">
        <p class="mission"><strong>Ta mission :</strong> ${esc(P.mission)}</p>
        <a class="btn-guide" href="#/entrainement/banc?tuto=1&r=${Date.now()}" aria-label="Guide du banc : refaire la première intervention guidée"><span aria-hidden="true">?</span> Guide du banc</a>
      </div>
      <details class="approfondir mode-emploi volet-banc" name="volets-banc"><summary>Comment ça marche ?</summary>
        <ol class="etapes-banc">
          <li><strong>Ouvre l'appareil de mesure</strong> : la barre en bas de l'écran. Touche-la pour le déplier ou le replier.</li>
          <li><strong>Mesure sous tension</strong> (onglet Multimètre) : choisis deux points, touche « Mesurer ». On suit le courant depuis la source : là où la tension disparaît, la panne est juste avant.</li>
          <li><strong>Consigne</strong> (onglet Actions) avant de mesurer en Ω ou de démonter quoi que ce soit.</li>
          <li><strong>Confirme</strong> à l'ohmmètre ou en contrôlant le fusible, puis <strong>remplace</strong> la pièce.</li>
          <li><strong>Déconsigne et fais un essai</strong> : ${esc(P.reussite)}. Le rapport compte ton temps, tes alertes sécurité et les pièces changées pour rien.</li>
        </ol>
        <p class="discret petit">Bloqué ? Le bouton « Indice » place les pointes pour toi et explique pourquoi. Première fois ? « ? Guide du banc » rejoue une intervention complète, pas à pas.</p>
      </details>
      <div class="bloc-symptome">
        <p class="signale-court"><strong>Signalé :</strong> ${esc(typo(panne.symptome))}</p>
        <details class="approfondir bon-details volet-banc" name="volets-banc"${etat.bonOuvert ?? true ? ' open' : ''}>
          <summary>Bon d'intervention</summary>
          <div class="bon-intervention"><p>${esc(typo(banc.description))}</p></div>
        </details>
      </div>

      <div class="tableau-bord">
        <p class="horloge"><span>Temps d'intervention</span><b class="mono">${horloge(etat.minutes)}</b></p>
        <p class="alertes ${etat.dangers.length ? 'actif' : ''}"><span>Alertes sécurité</span><b class="mono">${etat.dangers.length}</b></p>
      </div>

      <ul class="etat-armoire">
        ${P.pastilles({ etat, lire })}
      </ul>

      <details class="approfondir schema-details volet-banc" name="volets-banc"><summary>Schéma de l'armoire</summary><div class="schema"><img src="${esc(banc.schema)}" alt="Schéma : ${esc(banc.titre)}"></div></details>

      <div id="resultat-banc">${dernier}</div>

      <details class="approfondir journal"><summary>Journal d'intervention (${etat.journal.length})</summary>
        <ol>${etat.journal.map(j => `<li class="${j.type}"><span class="mono">${horloge(j.t)}</span> ${esc(typo(j.texte))}</li>`).join('') || '<li>Rien pour l\'instant.</li>'}</ol>
      </details>

      <section class="console-banc${etat.consoleOuverte ? ' ouverte' : ''}${animerOuverture ? ' s-ouvre' : ''}${etat.tuto && gi > 0 ? ' en-tuto' : ''}" aria-label="Appareil de mesure">
        ${tutoHtml}
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
              ${FONCTIONS.map(f => `<button type="button" data-fonction="${f.id}" aria-pressed="${f.id === fonction}" aria-describedby="aide-fonction"><span class="fonction-nom">${f.libelle}</span><span class="fonction-legende">${esc(f.legende)}</span></button>`).join('')}
            </div>
            <p id="aide-fonction" class="aide-fonction${fonction === 'ohm' && !etat.consigne ? ' alerte' : ''}">${fonction === 'ohm' && !etat.consigne
              ? '⚠ Non consigné : consigne d\'abord (onglet Actions).'
              : esc(typo(fonctionActive.aide))}</p>
            <label class="pointe rouge"><span>Rouge</span><select id="rouge" aria-label="Pointe rouge">${options(rouge)}</select></label>
            <label class="pointe noire"><span>COM</span><select id="noir" aria-label="Pointe noire (COM)">${options(noir)}</select></label>
            <div class="lecture-ligne">
              <div class="nixie"><output id="lecture" class="nixie-valeur">${lecture ? esc(lecture.valeur) : ''}</output><span class="unite">${lecture ? esc(lecture.unite) : fonction === 'ohm' ? 'Ω' : 'V~'}</span></div>
              <button id="mesurer" class="btn principal" type="button">Mesurer</button>
            </div>
            ${lecture?.note ? `<p class="note-mesure${/hésite|Attention/.test(lecture.note) ? ' alerte' : ''}">${esc(lecture.note)}</p>` : ''}
            ${!lecture && etat.dernier?.type === 'danger' ? `<p class="note-mesure alerte">⚠ ${esc(etat.dernier.titre)} : explication au-dessus.</p>` : ''}
          </div>` : ''}

        ${etat.onglet === 'pince' ? `
          <div class="instrument">
            <p class="aide">Courant d'un conducteur pendant un essai.</p>
            <div class="selecteur trois" role="group" aria-label="Conducteur">
              ${P.pince.map(c => `<button type="button" data-pince="${c.id}" aria-pressed="${c.id === etat.pince}">${c.libelle}</button>`).join('')}
            </div>
            <button id="pince" class="btn principal" type="button"${etat.suggestion === 'pince' ? ' data-suggere="true"' : ''}>Lancer un essai, pince en place</button>
          </div>` : ''}

        ${etat.onglet === 'actions' ? `
          <div class="instrument actions-banc">
            <button class="btn ${etat.consigne ? '' : 'principal'}" type="button" data-action="consigner"${etat.suggestion === 'consigner' ? ' data-suggere="true"' : ''}>${esc(etat.consigne ? P.deconsigner : P.consigner)}</button>
            <button class="btn" type="button" data-action="essai"${etat.suggestion === 'essai' ? ' data-suggere="true"' : ''}>${esc(P.essaiLibelle)}</button>
            <button class="btn" type="button" data-action="collegue"${etat.suggestion === 'collegue' ? ' data-suggere="true"' : ''}>${esc(P.collegue[etat.marche ? 1 : 0])}</button>
            ${P.rearmer ? `<button class="btn" type="button" data-action="rearmer"${etat.suggestion === 'rearmer' ? ' data-suggere="true"' : ''}>Réarmer le relais thermique</button>` : ''}
            <div class="ligne-action">
              <select id="fusible" aria-label="${P.controleNom === 'Fusible' ? 'Fusible' : 'Pièce'} à contrôler">${P.controles.map(f => `<option value="${f.id}"${f.id === etat.selFusible ? ' selected' : ''}>${esc(f.libelle)}</option>`).join('')}</select>
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

    // Tutoriel : surbrillance de ce qu'il faut toucher (l'onglet d'abord s'il est fermé).
    if (ciblage) {
      const sel = ciblage.onglet && ciblage.onglet !== etat.onglet ? `[data-onglet-banc="${ciblage.onglet}"]`
        : !etat.consoleOuverte && ciblage.onglet ? '.poignee-console' : ciblage.selecteur;
      vue.querySelectorAll(sel).forEach(el => {
        el.classList.add('tuto-cible');
        if (el.closest('.actions-banc')) el.scrollIntoView({ block: 'nearest' });   // liste d'actions défilante
      });
      // Étape 1 : le bon d'intervention en haut de l'écran, au-dessus de la fiche du guide.
      if (gi === 0) requestAnimationFrame(() => { const b = vue.querySelector('.bloc-symptome'); if (b) scrollTo(0, Math.max(0, b.getBoundingClientRect().top + scrollY - 64)); });
    }
    vue.querySelector('#tuto-suivant')?.addEventListener('click', () => { etat.tuto.lu = true; etat.bonOuvert = false; afficher(); });
    vue.querySelector('#tuto-quitter')?.addEventListener('click', () => {
      stockage.modifier(e => { e.preferences = { ...e.preferences, tutoBanc: true }; });
      location.hash = `#/entrainement/banc?circuit=${T.CIRCUIT_TUTO}&r=${Date.now()}`;
    });
    vue.querySelector('.poignee-console').addEventListener('click', () => {
      etat.consoleOuverte = !etat.consoleOuverte;
      animerOuverture = etat.consoleOuverte;
      if (!etat.tuto) stockage.modifier(e => { e.preferences = { ...e.preferences, consoleBanc: etat.consoleOuverte }; });
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
      afficher();
    });
    vue.querySelector('#pince')?.addEventListener('click', () => { geste(); actions.pince(); if (etat.suggestion === 'pince') etat.suggestion = null; constater('pince'); apres(); });
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
    if (geste === 'essai') f.add('appui');
    if (geste === 'pince' && !etat.consigne) f.add(`p:${etat.pince}`);
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
    if (etape.appui) return f.has('appui');
    if (etape.pince !== undefined) return f.has(`p:${etape.pince}`);
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
    if (etape.pince !== undefined && etat.consigne) {
      etat.onglet = 'actions'; etat.suggestion = 'consigner';
      return signaler('Pour mesurer un courant pendant un essai, le départ doit être en service : déconsigne d\'abord (onglet Actions).', 'indice', 'Indice');
    }
    if (etape.pince !== undefined) {
      etat.onglet = 'pince'; etat.pince = etape.pince; etat.suggestion = 'pince';
      return signaler(`${etape.pourquoi} La pince est en place sur ${P.pince[etape.pince].libelle} : lance l'essai.`, 'indice', 'Indice');
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
    else if (etape.essai || etape.appui) etat.suggestion = 'essai';
    signaler(`${etape.pourquoi} Le bon bouton est mis en évidence dans l'onglet Actions.`, 'indice', 'Indice');
  };

  let animerOuverture = false;   // petite animation seulement au moment où l'on déplie

  // ---------- Fin du tutoriel : les 4 réflexes, puis les vraies pannes ----------
  const finTuto = () => {
    vue.classList.remove('avec-console');
    stockage.modifier(e => { e.preferences = { ...e.preferences, tutoBanc: true }; });
    vue.innerHTML = `
      <section class="bilan bilan-tuto">
        <p class="surtitre">Guide du banc · première intervention</p>
        <p class="bilan-message">${etat.resolu ? 'Diagnostic validé.' : 'Guide interrompu.'}</p>
        <p class="bilan-xp">Démonstration : elle ne compte ni dans tes statistiques ni dans ton XP.</p>
      </section>
      <div class="lecon">
        <p class="lecon-titre">Les 4 réflexes ${etat.resolu ? 'que tu viens de pratiquer' : 'de la démarche'}</p>
        <ol class="reflexes">
          <li><strong>Lire le symptôme</strong> : il dit où chercher. Voyant allumé = la commande a sa tension.</li>
          <li><strong>Suivre le courant</strong> : rouge sur le point testé, COM sur la référence, de la source vers le récepteur.</li>
          <li><strong>Douter d'une valeur qui hésite</strong> : le LoZ confirme une vraie tension ou fait tomber la fantôme.</li>
          <li><strong>Prouver avant de changer</strong> : consigner, ohmmètre, remplacer, déconsigner, essai.</li>
        </ol>
      </div>
      <div class="lecon objectif-suivant">
        <p class="lecon-titre">Et maintenant ?</p>
        <p>${esc(typo(`Les vraies pannes sont cachées et tirées au sort : niveau I d'abord, puis II et III, sur trois circuits. L'indice reste là si tu bloques, mais il coûte de l'XP. La maîtrise, c'est la panne réparée sans indice, sans alerte de sécurité et dans le temps d'un technicien confirmé (${horloge(panne.reference)} ici).`))}</p>
      </div>
      <div class="actions pousse-bas">
        <a class="btn principal" href="#/entrainement/banc?circuit=${T.CIRCUIT_TUTO}&r=${Date.now()}">Ma première vraie panne</a>
        <a class="btn" href="#/entrainement/banc?tuto=1&r=${Date.now()}">Refaire le guide</a>
      </div>`;
    window.scrollTo(0, 0);
  };

  const debrief = () => {
    if (etat.tuto) return finTuto();
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
    // Réussite = panne réparée sans alerte de sécurité, indices compris : c'est elle qui valide l'étape du parcours
    // et fait passer au niveau de panne suivant. Le « sans faute » (sans indice, dans les temps) reste le bonus XP.
    const reussie = etat.resolu && !etat.dangers.length;
    noterReponse('banc', panne.id, reussie);
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
      ${reussie && !parfait ? `<div class="lecon objectif-suivant"><p class="lecon-titre">Intervention validée</p><p>${etat.indices
        ? `Réparée sans alerte de sécurité, avec ${etat.indices} indice${etat.indices > 1 ? 's' : ''} : c'est validé. Objectif suivant : la même panne sans indice, pour le bonus « sans faute » (+20 XP).`
        : 'Réparée sans alerte de sécurité : c\'est validé. Pour le « sans faute » (+20 XP) : aucune pièce changée pour rien, dans les temps du technicien confirmé.'}</p></div>` : ''}
      ${etat.resolu && etat.dangers.length ? `<div class="diagnostic"><p class="lecon-titre">Pas encore validée</p><p>La panne est réparée, mais avec une alerte de sécurité : refais une intervention sans geste dangereux pour la valider.</p></div>` : ''}
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
      const suivante = parmi(pannesCandidates(stockage.lire(), banc.pannes, derniereCasse));
      derniereCasse = suivante.id;
      demarrer(vue, banc, suivante);
    });
    window.scrollTo(0, 0);
  };

  afficher();
  window.scrollTo(0, 0);
}
