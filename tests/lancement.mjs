// P. Prêt pour le lancement : premier lancement, parcours en 3 blocs, données 100 % locales (export → effacement →
// import), zones de touche pour le pouce et textes ≥ 12 px sur tous les écrans, en clair et en sombre.

import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();

const ECRANS = ['#/entrainement', '#/entrainement/reco', '#/entrainement/reco?n=1', '#/entrainement/calcul?n=2', '#/entrainement/panne',
  '#/entrainement/panne?c=moteur-grogne', '#/entrainement/banc?panne=fu1-fondu', '#/entrainement/banc?circuit=eclairage', '#/entrainement/isolement',
  '#/entrainement/isolement?s=iso-moteur-variateur', '#/entrainement/revision', '#/entrainement/memos', '#/entrainement/positionnement', '#/profil'];

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
    t.ok(await p.locator('.bienvenue-blocs li').count() === 3 && net(await p.textContent('.bienvenue-blocs')).includes('Armoire & banc')
      && await p.locator('[data-profil]').count() === 3 && net(await p.textContent('main')).includes('12 questions'),
      'puis le parcours en 3 blocs et « Où en es-tu ? » (3 profils, test de 12 questions)');
    await contexte.close();
  }

  // ---------- Les 3 blocs : 9 raccourcis, chacun ouvre le bon écran ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.blocs-parcours');
    const liens = await p.$$eval('.bloc-liens a', l => l.map(a => ({ href: a.getAttribute('href'), texte: a.textContent.trim() })));
    const attendu = { reco: '.choix-btn', calcul: '.exercice', panne: '.ligne-panne', banc: '.tableau-bord', isolement: '.ligne-isolement' };
    const ko = [];
    for (const l of liens) {
      await p.goto(U + '#/x'); await p.goto(U + l.href);
      const mode = l.href.split('/')[2].split('?')[0];
      try { await p.waitForSelector(attendu[mode], { timeout: 5000 }); } catch { ko.push(l.texte); }
    }
    t.ok(liens.length === 9 && ko.length === 0, `accueil › Le parcours en 3 blocs : ${liens.length} raccourcis, chacun ouvre son écran` + (ko.length ? ' — en échec : ' + ko.join(', ') : ''));
    await p.goto(U + '#/entrainement'); await p.goto(U + '#/entrainement/banc?circuit=eclairage'); await p.waitForSelector('.tableau-bord');
    t.ok(net(await p.textContent('.titre-chapitre')).includes('télérupteur'), 'raccourci « Banc · éclairage » : le circuit d\'éclairage s\'ouvre directement');
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
        for (const e of document.querySelectorAll('a[href], button, summary, select, [role="button"]')) {
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
}
