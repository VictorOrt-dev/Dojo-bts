// L. Ergonomie de terrain (iPhone 13, 390 × 844) : banc sous le pouce, visite guidée, aucun texte sous 12 px,
// thème qui suit le téléphone.

import { nouvellePage } from './outils.mjs';

const H = 844;
const NAV = 76;  // barre d'onglets

export default async function ({ t, url: U, navigateur }) {
  t.section('L. Ergonomie de terrain : banc sous le pouce, lisibilité, thème');
  const { contexte, page: p } = await nouvellePage(navigateur);
  const boite = async sel => p.locator(sel).first().boundingBox();
  const dansLePouce = b => b && b.y >= H * 0.45 && b.y + b.height <= H - NAV;

  // ---------- Banc : console fixée sous le pouce, sans défilement ----------
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc?panne=cable-pupitre'); await p.waitForSelector('.poignee-console');
  const barre = await boite('.console-banc');
  t.ok(barre.y + barre.height <= H - NAV && barre.height <= 170, `à l'arrivée : appareil de mesure replié en barre (${Math.round(barre.height)} px, visite guidée comprise), visible sans défiler`);
  await p.click('.poignee-console');
  const cibles = { Mesurer: '#mesurer', 'V~': '[data-fonction="hz"]', LoZ: '[data-fonction="loz"]', 'Ω': '[data-fonction="ohm"]', 'pointe rouge': '#rouge', 'pointe COM': '#noir', afficheur: '.console-banc .nixie' };
  const positions = {};
  for (const [nom, sel] of Object.entries(cibles)) positions[nom] = await boite(sel);
  t.ok(Object.values(positions).every(b => b && b.y >= 0 && b.y + b.height <= H - NAV),
    'appareil déplié, sans défiler : fonctions, pointes, afficheur et « Mesurer » tous à l\'écran');
  const haut = Math.min(...Object.values(positions).map(b => b.y));
  t.ok(dansLePouce(positions.Mesurer) && haut >= H * 0.4,
    `« Mesurer » dans la moitié basse (${Math.round(positions.Mesurer.y)} px) ; toutes les commandes dans les 60 % bas de l'écran, visite guidée comprise (la plus haute à ${Math.round(haut)} px)`);
  t.ok(Object.values(positions).every(b => b.height >= 44), 'commandes de la console : toutes ≥ 44 px de haut');
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
  t.ok(dansLePouce(await boite('#mesurer')), 'console toujours au même endroit après défilement du contenu');

  // ---------- Bon d'intervention repliable ----------
  t.ok(await p.evaluate(() => document.querySelector('.bon-details').open) && await p.isVisible('.signale-court'), 'à l\'arrivée : bon d\'intervention ouvert, symptôme signalé visible');
  await p.selectOption('#rouge', 'x3'); await p.click('#mesurer');
  t.ok(!(await p.evaluate(() => document.querySelector('.bon-details').open)) && await p.isVisible('.signale-court'), 'dès la première mesure : bon replié, le symptôme reste affiché en une ligne');

  // ---------- Visite guidée en 3 gestes ----------
  t.ok((await p.textContent('.guide-banc')).includes('Visite 2/3') && (await p.textContent('.guide-banc')).includes('LoZ'), 'visite guidée : geste 1 (mesure en V~) validé, geste 2 = LoZ et tension fantôme');
  await p.click('[data-fonction="loz"]'); await p.click('#mesurer');
  t.ok((await p.textContent('.guide-banc')).includes('Visite 3/3') && (await p.textContent('.guide-banc')).includes('Consigner'), 'geste 2 validé ; geste 3 = consigner avant tout Ω ou démontage');
  await p.click('[data-onglet-banc="actions"]'); await p.click('[data-action="consigner"]');
  t.ok((await p.textContent('.guide-banc')).includes('Visite terminée')
    && await p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')).preferences.visiteBanc === true), 'consignation faite : visite terminée et mémorisée');
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc'); await p.waitForSelector('.poignee-console');
  t.ok(!(await p.$('.guide-banc')), 'visite déjà faite : elle ne revient pas');

  // ---------- Aucun texte sous 12 px, sur 12 écrans (HTML et graduations du cadran) ----------
  const ecrans = ['#/entrainement', '#/entrainement/reco', '#/entrainement/reco?n=2', '#/entrainement/calcul?n=2', '#/entrainement/panne',
    '#/entrainement/panne?c=moteur-grogne', '#/entrainement/banc?panne=fu1-fondu', '#/profil', '#/entrainement/positionnement',
    '#/entrainement/calcul?d=hta', '#/entrainement/panne?d=securite', '#/entrainement/reco?n=3&d=hta', '#/entrainement/memos?m=slt', '#/entrainement/memos?m=chute-tension'];
  const trop = new Map();
  for (const h of ecrans) {
    await p.goto(U + '#/x'); await p.goto(U + h); await p.waitForTimeout(350);
    const petits = await p.evaluate(() => {
      const r = [];
      for (const e of document.querySelectorAll('body *')) {
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const st = getComputedStyle(e);
        if (st.display === 'none' || st.visibility === 'hidden' || !e.getClientRects().length) continue;
        let taille = parseFloat(st.fontSize);
        const svg = e.closest('svg');
        if (svg) { const vb = svg.viewBox.baseVal; if (vb?.width) taille *= svg.getBoundingClientRect().width / vb.width; }
        if (taille < 11.95) r.push(`${e.textContent.trim().slice(0, 24)} (${taille.toFixed(1)} px)`);
      }
      return r;
    });
    petits.forEach(x => trop.set(x, h));
  }
  t.ok(trop.size === 0, `aucun texte sous 12 px sur ${ecrans.length} écrans (fiches mémo comprises)` + (trop.size ? ' — ' + [...trop].slice(0, 6).map(([x, h]) => `${x} ${h}`).join(' | ') : ''));

  // ---------- Thème : « Auto » suit le téléphone ; le choix manuel reste prioritaire ----------
  for (const [schema, attendu] of [['light', 'porcelaine'], ['dark', undefined]]) {
    const { contexte: c, page: q } = await nouvellePage(navigateur, { colorScheme: schema });
    await q.goto(U); await q.waitForSelector('.plaque');
    const theme = await q.evaluate(() => document.documentElement.dataset.theme);
    t.ok(theme === attendu, `nouveau téléphone en mode ${schema === 'light' ? 'clair' : 'sombre'} : thème ${attendu ? 'clair' : 'sombre'} appliqué automatiquement`);
    if (schema === 'light') {
      await q.emulateMedia({ colorScheme: 'dark' }); await q.waitForTimeout(100);
      t.ok(await q.evaluate(() => !document.documentElement.dataset.theme), 'le téléphone passe en sombre : l\'app suit en direct');
      await q.goto(U + '#/profil'); await q.waitForSelector('.selecteur-theme');
      await q.click('.selecteur-theme [data-theme="porcelaine"]'); await q.emulateMedia({ colorScheme: 'dark' }); await q.waitForTimeout(100);
      t.ok(await q.evaluate(() => document.documentElement.dataset.theme === 'porcelaine') && (await q.getAttribute('.selecteur-theme [data-theme="porcelaine"]', 'aria-pressed')) === 'true',
        'choix manuel « Clair » dans le Carnet : prioritaire sur le réglage du téléphone');
    }
    await c.close();
  }
  t.ok(p.erreurs.length === 0, 'ergonomie : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
  await contexte.close();
}
