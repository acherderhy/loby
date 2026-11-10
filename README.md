# Loby

<img src="assets/logo/loby-horizontal-bleu.svg" alt="Loby" height="64">

**Loby** est un mini réseau social type Twitter, réalisé en groupe de 4 dans le cadre d'un cours
mêlant développement, IA et cybersécurité. Il fonctionne **entièrement dans le navigateur** :
HTML, CSS et JavaScript vanilla, sans backend, sans framework et sans librairie externe.
Les données (photos comprises) sont enregistrées dans le `localStorage` du navigateur.

L'objectif du projet est d'appliquer les **bonnes pratiques de sécurité web** : hachage des mots de passe,
protection contre le XSS, Content-Security-Policy, validation des saisies, contrôle d'autorisation.

**Site en ligne :** <https://acherderhy.github.io/loby/> (activation prévue)

## Documents

- [cadrage.md](cadrage.md) : objectifs, rôles, limites, choix techniques et répartition du travail.
- [SECURITE.md](SECURITE.md) : toutes les protections, l'attaque bloquée par chacune, l'audit de sécurité et les limites.
- [prompts/](prompts/) : les prompts donnés à Claude Code à chaque étape du projet.

## Fonctionnalités

1. **Comptes**
   - Créer un compte avec un pseudo (3 à 20 caractères : lettres, chiffres, `_`) et un mot de passe (8 à 64 caractères).
   - Se connecter, se déconnecter.
   - Ajouter une photo de profil (facultative) à l'inscription, ou la changer depuis le fil en cliquant sur son avatar.
     Sans photo, l'avatar affiche l'initiale du pseudo.
2. **Posts**
   - Publier une photo, un texte (280 caractères maximum) ou les deux.
   - Supprimer **ses propres** posts, après confirmation dans la carte du post (« Supprimer ce post ? » Oui / Annuler).
3. **Fil d'actualité**
   - Voir les posts de tous les comptes, **les plus récents en haut**.
   - Liker un post, ou retirer son like.

> Comme il n'y a pas de serveur, « tous les comptes » signifie « tous les comptes créés dans ce navigateur ».

## Lancer le site en local

Depuis la racine du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000/> dans le navigateur.

> Pourquoi un petit serveur plutôt que double-cliquer sur `index.html` ?
> En `file://`, certains navigateurs bloquent des fonctions dont le site a besoin
> (la Web Crypto API `crypto.subtle` n'est garantie que sur `https://` ou `localhost`)
> et gèrent le `localStorage` de façon différente. `localhost` se comporte comme le vrai site en ligne.

## Structure du projet

```
loby/
├── index.html          Page de connexion / inscription.
├── fil.html            Page du fil d'actualité.
├── css/style.css       Feuille de style unique.
├── js/
│   ├── stockage.js     Lecture/écriture localStorage et session.
│   ├── hachage.js      Hachage PBKDF2 des mots de passe.
│   ├── validation.js   Vérification des saisies.
│   ├── comptes.js      Inscription, connexion, limitation des tentatives.
│   ├── images.js       Vérification et redessin des photos (profil, posts).
│   ├── posts.js        Publication et suppression des posts.
│   └── fil.js          Affichage du fil, likes, confirmation de suppression, photos, déconnexion.
├── assets/logo/        Logos SVG.
├── assets/favicon/     Favicons et site.webmanifest.
├── assets/README-logo.md   Documentation du kit logo.
├── prompts/            Prompts donnés à Claude Code à chaque étape.
├── cadrage.md          Document de cadrage.
├── SECURITE.md         Protections, audit de sécurité et limites.
├── CLAUDE.md           Règles du projet (simplicité, documentation, sécurité).
└── README.md           Ce fichier.
```

## Équipe

| Membre | Responsabilité | Fichiers |
|---|---|---|
| **Membre 1** | Comptes et hachage des mots de passe | `js/hachage.js`, `js/comptes.js` |
| **Membre 2** | Posts, contrôle d'autorisation et sécurité des photos | `js/posts.js`, `js/images.js` |
| **Membre 3** | Fil d'actualité, likes, interface et anti-XSS | `js/fil.js`, `css/style.css`, `fil.html` |
| **Membre 4** | CSP, validation des saisies, documentation | `js/validation.js`, `index.html`, `README.md`, `cadrage.md`, `SECURITE.md` |

Le fichier `js/stockage.js` est commun aux 4 membres.
