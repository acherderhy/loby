/*
  Fichier : js/validation.js
  Rôle    : re-vérifie en JavaScript les saisies (pseudo, mot de passe, texte du post),
            avec exactement les mêmes règles que les attributs HTML des formulaires.
  Membre  : Membre 4

  SÉCURITÉ : les attributs HTML (required, maxlength, pattern…) se contournent facilement
  (il suffit de les supprimer avec F12). On revérifie donc tout dans le code avant d'enregistrer,
  pour empêcher des données hors règles (pseudo de 10 000 caractères, post vide…).
*/

// Règle du pseudo : de 3 à 20 caractères parmi les lettres sans accent, les chiffres et « _ ».
// ^ et $ obligent toute la chaîne à respecter la règle (pas seulement un morceau).
const REGLE_PSEUDO = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Vérifie que le pseudo respecte les règles (3 à 20 caractères : lettres, chiffres, _).
 * @param {string} pseudo - Le pseudo saisi par l'utilisateur.
 * @returns {boolean} true si le pseudo est valide, sinon false.
 */
function pseudoEstValide(pseudo) {
  return REGLE_PSEUDO.test(pseudo);
}

/**
 * Vérifie que le mot de passe fait entre 8 et 64 caractères.
 * @param {string} motDePasse - Le mot de passe saisi par l'utilisateur.
 * @returns {boolean} true si le mot de passe est valide, sinon false.
 */
function motDePasseEstValide(motDePasse) {
  return motDePasse.length >= 8 && motDePasse.length <= 64;
}

/**
 * Vérifie que le texte du post fait entre 1 et 280 caractères et ne contient pas que des espaces.
 * @param {string} texte - Le texte du post saisi par l'utilisateur.
 * @returns {boolean} true si le texte est valide, sinon false.
 */
function textePostEstValide(texte) {
  if (texte.length > 280) {
    return false;
  }
  // trim() enlève les espaces et retours à la ligne au début et à la fin :
  // s'il ne reste rien, le post est vide.
  return texte.trim() !== "";
}
