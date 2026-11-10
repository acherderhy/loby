/*
  Fichier : v2/js/comptes.js
  Rôle    : formulaires de la page d'accueil de la version 2 (v2/index.html) : inscription (avec photo de profil
            facultative) et connexion, en passant par Supabase (fonctions de supabase.js).
  Membre  : Membre 1
*/

// SÉCURITÉ : un seul message d'erreur, que le pseudo existe ou non. Un message du type
// « pseudo inconnu » permettrait à un attaquant de deviner quels comptes existent (énumération des comptes).
const MESSAGE_ECHEC = "Identifiants incorrects";

// Message si la base refuse l'inscription (pseudo déjà pris, ou invalide malgré nos vérifications).
const MESSAGE_INSCRIPTION_REFUSEE = "Ce pseudo est déjà pris ou invalide.";

/**
 * Affiche un message dans une zone de la page (au lieu d'un alert()).
 * @param {string} idZone - L'id de l'élément où écrire le message.
 * @param {string} texte - Le message à afficher ("" pour effacer).
 * @returns {void}
 */
function afficherMessage(idZone, texte) {
  // SÉCURITÉ : textContent écrit du texte brut, jamais interprété comme du HTML (anti-XSS).
  document.getElementById(idZone).textContent = texte;
}

/**
 * Vérifie les saisies du formulaire d'inscription et renvoie le message d'erreur à afficher.
 * @param {string} pseudo - Le pseudo saisi.
 * @param {string} motDePasse - Le mot de passe saisi.
 * @returns {string} Le message d'erreur, ou "" si tout est correct.
 */
function verifierSaisieInscription(pseudo, motDePasse) {
  // SÉCURITÉ : on revérifie en JS les règles déjà présentes dans le HTML (contournables avec F12).
  // La base les revérifie encore une fois (contrainte check sur le pseudo) : c'est elle qui a le dernier mot.
  if (!pseudoEstValide(pseudo)) {
    return "Pseudo invalide : 3 à 20 caractères, lettres sans accent, chiffres ou _.";
  }
  if (!motDePasseEstValide(motDePasse)) {
    return "Mot de passe invalide : 8 à 64 caractères.";
  }
  return "";
}

/**
 * Prépare la photo de profil choisie à l'inscription (facultative), avec les vérifications d'images.js.
 * « async » car la vérification et le redessin de l'image prennent du temps.
 * @returns {Promise<Object>} { erreur, dataUrl } : dataUrl vaut "" si aucune photo n'a été choisie.
 */
async function preparerPhotoInscription() {
  const fichier = document.getElementById("inscription-photo").files[0];
  if (fichier === undefined) {
    return { erreur: "", dataUrl: "" }; // pas de photo : l'avatar affichera l'initiale du pseudo
  }
  return await preparerAvatar(fichier);
}

/**
 * Prépare la photo, crée le compte chez Supabase, ouvre la session puis enregistre la photo de profil.
 * @param {string} pseudo - Le pseudo choisi (déjà vérifié).
 * @param {string} motDePasse - Le mot de passe (déjà vérifié).
 * @returns {Promise<string>} Le message d'erreur, ou "" si le compte a été créé.
 */
async function creerCompte(pseudo, motDePasse) {
  // La photo est vérifiée AVANT de créer le compte : une photo refusée ne laisse pas un compte à moitié créé.
  const photo = await preparerPhotoInscription();
  if (photo.erreur !== "") {
    return photo.erreur;
  }
  const resultat = await inscrire(pseudo, motDePasse);
  if (!resultat.ok) {
    return MESSAGE_INSCRIPTION_REFUSEE;
  }
  ouvrirSession(resultat.donnees.access_token, resultat.donnees.user.id);
  if (photo.dataUrl !== "") {
    // Si l'envoi de la photo échoue, le compte existe quand même : la photo pourra être choisie depuis le fil.
    await modifier("profiles?" + filtreEgal("id", resultat.donnees.user.id), { avatar: photo.dataUrl });
  }
  return "";
}

/**
 * Traite l'envoi du formulaire d'inscription : vérifie, crée le compte, connecte et redirige vers le fil.
 * « async » car on attend le traitement de la photo et la réponse de Supabase.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {Promise<void>}
 */
async function gererInscription(evenement) {
  evenement.preventDefault(); // on empêche le navigateur de recharger la page
  const pseudo = document.getElementById("inscription-pseudo").value;
  const motDePasse = document.getElementById("inscription-mot-de-passe").value;
  let erreur = verifierSaisieInscription(pseudo, motDePasse);
  afficherMessage("message-inscription", erreur);
  if (erreur !== "") {
    return;
  }
  // Bouton désactivé pendant l'envoi : évite un double envoi (et donc deux demandes de création).
  const bouton = document.getElementById("bouton-inscription");
  bouton.disabled = true;
  erreur = await creerCompte(pseudo, motDePasse);
  bouton.disabled = false;
  if (erreur !== "") {
    afficherMessage("message-inscription", erreur);
    return;
  }
  window.location.href = "fil.html";
}

/**
 * Choisit le message à afficher après un échec de connexion.
 * @param {number} statut - Le code de réponse HTTP renvoyé par Supabase.
 * @returns {string} Le message à afficher.
 */
function messageEchecConnexion(statut) {
  // SÉCURITÉ : limitation des tentatives faite par le SERVEUR Supabase (429 = trop de requêtes).
  // Contrairement au compteur de la v1, elle ne peut pas être effacée depuis le navigateur.
  if (statut === 429) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return MESSAGE_ECHEC;
}

/**
 * Traite l'envoi du formulaire de connexion : vérifie le format, demande la connexion à Supabase, redirige.
 * « async » car on attend la réponse de Supabase.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {Promise<void>}
 */
async function gererConnexion(evenement) {
  evenement.preventDefault(); // on empêche le navigateur de recharger la page
  const pseudo = document.getElementById("connexion-pseudo").value;
  const motDePasse = document.getElementById("connexion-mot-de-passe").value;
  // SÉCURITÉ : revérification JS du format (les attributs HTML sont contournables). Même message générique.
  if (!pseudoEstValide(pseudo) || !motDePasseEstValide(motDePasse)) {
    afficherMessage("message-connexion", MESSAGE_ECHEC);
    return;
  }
  const bouton = document.getElementById("bouton-connexion");
  bouton.disabled = true; // évite un double envoi
  const resultat = await connecter(pseudo, motDePasse);
  bouton.disabled = false;
  if (!resultat.ok) {
    afficherMessage("message-connexion", messageEchecConnexion(resultat.statut));
    return;
  }
  ouvrirSession(resultat.donnees.access_token, resultat.donnees.user.id);
  window.location.href = "fil.html";
}

/**
 * Branche les deux formulaires sur leurs fonctions.
 * @returns {void}
 */
function brancherFormulaires() {
  // SÉCURITÉ : événements branchés avec addEventListener, jamais avec un attribut onsubmit
  // dans le HTML (la CSP interdit le JavaScript inline).
  document.getElementById("formulaire-inscription").addEventListener("submit", gererInscription);
  document.getElementById("formulaire-connexion").addEventListener("submit", gererConnexion);
}

brancherFormulaires();
