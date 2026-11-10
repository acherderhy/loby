/*
  Fichier : v2/js/cartes.js
  Rôle    : ce qui sert à toutes les pages connectées de la version 2 (fil, publier, profil) : vérification
            de la session auprès de Supabase, avatar de l'en-tête, et construction des cartes de posts
            (likes, suppression avec confirmation). Même affichage que la v1.
  Membre  : Membre 3

  Chaque page qui affiche des posts (fil.js, profil.js) écrit sa propre fonction afficherLesPosts() :
  le fil lit tous les posts, le profil seulement les miens. Après un like ou une suppression,
  ce fichier rappelle afficherLesPosts(), donc c'est la version de la page ouverte qui s'exécute.
*/

// Requête des posts : avec le pseudo et l'avatar de l'auteur (table profiles) et la liste des likes,
// triés du plus récent au plus ancien par la base elle-même (order=created_at.desc).
// « !posts_auteur_id_fkey » précise le lien à suivre : on veut le profil de l'AUTEUR du post. Sans cette
// précision, la base hésite avec un autre chemin (posts → likes → profiles) et refuse la requête.
const REQUETE_POSTS = "posts?select=id,texte,image,created_at,auteur_id,"
  + "profiles!posts_auteur_id_fkey(pseudo,avatar),likes(user_id)&order=created_at.desc";

// L'utilisateur connecté ({ id, pseudo, avatar }), rempli par verifierConnexion().
let utilisateurConnecte = null;

/**
 * Charge le profil de l'utilisateur connecté depuis la base (pseudo et avatar).
 * @returns {Promise<Object|null>} { id, pseudo, avatar }, ou null si la session est absente ou invalide.
 */
async function chargerUtilisateurConnecte() {
  const id = lireIdUtilisateur();
  if (lireJeton() === null || id === null) {
    return null;
  }
  // Cette lecture vérifie aussi le jeton : s'il est expiré ou falsifié, le serveur répond 401
  // et appelerRest (supabase.js) renvoie vers la page de connexion.
  const profils = await lire("profiles?select=pseudo,avatar&" + filtreEgal("id", id));
  if (profils === null || profils.length === 0) {
    return null;
  }
  return { id: id, pseudo: profils[0].pseudo, avatar: profils[0].avatar };
}

/**
 * Vérifie que quelqu'un est connecté. Sinon, efface la session et renvoie vers la page de connexion.
 * « async » : on attend la réponse de Supabase.
 * @returns {Promise<boolean>} true si un utilisateur est connecté, sinon false (la redirection est lancée).
 */
async function verifierConnexion() {
  // SÉCURITÉ : pages réservées aux utilisateurs connectés. Sans session valide, on renvoie vers la connexion.
  // De toute façon, sans jeton valide, la base ne renverrait aucune donnée (règles RLS).
  utilisateurConnecte = await chargerUtilisateurConnecte();
  if (utilisateurConnecte === null) {
    fermerSession();
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
 * Indique si l'utilisateur connecté a déjà liké un post.
 * @param {Object} post - Le post (post.likes est une liste de { user_id }).
 * @returns {boolean} true si son identifiant est dans la liste des likes.
 */
function aLike(post) {
  for (let i = 0; i < post.likes.length; i++) {
    if (post.likes[i].user_id === utilisateurConnecte.id) {
      return true;
    }
  }
  return false;
}

/**
 * Ajoute le like de l'utilisateur sur un post, ou le retire s'il avait déjà liké.
 * @param {Object} post - Le post concerné.
 * @returns {Promise<boolean>} true si la base a accepté, sinon false.
 */
async function basculerLike(post) {
  if (!aLike(post)) {
    // La base remplit user_id avec l'utilisateur du jeton ; la clé primaire (post_id, user_id) empêche un double like.
    return await ajouter("likes", { post_id: post.id });
  }
  // SÉCURITÉ : même si on changeait user_id ici, la règle RLS ne laisse retirer que SES propres likes.
  const chemin = "likes?" + filtreEgal("post_id", post.id) + "&" + filtreEgal("user_id", utilisateurConnecte.id);
  const retires = await supprimer(chemin);
  return retires !== null;
}

/**
 * Réagit au clic sur un bouton like : bascule le like puis recharge les posts de la page.
 * @param {Object} post - Le post cliqué.
 * @returns {Promise<void>}
 */
async function gererLike(post) {
  afficherMessagePosts("");
  const accepte = await basculerLike(post);
  await afficherLesPosts(); // fonction de la page ouverte (fil.js ou profil.js)
  if (!accepte) {
    afficherMessagePosts("Action impossible. Réessayez.");
  }
}

/**
 * Réagit au clic sur « Oui » : demande la suppression à la base, puis recharge les posts de la page.
 * @param {string} idPost - L'identifiant du post à supprimer.
 * @returns {Promise<void>}
 */
async function gererSuppression(idPost) {
  afficherMessagePosts("");
  const supprimes = await supprimer("posts?" + filtreEgal("id", idPost));
  await afficherLesPosts(); // fonction de la page ouverte (fil.js ou profil.js)
  if (supprimes === null) {
    afficherMessagePosts("Suppression impossible. Réessayez.");
    return;
  }
  // SÉCURITÉ : contrôle d'autorisation fait par le SERVEUR (règle RLS « supprimer ses posts »).
  // Pour le post d'un autre, la base ne supprime rien et renvoie une liste vide.
  if (supprimes.length === 0) {
    afficherMessagePosts("Vous ne pouvez supprimer que vos propres posts.");
  }
}

/**
 * Transforme une date ISO (ex : "2026-11-10T14:32:00+00:00") en texte lisible en français.
 * @param {string} dateIso - La date au format ISO.
 * @returns {string} La date lisible, ex : « 10 novembre 2026 à 15:32 ».
 */
function formaterDate(dateIso) {
  return new Date(dateIso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

/**
 * Donne le nom à afficher pour l'auteur d'un post.
 * @param {Object|null} auteur - Le profil de l'auteur ({ pseudo, avatar }), ou null.
 * @returns {string} « @pseudo », ou « Compte inconnu ».
 */
function nomAffiche(auteur) {
  if (auteur === null) {
    return "Compte inconnu";
  }
  return "@" + auteur.pseudo;
}

/**
 * Crée l'en-tête d'un post : avatar et pseudo de l'auteur, et date.
 * @param {Object} post - Le post à afficher.
 * @param {Object|null} auteur - Le profil de l'auteur.
 * @returns {HTMLElement} L'élément d'en-tête.
 */
function creerEnTetePost(post, auteur) {
  const enTete = document.createElement("div");
  enTete.className = "post-en-tete";
  const nom = document.createElement("strong");
  nom.textContent = nomAffiche(auteur);
  const date = document.createElement("time");
  date.setAttribute("datetime", post.created_at);
  date.textContent = formaterDate(post.created_at);
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
  // La petite fonction anonyme retient CE post, pour savoir lequel a été cliqué.
  const bouton = creerBouton("♥ " + post.likes.length, "bouton-like", function () {
    gererLike(post);
  });
  const dejaLike = aLike(post);
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
 * @param {Object|null} auteur - Le profil de l'auteur (pour le texte alternatif).
 * @returns {HTMLImageElement|null} L'image, ou null s'il n'y a rien à afficher.
 */
function creerImagePost(post, auteur) {
  if (!post.image) {
    return null; // pas de photo sur ce post
  }
  // SÉCURITÉ : creerElementImage (images.js) refuse toute image qui n'est pas un JPEG en data URL,
  // même si quelqu'un réussissait à enregistrer autre chose dans la base.
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
  // SÉCURITÉ : anti-XSS. Les posts viennent maintenant de TOUS les utilisateurs : textContent affiche
  // un post contenant <img src=x onerror=alert(1)> comme du texte, il n'est jamais exécuté.
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
  // le vrai contrôle est fait par la base (règle RLS), voir gererSuppression.
  if (post.auteur_id === utilisateurConnecte.id) {
    actions.appendChild(creerBoutonSupprimer(post));
  }
  return actions;
}

/**
 * Construit l'élément HTML complet d'un post : en-tête, photo, texte (en dessous), boutons.
 * @param {Object} post - Le post à afficher (post.profiles contient le pseudo et l'avatar de l'auteur).
 * @returns {HTMLElement} L'élément <article> du post.
 */
function creerElementPost(post) {
  const article = document.createElement("article");
  article.className = "post";
  const auteur = post.profiles;
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
 * Remplit la liste de la page avec des posts (la base les renvoie déjà du plus récent au plus ancien).
 * @param {Array<Object>} posts - Les posts à afficher.
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
  for (let i = 0; i < posts.length; i++) {
    liste.appendChild(creerElementPost(posts[i]));
  }
}
