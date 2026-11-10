# Étape 2 : coder les 3 fonctionnalités

Modèle utilisé : Opus 5.5, en mode Plan, après `/clear` (Claude Code relit CLAUDE.md).

```
Étape 2 : coder les 3 fonctionnalités de Loby.

Relis CLAUDE.md et cadrage.md, et respecte TOUTES leurs règles (simplicité, documentation, sécurité). Crée les 6 fichiers JS prévus dans l'arborescence et branche-les dans les 2 pages HTML (balises <script src> en fin de <body>, dans l'ordre de chargement prévu).

Comportement attendu :
- index.html : deux formulaires, "Créer un compte" et "Se connecter". Après inscription ou connexion réussie, redirection vers fil.html. Messages d'erreur affichés dans la page (pas d'alert()).
- fil.html : si personne n'est connecté, redirection immédiate vers index.html. En haut : logo, pseudo de l'utilisateur connecté, bouton "Se déconnecter". Puis un formulaire pour publier (avec compteur de caractères restants sur 280), puis le fil : pour chaque post, le pseudo de l'auteur, la date lisible, le texte, un bouton like avec le nombre de likes (un seul like par utilisateur, re-cliquer retire le like), et un bouton "Supprimer" visible UNIQUEMENT sur ses propres posts (et revérifié dans le code au moment de la suppression).

Modèle de données (dans localStorage, en JSON) :
- utilisateurs : liste de { id, pseudo, sel, hachage, dateCreation }
- posts : liste de { id, auteurId, texte, date, likes: [id des utilisateurs qui ont liké] }
- tentatives de connexion : { nombreEchecs, bloqueJusqua }
Identifiants générés avec crypto.randomUUID().

Interface : propre et simple, responsive (lisible sur téléphone), aux couleurs du projet. Tout le style dans css/style.css (aucun style inline, CSP oblige). Masquer/afficher des éléments en ajoutant ou retirant une classe CSS, jamais via l'attribut style.

Quand c'est codé :
1. Lance python3 -m http.server 8000 et teste dans Chrome : inscription, connexion, mauvais mot de passe 5 fois (blocage), publication, like, suppression, déconnexion, accès direct à fil.html sans être connecté.
2. Teste l'anti-XSS : publie le post <img src=x onerror=alert(1)> et vérifie qu'il s'affiche comme du texte.
3. Vérifie la console : aucune erreur CSP.
4. Fais un grep pour t'assurer qu'il n'y a aucun innerHTML, onclick, style= ou eval dans le projet.
5. Donne-moi un résumé : ce que fait chaque fichier, et la liste de chaque protection de sécurité avec le fichier et la fonction où elle se trouve.

Ne fais pas de commit. Explique ton plan avant d'exécuter.
```

## Ajouts demandés après lecture du plan

```
Plan validé, avec 4 ajouts :
1. cadrage.md : mets aussi "8 à 64 caractères" pour le mot de passe, pour que les deux documents soient cohérents.
2. lireDonnee : entoure JSON.parse d'un try/catch qui renvoie la valeur par défaut. SÉCURITÉ : si quelqu'un modifie le localStorage à la main avec du JSON invalide, le site ne doit pas planter.
3. gererConnexion : si le pseudo n'existe pas, fais quand même un hachage (avec un sel bidon) avant de répondre "Identifiants incorrects". SÉCURITÉ : sinon la réponse est plus rapide pour un pseudo inconnu, et un attaquant pourrait deviner quels pseudos existent en mesurant le temps (attaque temporelle).
4. Désactive le bouton du formulaire pendant le hachage (disabled), puis réactive-le. Ça évite les doubles envois.
Ensuite exécute en auto mode.
```
