/*
  Fichier : js/fil.js
  Rôle    : page du fil (fil.html) : vérifie que quelqu'un est connecté, puis affiche les posts de tous
            les comptes, du plus récent au plus ancien. Les cartes de posts sont construites par cartes.js.
  Membre  : Membre 3
*/

/**
 * Affiche tous les posts, les plus récents en haut. Rappelée par cartes.js après un like ou une suppression.
 * @returns {void}
 */
function afficherLesPosts() {
  remplirListePosts(lirePosts(), "Aucun post pour l'instant. Soyez le premier à publier !");
}

/**
 * Point de départ de la page : vérifie la session, puis affiche l'avatar et le fil.
 * @returns {void}
 */
function demarrerFil() {
  // SÉCURITÉ : verifierConnexion (cartes.js) renvoie vers index.html si personne n'est connecté.
  if (!verifierConnexion()) {
    return;
  }
  afficherAvatarEnTete();
  afficherLesPosts();
}

demarrerFil();
