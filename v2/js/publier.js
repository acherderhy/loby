/*
  Fichier : v2/js/publier.js
  Rôle    : page Publier de la version 2 (v2/publier.html) : formulaire d'un nouveau post (photo facultative
            avec aperçu, texte avec compteur), envoi à Supabase, puis retour au fil.
  Membre  : Membre 2
*/

const LONGUEUR_MAX_POST = 280;

// La photo choisie pour le post, déjà vérifiée et redessinée (data URL), ou "" s'il n'y en a pas.
let imagePostEnAttente = "";

/**
 * Affiche un message d'erreur sous le formulaire (au lieu d'un alert()).
 * @param {string} texte - Le message à afficher ("" pour effacer).
 * @returns {void}
 */
function afficherMessagePublication(texte) {
  // SÉCURITÉ : textContent écrit du texte brut, jamais interprété comme du HTML (anti-XSS).
  document.getElementById("message-publication").textContent = texte;
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
  afficherMessagePublication("");
  const fichier = document.getElementById("image-post").files[0];
  if (fichier === undefined) {
    retirerImagePost();
    return;
  }
  const resultat = await preparerImagePost(fichier);
  if (resultat.erreur !== "") {
    retirerImagePost(); // fichier refusé : on vide le champ et on cache l'éventuel ancien aperçu
    afficherMessagePublication(resultat.erreur);
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
  afficherMessagePublication("");
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
 * Traite l'envoi du formulaire : publie le post, puis retourne au fil.
 * « async » : on attend la réponse de Supabase.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {Promise<void>}
 */
async function gererPublication(evenement) {
  evenement.preventDefault(); // on empêche le navigateur d'envoyer le formulaire lui-même
  afficherMessagePublication("");
  const bouton = document.getElementById("bouton-publier");
  bouton.disabled = true; // évite de publier deux fois le même post
  const erreur = await publierPost(document.getElementById("texte-post").value, imagePostEnAttente);
  bouton.disabled = false;
  if (erreur !== "") {
    afficherMessagePublication(erreur);
    return;
  }
  window.location.href = "fil.html"; // post publié : on va le voir en haut du fil
}

/**
 * Branche les événements du formulaire (publication, compteur, photo).
 * @returns {void}
 */
function brancherEvenements() {
  // SÉCURITÉ : addEventListener au lieu d'attributs onclick/onsubmit (la CSP interdit le JavaScript inline).
  document.getElementById("formulaire-post").addEventListener("submit", gererPublication);
  document.getElementById("texte-post").addEventListener("input", mettreAJourCompteur);
  document.getElementById("image-post").addEventListener("change", gererChoixImagePost);
  document.getElementById("bouton-retirer-image").addEventListener("click", gererRetraitImage);
}

/**
 * Point de départ de la page : vérifie la session, puis prépare le formulaire.
 * @returns {Promise<void>}
 */
async function demarrerPublier() {
  // SÉCURITÉ : verifierConnexion (cartes.js) renvoie vers index.html si personne n'est connecté.
  if (!(await verifierConnexion())) {
    return;
  }
  afficherAvatarEnTete();
  brancherEvenements();
  mettreAJourCompteur();
}

demarrerPublier();
