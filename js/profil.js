/*
  Fichier : js/profil.js
  Rôle    : page Profil (profil.html) : avatar et pseudo de l'utilisateur connecté, changement de photo de profil,
            nombre de ses posts et de likes reçus, liste de SES posts uniquement, et déconnexion.
  Membre  : Membre 1
*/

/**
 * Affiche un message d'erreur sous l'avatar (photo refusée, stockage plein).
 * @param {string} texte - Le message à afficher ("" pour effacer).
 * @returns {void}
 */
function afficherMessageAvatar(texte) {
  // SÉCURITÉ : textContent écrit du texte brut, jamais interprété comme du HTML (anti-XSS).
  document.getElementById("message-avatar").textContent = texte;
}

/**
 * Lit les posts publiés par l'utilisateur connecté.
 * @returns {Array<Object>} Ses posts, dans l'ordre de publication (le plus ancien en premier).
 */
function lireMesPosts() {
  const posts = lirePosts();
  const mesPosts = [];
  for (let i = 0; i < posts.length; i++) {
    if (posts[i].auteurId === utilisateurConnecte.id) {
      mesPosts.push(posts[i]);
    }
  }
  return mesPosts;
}

/**
 * Compte le nombre total de likes reçus sur une liste de posts.
 * @param {Array<Object>} mesPosts - Les posts de l'utilisateur.
 * @returns {number} La somme des likes de tous ces posts.
 */
function compterLikesRecus(mesPosts) {
  let total = 0;
  for (let i = 0; i < mesPosts.length; i++) {
    total = total + mesPosts[i].likes.length;
  }
  return total;
}

/**
 * Affiche les deux chiffres du profil : nombre de posts et nombre de likes reçus.
 * @param {Array<Object>} mesPosts - Les posts de l'utilisateur.
 * @returns {void}
 */
function afficherChiffres(mesPosts) {
  document.getElementById("nombre-posts").textContent = String(mesPosts.length);
  document.getElementById("nombre-likes").textContent = String(compterLikesRecus(mesPosts));
}

/**
 * Affiche mes posts (les plus récents en haut) et met à jour les chiffres.
 * Rappelée par cartes.js après un like ou une suppression.
 * @returns {void}
 */
function afficherLesPosts() {
  const mesPosts = lireMesPosts();
  afficherChiffres(mesPosts);
  remplirListePosts(mesPosts, "Vous n'avez encore rien publié. Touchez + pour votre premier post !");
}

/**
 * Affiche le pseudo et le grand avatar de l'utilisateur connecté.
 * @returns {void}
 */
function afficherIdentite() {
  // SÉCURITÉ : textContent, le pseudo est affiché comme du texte (anti-XSS).
  document.getElementById("profil-pseudo").textContent = "@" + utilisateurConnecte.pseudo;
  document.getElementById("profil-avatar").replaceChildren(creerAvatar(utilisateurConnecte));
}

/**
 * Réagit au choix d'une nouvelle photo de profil : la vérifie, la redessine (images.js) et l'enregistre.
 * « async » car la vérification et le redessin de l'image prennent du temps.
 * @returns {Promise<void>}
 */
async function gererChangementAvatar() {
  afficherMessageAvatar("");
  const champ = document.getElementById("champ-avatar");
  const fichier = champ.files[0];
  champ.value = ""; // vide le champ : choisir à nouveau le même fichier relancera l'événement
  if (fichier === undefined) {
    return;
  }
  const resultat = await preparerAvatar(fichier);
  if (resultat.erreur !== "") {
    afficherMessageAvatar(resultat.erreur);
    return;
  }
  if (!enregistrerAvatar(utilisateurConnecte.id, resultat.dataUrl)) {
    afficherMessageAvatar(MESSAGE_STOCKAGE_PLEIN);
    return;
  }
  utilisateurConnecte.avatar = resultat.dataUrl;
  afficherIdentite();
  afficherAvatarEnTete();
  afficherLesPosts(); // l'avatar change aussi sur ses posts
}

/**
 * Ouvre la fenêtre de choix de fichier quand on clique sur « Changer ma photo ».
 * @returns {void}
 */
function ouvrirChoixAvatar() {
  document.getElementById("champ-avatar").click();
}

/**
 * Déconnecte l'utilisateur et le renvoie à la page de connexion.
 * @returns {void}
 */
function seDeconnecter() {
  fermerSession();
  window.location.replace("index.html");
}

/**
 * Branche les événements de la page (photo de profil, déconnexion).
 * @returns {void}
 */
function brancherEvenements() {
  // SÉCURITÉ : addEventListener au lieu d'attributs onclick (la CSP interdit le JavaScript inline).
  document.getElementById("bouton-avatar").addEventListener("click", ouvrirChoixAvatar);
  document.getElementById("champ-avatar").addEventListener("change", gererChangementAvatar);
  document.getElementById("bouton-deconnexion").addEventListener("click", seDeconnecter);
}

/**
 * Point de départ de la page : vérifie la session, puis affiche le profil et mes posts.
 * @returns {void}
 */
function demarrerProfil() {
  // SÉCURITÉ : verifierConnexion (cartes.js) renvoie vers index.html si personne n'est connecté.
  if (!verifierConnexion()) {
    return;
  }
  afficherAvatarEnTete();
  afficherIdentite();
  brancherEvenements();
  afficherLesPosts();
}

demarrerProfil();
