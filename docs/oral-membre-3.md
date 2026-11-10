# Fiche d'oral — Membre 3 : fil d'actualité, likes, interface et anti-XSS

Fichiers : `js/fil.js`, `css/style.css`, `fil.html`.

## Ma partie en une phrase

J'affiche le fil d'actualité, du post le plus récent au plus ancien, avec les likes et la suppression,
en construisant la page de façon à ce qu'aucun texte écrit par un utilisateur ne puisse s'exécuter comme du code.

## Ce que je dis

1. La page du fil est réservée aux utilisateurs connectés : au chargement, si la session ne correspond à aucun compte, je renvoie vers la page de connexion avant d'afficher quoi que ce soit.
2. Pour afficher les posts, je n'utilise jamais `innerHTML` : je crée chaque élément avec `createElement` et je mets le texte avec `textContent`.
3. Avec `textContent`, un post qui contient du HTML ou du JavaScript s'affiche comme du simple texte : c'est ce qui bloque le XSS stocké.
4. Les posts sont enregistrés dans l'ordre de publication, donc je parcours la liste à l'envers pour avoir les plus récents en haut.
5. Pour les likes, chaque post garde la liste des identifiants des personnes qui l'ont liké : si mon identifiant y est, je le retire, sinon je l'ajoute, donc un seul like par personne.
6. Le bouton « Supprimer » n'apparaît que sur mes propres posts, et il demande une confirmation dans la carte, mais ce n'est que du confort : le vrai contrôle est refait dans `supprimerPost`.
7. Tous les styles sont dans `css/style.css` et tous les événements sont branchés avec `addEventListener`, ce qui permet d'avoir une CSP sans `'unsafe-inline'`.

## Le code à montrer

### 1. `js/fil.js` — `creerTextePost` (l. 314-321)

```js
const texte = document.createElement("p");
texte.className = "post-texte";
// SÉCURITÉ : anti-XSS. textContent affiche le texte tel quel : un post contenant
// <img src=x onerror=alert(1)> apparaît comme du texte et n'est jamais exécuté.
texte.textContent = post.texte;
```

À dire : « C'est la protection anti-XSS principale. `innerHTML` demanderait au navigateur d'interpréter le texte comme du HTML ;
`textContent` l'écrit tel quel. Même si la CSP tombait, ce code resterait sûr : on a deux barrières. »

### 2. `js/fil.js` — `afficherLesPosts` (l. 366-382)

```js
liste.replaceChildren(); // vide la liste (sans innerHTML)
// ...
for (let i = posts.length - 1; i >= 0; i--) {
  liste.appendChild(creerElementPost(posts[i]));
}
```

À dire : « Je vide la liste avec `replaceChildren`, pas avec `innerHTML = ""`. Puis une boucle `for` qui part de la fin :
le dernier post publié s'affiche en premier. Chaque post est construit par `creerElementPost`, uniquement avec `createElement`. »

### 3. `js/fil.js` — `demarrerFil` (l. 455-469)

```js
utilisateurConnecte = trouverUtilisateurParId(lireSession());
if (utilisateurConnecte === null) {
  window.location.replace("index.html");
  return;
}
```

À dire : « Au démarrage, je lis l'identifiant en session et je cherche le compte. S'il n'y a pas de session,
ou si l'identifiant ne correspond à aucun compte, je redirige. `replace` évite que le bouton « Retour » ramène sur le fil.
Et dans `creerActionsPost` (l. 354-358), le commentaire rappelle que cacher le bouton « Supprimer » n'est pas la protection. »

## La démo à faire

Préparation : site lancé en local, connecté avec `demo_a`, F12 ouvert.

1. **XSS** : dans « Quoi de neuf ? », taper exactement `<img src=x onerror=alert(1)>` puis cliquer « Publier ».
   → Le post affiche le texte tel quel, **aucune alerte** ne s'ouvre. Taper aussi `<b>gras</b>` : les balises apparaissent, rien n'est en gras.
2. **Ordre du fil** : publier un second post `deuxième post` → il apparaît **au-dessus** du premier.
3. **Like** : cliquer sur « ♥ 0 » → il passe à « ♥ 1 » et change de couleur. Recliquer → retour à « ♥ 0 ».
4. **Suppression avec confirmation** : cliquer « Supprimer » → « Supprimer ce post ? » Oui / Annuler apparaît dans la carte.
   Cliquer « Annuler » → le bouton revient. Recliquer « Supprimer » puis « Oui » → le post disparaît.
5. **Page protégée** : cliquer « Se déconnecter », puis taper `localhost:8000/fil.html` dans la barre d'adresse
   → on est renvoyé immédiatement vers la page de connexion.
6. *(Si on a le temps)* F12 → **Console** : aucune erreur CSP pendant toute la démo.

## Questions probables du prof

**1. Quelle différence entre `textContent` et `innerHTML` ?**
`innerHTML` interprète le texte comme du HTML : des balises et des attributs comme `onerror` seraient créés et exécutés.
`textContent` écrit du texte brut : les `<` et `>` restent des caractères affichés.

**2. Si le bouton « Supprimer » est caché sur les posts des autres, pourquoi refaire le contrôle ?**
Parce que l'interface se contourne : on peut appeler `supprimerPost` depuis la console. Le contrôle dans `posts.js`
vérifie l'auteur quoi qu'il arrive ; le bouton caché n'est que du confort.

**3. La redirection de `fil.html` protège-t-elle vraiment les données ?**
Elle empêche d'utiliser le fil sans être connecté. Mais les posts sont dans le `localStorage`, lisible avec F12 :
sans serveur, ce n'est pas une protection des données, c'est une protection de l'interface.

**4. Comment garantissez-vous un seul like par personne ?**
Chaque post a une liste `likes` qui contient des identifiants d'utilisateurs. Dans `basculerLike` (l. 136-150),
si mon identifiant est déjà dans la liste je le retire, sinon je l'ajoute : il ne peut jamais y être deux fois.

## En mes mots

<!-- À compléter par le Membre 3 : reformuler la partie avec ses propres mots. -->

