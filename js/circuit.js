// Petit solveur électrique pour le banc de mesure.
// - Potentiels en alternatif (phaseurs) par analyse nodale sur un réseau de résistances.
// - Un transformateur devient une source au secondaire dès que son primaire est alimenté.
// - Un conducteur « en l'air » (relié à aucune source) est flottant : un multimètre à haute impédance y lit une
//   tension fantôme (couplage capacitif avec un conducteur voisin sous tension) ; en mode LoZ, la charge de
//   l'appareil le ramène au potentiel de l'autre pointe et la fantôme disparaît.
// - Résistance équivalente entre deux bornes (multimètre en Ω), circuit hors tension.

const Z = (re = 0, im = 0) => ({ re, im });
const moins = (a, b) => Z(a.re - b.re, a.im - b.im);
const plus = (a, b) => Z(a.re + b.re, a.im + b.im);
const fois = (a, k) => Z(a.re * k, a.im * k);
export const module = a => Math.hypot(a.re, a.im);

// Résout A·x = b (Gauss avec pivot partiel). A et b sont copiés.
function resoudre(A0, b0) {
  const A = A0.map(l => [...l]);
  const b = [...b0];
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(A[l][c]) > Math.abs(A[p][c])) p = l;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let l = c + 1; l < n; l++) {
      const k = A[l][c] / A[c][c];
      if (!k) continue;
      for (let j = c; j < n; j++) A[l][j] -= k * A[c][j];
      b[l] -= k * b[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let l = n - 1; l >= 0; l--) {
    let s = b[l];
    for (let j = l + 1; j < n; j++) s -= A[l][j] * x[j];
    x[l] = s / A[l][l];
  }
  return x;
}

function voisinage(noeuds, elements) {
  const v = new Map(noeuds.map(n => [n, []]));
  for (const e of elements) {
    v.get(e.a).push({ e, autre: e.b });
    v.get(e.b).push({ e, autre: e.a });
  }
  return v;
}

// Composante connexe d'un nœud, sans traverser les nœuds « bloquants ».
function composante(depart, voisins, bloque = () => false) {
  const vus = new Set([depart]);
  const pile = [depart];
  while (pile.length) {
    const n = pile.pop();
    for (const { autre } of voisins.get(n)) {
      if (!vus.has(autre) && !bloque(autre)) { vus.add(autre); pile.push(autre); }
    }
  }
  return vus;
}

// Potentiels de tous les nœuds ; `fixes` : Map nœud → phaseur imposé.
function resoudrePotentiels(noeuds, elements, fixes) {
  const V = new Map(fixes);
  const flottants = new Set();
  const voisins = voisinage(noeuds, elements);
  const traites = new Set();
  for (const depart of noeuds) {
    if (fixes.has(depart) || traites.has(depart)) continue;
    const comp = [...composante(depart, voisins, n => fixes.has(n))];
    comp.forEach(n => traites.add(n));
    const ancre = comp.some(n => voisins.get(n).some(({ autre }) => fixes.has(autre)));
    if (!ancre) { comp.forEach(n => { flottants.add(n); V.set(n, Z()); }); continue; }
    const rang = new Map(comp.map((n, i) => [n, i]));
    const A = comp.map(() => comp.map(() => 0));
    const bre = comp.map(() => 0);
    const bim = comp.map(() => 0);
    comp.forEach((n, i) => {
      for (const { e, autre } of voisins.get(n)) {
        const g = 1 / e.R;
        A[i][i] += g;
        if (fixes.has(autre)) { bre[i] += g * fixes.get(autre).re; bim[i] += g * fixes.get(autre).im; }
        else A[i][rang.get(autre)] -= g;
      }
    });
    const re = resoudre(A, bre);
    const im = resoudre(A, bim);
    comp.forEach((n, i) => V.set(n, Z(re[i], im[i])));
  }
  return { V, flottants };
}

// circuit : { noeuds, elements: [{ id, a, b, R }], sources: { nœud: [re, im] }, transformateurs, fantomes }
// fermes : éléments conducteurs dans l'état actuel ; extra : éléments ajoutés (ex. charge du multimètre LoZ).
export function calculer(circuit, fermes, extra = []) {
  const noeuds = circuit.noeuds.map(n => n.id);
  const fixes = new Map(Object.entries(circuit.sources).map(([n, [re, im]]) => [n, Z(re, im)]));
  let actifs = [...fermes, ...extra];
  let { V, flottants } = resoudrePotentiels(noeuds, actifs, fixes);

  // Transformateurs : primaire alimenté → source au secondaire (son enroulement n'est plus une simple résistance).
  for (const t of circuit.transformateurs ?? []) {
    const [p1, p2] = t.primaire;
    const up = moins(V.get(p1), V.get(p2));
    if (flottants.has(p1) || flottants.has(p2) || module(up) < 50) continue;
    const [s1, s2] = t.secondaire;
    fixes.set(s1, plus(V.get(s2), fois(up, t.rapport)));
    actifs = actifs.filter(e => e.id !== t.enroulementSecondaire);
    ({ V, flottants } = resoudrePotentiels(noeuds, actifs, fixes));
  }

  // Tensions fantômes : un groupe flottant prend une fraction du potentiel d'un conducteur voisin sous tension.
  const voisins = voisinage(noeuds, actifs);
  const fantomes = new Set();
  const vus = new Set();
  for (const n of flottants) {
    if (vus.has(n)) continue;
    const comp = composante(n, voisins);
    comp.forEach(m => vus.add(m));
    const couple = [...comp].map(m => circuit.fantomes?.[m]).find(f => f && !flottants.has(f.couplage));
    if (!couple) continue;
    const fantome = fois(V.get(couple.couplage), couple.facteur);
    if (module(fantome) < 1) continue;
    comp.forEach(m => { V.set(m, fantome); fantomes.add(m); });
  }
  return { V, flottants, fantomes };
}

// Tension lue entre deux bornes. mode : 'hz' (multimètre classique, ~10 MΩ) ou 'loz' (basse impédance, ~3 kΩ).
export function tension(circuit, fermes, a, b, mode = 'hz') {
  const extra = mode === 'loz' ? [{ id: 'multimetre', a, b, R: 3000 }] : [];
  const { V, flottants } = calculer(circuit, fermes, extra);
  return {
    valeur: module(moins(V.get(a), V.get(b))),
    instable: mode === 'hz' && (flottants.has(a) || flottants.has(b))
  };
}

// Résistance équivalente entre deux bornes (Infinity si aucun chemin). Les sources ne sont pas prises en compte :
// l'appelant doit d'abord vérifier que le circuit est hors tension.
export function resistance(circuit, fermes, a, b) {
  if (a === b) return 0;
  const noeuds = circuit.noeuds.map(n => n.id);
  const voisins = voisinage(noeuds, fermes);
  const comp = composante(a, voisins);
  if (!comp.has(b)) return Infinity;
  const inconnus = [...comp].filter(n => n !== b);
  const rang = new Map(inconnus.map((n, i) => [n, i]));
  const A = inconnus.map(() => inconnus.map(() => 0));
  const I = inconnus.map(n => (n === a ? 1 : 0));
  inconnus.forEach((n, i) => {
    for (const { e, autre } of voisins.get(n)) {
      const g = 1 / e.R;
      A[i][i] += g;
      if (autre !== b) A[i][rang.get(autre)] -= g;
    }
  });
  return resoudre(A, I)[rang.get(a)];
}
