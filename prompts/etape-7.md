# Étape 7 : menu de navigation (Fil, Profil) et bouton + pour publier

Modèle utilisé : Opus 5.5, en mode Plan, après `/clear`.

```
Étape 7 : ajouter une vraie navigation d'application à Loby, en v1 ET en v2.

Relis CLAUDE.md et respecte toutes ses règles (simplicité, documentation, sécurité). Le design actuel (css/style.css) a été validé : garde exactement le même style visuel et étends-le.

CE QU'ON VEUT
1. Un menu avec deux onglets : "Fil" et "Profil".
   - Sur ordinateur : dans l'en-tête, à côté du logo.
   - Sur téléphone (moins de 720 px) : une barre d'onglets fixée en bas de l'écran, façon Instagram, avec une icône au-dessus de chaque libellé (icônes en SVG inline dans le HTML, aria-hidden="true", avec le libellé en texte). Prévoir padding-bottom: env(safe-area-inset-bottom) pour l'iPhone, et assez de marge en bas du contenu pour que rien ne soit caché derrière la barre.
   - L'onglet de la page courante est mis en avant, avec aria-current="page" écrit directement dans le HTML de chaque page (pas besoin de JS pour ça).
   - Balise <nav aria-label="Navigation principale">.
2. Un bouton rond "+" flottant, toujours visible en bas à droite (au-dessus de la barre d'onglets sur téléphone), sur les pages Fil et Profil. C'est un lien <a href="publier.html" class="bouton-flottant" aria-label="Publier un post">. Il n'apparaît pas sur la page Publier elle-même. Couleur principale, ombre, effet au survol et focus visible.
3. Trois pages pour un utilisateur connecté :
   - fil.html : uniquement le fil d'actualité (le formulaire de publication en est retiré).
   - publier.html (nouvelle) : le formulaire de publication actuel (photo puis description, aperçu, compteur, mêmes contrôles). Après une publication réussie, redirection vers fil.html. Un lien "Annuler" qui ramène au fil.
   - profil.html (nouvelle) : grand avatar avec le bouton pour changer sa photo (la fonction existe déjà dans fil.js : déplace-la ici), le pseudo, deux chiffres (nombre de mes posts, nombre total de likes reçus), puis la liste de MES posts uniquement (avec like et suppression avec confirmation, comme dans le fil), et le bouton "Se déconnecter".
   - Dans l'en-tête, l'avatar devient un lien vers profil.html.
4. Chaque nouvelle page : même <head> que les autres (CSP stricte, referrer, favicons), redirection vers index.html si personne n'est connecté, aucun script ni style inline, affichage uniquement avec createElement + textContent.

ORGANISATION DU CODE
- Pas de duplication : si le code qui construit une carte de post doit servir au fil ET au profil, sors-le dans un fichier commun (par exemple js/cartes.js) au lieu de le copier. Chaque fichier garde son en-tête "Ce fichier sert à..." avec le membre responsable : fil et cartes pour le Membre 3, publier pour le Membre 2, profil pour le Membre 1.
- Mets à jour la limite du nombre de fichiers dans CLAUDE.md si besoin.
- Fais exactement la même chose en v2 (v2/fil.html, v2/publier.html, v2/profil.html et leurs JS), avec les fonctions Supabase existantes de v2/js/supabase.js. Pour le profil v2 : lire ses posts avec un filtre auteur_id=eq.<mon id> (et encodeURIComponent).
- La logique de sécurité ne change pas : supprimerPost revérifie l'auteur en v1, la base (RLS) le fait en v2.

DOCUMENTS À METTRE À JOUR À LA FIN (en relisant le vrai code)
- docs/oral-membre-1.md à 4 et docs/demo.md : les noms de fichiers, de fonctions et les numéros de lignes cités ont bougé, corrige-les tous. Adapte les étapes de démo (publier passe maintenant par le bouton +, le changement d'avatar par le profil). NE TOUCHE PAS aux sections "En mes mots".
- SECURITE.md : le tableau Fichier / Fonction doit correspondre au nouveau code.
- cadrage.md : la page Profil fait partie de la fonctionnalité Comptes, la page Publier de la fonctionnalité Posts. On reste à 3 fonctionnalités.
- README.md et CLAUDE.md : arborescence.

TESTS (Chrome, python3 -m http.server 8001)
- v1, sur ordinateur et à 375 px, en clair et en sombre : navigation Fil <-> Profil, bouton + vers Publier, publication avec et sans photo puis retour au fil, profil (avatar, chiffres, mes posts seulement, suppression avec confirmation, déconnexion), accès direct aux 3 pages sans être connecté (redirection), navigation au clavier (Tab), aucune erreur CSP.
- v2 : pour la partie connectée, arrête-toi et demande-moi de me connecter moi-même dans l'onglet (tu ne dois pas taper de mot de passe envoyé à Supabase). Vérifie au minimum la redirection sans connexion et l'absence d'erreur CSP.
- Montre-moi des captures avant/après (fil, publier, profil ; ordinateur et 375 px).

Ne fais pas de commit tant que je n'ai pas validé le rendu. Explique ton plan avant d'exécuter.
```
