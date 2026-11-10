/*
  Fichier : v2/js/profil.js
  Rôle    : page Profil de la version 2 (v2/profil.html) : avatar et pseudo, changement de photo de profil,
            nombre de mes posts et de likes reçus, liste de MES posts uniquement (lus dans Supabase), déconnexion.
  Membre  : Membre 1
*/

/**
 * Affiche un message d'erreur sous l'avatar (photo refusée par le fichier ou par le serveur).
 * @param {string} texte - Le message à afficher ("" pour effacer).
 * @returns {void}
 */
function afficherMessageAvatar(texte) {
  // SÉCURITÉ : textContent écrit du texte brut, jamais interprété comme du HTML (anti-XSS).
  document.getElementById("message-avatar").textContent = texte;
}

/**
 * Compte le nombre total de likes reçus sur une liste de posts.
 * @param {Array<Object>} mesPosts - Les posts de l'utilisateur (post.likes est une liste de { user_id }).
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
 * Lit MES posts dans la base, puis les affiche avec les chiffres. Rappelée par cartes.js après un like ou une suppression.
 * @returns {Promise<void>}
 */
async function afficherLesPosts() {
  // filtreEgal (supabase.js) passe mon identifiant dans encodeURIComponent : il ne peut pas modifier la requête.
  const mesPosts = await lire(REQUETE_POSTS + "&" + filtreEgal("auteur_id", utilisateurConnecte.id));
  if (mesPosts === null) {
    afficherMessagePosts("Impossible de charger vos posts. Réessayez plus tard.");
    return;
  }
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
 * Réagit au choix d'une nouvelle photo de profil : la vérifie, la redessine (images.js) et l'enregistre dans la base.
 * « async » car la vérification, le redessin et l'envoi prennent du temps.
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
  // SÉCURITÉ : la règle RLS ne laisse modifier que SON profil, et les droits (grant) que la colonne avatar.
  const accepte = await modifier("profiles?" + filtreEgal("id", utilisateurConnecte.id), { avatar: resultat.dataUrl });
  if (!accepte) {
    afficherMessageAvatar("Photo refusée par le serveur. Réessayez.");
    return;
  }
  utilisateurConnecte.avatar = resultat.dataUrl;
  afficherIdentite();
  afficherAvatarEnTete();
  await afficherLesPosts(); // l'avatar change aussi sur ses posts
}

/**
 * Ouvre la fenêtre de choix de fichier quand on clique sur « Changer ma photo ».
 * @returns {void}
 */
function ouvrirChoixAvatar() {
  document.getElementById("champ-avatar").click();
}

/**
 * Déconnecte l'utilisateur (côté serveur et dans le navigateur) et le renvoie à la page de connexion.
 * @returns {Promise<void>}
 */
async function seDeconnecter() {
  await deconnecter();
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
 * @returns {Promise<void>}
 */
async function demarrerProfil() {
  // SÉCURITÉ : verifierConnexion (cartes.js) renvoie vers index.html si personne n'est connecté.
  if (!(await verifierConnexion())) {
    return;
  }
  afficherAvatarEnTete();
  afficherIdentite();
  brancherEvenements();
  await afficherLesPosts();
}

demarrerProfil();
