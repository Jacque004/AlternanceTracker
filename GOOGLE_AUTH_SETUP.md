# Connexion Google (OAuth via Supabase)

AlternanceTracker utilise **Supabase Auth** pour la connexion Google. Le code frontend est prêt ; il reste à configurer Google Cloud et le tableau de bord Supabase.

## 1. Google Cloud Console

1. Ouvrez [Google Cloud Console](https://console.cloud.google.com/).
2. Créez ou sélectionnez un projet.
3. Allez dans **APIs & Services → Credentials**.
4. **Create credentials → OAuth client ID**.
5. Type d’application : **Web application**.
6. **Authorized JavaScript origins** (exemples) :
   - `http://localhost:5173` (dev Vite)
   - `https://jacque004.github.io` (prod GitHub Pages)
7. **Authorized redirect URIs** — URL de callback Supabase (obligatoire) :
   ```
   https://xvshjwddgchkbcoocenj.supabase.co/auth/v1/callback
   ```
   Remplacez par l’URL de **votre** projet : `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
8. Copiez le **Client ID** et le **Client secret**.

## 2. Supabase Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → votre projet.
2. **Authentication → Providers → Google** : activer Google.
3. Collez le **Client ID** et le **Client secret** Google.
4. **Authentication → URL Configuration** :
   - **Site URL** : URL publique de l’app (ex. `https://jacque004.github.io/AlternanceTracker`)
   - **Redirect URLs** : ajoutez les URLs autorisées après connexion :
     - `http://localhost:5173/AlternanceTracker/` (dev, selon votre `base` Vite)
     - `https://jacque004.github.io/AlternanceTracker/`
     - Toute URL utilisée par `VITE_APP_URL` dans `frontend/.env`

## 3. Variables d’environnement frontend

Dans `frontend/.env` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
VITE_APP_URL=https://jacque004.github.io/AlternanceTracker
```

En local, vous pouvez commenter `VITE_APP_URL` pour que la redirection OAuth utilise `http://localhost:5173/...`.

## 4. Migration base de données

Appliquez la migration qui enrichit les profils OAuth (noms Google, avatar) :

```bash
supabase db push
```

Ou exécutez manuellement `supabase/migrations/024_oauth_google_user_profile.sql` dans l’éditeur SQL Supabase.

## 5. Test

1. `npm run dev` dans `frontend/`.
2. Ouvrez `/login` ou `/register`.
3. Cliquez sur **Continuer avec Google**.
4. Après redirection, vous devez être connecté et redirigé vers l’accueil.

## Comportement

| Page | Google |
|------|--------|
| Login | Connexion directe |
| Register | Consentements RGPD requis avant redirection Google ; enregistrés après retour OAuth |

Les comptes Google créent automatiquement une ligne dans `public.users` (trigger + `ensure_user_profile`), avec prénom/nom dérivés du profil Google.

## Dépannage

- **`redirect_uri_mismatch`** : vérifiez l’URI de callback Supabase dans Google Cloud.
- **Redirection vers la mauvaise URL** : alignez `VITE_APP_URL`, Site URL et Redirect URLs Supabase.
- **Profil sans nom** : appliquez la migration `024_oauth_google_user_profile.sql`.
