# Configuration Supabase et mise en service

Les fonctions d’authentification, de suggestions et d’administration ont besoin
d’un projet Supabase configuré. Le dépôt contient le code client et le schéma SQL,
mais le schéma n’est pas appliqué au projet distant par cette branche.

## Authentification et suggestions

1. Créer les variables locales à partir de `.env.example` et ne jamais ajouter
   `.env.local`, `supabase.env` ni une clé de service au dépôt.
2. Activer le fournisseur Google dans **Supabase → Authentication → Providers**.
3. Ajouter l’URL locale de développement et l’URL GitHub Pages aux URL de
   redirection autorisées dans Supabase Auth et dans la configuration OAuth Google.
4. Examiner puis exécuter `src/lib/schema.sql` dans le SQL Editor Supabase. Le
   script retire l’ancienne règle qui permettait à tout visiteur d’insérer des
   cartes et ajoute des politiques RLS pour les suggestions et les permissions.
5. Après une première connexion Google du propriétaire, créer son rôle initial
   avec la requête commentée à la fin de `src/lib/schema.sql`, en remplaçant
   `ADRESSE_DU_PROPRIETAIRE` par l’adresse exacte du compte.

Les insertions de suggestions associent toujours la ligne à `auth.uid()`. La
lecture et la modération sont séparées par permission RLS. Les fonctions RPC de
gestion des rôles vérifient `can_manage_admins` côté base; aucun mot de passe
d’administrateur n’est stocké dans le client. Les nouveaux administrateurs
doivent déjà s’être connectés au moins une fois avec Google.

## Modèles et éditeur visuel

Le schéma prépare `card_templates` pour les modèles/couleurs et
`layout_versions` pour les brouillons et versions publiées. Modifier un brouillon
et publier une version sont deux permissions distinctes. L’éditeur visuel et son
flux d’aperçu/publication restent à construire dans l’interface; ces tables ne
les activent pas à elles seules.

## Contrôle avant publication

- Vérifier les règles RLS du projet Supabase et les URL OAuth autorisées.
- Se connecter avec un compte utilisateur et vérifier qu’il peut créer sa propre
  suggestion, mais pas lire celles des autres.
- Vérifier les rôles lecture seule, modération, gestion des rôles et publication.
- Confirmer l’application du schéma et le fonctionnement OAuth avant de présenter
  les suggestions comme persistées ou les permissions comme actives sur le site.
