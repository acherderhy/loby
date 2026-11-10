/*
  Fichier : js/cartes.js
  Rôle    : ce qui sert à toutes les pages connectées (fil, publier, profil) : vérification de la session,
            avatar de l'en-tête, et construction des cartes de posts (likes, suppression avec confirmation).
  Membre  : Membre 3

  Chaque page qui affiche des posts (fil.js, profil.js) écrit sa propre fonction afficherLesPosts() :
  le fil affiche tous les posts, le profil seulement les miens. Après un like ou une suppression,
  ce fichier rappelle afficherLesPosts(), donc c'est la version de la page ouverte qui s'exécute.
*/

// L'utilisateur connecté (objet { id, pseudo, avatar, ... }), rempli par verifierConnexion().
let utilisateurConnecte = null;

/**
 * Vérifie que quelqu'un est connecté. Sinon, renvoie vers la page de connexion.
 * @returns {boolean} true si un utilisateur est connecté, sinon false (la redirection est lancée).
 */
function verifierConnexion() {
  // SÉCURITÉ : pages réservées aux utilisateurs connectés. Sans session valide (aucun id, ou id
  // qui ne correspond à aucun compte), on renvoie vers la connexion avant d'afficher quoi que ce soit.
  // replace() : la page protégée ne reste pas dans l'historique (le bouton « Retour » n'y ramène pas).
  utilisateurConnecte = trouverUtilisateurParId(lireSession());
  if (utilisateurConnecte === null) {
    window.location.replace("index.html");
    return false;
  }
  return true;
}

/**
 * Affiche l'avatar de l'utilisateur connecté dans le lien « Mon profil » en haut de la page.
 * @returns {void}
 */
function afficherAvatarEnTete() {
  document.getElementById("lien-avatar").replaceChildren(creerAvatar(utilisateurConnecte));
}

/**
 * Affiche un message d'erreur au-dessus de la liste des posts (au lieu d'un alert()).
 * @param {string} texte - Le message à afficher ("" pour effacer).
 * @returns {void}
 */
function afficherMessagePosts(texte) {
  // SÉCURITÉ : textContent écrit du texte brut, jamais interprété comme du HTML (anti-XSS).
  document.getElementById("message-posts").textContent = texte;
}

/**
 * Ajoute le like de l'utilisateur sur un post, ou le retire s'il avait déjà liké (un seul like par personne).
 * @param {string} idPost - L'identifiant du post.
 * @param {string} idUtilisateur - L'identifiant de l'utilisateur connecté.
 * @returns {boolean} false si le stockage est plein, sinon true.
 */
function basculerLike(idPost, idUtilisateur) {
  const posts = lirePosts();
  const index = trouverIndexPost(posts, idPost);
  if (index === -1) {
    return true;
  }
  const likes = posts[index].likes;
  const position = likes.indexOf(idUtilisateur);
  if (position === -1) {
    likes.push(idUtilisateur); // pas encore liké : on ajoute son id
  } else {
    likes.splice(position, 1); // déjà liké : on retire son id
  }
  return enregistrerPosts(posts);
}

/**
 * Réagit au clic sur un bouton like : bascule le like puis réaffiche les posts de la page.
 * @param {string} idPost - L'identifiant du post cliqué.
 * @returns {void}
 */
function gererLike(idPost) {
  afficherMessagePosts("");
  if (!basculerLike(idPost, utilisateurConnecte.id)) {
    afficherMessagePosts(MESSAGE_STOCKAGE_PLEIN);
  }
  afficherLesPosts(); // fonction de la page ouverte (fil.js ou profil.js)
}

/**
 * Réagit au clic sur « Oui » : demande la suppression (revérifiée dans posts.js) puis réaffiche les posts.
 * @param {string} idPost - L'identifiant du post à supprimer.
 * @returns {void}
 */
function gererSuppression(idPost) {
  afficherMessagePosts("");
  const supprime = supprimerPost(idPost, utilisateurConnecte.id);
  afficherLesPosts(); // fonction de la page ouverte (fil.js ou profil.js)
  if (!supprime) {
    afficherMessagePosts("Vous ne pouvez supprimer que vos propres posts.");
  }
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
 * Donne le nom à afficher pour l'auteur d'un post.
 * @param {Object|null} auteur - L'auteur du post (null si le compte n'existe plus).
 * @returns {string} « @pseudo », ou « Compte inconnu ».
 */
function nomAffiche(auteur) {
  // Si le compte n'existe plus (localStorage modifié à la main), on affiche un texte neutre au lieu de planter.
  if (auteur === null) {
    return "Compte inconnu";
  }
  return "@" + auteur.pseudo;
}

/**
 * Crée l'en-tête d'un post : avatar et pseudo de l'auteur, et date.
 * @param {Object} post - Le post à afficher.
 * @param {Object|null} auteur - L'auteur du post.
 * @returns {HTMLElement} L'élément d'en-tête.
 */
function creerEnTetePost(post, auteur) {
  const enTete = document.createElement("div");
  enTete.className = "post-en-tete";
  const nom = document.createElement("strong");
  nom.textContent = nomAffiche(auteur);
  const date = document.createElement("time");
  date.setAttribute("datetime", post.date);
  date.textContent = formaterDate(post.date);
  enTete.appendChild(creerAvatar(auteur));
  enTete.appendChild(nom);
  enTete.appendChild(date);
  return enTete;
}

/**
 * Crée un bouton avec son texte, ses classes CSS et l'action à lancer au clic.
 * @param {string} texte - Le texte du bouton.
 * @param {string} classes - Les classes CSS du bouton.
 * @param {Function} quandClic - La fonction appelée au clic.
 * @returns {HTMLButtonElement} Le bouton.
 */
function creerBouton(texte, classes, quandClic) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = classes;
  bouton.textContent = texte;
  bouton.addEventListener("click", quandClic);
  return bouton;
}

/**
 * Crée le bouton like d'un post, avec le nombre de likes et son état (liké ou non par l'utilisateur).
 * @param {Object} post - Le post concerné.
 * @returns {HTMLButtonElement} Le bouton like.
 */
function creerBoutonLike(post) {
  // La petite fonction anonyme retient l'id de CE post, pour savoir lequel a été cliqué.
  const bouton = creerBouton("♥ " + post.likes.length, "bouton-like", function () {
    gererLike(post.id);
  });
  const dejaLike = post.likes.indexOf(utilisateurConnecte.id) !== -1;
  if (dejaLike) {
    bouton.classList.add("bouton-like--actif");
  }
  // aria-pressed et aria-label : indiquent l'état et le sens du bouton aux lecteurs d'écran.
  bouton.setAttribute("aria-pressed", String(dejaLike));
  bouton.setAttribute("aria-label", "J'aime (" + post.likes.length + ")");
  return bouton;
}

/**
 * Crée le bouton « Supprimer » d'un post. Au clic, il ne supprime rien : il demande une confirmation.
 * @param {Object} post - Le post concerné.
 * @returns {HTMLButtonElement} Le bouton de suppression.
 */
function creerBoutonSupprimer(post) {
  const bouton = creerBouton("Supprimer", "bouton bouton--danger", function () {
    afficherMessagePosts("");
    afficherConfirmation(bouton, post);
  });
  return bouton;
}

/**
 * Remplace le bouton « Supprimer » par « Supprimer ce post ? » avec les boutons « Oui » et « Annuler ».
 * @param {HTMLButtonElement} boutonSupprimer - Le bouton à remplacer.
 * @param {Object} post - Le post concerné.
 * @returns {void}
 */
function afficherConfirmation(boutonSupprimer, post) {
  const zone = document.createElement("div");
  zone.className = "confirmation";
  const question = document.createElement("span");
  question.textContent = "Supprimer ce post ?";
  // « Oui » appelle gererSuppression, qui passe par supprimerPost (contrôle d'autorisation dans posts.js).
  const oui = creerBouton("Oui", "bouton bouton--danger", function () {
    gererSuppression(post.id);
  });
  const annuler = creerBouton("Annuler", "bouton bouton--petit", function () {
    afficherMessagePosts("");
    const nouveauBouton = creerBoutonSupprimer(post);
    zone.replaceWith(nouveauBouton); // on remet le bouton « Supprimer » à la place de la question
    nouveauBouton.focus();
  });
  zone.append(question, oui, annuler);
  boutonSupprimer.replaceWith(zone);
  annuler.focus(); // le clavier se place sur le choix sans risque
}

/**
 * Crée la photo d'un post, si le post en a une et qu'elle est sûre.
 * @param {Object} post - Le post concerné.
 * @param {Object|null} auteur - L'auteur du post (pour le texte alternatif).
 * @returns {HTMLImageElement|null} L'image, ou null s'il n'y a rien à afficher.
 */
function creerImagePost(post, auteur) {
  if (!post.image) {
    return null; // pas de photo sur ce post
  }
  // creerElementImage (images.js) refuse toute image qui n'est pas un JPEG en data URL.
  return creerElementImage(post.image, "Photo publiée par " + nomAffiche(auteur), "post-image");
}

/**
 * Crée le paragraphe du texte d'un post.
 * @param {Object} post - Le post concerné.
 * @returns {HTMLParagraphElement} Le paragraphe du texte.
 */
function creerTextePost(post) {
  const texte = document.createElement("p");
  texte.className = "post-texte";
  // SÉCURITÉ : anti-XSS. textContent affiche le texte tel quel : un post contenant
  // <img src=x onerror=alert(1)> apparaît comme du texte et n'est jamais exécuté.
  texte.textContent = post.texte;
  return texte;
}

/**
 * Crée la ligne des boutons d'un post : like, et « Supprimer » sur ses propres posts.
 * @param {Object} post - Le post concerné.
 * @returns {HTMLElement} L'élément contenant les boutons.
 */
function creerActionsPost(post) {
  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.appendChild(creerBoutonLike(post));
  // Le bouton n'apparaît que sur ses propres posts (confort). Ce n'est PAS la protection :
  // le vrai contrôle d'autorisation est refait dans supprimerPost (posts.js).
  if (post.auteurId === utilisateurConnecte.id) {
    actions.appendChild(creerBoutonSupprimer(post));
  }
  return actions;
}

/**
 * Construit l'élément HTML complet d'un post : en-tête, photo, texte (en dessous), boutons.
 * @param {Object} post - Le post à afficher.
 * @returns {HTMLElement} L'élément <article> du post.
 */
function creerElementPost(post) {
  const article = document.createElement("article");
  article.className = "post";
  const auteur = trouverUtilisateurParId(post.auteurId);
  article.appendChild(creerEnTetePost(post, auteur));
  const image = creerImagePost(post, auteur);
  if (image !== null) {
    article.appendChild(image); // la photo d'abord (style Instagram)…
  }
  // … puis le texte, seulement s'il y en a un (il est facultatif quand il y a une photo).
  if (post.texte.trim() !== "") {
    article.appendChild(creerTextePost(post));
  }
  article.appendChild(creerActionsPost(post));
  return article;
}

/**
 * Remplit la liste de la page avec des posts, les plus récents en haut.
 * @param {Array<Object>} posts - Les posts à afficher, dans l'ordre de publication (le plus ancien en premier).
 * @param {string} texteSiVide - Le texte affiché quand il n'y a aucun post.
 * @returns {void}
 */
function remplirListePosts(posts, texteSiVide) {
  const liste = document.getElementById("liste-posts");
  liste.replaceChildren(); // vide la liste (sans innerHTML)
  if (posts.length === 0) {
    const vide = document.createElement("p");
    vide.className = "fil-vide";
    vide.textContent = texteSiVide;
    liste.appendChild(vide);
    return;
  }
  // Les posts sont ajoutés à la fin de la liste quand on publie : en la parcourant
  // à l'envers (du dernier au premier), on affiche donc les plus récents en haut.
  for (let i = posts.length - 1; i >= 0; i--) {
    liste.appendChild(creerElementPost(posts[i]));
  }
}
