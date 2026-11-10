# Loby

![Logo Loby](assets/logo/loby-horizontal-bleu.svg)

**Loby** est un mini réseau social type Twitter, réalisé en groupe de 4 dans le cadre d'un cours
mêlant développement, IA et cybersécurité. Il fonctionne **entièrement dans le navigateur** :
HTML, CSS et JavaScript vanilla, sans backend, sans framework et sans librairie externe.
Les données sont enregistrées dans le `localStorage` du navigateur.

L'objectif du projet est d'appliquer les **bonnes pratiques de sécurité web** : hachage des mots de passe,
protection contre le XSS, Content-Security-Policy, validation des saisies, contrôle d'autorisation.

Le cadrage complet (objectifs, limites, choix techniques, répartition) est dans [cadrage.md](cadrage.md).

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
│   ├── posts.js        Publication et suppression des posts.
│   └── fil.js          Affichage du fil, likes, déconnexion.
├── assets/logo/        Logos SVG.
├── assets/favicon/     Favicons et site.webmanifest.
├── assets/README-logo.md   Documentation du kit logo.
├── cadrage.md          Document de cadrage.
├── CLAUDE.md           Règles du projet (simplicité, documentation, sécurité).
└── README.md           Ce fichier.
```

## À compléter à la fin du projet

- [ ] Fonctionnalités : comment s'inscrire, publier, liker, supprimer.
- [ ] Sécurité : liste des protections appliquées et de l'attaque bloquée par chacune.
- [ ] Limites connues (voir la section 4 de `cadrage.md`).
- [ ] Lien vers le site publié sur GitHub Pages.
- [ ] Équipe : Membre 1, Membre 2, Membre 3, Membre 4.
