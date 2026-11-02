// Éditions des normes citées dans le contenu. La ligne « Réf. » de chaque correction les ajoute d'elle-même :
// « NF C 18-510 » devient « NF C 18-510:2012+A1:2020 ». L'audit d'intégrité (node outils/audit.mjs) refuse toute
// norme citée sans édition dans ce tableau.
//
// Règle de citation : les paragraphes de la NF C 15-100 suivent son édition 2002 (433, 434, 523, 525, 531, 535, 542,
// 771). La protection contre les chocs électriques (schémas TT, TN, IT, différentiel 30 mA) se cite dans
// l'IEC 60364-4-41:2005 (§ 411.x), dont la numérotation est celle reprise par la NF C 15-100 actuelle.

export const EDITIONS = [
  { code: 'NF C 15-100', edition: '2002' },
  { code: 'NF C 18-510', edition: '2012+A1:2020' },
  { code: 'NF C 13-100', edition: '2015' },
  { code: 'NF EN 60204-1', edition: '2018' },
  { code: 'IEC 60204-1', edition: '2016' },
  { code: 'IEC 60947-1', edition: '2020' },
  { code: 'IEC 60947-2', edition: '2016' },
  { code: 'IEC 60947-3', edition: '2020' },
  { code: 'IEC 60947-4-1', edition: '2018' },
  { code: 'IEC 60947-5-1', edition: '2016' },
  { code: 'IEC 60947-5-2', edition: '2019' },
  { code: 'IEC 60617', edition: 'base en ligne', libre: true },
  { code: 'IEC 81346-2', edition: '2019' },
  { code: 'ISO 13850', edition: '2015' },
  { code: 'IEC 60445', edition: '2021' },
  { code: 'NF EN 61243-3', edition: '2014' },
  { code: 'IEC 60076-1', edition: '2011' },
  { code: 'IEC 60076-5', edition: '2006' },
  { code: 'IEC 60034-1', edition: '2022' },
  { code: 'IEC 60034-26', edition: '2006' },
  { code: 'IEC 60831-1', edition: '2014' },
  { code: 'IEC 60479-1', edition: '2018' },
  { code: 'IEC 61131-2', edition: '2017' },
  { code: 'IEC 60038', edition: '2009' },
  { code: 'IEC 61800-5-1', edition: '2022' },
  { code: 'IEC 60364-6', edition: '2016' },
  { code: 'IEC 61557-2', edition: '2019' },
  { code: 'IEC 61557-8', edition: '2014' },
  { code: 'IEC 61010-1', edition: '2010' },
  { code: 'IEC 60364-4-41', edition: '2005' },
  { code: 'UTE C 15-105', edition: '2003' },
  { code: 'IEC 60381-1', edition: '1982' },
  { code: 'IEC 60034-8', edition: '2007' },
  { code: 'IEC 62271-105', edition: '2021' },
  { code: 'IEC 60417', edition: 'base en ligne', libre: true },
  { code: 'IEC 60076', edition: 'série', libre: true },
  { code: 'IEC 60255', edition: 'série', libre: true },
  { code: 'IEC 60269', edition: 'série', libre: true },
  { code: 'NF EN 60269', edition: 'série', libre: true },
  { code: 'IEC 61557-9', edition: '2014' },
  { code: 'IEC 62271-200', edition: '2021' },
  { code: 'IEC 60669-2-2', edition: '2006' },
  { code: 'IEC 61082-1', edition: '2014' },
  { code: 'IEC 61666', edition: '2010' },
  { code: 'IEC 61010-2-030', edition: '2017' },
  { code: 'ISO 13849-1', edition: '2023' },
  { code: 'IEC 62423', edition: '2009' },
  { code: 'IEC 60898-1', edition: '2015' },
  { code: 'IEC 60364-5-52', edition: '2009' },
  { code: 'IEC 60909-0', edition: '2016' },
  { code: 'IEC 80000-6', edition: '2022' },
  { code: 'NF EN 60898-1', edition: '2019' },
  { code: 'NF EN 60903', edition: '2003' },
  { code: 'NF EN 61008', edition: '2012' },
  { code: 'NF EN 61558', edition: 'série', libre: true },
  { code: 'NF EN 50216', edition: 'série', libre: true }
];

const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Le code doit être suivi d'autre chose qu'un chiffre ou un tiret-chiffre (« IEC 60947-1 » ≠ « IEC 60947-1x »)
// et ne pas porter déjà une édition (« NF C 18-510:2012 »).
const motif = e => new RegExp(`(^|[^\\w-])(${echapper(e.code)})(?![\\d:]|-\\d)`);

// Normes reconnues dans un texte de référence.
export const normesCitees = texte => EDITIONS.filter(e => motif(e).test(String(texte ?? '')));

export function annoterNorme(texte) {
  let t = String(texte ?? '');
  for (const e of EDITIONS) {
    t = t.replace(motif(e), (_, avant, code) => e.libre ? `${avant}${code} (${e.edition})` : `${avant}${code}:${e.edition}`);
  }
  return t;
}

// Remarques à afficher sous la référence (ex. paragraphes de la NF C 15-100 à recaler).
export const notesNorme = texte => normesCitees(texte).map(e => e.note).filter(Boolean);
