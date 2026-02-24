# 🔧 Solution : ERR_CONNECTION_REFUSED

## ✅ Problème résolu !

Le serveur frontend est maintenant en cours de démarrage.

## 🌐 Accéder à l'application

Une fois le serveur démarré, vous verrez dans le terminal quelque chose comme :

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Ouvrez votre navigateur à l'adresse affichée** (généralement `http://localhost:5173/`)

## 📋 Si le serveur ne démarre pas

### Option 1 : Démarrer manuellement

```bash
cd frontend
npm run dev
```

### Option 2 : Vérifier les dépendances

```bash
cd frontend
npm install
npm run dev
```

### Option 3 : Vérifier le port

Si le port est déjà utilisé, Vite utilisera automatiquement un autre port (5174, 5175, etc.)

## 🔍 Vérifications

1. **Le serveur est-il démarré ?**
   - Regardez le terminal où vous avez lancé `npm run dev`
   - Vous devriez voir "ready" et une URL

2. **Le bon port ?**
   - Vite utilise généralement le port 5173
   - Vérifiez l'URL affichée dans le terminal

3. **Variables d'environnement ?**
   - Vérifiez que `frontend/.env` existe
   - Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définis

## 🚨 Erreurs courantes

### "Cannot find module"
```bash
cd frontend
npm install
```

### "Port already in use"
- Fermez l'autre application qui utilise le port
- Ou laissez Vite utiliser un autre port automatiquement

### "Supabase configuration missing"
- Vérifiez que `frontend/.env` contient :
  ```env
  VITE_SUPABASE_URL=https://votre-projet.supabase.co
  VITE_SUPABASE_ANON_KEY=votre-cle-anon
  ```

## 📝 Commandes utiles

```bash
# Démarrer le serveur frontend
cd frontend
npm run dev

# Arrêter le serveur
Ctrl + C dans le terminal

# Vérifier les processus Node.js
Get-Process -Name node
```

## ✅ Une fois le serveur démarré

1. Ouvrez votre navigateur
2. Allez à l'URL affichée (ex: http://localhost:5173/)
3. Vous devriez voir la page de login

**Note :** Si vous utilisez Supabase, assurez-vous que votre projet Supabase est configuré et actif.

