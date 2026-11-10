# Scénario de démo commun — 4 minutes (2 minutes de v1, 2 minutes de v2)

Démo enchaînée à 4, dans l'ordre. Chaque membre parle pendant sa partie et fait lui-même les clics (ou les dicte).
Le détail de chaque protection est dans les fiches `oral-membre-1.md` à `oral-membre-4.md`.

## Avant l'oral (pas chronométré)

- Lancer le site : `python3 -m http.server 8000` à la racine du projet, puis ouvrir <http://localhost:8000/> dans Chrome.
- Partir d'un stockage vide : F12 → **Application** → **Storage** → **Clear site data**.
- Garder F12 ouvert (onglets utiles : **Elements**, **Console**, **Application**).
- Préparer sur le bureau : `photo.png` (une vraie image) et `faux.jpg` (un fichier texte renommé en `.jpg`).
- Comptes fictifs utilisés : `demo_a` et `demo_b`, mot de passe `demo-mdp-2026` (aucune donnée réelle).
- Pour la partie v2 : ordinateur et téléphone connectés à internet, deux comptes fictifs `demo_c` et `demo_d` (mot de passe `demo-mdp-2026`) déjà créés sur <https://acherderhy.github.io/loby/v2/>.
- Répéter la démo une fois en entier, puis refaire **Clear site data** juste avant de passer.

## Le scénario

L'histoire en deux temps : **v1** (sans backend, sécurité côté navigateur), puis **v2** (backend Supabase, autorisé par le prof, sécurité vérifiée par le serveur).

### Partie 1 — v1 : la sécurité côté navigateur (environ 2 minutes)

| Temps | Qui parle | Ce qu'on fait | Ce qu'on montre |
|---|---|---|---|
| 0:00 – 0:25 | **Eden** | Présenter les deux temps du projet. Sur la page de connexion : **Elements** → clic droit sur le titre `<h1>` → **Edit as HTML** → ajouter `<img src="x" onerror="alert(1)">`. Puis **Console**. | Aucune alerte ; la console affiche « Refused to execute inline event handler… ». La CSP bloque le code injecté. |
| 0:25 – 0:50 | **Liora** | Créer le compte `demo_a` / `demo-mdp-2026`. **Application** → **Local storage** → `loby_utilisateurs`, puis **Session storage** → `loby_session`. Puis connexion avec `demo_a` / `mauvais-mdp` jusqu'au blocage. | Seulement un `sel` et un `hachage` (PBKDF2, 600 000 itérations), aucun mot de passe ; en session, uniquement l'identifiant. « Identifiants incorrects », puis « Trop de tentatives. Réessayez dans 30 secondes. ». |
| 0:50 – 1:15 | **Nathan** | Bouton rond « + ». Choisir `faux.jpg`, puis `photo.png` avec le texte `Mon premier post`, « Publier ». Montrer `loby_posts` dans **Application**. | `faux.jpg` est refusé ; le PNG est enregistré en `data:image/jpeg;base64,` : redessiné, métadonnées supprimées. |
| 1:15 – 1:45 | **Acher** | Publier `<img src=x onerror=alert(1)>`. Liker puis retirer le like. « Supprimer » → « Oui » sur ce post. Onglet **Profil** → « Se déconnecter », puis taper `localhost:8000/fil.html`. | Le code s'affiche comme du texte (`textContent`) ; confirmation dans la carte ; sans session, retour à la connexion. |
| 1:45 – 2:00 | **Eden** | Dans la **Console** : `lirePosts()` puis modifier un `auteurId` à la main dans **Local storage**, recharger. Dire : « Dans la v1, le navigateur a le dernier mot. » | La donnée est modifiable avec F12 : c'est la limite de la v1 trouvée par l'audit, et chaque navigateur a ses propres comptes. |

### Partie 2 — v2 : le backend vérifie la sécurité (environ 2 minutes)

Ouvrir <https://acherderhy.github.io/loby/v2/> sur l'ordinateur **et** sur le téléphone, avec deux comptes fictifs (`demo_c` sur l'ordinateur, `demo_d` sur le téléphone).

| Temps | Qui parle | Ce qu'on fait | Ce qu'on montre |
|---|---|---|---|
| 2:00 – 2:20 | **Eden** | Introduire la v2 : « Le prof a autorisé un backend : Supabase. Même interface, mais les données sont dans une base partagée. » | Le bandeau « Version 2 » ; l'onglet **Network** : les requêtes partent vers Supabase (seul domaine autorisé par la CSP `connect-src`). |
| 2:20 – 2:50 | **Liora** | Se connecter sur l'ordinateur (`demo_c`) et sur le téléphone (`demo_d`). Publier un post sur l'ordinateur, puis actualiser le fil du téléphone. | Le post apparaît sur le téléphone : les données sont partagées entre tous les appareils. Dans la v1, c'était impossible. |
| 2:50 – 3:20 | **Nathan** | Sur le téléphone (`demo_d`), liker le post de `demo_c`. Dans la **Console** de l'ordinateur, tenter de supprimer le post de `demo_d` avec une requête `fetch` vers Supabase (ou via l'interface modifiée). | La base **refuse** la suppression (règle RLS) : même en contournant l'interface, on ne supprime que ses propres posts. |
| 3:20 – 3:40 | **Acher** | Montrer qu'un jeton modifié dans le `sessionStorage` ne donne rien, puis recharger. | Le serveur refuse le jeton (401) : retour à la connexion. La session falsifiable de la v1 est corrigée. |
| 3:40 – 4:00 | **Eden** | Conclusion (ci-dessous). | La clé visible dans le code est publique par conception ; la sécurité vient des règles RLS. |

## Phrase de conclusion (Eden)

« Nous avons procédé en deux temps. La v1, sans backend, nous a appris à poser les barrières côté navigateur :
CSP et `textContent` contre le XSS, HTML et JavaScript pour la validation, PBKDF2 pour les mots de passe.
L'audit a montré sa limite : le navigateur a le dernier mot. Avec l'accord du prof, la v2 ajoute Supabase :
les données sont partagées entre tous, et c'est le serveur qui vérifie la sécurité grâce aux règles RLS. »

## Si quelque chose ne marche pas

- **Chrome refuse de coller dans la console** : taper `allow pasting` puis Entrée, ou taper la commande à la main.
- **La connexion est déjà bloquée** au début : le compteur vient d'une répétition. Refaire **Clear site data**.
- **`lirePosts()[0]` n'est pas le post de `demo_a`** : le stockage n'était pas vide. Taper `lirePosts()` et prendre l'`id` d'un post dont l'`auteurId` n'est pas celui de `demo_b`.
