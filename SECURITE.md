# Sécurité de Loby

Loby fonctionne **entièrement dans le navigateur**, sans serveur : toutes les protections sont donc appliquées
côté client, en HTML, en JavaScript et par la Content-Security-Policy. Nous avons cherché à superposer plusieurs
barrières (validation HTML **et** JS, CSP **et** `textContent`…) et à documenter honnêtement ce qu'un site sans backend ne peut pas protéger.

## 1. Tableau des protections

Chaque ligne correspond à un commentaire `SÉCURITÉ :` dans le code.

| Protection | Attaque bloquée | Fichier | Fonction | Membre responsable |
|---|---|---|---|---|
| Content-Security-Policy stricte (`default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `img-src 'self' data:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`) | XSS (script injecté refusé par le navigateur), chargement de ressources externes, plugins, détournement par `<base>`, envoi de formulaire vers un autre site | `index.html`, `fil.html`, `publier.html`, `profil.html` | balise `<meta http-equiv>` | Eden |
| `<meta name="referrer" content="no-referrer">` | Fuite de l'adresse de nos pages vers d'autres sites (en-tête Referer) | `index.html`, `fil.html`, `publier.html`, `profil.html` | balise `<meta>` | Eden |
| JavaScript uniquement en fichiers `.js`, événements branchés avec `addEventListener` (aucun `onclick`, aucun `<script>` inline) | XSS : rend possible une CSP sans `'unsafe-inline'` | `js/comptes.js`, `js/publier.js`, `js/profil.js`, `js/cartes.js` | `brancherFormulaires`, `brancherEvenements` (publier, profil), `creerBouton` | Liora, Nathan, Acher |
| Styles uniquement dans `css/style.css` (aucun `style="..."`) | Injection de CSS pour maquiller la page (faux bouton, faux formulaire) | `css/style.css` | — | Acher |
| Texte affiché avec `textContent`, DOM construit avec `createElement`, jamais `innerHTML` | XSS stocké : un post contenant `<img src=x onerror=...>` s'affiche comme du texte | `js/cartes.js`, `js/publier.js`, `js/profil.js`, `js/comptes.js` | `creerTextePost`, `afficherMessagePosts`, `afficherMessagePublication`, `afficherMessageAvatar`, `afficherIdentite`, `afficherMessage` | Acher, Nathan, Liora |
| Validation des saisies en HTML (`required`, `minlength`, `maxlength`, `pattern`) | Saisies hors règles (première barrière) | `index.html`, `publier.html` | formulaires | Eden |
| Re-vérification des saisies en JavaScript (pseudo, mot de passe, post de 280 caractères, post vide refusé) | Contournement des attributs HTML avec F12 ou appel direct depuis la console | `js/validation.js`, `js/comptes.js`, `js/posts.js` | `pseudoEstValide`, `motDePasseEstValide`, `contenuPostEstValide`, `verifierSaisieInscription`, `trouverUtilisateurAvecIdentifiants`, `publierPost` | Eden (règles), Liora, Nathan |
| Mot de passe haché avec PBKDF2-SHA256, **600 000 itérations** (Web Crypto API) | Lecture des mots de passe en clair ; force brute hors ligne fortement ralentie | `js/hachage.js` | `hacherMotDePasse` | Liora |
| Sel aléatoire de 16 octets par utilisateur (`crypto.getRandomValues`) | Tables précalculées (rainbow tables) ; deux mots de passe identiques donnent des hash différents | `js/hachage.js` | `genererSel` | Liora |
| Comparaison des hachages en temps constant (boucle complète avec XOR) | Attaque temporelle : deviner le hash d'après la durée de la comparaison | `js/comptes.js` | `comparerEnTempsConstant` | Liora |
| Hachage factice quand le pseudo n'existe pas | Énumération des comptes par la mesure du temps de réponse | `js/comptes.js` | `trouverUtilisateurAvecIdentifiants` | Liora |
| Message d'erreur unique « Identifiants incorrects » | Énumération des comptes (savoir quels pseudos existent) | `js/comptes.js` | `signalerEchec` (constante `MESSAGE_ECHEC`) | Liora |
| Blocage de la connexion 30 secondes après 5 échecs | Force brute en ligne (essais de mots de passe à la chaîne) | `js/comptes.js` | `enregistrerEchec`, `connexionEstBloquee` | Liora |
| Pseudo unique sans tenir compte des majuscules | Usurpation par un pseudo presque identique (`Testeur_1` / `testeur_1`) | `js/stockage.js` | `trouverUtilisateurParPseudo` | Commun |
| Session : seul l'identifiant de l'utilisateur est gardé, dans le `sessionStorage` | Vol du mot de passe ou du hash via la session ; session qui traîne après fermeture de l'onglet | `js/stockage.js` | `ouvrirSession` | Commun |
| Redirection vers `index.html` sans session valide | Accès au fil, à la publication ou au profil sans être connecté | `js/cartes.js` (appelée par `js/fil.js`, `js/publier.js`, `js/profil.js`) | `verifierConnexion` (dans `demarrerFil`, `demarrerPublier`, `demarrerProfil`) | Acher |
| Contrôle d'autorisation avant la suppression (l'utilisateur doit être l'auteur) | Suppression du post d'un autre (bouton caché contourné via la console) | `js/posts.js` | `supprimerPost` | Nathan |
| Attribut `accept` + liste blanche des types (JPEG, PNG, WebP) | Envoi d'un SVG piégé (contenant du JavaScript) ou d'un autre type de fichier | `index.html`, `publier.html`, `profil.html`, `js/images.js` | `typeDeclareEstAutorise` | Nathan |
| Vérification des premiers octets du fichier (signature) | Fichier déguisé (texte ou script renommé en `.jpg`) | `js/images.js` | `signatureEstValide` | Nathan |
| Taille maximale de 5 Mo vérifiée avant tout traitement | Fichier énorme qui bloque le navigateur | `js/images.js` | `verifierFichierImage` | Nathan |
| Redessin dans un `<canvas>` puis export JPEG (avatar 128×128, post 800 px max) | Fuite de métadonnées EXIF (position GPS, téléphone) ; contenu caché dans le fichier | `js/images.js` | `dessinerAvatar`, `dessinerImagePost` | Nathan |
| Vérification que l'image est une data URL `data:image/jpeg;base64,` avant enregistrement et affichage | Image remplacée à la main dans le `localStorage` par un SVG piégé ou une adresse externe | `js/images.js`, `js/posts.js` | `imageEstSure`, `creerElementImage`, `publierPost` | Nathan |
| `JSON.parse` dans un `try/catch`, et contrôle que les utilisateurs et les posts sont bien des listes | Plantage du site après une modification du `localStorage` (JSON invalide, ou valide mais de mauvaise forme comme `{"a":1}`) | `js/stockage.js` | `lireDonnee`, `lireListe` | Commun |
| Erreur `QuotaExceededError` rattrapée, message « Stockage plein : supprimez d'anciens posts. » | Plantage et perte silencieuse de données quand le stockage est plein | `js/stockage.js` | `enregistrerDonnee` | Commun |

## 2. Audit de sécurité

Nous avons lancé **`/security-review`**, l'outil d'audit de sécurité par IA intégré à Claude Code, sur l'ensemble du code.

**Résultat : aucune faille exploitable de gravité haute ou moyenne.**

L'outil a examiné puis écarté 8 pistes. Nous les avons relues une par une :

| # | Piste examinée | Décision et raison |
|---|---|---|
| 1 | PBKDF2 avec 100 000 itérations | **Corrigé** : passé à 600 000 itérations, la valeur recommandée par l'OWASP pour PBKDF2-SHA256. Le hachage reste sous la seconde. |
| 2 | Comparaison des hachages avec `===` | **Corrigé** : `comparerEnTempsConstant` parcourt toujours tout le hash, la durée ne révèle plus rien. Le risque réel était faible (le hash est de toute façon lisible dans le `localStorage`), mais la correction est simple et c'est la bonne pratique. |
| 3 | `localStorage` contenant du JSON valide mais de la mauvaise forme | **Corrigé** : `lireListe` renvoie une liste vide si la donnée n'est pas une liste. Il s'agissait d'un plantage, pas d'une faille exploitable. |
| 4 | Blocage des tentatives contournable avec les outils du navigateur | **Limite assumée** : le compteur est stocké dans le navigateur, que l'utilisateur contrôle. Le blocage ralentit une attaque depuis l'interface ; un vrai blocage demande un serveur. |
| 5 | Session falsifiable via le `sessionStorage` | **Limite assumée** : on peut écrire l'identifiant d'un autre compte dans son propre navigateur. Sans serveur, rien ne peut l'empêcher ; cela ne donne accès qu'aux données déjà présentes dans ce même navigateur. |
| 6 | Hachages et sels lisibles dans le `localStorage` | **Limite assumée** : c'est la seule façon de vérifier un mot de passe sans serveur. C'est pour cela que nous utilisons PBKDF2 avec un sel et beaucoup d'itérations : le hash ne redonne pas le mot de passe directement. |
| 7 | Clickjacking impossible à bloquer avec une CSP en `<meta>` | **Limite assumée** : la directive `frame-ancestors` est ignorée dans une balise `<meta>`, et GitHub Pages ne permet pas d'ajouter les en-têtes HTTP qui la porteraient. |
| 8 | `localStorage` partagé entre tous les dépôts d'un même compte `github.io` | **Limite assumée** : tous les sites `acherderhy.github.io/...` ont la même origine, donc le même `localStorage`. Un autre dépôt du même compte pourrait lire nos données. Solution en production : un domaine dédié. |

Les pistes 4 à 8 ne sont pas des erreurs de code : ce sont des conséquences directes de la contrainte « pas de backend ».

## 3. Limites et ce qu'il faudrait en production

Résumé de la section 4 de [cadrage.md](cadrage.md), qui détaille chaque point :

- **Sans serveur, le navigateur a le dernier mot** : les données sont lisibles et modifiables avec F12, et le contrôle
  d'autorisation, la limitation des tentatives et la session peuvent être contournés par quelqu'un qui manipule son propre navigateur.
- **Pas de vrai réseau social** : chaque navigateur a ses propres comptes et posts.
- **Stockage limité** à environ 5 Mo, photos comprises.
- **CSP limitée** : pas de protection contre le clickjacking.

En production, il faudrait :
- un **serveur** et une **base de données** ;
- le **hachage côté serveur** avec Argon2id ou bcrypt ;
- une **session par cookie** `HttpOnly`, `Secure`, `SameSite` ;
- le **contrôle d'autorisation et la limitation des tentatives côté serveur** (par compte et par adresse IP) ;
- des **en-têtes HTTP de sécurité** (CSP avec `frame-ancestors`, `Strict-Transport-Security`, `X-Content-Type-Options`) ;
- le **stockage des images sur un serveur**, avec vérifications côté serveur ;
- des **journaux** pour détecter les attaques, et HTTPS partout.

## 4. Version 2 (bonus) : données partagées avec Supabase

Le dossier [v2/](v2/) branche la même interface sur Supabase (base PostgreSQL hébergée). Toutes les protections
côté navigateur de la v1 sont gardées (CSP, `textContent`, validation HTML + JS, vérification et redessin des photos) ;
la différence est que **le serveur a maintenant le dernier mot**.

### Ce qui protège la v2

| Protection | Attaque bloquée | Où |
|---|---|---|
| **RLS** (*Row Level Security*) activée sur `profiles`, `posts`, `likes` : seuls les connectés lisent ; on publie, like et supprime seulement en son nom ; on ne modifie que son propre profil | Supprimer le post d'un autre, publier ou liker au nom d'un autre, même en écrivant ses propres requêtes `fetch` | `v2/supabase.sql` (règles `create policy`) |
| **Droits explicites** (`grant`) : rien n'est accessible par défaut ; les visiteurs non connectés (`anon`) n'ont aucun droit ; seule la colonne `avatar` est modifiable | Lecture des données sans compte ; changement de son pseudo pour usurper quelqu'un | `v2/supabase.sql` (section 6) |
| **Contraintes `check` en base** : pseudo `[A-Za-z0-9_]{3,20}` unique sans tenir compte des majuscules, texte de 280 caractères max, post vide refusé, photos uniquement en `data:image/jpeg;base64,` de taille limitée | Données hors règles envoyées directement à l'API, en contournant notre JavaScript | `v2/supabase.sql` |
| **`auteur_id` et `user_id` remplis par la base** (`default auth.uid()`) | Usurpation : le navigateur n'envoie jamais l'auteur | `v2/supabase.sql`, `v2/js/publier.js` (`publierPost`) |
| **Clé anon publique par conception** : elle identifie le projet mais ne donne aucun droit seule ; la clé `service_role` n'est jamais dans le code | Fuite d'une clé qui contournerait les règles RLS | `v2/js/config.js` |
| **CSP + `connect-src 'self' https://tcskegpdoldosfefhmvy.supabase.co`** | Exfiltration : un script injecté ne pourrait pas envoyer le jeton ou les données vers un autre serveur | `v2/index.html`, `v2/fil.html`, `v2/publier.html`, `v2/profil.html` |
| **`encodeURIComponent`** sur les valeurs placées dans l'adresse des requêtes | Ajout de filtres dans la requête par une valeur piégée | `v2/js/supabase.js` (`filtreEgal`), utilisé par exemple par `v2/js/profil.js` (`afficherLesPosts` : filtre `auteur_id=eq.<mon id>`) |
| **Session = jeton signé** (`access_token`) + identifiant dans le `sessionStorage` ; réponse 401 → session effacée et retour à la connexion | Session falsifiée : un jeton modifié est refusé par le serveur | `v2/js/supabase.js` (`ouvrirSession`, `appelerRest`) |
| **Message générique** « Identifiants incorrects » ; « Ce pseudo est déjà pris ou invalide. » à l'inscription | Énumération des comptes à la connexion | `v2/js/comptes.js` |

### Limites de la v1 corrigées par la v2

| Limite de la v1 | Dans la v2 |
|---|---|
| Session falsifiable (on écrit l'identifiant d'un autre dans le `sessionStorage`) | La base ne croit que le jeton, signé par Supabase : un jeton modifié est refusé (testé : redirection vers la connexion). |
| Hachages et sels lisibles dans le `localStorage` | Les mots de passe partent en HTTPS et sont hachés et gardés par le serveur : aucun hachage n'est visible dans le navigateur. |
| Blocage des tentatives contournable (compteur dans le navigateur) | La limitation est faite par le serveur Supabase (réponse 429) : effacer son navigateur ne la remet pas à zéro. |
| Contrôle d'autorisation contournable, données non partagées | Les règles RLS s'appliquent à toutes les requêtes, et tous les utilisateurs partagent la même base. |

### Ce qui reste

- **Clickjacking** : la CSP est toujours dans une balise `<meta>`, où `frame-ancestors` est ignoré, et GitHub Pages
  ne permet pas d'ajouter l'en-tête HTTP qui la porterait.
- **Jeton lisible par un script** : en cas de XSS, un script pourrait lire le jeton dans le `sessionStorage`
  (un cookie `HttpOnly` demanderait notre propre serveur). D'où l'importance de la CSP et de `textContent`.
- **Jeton valable jusqu'à son expiration** : après la déconnexion, un jeton déjà copié reste accepté jusqu'à
  son expiration (1 heure). C'est le fonctionnement normal des jetons JWT de Supabase.
- **Pseudo transformé en email** (`pseudo@acherderhy.github.io`, jamais affiché) : Supabase exige un email ; le domaine
  est celui de notre GitHub Pages, et aucun email n'est envoyé (« Confirm email » désactivé).

## 5. Comment nous avons utilisé l'IA

- **Claude Code** a écrit le code, étape par étape, à partir de nos consignes.
- Un fichier **[CLAUDE.md](CLAUDE.md)** impose à chaque étape les règles du projet : simplicité (niveau Bachelor 3),
  documentation, et toutes les règles de sécurité ci-dessus (CSP, pas d'`innerHTML`, PBKDF2, validation HTML + JS…).
- Les **prompts** donnés à chaque étape sont conservés dans le dossier [prompts/](prompts/).
- Un **audit automatique** avec `/security-review` a été lancé sur le code terminé (section 2).
- Chaque résultat a ensuite été **relu et trié par nous** : nous avons décidé quoi corriger, quoi documenter comme limite,
  et chaque membre doit pouvoir expliquer chaque ligne de son code.
