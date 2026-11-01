// Enregistrement du service worker (sw.js) et bandeau « Nouvelle version prête ».
// En production, une mise en ligne s'installe en arrière-plan puis attend : on la propose sans jamais
// interrompre une séance. Toucher « Recharger » l'active et recharge l'app ; sinon, elle s'appliquera
// d'elle-même au prochain lancement à froid.

function afficherBandeau(enAttente) {
  if (document.querySelector('.bandeau-maj')) return;
  const bandeau = document.createElement('div');
  bandeau.className = 'bandeau-maj';
  bandeau.setAttribute('role', 'status');
  bandeau.innerHTML = '<span>Nouvelle version prête.</span><button type="button" class="btn principal">Recharger</button>';
  bandeau.querySelector('button').addEventListener('click', () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    enAttente.postMessage('activer');
  });
  document.body.append(bandeau);
}

function surveiller(enregistrement) {
  if (enregistrement.waiting && navigator.serviceWorker.controller) afficherBandeau(enregistrement.waiting);
  enregistrement.addEventListener('updatefound', () => {
    const nouveau = enregistrement.installing;
    nouveau?.addEventListener('statechange', () => {
      // « installed » avec une version déjà en service = une mise à jour attend.
      if (nouveau.state === 'installed' && navigator.serviceWorker.controller) afficherBandeau(nouveau);
    });
  });
}

export function activerHorsConnexion() {
  // Ignoré si le navigateur ne le permet pas ou si l'app est ouverte en fichier local.
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js')
    .then(enregistrement => {
      surveiller(enregistrement);
      // L'app installée reste ouverte des jours en arrière-plan : on vérifie les mises à jour à chaque retour.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') enregistrement.update().catch(() => {});
      });
    })
    .catch(err => console.warn('Mode hors ligne indisponible :', err));
}
