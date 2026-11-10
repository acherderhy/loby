# Loby

<img src="assets/logo/loby-horizontal-bleu.svg" alt="Loby" height="64">

**Loby** est un mini réseau social type Twitter, réalisé en groupe de 4 dans le cadre d'un cours
mêlant développement, IA et cybersécurité. Il est écrit en HTML, CSS et JavaScript vanilla,
sans framework, sans librairie externe et sans CDN.

## Le site en ligne

- **Version 1 :** <https://acherderhy.github.io/loby/>
- **Version 2 (version finale) :** <https://acherderhy.github.io/loby/v2/>

La **v1** n'a pas de backend : tout est enregistré dans le navigateur, ce qui permet de maîtriser la sécurité côté navigateur.
L'audit a montré ses limites (chaque navigateur a ses propres comptes, tout est modifiable depuis le navigateur).
La **v2** ajoute un backend **Supabase**, autorisé par le prof : les données sont partagées entre tous les utilisateurs
et la sécurité est vérifiée par le serveur.

## Fonctionnalités

1. **Comptes**
   - Inscription (pseudo de 3 à 20 caractères : lettres, chiffres, `_` ; mot de passe de 8 à 64 caractères), connexion, déconnexion.
   - Photo de profil facultative (à l'inscription ou depuis la page **Profil**) ; sans photo, l'avatar affiche l'initiale du pseudo.
   - Page **Profil** : avatar, pseudo, nombre de posts et de likes reçus, mes posts, « Se déconnecter ».
2. **Posts**
   - Publier une photo, un texte (280 caractères maximum) ou les deux, depuis la page **Publier**.
   - Supprimer **uniquement ses propres** posts, après confirmation dans la carte (« Supprimer ce post ? » Oui / Annuler).
3. **Fil d'actualité**
   - Les posts de tous les comptes, **les plus récents en haut**.
   - Liker un post, ou retirer son like.

**Navigation :** menu **Fil / Profil** (dans l'en-tête sur ordinateur, en barre d'onglets en bas sous 720 px)
et bouton rond **« + »** (vers la page Publier) sur le fil et le profil.

## Sécurité en résumé

- Mots de passe jamais en clair : **PBKDF2-SHA256**, sel aléatoire par utilisateur, 600 000 itérations (v1) ; v2 : hachage géré par Supabase Auth.
- **Anti-XSS** : jamais d'`innerHTML`, DOM construit avec `createElement` et `textContent`.
- **Content-Security-Policy** sur chaque page, sans `'unsafe-inline'`, tout le JS dans des fichiers séparés, aucun style inline.
- **Validation des saisies** en HTML et re-vérifiée en JS (`js/validation.js`).
- **Photos** : taille, type et signature vérifiés, SVG refusé, redessin dans un `<canvas>` en JPEG (métadonnées EXIF supprimées).
- **Connexion** : message d'erreur générique, blocage de 30 secondes après 5 échecs (v1).
- **Autorisation** : on vérifie que l'utilisateur est l'auteur avant toute suppression ; en v2, c'est le serveur qui l'impose (règles RLS).

Détails, attaque bloquée par chaque protection et limites : [SECURITE.md](SECURITE.md).

## Lancer le site en local

Depuis la racine du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000/> (v1) ou <http://localhost:8000/v2/> (v2).
On évite `file://` : la Web Crypto API (`crypto.subtle`) n'est garantie que sur `https://` ou `localhost`.

## Structure du projet

```
loby/
├── index.html            Connexion / inscription (v1).
├── fil.html              Fil d'actualité (v1).
├── publier.html          Publication d'un post (v1).
├── profil.html           Profil (v1).
├── css/style.css         Feuille de style unique (v1 et v2).
├── js/                   JavaScript de la v1
│   ├── stockage.js       Lecture/écriture localStorage et session.
│   ├── hachage.js        Hachage PBKDF2 des mots de passe.
│   ├── validation.js     Vérification des saisies (aussi utilisé par la v2).
│   ├── comptes.js        Inscription, connexion, limitation des tentatives.
│   ├── images.js         Vérification et redessin des photos (aussi utilisé par la v2).
│   ├── posts.js          Publication et suppression des posts.
│   ├── cartes.js         Session, cartes de posts, likes, confirmation de suppression.
│   ├── fil.js            Page du fil.
│   ├── publier.js        Page Publier.
│   └── profil.js         Page Profil.
├── v2/                   Version finale, branchée sur Supabase
│   ├── index.html, fil.html, publier.html, profil.html
│   ├── js/
│   │   ├── config.js     Adresse Supabase et clé anon (publique).
│   │   ├── supabase.js   Session et appels fetch vers Supabase.
│   │   ├── comptes.js    Inscription / connexion.
│   │   ├── cartes.js     Session, cartes de posts, likes, suppression.
│   │   ├── fil.js        Page du fil.
│   │   ├── publier.js    Page Publier.
│   │   └── profil.js     Page Profil.
│   ├── supabase.sql      Tables, règles RLS, droits, trigger.
│   └── README.md         Explications de la v2.
├── assets/
│   ├── logo/             Logos SVG.
│   ├── favicon/          Favicons et site.webmanifest.
│   └── README-logo.md    Documentation du kit logo.
├── docs/                 Fiches d'oral (oral-membre-1.md à oral-membre-4.md) et demo.md.
├── prompts/              Prompts donnés à Claude Code (README.md, etape-1.md à etape-7.md).
├── cadrage.md            Document de cadrage.
├── SECURITE.md           Protections, audit de sécurité et limites.
├── CLAUDE.md             Règles du projet pour Claude Code.
└── README.md             Ce fichier.
```

La v2 réutilise `css/style.css`, `assets/`, `js/validation.js` et `js/images.js`. Détails : [v2/README.md](v2/README.md).

## Équipe

| Membre | Partie | Fichiers |
|---|---|---|
| **Liora** | Comptes, hachage des mots de passe, page Profil | `js/hachage.js`, `js/comptes.js`, `js/profil.js`, `profil.html` |
| **Nathan** | Posts, page Publier, autorisation, sécurité des photos | `js/posts.js`, `js/images.js`, `js/publier.js`, `publier.html` |
| **Acher** | Fil, likes, navigation, interface, anti-XSS | `js/cartes.js`, `js/fil.js`, `css/style.css`, `fil.html` |
| **Eden** | CSP, validation des saisies, documentation | `js/validation.js`, `index.html`, `README.md`, `cadrage.md`, `SECURITE.md` |

`js/stockage.js` est commun aux 4 membres.

## Utilisation de l'IA

Le projet a été construit principalement avec **Claude Code**. Le fichier [CLAUDE.md](CLAUDE.md) lui impose à chaque modification
les règles de simplicité, de documentation et de sécurité. Les prompts de chaque étape sont conservés dans [prompts/](prompts/).
Un audit automatique avec **`/security-review`** a été lancé sur le code terminé (voir [SECURITE.md](SECURITE.md)).

## Documents

- [cadrage.md](cadrage.md) : objectifs, rôles, limites, choix techniques, répartition du travail.
- [SECURITE.md](SECURITE.md) : protections, audit et limites.
- [docs/](docs/) : fiches d'oral et scénario de démo ([demo.md](docs/demo.md)).
- [prompts/](prompts/) : prompts donnés à Claude Code à chaque étape.
