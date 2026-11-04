// O. Premier lancement en deux grands choix, socle des 4 piliers, mini-quiz sans pénalité.

import { nouvellePage } from './outils.mjs';

const net = x => String(x).replace(/[\s  ]+/g, ' ').trim();
const lire = p => p.evaluate(() => JSON.parse(localStorage.getItem('elec-learning:v1') || '{}'));

export default async function ({ t, url: U, navigateur }) {
  t.section('O. Premier lancement : « Grand débutant » ou « Confirmé / Pro », socle des 4 piliers, mini-quiz');

  // ---------- Grand débutant : socle complet ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
    await p.goto(U); await p.waitForSelector('.mode-profil');
    const cartes = await p.$$eval('.mode-profil .mode-titre', l => l.map(x => x.textContent.trim()));
    t.ok(p.url().endsWith('#/bienvenue') && cartes.join() === 'Grand débutant,Confirmé / Pro' && await p.isVisible('.choix-entre-deux'),
      `premier lancement : deux grands choix (${cartes.join(' · ')}) et « Entre les deux » discret`);
    const h = await p.evaluate(() => document.documentElement.scrollHeight / innerHeight);
    t.ok(h < 1.7, `écran sobre : ${h.toFixed(2)} hauteur d'écran`);
    await p.click('[data-profil="debutant"]'); await p.waitForSelector('.socle-jeu');
    t.ok((await lire(p)).profil === 'debutant' && net(await p.textContent('.titre-chapitre')).includes('La tension'), '« Grand débutant » : profil mémorisé, pilier 1 « La tension »');

    // Pilier 1 : sources de tension
    await p.click('[data-source="prise"]');
    t.ok(net(await p.textContent('.socle-verdict')).includes('230 V') && net(await p.textContent('.socle-verdict')).includes('Mortel'), 'pilier 1 : toucher « Prise de courant » → 230 V, mortel');
    await p.click('[data-source="pile"]');
    t.ok(net(await p.textContent('.socle-verdict')).includes('1,5 V'), 'pilier 1 : la pile, 1,5 V, sans danger');
    await p.click('#socle-suivant');
    // Pilier 2 : interrupteur
    const ouvert = net(await p.textContent('.socle-verdict'));
    await p.click('#socle-interrupteur');
    const ferme = net(await p.textContent('.socle-verdict'));
    t.ok(ouvert.includes('Courant : 0 A') && ouvert.includes('230 V') && ferme.includes('0,26 A') && ferme.includes('allumée'),
      'pilier 2 : interrupteur ouvert, 230 V mais 0 A ; fermé, 0,26 A et lampe allumée');
    await p.click('#socle-suivant');
    // Pilier 3 : loi d'Ohm
    await p.click('[data-u="230"]');
    await p.fill('#socle-resistance', '20'); await p.dispatchEvent('#socle-resistance', 'input');
    t.ok(net(await p.textContent('#socle-ohm')).includes('230 / 20 = 11,5 A') && net(await p.textContent('#socle-ohm')).includes('chauffe'), 'pilier 3 : 230 V sur 20 Ω → 11,5 A, « ça chauffe fort »');
    await p.click('[data-u="12"]');
    t.ok(net(await p.textContent('#socle-ohm')).includes('12 / 20 = 0,6 A'), 'pilier 3 : 12 V sur 20 Ω → 0,6 A');
    await p.click('#socle-suivant');
    // Pilier 4 : conducteurs
    await p.click('[data-conducteur="neutre"]');
    t.ok(net(await p.textContent('.socle-conducteurs')).includes('Bleu clair (BU)') && net(await p.textContent('.socle-verdict')).includes('neutre coupé'), 'pilier 4 : neutre, bleu clair (BU), « un neutre coupé peut monter à 230 V »');
    t.ok(net(await p.textContent('.socle-conducteurs')).includes('Vert-jaune (GNYE)') && net(await p.textContent('.socle-conducteurs')).includes('Marron (BN)'), 'pilier 4 : couleurs écrites en toutes lettres avec leur code');
    await p.click('#socle-suivant'); await p.waitForSelector('[data-choix]');

    // Mini-quiz : une erreur, puis deux bonnes réponses
    t.ok(await p.locator('[data-sans-lexique] .terme').count() === 0 && net(await p.textContent('.surtitre')).includes('1/3'), 'mini-quiz : 3 questions, aucun mot du lexique pour souffler la réponse');
    const xp = (await lire(p)).xp ?? 0;
    const faux = await p.$$eval('[data-choix]', l => l.find(b => b.dataset.choix !== '0').dataset.choix);
    await p.click(`[data-choix="${faux}"]`); await p.waitForSelector('.explication');
    const corr = net(await p.textContent('.explication'));
    t.ok(corr.includes('Presque') && !corr.includes('Pas encore') && corr.includes('Aucun point perdu') && await p.locator('.choix-btn.juste').count() === 1,
      'mauvaise réponse : la bonne est montrée, l\'explication tout de suite, « Aucun point perdu », lien « Revoir le pilier »');
    await p.click('#socle-question-suivante'); await p.click('[data-choix="0"]'); await p.waitForSelector('.est-juste');
    await p.click('#socle-question-suivante'); await p.click('[data-choix="0"]'); await p.waitForSelector('.est-juste');
    await p.click('#socle-question-suivante'); await p.waitForSelector('.bilan-socle');
    const e = await lire(p);
    t.ok(net(await p.textContent('.bilan-score')) === '2/3' && e.socle?.fait === true && e.socle.score === 2 && (e.xp ?? 0) === xp,
      'fin : 2/3, socle mémorisé (fait, score), aucune pénalité ni XP');
    t.ok(e.stats.reco.elements['reco-decouverte-courant']?.boite === 1, 'la notion ratée rejoint la révision espacée (boîte 1)');
    await p.click('a:has-text("Commencer mon parcours")'); await p.waitForSelector('.prochaine');
    t.ok(!(await p.$('.carte-socle')) && (await p.getAttribute('.prochaine', 'href')) === '#/entrainement/reco?n=1', 'accueil standard : plus de carte « socle », prochaine séance Reconnaissance niveau I');
    await p.goto(U + '#/entrainement/examen'); await p.waitForSelector('.composition-examen');
    t.ok(net(await p.textContent('.composition-examen')).includes('10 de niveau I, 5 de niveau II'), 'niveau réglé « débutant » : examen blanc calibré (10 de niveau I, 5 de niveau II)');
    await p.goto(U + '#/profil'); await p.waitForSelector('.section-lexique');
    t.ok(await p.locator('.section-lexique a[href="#/entrainement/socle"]').count() === 1, 'Carnet : « Le socle : 4 piliers » pour le revoir à tout moment');
    t.ok(p.erreurs.length === 0, 'socle : aucune erreur dans la console' + (p.erreurs.length ? ' — ' + p.erreurs.join(' | ') : ''));
    await contexte.close();
  }

  // ---------- Grand débutant qui quitte le socle en route ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
    await p.goto(U); await p.waitForSelector('.mode-profil'); await p.click('[data-profil="debutant"]'); await p.waitForSelector('.socle-jeu');
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.carte-socle');
    t.ok((await p.getAttribute('.carte-socle', 'href')) === '#/entrainement/socle', 'socle quitté en route : l\'accueil propose « Le socle : 4 piliers en 3 minutes » en tête');
    await contexte.close();
  }

  // ---------- Confirmé / Pro : accès direct ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
    await p.goto(U); await p.waitForSelector('.mode-profil'); await p.click('[data-profil="confirme"]'); await p.waitForSelector('.prochaine');
    const e = await lire(p);
    t.ok(e.profil === 'confirme' && !e.socle && !(await p.$('.carte-socle')) && (await p.$$eval('.modes .mode', l => l[0].getAttribute('href'))) === '#/entrainement/banc',
      '« Confirmé / Pro » : accueil direct, ni socle ni carte, le banc en premier mode');
    // Réinitialisation : retour au choix du profil
    p.on('dialog', d => d.accept());
    await p.goto(U + '#/profil'); await p.click('button:has-text("Tout effacer")'); await p.waitForTimeout(400);
    await p.goto(U + '#/entrainement'); await p.waitForSelector('.mode-profil');
    t.ok(p.url().endsWith('#/bienvenue') && !(await lire(p)).profil, 'après « Tout effacer » : l\'écran de choix du profil revient');
    await contexte.close();
  }

  // ---------- Entre les deux ----------
  {
    const { contexte, page: p } = await nouvellePage(navigateur, { profil: null });
    await p.goto(U); await p.waitForSelector('.choix-entre-deux'); await p.click('.choix-entre-deux'); await p.waitForSelector('.prochaine');
    t.ok((await lire(p)).profil === 'formation' && !(await p.$('.carte-socle')), '« Entre les deux » : profil « En formation », accueil direct');
    await contexte.close();
  }
}
