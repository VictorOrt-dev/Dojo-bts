// T. Accessibilité et terrain : couleurs en toutes lettres, rappel de sauvegarde mensuel, banc libre, pointes posées
// sur le schéma, nouveaux contenus (IRVE, photovoltaïque, vérifications d'installation).

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();
const lire = p => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1')));

// Prépare l'état au premier chargement de la page (une seule fois par contexte), selon un scénario nommé.
const preparer = (p, scenario) => p.addInitScript(sc => {
  if (sessionStorage.getItem('prepare')) return;
  sessionStorage.setItem('prepare', '1');
  const e = JSON.parse(localStorage.getItem('elec-learning:v1'));
  const J = 864e5, jour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (sc === 'cable') e.stats = { reco: { sessions: 1, meilleurScore: 5, derniereSession: 1, elements: { 'reco-couleur-neutre': { essais: 1, reussites: 0, recents: '0', boite: 1, revoir: Date.now() - J } } } };
  if (sc === 'jamais-exporte') { e.xp = 150; e.stats = { reco: { sessions: 3, meilleurScore: 8, derniereSession: 1, elements: {} } }; e.activite = { jours: [jour(new Date(Date.now() - 40 * J))] }; }
  if (sc === 'export-ancien') { e.xp = 80; e.stats = { calcul: { sessions: 1, meilleurScore: 6, derniereSession: 1, elements: {} } }; e.derniereSauvegarde = Date.now() - 45 * J; }
  if (sc === 'guide-fait') e.preferences = { ...e.preferences, tutoBanc: true };
  localStorage.setItem('elec-learning:v1', JSON.stringify(e));
}, scenario);

export default async function ({ t, url: U, navigateur }) {
  t.section('T. Couleurs en toutes lettres, rappel de sauvegarde, banc libre, schéma touchable, contenus du bâtiment');

  // ---------- Daltonisme : la question du câble, en révision ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await preparer(p, 'cable');
    await p.goto(U + '#/entrainement/reco?revision=1'); await p.waitForSelector('.legende-couleurs');
    const legende = net(await p.textContent('.legende-couleurs'));
    t.ok(['Fil du haut : Marron (BN)', 'Fil du milieu : Bleu clair (BU)', 'Fil du bas : Vert-jaune (GNYE)'].every(x => legende.includes(x)),
      `question du câble : couleurs écrites sous l'image (« ${legende} »)`);
    const [img, leg] = [await p.locator('.planche').boundingBox(), await p.locator('.legende-couleurs').boundingBox()];
    t.ok(leg.y >= img.y + img.height - 1 && await p.locator('.legende-couleurs .echantillon').count() === 3, 'la légende est juste sous le visuel, avec un échantillon de chaque couleur');
    t.ok(p.erreurs.length === 0, 'daltonisme : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Rappel de sauvegarde mensuel ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { acceptDownloads: true });
    await preparer(p, 'jamais-exporte');
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.rappel-sauvegarde');
    t.ok(net(await p.textContent('.rappel-sauvegarde')).includes('jamais exportée') && await p.isVisible('#rappel-exporter'), 'progression de 40 jours jamais exportée : bandeau de sauvegarde à l\'accueil');
    const vu = (await lire(p)).preferences.rappelSauvegarde;
    t.ok(vu > Date.now() - 60_000, 'le rappel montré est daté : il ne reviendra pas avant un mois');
    const [telechargement] = await Promise.all([p.waitForEvent('download'), p.click('#rappel-exporter')]);
    await p.waitForFunction(() => document.querySelector('.rappel-sauvegarde')?.textContent.includes('exportée'));
    t.ok(/elec-learning-\d{4}-\d{2}-\d{2}\.json/.test(telechargement.suggestedFilename()) && (await lire(p)).derniereSauvegarde > Date.now() - 60_000,
      `« Exporter maintenant » : fichier ${telechargement.suggestedFilename()} et date de sauvegarde enregistrée`);
    await p.goto(U + '#/profil'); await p.goto(U + '#/entrainement'); await p.waitForSelector('.blocs-parcours');
    t.ok(!(await p.$('.rappel-sauvegarde')), 'après l\'export : plus de bandeau');
    await contexte.close();
  }
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await preparer(p, 'export-ancien');
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.rappel-sauvegarde');
    t.ok(net(await p.textContent('.rappel-sauvegarde')).includes('il y a 45 jours'), 'dernière sauvegarde il y a 45 jours : « Dernière sauvegarde il y a 45 jours »');
    await p.click('#rappel-plus-tard');
    t.ok(!(await p.$('.rappel-sauvegarde')), '« Plus tard » : le bandeau disparaît');
    await p.reload(); await p.waitForSelector('.blocs-parcours');
    t.ok(!(await p.$('.rappel-sauvegarde')), 'rechargement : pas de second rappel le même mois');
    await contexte.close();
  }
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.blocs-parcours');
    t.ok(!(await p.$('.rappel-sauvegarde')), 'nouvel utilisateur sans progression : aucun rappel');
    await contexte.close();
  }

  // ---------- Banc libre et pointes posées sur le schéma ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await preparer(p, 'guide-fait');
    await p.goto(U + '#/entrainement/banc?circuit=depart-moteur'); await p.waitForSelector('.btn-libre');
    await p.click('.btn-libre'); await p.waitForFunction(() => document.querySelector('.frontispice-banc')?.textContent.includes('Banc libre'));
    t.ok(!(await p.$('.tableau-bord')) && net(await p.textContent('.mission')).includes('aucune panne') && (await p.getAttribute('.choix-circuit a:nth-child(2)', 'href')).includes('libre=1'),
      'banc libre : circuit sain, ni chrono ni compteur d\'alertes, le choix du circuit reste en mode libre');
    await p.click('.poignee-console'); await p.waitForSelector('[data-pointe-schema="rouge"]');
    const viseur = await p.locator('[data-pointe-schema="rouge"]').boundingBox();
    t.ok(viseur.height >= 44 && viseur.width >= 44, `viseur à côté de chaque pointe (${Math.round(viseur.width)} × ${Math.round(viseur.height)} px)`);
    const poser = async (cote, point, decalage = 5) => {
      await p.click(`[data-pointe-schema="${cote}"]`); await p.waitForSelector('.bulle-points[open]');
      const b = await p.locator(`.point-schema[data-point="${point}"]`).boundingBox();
      await p.mouse.click(b.x + b.width / 2 + decalage, b.y + b.height / 2 + decalage / 2);
      await p.waitForFunction(() => !document.querySelector('.bulle-points[open]'));
    };
    await poser('rouge', 'x1'); await poser('noir', 'n0');
    t.ok(await p.inputValue('#rouge') === 'x1' && await p.inputValue('#noir') === 'n0', 'toucher le schéma près de « 96 · X1:1 » puis du « 0 V » : les deux pointes posées (le point le plus proche est retenu)');
    await p.click('#mesurer');
    t.ok((await p.textContent('#lecture')).trim() === '229', 'mesure aussitôt : 229 V, circuit sain');
    await p.click('[data-pointe-schema="rouge"]'); await p.waitForSelector('.bulle-points[open]');
    t.ok(await p.locator('.point-schema.est-rouge[data-point="x1"]').count() === 1 && await p.locator('.point-schema.est-com[data-point="n0"]').count() === 1, 'le schéma montre où sont déjà les pointes');
    await p.click('.bulle-points [data-fermer]');
    await p.click('[data-onglet-banc="actions"]');
    t.ok(!(await p.$('[data-action="abandonner"]')), 'banc libre : pas de bouton « Abandonner »');
    await p.click('[data-action="essai"]');
    t.ok(!(await p.$('.bilan')) && await p.isVisible('.poignee-console'), 'essai du moteur : il tourne, et le banc reste ouvert (pas de rapport)');
    await p.click('.bouton-indice'); await p.click('.bouton-indice');
    t.ok(net(await p.textContent('#resultat-banc')).includes('Idée 2/6'), '« Une idée ? » propose des pistes d\'exploration, l\'une après l\'autre');
    t.ok(!(await lire(p)).stats?.banc, 'rien n\'est enregistré dans les statistiques');
    await p.click('.poignee-console');   // appareil replié : le haut de la page redevient visible
    await p.click('.btn-libre'); await p.waitForFunction(() => document.querySelector('.frontispice-banc')?.textContent.includes('panne cachée'));
    t.ok(!!(await p.$('.tableau-bord')), '« Quitter le banc libre » : retour à une panne cachée');
    for (const c of ['eclairage', 'etoile-triangle']) {
      await p.goto(U + `#/entrainement/banc?libre=1&circuit=${c}`); await p.waitForSelector('.poignee-console');
      if (!(await p.isVisible('#mesurer'))) await p.click('.poignee-console');
      await p.click('[data-pointe-schema="noir"]'); await p.waitForSelector('.bulle-points[open]');
      const n = await p.locator('.point-schema').count();
      t.ok(n >= 16 && await p.evaluate(() => { const i = document.querySelector('.schema-interactif img'); return i.complete && i.naturalWidth > 0; }), `${c} : schéma touchable, ${n} points de mesure`);
      await p.click('.bulle-points [data-fermer]');
    }
    t.ok(p.erreurs.length === 0, 'banc libre et schéma : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Nouveaux contenus ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur);
    await p.goto(U + '#/entrainement/memos?m=irve-pv'); await p.waitForSelector('.memo');
    const fiche = net(await p.textContent('main'));
    t.ok(fiche.includes('qualifié IRVE') && fiche.includes('type B') && fiche.includes('continus'), 'fiche « Bornes de recharge et photovoltaïque » consultable');
    await p.goto(U + '#/entrainement/panne?c=verif-differentiel'); await p.waitForSelector('.choix-btn');
    t.ok(net(await p.textContent('main')).includes('bouton « T »'), 'cas « tester un différentiel 30 mA » jouable');
    t.ok(p.erreurs.length === 0, 'contenus : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }
}
