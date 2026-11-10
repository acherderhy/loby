# Cadrage du projet Loby

## 1) Objectif de l'application

**Loby** est un mini réseau social inspiré de Twitter : on crée un compte, on publie des messages courts
(280 caractères maximum) et on lit les messages de tout le monde dans un fil d'actualité, où l'on peut « liker ».

L'objectif est avant tout **pédagogique** : construire une application web simple en appliquant
les bonnes pratiques de sécurité côté navigateur (hachage des mots de passe, protection contre le XSS,
Content-Security-Policy, validation des saisies, contrôle d'autorisation…), et être capable
d'expliquer chaque protection et l'attaque qu'elle bloque.

## 2) Utilisateurs et rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| **Visiteur** (non connecté) | Créer un compte, se connecter. Il ne peut pas voir le fil. |
| **Utilisateur connecté** | Voir le fil, publier un post (avec une photo facultative), supprimer **ses propres** posts, liker / retirer son like, changer sa photo de profil, se déconnecter. |

Il n'y a **pas d'administrateur** ni de modérateur : personne ne peut supprimer le post d'un autre.

## 3) Les 3 fonctionnalités du MVP

### Fonctionnalité 1 — Comptes
- **Inscription** avec un pseudo (3 à 20 caractères : lettres, chiffres, `_`) et un mot de passe (8 à 64 caractères).
- **Connexion** avec le pseudo et le mot de passe.
- **Déconnexion**.
- **Photo de profil** facultative : choisie à l'inscription, modifiable depuis le fil en cliquant sur son avatar.
  Sans photo, l'avatar affiche l'initiale du pseudo (en CSS, sans image).
- Protections : mot de passe haché avec PBKDF2 + sel aléatoire ; message d'erreur générique
  « Identifiants incorrects » ; blocage de 30 secondes après 5 échecs ; seul l'identifiant
  de l'utilisateur est gardé en session.

### Fonctionnalité 2 — Posts
- **Publier** un post avec une photo, un texte (280 caractères maximum) ou les deux (photo en haut, description en dessous) ; un post vide est refusé.
- **Photo** facultative (une seule par post), avec un aperçu avant publication et un bouton pour la retirer.
- **Supprimer** uniquement ses propres posts, après confirmation dans la carte du post (« Supprimer ce post ? » Oui / Annuler).
- Protections : validation de la longueur (HTML + JS) ; avant chaque suppression, le code vérifie
  que l'utilisateur connecté est bien l'auteur du post.

### Protections des photos (profil et posts)
- Seuls les JPEG, PNG et WebP sont acceptés : attribut `accept`, **et** vérification en JavaScript du type déclaré
  **et** des premiers octets du fichier (sa « signature »). Un fichier texte renommé en `.jpg` est refusé, le SVG aussi
  (c'est du texte qui peut contenir du JavaScript).
- 5 Mo maximum, vérifiés avant tout traitement.
- L'image est **redessinée dans un canvas** puis exportée en JPEG : les métadonnées EXIF (position GPS, modèle du téléphone)
  et tout contenu caché disparaissent. Avatar : 128×128 pixels ; photo de post : 800 pixels de large au maximum.
- Avant d'afficher une photo, on vérifie qu'elle commence par `data:image/jpeg;base64,` (le `localStorage` est modifiable
  à la main). L'affichage se fait avec `createElement("img")`, jamais `innerHTML`.

### Fonctionnalité 3 — Fil d'actualité
- Affiche les posts de **tous les comptes**, **les plus récents en haut**.
- **Liker** un post et **retirer son like** (un seul like par utilisateur et par post).
- Protections : le texte des posts est affiché avec `textContent` (jamais `innerHTML`),
  ce qui empêche un post contenant du code HTML ou JavaScript de s'exécuter (XSS).

### Protections communes aux deux pages
- Content-Security-Policy stricte : seuls les fichiers du site peuvent être chargés,
  aucun script ni style inline, pas d'`eval`.
- `referrer` désactivé, chemins relatifs, aucune ressource externe.

## 4) Ce qu'on ne fait pas aujourd'hui, et pourquoi

### Pas de backend : la sécurité côté navigateur a des limites
C'est une contrainte du projet. Sans serveur, **tout le code et toutes les données sont dans le navigateur
de l'utilisateur**, et celui-ci en a le contrôle total. Concrètement :

- **Les données sont lisibles et modifiables** : n'importe qui ayant accès à l'ordinateur peut ouvrir les outils
  de développement (F12) et lire ou modifier le `localStorage` (comptes, posts, likes).
- **Le contrôle d'autorisation est contournable** : notre code vérifie bien que l'on est l'auteur avant de supprimer,
  mais un utilisateur peut modifier les données à la main ou changer l'identifiant stocké en session.
  Le contrôle protège l'interface « normale », pas contre quelqu'un qui manipule son propre navigateur.
- **La limitation des tentatives est contournable** : il suffit de vider le stockage ou de rouvrir le navigateur
  pour remettre le compteur à zéro.
- **Les mots de passe hachés sont accessibles** : le hash et le sel sont lisibles dans le `localStorage`.
  Un attaquant peut tenter de deviner le mot de passe hors ligne ; PBKDF2 avec 100 000 itérations
  **ralentit** fortement cette attaque, mais ne l'empêche pas pour un mot de passe faible.
- **Pas de vrai réseau social** : chaque navigateur a son propre `localStorage`. « Tous les comptes »
  signifie donc « tous les comptes créés dans ce navigateur ». Deux personnes sur deux ordinateurs ne se voient pas.
- **CSP limitée** : une CSP placée dans une balise `<meta>` ne permet pas certaines directives,
  comme `frame-ancestors` (protection contre le *clickjacking*, quand un site malveillant affiche le nôtre
  dans un cadre invisible). GitHub Pages ne permet pas de configurer les en-têtes HTTP qui le feraient.

**Ce qu'il faudrait en production :**
- un **serveur** et une **base de données** : les données ne seraient plus modifiables par l'utilisateur ;
- le **hachage des mots de passe côté serveur**, avec un algorithme conçu pour ça (Argon2id ou bcrypt) ;
- une **session par cookie** `HttpOnly`, `Secure` et `SameSite` (illisible par JavaScript, donc protégée en cas de XSS) ;
- le **contrôle d'autorisation et la limitation des tentatives côté serveur** (par compte et par adresse IP) ;
- des **en-têtes HTTP de sécurité** : `Content-Security-Policy` (avec `frame-ancestors`),
  `Strict-Transport-Security` (HTTPS obligatoire), `X-Content-Type-Options` ;
- des **journaux** pour détecter les attaques, et du HTTPS partout.

### Photos : la limite du localStorage
Les photos sont gardées dans le `localStorage`, sous forme de texte (« data URL »). Or le `localStorage` est limité
à **environ 5 Mo par site**, pour toutes les données réunies (comptes, posts, likes **et** photos). Même réduites
et compressées (avatar de 128×128, photo de post de 800 pixels de large en JPEG), une photo de post pèse souvent
50 à 150 Ko : quelques dizaines de photos suffisent à remplir le stockage. Le site affiche alors
« Stockage plein : supprimez d'anciens posts. ».

**Dans une vraie application**, les images seraient stockées sur un **serveur** (un service de stockage de fichiers,
souvent derrière un CDN qui les distribue rapidement), et la base de données ne garderait que leur adresse. Cela permet :
- de ne pas être limité à quelques Mo, et de partager les photos entre tous les utilisateurs ;
- de faire les vérifications **côté serveur** (type, signature, taille, ré-encodage, antivirus), là où l'utilisateur
  ne peut pas les contourner ;
- d'appliquer des **quotas par compte** et de supprimer les images signalées.

### Pas d'abonnements
Le fil affiche tout le monde. Gérer qui suit qui ajouterait des données et de la logique
sans rien apporter à l'objectif pédagogique de sécurité.

### Pas de messages privés
Des messages « privés » stockés dans un `localStorage` lisible par n'importe qui sur l'ordinateur
ne seraient **pas réellement privés**. Les proposer donnerait une fausse impression de confidentialité.
Il faudrait un serveur et du chiffrement.

## 5) Langages et technologies, et pourquoi ces choix

| Technologie | Rôle | Pourquoi |
|---|---|---|
| **HTML5** | Structure des 2 pages | Contrainte du projet ; les attributs `required`, `minlength`, `maxlength`, `pattern`, `autocomplete` donnent une première validation gratuite. |
| **CSS3** | Mise en forme (1 seul fichier) | Contrainte du projet ; un fichier externe est compatible avec une CSP qui interdit les styles inline. |
| **JavaScript vanilla** | Logique de l'application | Contrainte du projet ; sans librairie, on comprend et on maîtrise tout le code, et aucune dépendance externe ne peut être compromise. |
| **localStorage** | Stockage des comptes, posts et likes | Seul moyen de garder des données sans backend ; elles restent après la fermeture du navigateur. |
| **sessionStorage** | Identifiant de l'utilisateur connecté | Effacé à la fermeture de l'onglet : la session ne traîne pas. |
| **Canvas API** (`<canvas>`) | Redessin des photos en JPEG | Intégrée au navigateur ; ne garde que les pixels, ce qui supprime les métadonnées (EXIF) et tout contenu caché. |
| **Web Crypto API** (`crypto.subtle`) | Hachage PBKDF2, sels aléatoires | Intégrée au navigateur (pas de librairie), fiable et rapide. |
| **Police système** | Typographie | Pas de Google Fonts : aucune requête externe, la CSP reste stricte (`default-src 'self'`). |
| **GitHub Pages** | Hébergement | Gratuit, en HTTPS, adapté à un site statique. D'où les chemins relatifs (site dans un sous-dossier). |

## 6) Répartition du travail

| Membre | Responsabilité | Fichiers |
|---|---|---|
| **Membre 1** | Comptes (inscription, connexion, déconnexion, limitation des tentatives) et hachage des mots de passe | `js/hachage.js`, `js/comptes.js` |
| **Membre 2** | Posts (publier, supprimer), contrôle d'autorisation et sécurité des photos (vérification, redessin, affichage) | `js/posts.js`, `js/images.js` |
| **Membre 3** | Fil d'actualité, likes, interface et anti-XSS | `js/fil.js`, `css/style.css`, `fil.html` |
| **Membre 4** | CSP, validation globale des saisies, README et cadrage | `js/validation.js`, `index.html` (en-têtes de sécurité des 2 pages), `README.md`, `cadrage.md` |

Le fichier `js/stockage.js` (lecture/écriture des données et de la session) est commun : il est écrit en premier,
ensemble, car toutes les fonctionnalités en dépendent.
