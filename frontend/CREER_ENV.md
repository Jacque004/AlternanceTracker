# ⚠️ IMPORTANT : Créer le fichier .env

## Problème actuel

L'écran blanc est causé par l'absence du fichier `.env` contenant les clés Supabase.

## Solution

### 1. Créer le fichier .env

Dans le dossier `frontend/`, créez un fichier nommé exactement `.env` (avec le point au début).

### 2. Contenu du fichier

Copiez-collez exactement ceci dans le fichier `.env` :

```env
VITE_SUPABASE_URL=https://xvshjwddgchkbcoocenj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NRxzcHi0SUATNwK3aE-H1g_4DCcpyAO
```

### 3. Redémarrer le serveur

Après avoir créé le fichier `.env`, **redémarrez** le serveur de développement :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez :
npm run dev
```

## Vérification

Si tout est correct, vous devriez voir :
- Soit la page de connexion
- Soit un message d'erreur plus explicite si les tables Supabase ne sont pas créées

## Note Windows

Sur Windows, si vous ne pouvez pas créer un fichier commençant par un point :
1. Utilisez l'éditeur de texte de votre IDE
2. Ou créez le fichier via PowerShell :
   ```powershell
   cd frontend
   @"
   VITE_SUPABASE_URL=https://xvshjwddgchkbcoocenj.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_NRxzcHi0SUATNwK3aE-H1g_4DCcpyAO
   "@ | Out-File -FilePath .env -Encoding utf8
   ```

