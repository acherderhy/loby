/*
  Fichier : js/posts.js
  Rôle    : publier un post (avec une photo facultative) et supprimer un post, avec contrôle que seul
            l'auteur peut supprimer le sien.
  Membre  : Membre 2
*/

/**
 * Cherche la position d'un post dans la liste à partir de son identifiant.
 * @param {Array<Object>} posts - La liste des posts.
 * @param {string} idPost - L'identifiant du post recherché.
 * @returns {number} La position du post, ou -1 s'il n'existe pas.
 */
function trouverIndexPost(posts, idPost) {
  for (let i = 0; i < posts.length; i++) {
    if (posts[i].id === idPost) {
      return i;
    }
  }
  return -1;
}

/**
 * Publie un nouveau post (ajouté à la fin de la liste) après avoir vérifié son texte et sa photo.
 * @param {string} texte - Le texte du post.
 * @param {string} image - La photo en data URL, ou "" s'il n'y en a pas.
 * @param {string} idAuteur - L'identifiant de l'utilisateur connecté.
 * @returns {string} Le message d'erreur, ou "" si le post a été publié.
 */
function publierPost(texte, image, idAuteur) {
  // SÉCURITÉ : revérification JS (le maxlength du HTML est contournable avec F12) : 280 caractères maximum,
  // et une photo OU un texte. Un post vide est refusé, même si cette fonction est appelée depuis la console.
  if (!contenuPostEstValide(texte, image)) {
    return "Le post doit contenir une photo ou un texte (280 caractères maximum).";
  }
  // SÉCURITÉ : on n'enregistre qu'une photo produite par notre canvas (JPEG en data URL), voir images.js.
  if (image !== "" && !imageEstSure(image)) {
    return "Photo invalide.";
  }
  const posts = lirePosts();
  posts.push({
    id: crypto.randomUUID(),
    auteurId: idAuteur,
    texte: texte,
    image: image,
    date: new Date().toISOString(),
    likes: []
  });
  if (!enregistrerPosts(posts)) {
    return MESSAGE_STOCKAGE_PLEIN;
  }
  return "";
}

/**
 * Supprime un post, uniquement si l'utilisateur qui le demande en est l'auteur.
 * @param {string} idPost - L'identifiant du post à supprimer.
 * @param {string} idUtilisateur - L'identifiant de l'utilisateur connecté.
 * @returns {boolean} true si le post a été supprimé, sinon false.
 */
function supprimerPost(idPost, idUtilisateur) {
  const posts = lirePosts();
  const index = trouverIndexPost(posts, idPost);
  if (index === -1) {
    return false;
  }
  // SÉCURITÉ : contrôle d'autorisation. Cacher le bouton « Supprimer » ne suffit pas : on pourrait
  // appeler cette fonction depuis la console. On vérifie donc ici que l'utilisateur est bien l'auteur.
  if (posts[index].auteurId !== idUtilisateur) {
    return false;
  }
  posts.splice(index, 1); // retire 1 élément à la position index
  enregistrerPosts(posts);
  return true;
}
