# CLAUDE.md — Règles du projet Loby

Ce fichier contient les règles à respecter **à chaque modification** du projet.
En cas de doute entre « plus complet » et « plus simple », choisir **plus simple**.

## 1. Le projet en bref

**Loby** est un mini réseau social type Twitter, réalisé par un groupe de 4 étudiants de Bachelor 3
pour un cours mêlant développement, IA et cybersécurité.
Objectif pédagogique : **maîtriser les bonnes pratiques et les balises de sécurité web**.
Chaque membre doit pouvoir **expliquer chaque ligne de son code à l'oral**.

Le site sera publié sur **GitHub Pages, dans un sous-dossier** : il faut donc des chemins relatifs partout.

## 2. Arborescence (ne pas ajouter de fichier sans raison)

```
loby/
├── index.html          Page de connexion / inscription (page d'accueil).
├── fil.html            Page du fil d'actualité (accessible une fois connecté).
├── css/style.css       Unique feuille de style.
├── js/
│   ├── stockage.js     Lecture/écriture localStorage (utilisateurs, posts) + session sessionStorage.  (commun)
│   ├── hachage.js      Hachage PBKDF2 des mots de passe + génération des sels.                         (Membre 1)
│   ├── validation.js   Re-vérification JS des saisies : pseudo, mot de passe, texte du post.           (Membre 4)
│   ├── comptes.js      Inscription, connexion, limitation des tentatives (sur index.html).             (Membre 1)
│   ├── posts.js        Publier un post, supprimer un de ses posts (contrôle d'autorisation).           (Membre 2)
│   └── fil.js          Affichage du fil, likes, déconnexion (sur fil.html).                            (Membre 3)
├── assets/logo/        Logos SVG.
├── assets/favicon/     Favicons + site.webmanifest (chemins relatifs).
├── assets/README-logo.md
├── CLAUDE.md, cadrage.md, README.md, .gitignore
```

Ordre de chargement des scripts (en bas du `<body>`, avec `<script src="...">` uniquement) :
- `index.html` : stockage.js → validation.js → hachage.js → comptes.js
- `fil.html` : stockage.js → validation.js → posts.js → fil.js

Limites : **2 pages HTML, 1 fichier CSS, 6 fichiers JS maximum.**

## 3. Contraintes du prof (non négociables)

- **Pas de backend** : uniquement HTML, CSS et JavaScript vanilla exécutés dans le navigateur.
- **Aucun framework, aucune librairie externe, aucun CDN**, aucune police externe (pas de Google Fonts).
- Données stockées dans le navigateur : **localStorage** (données) et **sessionStorage** (session).
- **Aucune donnée personnelle réelle** dans le dépôt : pas de vrais noms, emails ou mots de passe,
  même dans des exemples, des tests ou des données de démo.
- Un fichier `cadrage.md` et un fichier `README.md` à la racine.
- Code commenté (voir section 6).

## 4. Les 3 fonctionnalités (pas une de plus)

1. **Comptes** : inscription, connexion, déconnexion.
2. **Posts** : publier un post (280 caractères max), supprimer **uniquement ses propres** posts.
3. **Fil d'actualité** : posts de tous les comptes, **les plus récents en haut**, avec like / retirer son like.

Hors périmètre : images, abonnements, messages privés, modification de post, profil, recherche, commentaires, etc.

## 5. Règles de simplicité (aussi importantes que la sécurité)

- Niveau visé : Bachelor 3. Chaque ligne doit pouvoir être expliquée à l'oral.
- **Pas de classes**, pas de programmation fonctionnelle avancée (pas de `reduce` imbriqués, pas de longs chaînages
  `.filter().map().sort()...`), pas d'astuces en une ligne. Préférer des **`if`** et des **boucles `for` classiques**.
- **Fonctions courtes** (20 lignes max idéalement), **une seule tâche** chacune.
- Noms de variables et de fonctions **explicites, en français** (ex : `verifierMotDePasse`, `afficherLesPosts`).
- **Aucun code « au cas où »** : uniquement ce qui sert aux 3 fonctionnalités.
- Si une protection demande du code technique (ex : PBKDF2), l'isoler dans **une petite fonction**
  avec un commentaire qui explique simplement ce qu'elle fait et pourquoi, comme à un débutant.
- `async`/`await` autorisé (nécessaire pour `crypto.subtle`), mais expliqué en commentaire là où il apparaît.

## 6. Documentation du code

- **En haut de chaque fichier** (HTML, CSS, JS) : un bloc de commentaire avec
  le nom du fichier, son rôle en 1 ou 2 phrases, et le membre responsable (« Membre 1 » … « Membre 4 »).
- **Une JSDoc courte en français pour chaque fonction** : rôle, `@param`, `@returns`.
  ```js
  /**
   * Vérifie que le pseudo respecte les règles (3 à 20 caractères : lettres, chiffres, _).
   * @param {string} pseudo - Le pseudo saisi par l'utilisateur.
   * @returns {boolean} true si le pseudo est valide, sinon false.
   */
  ```
- Un commentaire **`// SÉCURITÉ : ...`** (ou `<!-- SÉCURITÉ : ... -->` en HTML, `/* SÉCURITÉ : ... */` en CSS)
  à chaque endroit où une protection est appliquée, qui explique **quelle attaque elle bloque**.

## 7. Règles de sécurité (à appliquer partout)

### Mots de passe
- Jamais stockés en clair : **PBKDF2 avec la Web Crypto API** (`crypto.subtle`), hash SHA-256,
  **un sel aléatoire par utilisateur** (16 octets, `crypto.getRandomValues`), **au moins 100 000 itérations**.
- On stocke uniquement : pseudo, sel, hash (encodés en texte, ex : hexadécimal).

### Anti-XSS
- **JAMAIS** `innerHTML`, `outerHTML`, `insertAdjacentHTML` ou `document.write` avec des données utilisateur
  (et par simplicité : jamais du tout).
- Construire le DOM avec **`document.createElement`** et remplir le texte avec **`textContent`**.
- Pas d'`eval`, pas de `new Function`, pas de `setTimeout("texte")`.

### Content-Security-Policy
Dans **chaque page**, juste après `<meta charset>`, exactement :
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">
```
- Jamais de `'unsafe-inline'` ni de `'unsafe-eval'`.
- **Tout le JS dans des fichiers `.js` séparés** : pas de `<script>` inline, pas d'attribut `onclick`/`onsubmit`/…
  Les événements se branchent avec `addEventListener`.
- **Aucun style inline** : pas d'attribut `style="..."`, pas de `<style>`, pas de `element.style.xxx = ...` en JS
  (on ajoute/retire des classes CSS, ou on utilise l'attribut `hidden`).

### En-têtes de page
- `<meta name="referrer" content="no-referrer">` sur chaque page.
- Tout lien externe éventuel : `target="_blank" rel="noopener noreferrer"`.
- **Chemins relatifs partout** (`css/style.css`, `assets/...`, `fil.html`), jamais de chemin commençant par `/`.

### Validation des saisies (HTML **ET** JS)
Les mêmes règles dans les attributs HTML et re-vérifiées en JS dans `validation.js` :

| Champ | Règle | Attributs HTML |
|---|---|---|
| Pseudo | 3 à 20 caractères, lettres sans accent, chiffres, `_` | `required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="username"` |
| Mot de passe (inscription) | 8 à 64 caractères | `required minlength="8" maxlength="64" autocomplete="new-password"` |
| Mot de passe (connexion) | 8 à 64 caractères | `required minlength="8" maxlength="64" autocomplete="current-password"` |
| Post | 1 à 280 caractères, pas uniquement des espaces | `required maxlength="280"` |

- Le pseudo est unique (comparaison sans tenir compte des majuscules, pour éviter `Testeur_1` / `testeur_1`).

### Connexion et session
- **Message d'erreur générique** : « Identifiants incorrects », que le pseudo existe ou non.
- **Limitation des tentatives** : connexion bloquée **30 secondes après 5 échecs**.
- **Session** : on ne stocke dans `sessionStorage` **que l'identifiant de l'utilisateur connecté**, jamais le mot de passe ni le hash.
- `fil.html` redirige vers `index.html` si personne n'est connecté.

### Autorisation
- Avant **toute suppression**, vérifier dans le code que l'utilisateur connecté **est bien l'auteur** du post
  (ne pas se contenter de cacher le bouton).

## 8. Identité visuelle

- Couleur principale `#2F54EB`, accent `#FF7A45`, texte `#0F172A`, fond blanc. Définies en variables CSS dans `:root`.
- **Police système** uniquement : `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Logo affiché avec `<img src="assets/logo/...svg" alt="Loby">` (voir `assets/README-logo.md`).

## 9. Façon de travailler

- **Expliquer le plan avant d'exécuter** une étape importante.
- **Ne jamais faire de commit ni de push** sans demande explicite.
- Ne pas mettre de prénoms : on écrit « Membre 1 » … « Membre 4 ».
- Tester en local avec `python3 -m http.server 8000` (pas en `file://`) et vérifier la console : aucune erreur CSP.
