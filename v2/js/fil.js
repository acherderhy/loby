/*
  Fichier : v2/js/fil.js
  Rôle    : page du fil de la version 2 (v2/fil.html) : vérifie la session, affiche les posts de tous les
            utilisateurs (lus dans Supabase), gère la publication (avec photo), les likes, la suppression
            (avec confirmation), la photo de profil et la déconnexion. Même affichage que la v1.
  Membre  : Membre 3 (fil, likes, affichage) et Membre 2 (publication, suppression)
*/

const LONGUEUR_MAX_POST = 280;

// Requête du fil : les posts, avec le pseudo et l'avatar de l'auteur (table profiles) et la liste des likes,
// triés du plus récent au plus ancien par la base elle-même (order=created_at.desc).
// « !posts_auteur_id_fkey » précise le lien à suivre : on veut le profil de l'AUTEUR du post. Sans cette
// précision, la base hésite avec un autre chemin (posts → likes → profiles) et refuse la requête.
const REQUETE_FIL = "posts?select=id,texte,image,created_at,auteur_id,"
  + "profiles!posts_auteur_id_fkey(pseudo,avatar),likes(user_id)&order=created_at.desc";

// L'utilisateur connecté ({ id, pseudo, avatar }), rempli au démarrage de la page.
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
 * Efface tous les messages d'erreur de la page (au début de chaque action de l'utilisateur).
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
  // On ajoute la classe d'alerte (texte rouge) quand il reste moins de 20 caractères, sinon on la retire.
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
 * Publie un nouveau post dans la base après avoir vérifié son texte et sa photo.
 * « async » : on attend la réponse de Supabase.
 * @param {string} texte - Le texte du post.
 * @param {string} image - La photo en data URL, ou "" s'il n'y en a pas.
 * @returns {Promise<string>} Le message d'erreur, ou "" si le post a été publié.
 */
async function publierPost(texte, image) {
  // SÉCURITÉ : revérification JS (le maxlength du HTML est contournable) : 280 caractères maximum,
  // une photo OU un texte. La base revérifie les mêmes règles (contraintes check) : elle a le dernier mot.
  if (!contenuPostEstValide(texte, image)) {
    return "Le post doit contenir une photo ou un texte (280 caractères maximum).";
  }
  // SÉCURITÉ : on n'envoie qu'une photo produite par notre canvas (JPEG en data URL), voir images.js.
  if (image !== "" && !imageEstSure(image)) {
    return "Photo invalide.";
  }
  let imageAEnvoyer = null; // null = pas de photo, dans la base
  if (image !== "") {
    imageAEnvoyer = image;
  }
  // SÉCURITÉ : on n'envoie PAS l'auteur. La base le remplit elle-même avec l'utilisateur du jeton
  // (auth.uid()), et la règle RLS refuse tout post écrit au nom de quelqu'un d'autre.
  const accepte = await ajouter("posts", { texte: texte, image: imageAEnvoyer });
  if (!accepte) {
    return "Publication refusée par le serveur. Réessayez.";
  }
  return "";
}

/**
 * Traite l'envoi du formulaire de publication.
 * « async » : on attend la publication puis le rechargement du fil.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {Promise<void>}
 */
async function gererPublication(evenement) {
  evenement.preventDefault(); // on empêche le navigateur de recharger la page
  effacerMessages();
  const zoneTexte = document.getElementById("texte-post");
  const bouton = document.getElementById("bouton-publier");
  bouton.disabled = true; // évite de publier deux fois le même post
  const erreur = await publierPost(zoneTexte.value, imagePostEnAttente);
  bouton.disabled = false;
  if (erreur !== "") {
    afficherMessageFil("message-publication", erreur);
    return;
  }
  zoneTexte.value = "";
  retirerImagePost();
  mettreAJourCompteur();
  await afficherLesPosts();
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
 * Réagit au clic sur un bouton like : bascule le like puis recharge le fil.
 * @param {Object} post - Le post cliqué.
 * @returns {Promise<void>}
 */
async function gererLike(post) {
  effacerMessages();
  const accepte = await basculerLike(post);
  await afficherLesPosts();
  if (!accepte) {
    afficherMessageFil("message-fil", "Action impossible. Réessayez.");
  }
}

/**
 * Réagit au clic sur « Oui » : demande la suppression à la base, puis recharge le fil.
 * @param {string} idPost - L'identifiant du post à supprimer.
 * @returns {Promise<void>}
 */
async function gererSuppression(idPost) {
  effacerMessages();
  const supprimes = await supprimer("posts?" + filtreEgal("id", idPost));
  await afficherLesPosts();
  if (supprimes === null) {
    afficherMessageFil("message-fil", "Suppression impossible. Réessayez.");
    return;
  }
  // SÉCURITÉ : contrôle d'autorisation fait par le SERVEUR (règle RLS « supprimer ses posts »).
  // Pour le post d'un autre, la base ne supprime rien et renvoie une liste vide.
  if (supprimes.length === 0) {
    afficherMessageFil("message-fil", "Vous ne pouvez supprimer que vos propres posts.");
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
 * Lit les posts dans la base et les affiche (la base les renvoie déjà du plus récent au plus ancien).
 * @returns {Promise<void>}
 */
async function afficherLesPosts() {
  const posts = await lire(REQUETE_FIL);
  if (posts === null) {
    afficherMessageFil("message-fil", "Impossible de charger le fil. Réessayez plus tard.");
    return;
  }
  const liste = document.getElementById("liste-posts");
  liste.replaceChildren(); // vide la liste (sans innerHTML)
  if (posts.length === 0) {
    const vide = document.createElement("p");
    vide.className = "fil-vide";
    vide.textContent = "Aucun post pour l'instant. Soyez le premier à publier !";
    liste.appendChild(vide);
    return;
  }
  for (let i = 0; i < posts.length; i++) {
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
 * Réagit au choix d'une nouvelle photo de profil : la vérifie, la redessine (images.js) et l'enregistre dans la base.
 * « async » car la vérification, le redessin et l'envoi prennent du temps.
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
  // SÉCURITÉ : la règle RLS ne laisse modifier que SON profil, et les droits (grant) que la colonne avatar.
  const accepte = await modifier("profiles?" + filtreEgal("id", utilisateurConnecte.id), { avatar: resultat.dataUrl });
  if (!accepte) {
    afficherMessageFil("message-avatar", "Photo refusée par le serveur. Réessayez.");
    return;
  }
  utilisateurConnecte.avatar = resultat.dataUrl;
  afficherAvatarConnecte();
  await afficherLesPosts(); // l'avatar change aussi sur ses posts
}

/**
 * Ouvre la fenêtre de choix de fichier quand on clique sur son avatar en haut de la page.
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
 * Point de départ de la page : vérifie la session, puis affiche le pseudo, l'avatar et le fil.
 * @returns {Promise<void>}
 */
async function demarrerFil() {
  // SÉCURITÉ : page réservée aux utilisateurs connectés. Sans session valide, on renvoie vers la connexion.
  // De toute façon, sans jeton valide, la base ne renverrait aucun post (règles RLS).
  utilisateurConnecte = await chargerUtilisateurConnecte();
  if (utilisateurConnecte === null) {
    fermerSession();
    window.location.replace("index.html");
    return;
  }
  document.getElementById("pseudo-connecte").textContent = "@" + utilisateurConnecte.pseudo;
  afficherAvatarConnecte();
  brancherEvenements();
  mettreAJourCompteur();
  await afficherLesPosts();
}

demarrerFil();
