# Loby — Version 2 (bonus) : données partagées avec Supabase

La version 1 (à la racine du dépôt) respecte la consigne « pas de backend » : chaque navigateur a ses propres
comptes et ses propres posts. Cette **version 2** branche la même interface sur **Supabase** (base PostgreSQL
hébergée) pour que **tous les utilisateurs partagent les mêmes posts, photos et likes**.

**En ligne :** <https://acherderhy.github.io/loby/v2/>

## Ce qui change par rapport à la v1

| | Version 1 | Version 2 |
|---|---|---|
| Données | `localStorage` du navigateur | Base Supabase commune |
| Mots de passe | Hachés par nous (PBKDF2) et stockés dans le navigateur | Envoyés en HTTPS, hachés et gardés par le serveur |
| Session | Identifiant dans le `sessionStorage` | Jeton signé par Supabase (`access_token`) + identifiant, dans le `sessionStorage` |
| Qui décide ? | Notre JavaScript (contournable avec F12) | Le serveur, avec les règles **RLS** |
| Code | `stockage.js`, `hachage.js`, `posts.js` | `js/config.js`, `js/supabase.js` (fetch uniquement, aucune librairie) |

Réutilisés sans copie : `../css/style.css`, `../assets/`, `../js/validation.js`, `../js/images.js`
(mêmes règles de saisie, mêmes contrôles et même redessin JPEG des photos).

## Pourquoi c'est plus sûr

- **Les contrôles sont faits par le serveur.** Les règles RLS (*Row Level Security*, voir [supabase.sql](supabase.sql))
  sont vérifiées par la base à chaque requête : seuls les connectés lisent, on publie et on like seulement en son nom,
  on ne supprime que ses propres posts, on ne modifie que l'avatar de son propre profil.
  Modifier le JavaScript dans son navigateur ne change rien : la base refuse.
- **Rien n'est ouvert par défaut.** Les droits sont donnés un par un (`grant`) ; un visiteur non connecté n'a aucun droit.
- **Les règles de saisie sont répétées dans la base** (contraintes `check`) : pseudo, 280 caractères, post vide,
  photo obligatoirement en JPEG data URL.
- **La clé anon est publique par conception** : elle identifie le projet, elle ne donne aucun droit à elle seule.
  La clé secrète (`service_role`) n'apparaît jamais dans le code.

Le détail est dans la section « Version 2 » de [SECURITE.md](../SECURITE.md).
