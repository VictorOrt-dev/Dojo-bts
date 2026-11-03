// Audit d'intégrité normatif et technique de tout le contenu d'Elec learning.
//
//   node outils/audit.mjs        contrôle tout, écrit docs/audit-conformite.md, code de sortie 1 en cas d'anomalie
//
// Vérifie automatiquement :
//   1. Normes     : chaque élément cite une référence ; chaque norme citée a son édition (js/normes.js) ;
//                   règle de citation de la protection contre les chocs (IEC 60364-4-41 § 411, pas « NF C 15-100 § 41x »).
//   2. Calculs    : 200 tirages par générateur : réponse finie et positive, valeur présente dans le calcul posé,
//                   erreurs typiques distinctes de la bonne réponse, explication, piège et risque rédigés.
//   3. Seuils     : mesures d'isolement conformes au tableau de l'IEC 60364-6 (tension d'essai et seuil selon le circuit).
//   4. Sécurité   : « Le risque, en vrai » sur chaque élément ; « Le piège en armoire » sur chaque cas, panne, mesure, calcul.
//   5. Structure  : une seule bonne démarche par étape, embranchements valides, pannes du banc réparables,
//                   démarches de référence (pistes) qui citent des points et des pièces existants.
//   6. Lexique    : définitions de 20 mots au plus ; chaque terme technique du contenu de niveau I (questions, calculs,
//                   cas, pannes du banc, guide du banc) a sa définition dans js/lexique.js.
// La fonction auditer() est aussi appelée par tests/unitaires.mjs : la CI échoue si le contenu dérive.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EDITIONS, annoterNorme } from '../js/normes.js';
import { LEXIQUE, termePour } from '../js/lexique.js';
import { GESTES } from '../js/tutoriel-banc.js';

const lire = f => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const RISQUE_MIN = 60;

// Codes de normes cités dans une référence (« NF C 15-100 », « IEC 60947-4-1 », « NF EN 61243-3 »…).
const codes = texte => (String(texte ?? '').match(/\b(?:NF EN|NF C|IEC|ISO|UTE C)\s?\d[\d]*(?:[-.]\d+)*/g) ?? []).map(c => c.trim());
// Une base en ligne ou une série (« IEC 60417 », « IEC 60269 ») couvre ses numéros (« IEC 60417-5019 »).
const connue = c => EDITIONS.some(e => c === e.code || (e.libre && c.startsWith(e.code) && /^-\d+$/.test(c.slice(e.code.length))));

// Tension d'essai et seuil d'isolement minimal selon le circuit (IEC 60364-6, tableau 6A).
const tableauIsolement = u => (u <= 50 ? { essai: 250, seuil: 0.5 } : u <= 500 ? { essai: 500, seuil: 1 } : { essai: 1000, seuil: 1 });

export async function auditer() {
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { GENERATEURS, estJuste, TOLERANCE } = await import('../js/calcul.js');
  const reco = lire('data/reconnaissance.json');
  const cas = lire('data/pannes.json');
  const iso = lire('data/isolement.json');
  const bancs = ['data/banc-depart-moteur.json', 'data/banc-eclairage.json', 'data/banc-etoile-triangle.json'].map(lire);

  const lignes = [];      // { famille, id, niveau, norme, controles, anomalies[] }
  const ligne = (famille, id, niveau, norme) => { const l = { famille, id, niveau, norme, controles: 0, anomalies: [] }; lignes.push(l); return l; };
  const verifier = (l, condition, message) => { l.controles++; if (!condition) l.anomalies.push(message); };
  const normes = (l, ref) => {
    verifier(l, ref && ref.trim().length > 0, 'référence normative absente');
    for (const c of codes(ref)) verifier(l, connue(c), `norme « ${c} » sans édition connue (js/normes.js)`);
    verifier(l, !/NF C 15-100 \(§ 41/.test(ref ?? ''), 'protection contre les chocs : citer l\'IEC 60364-4-41 (§ 411), pas la NF C 15-100 § 41x');
  };
  const securite = (l, risque, piege) => {
    verifier(l, (risque ?? '').length >= RISQUE_MIN, `« Le risque, en vrai » absent ou trop court (${(risque ?? '').length} car.)`);
    if (piege !== undefined) verifier(l, (piege ?? '').length >= 40, '« Le piège en armoire » absent ou trop court');
  };

  // ---------- Reconnaissance ----------
  for (const q of reco) {
    const l = ligne('Reconnaissance', q.id, q.niveau, q.norme);
    normes(l, q.norme); securite(l, q.risque);
    verifier(l, q.faux.length === 3 && new Set([q.nom, ...q.faux]).size === 4, 'quatre propositions distinctes');
    verifier(l, q.faux.every(f => q.pourquoiPas?.[f]), 'un « pourquoi pas » par mauvaise réponse');
    verifier(l, q.explication && q.reperage && q.role, 'explication, repérage et rôle rédigés');
    const svg = (() => { try { return readFileSync(new URL(`../${q.image}`, import.meta.url), 'utf8'); } catch { return null; } })();
    verifier(l, svg !== null, `image ${q.image} introuvable`);
    if (svg) verifier(l, ![...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].some(m => !(q.image.includes('sym-moteur') && ['M', '3~'].includes(m[1]))), 'aucune réponse écrite dans l\'image');
  }

  // ---------- Calculs ----------
  for (const g of GENERATEURS) {
    const l = ligne('Calcul', g.id, g.niveau, g.norme);
    normes(l, g.norme);
    const nombres = t => (String(t).match(/-?\d[\d   ]*(?:,\d+)?/g) ?? []).map(x => Number(x.replace(/[   ]/g, '').replace(',', '.'))).filter(Number.isFinite);
    let tirages = 0, valeurs = 0, posee = 0, erreurs = 0, textes = 0;
    for (let i = 0; i < 200; i++) {
      const ex = g.creer();
      tirages++;
      if (ex.explication && ex.piege && ex.solution && !/NaN|undefined|Infinity/.test([ex.enonce, ex.solution, ex.explication, ex.piege].join(' '))) textes++;
      if (ex.choix) { if (ex.choix.includes(ex.reponse)) { valeurs++; posee++; erreurs++; } continue; }
      if (Number.isFinite(ex.reponse) && ex.reponse > 0) valeurs++;
      // La valeur attendue doit apparaître dans le calcul posé (à l'arrondi d'affichage près).
      if (nombres(ex.solution).some(n => Math.abs(n - ex.reponse) <= Math.max(0.011 * Math.abs(ex.reponse), 0.006))) posee++;
      if ((ex.erreurs ?? []).every(e => !estJuste(e.valeur, ex.reponse, ex.tolerance ?? TOLERANCE))) erreurs++;
    }
    verifier(l, valeurs === tirages, `réponse non finie ou négative (${tirages - valeurs} tirages sur ${tirages})`);
    verifier(l, posee === tirages, `valeur attendue absente du calcul posé (${tirages - posee} tirages sur ${tirages})`);
    verifier(l, erreurs === tirages, 'une erreur typique tombe dans la tolérance de la bonne réponse');
    verifier(l, textes === tirages, 'explication, piège ou calcul posé manquant ou mal formé');
    const ex = g.creer();
    securite(l, g.risque, ex.piege);
  }

  // ---------- Cas de panne ----------
  for (const c of cas) {
    const k = c.conclusion;
    const l = ligne('Cas de panne', c.id, c.niveau, k.norme);
    normes(l, k.norme); securite(l, k.risque, k.piege);
    verifier(l, k.cause && k.remede && k.lecon, 'cause, remède et « à retenir » rédigés');
    const ids = new Set(c.etapes.map(e => e.id).filter(Boolean));
    for (const e of c.etapes) {
      verifier(l, e.choix.filter(x => x.verdict === 'bon').length === 1, `une seule bonne démarche (étape « ${e.question} »)`);
      verifier(l, e.choix.every(x => ['bon', 'acceptable', 'mauvais', 'danger'].includes(x.verdict) && x.explication), 'chaque choix a un verdict et une explication');
      verifier(l, e.choix.every(x => !x.vers || ids.has(x.vers)), 'chaque embranchement mène à une étape existante');
      if (e.branche) verifier(l, !!e.choix.find(x => x.verdict === 'bon').vers, 'dans une branche, la bonne démarche rejoint le chemin normal');
    }
  }

  // ---------- Banc de mesure ----------
  const CONTROLES = { 'depart-moteur': ['fu1', 'fu-l1', 'fu-l2', 'fu-l3'], eclairage: ['h1', 'h2'], 'etoile-triangle': ['fu1', 'fu-l1', 'fu-l2', 'fu-l3'] };
  for (const b of bancs) {
    const noeuds = new Set(b.noeuds.map(n => n.id));
    for (const p of b.pannes) {
      const l = ligne(`Banc · ${b.titre}`, p.id, p.niveau, p.norme);
      normes(l, p.norme); securite(l, p.risque, p.piege);
      verifier(l, [1, 2, 3].includes(p.niveau), 'niveau I, II ou III');
      verifier(l, [...p.ouvre, ...Object.keys(p.resistances ?? {}), ...(p.soudes ?? [])].length > 0
        && [...p.ouvre, ...Object.keys(p.resistances ?? {}), ...(p.soudes ?? [])].every(id => b.composants.some(c => c.repare.includes(id))), 'panne réparable par une pièce du banc');
      for (const s of p.pistes ?? []) {
        if (s.mesure) verifier(l, s.mesure.slice(1).every(n => noeuds.has(n)) && ['hz', 'loz', 'ohm'].includes(s.mesure[0]), `démarche : mesure ${s.mesure.join(' ')} sur des points existants`);
        if (s.remplacer) verifier(l, b.composants.some(c => c.id === s.remplacer), `démarche : pièce « ${s.remplacer} » existante`);
        if (s.controle) verifier(l, CONTROLES[b.id].includes(s.controle), `démarche : contrôle « ${s.controle} » possible`);
        verifier(l, !!s.pourquoi, 'chaque étape de la démarche explique pourquoi');
      }
      verifier(l, (p.pistes ?? []).at(-1)?.essai === true, 'la démarche se termine par un essai');
    }
  }

  // ---------- Mesure d'isolement ----------
  for (const s of iso) {
    const k = s.conclusion;
    const l = ligne('Mesure d\'isolement', s.id, s.niveau, k.norme);
    normes(l, k.norme); securite(l, k.risque, k.piege);
    const attendu = tableauIsolement(s.tensionReseau);
    verifier(l, s.essaiConseille === attendu.essai, `tension d'essai ${s.essaiConseille} V au lieu de ${attendu.essai} V (IEC 60364-6)`);
    verifier(l, s.seuil === attendu.seuil, `seuil ${s.seuil} MΩ au lieu de ${attendu.seuil} MΩ (IEC 60364-6)`);
    verifier(l, s.verdicts.filter(v => v.bon).length === 1, 'une seule bonne conclusion');
    verifier(l, [...s.cles, ...Object.keys(s.mesures)].every(c => c.split('|').every(x => s.points.includes(x)) && c === c.split('|').sort().join('|')), 'mesures clés et valeurs sur des points existants');
    verifier(l, Object.values(s.mesures).every(v => v >= 0) && s.sain > 0, 'valeurs d\'isolement positives');
    if (s.absorption) {
      // Un diélectrique qui se polarise : R monte avec le temps (15 s < 30 s < 1 min ≤ 10 min).
      const a = s.absorption;
      verifier(l, a['15'] < a['30'] && a['30'] < 1 && a['600'] >= 1, 'absorption : la résistance doit croître avec la durée de l\'essai');
      const ip = (Math.round(s.sain * a['600'] * 100) / 100 / s.sain).toFixed(2).replace('.', ',');
      verifier(l, k.cause.includes(`IP ${ip}`), `IP calculé ${ip} absent de la cause`);
    }
    verifier(l, !s.ipRequis || (s.absorption && s.cles.length > 0), 'IP exigé sans absorption ni mesure clé');
  }

  // ---------- Lexique ----------
  const motsDe = t => t.split(/\s+/).filter(Boolean).length;
  for (const t of LEXIQUE) {
    const l = ligne('Lexique', t.id, null, '');
    verifier(l, t.terme && t.def && motsDe(t.def) <= 20, `définition de ${motsDe(t.def ?? '')} mots (20 au plus)`);
    verifier(l, LEXIQUE.filter(x => x.id === t.id).length === 1, 'identifiant unique');
    verifier(l, t.motifs.length > 0 && t.motifs.every(m => m.re), 'au moins un motif de recherche');
  }
  // Termes techniques surveillés, cherchés indépendamment du lexique : chacun, s'il apparaît au niveau I, doit y être défini.
  const SURVEILLES = [
    ['LoZ'], ['VAT'], ['TBTS?'], ['BT'], ['HTA'], ['PE'], ['NO'], ['NF(?! ?(?:C|EN|X)\\b)'], ['COM'], ['OL'], ['DDR'], ['aM'], ['gG'],
    ['CAT (?:IV|III|II)'], ['SLT'], ['TT'], ['TN'], ['IT'],
    ['consign\\p{L}*', 'i'], ['contacteurs?', 'i'], ['relais thermiques?', 'i'], ['sectionneurs?', 'i'], ['disjoncteurs?', 'i'],
    ['différentiels?', 'i'], ['sélectivités?', 'i'], ['habilitations?', 'i'], ['bobines?', 'i'], ['fusibles?', 'i'], ['multimètres?', 'i'],
    ['mégohmmètres?', 'i'], ['borniers?', 'i'], ['variateurs?', 'i'], ['fantômes?', 'i'], ['courts?-circuits?', 'i'], ['surcharges?', 'i'],
    ['neutres?', 'i'], ['phases?', 'i']
  ].map(([re, f = '']) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${re})(?![\\p{L}\\p{N}])`, `gu${f}`));
  const corpus = [
    ...reco.filter(q => q.niveau === 1).map(q => [q.id, [q.question, q.nom, ...q.faux, q.explication, q.risque, q.reperage, q.role, ...Object.values(q.pourquoiPas ?? {})]]),
    ...GENERATEURS.filter(g => g.niveau === 1).map(g => [g.id, [g.titre, g.risque, ...Array.from({ length: 30 }, () => { const e = g.creer(); return [e.enonce, e.explication, e.piege, e.solution].join(' '); })]]),
    ...cas.filter(c => c.niveau === 1).map(c => [c.id, [c.titre, c.contexte, ...c.etapes.flatMap(e => [e.situation, e.question, ...e.choix.flatMap(x => [x.texte, x.explication])])]]),
    ...bancs.flatMap(b => b.pannes.filter(p => p.niveau === 1).map(p => [p.id, [p.symptome]])),
    ['guide-du-banc', GESTES.map(g => g.texte)]
  ];
  const lc = ligne('Lexique', 'couverture-niveau-I', 1, '');
  const manquants = new Set();
  for (const [, textes] of corpus) for (const t of textes.filter(Boolean)) for (const re of SURVEILLES) {
    for (const m of String(t).matchAll(re)) { lc.controles++; if (!termePour(m[0])) manquants.add(m[0]); }
  }
  verifier(lc, manquants.size === 0, `termes de niveau I sans définition : ${[...manquants].join(', ')}`);

  const anomalies = lignes.flatMap(l => l.anomalies.map(a => `${l.famille} · ${l.id} : ${a}`));
  return { lignes, anomalies, controles: lignes.reduce((t, l) => t + l.controles, 0) };
}

function rapport({ lignes, anomalies, controles }) {
  const R = ['', 'I', 'II', 'III'];
  const familles = [...new Set(lignes.map(l => l.famille))];
  const cellule = s => String(s ?? '').replace(/\|/g, '\\|');
  return `# Audit d'intégrité normatif et technique

*Généré par \`node outils/audit.mjs\` (aussi exécuté par la CI à chaque envoi) : ne pas modifier à la main.*

**${lignes.length} éléments, ${controles} contrôles automatiques, ${anomalies.length} anomalie${anomalies.length > 1 ? 's' : ''}.**

| Famille | Éléments | Contrôles | Anomalies |
|---|---|---|---|
${familles.map(f => { const L = lignes.filter(l => l.famille === f); return `| ${f} | ${L.length} | ${L.reduce((t, l) => t + l.controles, 0)} | ${L.reduce((t, l) => t + l.anomalies.length, 0)} |`; }).join('\n')}

## Ce qui est contrôlé

1. **Normes** : chaque élément cite une référence ; chaque norme citée a son édition (\`js/normes.js\`) ; la protection
   contre les chocs électriques se cite dans l'IEC 60364-4-41 (§ 411), les autres paragraphes dans la NF C 15-100:2002.
2. **Calculs** : 200 tirages par type de calcul : réponse finie et positive, valeur retrouvée dans le calcul posé, erreurs
   typiques distinctes de la bonne réponse, explication et piège rédigés. Les valeurs elles-mêmes sont recalculées par
   une formule indépendante dans \`tests/non-regression.mjs\` (300 tirages).
3. **Seuils** : mesures d'isolement conformes à l'IEC 60364-6 (250 V DC et 0,5 MΩ en TBT ; 500 V DC et 1 MΩ jusqu'à 500 V ;
   1 000 V DC et 1 MΩ au-delà).
4. **Sécurité** : « Le risque, en vrai » sur chaque élément, « Le piège en armoire » sur chaque cas, panne, mesure et calcul.
5. **Structure** : une seule bonne démarche par étape, embranchements valides, pannes du banc réparables, démarches de
   référence cohérentes avec le circuit.
6. **Lexique** : chaque définition tient en 20 mots ; chaque terme technique du contenu de niveau I (questions, calculs,
   cas, pannes du banc, guide du banc) a sa définition dans \`js/lexique.js\`.

${anomalies.length ? `## Anomalies\n\n${anomalies.map(a => `- ${a}`).join('\n')}\n` : ''}
## Détail

| Famille | Identifiant | Niv. | Référence (édition) | Contrôles | État |
|---|---|---|---|---|---|
${lignes.map(l => `| ${l.famille} | \`${l.id}\` | ${R[l.niveau] ?? '—'} | ${cellule(annoterNorme(l.norme))} | ${l.controles} | ${l.anomalies.length ? '✘' : '✔'} |`).join('\n')}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await auditer();
  writeFileSync(new URL('../docs/audit-conformite.md', import.meta.url), rapport(r));
  console.log(`docs/audit-conformite.md : ${r.lignes.length} éléments, ${r.controles} contrôles, ${r.anomalies.length} anomalie(s).`);
  r.anomalies.forEach(a => console.log(`  ✘ ${a}`));
  process.exit(r.anomalies.length ? 1 : 0);
}
