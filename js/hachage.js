/*
  Fichier : js/hachage.js
  Rôle    : transforme un mot de passe en « empreinte » (hash) avec PBKDF2, et génère les sels aléatoires.
            Utilise la Web Crypto API intégrée au navigateur (aucune librairie).
  Membre  : Membre 1

  SÉCURITÉ : on ne stocke jamais un mot de passe en clair. Si quelqu'un lit le localStorage,
  il ne voit qu'un hash, dont on ne peut pas remonter au mot de passe.
*/

// SÉCURITÉ : PBKDF2 répète le calcul 600 000 fois (recommandation de l'OWASP pour PBKDF2-SHA256).
// Plus il y a d'itérations, plus chaque essai coûte cher à un attaquant qui teste des millions de mots de passe
// (force brute ou dictionnaire). Pour l'utilisateur, cela reste une fraction de seconde à la connexion.
const NOMBRE_ITERATIONS = 600000;

/**
 * Génère un sel : 16 octets aléatoires, différents pour chaque utilisateur.
 * @returns {Uint8Array} Le sel (tableau de 16 octets).
 */
function genererSel() {
  // SÉCURITÉ : un sel unique par utilisateur fait que deux personnes avec le même mot de passe
  // ont des hash différents, et empêche l'usage de tables de hash précalculées (rainbow tables).
  // crypto.getRandomValues donne un vrai aléatoire cryptographique (contrairement à Math.random).
  const sel = new Uint8Array(16);
  crypto.getRandomValues(sel);
  return sel;
}

/**
 * Transforme des octets en texte hexadécimal (ex : [255, 1] devient "ff01"), pour pouvoir les stocker.
 * @param {Uint8Array} octets - Les octets à convertir.
 * @returns {string} Le texte hexadécimal (2 caractères par octet).
 */
function octetsVersHexa(octets) {
  let texte = "";
  for (let i = 0; i < octets.length; i++) {
    // toString(16) écrit le nombre en base 16 ; padStart ajoute un 0 devant si besoin ("f" devient "0f").
    texte = texte + octets[i].toString(16).padStart(2, "0");
  }
  return texte;
}

/**
 * Transforme un texte hexadécimal en octets (l'inverse de octetsVersHexa), pour relire un sel stocké.
 * @param {string} texte - Le texte hexadécimal.
 * @returns {Uint8Array} Les octets correspondants.
 */
function hexaVersOctets(texte) {
  const octets = new Uint8Array(texte.length / 2);
  for (let i = 0; i < octets.length; i++) {
    // On lit 2 caractères à la fois et on les convertit depuis la base 16.
    octets[i] = parseInt(texte.substring(i * 2, i * 2 + 2), 16);
  }
  return octets;
}

/**
 * Calcule le hash PBKDF2 (SHA-256, 600 000 itérations) d'un mot de passe avec un sel.
 * « async » : la fonction renvoie une promesse, car le navigateur fait le calcul sans bloquer la page.
 * « await » : attend que le calcul soit terminé avant de passer à la ligne suivante.
 * @param {string} motDePasse - Le mot de passe en clair.
 * @param {Uint8Array} sel - Le sel de l'utilisateur.
 * @returns {Promise<string>} Le hash en hexadécimal (32 octets, soit 64 caractères).
 */
async function hacherMotDePasse(motDePasse, sel) {
  // 1. On transforme le texte du mot de passe en octets, puis en « clé » utilisable par crypto.subtle.
  const octetsMotDePasse = new TextEncoder().encode(motDePasse);
  const cle = await crypto.subtle.importKey("raw", octetsMotDePasse, "PBKDF2", false, ["deriveBits"]);
  // 2. On calcule 256 bits d'empreinte avec PBKDF2.
  const parametres = { name: "PBKDF2", salt: sel, iterations: NOMBRE_ITERATIONS, hash: "SHA-256" };
  const empreinte = await crypto.subtle.deriveBits(parametres, cle, 256);
  // 3. On convertit le résultat en texte hexadécimal pour le stocker.
  return octetsVersHexa(new Uint8Array(empreinte));
}
