/*
  Fichier : v2/js/fil.js
  Rôle    : page du fil de la version 2 (v2/fil.html) : vérifie la session, puis affiche les posts de tous
            les utilisateurs (lus dans Supabase). Les cartes de posts sont construites par cartes.js.
  Membre  : Membre 3
*/

/**
 * Lit tous les posts dans la base et les affiche. Rappelée par cartes.js après un like ou une suppression.
 * @returns {Promise<void>}
 */
async function afficherLesPosts() {
  const posts = await lire(REQUETE_POSTS);
  if (posts === null) {
    afficherMessagePosts("Impossible de charger le fil. Réessayez plus tard.");
    return;
  }
  remplirListePosts(posts, "Aucun post pour l'instant. Soyez le premier à publier !");
}

/**
 * Point de départ de la page : vérifie la session, puis affiche l'avatar et le fil.
 * @returns {Promise<void>}
 */
async function demarrerFil() {
  // SÉCURITÉ : verifierConnexion (cartes.js) renvoie vers index.html si personne n'est connecté.
  if (!(await verifierConnexion())) {
    return;
  }
  afficherAvatarEnTete();
  await afficherLesPosts();
}

demarrerFil();
