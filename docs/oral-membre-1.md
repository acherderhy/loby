# Fiche d'oral — Liora : comptes et hachage des mots de passe

Fichiers : `js/hachage.js`, `js/comptes.js` (et la partie formulaires de `index.html`), `js/profil.js` et `profil.html` (page Profil : photo, chiffres, mes posts, déconnexion).

## Ma partie en une phrase

Je gère l'inscription, la connexion et la déconnexion, en faisant en sorte qu'aucun mot de passe ne soit jamais
stocké en clair et qu'un attaquant ne puisse ni deviner les comptes existants, ni essayer des mots de passe à la chaîne.

## Ce que je dis

1. Quand quelqu'un crée un compte, je ne garde jamais son mot de passe : je garde seulement une empreinte, calculée avec PBKDF2.
2. PBKDF2 répète le calcul 600 000 fois, ce qui est la recommandation de l'OWASP : pour l'utilisateur ça prend une fraction de seconde, mais pour un attaquant qui teste des millions de mots de passe, ça devient très lent.
3. Chaque utilisateur a son propre sel, 16 octets aléatoires : deux personnes avec le même mot de passe ont donc des empreintes différentes.
4. À la connexion, je recalcule l'empreinte et je la compare en temps constant, c'est-à-dire que la comparaison prend toujours le même temps, qu'elle réussisse ou non.
5. Le message d'erreur est toujours « Identifiants incorrects », que le pseudo existe ou non, pour qu'on ne puisse pas deviner quels comptes existent.
6. Après 5 échecs, la connexion est bloquée pendant 30 secondes, ce qui ralentit une attaque par force brute.
7. Enfin, dans la session, je ne garde que l'identifiant de l'utilisateur, jamais le mot de passe ni le hash.

## Le code à montrer

### 1. `js/hachage.js` — `genererSel` (l. 20-27) et `hacherMotDePasse` (l. 65-74)

```js
const sel = new Uint8Array(16);
crypto.getRandomValues(sel);
// ...
const parametres = { name: "PBKDF2", salt: sel, iterations: NOMBRE_ITERATIONS, hash: "SHA-256" };
const empreinte = await crypto.subtle.deriveBits(parametres, cle, 256);
```

À dire : « Le sel vient de `crypto.getRandomValues`, un vrai aléatoire cryptographique, pas `Math.random`.
Ensuite j'utilise la Web Crypto API du navigateur, sans librairie : PBKDF2 avec SHA-256 et 600 000 itérations
(la constante `NOMBRE_ITERATIONS`, ligne 14). Le `await` attend la fin du calcul, que le navigateur fait sans bloquer la page. »

### 2. `js/comptes.js` — `comparerEnTempsConstant` (l. 176-191)

```js
let differences = 0;
for (let i = 0; i < a.length; i++) {
  differences = differences | (a.charCodeAt(i) ^ b.charCodeAt(i));
}
return differences === 0;
```

À dire : « Un `===` s'arrête au premier caractère différent, donc il répond un peu plus vite quand le début est faux.
Ici je parcours toujours les 64 caractères : le XOR donne 0 si deux caractères sont identiques, et le OU garde
la trace de la moindre différence. La durée ne révèle donc rien. »

### 3. `js/comptes.js` — `enregistrerEchec` (l. 150-160), avec `MESSAGE_ECHEC` (l. 14)

```js
const tentatives = lireTentatives();
tentatives.nombreEchecs = tentatives.nombreEchecs + 1;
if (tentatives.nombreEchecs >= MAX_ECHECS) {
  tentatives.bloqueJusqua = Date.now() + DUREE_BLOCAGE_MS;
  tentatives.nombreEchecs = 0;
}
```

À dire : « À chaque échec j'ajoute 1 au compteur ; au 5e, je note l'heure de fin du blocage, 30 secondes plus tard.
Le message d'échec est une seule constante, `MESSAGE_ECHEC` : impossible de distinguer un pseudo inconnu d'un mauvais mot de passe.
Et quand le pseudo n'existe pas, je calcule quand même un hash pour rien (l. 216-222), pour que la réponse prenne le même temps. »

## La démo à faire

Préparation : site lancé avec `python3 -m http.server 8000`, Chrome ouvert sur <http://localhost:8000/>, outils de développement ouverts (F12).

1. **Inscription** : dans « Créer un compte », taper le pseudo `demo_a` et le mot de passe `demo-mdp-2026`, cliquer « Créer mon compte » → on arrive sur le fil.
2. **Mot de passe haché** : F12 → onglet **Application** → **Local storage** → `http://localhost:8000` → clé `loby_utilisateurs`.
   Montrer les champs `sel` et `hachage` (64 caractères hexadécimaux) : il n'y a **aucun champ mot de passe**.
3. **Session** : même onglet → **Session storage** → clé `loby_session` : il n'y a qu'un identifiant.
4. **Message générique** : onglet **Profil** (menu), puis « Se déconnecter ». Dans « Se connecter », taper `demo_a` / `mauvais-mdp` → « Identifiants incorrects ».
   Puis taper `pseudo_inconnu` / `mauvais-mdp` → **exactement le même message**.
5. **Blocage** : refaire 3 essais ratés (5 au total) → « Trop de tentatives. Réessayez dans 30 secondes. ».
   Taper ensuite le bon mot de passe : la connexion reste refusée tant que les 30 secondes ne sont pas passées.
6. *(Si le temps le permet)* Créer un second compte `demo_b` avec **le même mot de passe** : dans `loby_utilisateurs`,
   son `hachage` est différent de celui de `demo_a`, grâce au sel.

## Questions probables du prof

**1. Pourquoi PBKDF2 et pas un simple SHA-256 ?**
SHA-256 est conçu pour être rapide : une carte graphique en calcule des milliards par seconde. PBKDF2 répète le calcul
600 000 fois, donc chaque essai d'un attaquant coûte 600 000 fois plus cher.

**2. Le sel est stocké en clair à côté du hash : à quoi sert-il alors ?**
Il n'a pas besoin d'être secret. Il rend chaque hash unique : un attaquant ne peut pas utiliser de tables précalculées
(rainbow tables), et il doit attaquer chaque compte séparément.

**3. Pourquoi comparer en temps constant, alors que le hash est lisible dans le localStorage ?**
Ici le risque est faible, c'est vrai. Mais c'est la bonne pratique dès qu'on compare un secret, elle sera indispensable
le jour où la vérification se fera sur un serveur, et la correction ne coûte qu'une petite boucle.

**4. Le blocage de 30 secondes est-il vraiment efficace ?**
Il ralentit une attaque depuis l'interface, mais il est contournable : le compteur est dans le localStorage, il suffit de le vider.
Un vrai blocage doit être fait côté serveur, par compte et par adresse IP.

## En mes mots

Moi, je m'occupe des comptes : l'inscription, la connexion et la déconnexion. Le plus important, c'est que les mots de passe ne sont jamais enregistrés en clair. On les transforme avec un hachage (PBKDF2, 600 000 fois) et un "sel" différent pour chaque personne : même si quelqu'un lit les données, il ne retrouve pas le mot de passe, et deux personnes avec le même mot de passe n'ont pas le même résultat.

J'ai aussi bloqué la connexion pendant 30 secondes après 5 erreurs, pour empêcher quelqu'un d'essayer des milliers de mots de passe. Et le message d'erreur est toujours le même, "Identifiants incorrects" : comme ça, on ne peut pas deviner quels pseudos existent.