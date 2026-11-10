# Étape 3b : photo puis description (style Instagram)

Modèle utilisé : Sonnet 5.5, sans mode Plan (simple déplacement d'éléments).

```
Petite modification de l'ordre photo / texte, style Instagram :
1. Formulaire de publication (fil.html) : mets d'abord le champ Photo et son aperçu, puis en dessous le champ texte, renommé "Description" quand une photo est choisie (garde "Quoi de neuf ?" sinon).
2. Affichage d'un post (fil.js) : la photo d'abord, puis le texte en dessous.
3. Règle : un post doit avoir une photo OU un texte (ou les deux). Le texte devient donc facultatif s'il y a une photo. Retire required du textarea et fais la vérification en JS (validation.js + posts.js), avec un commentaire SÉCURITÉ : un post vide doit toujours être refusé, même via la console.
4. Mets à jour cadrage.md et CLAUDE.md en une ligne chacun.
Teste dans Chrome : post photo seule, texte seul, photo + description, post vide (refusé). Aucune erreur CSP. Puis fais le commit "Étape 3b : photo puis description, texte facultatif avec photo". Ne pousse pas.
```
