# 🔧 Correction : Erreur RLS Policy pour table "users"

## ❌ Erreur

```
Impossible de créer le profil utilisateur: new row violates row-level security policy for table "users"
```

## 🔍 Cause du problème

La politique RLS (Row Level Security) empêche l'insertion directe dans la table `users` depuis le client, même si la condition `auth.uid() = id` devrait être satisfaite.

## ✅ Solution implémentée

### Fonction SQL avec SECURITY DEFINER

Une fonction SQL `ensure_user_profile()` a été créée qui :
- Utilise `SECURITY DEFINER` pour contourner RLS
- Vérifie l'authentification de l'utilisateur
- Crée le profil si nécessaire
- Gère les conflits (doublons)

### Code de la fonction

```sql
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Récupérer l'ID et l'email de l'utilisateur authentifié
  v_user_id := auth.uid();
  v_user_email := auth.email();
  
  -- Vérifier si l'utilisateur est authentifié
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Vérifier si le profil existe déjà
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    -- Créer le profil utilisateur
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
      v_user_id,
      v_user_email,
      COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = v_user_id), ''),
      COALESCE((SELECT raw_user_meta_data->>'last_name' FROM auth.users WHERE id = v_user_id), '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;
```

## 🛠️ Installation

### Étape 1 : Exécuter le script SQL

1. Allez dans votre **Supabase Dashboard**
2. Ouvrez **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu de `supabase/migrations/003_create_ensure_user_profile_function.sql`
5. Exécutez la requête

### Étape 2 : Vérifier les permissions

La fonction doit avoir les permissions d'exécution :
```sql
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO anon;
```

## 📝 Code modifié

### `frontend/src/services/supabaseService.ts`

**Avant :**
```typescript
const ensureUserProfile = async (userId: string, email: string) => {
  // Tentative d'insertion directe (bloquée par RLS)
  await supabase.from('users').insert({...});
}
```

**Après :**
```typescript
const ensureUserProfile = async (userId: string, email: string) => {
  // Appel de la fonction SQL qui contourne RLS
  await supabase.rpc('ensure_user_profile');
}
```

## ✅ Avantages de cette solution

1. **Contourne RLS** : La fonction utilise `SECURITY DEFINER` pour exécuter avec les privilèges du créateur
2. **Sécurisée** : Vérifie toujours que l'utilisateur est authentifié
3. **Automatique** : Récupère les métadonnées depuis `auth.users`
4. **Robuste** : Gère les conflits avec `ON CONFLICT DO NOTHING`

## 🔒 Sécurité

La fonction est sécurisée car :
- ✅ Vérifie que l'utilisateur est authentifié (`auth.uid()`)
- ✅ Utilise uniquement l'ID de l'utilisateur authentifié
- ✅ Ne peut créer que son propre profil
- ✅ Utilise `SECURITY DEFINER` de manière contrôlée

## 🧪 Test

1. **Exécutez le script SQL** dans Supabase
2. **Connectez-vous** à l'application
3. **Créez une nouvelle candidature**
4. **Vérifiez** que l'erreur RLS n'apparaît plus

## 📋 Vérification

Pour vérifier que la fonction existe :

```sql
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'ensure_user_profile';
```

Vous devriez voir :
- `routine_name`: `ensure_user_profile`
- `routine_type`: `FUNCTION`
- `security_type`: `DEFINER`

## 🔄 Alternative : Modifier la politique RLS

Si vous préférez modifier la politique RLS au lieu d'utiliser une fonction :

```sql
-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Créer une nouvelle politique plus permissive
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid() = id AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id
    )
  );
```

Cependant, la solution avec la fonction SQL est recommandée car elle est plus robuste et sécurisée.

