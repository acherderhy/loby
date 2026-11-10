# Étape 4 : durcissement après audit et documentation finale

Modèle utilisé : Opus 5.5, en mode Plan, après `/clear`.
Contexte : la commande `/security-review` n'a trouvé aucune faille haute ou moyenne ; elle a écarté 8 pistes, dont 3 sont corrigées ici.

```
Étape 4 : durcissement suite à l'audit, puis documentation finale.

Relis CLAUDE.md et respecte toutes ses règles.

A) Durcissement (suite à /security-review)
1. hachage.js : passe NOMBRE_ITERATIONS de 100 000 à 600 000 (recommandation OWASP pour PBKDF2-SHA256). Commentaire SÉCURITÉ : plus d'itérations = chaque essai coûte plus cher à un attaquant. Les comptes de test créés avant ce changement ne fonctionneront plus : dis-le dans ton résumé. Mets à jour CLAUDE.md et cadrage.md (100 000 -> 600 000).
2. comptes.js : remplace la comparaison des hachages par une fonction simple comparerEnTempsConstant(a, b) : une boucle for qui parcourt TOUTES les positions et accumule les différences avec XOR (charCodeAt), sans s'arrêter à la première différence. Commentaire SÉCURITÉ qui explique en termes simples pourquoi (un === peut s'arrêter plus tôt et la durée trahit des informations).
3. stockage.js : si les données lues ne sont pas une liste alors qu'on attend une liste (utilisateurs, posts), renvoyer la valeur par défaut. Commentaire SÉCURITÉ : le localStorage peut contenir du JSON valide mais de la mauvaise forme.
Teste dans Chrome : inscription + connexion (mesure le temps de hachage, il doit rester sous une seconde), mauvais mot de passe, localStorage modifié à la main avec {"a":1} à la place d'une liste (pas de plantage). Vérifie que la console n'a aucune erreur.

B) SECURITE.md à la racine (en français, lisible par un prof)
- Introduction : 3 lignes sur l'approche (sécurité côté navigateur, sans backend).
- Tableau des protections : Protection | Attaque bloquée | Fichier | Fonction | Membre responsable. Toutes les protections réelles du code, vérifiées en lisant les fichiers (pas de la mémoire).
- Section "Audit de sécurité" : on a lancé /security-review (outil d'audit IA de Claude Code) sur le code. Résultat : aucune faille exploitable de gravité haute ou moyenne. 8 pistes écartées, chacune avec sa raison :
  1. PBKDF2 à 100 000 itérations (corrigé -> 600 000)
  2. comparaison des hachages avec === (corrigée -> temps constant)
  3. JSON valide mais de mauvaise forme dans le localStorage (corrigé dans stockage.js)
  4. blocage des tentatives contournable via les outils du navigateur
  5. session falsifiable via sessionStorage
  6. hachages et sels lisibles dans localStorage
  7. clickjacking impossible à bloquer avec une CSP en <meta>
  8. localStorage partagé entre tous les dépôts d'un même compte github.io
  Bilan : 3 corrigées, 5 limites assumées d'un site sans serveur.
- Section "Limites et ce qu'il faudrait en production" : reprends cadrage.md section 4 en résumé, avec un lien vers cadrage.md.
- Section "Comment nous avons utilisé l'IA" : Claude Code pour écrire le code, un fichier CLAUDE.md qui impose les règles de sécurité à chaque étape, les prompts conservés dans le dossier prompts/, un audit automatique, puis relecture et tri humains.

C) README.md final
Complète-le : présentation, fonctionnalités, comment lancer en local, structure du projet, équipe (Membre 1 à Membre 4 avec leurs fichiers, on mettra les prénoms nous-mêmes), liens vers cadrage.md, SECURITE.md et le dossier prompts/. Mets l'adresse GitHub Pages prévue : https://acherderhy.github.io/loby/ avec la mention "(activation prévue)". Pas de capture d'écran.
Crée aussi prompts/README.md : court fichier qui explique que le dossier conserve les prompts donnés à Claude Code à chaque étape (1 : cadrage, 2 : fonctionnalités, 3 : photos et confirmation, 3b : ordre photo/texte, 4 : durcissement et documentation).

D) Vérifications puis commit
- grep d'innerHTML, onclick, style=, eval : rien hors commentaires.
- Aucune donnée personnelle dans les fichiers (emails, noms réels).
- Commit : "Étape 4 : durcissement PBKDF2 600 000 et comparaison en temps constant, SECURITE.md, README final". Ne pousse pas.
Résumé final court.
```
