/*
  Fichier : js/comptes.js
  Rôle    : gère les formulaires de la page d'accueil (index.html) : inscription (avec photo de profil
            facultative), connexion, et blocage temporaire de la connexion après trop d'échecs.
  Membre  : Membre 1
*/

// Nombre d'échecs de connexion autorisés avant le blocage, et durée du blocage (30 s en millisecondes).
const MAX_ECHECS = 5;
const DUREE_BLOCAGE_MS = 30000;

// SÉCURITÉ : un seul message d'erreur, que le pseudo existe ou non. Un message du type
// « pseudo inconnu » permettrait à un attaquant de deviner quels comptes existent (énumération des comptes).
const MESSAGE_ECHEC = "Identifiants incorrects";

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
  if (!pseudoEstValide(pseudo)) {
    return "Pseudo invalide : 3 à 20 caractères, lettres sans accent, chiffres ou _.";
  }
  if (!motDePasseEstValide(motDePasse)) {
    return "Mot de passe invalide : 8 à 64 caractères.";
  }
  if (trouverUtilisateurParPseudo(pseudo) !== null) {
    return "Ce pseudo est déjà pris.";
  }
  return "";
}

/**
 * Crée un nouvel utilisateur avec un mot de passe haché (le mot de passe en clair n'est jamais gardé).
 * @param {string} pseudo - Le pseudo choisi.
 * @param {string} motDePasse - Le mot de passe en clair.
 * @param {string} avatar - La photo de profil en data URL, ou "" s'il n'y en a pas.
 * @returns {Promise<Object>} L'utilisateur { id, pseudo, sel, hachage, avatar, dateCreation }.
 */
async function creerUtilisateur(pseudo, motDePasse, avatar) {
  const sel = genererSel();
  // await : on attend la fin du calcul du hash (voir hachage.js).
  const hachage = await hacherMotDePasse(motDePasse, sel);
  return {
    id: crypto.randomUUID(),
    pseudo: pseudo,
    sel: octetsVersHexa(sel),
    hachage: hachage,
    avatar: avatar,
    dateCreation: new Date().toISOString()
  };
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
 * Prépare la photo, crée le compte, l'enregistre et ouvre la session.
 * @param {string} pseudo - Le pseudo choisi (déjà vérifié).
 * @param {string} motDePasse - Le mot de passe en clair (déjà vérifié).
 * @returns {Promise<string>} Le message d'erreur, ou "" si le compte a été créé.
 */
async function creerEtEnregistrerCompte(pseudo, motDePasse) {
  const photo = await preparerPhotoInscription();
  if (photo.erreur !== "") {
    return photo.erreur;
  }
  const utilisateur = await creerUtilisateur(pseudo, motDePasse, photo.dataUrl);
  const utilisateurs = lireUtilisateurs();
  utilisateurs.push(utilisateur);
  if (!enregistrerUtilisateurs(utilisateurs)) {
    return MESSAGE_STOCKAGE_PLEIN;
  }
  ouvrirSession(utilisateur.id);
  return "";
}

/**
 * Traite l'envoi du formulaire d'inscription : vérifie, crée le compte, connecte et redirige vers le fil.
 * « async » car on attend le traitement de la photo et le hachage du mot de passe.
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
  // Bouton désactivé pendant le traitement : évite un double envoi (et donc un compte créé deux fois).
  const bouton = document.getElementById("bouton-inscription");
  bouton.disabled = true;
  erreur = await creerEtEnregistrerCompte(pseudo, motDePasse);
  bouton.disabled = false;
  if (erreur !== "") {
    afficherMessage("message-inscription", erreur);
    return;
  }
  window.location.href = "fil.html";
}

/**
 * Indique si la connexion est actuellement bloquée (trop d'échecs récents).
 * @returns {boolean} true si on est encore dans les 30 secondes de blocage.
 */
function connexionEstBloquee() {
  return Date.now() < lireTentatives().bloqueJusqua;
}

/**
 * Construit le message affiché pendant le blocage, avec le nombre de secondes restantes.
 * @returns {string} Le message de blocage.
 */
function messageBlocage() {
  const secondesRestantes = Math.ceil((lireTentatives().bloqueJusqua - Date.now()) / 1000);
  return "Trop de tentatives. Réessayez dans " + secondesRestantes + " secondes.";
}

/**
 * Ajoute un échec au compteur ; au 5e échec, bloque la connexion pendant 30 secondes.
 * @returns {void}
 */
function enregistrerEchec() {
  // SÉCURITÉ : limitation des tentatives. Ralentit un attaquant qui essaie des mots de passe
  // à la chaîne (force brute) : 5 essais, puis 30 secondes d'attente.
  const tentatives = lireTentatives();
  tentatives.nombreEchecs = tentatives.nombreEchecs + 1;
  if (tentatives.nombreEchecs >= MAX_ECHECS) {
    tentatives.bloqueJusqua = Date.now() + DUREE_BLOCAGE_MS;
    tentatives.nombreEchecs = 0;
  }
  enregistrerTentatives(tentatives);
}

/**
 * Remet le compteur d'échecs à zéro (après une connexion réussie).
 * @returns {void}
 */
function reinitialiserTentatives() {
  enregistrerTentatives({ nombreEchecs: 0, bloqueJusqua: 0 });
}

/**
 * Vérifie un mot de passe : on le hache avec le sel de l'utilisateur et on compare au hash stocké.
 * @param {Object} utilisateur - L'utilisateur (avec son sel et son hachage).
 * @param {string} motDePasse - Le mot de passe saisi.
 * @returns {Promise<boolean>} true si le mot de passe est correct.
 */
async function verifierMotDePasse(utilisateur, motDePasse) {
  const hachage = await hacherMotDePasse(motDePasse, hexaVersOctets(utilisateur.sel));
  return hachage === utilisateur.hachage;
}

/**
 * Cherche l'utilisateur correspondant au pseudo et au mot de passe saisis.
 * @param {string} pseudo - Le pseudo saisi.
 * @param {string} motDePasse - Le mot de passe saisi.
 * @returns {Promise<Object|null>} L'utilisateur si les identifiants sont corrects, sinon null.
 */
async function trouverUtilisateurAvecIdentifiants(pseudo, motDePasse) {
  // SÉCURITÉ : revérification JS du format (les attributs HTML sont contournables).
  if (!pseudoEstValide(pseudo) || !motDePasseEstValide(motDePasse)) {
    return null;
  }
  const utilisateur = trouverUtilisateurParPseudo(pseudo);
  if (utilisateur === null) {
    // SÉCURITÉ : anti attaque temporelle. On fait quand même un hachage (avec un sel bidon) pour que
    // la réponse prenne autant de temps que pour un pseudo existant : en mesurant le temps de réponse,
    // un attaquant ne peut pas deviner quels pseudos existent.
    await hacherMotDePasse(motDePasse, genererSel());
    return null;
  }
  const correct = await verifierMotDePasse(utilisateur, motDePasse);
  if (!correct) {
    return null;
  }
  return utilisateur;
}

/**
 * Compte un échec et affiche le bon message (générique, ou blocage si c'était le 5e échec).
 * @returns {void}
 */
function signalerEchec() {
  enregistrerEchec();
  if (connexionEstBloquee()) {
    afficherMessage("message-connexion", messageBlocage());
  } else {
    afficherMessage("message-connexion", MESSAGE_ECHEC);
  }
}

/**
 * Traite l'envoi du formulaire de connexion : blocage, vérification des identifiants, session, redirection.
 * « async » car on attend le hachage du mot de passe.
 * @param {SubmitEvent} evenement - L'événement d'envoi du formulaire.
 * @returns {Promise<void>}
 */
async function gererConnexion(evenement) {
  evenement.preventDefault(); // on empêche le navigateur de recharger la page
  if (connexionEstBloquee()) {
    afficherMessage("message-connexion", messageBlocage());
    return;
  }
  const pseudo = document.getElementById("connexion-pseudo").value;
  const motDePasse = document.getElementById("connexion-mot-de-passe").value;
  // Bouton désactivé pendant le hachage : évite un double envoi.
  const bouton = document.getElementById("bouton-connexion");
  bouton.disabled = true;
  const utilisateur = await trouverUtilisateurAvecIdentifiants(pseudo, motDePasse);
  bouton.disabled = false;
  if (utilisateur === null) {
    signalerEchec();
    return;
  }
  reinitialiserTentatives();
  ouvrirSession(utilisateur.id);
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
