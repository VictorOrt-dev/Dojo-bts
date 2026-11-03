// L. Ergonomie de terrain (iPhone 13, 390 × 844) : banc sous le pouce, guide « Première intervention », aides du multimètre, aucun texte sous 12 px,
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
  t.ok(barre.y + barre.height <= H - NAV && barre.height <= 170, `à l'arrivée : appareil de mesure replié en barre (${Math.round(barre.height)} px), visible sans défiler`);
  await p.click('.poignee-console');
  const cibles = { Mesurer: '#mesurer', 'V~': '[data-fonction="hz"]', LoZ: '[data-fonction="loz"]', 'Ω': '[data-fonction="ohm"]', 'pointe rouge': '#rouge', 'pointe COM': '#noir', afficheur: '.console-banc .nixie' };
  const positions = {};
  for (const [nom, sel] of Object.entries(cibles)) positions[nom] = await boite(sel);
  t.ok(Object.values(positions).every(b => b && b.y >= 0 && b.y + b.height <= H - NAV),
    'appareil déplié, sans défiler : fonctions, pointes, afficheur et « Mesurer » tous à l\'écran');
  const haut = Math.min(...Object.values(positions).map(b => b.y));
  t.ok(dansLePouce(positions.Mesurer) && haut >= H * 0.4,
    `« Mesurer » dans la moitié basse (${Math.round(positions.Mesurer.y)} px) ; toutes les commandes dans les 60 % bas de l'écran (la plus haute à ${Math.round(haut)} px)`);
  t.ok(Object.values(positions).every(b => b.height >= 44), 'commandes de la console : toutes ≥ 44 px de haut');
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
  t.ok(dansLePouce(await boite('#mesurer')), 'console toujours au même endroit après défilement du contenu');

  // ---------- Bon d'intervention repliable ----------
  t.ok(await p.evaluate(() => document.querySelector('.bon-details').open) && await p.isVisible('.signale-court'), 'à l\'arrivée : bon d\'intervention ouvert, symptôme signalé visible');
  await p.selectOption('#rouge', 'x3'); await p.click('#mesurer');
  t.ok(!(await p.evaluate(() => document.querySelector('.bon-details').open)) && await p.isVisible('.signale-court'), 'dès la première mesure : bon replié, le symptôme reste affiché en une ligne');

  // ---------- Aides du multimètre : légende sous chaque fonction, aide de la fonction choisie ----------
  const legendes = await p.$$eval('.fonctions .fonction-legende', l => l.map(e => e.textContent));
  t.ok(legendes.join() === 'Tension ?,Anti-fantôme,Hors tension', `sous le sélecteur : une légende par fonction (${legendes.join(' · ')})`);
  t.ok((await p.textContent('#aide-fonction')).includes('fantôme') && (await p.getAttribute('[data-fonction="loz"]', 'aria-describedby')) === 'aide-fonction',
    'aide de la fonction choisie, reliée aux boutons (aria-describedby)');
  await p.click('[data-fonction="ohm"]');
  t.ok(await p.evaluate(() => document.querySelector('#aide-fonction').classList.contains('alerte')) && /non consigné/i.test(await p.textContent('#aide-fonction')),
    'Ω choisi sans consigner : l\'aide passe en alerte avant même la mesure');
  await p.click('[data-fonction="hz"]');

  // ---------- Volets en accordéon : un seul ouvert à la fois ----------
  await p.click('.poignee-console');   // appareil replié : le contenu reprend la place
  await p.click('.bon-details summary'); await p.click('.schema-details summary');
  t.ok(await p.evaluate(() => document.querySelector('.schema-details').open && !document.querySelector('.bon-details').open),
    'schéma de l\'armoire ouvert : le bon d\'intervention se replie (un seul volet ouvert)');
  await p.click('.poignee-console');

  // ---------- L'appareil garde l'état choisi d'une intervention à l'autre ----------
  await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc?panne=fu1-fondu'); await p.waitForSelector('.poignee-console');
  t.ok(await p.isVisible('#mesurer'), 'appareil laissé ouvert : il revient ouvert à l\'intervention suivante, « Mesurer » à portée de pouce');

  // ---------- Tutoriel « Première intervention » ----------
  {
    const { contexte: c, page: q } = await nouvellePage(navigateur);
    const carte = async () => (await q.textContent('.tuto-carte')).replace(/\s+/g, ' ');
    const cible = sel => q.locator(`${sel}.tuto-cible`).count();
    await q.goto(U + '#/entrainement'); await q.click('.tabbar a[data-onglet="banc"]'); await q.waitForSelector('.tuto-carte');
    t.ok((await carte()).includes('Étape 1/4 · Lis le symptôme') && await cible('.bloc-symptome') === 1 && await q.isVisible('.bon-details[open]'),
      'premier accès au banc : le guide « Première intervention » démarre seul, étape 1 = le symptôme du bon, mis en surbrillance');
    const symptome = await q.locator('.bloc-symptome').boundingBox(), fiche = await q.locator('.tuto-carte').boundingBox();
    t.ok(symptome.y < fiche.y && symptome.y >= 0, 'étape 1 : le bon d\'intervention est à l\'écran, au-dessus de la fiche du guide');
    await q.click('#tuto-suivant');
    t.ok((await carte()).includes('Étape 2/4 · Pose les pointes') && await cible('.pointe.rouge') === 1 && await q.isVisible('#mesurer'),
      'étape 2 : l\'appareil s\'ouvre, la pointe rouge est mise en surbrillance');
    await q.selectOption('#rouge', 'x1');
    t.ok(await cible('#mesurer') === 1, 'pointe posée : la surbrillance passe sur « Mesurer »');
    const m = await q.locator('#mesurer').boundingBox();
    t.ok(m.y >= H * 0.45 && m.y + m.height <= H - NAV, `pendant le guide, « Mesurer » reste sous le pouce (${Math.round(m.y)} px)`);
    await q.click('#mesurer');
    t.ok((await carte()).includes('Suis le courant') && (await q.textContent('#lecture')).trim() === '229', 'X1 : 1 → 0 V : 229 V, le guide fait suivre le courant jusqu\'au pupitre');
    await q.selectOption('#rouge', 's11'); await q.click('#mesurer');
    t.ok((await carte()).includes('Étape 3/4 · V~ ou LoZ') && await cible('[data-fonction="loz"]') === 1 && (await q.textContent('.note-mesure')).includes('hésite'),
      'étape 3 : 91 V qui hésitent au pupitre, le guide désigne V~ LoZ');
    await q.click('[data-fonction="loz"]'); await q.click('#mesurer');
    const lecture = () => q.evaluate(async () => (await import('/js/banc.js')).interventionEnCours().mesure.lecture?.valeur);
    t.ok((await carte()).includes('Étape 4/4 · Trouve et valide') && await lecture() === '0' && await cible('[data-action="consigner"]') === 1,
      'étape 4 : 0 V en LoZ (tension fantôme démasquée), le câble est localisé ; le guide ouvre Actions et désigne « Consigner »');
    await q.click('[data-action="consigner"]');
    t.ok(await cible('[data-fonction="ohm"]') === 1, 'consigné : le guide revient au multimètre et désigne Ω');
    await q.click('[data-fonction="ohm"]'); await q.selectOption('#rouge', 'x1'); await q.selectOption('#noir', 's11'); await q.click('#mesurer');
    t.ok(await lecture() === 'OL' && await cible('[data-action="remplacer"]') === 1 && (await q.inputValue('#piece')) === 'cable',
      'OL à l\'ohmmètre : diagnostic confirmé, « Remplacer » désigné avec le câble déjà choisi');
    await q.click('[data-action="remplacer"]'); await q.click('[data-action="consigner"]');
    t.ok((await carte()).includes('Valide par un essai') && await cible('[data-action="essai"]') === 1, 'pièce changée, départ rendu : dernier geste, l\'essai');
    await q.click('[data-action="essai"]'); await q.waitForSelector('.bilan-tuto');
    const fin = (await q.textContent('main')).replace(/\s+/g, ' ');
    const e = await q.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')));
    t.ok(fin.includes('Diagnostic validé') && fin.includes('Les 4 réflexes') && await q.isVisible('text=Ma première vraie panne'),
      'fin du guide : « Diagnostic validé », les 4 réflexes, puis « Ma première vraie panne »');
    t.ok(e.preferences.tutoBanc === true && !e.stats?.banc && !(e.xp > 0), 'guide mémorisé comme fait ; la démonstration ne compte ni en statistiques ni en XP');
    await q.goto(U + '#/entrainement'); await q.goto(U + '#/entrainement/banc'); await q.waitForSelector('.poignee-console');
    t.ok(!(await q.$('.tuto-carte')) && await q.isVisible('.btn-guide'), 'retour au banc : une vraie panne, le guide ne s\'impose plus ; bouton « ? Guide du banc » toujours là');
    const g = await q.locator('.btn-guide').boundingBox();
    t.ok(g.height >= 44, `bouton « ? Guide du banc » : ${Math.round(g.height)} px de haut`);
    await q.click('.btn-guide'); await q.waitForSelector('.tuto-carte');
    t.ok((await carte()).includes('Étape 1/4'), '« ? Guide du banc » relance le guide depuis l\'étape 1');
    await q.click('#tuto-quitter'); await q.waitForSelector('.choix-circuit');
    t.ok(!(await q.$('.tuto-carte')) && q.url().includes('circuit=depart-moteur'), '« Quitter le guide » : retour à une intervention normale');
    t.ok(q.erreurs.length === 0, 'guide du banc : aucune erreur dans la console' + (q.erreurs.length ? ' — ' + q.erreurs.join(' | ') : ''));
    await c.close();
  }
  {
    const { contexte: c, page: q } = await nouvellePage(navigateur);
    await q.addInitScript(() => { const e = JSON.parse(localStorage.getItem('elec-learning:v1')); e.preferences = { visiteBanc: true }; localStorage.setItem('elec-learning:v1', JSON.stringify(e)); });
    await q.goto(U + '#/entrainement/banc'); await q.waitForSelector('.poignee-console');
    t.ok(!(await q.$('.tuto-carte')), 'ancienne visite déjà faite : le guide ne s\'impose pas (il reste au bouton « ? Guide du banc »)');
    await c.close();
  }

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
