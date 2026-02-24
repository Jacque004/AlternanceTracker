# 🔧 Correction de l'erreur RLS

## Erreur
```
Error: new row violates row-level security policy for table "users"
```

## Solution

Cette erreur se produit car les politiques RLS empêchent l'insertion dans la table `users`. 

### Option 1 : Exécuter le script de correction (Recommandé)

1. Allez dans votre dashboard Supabase : https://supabase.com/dashboard/project/xvshjwddgchkbcoocenj
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase/migrations/002_fix_rls_policies.sql`
5. Exécutez la requête

Ce script va :
- ✅ Ajouter une politique RLS pour permettre l'insertion de profil
- ✅ Créer un trigger qui crée automatiquement le profil utilisateur lors de l'inscription
- ✅ Éviter les doublons avec `ON CONFLICT DO NOTHING`

### Option 2 : Mettre à jour le script initial

Si vous préférez, vous pouvez réexécuter le script `001_initial_schema.sql` mis à jour qui contient maintenant :
- La politique d'insertion
- Le trigger automatique

## Comment ça fonctionne maintenant

1. L'utilisateur s'inscrit via `supabase.auth.signUp()`
2. Supabase crée l'utilisateur dans `auth.users`
3. Le trigger `on_auth_user_created` se déclenche automatiquement
4. Le profil est créé dans la table `users` avec les métadonnées (first_name, last_name)

**Plus besoin d'insérer manuellement le profil !** Le trigger s'en charge automatiquement.

## Vérification

Après avoir exécuté le script :
1. Essayez de créer un nouveau compte
2. L'inscription devrait fonctionner sans erreur RLS
3. Le profil utilisateur sera créé automatiquement

