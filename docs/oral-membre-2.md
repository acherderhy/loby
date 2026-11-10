# Fiche d'oral — Nathan : posts, autorisation et sécurité des photos

Fichiers : `js/posts.js`, `js/images.js`, `js/publier.js` et `publier.html` (page de publication, ouverte par le bouton « + »).

## Ma partie en une phrase

Je gère la publication et la suppression des posts, en vérifiant que seul l'auteur peut supprimer son post,
et je m'assure qu'une photo envoyée par un utilisateur ne peut contenir ni code caché, ni données personnelles.

## Ce que je dis

1. Pour publier, je revérifie en JavaScript que le post contient une photo ou un texte de 280 caractères maximum, même si on contourne le formulaire.
2. Pour supprimer, cacher le bouton ne suffit pas : quelqu'un pourrait appeler la fonction depuis la console, donc je vérifie dans le code que l'utilisateur connecté est bien l'auteur du post.
3. Pour les photos, je ne fais confiance à rien : je vérifie d'abord le poids, 5 Mo maximum, puis le type déclaré, JPEG, PNG ou WebP.
4. Le type déclaré vient juste de l'extension du nom, alors je lis aussi les premiers octets du fichier, sa signature, qui révèlent son vrai contenu.
5. Le SVG est refusé, car c'est du texte qui peut contenir du JavaScript.
6. Ensuite je redessine l'image dans un canvas et je l'exporte en JPEG : il ne reste que les pixels, donc la position GPS et le modèle du téléphone disparaissent.
7. Enfin, avant d'afficher une photo, je vérifie qu'elle commence par `data:image/jpeg;base64,`, au cas où quelqu'un l'aurait modifiée à la main dans le localStorage.

## Le code à montrer

### 1. `js/posts.js` — `supprimerPost` (l. 61-75)

```js
if (posts[index].auteurId !== idUtilisateur) {
  return false;
}
posts.splice(index, 1); // retire 1 élément à la position index
```

À dire : « C'est le contrôle d'autorisation, lignes 69 à 71. Avant de supprimer, je compare l'auteur du post
avec l'utilisateur connecté. Si ce n'est pas lui, je refuse, même si la fonction est appelée depuis la console. »

### 2. `js/images.js` — `verifierFichierImage` (l. 85-97) et `signatureEstValide` (l. 67-78)

```js
if (fichier.size > TAILLE_MAX_IMAGE) {
  return "Fichier trop lourd : 5 Mo maximum.";
}
if (!typeDeclareEstAutorise(fichier)) {
  return "Format refusé : seules les images JPEG, PNG ou WebP sont acceptées.";
}
const octets = await lirePremiersOctets(fichier);
if (!signatureEstValide(octets)) {
  return "Ce fichier n'est pas une vraie image JPEG, PNG ou WebP.";
}
```

À dire : « Trois vérifications dans l'ordre : le poids d'abord, pour ne pas traiter un fichier énorme ;
le type déclaré dans une liste blanche ; puis les premiers octets. Un JPEG commence par `FF D8 FF`,
un PNG par `89 50 4E 47`, un WebP par `RIFF` puis `WEBP`. Tout le reste est refusé. »

### 3. `js/images.js` — `dessinerAvatar` (l. 141-151) et `imageEstSure` (l. 198-202)

```js
return canvas.toDataURL("image/jpeg", QUALITE_JPEG);
// ...
return typeof dataUrl === "string" && dataUrl.startsWith(PREFIXE_IMAGE_SURE);
```

À dire : « Ligne 150, j'exporte uniquement les pixels redessinés : les métadonnées EXIF et tout contenu caché disparaissent.
Ligne 201, avant d'enregistrer ou d'afficher une image, je vérifie que c'est bien un de nos JPEG en data URL :
un SVG piégé ou une adresse vers un autre site est refusé. »

## La démo à faire

Préparation : site lancé en local, F12 ouvert, deux fichiers prêts sur le bureau :
- `photo.png` : une vraie image PNG ;
- `faux.jpg` : un fichier texte (créé avec un éditeur de texte, contenant par exemple `ceci n'est pas une image`) renommé en `.jpg`.

1. **Fichier déguisé** : connecté avec `demo_a`, cliquer le bouton rond « + » (page Publier), puis dans « Photo (facultatif) », choisir `faux.jpg`
   → « Ce fichier n'est pas une vraie image JPEG, PNG ou WebP. ». Le navigateur l'avait pourtant pris pour un JPEG (extension) : c'est la signature qui l'a démasqué.
2. **Vraie photo** : choisir `photo.png` → l'aperçu s'affiche avec le bouton « Retirer la photo ». Cliquer « Publier » → retour au fil, le post est en haut.
3. **Ré-encodage** : F12 → **Application** → **Local storage** → `loby_posts` : le champ `image` commence par
   `data:image/jpeg;base64,` alors qu'on a envoyé un **PNG** → preuve que l'image a été redessinée.
4. **Autorisation** : se déconnecter (onglet **Profil** → « Se déconnecter »), créer le compte `demo_b`. Sur le fil, dans l'onglet **Console**, taper :
   ```js
   lirePosts()
   ```
   Repérer un post dont l'`auteurId` est celui de `demo_a` (si on est parti d'un stockage vide, c'est `lirePosts()[0]`), puis taper :
   ```js
   supprimerPost(lirePosts()[0].id, utilisateurConnecte.id)
   ```
   → la console répond `false`. Recharger la page : le post de `demo_a` est toujours là.
   (Chrome demande d'écrire `allow pasting` avant le premier collage dans la console : on peut aussi taper la commande.)
5. *(Bonus)* Dans la console : `publierPost("test", "data:image/svg+xml;base64,AAAA", utilisateurConnecte.id)` → `"Photo invalide."`.

## Questions probables du prof

**1. Pourquoi vérifier les premiers octets, puisque vous vérifiez déjà le type ?**
Le type est déduit par le navigateur à partir de l'extension du nom : un fichier texte renommé en `.jpg` passe pour un JPEG.
Les premiers octets, eux, dépendent du vrai contenu.

**2. Pourquoi refuser le SVG ?**
Un SVG n'est pas une image en pixels : c'est du texte XML, qui peut contenir une balise `<script>` ou des attributs `onload`.
S'il était ouvert ou affiché dans certains contextes, son code s'exécuterait.

**3. Votre contrôle d'autorisation est-il vraiment sûr, sans serveur ?**
Il bloque l'interface normale et les appels de fonction depuis la console. Mais quelqu'un qui modifie lui-même
son `sessionStorage` ou son `localStorage` peut le contourner. En production, ce contrôle se ferait sur le serveur.

**4. À quoi sert concrètement le redessin dans un canvas ?**
Une photo de téléphone contient souvent la position GPS de la prise de vue (données EXIF). En ne gardant que les pixels,
on supprime ces données et tout contenu caché ajouté à la fin du fichier. En plus, la photo devient plus légère.

## En mes mots

Moi, je m'occupe des posts et des photos. Une photo peut être dangereuse, donc avant de l'accepter on fait plusieurs contrôles : la taille (5 Mo max), le type (JPEG, PNG ou WebP seulement, pas de SVG qui peut cacher du code), et on lit les premiers octets du fichier pour vérifier que c'est vraiment une image et pas un fichier renommé.

Ensuite, on redessine l'image : ça supprime les informations cachées dans la photo, comme la position GPS du téléphone. Enfin, on ne peut supprimer que ses propres posts : le code vérifie qui est l'auteur au moment de la suppression, même si quelqu'un essaie de tricher depuis la console.
