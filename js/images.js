/*
  Fichier : js/images.js
  Rôle    : vérifie les photos choisies par l'utilisateur (photo de profil, photo de post), les redessine
            en JPEG dans un canvas, et crée les éléments <img> qui les affichent sans danger.
  Membre  : Membre 2

  SÉCURITÉ : un fichier envoyé par un utilisateur n'est jamais digne de confiance. On le vérifie
  (poids, type, premiers octets), puis on ne garde que ses pixels, redessinés par nous-mêmes.
*/

// SÉCURITÉ : liste blanche des types acceptés. Tout le reste est refusé, en particulier le SVG
// (image/svg+xml), qui est du texte pouvant contenir du JavaScript.
const TYPES_IMAGE_AUTORISES = ["image/jpeg", "image/png", "image/webp"];

// SÉCURITÉ : 5 Mo maximum (5 × 1024 × 1024 octets), vérifié AVANT tout traitement, pour qu'un fichier
// énorme ne bloque pas le navigateur.
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

// Début obligatoire de toutes les images qu'on accepte d'afficher : un JPEG produit par notre canvas.
const PREFIXE_IMAGE_SURE = "data:image/jpeg;base64,";

const TAILLE_AVATAR = 128;    // la photo de profil est un carré de 128 × 128 pixels
const LARGEUR_MAX_POST = 800; // la photo d'un post fait au plus 800 pixels de large
const QUALITE_JPEG = 0.7;     // qualité de compression JPEG (de 0 à 1) : bon compromis poids / netteté

/**
 * Vérifie que le type déclaré du fichier (déduit par le navigateur) est JPEG, PNG ou WebP.
 * @param {File} fichier - Le fichier choisi par l'utilisateur.
 * @returns {boolean} true si le type est dans la liste blanche, sinon false.
 */
function typeDeclareEstAutorise(fichier) {
  return TYPES_IMAGE_AUTORISES.indexOf(fichier.type) !== -1;
}

/**
 * Lit les 12 premiers octets du fichier (sa « signature »).
 * « async » : la lecture d'un fichier prend du temps, on attend (await) qu'elle soit finie.
 * @param {File} fichier - Le fichier choisi par l'utilisateur.
 * @returns {Promise<Uint8Array>} Les 12 premiers octets.
 */
async function lirePremiersOctets(fichier) {
  const debutDuFichier = await fichier.slice(0, 12).arrayBuffer();
  return new Uint8Array(debutDuFichier);
}

/**
 * Vérifie que les octets, à partir d'une position, sont exactement ceux de la signature attendue.
 * @param {Uint8Array} octets - Les premiers octets du fichier.
 * @param {Array<number>} signature - Les octets attendus.
 * @param {number} position - La position où la signature doit commencer.
 * @returns {boolean} true si tous les octets correspondent.
 */
function octetsCommencentPar(octets, signature, position) {
  for (let i = 0; i < signature.length; i++) {
    if (octets[position + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Vérifie que les premiers octets sont ceux d'un vrai JPEG, PNG ou WebP.
 * @param {Uint8Array} octets - Les 12 premiers octets du fichier.
 * @returns {boolean} true si la signature est reconnue, sinon false.
 */
function signatureEstValide(octets) {
  // SÉCURITÉ : le type déclaré vient de l'extension du nom (un .txt renommé en .jpg passe pour un JPEG).
  // Les premiers octets, eux, révèlent le vrai contenu du fichier.
  const JPEG = [0xFF, 0xD8, 0xFF];
  const PNG = [0x89, 0x50, 0x4E, 0x47];
  const RIFF = [0x52, 0x49, 0x46, 0x46]; // les lettres « RIFF »
  const WEBP = [0x57, 0x45, 0x42, 0x50]; // les lettres « WEBP » (après 4 octets de taille)
  if (octetsCommencentPar(octets, JPEG, 0) || octetsCommencentPar(octets, PNG, 0)) {
    return true;
  }
  return octetsCommencentPar(octets, RIFF, 0) && octetsCommencentPar(octets, WEBP, 8);
}

/**
 * Vérifie un fichier image : poids, type déclaré, puis premiers octets.
 * @param {File} fichier - Le fichier choisi par l'utilisateur.
 * @returns {Promise<string>} Le message d'erreur, ou "" si le fichier est accepté.
 */
async function verifierFichierImage(fichier) {
  if (fichier.size > TAILLE_MAX_IMAGE) {
    return "Fichier trop lourd : 5 Mo maximum.";
  }
  if (!typeDeclareEstAutorise(fichier)) {
    return "Format refusé : seules les images JPEG, PNG ou WebP sont acceptées.";
  }
  const octets = await lirePremiersOctets(fichier); // await : on attend la lecture des octets
  if (!signatureEstValide(octets)) {
    return "Ce fichier n'est pas une vraie image JPEG, PNG ou WebP.";
  }
  return "";
}

/**
 * Vérifie le fichier puis le décode en image utilisable dans un canvas.
 * @param {File} fichier - Le fichier choisi par l'utilisateur.
 * @returns {Promise<Object>} { erreur, image } : erreur vaut "" si tout va bien.
 */
async function verifierEtChargerImage(fichier) {
  const erreur = await verifierFichierImage(fichier);
  if (erreur !== "") {
    return { erreur: erreur, image: null };
  }
  // createImageBitmap décode l'image directement depuis le fichier, sans jamais l'afficher telle quelle.
  // Si le fichier est abîmé (bonne signature mais contenu invalide), le décodage échoue : on le rattrape.
  try {
    const image = await createImageBitmap(fichier);
    return { erreur: "", image: image };
  } catch (exception) {
    return { erreur: "Image illisible ou abîmée.", image: null };
  }
}

/**
 * Crée un canvas (zone de dessin) aux dimensions voulues, rempli de blanc.
 * @param {number} largeur - Largeur en pixels.
 * @param {number} hauteur - Hauteur en pixels.
 * @returns {HTMLCanvasElement} Le canvas prêt à dessiner.
 */
function creerCanvasBlanc(largeur, hauteur) {
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  // Le JPEG ne gère pas la transparence : sans fond blanc, un PNG transparent deviendrait noir.
  const contexte = canvas.getContext("2d");
  contexte.fillStyle = "#FFFFFF";
  contexte.fillRect(0, 0, largeur, hauteur);
  return canvas;
}

/**
 * Dessine la photo de profil : carré recadré au centre, réduit à 128 × 128, exporté en JPEG.
 * @param {ImageBitmap} image - L'image décodée.
 * @returns {string} L'image en data URL (« data:image/jpeg;base64,... »).
 */
function dessinerAvatar(image) {
  // Le carré a pour côté le plus petit des deux bords ; on le centre en coupant le surplus des deux côtés.
  const cote = Math.min(image.width, image.height);
  const departX = (image.width - cote) / 2;
  const departY = (image.height - cote) / 2;
  const canvas = creerCanvasBlanc(TAILLE_AVATAR, TAILLE_AVATAR);
  canvas.getContext("2d").drawImage(image, departX, departY, cote, cote, 0, 0, TAILLE_AVATAR, TAILLE_AVATAR);
  // SÉCURITÉ : on exporte uniquement les pixels redessinés. Les métadonnées EXIF (position GPS,
  // modèle du téléphone, date) et tout contenu caché dans le fichier d'origine disparaissent.
  return canvas.toDataURL("image/jpeg", QUALITE_JPEG);
}

/**
 * Dessine la photo d'un post : 800 pixels de large au maximum (proportions gardées), exportée en JPEG.
 * @param {ImageBitmap} image - L'image décodée.
 * @returns {string} L'image en data URL (« data:image/jpeg;base64,... »).
 */
function dessinerImagePost(image) {
  const largeur = Math.min(LARGEUR_MAX_POST, image.width);
  const hauteur = Math.round(image.height * largeur / image.width); // règle de trois
  const canvas = creerCanvasBlanc(largeur, hauteur);
  canvas.getContext("2d").drawImage(image, 0, 0, largeur, hauteur);
  // SÉCURITÉ : comme pour l'avatar, le ré-encodage supprime les métadonnées EXIF et le contenu caché.
  return canvas.toDataURL("image/jpeg", QUALITE_JPEG);
}

/**
 * Prépare une photo de profil à partir du fichier choisi (vérification + redessin).
 * @param {File} fichier - Le fichier choisi par l'utilisateur.
 * @returns {Promise<Object>} { erreur, dataUrl } : erreur vaut "" si tout va bien.
 */
async function preparerAvatar(fichier) {
  const resultat = await verifierEtChargerImage(fichier);
  if (resultat.erreur !== "") {
    return { erreur: resultat.erreur, dataUrl: "" };
  }
  return { erreur: "", dataUrl: dessinerAvatar(resultat.image) };
}

/**
 * Prépare la photo d'un post à partir du fichier choisi (vérification + redessin).
 * @param {File} fichier - Le fichier choisi par l'utilisateur.
 * @returns {Promise<Object>} { erreur, dataUrl } : erreur vaut "" si tout va bien.
 */
async function preparerImagePost(fichier) {
  const resultat = await verifierEtChargerImage(fichier);
  if (resultat.erreur !== "") {
    return { erreur: resultat.erreur, dataUrl: "" };
  }
  return { erreur: "", dataUrl: dessinerImagePost(resultat.image) };
}

/**
 * Vérifie qu'une image enregistrée est bien un JPEG en data URL, comme ceux produits par notre canvas.
 * @param {*} dataUrl - La valeur lue dans le localStorage.
 * @returns {boolean} true si l'image peut être affichée, sinon false.
 */
function imageEstSure(dataUrl) {
  // SÉCURITÉ : le localStorage est modifiable à la main (F12). Quelqu'un pourrait y remplacer une photo
  // par un SVG piégé ou une adresse vers un autre site : on n'affiche que nos JPEG en data URL.
  return typeof dataUrl === "string" && dataUrl.startsWith(PREFIXE_IMAGE_SURE);
}

/**
 * Crée un élément <img> pour une image enregistrée, seulement si elle est sûre.
 * @param {string} dataUrl - L'image en data URL.
 * @param {string} texteAlternatif - Description de l'image (lue par les lecteurs d'écran).
 * @param {string} classe - La classe CSS à appliquer.
 * @returns {HTMLImageElement|null} L'élément image, ou null si l'image n'est pas sûre.
 */
function creerElementImage(dataUrl, texteAlternatif, classe) {
  if (!imageEstSure(dataUrl)) {
    return null;
  }
  // SÉCURITÉ : createElement + propriétés src et alt, jamais innerHTML (anti-XSS).
  const image = document.createElement("img");
  image.className = classe;
  image.src = dataUrl;
  image.alt = texteAlternatif;
  return image;
}

/**
 * Crée l'avatar d'un utilisateur : sa photo si elle existe, sinon un rond avec l'initiale de son pseudo.
 * @param {Object|null} utilisateur - L'utilisateur (null si le compte n'existe plus).
 * @returns {HTMLElement} L'élément avatar (<img> ou <span>).
 */
function creerAvatar(utilisateur) {
  if (utilisateur !== null) {
    const photo = creerElementImage(utilisateur.avatar, "Photo de profil de @" + utilisateur.pseudo, "avatar");
    if (photo !== null) {
      return photo;
    }
  }
  const initiale = document.createElement("span");
  initiale.className = "avatar avatar--initiale";
  // Décoratif : le pseudo est écrit juste à côté, les lecteurs d'écran n'ont pas besoin de l'initiale.
  initiale.setAttribute("aria-hidden", "true");
  initiale.textContent = "?";
  if (utilisateur !== null) {
    initiale.textContent = utilisateur.pseudo.charAt(0).toUpperCase();
  }
  return initiale;
}
