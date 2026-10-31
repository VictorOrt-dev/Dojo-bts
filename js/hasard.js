// Tirages aléatoires pour les exercices (ordre des questions, valeurs des calculs).

// Entier entre min et max inclus.
export function entier(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Un élément au hasard dans un tableau.
export function parmi(tableau) {
  return tableau[Math.floor(Math.random() * tableau.length)];
}

// Copie mélangée d'un tableau (Fisher-Yates).
export function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
