# Fiche d'oral — EDEN : CSP, validation des saisies et documentation

Fichiers : `js/validation.js`, en-têtes de sécurité de `index.html` et `fil.html`, `README.md`, `cadrage.md`, `SECURITE.md`.

## Ma partie en une phrase

Je pose les barrières communes aux deux pages, la Content-Security-Policy et la validation des saisies en HTML
puis en JavaScript, et je documente le projet, ses protections et ses limites.

## Ce que je dis

1. Chaque page commence par une Content-Security-Policy : c'est une liste blanche qui dit au navigateur ce que la page a le droit de charger.
2. Notre CSP n'autorise que les fichiers de notre site, et elle interdit tout JavaScript inline, donc même si un attaquant arrivait à injecter du code dans la page, le navigateur refuserait de l'exécuter.
3. Le seul assouplissement est `data:` pour les images, parce que nos photos sont stockées sous forme de data URL, mais il ne concerne que les images, jamais les scripts.
4. On n'utilise aucune ressource externe, ni CDN ni Google Fonts, et on ajoute `no-referrer` pour ne jamais envoyer l'adresse de nos pages à d'autres sites.
5. Pour les saisies, on a les règles dans le HTML avec `required`, `minlength`, `maxlength` et `pattern`, mais ça se supprime en deux secondes avec F12.
6. C'est pour ça que je revérifie exactement les mêmes règles en JavaScript dans `validation.js`, avant tout enregistrement.
7. Enfin, j'ai rédigé le cadrage et le fichier SECURITE.md, qui expliquent honnêtement ce qu'un site sans serveur ne peut pas protéger.

## Le code à montrer

### 1. `index.html` — la balise CSP (l. 30-31, commentaire l. 13-29 ; identique dans `fil.html` l. 31-32)

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'">
```

À dire : « `default-src 'self'` : tout vient de notre site. `script-src 'self'` sans `'unsafe-inline'` : pas de `<script>` inline,
pas de `onclick`, pas d'`eval`. `object-src 'none'` bloque les plugins, `base-uri 'self'` empêche de détourner nos chemins relatifs,
`form-action 'self'` empêche d'envoyer un formulaire vers un autre site. Elle est placée juste après `charset`, avant toute autre ressource. »

### 2. `js/validation.js` — `REGLE_PSEUDO` (l. 14) et `pseudoEstValide` (l. 21-23), avec `index.html` (l. 75-76)

```js
const REGLE_PSEUDO = /^[A-Za-z0-9_]{3,20}$/;
// ...
return REGLE_PSEUDO.test(pseudo);
```

```html
required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="username"
```

À dire : « C'est la même règle des deux côtés : 3 à 20 caractères, lettres sans accent, chiffres ou `_`.
Le `^` et le `$` obligent toute la chaîne à respecter la règle, pas seulement un morceau. Le HTML aide l'utilisateur,
le JavaScript protège vraiment. »

### 3. `js/validation.js` — `contenuPostEstValide` (l. 40-52)

```js
if (texte.length > 280) {
  return false;
}
if (texte.trim() !== "") {
  return true;
}
return image !== "";
```

À dire : « Trois cas : plus de 280 caractères, c'est refusé ; un vrai texte, c'est accepté ; pas de texte, alors il faut une photo.
`trim()` enlève les espaces au début et à la fin : un post qui ne contient que des espaces compte comme vide. »

## La démo à faire

Préparation : site lancé en local sur la page de connexion, F12 ouvert.

1. **CSP en action** : F12 → onglet **Elements** → clic droit sur `<h1 class="accroche">` → **Edit as HTML**.
   Ajouter juste après : `<img src="x" onerror="alert(1)">`, puis cliquer en dehors.
   → **Aucune alerte**. Onglet **Console** : erreur « Refused to execute inline event handler because it violates the following
   Content Security Policy directive: "script-src 'self'" ». C'est la CSP qui a bloqué le code injecté.
2. **Aucune ressource externe** : onglet **Network**, recharger la page (F5) → toutes les requêtes viennent de `localhost`.
3. **Validation HTML** : dans « Créer un compte », taper le pseudo `ab` → le navigateur bloque l'envoi (3 caractères minimum).
4. **Validation JS** : connecté sur le fil, dans l'onglet **Console**, taper :
   ```js
   document.getElementById("texte-post").value = "a".repeat(300)
   ```
   (cela contourne le `maxlength="280"`), puis cliquer « Publier »
   → « Le post doit contenir une photo ou un texte (280 caractères maximum). ».
5. **Post vide** : vider la zone de texte, sans photo, cliquer « Publier » → même message : le post vide est refusé en JavaScript.

## Questions probables du prof

**1. `data:` dans `img-src`, ce n'est pas dangereux ?**
Il n'est autorisé que pour les images, pas pour les scripts (`script-src` reste `'self'`). Une image affichée dans un `<img>`
ne peut pas exécuter de JavaScript, et `images.js` n'affiche que des JPEG redessinés par notre canvas.

**2. Pourquoi valider à la fois en HTML et en JavaScript ?**
Le HTML donne un retour immédiat à l'utilisateur, mais il se contourne avec F12. Le JavaScript revérifie avant d'enregistrer.
En production, il faudrait une troisième vérification sur le serveur, la seule que l'utilisateur ne contrôle pas.

**3. Quelles sont les limites d'une CSP placée dans une balise `<meta>` ?**
Certaines directives y sont ignorées, notamment `frame-ancestors`, qui protège contre le clickjacking.
Il faudrait un en-tête HTTP, et GitHub Pages ne permet pas d'en ajouter.

**4. Pourquoi aucune librairie, aucun CDN, aucune police Google ?**
Chaque ressource externe est une porte d'entrée : si le CDN est compromis, son code s'exécute chez nous.
En plus, la CSP peut rester à `'self'`, et aucune requête ne part vers un autre site avec l'adresse IP de l'utilisateur.

## En mes mots
Moi, je présente la sécurité générale du site. Chaque page a une règle de sécurité, la CSP, qui dit au navigateur de n'exécuter que nos propres fichiers : un script injecté par un pirate est bloqué. Toutes les saisies sont vérifiées deux fois, dans le HTML puis dans le JavaScript, parce que le HTML peut être contourné.

On a aussi fait auditer le code par un outil d'IA : il n'a trouvé aucune faille grave et a relevé 8 points. On en a corrigé 3, et les 5 autres sont des limites normales d'un site sans serveur, qu'on explique dans le cadrage avec ce qu'il faudrait faire en vrai.

