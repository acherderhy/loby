# Kit logo Loby

Le logo de Loby : un **L** dans un carré arrondi, avec un **point de notification**.
Le carré, c'est l'appli. Le L, c'est Loby. Le point, c'est le signal « quelqu'un a posté ».

Tous les fichiers sont en **SVG** (vectoriel : nets à toutes les tailles, très légers),
sauf les icônes que les navigateurs et les téléphones veulent en PNG ou ICO.

## Contenu

```
assets/logo/
  loby-symbole-<couleur>.svg     → le carré seul (icône, avatar, petit espace)
  loby-horizontal-<couleur>.svg  → le carré + le nom "Loby" (en-tête du site, README, slides)
assets/favicon/
  favicon.svg            → l'icône de l'onglet (navigateurs récents)
  favicon.ico            → la même en 16, 32 et 48 px (anciens navigateurs)
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png   → l'icône quand on ajoute le site à l'écran d'accueil d'un iPhone
  icon-192.png, icon-512.png → icônes Android
  site.webmanifest       → la fiche d'identité du site (nom, icônes, couleur)
assets/README-logo.md    → ce fichier
```

Les balises qui chargent ces icônes sont déjà dans le `<head>` de `index.html` et `fil.html`,
avec des **chemins relatifs** (`assets/favicon/...`) pour fonctionner sur GitHub Pages dans un sous-dossier.
Dans `site.webmanifest`, les chemins des icônes sont relatifs au manifeste lui-même (`icon-192.png`).
Pour afficher le logo dans une page : `<img src="assets/logo/loby-horizontal-bleu.svg" alt="Loby" height="40">`.

## Les couleurs

| Variante | Carré | Point | À utiliser sur |
|---|---|---|---|
| **bleu** (principale) | `#2F54EB` | `#FF7A45` | fond clair |
| nuit | `#0F172A` | `#4C6FFF` | fond clair |
| violet | `#6D28D9` | `#FBBF24` | fond clair |
| emeraude | `#047857` | `#FDBA74` | fond clair |
| corail | `#E8492A` | `#0F172A` | fond clair |
| blanc | `#FFFFFF` | `#FF7A45` | fond sombre |
| mono-noir | `#0F172A` | blanc | impression une couleur |
| mono-blanc | `#FFFFFF` | `#0F172A` | fond sombre, une couleur |

Couleur du texte du site : `#0F172A` (bleu nuit presque noir).
Police du nom : **Space Grotesk Bold**. Dans les SVG, le nom est déjà converti en tracés :
pas besoin d'installer la police pour l'afficher.

## Pourquoi c'est aussi un choix de sécurité

- **Les SVG sont hébergés avec le site** (pas chargés depuis un autre site) : la règle de sécurité
  CSP peut rester stricte (`img-src 'self'`).
- **Aucun script, aucun lien externe dans les SVG** : un SVG peut contenir du JavaScript, donc on
  n'utilise que des formes simples, faciles à vérifier en lisant le fichier.
- On les affiche avec `<img src="...">`, jamais en collant le contenu dans la page avec `innerHTML`.
