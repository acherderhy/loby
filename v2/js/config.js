/*
  Fichier : v2/js/config.js
  Rôle    : adresse du projet Supabase et clé publique (« anon » / « publishable ») utilisées par la version 2.
  Membre  : commun (écrit ensemble par les 4 membres)
*/

// Adresse du projet Supabase (elle n'est pas secrète : elle apparaît dans chaque requête).
const SUPABASE_URL = "https://tcskegpdoldosfefhmvy.supabase.co";

// SÉCURITÉ : la clé anon (« publishable », commence par sb_publishable_) est PUBLIQUE par conception :
// n'importe qui peut la lire dans le code du site. Elle dit seulement « cette requête vient de Loby ».
// La vraie protection, ce sont les règles RLS de la base (v2/supabase.sql) : sans jeton de connexion,
// elle ne donne accès à rien. Ne JAMAIS mettre ici la clé service_role / secret, qui ignore toutes les règles.
const SUPABASE_ANON_KEY = "sb_publishable_gwhGqbjAGZjasxnxmCLG0A_7H2gGVNK";
