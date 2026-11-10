# Étape 6 : version 2 avec Supabase (bonus, dans le dossier v2/)

Modèle utilisé : Opus 5.5, en mode Plan.
Contexte : la base Supabase est déjà créée avec le script v2/supabase.sql (tables, règles RLS, droits, trigger).

Project URL déjà renseignée (elle n'est pas secrète).
La clé publishable (sb_publishable_...) sera collée à la main dans v2/js/config.js, jamais la clé secret.

```
Étape 6 : créer une VERSION 2 de Loby dans un dossier v2/, branchée sur Supabase, pour que tous les utilisateurs partagent les mêmes posts, photos et likes.

RÈGLE ABSOLUE : ne modifie AUCUN fichier en dehors de v2/, sauf à la fin : README.md (une section v2), SECURITE.md (une section v2), CLAUDE.md (arborescence) et index.html (un seul lien discret "Essayer la version partagée (v2)" vers v2/index.html). La version principale doit rester identique : elle respecte la consigne "pas de backend" et nos fiches d'oral citent ses numéros de lignes.

Relis CLAUDE.md : mêmes règles de simplicité, de documentation (en-tête de fichier, JSDoc FR, commentaires // SÉCURITÉ :) et de sécurité (pas d'innerHTML, CSP stricte, pas de script ni de style inline).

Contexte Supabase (déjà configuré, lis v2/supabase.sql pour le détail) :
- Project URL : https://tcskegpdoldosfefhmvy.supabase.co
- Tables : profiles(id, pseudo, avatar, created_at), posts(id, auteur_id, texte, image, created_at), likes(post_id, user_id). RLS active : seuls les connectés lisent ; on publie, supprime et like seulement en son nom ; seul l'avatar du profil est modifiable.
- Le profil est créé automatiquement à l'inscription par un trigger, à partir de user_metadata.pseudo. Si le pseudo est pris ou invalide, l'inscription échoue côté serveur.
- "Confirm email" est désactivé : l'inscription renvoie directement une session.

Contraintes techniques :
- AUCUNE librairie (pas de supabase-js, pas de CDN) : uniquement fetch() vers l'API REST de Supabase.
- v2/js/config.js : SUPABASE_URL et SUPABASE_ANON_KEY. Mets "COLLER_LA_CLE_ANON_ICI" à la place de la clé : je collerai moi-même la clé "publishable" (elle commence par sb_publishable_ et joue le rôle de la clé anon). Commentaire SÉCURITÉ : la clé anon est publique par conception, la sécurité vient des règles RLS ; ne jamais mettre la clé service_role dans le code.
- Réutilise sans les copier les fichiers communs de la v1 quand c'est possible : ../css/style.css, ../assets/, ../js/validation.js, ../js/images.js (vérifie que leurs fonctions ne dépendent pas du localStorage ; sinon, crée une petite version adaptée dans v2/js/).
- CSP des pages v2 : la même qu'en v1, avec en plus connect-src 'self' https://tcskegpdoldosfefhmvy.supabase.co. Commentaire SÉCURITÉ qui explique pourquoi.
- Comptes : le pseudo reste l'identifiant visible. Pour Supabase, fabrique l'email pseudo-en-minuscules@loby.example.com (jamais affiché). Inscription : POST /auth/v1/signup avec { email, password, data: { pseudo } }. Connexion : POST /auth/v1/token?grant_type=password. Déconnexion : POST /auth/v1/logout. Garde la validation JS du pseudo (3-20, [A-Za-z0-9_]) et du mot de passe (8-64) avant l'envoi. Message générique "Identifiants incorrects" à la connexion. Si l'inscription échoue : "Ce pseudo est déjà pris ou invalide."
- Session : stocke access_token et l'id utilisateur dans sessionStorage (jamais le mot de passe). Si une requête renvoie 401 (jeton expiré), vide la session et renvoie vers v2/index.html.
- En-têtes de chaque requête REST : apikey: SUPABASE_ANON_KEY et Authorization: Bearer <access_token>.
- Fil : GET /rest/v1/posts?select=id,texte,image,created_at,auteur_id,profiles(pseudo,avatar),likes(user_id)&order=created_at.desc
- Publier : POST /rest/v1/posts avec { texte, image } (auteur_id est rempli par la base avec auth.uid()). Photo : mêmes contrôles et même redessin JPEG que la v1 (images.js).
- Supprimer : DELETE /rest/v1/posts?id=eq.<id> avec Prefer: return=representation. Si la réponse est une liste vide, afficher "Vous ne pouvez supprimer que vos propres posts." (la base a refusé). Garde la confirmation Oui / Annuler.
- Like : POST /rest/v1/likes { post_id } ; retirer : DELETE /rest/v1/likes?post_id=eq.<id>&user_id=eq.<mon id>.
- Avatar : PATCH /rest/v1/profiles?id=eq.<mon id> { avatar }, à l'inscription (après la création du compte) et depuis le fil.
- Affichage : exactement comme la v1 (createElement + textContent, imageEstSure avant d'afficher une image).
- Un petit bandeau en haut des pages v2 : "Version 2 : données partagées (Supabase)" avec un lien vers la version 1.
- Un fichier v2/README.md court : ce qui change par rapport à la v1, et pourquoi c'est plus sûr (contrôles faits par le serveur grâce au RLS).

Fichiers à créer, le moins possible : v2/index.html, v2/fil.html, v2/js/config.js, v2/js/supabase.js (les fonctions fetch : inscription, connexion, déconnexion, lire, ajouter, supprimer, modifier), v2/js/comptes.js, v2/js/fil.js. Plus v2/README.md.

Tests (Chrome, python3 -m http.server 8001 à la racine, http://localhost:8001/v2/) — À FAIRE APRÈS que j'aie collé la clé anon : arrête-toi et demande-la-moi avant de tester.
1. Créer demo_a (avec photo de profil) et demo_b dans deux fenêtres (une normale, une privée) : chacun voit les posts de l'autre.
2. Post avec photo, post texte, like croisé, retrait du like.
3. demo_b supprime son post : OK. demo_b tente de supprimer le post de demo_a depuis la console avec fetch : la base refuse.
4. Pseudo déjà pris : message clair. Mauvais mot de passe : "Identifiants incorrects".
5. Sans connexion : un fetch sur /rest/v1/posts avec la seule clé anon renvoie une liste vide ou une erreur (aucune donnée visible).
6. Console : aucune erreur CSP. Vérifie aussi que la v1 (http://localhost:8001/) fonctionne toujours exactement comme avant.

À la fin :
- README.md : une section "Version 2 (bonus) : données partagées avec Supabase" + lien https://acherderhy.github.io/loby/v2/
- SECURITE.md : une section "Version 2" : RLS, droits explicites, clé anon publique, ce que la v2 corrige parmi les limites de la v1 (session falsifiable, hachages lisibles, blocage contournable, données non partagées) et ce qui reste (clickjacking via meta CSP).
- Commit "Étape 6 : version 2 avec Supabase (dossier v2)" puis push.
Résumé final court. Explique ton plan avant d'exécuter.
```
