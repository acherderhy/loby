/*
  Fichier : js/fil.js
  Rôle    : page du fil (fil.html) : vérifie que quelqu'un est connecté, affiche les posts du plus récent
            au plus ancien, gère le compteur de caractères, la publication (avec photo), les likes,
            la suppression (avec confirmation), la photo de profil et la déconnexion.
  Membre  : Membre 3
*/

const LONGUEUR_MAX_POST = 280;

// L'utilisateur connecté (objet { id, pseudo, avatar, ... }), rempli au démarrage de la page.
let utilisateurConnecte = null;

// La photo choisie pour le prochain post, déjà vérifiée et redessinée (data URL), ou "" s'il n'y en a pas.
let imagePostEnAttente = "";

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
 * Efface tous les messages d'erreur de la page. Appelée au début de chaque action de l'utilisateur,
 * pour qu'un ancien message (par exemple un refus de suppression) ne reste pas affiché.
 * @returns {void}
 */
function effacerMessages() {
  afficherMessageFil("message-avatar", "");
  afficherMessageFil("message-publication", "");
  afficherMessageFil("message-fil", "");
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
 * Affiche l'aperçu de la photo choisie pour le post, avec le bouton « Retirer la photo ».
 * @param {string} dataUrl - La photo redessinée, en data URL.
 * @returns {void}
 */
function afficherApercu(dataUrl) {
  const image = creerElementImage(dataUrl, "Aperçu de la photo à publier", "apercu-image");
  if (image === null) {
    return;
  }
  document.getElementById("apercu-photo").replaceChildren(image);
  document.getElementById("zone-apercu").hidden = false;
  // Avec une photo, le texte devient une description facultative (style Instagram).
  document.getElementById("libelle-texte-post").textContent = "Description";
}

/**
 * Retire la photo choisie pour le post : vide le champ fichier et cache l'aperçu.
 * @returns {void}
 */
function retirerImagePost() {
  imagePostEnAttente = "";
  document.getElementById("image-post").value = ""; // vide le champ fichier
  document.getElementById("apercu-photo").replaceChildren();
  document.getElementById("zone-apercu").hidden = true;
  document.getElementById("libelle-texte-post").textContent = "Quoi de neuf ?";
}

/**
 * Réagit au choix d'une photo pour le post : la vérifie et la redessine (images.js), puis affiche l'aperçu.
 * « async » car la vérification et le redessin de l'image prennent du temps.
 * @returns {Promise<void>}
 */
async function gererChoixImagePost() {
  effacerMessages();
  const fichier = document.getElementById("image-post").files[0];
  if (fichier === undefined) {
    retirerImagePost();
    return;
  }
  const resultat = await preparerImagePost(fichier);
  if (resultat.erreur !== "") {
    retirerImagePost(); // fichier refusé : on vide le champ et on cache l'éventuel ancien aperçu
    afficherMessageFil("message-publication", resultat.erreur);
    return;
  }
  imagePostEnAttente = resultat.dataUrl;
  afficherApercu(imagePostEnAttente);
}

/**
 * Réagit au clic sur « Retirer la photo ».
 * @returns {void}
 */
function gererRetraitImage() {
  effacerMessages();
  retirerImagePost();
}

/**
 * Traite l'envoi du formulaire de publication.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {void}
 */
function gererPublication(evenement) {
  evenement.preventDefault(); // on empêche le navigateur de recharger la page
  effacerMessages();
  const zoneTexte = document.getElementById("texte-post");
  const erreur = publierPost(zoneTexte.value, imagePostEnAttente, utilisateurConnecte.id);
  if (erreur !== "") {
    afficherMessageFil("message-publication", erreur);
    return;
  }
  zoneTexte.value = "";
  retirerImagePost();
  mettreAJourCompteur();
  afficherLesPosts();
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
 * Réagit au clic sur un bouton like : bascule le like puis réaffiche le fil.
 * @param {string} idPost - L'identifiant du post cliqué.
 * @returns {void}
 */
function gererLike(idPost) {
  effacerMessages();
  if (!basculerLike(idPost, utilisateurConnecte.id)) {
    afficherMessageFil("message-fil", MESSAGE_STOCKAGE_PLEIN);
  }
  afficherLesPosts();
}

/**
 * Réagit au clic sur « Oui » : demande la suppression (revérifiée dans posts.js) puis réaffiche le fil.
 * @param {string} idPost - L'identifiant du post à supprimer.
 * @returns {void}
 */
function gererSuppression(idPost) {
  effacerMessages();
  if (!supprimerPost(idPost, utilisateurConnecte.id)) {
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
    effacerMessages();
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
    effacerMessages();
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
 * Affiche l'avatar de l'utilisateur connecté dans le bouton en haut de la page.
 * @returns {void}
 */
function afficherAvatarConnecte() {
  document.getElementById("bouton-avatar").replaceChildren(creerAvatar(utilisateurConnecte));
}

/**
 * Réagit au choix d'une nouvelle photo de profil : la vérifie, la redessine (images.js) et l'enregistre.
 * « async » car la vérification et le redessin de l'image prennent du temps.
 * @returns {Promise<void>}
 */
async function gererChangementAvatar() {
  effacerMessages();
  const champ = document.getElementById("champ-avatar");
  const fichier = champ.files[0];
  champ.value = ""; // vide le champ : choisir à nouveau le même fichier relancera l'événement
  if (fichier === undefined) {
    return;
  }
  const resultat = await preparerAvatar(fichier);
  if (resultat.erreur !== "") {
    afficherMessageFil("message-avatar", resultat.erreur);
    return;
  }
  if (!enregistrerAvatar(utilisateurConnecte.id, resultat.dataUrl)) {
    afficherMessageFil("message-avatar", MESSAGE_STOCKAGE_PLEIN);
    return;
  }
  utilisateurConnecte.avatar = resultat.dataUrl;
  afficherAvatarConnecte();
  afficherLesPosts(); // l'avatar change aussi sur ses posts
}

/**
 * Ouvre la fenêtre de choix de fichier quand on clique sur son avatar en haut de la page.
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
 * Branche les événements de la page (publication, compteur, photos, déconnexion).
 * @returns {void}
 */
function brancherEvenements() {
  // SÉCURITÉ : addEventListener au lieu d'attributs onclick/onsubmit (la CSP interdit le JavaScript inline).
  document.getElementById("formulaire-post").addEventListener("submit", gererPublication);
  document.getElementById("texte-post").addEventListener("input", mettreAJourCompteur);
  document.getElementById("image-post").addEventListener("change", gererChoixImagePost);
  document.getElementById("bouton-retirer-image").addEventListener("click", gererRetraitImage);
  document.getElementById("bouton-avatar").addEventListener("click", ouvrirChoixAvatar);
  document.getElementById("champ-avatar").addEventListener("change", gererChangementAvatar);
  document.getElementById("bouton-deconnexion").addEventListener("click", seDeconnecter);
}

/**
 * Point de départ de la page : vérifie la session, puis affiche le pseudo, l'avatar et le fil.
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
  afficherAvatarConnecte();
  brancherEvenements();
  mettreAJourCompteur();
  afficherLesPosts();
}

demarrerFil();
