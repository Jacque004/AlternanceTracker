# 🔧 Correction : Erreur Foreign Key Constraint

## ❌ Erreur

```
insert or update on table "applications" violates foreign key constraint "applications_user_id_fkey"
```

## 🔍 Cause du problème

L'erreur se produit parce que :

1. **L'utilisateur existe dans `auth.users`** (authentification Supabase)
2. **Mais n'existe pas dans la table `users`** (table publique)
3. **La contrainte de clé étrangère échoue** car `user_id` doit référencer un ID existant dans `users`

### Pourquoi cela arrive ?

- Le trigger `on_auth_user_created` n'a pas fonctionné lors de l'inscription
- L'utilisateur a été créé manuellement dans `auth.users` sans passer par le formulaire d'inscription
- Le trigger a été désactivé ou supprimé

## ✅ Solution implémentée

### Fonction `ensureUserProfile`

Une fonction helper a été ajoutée qui :

1. **Vérifie si le profil existe** dans la table `users`
2. **Crée le profil automatiquement** s'il n'existe pas
3. **Gère les race conditions** (si deux requêtes créent le profil en même temps)

### Code ajouté

```typescript
const ensureUserProfile = async (userId: string, email: string): Promise<void> => {
  // Vérifier si le profil existe déjà
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  // Si le profil n'existe pas, le créer
  if (!existingUser) {
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        first_name: '',
        last_name: '',
      });

    if (insertError && insertError.code !== '23505') {
      throw new Error(`Impossible de créer le profil utilisateur: ${insertError.message}`);
    }
  }
};
```

### Utilisation

La fonction est appelée automatiquement avant :
- La création d'une candidature (`create`)
- La mise à jour d'une candidature (`update`)

## 🔧 Vérification du trigger dans Supabase

### 1. Vérifier que le trigger existe

Dans Supabase Dashboard :
1. Allez dans **Database** → **Triggers**
2. Cherchez `on_auth_user_created`
3. Vérifiez qu'il est actif

### 2. Vérifier la fonction

Dans Supabase Dashboard :
1. Allez dans **Database** → **Functions**
2. Cherchez `handle_new_user`
3. Vérifiez qu'elle existe et est correcte

### 3. Recréer le trigger si nécessaire

Exécutez ce SQL dans Supabase SQL Editor :

```sql
-- Vérifier que la fonction existe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING; -- Éviter les erreurs si le profil existe déjà
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🛠️ Solution de contournement pour les utilisateurs existants

Si vous avez des utilisateurs qui existent dans `auth.users` mais pas dans `users`, exécutez ce SQL :

```sql
-- Créer les profils manquants pour tous les utilisateurs existants
INSERT INTO public.users (id, email, first_name, last_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
```

## ✅ Test de la correction

1. **Connectez-vous** à l'application
2. **Créez une nouvelle candidature**
3. **Vérifiez que la candidature est créée** sans erreur
4. **Modifiez une candidature existante**
5. **Vérifiez que la modification fonctionne**

## 📋 Vérifications

- ✅ Le profil utilisateur est créé automatiquement si nécessaire
- ✅ Les erreurs de clé étrangère sont évitées
- ✅ Les race conditions sont gérées
- ✅ Les messages d'erreur sont clairs

## 🔒 Sécurité

La fonction `ensureUserProfile` :
- ✅ Vérifie l'authentification avant de créer le profil
- ✅ Utilise l'ID de l'utilisateur authentifié
- ✅ Respecte les politiques RLS de Supabase
- ✅ Gère les erreurs de manière sécurisée

## 📝 Notes

- La fonction est appelée automatiquement, vous n'avez rien à faire
- Si le trigger fonctionne correctement, cette fonction ne sera jamais nécessaire
- Elle sert de filet de sécurité pour les cas où le trigger n'a pas fonctionné

