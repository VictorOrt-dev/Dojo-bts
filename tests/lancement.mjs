// P. Prêt pour le lancement : premier lancement, parcours en 3 blocs, données 100 % locales (export → effacement →
// import), zones de touche pour le pouce et textes ≥ 12 px sur tous les écrans, en clair et en sombre.

import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();

const ECRANS = ['#/entrainement', '#/entrainement/reco', '#/entrainement/reco?n=1', '#/entrainement/calcul?n=2', '#/entrainement/panne',
  '#/entrainement/panne?c=moteur-grogne', '#/entrainement/banc?panne=fu1-fondu', '#/entrainement/banc?circuit=eclairage', '#/entrainement/isolement',
  '#/entrainement/isolement?s=iso-moteur-variateur', '#/entrainement/revision', '#/entrainement/memos', '#/entrainement/positionnement', '#/profil',
  '#/entrainement/banc?circuit=etoile-triangle', '#/entrainement/isolement?s=iso-moteur-vernis', '#/entrainement/examen', '#/entrainement/banc?tuto=1', '#/entrainement/lexique', '#/entrainement/banc?libre=1', '#/entrainement/socle', '#/bienvenue'];

export default async function ({ t, url: U, navigateur }) {
  t.section('P. Lancement : première prise en main, 3 blocs, données locales, ergonomie iPhone');

  // ---------- Premier lancement ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
    await p.goto(U); await p.waitForSelector('.bienvenue-intro');
    const intro = net(await p.textContent('.bienvenue-intro'));
    const phrases = intro.split(/(?<=[.!?])\s+(?=[A-ZÉÈ])/);
    t.ok(phrases.length === 2 && /simulateur|terrain/.test(intro) && intro.includes('hors connexion') && intro.includes('sans compte'),
      'premier lancement : l\'objectif du simulateur en 2 phrases (terrain, hors connexion, sans compte)');
    t.ok(await p.locator('.mode-profil[data-profil]').count() === 2 && await p.locator('.choix-entre-deux').count() === 1
      && net(await p.textContent('main')).includes('12 questions') && net(await p.textContent('main')).includes('4 piliers'),
      'puis « Où en es-tu ? » : deux grands choix (socle des 4 piliers / test de 12 questions) et « Entre les deux » discret');
    await contexte.close();
  }

  // ---------- Les 3 blocs : 10 raccourcis (dont le socle), chacun ouvre le bon écran ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.blocs-parcours');
    const liens = await p.$$eval('.bloc-liens a', l => l.map(a => ({ href: a.getAttribute('href'), texte: a.textContent.trim() })));
    const attendu = { reco: '.choix-btn', calcul: '.exercice', panne: '.ligne-panne', banc: '.tableau-bord', isolement: '.ligne-isolement', socle: '.socle-jeu' };
    const ko = [];
    for (const l of liens) {
      await p.goto(U + '#/x'); await p.goto(U + l.href);
      const mode = l.href.split('/')[2].split('?')[0];
      try { await p.waitForSelector(attendu[mode], { timeout: 5000 }); } catch { ko.push(l.texte); }
    }
    t.ok(liens.length === 10 && ko.length === 0, `accueil › Le parcours en 3 blocs : ${liens.length} raccourcis, chacun ouvre son écran` + (ko.length ? ' — en échec : ' + ko.join(', ') : ''));
    await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc?circuit=eclairage'); await p.waitForSelector('.tuto-carte');
    await p.click('#tuto-quitter'); await p.waitForFunction(() => document.querySelector('.titre-chapitre')?.textContent.includes('télérupteur'));
    t.ok(!(await p.$('.tuto-carte')) && p.url().includes('circuit=eclairage'),
      'raccourci « Banc · éclairage », première fois : le guide d\'abord ; « Quitter le guide » ouvre bien le circuit d\'éclairage');
    t.ok(p.erreurs.length === 0, 'navigation entre les blocs : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Données 100 % locales : export → tout effacer → import ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { acceptDownloads: true });
    await p.addInitScript(() => {
      if (sessionStorage.getItem('prepare')) return;
      sessionStorage.setItem('prepare', '1');
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      Object.assign(e, {
        xp: 777, profil: 'confirme',
        stats: { reco: { sessions: 2, meilleurScore: 9, derniereSession: 1761900000000, niveaux: { 1: 9 }, elements: { 'sym-contact-no': { essais: 2, reussites: 1, boite: 2, revoir: 1761990000000 } } },
          banc: { sessions: 1, meilleurScore: 1, derniereSession: 1761900000000, elements: { 'fu1-fondu': { essais: 1, reussites: 1 } } } },
        positionnement: { niveau: 2, score: 9, date: 1761900000000, niveaux: { reco: 2, calcul: 1, panne: 1 } },
        activite: { jours: ['2026-10-30', '2026-10-31'] },
        jalons: { memosApresErreur: 3, isolementPropre: ['iso-prises-neuves'] },
        badges: { 'habilite-banc': 1761900000000 }
      });
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    });
    const lire = () => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')));
    p.on('dialog', d => d.accept());   // « Tout effacer ? » puis « Remplacer toutes tes données ? »
    await p.goto(U + '#/profil'); await p.waitForSelector('.donnees-locales');
    t.ok(net(await p.textContent('.donnees-locales')) === 'Tes données de progression restent 100 % locales sur ton appareil. Zéro compte requis, zéro serveur externe.',
      'Carnet › Sauvegarde : « Tes données de progression restent 100 % locales sur ton appareil. Zéro compte requis, zéro serveur externe. »');
    const avant = await lire();
    const [telechargement] = await Promise.all([p.waitForEvent('download'), p.click('#btn-export')]);
    const chemin = await telechargement.path();
    const fichier = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    t.ok(/^elec-learning-\d{4}-\d{2}-\d{2}\.json$/.test(telechargement.suggestedFilename()) && fichier.xp === 777 && fichier.badges['habilite-banc'] && fichier.activite.jours.length === 2,
      `export : fichier ${telechargement.suggestedFilename()} avec XP, statistiques, insignes, série et jalons`);
    await p.click('#btn-effacer'); await p.waitForTimeout(300);
    const vide = await lire();
    t.ok((vide.xp ?? 0) === 0 && !Object.keys(vide.badges ?? {}).length, 'tout effacer : progression remise à zéro');
    await p.goto(U + '#/profil'); await p.waitForSelector('#fichier-import', { state: 'attached' });
    await p.setInputFiles('#fichier-import', chemin);
    await p.waitForFunction(() => document.body.textContent.includes('Sauvegarde importée'));
    const apres = await lire();
    const garde = e => ({ xp: e.xp, profil: e.profil, stats: e.stats, positionnement: e.positionnement, activite: e.activite, jalons: e.jalons, badges: e.badges });
    const differences = Object.keys(garde(avant)).filter(k => !isDeepStrictEqual(garde(apres)[k], garde(avant)[k]));
    t.ok(differences.length === 0, 'import du fichier exporté : progression restaurée à l\'identique (révision, positionnement, insignes, série, jalons)'
      + (differences.length ? ' — diffère : ' + differences.map(k => `${k} ${JSON.stringify(garde(avant)[k])} → ${JSON.stringify(garde(apres)[k])}`).join(' | ') : ''));
    t.ok(p.erreurs.length === 0, 'export / import : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Ergonomie iPhone : touches pour le pouce, textes ≥ 12 px, clair et sombre ----------
  for (const schema of ['dark', 'light']) {
    const { contexte, page: p } = await nouvellePage(navigateur, { colorScheme: schema });
    const petitesTouches = new Map(), petitsTextes = new Map();
    for (const h of ECRANS) {
      await p.goto(U + '#/x'); await p.goto(U + h); await p.waitForTimeout(400);
      const r = await p.evaluate(() => {
        const touches = [], textes = [];
        const visible = e => { const st = getComputedStyle(e); return st.display !== 'none' && st.visibility !== 'hidden' && e.getClientRects().length && !e.closest('[hidden]'); };
        // Les mots du lexique sont des cibles intégrées au texte : exception de taille du WCAG 2.5.8 (vérifiés à part).
        for (const e of document.querySelectorAll('a[href], button:not(.terme), summary, select, [role="button"]:not(.terme)')) {
          if (!visible(e)) continue;
          const st = getComputedStyle(e);
          if (st.display === 'inline' && e.closest('p, li, dd, td')) continue;   // lien dans une phrase
          const b = e.getBoundingClientRect();
          if (b.height < 44 || b.width < 44) touches.push(`${e.textContent.trim().slice(0, 24)} (${Math.round(b.width)}×${Math.round(b.height)})`);
        }
        for (const e of document.querySelectorAll('body *')) {
          if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !visible(e)) continue;
          let taille = parseFloat(getComputedStyle(e).fontSize);
          const svg = e.closest('svg');
          if (svg) { const vb = svg.viewBox.baseVal; if (vb?.width) taille *= svg.getBoundingClientRect().width / vb.width; }
          if (taille < 11.95) textes.push(`${e.textContent.trim().slice(0, 24)} (${taille.toFixed(1)} px)`);
        }
        return { touches, textes, theme: document.documentElement.dataset.theme ?? 'sombre' };
      });
      r.touches.forEach(x => petitesTouches.set(x, h)); r.textes.forEach(x => petitsTextes.set(x, h));
    }
    const nom = schema === 'dark' ? 'sombre' : 'clair';
    const theme = await p.evaluate(() => document.documentElement.dataset.theme);
    t.ok(schema === 'dark' ? !theme : theme === 'porcelaine', `téléphone en mode ${nom} : thème ${nom} appliqué automatiquement`);
    t.ok(petitesTouches.size === 0, `mode ${nom} : toutes les commandes font au moins 44 × 44 px sur ${ECRANS.length} écrans` + (petitesTouches.size ? ' — ' + [...petitesTouches].slice(0, 5).map(([x, h]) => `${x} ${h}`).join(' | ') : ''));
    t.ok(petitsTextes.size === 0, `mode ${nom} : aucun texte sous 12 px sur ${ECRANS.length} écrans` + (petitsTextes.size ? ' — ' + [...petitsTextes].slice(0, 5).map(([x, h]) => `${x} ${h}`).join(' | ') : ''));
    t.ok(p.erreurs.length === 0, `mode ${nom} : aucune erreur dans la console sur ${ECRANS.length} écrans` + (p.erreurs.length ? ' — ' + p.erreurs.slice(0, 3).join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Audit 360° : CSP (C5), échec d'écriture (C6), libellés (C3, C4) ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.addInitScript(() => { window.__violations = []; document.addEventListener('securitypolicyviolation', e => window.__violations.push(e.violatedDirective)); });
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.prochaine');
    const csp = await p.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
    const directive = nom => (csp.split(';').map(x => x.trim()).find(x => x.startsWith(nom + ' ')) ?? '');
    t.ok(csp && directive('default-src') === "default-src 'self'" && directive('script-src') === "script-src 'self'" && directive('object-src').includes("'none'")
      && !/https?:|\*/.test(csp), 'CSP : tout vient de l\'app elle-même, scripts sans « unsafe-inline », aucun hôte externe, objets interdits');
    t.ok((await p.evaluate(() => window.__violations.length)) === 0, 'CSP : aucune violation pendant le chargement de l\'accueil');
    const bloque = await p.evaluate(async () => {
      window.__violations = [];
      const img = new Image(); img.src = 'https://exemple.invalid/traceur.png';
      const s = document.createElement('script'); s.textContent = 'window.__injecte = true'; document.body.append(s);
      let fetchBloque = false; try { await fetch('https://exemple.invalid/donnees'); } catch { fetchBloque = true; }
      await new Promise(r => setTimeout(r, 300));
      return { violations: [...new Set(window.__violations)].sort().join(','), injecte: !!window.__injecte, fetchBloque };
    });
    t.ok(!bloque.injecte && bloque.fetchBloque && /connect-src/.test(bloque.violations) && /img-src/.test(bloque.violations) && /script-src/.test(bloque.violations),
      `CSP en action : script injecté, image et requête externes bloqués (${bloque.violations})`);
    await contexte.close();
  }
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement/reco?n=1'); await p.waitForSelector('.choix-btn');
    await p.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota dépassé', 'QuotaExceededError'); }; });
    await p.click('.choix-btn >> nth=0'); await p.waitForSelector('.alerte-stockage');
    t.ok(net(await p.textContent('.alerte-stockage')).includes('Progression non enregistrée') && net(await p.textContent('.alerte-stockage')).includes('stockage de ton téléphone est plein')
      && (await p.getAttribute('.alerte-stockage', 'role')) === 'alert', 'stockage plein : bandeau d\'alerte visible (« Progression non enregistrée », exporter depuis le Carnet)');
    await p.click('#suivant'); await p.click('.choix-btn >> nth=0'); await p.waitForTimeout(200);
    t.ok(await p.locator('.alerte-stockage').count() === 1, 'un seul bandeau, même si les échecs se répètent');
    await p.click('.alerte-stockage .btn');
    t.ok(await p.locator('.alerte-stockage').count() === 0, '« Compris » ferme le bandeau');
    await contexte.close();
  }
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.addInitScript(() => {
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      e.stats = { banc: { sessions: 2, meilleurScore: 1, derniereSession: 1, elements: { 'fu1-fondu': { essais: 2, reussites: 1 } } },
        isolement: { sessions: 1, meilleurScore: 1, derniereSession: 1, elements: { 'iso-prises-neuves': { essais: 1, reussites: 1 } } } };
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    });
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.mode-banc');
    t.ok(net(await p.textContent('.mode-banc .mode-record')) === '1 réparée' && net(await p.textContent('.mode-banc .mode-desc')).includes('3 circuits'),
      'accueil › Banc : « 1 réparée » (plus « sans faute ») et description des 3 circuits');
    await p.goto(U + '#/profil'); await p.waitForSelector('.stats');
    const carnet = net(await p.textContent('.stats'));
    t.ok(carnet.includes('Banc de mesure1 réparée') && carnet.includes('Mesure d\'isolement1 réussie'), 'Carnet : banc « réparée », isolement « réussie »');
    await contexte.close();
  }
}
