// O. Insignes de terrain, séries de jours et retours visuels (vitrine du Carnet, persistance dans localStorage).

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();

export default async function ({ t, url: U, navigateur }) {
  t.section('O. Qualifications & insignes : déblocage, séries, persistance, animations');
  const qs = await (await fetch(U + 'data/reconnaissance.json')).json();
  const etat = p => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')));
  const repondre = async (p, juste) => {
    await p.waitForSelector('.choix-btn:not([disabled])');
    const src = await p.getAttribute('.reco-visuel img', 'src');
    const question = (await p.textContent('.question')).replace(/\s/g, '');
    const q = qs.find(x => x.image === src && x.question.replace(/\s/g, '') === question);
    const textes = (await p.locator('.choix-btn').allTextContents()).map(x => x.replace(/\s/g, '').slice(1));
    await p.locator('.choix-btn').nth(textes.findIndex(x => (x === q.nom.replace(/\s/g, '')) === juste)).click();
    return q;
  };

  // ---------- Nouvel utilisateur : vitrine verrouillée, première série ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/profil'); await p.waitForSelector('.vitrine');
    t.ok(await p.locator('.vitrine .insigne').count() === 8 && await p.locator('.vitrine .insigne.verrouille').count() === 8 && net(await p.textContent('.vitrine-resume')).startsWith('0/8 insignes'),
      'Carnet › Qualifications & insignes : 8 insignes, tous verrouillés, avec leur critère et leur progression');
    await p.goto(U + '#/entrainement/reco?n=1'); await repondre(p, false);
    const e = await etat(p);
    const aujourdhui = await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    t.ok(e.activite.jours.join() === aujourdhui, `première réponse : jour d'entraînement enregistré (${aujourdhui})`);

    // Fiche mémo ouverte après l'erreur : comptée une seule fois
    await p.waitForSelector('.memo'); await p.click('.memo summary'); await p.click('.memo summary'); await p.click('.memo summary');
    await p.waitForTimeout(150);
    t.ok((await etat(p)).jalons.memosApresErreur === 1, 'fiche mémo ouverte sous une correction ratée : comptée une fois (« Rigueur normative » 1/10)');
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.serie-jours');
    t.ok(net(await p.textContent('.serie-jours')) === 'Série : 1 jour', 'accueil : indicateur discret « Série : 1 jour »');
    t.ok(p.erreurs.length === 0, 'insignes (nouvel utilisateur) : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Déblocage : série de 3 jours et 5 cas de panne menés à terme ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.addInitScript(() => {
      if (sessionStorage.getItem('prepare')) return;
      sessionStorage.setItem('prepare', '1');
      const jour = k => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      e.activite = { jours: [jour(2), jour(1), jour(0)] };
      e.stats = { panne: { sessions: 5, meilleurScore: 3, derniereSession: 1, elements: Object.fromEntries(['commande-hs', 'moteur-grogne', 'barrette-terre', 'neutre-tgbt', 'capteur-convoyeur'].map(id => [id, { essais: 1, reussites: 0, boite: 1, revoir: 1 }])) } };
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    });
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.insigne-obtenu');
    const annonce = net(await p.textContent('.insigne-obtenu'));
    const style = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.insigne-obtenu')); const i = getComputedStyle(document.querySelector('.insigne-obtenu-icone')); return { pe: s.pointerEvents, anim: i.animationName }; });
    t.ok(annonce.includes('Insigne obtenu') && /Chasseur de pannes|Régularité de chantier/.test(annonce) && style.pe === 'none' && style.anim === 'tampon',
      `déblocage : annonce « ${annonce} », icône posée comme un tampon, sans bloquer l'écran`);
    const b = (await etat(p)).badges;
    t.ok(b['regularite'] > 0 && b['chasseur-pannes'] > 0 && Object.keys(b).length === 2, 'insignes enregistrés dans localStorage avec leur date : « Régularité de chantier » et « Chasseur de pannes »');
    t.ok(net(await p.textContent('.serie-jours')) === 'Série : 3 jours' && await p.locator('.serie-marques span').count() === 3, 'série de 3 jours : « Série : 3 jours », trois repères');
    await p.waitForTimeout(3600);
    t.ok(net(await p.textContent('.insigne-obtenu')).includes(annonce.includes('Chasseur') ? 'Régularité' : 'Chasseur'), 'deux insignes d\'un coup : annoncés l\'un après l\'autre');
    await p.goto(U + '#/profil'); await p.waitForSelector('.vitrine');
    t.ok(await p.locator('.insigne.obtenu').count() === 2 && net(await p.textContent('.insigne[data-badge="chasseur-pannes"] .insigne-etat')).startsWith('Obtenu le')
      && net(await p.textContent('.vitrine-resume')).startsWith('2/8 insignes'), 'vitrine : 2 insignes débloqués, « Obtenu le … », les autres verrouillés');
    await p.reload(); await p.waitForSelector('.vitrine'); await p.waitForTimeout(300);
    t.ok(await p.locator('.insigne.obtenu').count() === 2 && !(await p.$('.insigne-obtenu')), 'après rechargement : insignes conservés, pas de seconde annonce');
    await contexte.close();
  }

  // ---------- Mégohmmètre : 6 mesures sans dégât ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.addInitScript(() => {
      if (sessionStorage.getItem('prepare')) return;
      sessionStorage.setItem('prepare', '1');
      const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
      e.jalons = { memosApresErreur: 0, isolementPropre: ['iso-prises-neuves', 'iso-eclairage-clou', 'iso-moteur-variateur', 'iso-commande-24v', 'iso-cable-vieillissant'] };
      localStorage.setItem('elec-learning:v1', JSON.stringify(e));
    });
    await p.goto(U + '#/entrainement/isolement?s=iso-neutre-terre'); await p.waitForSelector('#tester');
    await p.click('[data-prep="consigne"]'); await p.selectOption('#iso-a', 'N'); await p.selectOption('#iso-b', 'PE'); await p.click('#tester');
    await p.click('.choix-btn:has-text("chercher le point")'); await p.waitForSelector('.insigne-obtenu');
    t.ok(net(await p.textContent('.insigne-obtenu')).includes('Maître du mégohmmètre') && (await etat(p)).jalons.isolementPropre.length === 6,
      'sixième mesure d\'isolement réussie sans dégât : « Maître du mégohmmètre »');
    await contexte.close();
  }

  // ---------- Niveau validé : tampon sur le rapport ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement/reco?n=1');
    for (let i = 0; i < 10; i++) { await repondre(p, true); await p.click('#suivant'); }
    await p.waitForSelector('.bilan');
    const tampon = await p.evaluate(() => { const el = document.querySelector('.tampon-valide'); return el && { texte: el.textContent.trim(), anim: getComputedStyle(el).animationName }; });
    t.ok(tampon?.texte === 'Niveau validé' && tampon.anim === 'tampon', 'séance de niveau à 10/10 : tampon « Niveau validé » animé sur le rapport');
    await p.waitForSelector('.insigne-obtenu');
    t.ok(net(await p.textContent('.insigne-obtenu')).includes('Sans faute') && (await etat(p)).badges['sans-faute'] > 0, '10/10 : insigne « Sans faute »');
    t.ok(p.erreurs.length === 0, 'insignes : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }
}
