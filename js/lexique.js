// Lexique tactile : les termes techniques fondamentaux, définis en moins de 20 mots, sans autre jargon si possible.
// Sur chaque écran, la première occurrence de chaque terme devient un mot souligné en pointillé : le toucher ouvre sa
// définition. Le Carnet donne le lexique complet (#/entrainement/lexique).
// La recherche des termes (trouver, termePour) est pure : outils/audit.mjs et tests/unitaires.mjs l'utilisent sans
// navigateur. L'annotation des écrans et la bulle ne touchent au DOM qu'à l'appel.

import { esc } from './util.js';
import { frontispice } from './mise-en-page.js';

// motifs : expressions cherchées (« i » : sans tenir compte des majuscules). Les sigles restent sensibles à la casse.
export const LEXIQUE = [
  { id: 'tension', terme: 'Tension', motifs: [{ re: 'tensions?', i: true }], def: 'Différence de « pression » électrique entre deux points, en volts (V). C\'est elle qui pousse le courant.' },
  { id: 'courant', terme: 'Courant', motifs: [{ re: 'courants?', i: true }, { re: 'intensités?', i: true }], def: 'Électricité qui circule dans un circuit fermé, en ampères (A). C\'est lui qui chauffe, brûle et électrise.' },
  { id: 'phase', terme: 'Phase', motifs: [{ re: 'phases?', i: true }], def: 'Conducteur sous tension par rapport à la terre, marron, noir ou gris. Dangereux au toucher.' },
  { id: 'neutre', terme: 'Neutre', motifs: [{ re: 'neutres?', i: true }], def: 'Conducteur bleu clair par où le courant revient. Proche de 0 V en temps normal, jamais touché sans VAT.' },
  { id: 'pe', terme: 'PE (terre de protection)', motifs: [{ re: 'PE' }, { re: 'vert-jaune', i: true }, { re: 'terre de protection', i: true }], def: 'Conducteur vert-jaune relié aux carcasses métalliques : il évacue un courant de défaut vers la terre.' },
  { id: 'multimetre', terme: 'Multimètre', motifs: [{ re: 'multimètres?', i: true }], def: 'Appareil qui mesure tension (V), courant (A) et résistance (Ω). Pointe rouge sur le point testé, COM en référence.' },
  { id: 'loz', terme: 'LoZ', motifs: [{ re: 'LoZ' }], def: 'Fonction basse impédance du multimètre : une tension fantôme tombe à 0 V, une vraie tension reste.' },
  { id: 'fantome', terme: 'Tension fantôme', motifs: [{ re: 'tensions? fantômes?', i: true }, { re: 'fantômes?', i: true }], def: 'Tension lue sur un fil coupé ou en l\'air, captée des fils voisins. Elle disparaît en LoZ.' },
  { id: 'vat', terme: 'VAT', motifs: [{ re: 'VAT' }, { re: 'vérifications? d\'absence de tension', i: true }], def: 'Vérification d\'absence de tension : au détecteur bipolaire, sur chaque conducteur, juste avant de toucher.' },
  { id: 'consignation', terme: 'Consignation', motifs: [{ re: 'consign(?:ation|ations|er|é|ée|és|ées|e|es|ons|ez)', i: true }], def: 'Séparer, cadenasser, signaler, puis vérifier l\'absence de tension avant d\'intervenir. Personne ne peut remettre le courant.' },
  { id: 'habilitation', terme: 'Habilitation', motifs: [{ re: 'habilitations?', i: true }, { re: 'habilité(?:e|s|es)?', i: true }], def: 'Titre signé par l\'employeur après formation (B1, BR, H0V…) : il dit quels travaux électriques tu peux faire.' },
  { id: 'tbt', terme: 'TBT (très basse tension)', motifs: [{ re: 'TBTS?' }, { re: 'très basse tension', i: true }], def: 'Très basse tension : jusqu\'à 50 V alternatif ou 120 V continu, comme une commande en 24 V.' },
  { id: 'bt', terme: 'BT (basse tension)', motifs: [{ re: 'BT' }, { re: 'basse tension', i: true }], def: 'Basse tension : de 50 à 1 000 V alternatif. Prises, éclairage, moteurs 230 / 400 V.' },
  { id: 'hta', terme: 'HTA (haute tension A)', motifs: [{ re: 'HTA' }, { re: 'haute tension', i: true }], def: 'Haute tension A : de 1 000 à 50 000 V, celle qui arrive aux postes de transformation (20 kV).' },
  { id: 'contacteur', terme: 'Contacteur', motifs: [{ re: 'contacteurs?', i: true }], def: 'Interrupteur commandé par une bobine : il ouvre ou ferme à distance la puissance d\'un moteur.' },
  { id: 'bobine', terme: 'Bobine', motifs: [{ re: 'bobines?', i: true }], def: 'Électroaimant d\'un contacteur ou d\'un relais (bornes A1-A2) : alimentée, elle fait coller les contacts.' },
  { id: 'relais-thermique', terme: 'Relais thermique', motifs: [{ re: 'relais thermiques?', i: true }], def: 'Protège un moteur contre la surcharge : un bilame chauffe et coupe la commande par son contact 95-96.' },
  { id: 'sectionneur', terme: 'Sectionneur', motifs: [{ re: 'sectionneurs?', i: true }], def: 'Appareil qui isole un circuit avec une coupure visible. Ne s\'ouvre pas en charge ; se cadenasse pour consigner.' },
  { id: 'disjoncteur', terme: 'Disjoncteur', motifs: [{ re: 'disjoncteurs?', i: true }], def: 'Protection qui coupe seule en cas de surcharge ou de court-circuit, puis se réarme d\'un geste.' },
  { id: 'differentiel', terme: 'Différentiel (DDR)', motifs: [{ re: 'DDR' }, { re: 'différentiels?', i: true }], def: 'Coupe dès qu\'un courant fuit vers la terre, par exemple à travers une personne (30 mA).' },
  { id: 'fusible', terme: 'Fusible', motifs: [{ re: 'fusibles?', i: true }], def: 'Fil calibré qui fond et coupe le circuit si le courant est trop fort. Il se remplace, sans réparation.' },
  { id: 'am-gg', terme: 'aM / gG (fusibles)', motifs: [{ re: 'aM' }, { re: 'gG' }], def: 'Lettres d\'un fusible : gG protège les câbles, aM les moteurs en tolérant leur pointe de démarrage.' },
  { id: 'no', terme: 'NO (contact à fermeture)', motifs: [{ re: 'NO' }], def: 'Contact ouvert au repos, qui se ferme quand on actionne l\'appareil (bouton Marche, contact 13-14).' },
  { id: 'nf', terme: 'NF (contact à ouverture)', motifs: [{ re: 'NF(?! ?(?:C|EN|X)\\b)' }], def: 'Contact fermé au repos, qui s\'ouvre quand on actionne l\'appareil (bouton Arrêt, contact 95-96).' },
  { id: 'com', terme: 'COM', motifs: [{ re: 'COM' }], def: 'Borne commune du multimètre (fil noir) : la référence de la mesure, souvent posée au neutre ou au 0 V.' },
  { id: 'ol', terme: 'OL', motifs: [{ re: 'OL' }], def: '« Over Limit », hors calibre. En Ω : circuit ouvert, le courant ne passe pas.' },
  { id: 'slt', terme: 'Schémas TT, TN, IT', motifs: [{ re: 'schémas? de liaison à la terre', i: true }, { re: 'SLT' }, { re: 'TN-[CS]' }, { re: 'TT' }, { re: 'TN' }, { re: 'IT' }], def: 'Schéma de liaison à la terre : la façon de relier le neutre et les masses à la terre.' },
  { id: 'selectivite', terme: 'Sélectivité', motifs: [{ re: 'sélectivités?', i: true }, { re: 'sélecti(?:f|fs|ve|ves)', i: true }], def: 'Seule la protection juste en amont du défaut coupe : le reste de l\'installation reste alimenté.' },
  { id: 'cat', terme: 'CAT II, III, IV', motifs: [{ re: 'CAT (?:IV|III|II)' }], def: 'Catégorie de mesure d\'un appareil : sa tenue aux surtensions selon l\'endroit où l\'on mesure.' },
  { id: 'megohmmetre', terme: 'Mégohmmètre', motifs: [{ re: 'mégohmmètres?', i: true }], def: 'Mesure l\'isolement hors tension : injecte 250 à 1 000 V continu et lit des mégohms (MΩ).' },
  { id: 'pince', terme: 'Pince ampèremétrique', motifs: [{ re: 'pinces? ampèremétriques?', i: true }, { re: 'pinces?', i: true }], def: 'Mesure le courant d\'un conducteur sans le couper : sa mâchoire entoure un seul fil.' },
  { id: 'bornier', terme: 'Bornier', motifs: [{ re: 'borniers?', i: true }], def: 'Rangée de bornes repérées (X1 : 1, X1 : 2…) où arrivent les câbles : un point de mesure idéal.' },
  { id: 'variateur', terme: 'Variateur', motifs: [{ re: 'variateurs?', i: true }], def: 'Électronique qui règle la vitesse d\'un moteur. Ses condensateurs restent chargés après la coupure.' },
  { id: 'court-circuit', terme: 'Court-circuit', motifs: [{ re: 'courts?-circuits?', i: true }], def: 'Contact direct entre deux conducteurs : courant énorme, arc, la protection doit couper aussitôt.' },
  { id: 'surcharge', terme: 'Surcharge', motifs: [{ re: 'surcharges?', i: true }], def: 'Courant un peu trop fort mais durable (trop d\'appareils, moteur freiné) : le câble chauffe lentement.' }
];

// Expressions compilées : le terme ne doit pas être collé à une autre lettre ou un chiffre (« BT » ≠ « TBT »).
const BORD_AVANT = '(?<![\\p{L}\\p{N}])', BORD_APRES = '(?![\\p{L}\\p{N}])';
const COMPILES = LEXIQUE.map(t => ({ t, res: t.motifs.map(m => new RegExp(`${BORD_AVANT}(?:${m.re})${BORD_APRES}`, `gu${m.i ? 'i' : ''}`)) }));

export const terme = id => LEXIQUE.find(t => t.id === id) ?? null;

// Première occurrence d'un terme (hors `exclus`) dans un texte : { id, debut, fin } ou null. À égalité de position,
// le plus long l'emporte (« basse tension » avant « tension »).
export function trouver(texte, exclus = new Set()) {
  let meilleur = null;
  for (const { t, res } of COMPILES) {
    if (exclus.has(t.id)) continue;
    for (const re of res) {
      re.lastIndex = 0;
      const m = re.exec(texte);
      if (!m) continue;
      const c = { id: t.id, debut: m.index, fin: m.index + m[0].length };
      if (!meilleur || c.debut < meilleur.debut || (c.debut === meilleur.debut && c.fin > meilleur.fin)) meilleur = c;
    }
  }
  return meilleur;
}

// Le terme du lexique qui couvre exactement ce fragment (« consigner », « HTA »…), ou null.
export function termePour(fragment) {
  const r = trouver(fragment);
  return r && r.debut === 0 && r.fin === fragment.length ? r.id : null;
}

// ---------- Écran : annotation et bulle ----------

// Là où un mot ne doit pas devenir touchable : commandes (un bouton dans un bouton est interdit), listes, afficheurs,
// schémas, et les épreuves sans aide (examen blanc, positionnement : [data-sans-lexique]).
const EXCLUS = 'button, a, select, option, summary, label, input, textarea, svg, code, pre, dialog, .terme, .nixie, .tabbar, .topbar, .puce-domaine, .bilan-score, [data-sans-lexique]';

// Texte invisible pour l'instant : dans un volet replié ou une zone masquée. On attend qu'il s'ouvre.
const cache = el => !!el.closest('[hidden]') || [...ancetres(el)].some(a => a.tagName === 'DETAILS' && !a.open && !el.closest('summary'));
function* ancetres(el) { for (let a = el; a; a = a.parentElement) yield a; }

// Rend touchable la première occurrence de chaque terme dans la racine (un écran).
export function annoter(racine) {
  if (!racine || racine.querySelector('[data-sans-lexique]')) return;
  const deja = new Set([...racine.querySelectorAll('.terme')].map(b => b.dataset.terme));
  const noeuds = [];
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.nodeValue.trim().length > 1 && !n.parentElement?.closest(EXCLUS) && !cache(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
  for (let n of noeuds) {
    let r;
    while (deja.size < LEXIQUE.length && (r = trouver(n.nodeValue, deja))) {
      const mot = n.splitText(r.debut);
      const suite = mot.splitText(r.fin - r.debut);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'terme';
      b.dataset.terme = r.id;
      b.setAttribute('aria-haspopup', 'dialog');
      b.textContent = mot.nodeValue;
      mot.replaceWith(b);
      deja.add(r.id);
      n = suite;
    }
  }
}

let bulle = null;
export function ouvrirTerme(id) {
  const t = terme(id);
  if (!t) return;
  if (!bulle) {
    bulle = document.createElement('dialog');
    bulle.className = 'bulle-lexique';
    bulle.setAttribute('aria-labelledby', 'bulle-lexique-titre');
    document.body.append(bulle);
    bulle.addEventListener('click', ev => {
      if (ev.target === bulle || ev.target.closest('[data-fermer]')) bulle.close();
      if (ev.target.closest('a')) bulle.close();
    });
  }
  bulle.innerHTML = `
    <p class="bulle-surtitre">Lexique</p>
    <h2 id="bulle-lexique-titre" class="bulle-terme">${esc(t.terme)}</h2>
    <p class="bulle-def">${esc(t.def)}</p>
    <div class="bulle-actions">
      <a class="btn" href="#/entrainement/lexique?t=${encodeURIComponent(t.id)}">Tout le lexique</a>
      <button type="button" class="btn principal" data-fermer>Compris</button>
    </div>`;
  bulle.showModal();
}

// Branche le lexique sur toute l'application : annotation à chaque rendu de l'écran, bulle au toucher.
export function brancherLexique() {
  document.addEventListener('click', ev => {
    const b = ev.target.closest?.('.terme');
    if (!b) return;
    ev.preventDefault();
    ouvrirTerme(b.dataset.terme);
  });
  const observateur = new MutationObserver(() => {
    observateur.disconnect();
    try { annoter(document.getElementById('vue')); } finally { observateur.observe(document.body, { childList: true, subtree: true }); }
  });
  observateur.observe(document.body, { childList: true, subtree: true });
  // Un volet qui s'ouvre montre du texte jusque-là caché.
  document.addEventListener('toggle', ev => { if (ev.target.open) annoter(document.getElementById('vue')); }, true);
}

// ---------- Écran « Lexique » (depuis le Carnet ou la bulle) ----------
export function renderLexique({ vue, definirTitre, params }) {
  definirTitre('Lexique');
  const choisi = params?.get('t');
  const tries = [...LEXIQUE].sort((a, b) => a.terme.localeCompare(b.terme, 'fr'));
  vue.innerHTML = `
    ${frontispice({ surtitre: 'Carnet', titre: 'Le', italique: 'lexique', chapo: `${LEXIQUE.length} mots du métier, expliqués en une phrase. Partout dans l'app, un mot souligné en pointillé se touche pour voir sa définition.` })}
    <dl class="liste-lexique" data-sans-lexique>
      ${tries.map(t => `<div class="entree-lexique${t.id === choisi ? ' choisi' : ''}" id="lexique-${t.id}"><dt>${esc(t.terme)}</dt><dd>${esc(t.def)}</dd></div>`).join('')}
    </dl>
    <div class="actions pousse-bas"><a class="btn" href="#/profil">Retour au Carnet</a></div>`;
  if (choisi) requestAnimationFrame(() => vue.querySelector(`#lexique-${CSS.escape(choisi)}`)?.scrollIntoView({ block: 'center' }));
}
