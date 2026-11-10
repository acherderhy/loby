# Étape 1 : cadrage et structure du projet

Modèle utilisé : Opus 5.5, en mode Plan.

```
On démarre un projet d'école en groupe de 4 : "Loby", un mini réseau social type Twitter, pour un cours mêlant dev, IA et cybersécurité. Objectif pédagogique : maîtriser les bonnes pratiques et balises de sécurité web. Chaque membre devra expliquer son code à l'oral.

=== CONTRAINTES DU PROF (non négociables) ===
- PAS DE BACKEND : uniquement HTML, CSS et JavaScript vanilla, exécutés dans le navigateur. Aucun framework, aucune librairie externe, aucun CDN.
- Données stockées dans le navigateur (localStorage).
- Aucune donnée personnelle réelle dans le dépôt GitHub (pas de vrais noms, emails ou mots de passe, même dans des données de démo).
- Un fichier cadrage.md à la racine.
- Un fichier README.md.
- Code commenté.

=== LES 3 FONCTIONNALITÉS (pas une de plus) ===
1. Comptes : inscription, connexion, déconnexion
2. Posts : publier un post (280 caractères max), supprimer uniquement ses propres posts
3. Fil d'actualité : posts de tous les comptes, les plus récents en haut, avec like / retirer son like

=== RÈGLES DE SIMPLICITÉ (aussi importantes que la sécurité) ===
- Niveau visé : étudiants de Bachelor 3 qui doivent pouvoir expliquer chaque ligne à l'oral.
- Pas de classes, pas de programmation fonctionnelle avancée (pas de reduce imbriqués, pas de longs chaînages), pas d'astuces en une ligne : préfère des if et des boucles for classiques.
- Fonctions courtes (20 lignes max idéalement), une seule tâche chacune.
- Noms de variables et de fonctions explicites, en français (ex : verifierMotDePasse, afficherLesPosts).
- 2 pages HTML maximum (connexion/inscription + fil d'actualité), 1 fichier CSS, 5 ou 6 fichiers JS maximum.
- Aucun code "au cas où" : uniquement ce qui sert aux 3 fonctionnalités.
- Si une protection demande du code un peu technique (ex : PBKDF2), isole-la dans une petite fonction avec un commentaire qui explique simplement ce qu'elle fait et pourquoi, comme à un débutant.

=== DOCUMENTATION DU CODE ===
- En haut de chaque fichier : un bloc de commentaire "Ce fichier sert à..." en 2-3 phrases (nom du fichier, rôle, membre responsable).
- Une JSDoc courte en français pour chaque fonction (rôle, paramètres, valeur de retour).
- Un commentaire "// SÉCURITÉ : ..." à chaque endroit où une protection est appliquée, qui explique quelle attaque elle bloque.

=== RÈGLES DE SÉCURITÉ À APPLIQUER PARTOUT ===
- Mots de passe jamais stockés en clair : hachage PBKDF2 avec la Web Crypto API (crypto.subtle), un sel aléatoire par utilisateur, au moins 100 000 itérations.
- Anti-XSS : JAMAIS innerHTML, outerHTML, insertAdjacentHTML ou document.write avec des données utilisateur. Utiliser textContent et createElement.
- Content-Security-Policy stricte via <meta http-equiv> dans chaque page : default-src 'self' ; aucun script inline ; aucun style inline ; aucun eval ; object-src 'none' ; base-uri 'self' ; form-action 'self'.
- Tout le JS dans des fichiers .js séparés : pas d'attribut onclick, pas de <script> inline.
- <meta name="referrer" content="no-referrer"> sur chaque page.
- Validation de toutes les saisies (longueur, caractères autorisés pour le pseudo, mot de passe de 8 caractères minimum), avec les attributs HTML (required, maxlength, minlength, pattern) ET une re-vérification en JS.
- Attributs autocomplete corrects (username, new-password, current-password).
- Limitation des tentatives : connexion bloquée 30 secondes après 5 échecs.
- Contrôle d'autorisation : vérifier dans le code que l'utilisateur connecté est bien l'auteur avant toute suppression.
- Message d'erreur de connexion générique ("Identifiants incorrects"), qui ne révèle pas si le pseudo existe.
- Session : on ne stocke que l'identifiant de l'utilisateur connecté dans sessionStorage, jamais le mot de passe.
- Tout lien externe éventuel avec rel="noopener noreferrer".
- Chemins relatifs partout (le site sera publié sur GitHub Pages, dans un sous-dossier).

=== LOGO ===
Le dossier loby-brand/ contient le kit logo (lis loby-brand/README.md). Intègre-le :
- déplace loby-brand/logo/ vers assets/logo/ et loby-brand/favicon/ vers assets/favicon/ ;
- déplace loby-brand/README.md vers assets/README-logo.md ;
- supprime le reste de loby-brand/ ;
- reprends les balises de loby-brand/exemple-head.html en chemins RELATIFS, et corrige les chemins des icônes dans assets/favicon/site.webmanifest pour qu'ils soient relatifs aussi.
Couleurs du site : principale #2F54EB, accent #FF7A45, texte #0F172A. Police système (pas de Google Fonts, pour respecter la CSP).

=== POUR CETTE ÉTAPE ===
NE CODE PAS ENCORE LES FONCTIONNALITÉS. Fais uniquement :
1. Propose l'arborescence complète, avec le rôle de chaque fichier en une phrase. La plus simple possible.
2. Crée CLAUDE.md : résumé du projet, contraintes du prof, règles de simplicité, règles de documentation et règles de sécurité ci-dessus, pour que tu les respectes à chaque prompt suivant.
3. Crée cadrage.md avec ces 6 sections :
   1) Objectif de l'application
   2) Utilisateurs et rôles
   3) Les 3 fonctionnalités du MVP
   4) Ce qu'on ne fait pas aujourd'hui et pourquoi : pas de backend, donc la sécurité côté navigateur a des limites (explique-les honnêtement, et ce qu'il faudrait en production) ; pas d'images ; pas d'abonnements ; pas de messages privés
   5) Langages et technologies, et pourquoi ces choix
   6) Répartition du travail : Membre 1 = comptes et hachage des mots de passe ; Membre 2 = posts et contrôle d'autorisation ; Membre 3 = fil d'actualité, likes, interface et anti-XSS ; Membre 4 = CSP, validation globale, README et cadrage. Laisse "Membre 1" à "Membre 4", on mettra les prénoms nous-mêmes.
4. Crée un README.md de base (présentation, comment lancer le site en local avec "python3 -m http.server 8000", structure du projet), qu'on complétera à la fin.
5. Crée un .gitignore adapté (.DS_Store, dossiers d'éditeur).
6. Crée les 2 pages HTML avec un <head> complet (CSP, referrer, favicon, titre) et un <body> minimal, pour qu'on voie la base de sécurité.

Ne fais pas de commit. Explique-moi ton plan avant d'exécuter.
```
