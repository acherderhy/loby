# Étape 3 : confirmation de suppression et photos

Modèle utilisé : Opus 5.5, en mode Plan, après `/clear`.

```
Étape 3 : confirmation de suppression + photos (profil et posts).

Relis CLAUDE.md et respecte toutes ses règles (simplicité, documentation, sécurité).

A) Confirmation de suppression
Au clic sur "Supprimer", ne supprime pas tout de suite : affiche dans la carte du post "Supprimer ce post ?" avec deux boutons "Oui" et "Annuler" (créés avec createElement, pas de confirm()). "Oui" appelle supprimerPost (le contrôle d'autorisation reste), "Annuler" remet le bouton normal. Corrige aussi le défaut repéré : le message d'erreur de suppression doit disparaître à la prochaine action.

B) Photos
1. Photo de profil (optionnelle) : un champ <input type="file"> dans le formulaire d'inscription, et un moyen de la changer depuis fil.html (clic sur son avatar en haut). Si pas de photo : avatar par défaut avec l'initiale du pseudo (en CSS, pas d'image). Avatar affiché en haut et à côté du pseudo dans chaque post.
2. Photo dans un post (optionnelle, une seule par post) : champ fichier dans le formulaire de publication, avec un aperçu avant publication et un bouton pour la retirer.

Nouveau fichier js/images.js (Membre 2), avec des fonctions simples et commentées :
- SÉCURITÉ : attribut accept="image/jpeg,image/png,image/webp" ET vérification en JS du type déclaré ET des premiers octets du fichier (signatures JPEG FF D8 FF, PNG 89 50 4E 47, WebP "RIFF....WEBP"). Refuser tout le reste, en particulier le SVG (il peut contenir du JavaScript).
- SÉCURITÉ : taille max 5 Mo avant traitement.
- SÉCURITÉ : redessiner l'image dans un <canvas> puis l'exporter en JPEG (qualité 0,7) : cela supprime les métadonnées EXIF (position GPS, modèle du téléphone) et tout contenu caché. Avatar redimensionné à 128x128 (carré recadré au centre), photo de post à 800 px de large max.
- Stockage : en data URL dans localStorage (champ avatar sur l'utilisateur, champ image sur le post). Gérer l'erreur QuotaExceededError avec un message clair ("Stockage plein : supprimez d'anciens posts").
- SÉCURITÉ : avant d'afficher une image venant du stockage, vérifier qu'elle commence par "data:image/jpeg;base64,". Sinon, ne pas l'afficher.
- Affichage : createElement("img"), img.src = ..., alt explicite, jamais innerHTML.

CSP : modifie img-src en "img-src 'self' data:" dans les 2 pages, avec un commentaire SÉCURITÉ qui explique pourquoi c'est nécessaire et pourquoi c'est sans danger (ne concerne pas les scripts).

Mises à jour : CLAUDE.md (7 fichiers JS désormais, règles images), cadrage.md (section 3 : photos incluses dans les fonctionnalités Comptes et Posts ; section 4 : retirer "pas d'images", ajouter la limite du localStorage à 5 Mo et pourquoi une vraie app stockerait les images sur un serveur ; section 6 : images.js pour le Membre 2), README.md (structure).

Tests dans Chrome : photo de profil à l'inscription et changement depuis le fil, post avec photo, aperçu et retrait, fichier .txt renommé en .jpg (refusé), SVG (refusé), fichier de plus de 5 Mo (refusé), confirmation de suppression (Oui et Annuler), aucune erreur CSP, version téléphone. Nettoie les données de test à la fin.

Résumé final : ce qui a changé par fichier + les nouvelles protections (protection, attaque bloquée, fichier, fonction). Ne fais pas de commit. Explique ton plan avant d'exécuter.
```
