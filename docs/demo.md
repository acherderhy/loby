# Scénario de démo commun — 3 minutes

Démo enchaînée à 4, dans l'ordre. Chaque membre parle pendant sa partie et fait lui-même les clics (ou les dicte).
Le détail de chaque protection est dans les fiches `oral-membre-1.md` à `oral-membre-4.md`.

## Avant l'oral (pas chronométré)

- Lancer le site : `python3 -m http.server 8000` à la racine du projet, puis ouvrir <http://localhost:8000/> dans Chrome.
- Partir d'un stockage vide : F12 → **Application** → **Storage** → **Clear site data**.
- Garder F12 ouvert (onglets utiles : **Elements**, **Console**, **Application**).
- Préparer sur le bureau : `photo.png` (une vraie image) et `faux.jpg` (un fichier texte renommé en `.jpg`).
- Comptes fictifs utilisés : `demo_a` et `demo_b`, mot de passe `demo-mdp-2026` (aucune donnée réelle).
- Répéter la démo une fois en entier, puis refaire **Clear site data** juste avant de passer.

## Le scénario

| Temps | Qui parle | Ce qu'on fait | Ce qu'on montre |
|---|---|---|---|
| 0:00 – 0:30 | **Eden** | Sur la page de connexion : **Elements** → clic droit sur le titre `<h1>` → **Edit as HTML** → ajouter `<img src="x" onerror="alert(1)">`. Puis **Console**. | Aucune alerte ; la console affiche « Refused to execute inline event handler… ». La CSP bloque le code injecté. |
| 0:30 – 1:00 | **Liora** | Créer le compte `demo_a` / `demo-mdp-2026`. Sur le fil : **Application** → **Local storage** → `loby_utilisateurs`, puis **Session storage** → `loby_session`. Onglet **Profil** : changer sa photo avec `photo.png`. | Seulement un `sel` et un `hachage` (PBKDF2, 600 000 itérations), aucun mot de passe. En session : uniquement l'identifiant. La nouvelle photo apparaît sur le profil et dans l'en-tête. |
| 1:00 – 1:35 | **Nathan** | Bouton rond « + » (page Publier). Choisir `faux.jpg` comme photo de post. Puis choisir `photo.png`, taper `Mon premier post` et cliquer « Publier » (retour au fil). Montrer `loby_posts` dans **Application**. | `faux.jpg` est refusé (« Ce fichier n'est pas une vraie image… ») ; le PNG est enregistré en `data:image/jpeg;base64,` : il a été redessiné, les métadonnées ont disparu. |
| 1:35 – 2:05 | **Acher** | Avec le bouton « + », publier `<img src=x onerror=alert(1)>`. Liker puis retirer le like d'un post. Sur ce post XSS : « Supprimer » → « Oui ». Onglet **Profil** → « Se déconnecter », puis taper `localhost:8000/fil.html` (ou `profil.html`). | Le code s'affiche comme du texte (`textContent`), rien ne s'exécute ; plus récents en haut ; confirmation dans la carte ; onglet actif mis en avant ; sans session, retour immédiat à la connexion. |
| 2:05 – 2:30 | **Liora** | Se connecter avec `demo_a` / `mauvais-mdp`, puis `pseudo_inconnu` / `mauvais-mdp`, puis encore 3 échecs. Ensuite, créer le compte `demo_b` (l'inscription n'est pas bloquée). | Même message « Identifiants incorrects » dans les deux cas ; au 5e échec : « Trop de tentatives. Réessayez dans 30 secondes. ». |
| 2:30 – 2:45 | **Nathan** | Connecté en `demo_b`, sur le fil, dans la **Console** : `supprimerPost(lirePosts()[0].id, utilisateurConnecte.id)`, puis recharger la page. | La console répond `false` : le post de `demo_a` est toujours là. Le contrôle d'autorisation est dans le code, pas seulement dans l'interface. |
| 2:45 – 3:00 | **Eden** | Bouton « + » (page Publier). Dans la **Console** : `document.getElementById("texte-post").value = "a".repeat(300)`, puis « Publier ». Phrase de conclusion. | « Le post doit contenir une photo ou un texte (280 caractères maximum). » : la validation JS rattrape le contournement du HTML. |

## Phrase de conclusion (Eden)

« Toutes ces protections se superposent : CSP et `textContent` contre le XSS, HTML et JavaScript pour la validation.
Mais sans serveur, le navigateur a le dernier mot : en production, il faudrait refaire ces contrôles côté serveur,
comme on l'explique dans SECURITE.md. »

## Si quelque chose ne marche pas

- **Chrome refuse de coller dans la console** : taper `allow pasting` puis Entrée, ou taper la commande à la main.
- **La connexion est déjà bloquée** au début : le compteur vient d'une répétition. Refaire **Clear site data**.
- **`lirePosts()[0]` n'est pas le post de `demo_a`** : le stockage n'était pas vide. Taper `lirePosts()` et prendre l'`id` d'un post dont l'`auteurId` n'est pas celui de `demo_b`.

## Bonus : la version 2 (1 minute)

Ouvrir <https://acherderhy.github.io/loby/v2/> sur l'ordinateur **et** sur le téléphone, connectés avec deux comptes fictifs.

| Temps | Ce qu'on fait | Ce qu'on montre |
|---|---|---|
| 0:00 – 0:20 | Sur l'ordinateur, expliquer : « La v2 utilise Supabase, une base de données partagée. » | Le bandeau « Version 2 » en haut de la page. |
| 0:20 – 0:45 | Publier un post sur l'ordinateur, puis actualiser le fil sur le téléphone. | Le post apparaît sur le téléphone : les données sont partagées entre tous les appareils. |
| 0:45 – 1:00 | Dire : « La clé visible dans le code est publique ; la sécurité vient des règles RLS vérifiées par le serveur. » | Un utilisateur ne peut pas supprimer le post d'un autre, même en contournant l'interface. |
