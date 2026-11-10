/*
  Fichier : js/stockage.js
  Rôle    : lit et écrit les données de Loby dans le navigateur : utilisateurs, posts et tentatives
            de connexion dans le localStorage, identifiant de l'utilisateur connecté dans le sessionStorage.
  Membre  : commun (écrit ensemble par les 4 membres)
*/

// Noms des « tiroirs » utilisés dans le stockage du navigateur.
const CLE_UTILISATEURS = "loby_utilisateurs";
const CLE_POSTS = "loby_posts";
const CLE_TENTATIVES = "loby_tentatives";
const CLE_SESSION = "loby_session";

// Message affiché quand le localStorage est plein (environ 5 Mo par site, photos comprises).
const MESSAGE_STOCKAGE_PLEIN = "Stockage plein : supprimez d'anciens posts.";

/**
 * Lit une donnée du localStorage et la transforme de texte JSON en objet JavaScript.
 * @param {string} cle - Le nom de la donnée dans le localStorage.
 * @param {*} valeurParDefaut - La valeur renvoyée si la donnée n'existe pas ou est illisible.
 * @returns {*} La donnée lue, ou la valeur par défaut.
 */
function lireDonnee(cle, valeurParDefaut) {
  const texte = localStorage.getItem(cle);
  if (texte === null) {
    return valeurParDefaut;
  }
  // SÉCURITÉ : le localStorage est modifiable à la main (outils de développement, F12).
  // Si quelqu'un y met du JSON invalide, JSON.parse lève une erreur : on la rattrape
  // pour que le site ne plante pas et reparte d'une valeur par défaut.
  try {
    return JSON.parse(texte);
  } catch (erreur) {
    return valeurParDefaut;
  }
}

/**
 * Lit une donnée qui doit être une liste (utilisateurs, posts).
 * @param {string} cle - Le nom de la donnée dans le localStorage.
 * @returns {Array} La liste lue, ou une liste vide si la donnée n'existe pas ou n'est pas une liste.
 */
function lireListe(cle) {
  const donnee = lireDonnee(cle, []);
  // SÉCURITÉ : le localStorage peut contenir du JSON valide mais de la mauvaise forme
  // (par exemple {"a":1} écrit à la main avec F12). Sans ce contrôle, les boucles sur la liste planteraient.
  if (!Array.isArray(donnee)) {
    return [];
  }
  return donnee;
}

/**
 * Enregistre une donnée dans le localStorage, transformée en texte JSON.
 * @param {string} cle - Le nom de la donnée dans le localStorage.
 * @param {*} valeur - La donnée à enregistrer (liste ou objet).
 * @returns {boolean} true si c'est enregistré, false si le stockage est plein.
 */
function enregistrerDonnee(cle, valeur) {
  // Le localStorage est limité (environ 5 Mo par site) : avec des photos, il peut être plein.
  // setItem lève alors une erreur QuotaExceededError, qu'on rattrape pour afficher un message clair.
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch (erreur) {
    if (erreur.name === "QuotaExceededError") {
      return false;
    }
    throw erreur; // une autre erreur, inattendue : on la laisse remonter
  }
}

/**
 * Lit la liste des utilisateurs inscrits.
 * @returns {Array<Object>} Liste de { id, pseudo, sel, hachage, avatar, dateCreation } (avatar : "" ou data URL).
 */
function lireUtilisateurs() {
  return lireListe(CLE_UTILISATEURS);
}

/**
 * Enregistre la liste des utilisateurs.
 * @param {Array<Object>} utilisateurs - La liste complète des utilisateurs.
 * @returns {boolean} true si c'est enregistré, false si le stockage est plein.
 */
function enregistrerUtilisateurs(utilisateurs) {
  return enregistrerDonnee(CLE_UTILISATEURS, utilisateurs);
}

/**
 * Remplace la photo de profil d'un utilisateur.
 * @param {string} idUtilisateur - L'identifiant de l'utilisateur.
 * @param {string} avatar - La nouvelle photo en data URL.
 * @returns {boolean} true si c'est enregistré, false si le stockage est plein.
 */
function enregistrerAvatar(idUtilisateur, avatar) {
  const utilisateurs = lireUtilisateurs();
  for (let i = 0; i < utilisateurs.length; i++) {
    if (utilisateurs[i].id === idUtilisateur) {
      utilisateurs[i].avatar = avatar;
    }
  }
  return enregistrerUtilisateurs(utilisateurs);
}

/**
 * Lit la liste des posts, dans l'ordre où ils ont été publiés (le plus ancien en premier).
 * @returns {Array<Object>} Liste de { id, auteurId, texte, image, date, likes } (image : "" ou data URL).
 */
function lirePosts() {
  return lireListe(CLE_POSTS);
}

/**
 * Enregistre la liste des posts.
 * @param {Array<Object>} posts - La liste complète des posts.
 * @returns {boolean} true si c'est enregistré, false si le stockage est plein.
 */
function enregistrerPosts(posts) {
  return enregistrerDonnee(CLE_POSTS, posts);
}

/**
 * Lit le compteur de tentatives de connexion ratées.
 * @returns {Object} { nombreEchecs, bloqueJusqua } (bloqueJusqua : date en millisecondes).
 */
function lireTentatives() {
  return lireDonnee(CLE_TENTATIVES, { nombreEchecs: 0, bloqueJusqua: 0 });
}

/**
 * Enregistre le compteur de tentatives de connexion ratées.
 * @param {Object} tentatives - { nombreEchecs, bloqueJusqua }.
 * @returns {void}
 */
function enregistrerTentatives(tentatives) {
  enregistrerDonnee(CLE_TENTATIVES, tentatives);
}

/**
 * Cherche un utilisateur à partir de son identifiant.
 * @param {string} id - L'identifiant de l'utilisateur.
 * @returns {Object|null} L'utilisateur trouvé, ou null s'il n'existe pas.
 */
function trouverUtilisateurParId(id) {
  const utilisateurs = lireUtilisateurs();
  for (let i = 0; i < utilisateurs.length; i++) {
    if (utilisateurs[i].id === id) {
      return utilisateurs[i];
    }
  }
  return null;
}

/**
 * Cherche un utilisateur à partir de son pseudo, sans tenir compte des majuscules.
 * @param {string} pseudo - Le pseudo recherché.
 * @returns {Object|null} L'utilisateur trouvé, ou null s'il n'existe pas.
 */
function trouverUtilisateurParPseudo(pseudo) {
  const utilisateurs = lireUtilisateurs();
  // SÉCURITÉ : comparaison en minuscules, pour empêcher de créer « Testeur_1 » alors que
  // « testeur_1 » existe déjà (usurpation d'identité par un pseudo presque identique).
  const pseudoMinuscule = pseudo.toLowerCase();
  for (let i = 0; i < utilisateurs.length; i++) {
    if (utilisateurs[i].pseudo.toLowerCase() === pseudoMinuscule) {
      return utilisateurs[i];
    }
  }
  return null;
}

/**
 * Ouvre la session : retient quel utilisateur est connecté dans cet onglet.
 * @param {string} idUtilisateur - L'identifiant de l'utilisateur qui vient de se connecter.
 * @returns {void}
 */
function ouvrirSession(idUtilisateur) {
  // SÉCURITÉ : on ne garde en session QUE l'identifiant, jamais le mot de passe ni le hash.
  // En cas de fuite (XSS, ordinateur partagé), rien ne permet de retrouver le mot de passe.
  // Le sessionStorage est effacé à la fermeture de l'onglet : la session ne traîne pas.
  sessionStorage.setItem(CLE_SESSION, idUtilisateur);
}

/**
 * Lit l'identifiant de l'utilisateur connecté.
 * @returns {string|null} L'identifiant, ou null si personne n'est connecté.
 */
function lireSession() {
  return sessionStorage.getItem(CLE_SESSION);
}

/**
 * Ferme la session (déconnexion).
 * @returns {void}
 */
function fermerSession() {
  sessionStorage.removeItem(CLE_SESSION);
}
