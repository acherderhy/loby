/*
  Fichier : js/fil.js
  Rôle    : page du fil (fil.html) : vérifie que quelqu'un est connecté, affiche les posts du plus récent
            au plus ancien, gère le compteur de caractères, la publication, les likes, la suppression et la déconnexion.
  Membre  : Membre 3
*/

const LONGUEUR_MAX_POST = 280;

// L'utilisateur connecté (objet { id, pseudo, ... }), rempli au démarrage de la page.
let utilisateurConnecte = null;

/**
 * Affiche un message d'erreur dans une zone de la page (au lieu d'un alert()).
 * @param {string} idZone - L'id de l'élément où écrire le message.
 * @param {string} texte - Le message à afficher ("" pour effacer).
 * @returns {void}
 */
function afficherMessageFil(idZone, texte) {
  // SÉCURITÉ : textContent écrit du texte brut, jamais interprété comme du HTML (anti-XSS).
  document.getElementById(idZone).textContent = texte;
}

/**
 * Met à jour le compteur « X caractères restants » sous la zone de texte.
 * @returns {void}
 */
function mettreAJourCompteur() {
  const restants = LONGUEUR_MAX_POST - document.getElementById("texte-post").value.length;
  const compteur = document.getElementById("compteur");
  compteur.textContent = restants + " caractères restants";
  // On ajoute la classe d'alerte (texte corail) quand il reste moins de 20 caractères, sinon on la retire.
  compteur.classList.toggle("compteur--alerte", restants < 20);
}

/**
 * Traite l'envoi du formulaire de publication.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {void}
 */
function gererPublication(evenement) {
  evenement.preventDefault(); // on empêche le navigateur de recharger la page
  const zoneTexte = document.getElementById("texte-post");
  if (!publierPost(zoneTexte.value, utilisateurConnecte.id)) {
    afficherMessageFil("message-publication", "Le post doit contenir de 1 à 280 caractères, pas uniquement des espaces.");
    return;
  }
  afficherMessageFil("message-publication", "");
  zoneTexte.value = "";
  mettreAJourCompteur();
  afficherLesPosts();
}

/**
 * Ajoute le like de l'utilisateur sur un post, ou le retire s'il avait déjà liké (un seul like par personne).
 * @param {string} idPost - L'identifiant du post.
 * @param {string} idUtilisateur - L'identifiant de l'utilisateur connecté.
 * @returns {void}
 */
function basculerLike(idPost, idUtilisateur) {
  const posts = lirePosts();
  const index = trouverIndexPost(posts, idPost);
  if (index === -1) {
    return;
  }
  const likes = posts[index].likes;
  const position = likes.indexOf(idUtilisateur);
  if (position === -1) {
    likes.push(idUtilisateur); // pas encore liké : on ajoute son id
  } else {
    likes.splice(position, 1); // déjà liké : on retire son id
  }
  enregistrerPosts(posts);
}

/**
 * Réagit au clic sur un bouton like : bascule le like puis réaffiche le fil.
 * @param {string} idPost - L'identifiant du post cliqué.
 * @returns {void}
 */
function gererLike(idPost) {
  basculerLike(idPost, utilisateurConnecte.id);
  afficherLesPosts();
}

/**
 * Réagit au clic sur « Supprimer » : demande la suppression (revérifiée dans posts.js) puis réaffiche le fil.
 * @param {string} idPost - L'identifiant du post à supprimer.
 * @returns {void}
 */
function gererSuppression(idPost) {
  const supprime = supprimerPost(idPost, utilisateurConnecte.id);
  if (supprime) {
    afficherMessageFil("message-fil", "");
  } else {
    afficherMessageFil("message-fil", "Vous ne pouvez supprimer que vos propres posts.");
  }
  afficherLesPosts();
}

/**
 * Transforme une date ISO (ex : "2026-11-10T14:32:00.000Z") en texte lisible en français.
 * @param {string} dateIso - La date au format ISO.
 * @returns {string} La date lisible, ex : « 10 novembre 2026 à 15:32 ».
 */
function formaterDate(dateIso) {
  return new Date(dateIso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

/**
 * Crée l'en-tête d'un post : pseudo de l'auteur et date.
 * @param {Object} post - Le post à afficher.
 * @returns {HTMLElement} L'élément d'en-tête.
 */
function creerEnTetePost(post) {
  const enTete = document.createElement("div");
  enTete.className = "post-en-tete";
  const auteur = document.createElement("strong");
  const utilisateur = trouverUtilisateurParId(post.auteurId);
  // Si le compte n'existe plus (localStorage modifié à la main), on affiche un texte neutre au lieu de planter.
  auteur.textContent = "Compte inconnu";
  if (utilisateur !== null) {
    auteur.textContent = "@" + utilisateur.pseudo;
  }
  const date = document.createElement("time");
  date.setAttribute("datetime", post.date);
  date.textContent = formaterDate(post.date);
  enTete.appendChild(auteur);
  enTete.appendChild(date);
  return enTete;
}

/**
 * Crée le bouton like d'un post, avec le nombre de likes et son état (liké ou non par l'utilisateur).
 * @param {Object} post - Le post concerné.
 * @returns {HTMLButtonElement} Le bouton like.
 */
function creerBoutonLike(post) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "bouton-like";
  const dejaLike = post.likes.indexOf(utilisateurConnecte.id) !== -1;
  if (dejaLike) {
    bouton.classList.add("bouton-like--actif");
  }
  // aria-pressed et aria-label : indiquent l'état et le sens du bouton aux lecteurs d'écran.
  bouton.setAttribute("aria-pressed", String(dejaLike));
  bouton.setAttribute("aria-label", "J'aime (" + post.likes.length + ")");
  bouton.textContent = "♥ " + post.likes.length;
  // La petite fonction anonyme retient l'id de CE post, pour savoir lequel a été cliqué.
  bouton.addEventListener("click", function () {
    gererLike(post.id);
  });
  return bouton;
}

/**
 * Crée le bouton « Supprimer » d'un post.
 * @param {Object} post - Le post concerné.
 * @returns {HTMLButtonElement} Le bouton de suppression.
 */
function creerBoutonSupprimer(post) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "bouton bouton--danger";
  bouton.textContent = "Supprimer";
  bouton.addEventListener("click", function () {
    gererSuppression(post.id);
  });
  return bouton;
}

/**
 * Construit l'élément HTML complet d'un post (en-tête, texte, boutons).
 * @param {Object} post - Le post à afficher.
 * @returns {HTMLElement} L'élément <article> du post.
 */
function creerElementPost(post) {
  const article = document.createElement("article");
  article.className = "post";
  article.appendChild(creerEnTetePost(post));
  const texte = document.createElement("p");
  texte.className = "post-texte";
  // SÉCURITÉ : anti-XSS. textContent affiche le texte tel quel : un post contenant
  // <img src=x onerror=alert(1)> apparaît comme du texte et n'est jamais exécuté.
  texte.textContent = post.texte;
  article.appendChild(texte);
  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.appendChild(creerBoutonLike(post));
  // Le bouton n'apparaît que sur ses propres posts (confort). Ce n'est PAS la protection :
  // le vrai contrôle d'autorisation est refait dans supprimerPost (posts.js).
  if (post.auteurId === utilisateurConnecte.id) {
    actions.appendChild(creerBoutonSupprimer(post));
  }
  article.appendChild(actions);
  return article;
}

/**
 * Affiche tous les posts, les plus récents en haut.
 * @returns {void}
 */
function afficherLesPosts() {
  const liste = document.getElementById("liste-posts");
  liste.replaceChildren(); // vide la liste (sans innerHTML)
  const posts = lirePosts();
  if (posts.length === 0) {
    const vide = document.createElement("p");
    vide.className = "fil-vide";
    vide.textContent = "Aucun post pour l'instant. Soyez le premier à publier !";
    liste.appendChild(vide);
    return;
  }
  // Les posts sont ajoutés à la fin de la liste quand on publie : en la parcourant
  // à l'envers (du dernier au premier), on affiche donc les plus récents en haut.
  for (let i = posts.length - 1; i >= 0; i--) {
    liste.appendChild(creerElementPost(posts[i]));
  }
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
 * Branche les événements de la page (publication, compteur, déconnexion).
 * @returns {void}
 */
function brancherEvenements() {
  // SÉCURITÉ : addEventListener au lieu d'attributs onclick/onsubmit (la CSP interdit le JavaScript inline).
  document.getElementById("formulaire-post").addEventListener("submit", gererPublication);
  document.getElementById("texte-post").addEventListener("input", mettreAJourCompteur);
  document.getElementById("bouton-deconnexion").addEventListener("click", seDeconnecter);
}

/**
 * Point de départ de la page : vérifie la session, puis affiche le pseudo et le fil.
 * @returns {void}
 */
function demarrerFil() {
  // SÉCURITÉ : page réservée aux utilisateurs connectés. Sans session valide (aucun id, ou id
  // qui ne correspond à aucun compte), on renvoie vers la connexion avant d'afficher le moindre post.
  // replace() : la page du fil ne reste pas dans l'historique (le bouton « Retour » n'y ramène pas).
  utilisateurConnecte = trouverUtilisateurParId(lireSession());
  if (utilisateurConnecte === null) {
    window.location.replace("index.html");
    return;
  }
  document.getElementById("pseudo-connecte").textContent = "@" + utilisateurConnecte.pseudo;
  brancherEvenements();
  mettreAJourCompteur();
  afficherLesPosts();
}

demarrerFil();
