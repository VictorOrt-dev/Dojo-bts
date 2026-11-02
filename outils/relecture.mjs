// Génère docs/relecture-formateur.md : la liste de tout le contenu à faire valider par un formateur,
// avec la référence normative annotée de son édition. À relancer après chaque ajout de contenu :
//   node outils/relecture.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { annoterNorme, normesCitees, EDITIONS } from '../js/normes.js';

globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GENERATEURS } = await import('../js/calcul.js');
const lire = f => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const reco = lire('data/reconnaissance.json');
const cas = lire('data/pannes.json');
const banc = lire('data/banc-depart-moteur.json');

const lignes = [
  ...reco.map(q => ({ mode: 'Reconnaissance', id: q.id, niveau: q.niveau, domaines: q.domaines, titre: q.question, norme: q.norme, verifie: q.verifie })),
  ...GENERATEURS.map(g => ({ mode: 'Calcul', id: g.id, niveau: g.niveau, domaines: g.domaines, titre: g.titre, norme: g.norme, verifie: g.verifie })),
  ...cas.map(c => ({ mode: 'Cas de panne', id: c.id, niveau: c.niveau, domaines: c.domaines, titre: c.titre, norme: c.conclusion.norme, verifie: c.verifie })),
  ...banc.pannes.map(p => ({ mode: 'Banc', id: p.id, niveau: p.niveau, domaines: p.domaines, titre: p.symptome, norme: p.norme, verifie: p.verifie }))
];

// Références dont une norme n'a pas d'édition connue (motif « lettres + numéro »).
const codes = texte => String(texte ?? '').match(/\b(?:NF EN|NF C|NF|IEC|ISO|UTE C|EN)\s?[\d][\d-]*(?:-\d+)*/g) ?? [];
const sansEdition = new Set();
lignes.forEach(l => codes(l.norme).forEach(c => { if (!EDITIONS.some(e => c.startsWith(e.code) && c.length === e.code.length)) sansEdition.add(c.trim()); }));

const R = ['', 'I', 'II', 'III'];
const cellule = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const aRelire = lignes.filter(l => !l.verifie).length;
const md = `# Relecture formateur

*Fichier généré par \`node outils/relecture.mjs\` : ne pas modifier à la main.*

**${aRelire} élément${aRelire > 1 ? 's' : ''} sur ${lignes.length} à valider.** Pour chaque ligne, le formateur vérifie l'exactitude
technique, le niveau, le risque et la référence normative (édition comprise), puis passe \`"verifie": true\` dans le fichier source
(\`data/*.json\` ; pour un calcul, ajouter \`verifie: true\` au générateur dans \`js/calcul.js\`).

Les éditions sont ajoutées automatiquement depuis \`js/normes.js\` : les confirmer aussi.

## Normes citées sans édition connue

${[...sansEdition].sort().map(c => `- ${c}`).join('\n') || '- aucune'}

## Contenu

| Mode | Identifiant | Niv. | Domaines | Intitulé | Référence (édition) | Relu |
|---|---|---|---|---|---|---|
${lignes.map(l => `| ${l.mode} | \`${l.id}\` | ${R[l.niveau] ?? '—'} | ${(l.domaines ?? []).join(', ')} | ${cellule(l.titre).slice(0, 90)} | ${cellule(annoterNorme(l.norme))} | ${l.verifie ? 'oui' : '☐'} |`).join('\n')}
`;
writeFileSync(new URL('../docs/relecture-formateur.md', import.meta.url), md);
console.log(`docs/relecture-formateur.md : ${lignes.length} éléments, ${aRelire} à relire, ${sansEdition.size} normes sans édition connue.`);
