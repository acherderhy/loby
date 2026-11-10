/*
  Fichier : v2/js/supabase.js
  Rôle    : toutes les communications avec Supabase, uniquement avec fetch() (aucune librairie) :
            inscription, connexion, déconnexion, et lire / ajouter / supprimer / modifier des lignes de la base.
            Gère aussi la session (jeton de connexion) dans le sessionStorage.
  Membre  : commun (écrit ensemble par les 4 membres)

  SÉCURITÉ : ici, le navigateur n'a plus le dernier mot. Chaque requête porte le jeton de connexion,
  et c'est le serveur Supabase qui décide, avec les règles RLS (v2/supabase.sql), ce qui est autorisé.
*/

// Noms des « tiroirs » de la session (différents de la v1 : les deux versions ne se mélangent pas).
const CLE_JETON = "loby_v2_jeton";
const CLE_ID = "loby_v2_id";

// Domaine utilisé pour fabriquer l'email exigé par Supabase : celui de notre GitHub Pages, qui nous appartient
// (aucun inconnu ne peut recevoir d'email dessus). Aucun email n'est envoyé (« Confirm email » désactivé).
// Supabase refuse les domaines réservés aux exemples comme example.com.
const DOMAINE_EMAIL = "@acherderhy.github.io";

/**
 * Ouvre la session : retient le jeton de connexion et l'identifiant de l'utilisateur dans cet onglet.
 * @param {string} jeton - Le jeton (access_token) renvoyé par Supabase.
 * @param {string} idUtilisateur - L'identifiant de l'utilisateur connecté.
 * @returns {void}
 */
function ouvrirSession(jeton, idUtilisateur) {
  // SÉCURITÉ : jamais le mot de passe. Le jeton est signé par Supabase : le modifier à la main le rend
  // invalide (refusé par le serveur). Le sessionStorage est effacé à la fermeture de l'onglet.
  sessionStorage.setItem(CLE_JETON, jeton);
  sessionStorage.setItem(CLE_ID, idUtilisateur);
}

/**
 * Lit le jeton de connexion.
 * @returns {string|null} Le jeton, ou null si personne n'est connecté.
 */
function lireJeton() {
  return sessionStorage.getItem(CLE_JETON);
}

/**
 * Lit l'identifiant de l'utilisateur connecté.
 * @returns {string|null} L'identifiant, ou null si personne n'est connecté.
 */
function lireIdUtilisateur() {
  return sessionStorage.getItem(CLE_ID);
}

/**
 * Ferme la session (efface le jeton et l'identifiant).
 * @returns {void}
 */
function fermerSession() {
  sessionStorage.removeItem(CLE_JETON);
  sessionStorage.removeItem(CLE_ID);
}

/**
 * Fabrique l'email (jamais affiché) que Supabase exige, à partir du pseudo.
 * @param {string} pseudo - Le pseudo saisi.
 * @returns {string} L'email, ex : « testeur_1@acherderhy.github.io ».
 */
function emailDepuisPseudo(pseudo) {
  // En minuscules : « Testeur_1 » et « testeur_1 » donnent le même email, donc le même compte.
  return pseudo.toLowerCase() + DOMAINE_EMAIL;
}

/**
 * Construit un filtre « colonne égale à valeur » pour l'adresse d'une requête, ex : « id=eq.1234 ».
 * @param {string} colonne - Le nom de la colonne.
 * @param {string} valeur - La valeur recherchée.
 * @returns {string} Le filtre prêt à mettre dans l'adresse.
 */
function filtreEgal(colonne, valeur) {
  // SÉCURITÉ : encodeURIComponent transforme les caractères spéciaux (&, =, espace…) en texte inoffensif.
  // Sans lui, une valeur piégée comme « 1&or=(...) » pourrait ajouter des filtres et modifier la requête.
  return colonne + "=eq." + encodeURIComponent(valeur);
}

/**
 * Lit le corps d'une réponse et le transforme de texte JSON en objet JavaScript.
 * « async » : la réponse arrive par morceaux, on attend (await) qu'elle soit complète.
 * @param {Response} reponse - La réponse de fetch.
 * @returns {Promise<*>} Les données, ou null si la réponse est vide.
 */
async function lireJson(reponse) {
  const texte = await reponse.text();
  if (texte === "") {
    return null; // certaines réponses (déconnexion, modification) n'ont pas de contenu
  }
  return JSON.parse(texte);
}

/**
 * Envoie une requête au service de comptes de Supabase (/auth/v1/...).
 * @param {string} chemin - La fin de l'adresse, ex : « signup ».
 * @param {Object} corps - Les données envoyées.
 * @param {string|null} jeton - Le jeton de connexion, ou null (inscription, connexion).
 * @returns {Promise<Object>} { ok, statut, donnees } : ok vaut false en cas d'erreur (même réseau coupé).
 */
async function envoyerAuth(chemin, corps, jeton) {
  const enTetes = { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  if (jeton !== null) {
    enTetes["Authorization"] = "Bearer " + jeton;
  }
  // try/catch : fetch lève une erreur si le réseau est coupé ; on la rattrape pour ne pas planter.
  try {
    const options = { method: "POST", headers: enTetes, body: JSON.stringify(corps) };
    const reponse = await fetch(SUPABASE_URL + "/auth/v1/" + chemin, options);
    const donnees = await lireJson(reponse);
    return { ok: reponse.ok, statut: reponse.status, donnees: donnees };
  } catch (erreur) {
    return { ok: false, statut: 0, donnees: null };
  }
}

/**
 * Crée un compte. Le pseudo est envoyé avec : la base crée le profil, ou refuse tout s'il est pris ou invalide.
 * @param {string} pseudo - Le pseudo choisi (déjà vérifié).
 * @param {string} motDePasse - Le mot de passe (déjà vérifié).
 * @returns {Promise<Object>} { ok, statut, donnees } ; donnees contient access_token et user.id si ok.
 */
async function inscrire(pseudo, motDePasse) {
  // SÉCURITÉ : le mot de passe part en HTTPS et c'est le serveur qui le hache : il n'est jamais stocké
  // dans le navigateur, et son hachage n'est lisible par personne (contrairement à la v1).
  const corps = { email: emailDepuisPseudo(pseudo), password: motDePasse, data: { pseudo: pseudo } };
  return await envoyerAuth("signup", corps, null);
}

/**
 * Se connecte avec un pseudo et un mot de passe.
 * @param {string} pseudo - Le pseudo saisi.
 * @param {string} motDePasse - Le mot de passe saisi.
 * @returns {Promise<Object>} { ok, statut, donnees } ; donnees contient access_token et user.id si ok.
 */
async function connecter(pseudo, motDePasse) {
  const corps = { email: emailDepuisPseudo(pseudo), password: motDePasse };
  return await envoyerAuth("token?grant_type=password", corps, null);
}

/**
 * Se déconnecte : le serveur invalide la session, puis on l'efface du navigateur (même si le serveur ne répond pas).
 * @returns {Promise<void>}
 */
async function deconnecter() {
  await envoyerAuth("logout", {}, lireJeton());
  fermerSession();
}

/**
 * Construit les en-têtes d'une requête vers la base (/rest/v1/...).
 * @param {string} prefer - La valeur de l'en-tête Prefer, ou "" pour ne pas l'envoyer.
 * @returns {Object} Les en-têtes.
 */
function enTetesRest(prefer) {
  // SÉCURITÉ : le jeton (Authorization) prouve au serveur QUI fait la requête. Les règles RLS s'en servent
  // pour n'autoriser que ce qui est permis à cet utilisateur (publier en son nom, supprimer ses posts…).
  const enTetes = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + lireJeton(),
    "Content-Type": "application/json"
  };
  if (prefer !== "") {
    enTetes["Prefer"] = prefer;
  }
  return enTetes;
}

/**
 * Envoie une requête à la base. Si le jeton est expiré ou invalide (401), renvoie vers la connexion.
 * @param {string} methode - GET, POST, PATCH ou DELETE.
 * @param {string} chemin - La fin de l'adresse, ex : « posts?select=... ».
 * @param {Object|null} corps - Les données envoyées, ou null.
 * @param {string} prefer - La valeur de l'en-tête Prefer, ou "".
 * @returns {Promise<Response|null>} La réponse, ou null (réseau coupé ou session expirée).
 */
async function appelerRest(methode, chemin, corps, prefer) {
  const options = { method: methode, headers: enTetesRest(prefer) };
  if (corps !== null) {
    options.body = JSON.stringify(corps);
  }
  let reponse;
  try {
    reponse = await fetch(SUPABASE_URL + "/rest/v1/" + chemin, options);
  } catch (erreur) {
    return null; // réseau coupé
  }
  // SÉCURITÉ : 401 = jeton expiré (au bout d'une heure) ou falsifié. On efface la session et on renvoie
  // vers la connexion : impossible de rester sur le fil avec un jeton que le serveur refuse.
  if (reponse.status === 401) {
    fermerSession();
    window.location.replace("index.html");
    return null;
  }
  return reponse;
}

/**
 * Lit des lignes de la base.
 * @param {string} chemin - Table, colonnes et filtres, ex : « profiles?select=pseudo&id=eq.1234 ».
 * @returns {Promise<Array|null>} La liste des lignes, ou null en cas d'erreur.
 */
async function lire(chemin) {
  const reponse = await appelerRest("GET", chemin, null, "");
  if (reponse === null || !reponse.ok) {
    return null;
  }
  return await lireJson(reponse);
}

/**
 * Ajoute une ligne dans une table.
 * @param {string} table - Le nom de la table, ex : « posts ».
 * @param {Object} donnees - Les colonnes à remplir.
 * @returns {Promise<boolean>} true si la base a accepté, sinon false.
 */
async function ajouter(table, donnees) {
  const reponse = await appelerRest("POST", table, donnees, "return=minimal");
  return reponse !== null && reponse.ok;
}

/**
 * Supprime des lignes et renvoie celles qui ont vraiment été supprimées.
 * @param {string} chemin - Table et filtres, ex : « posts?id=eq.1234 ».
 * @returns {Promise<Array|null>} Les lignes supprimées (liste vide si la base a refusé), ou null en cas d'erreur.
 */
async function supprimer(chemin) {
  // « return=representation » : la base renvoie les lignes supprimées. Si les règles RLS interdisent
  // la suppression, rien n'est supprimé et la liste est vide : c'est ainsi qu'on détecte le refus.
  const reponse = await appelerRest("DELETE", chemin, null, "return=representation");
  if (reponse === null || !reponse.ok) {
    return null;
  }
  return await lireJson(reponse);
}

/**
 * Modifie des lignes de la base.
 * @param {string} chemin - Table et filtres, ex : « profiles?id=eq.1234 ».
 * @param {Object} donnees - Les colonnes à modifier.
 * @returns {Promise<boolean>} true si la base a accepté, sinon false.
 */
async function modifier(chemin, donnees) {
  const reponse = await appelerRest("PATCH", chemin, donnees, "return=minimal");
  return reponse !== null && reponse.ok;
}
