# 🚀 Guide de démarrage rapide

## Problème : ERR_CONNECTION_REFUSED

Cette erreur signifie que le serveur n'est pas démarré. Voici comment le résoudre :

## Option 1 : Démarrage avec Docker (Recommandé)

```bash
# Depuis la racine du projet
docker-compose up -d

# Vérifier que les services sont démarrés
docker-compose ps

# Voir les logs
docker-compose logs -f
```

**URLs d'accès :**
- Frontend : http://localhost:3000
- Backend API : http://localhost:5000
- PostgreSQL : localhost:5432

## Option 2 : Démarrage manuel

### Étape 1 : Configurer le Backend

1. **Créer le fichier `.env` dans `backend/`** :

```bash
cd backend
```

Créez un fichier `.env` avec ce contenu :

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://alternancetracker:alternancetracker123@localhost:5432/alternancetracker
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

2. **Démarrer le serveur backend** :

```bash
# Installer les dépendances (si pas déjà fait)
npm install

# Démarrer en mode développement
npm run dev
```

Vous devriez voir :
```
✅ Connexion à PostgreSQL établie
🚀 Serveur démarré sur le port 5000
```

### Étape 2 : Configurer le Frontend

1. **Créer le fichier `.env` dans `frontend/`** :

```bash
cd ../frontend
```

Créez un fichier `.env` avec ce contenu :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
VITE_API_URL=http://localhost:5000/api
```

**Note :** Si vous utilisez Supabase, remplacez les valeurs par vos vraies clés Supabase.

2. **Démarrer le serveur frontend** :

```bash
# Installer les dépendances (si pas déjà fait)
npm install

# Démarrer en mode développement
npm run dev
```

Vous devriez voir :
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Option 3 : Utiliser uniquement Supabase (Frontend uniquement)

Si vous utilisez Supabase et n'avez pas besoin du backend Express :

1. **Configurer Supabase dans `frontend/.env`** :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

2. **Démarrer uniquement le frontend** :

```bash
cd frontend
npm install
npm run dev
```

## 🔍 Vérification

### Backend Express
- Ouvrez : http://localhost:5000/api/health
- Devrait afficher : `{"status":"OK","message":"AlternanceTracker API is running"}`

### Frontend React
- Ouvrez : http://localhost:3000 (ou le port affiché par Vite)
- Devrait afficher la page de login

## ❌ Résolution des problèmes

### Port déjà utilisé

Si le port 5000 est déjà utilisé :

```bash
# Windows PowerShell
netstat -ano | findstr :5000

# Tuer le processus
taskkill /PID <PID> /F
```

### Base de données non accessible

Si vous utilisez PostgreSQL local :

1. Vérifiez que PostgreSQL est démarré
2. Vérifiez la connexion dans `DATABASE_URL`
3. Créez la base de données si nécessaire :

```sql
CREATE DATABASE alternancetracker;
```

### Erreur de connexion Supabase

1. Vérifiez que vos clés Supabase sont correctes
2. Vérifiez que votre projet Supabase est actif
3. Vérifiez les variables d'environnement dans `frontend/.env`

## 📝 Commandes utiles

```bash
# Voir les processus Node.js en cours
Get-Process -Name node

# Arrêter tous les processus Node.js
Get-Process -Name node | Stop-Process

# Vérifier les ports utilisés
netstat -ano | findstr :5000
netstat -ano | findstr :3000
```

