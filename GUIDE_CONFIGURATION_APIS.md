# 🔑 Guide Configuration - Supabase & OpenAI

**Date :** 30 août 2026  
**Temps estimé :** 10 minutes  
**Difficulté :** Facile ⭐

---

## 📋 CHECKLIST

- [ ] Compte Supabase créé
- [ ] Clés Supabase récupérées (URL, Anon Key, Service Role Key)
- [ ] Clés ajoutées dans `backend/.env`
- [ ] Compte OpenAI créé (optionnel)
- [ ] Clé API OpenAI récupérée
- [ ] Clé OpenAI ajoutée dans `backend/.env`
- [ ] Serveur testé avec `npm run dev`

---

## 🟢 PARTIE 1 : CONFIGURATION SUPABASE (Obligatoire)

### Étape 1 : Créer un compte Supabase (2 min)

1. **Aller sur** : https://app.supabase.com
2. **Cliquer** : "Sign Up" (ou "Sign In" si vous avez déjà un compte)
3. **Se connecter avec** :
   - GitHub (recommandé)
   - Google
   - Email

### Étape 2 : Créer un nouveau projet (3 min)

1. **Cliquer** : "New Project" (ou "+ New project")
2. **Remplir** :
   ```
   Project Name: alternance-tracker
   Database Password: [Générer un mot de passe fort]
   Region: West EU (Dublin) [ou le plus proche de vous]
   Pricing Plan: Free (gratuit)
   ```
3. **Cliquer** : "Create new project"
4. **Attendre** : 2-3 minutes (création de la base de données)

### Étape 3 : Récupérer les clés API (1 min)

Une fois le projet créé :

1. **Dans le menu de gauche, cliquer** : "Settings" (⚙️)
2. **Cliquer** : "API" (dans la section Settings)
3. **Vous verrez** :

```
┌─────────────────────────────────────────────┐
│ Project URL                                 │
│ https://xxxxxxxxxxxxx.supabase.co           │ ← SUPABASE_URL
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Project API keys                            │
│                                             │
│ anon / public                               │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   │ ← SUPABASE_ANON_KEY
│                                             │
│ service_role / secret                       │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   │ ← SUPABASE_SERVICE_ROLE_KEY
│ [Reveal] ← Cliquer pour afficher           │
└─────────────────────────────────────────────┘
```

4. **Copier** :
   - **Project URL** → C'est votre `SUPABASE_URL`
   - **anon public key** → C'est votre `SUPABASE_ANON_KEY`
   - **service_role secret** → Cliquer "Reveal", puis copier `SUPABASE_SERVICE_ROLE_KEY`

### Étape 4 : Ajouter les clés dans .env (1 min)

1. **Ouvrir** : `C:\xampp\htdocs\AlternanceTracker\backend\.env`

2. **Remplacer** ces lignes :
   ```bash
   # AVANT
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

   ```bash
   # APRÈS (avec vos vraies valeurs)
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4...
   ```

3. **Sauvegarder** le fichier (Ctrl+S)

### ✅ Vérification Supabase

```bash
cd C:\xampp\htdocs\AlternanceTracker\backend
npm run dev
```

**Vous devriez voir** :
```
✅ Connexion à PostgreSQL établie
🚀 Serveur démarré sur le port 5000
```

Si erreur de connexion PostgreSQL, c'est normal ! Supabase gère la base de données pour vous.

---

## 🤖 PARTIE 2 : CONFIGURATION OPENAI (Optionnel)

**Note :** OpenAI est payant mais offre $5 de crédit gratuit pour commencer.  
**Alternative gratuite :** Gemini API (voir section suivante)

### Étape 1 : Créer un compte OpenAI (2 min)

1. **Aller sur** : https://platform.openai.com
2. **Cliquer** : "Sign Up"
3. **Se connecter avec** :
   - Google (recommandé)
   - Email

### Étape 2 : Créer une clé API (1 min)

1. **Dans le menu de gauche, cliquer** : "API keys"
2. **Cliquer** : "+ Create new secret key"
3. **Remplir** :
   ```
   Name: AlternanceTracker Backend
   Permissions: All (ou Restricted si vous préférez)
   ```
4. **Cliquer** : "Create secret key"
5. **IMPORTANT** : Copier la clé **IMMÉDIATEMENT** (elle ne sera plus affichée !)
   ```
   sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Étape 3 : Ajouter la clé dans .env (1 min)

1. **Ouvrir** : `C:\xampp\htdocs\AlternanceTracker\backend\.env`

2. **Remplacer** :
   ```bash
   # AVANT
   OPENAI_API_KEY=sk-your-openai-key-here
   ```

   ```bash
   # APRÈS
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Sauvegarder** (Ctrl+S)

### ✅ Vérification OpenAI

Tester la génération de lettre de motivation dans l'application :
1. Se connecter à l'app
2. Aller dans "Lettres de motivation"
3. Générer une lettre
4. Si ça fonctionne → OpenAI configuré ! ✅

---

## 🌟 ALTERNATIVE GRATUITE : GOOGLE GEMINI API

**Avantages :**
- ✅ **100% GRATUIT** (quota généreux)
- ✅ Pas de carte bancaire requise
- ✅ Qualité similaire à OpenAI

### Étape 1 : Obtenir une clé Gemini (2 min)

1. **Aller sur** : https://makersuite.google.com/app/apikey
   (ou https://aistudio.google.com/app/apikey)

2. **Se connecter** avec votre compte Google

3. **Cliquer** : "Create API key"

4. **Sélectionner** : 
   - Créer un nouveau projet Cloud
   - Ou utiliser un projet existant

5. **Copier** la clé générée :
   ```
   AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

### Étape 2 : Ajouter la clé dans .env

1. **Ouvrir** : `backend/.env`

2. **Ajouter/Remplacer** :
   ```bash
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Sauvegarder**

**Le système utilisera automatiquement Gemini si OpenAI n'est pas configuré ! 🎉**

---

## 🧪 TESTS COMPLETS

### Test 1 : Démarrage du serveur

```bash
cd C:\xampp\htdocs\AlternanceTracker\backend
npm run dev
```

**Attendu :**
```
✅ Secrets loaded (ou message similaire)
🚀 Serveur démarré sur le port 5000
```

### Test 2 : Connexion à Supabase

```bash
# Dans un autre terminal
curl http://localhost:5000/api/health
```

**Attendu :**
```json
{
  "status": "OK",
  "message": "AlternanceTracker API is running"
}
```

### Test 3 : Protection CSRF

```bash
curl http://localhost:5000/api/csrf-token
```

**Attendu :**
```json
{
  "csrfToken": "xxxxx..."
}
```

### Test 4 : Obtenir un token CSRF

Si vous voyez un token, la protection CSRF fonctionne ! ✅

---

## 📊 RÉSUMÉ DES CLÉS

### ✅ Obligatoires (pour que l'app fonctionne)

```bash
✅ JWT_SECRET          → Déjà généré ✓
✅ CSRF_SECRET         → Déjà généré ✓
✅ SUPABASE_URL        → À configurer
✅ SUPABASE_ANON_KEY   → À configurer
✅ SUPABASE_SERVICE_ROLE_KEY → À configurer
```

### 🔄 Optionnelles (fonctionnalités IA)

```bash
🤖 OPENAI_API_KEY   → Pour génération de lettres (payant)
🌟 GEMINI_API_KEY   → Alternative gratuite à OpenAI
```

**Si aucune clé IA n'est configurée :**  
Les fonctionnalités de génération de lettres et d'analyse CV ne fonctionneront pas, mais le reste de l'application fonctionnera normalement.

---

## ⚠️ PROBLÈMES COURANTS

### Erreur : "JWT_SECRET manquant"
✅ **Solution :** Le fichier `.env` a bien été créé avec le secret. Redémarrer le serveur.

### Erreur : "Supabase URL invalide"
✅ **Solution :** Vérifier que l'URL commence par `https://` et se termine par `.supabase.co`

### Erreur : "OpenAI API key invalid"
✅ **Solution :** 
- Vérifier que la clé commence par `sk-`
- Vérifier que vous avez des crédits sur votre compte OpenAI
- Ou utiliser Gemini API (gratuit)

### L'app démarre mais ne se connecte pas à la base
✅ **Solution :** Supabase gère la base de données pour vous. Tant que vous avez les bonnes clés Supabase, pas besoin de PostgreSQL local.

---

## 🎯 PROCHAINES ÉTAPES

### Après configuration

1. **Tester l'application complète**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (dans un autre terminal)
   cd frontend
   npm run dev
   ```

2. **Créer votre premier compte**
   - Aller sur http://localhost:3000
   - Cliquer "S'inscrire"
   - Créer un compte

3. **Tester les fonctionnalités**
   - Créer une candidature
   - Générer une lettre de motivation (si OpenAI/Gemini configuré)
   - Analyser un CV (si OpenAI/Gemini configuré)

---

## 📚 RESSOURCES

### Documentation officielle
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)

### Tarifs
- **Supabase Free Tier :** 500 MB database, 1 GB file storage
- **OpenAI :** ~$0.002 / 1K tokens (GPT-3.5-turbo)
- **Gemini :** Gratuit (60 requêtes/minute)

---

## ✅ VALIDATION FINALE

Une fois tout configuré, votre `backend/.env` devrait ressembler à :

```bash
JWT_SECRET=yYpPuOs8yXW85GhceXhZTPoE+dKd6xeCAGqrLIbOmlSaY1EOsxEV+24EZ3vjH3F57mgneS2Rl4KCwb1CvScOBw==
CSRF_SECRET=KNcf0CGQw5lfEUvSO1SCV0YWa8X4RlDo14BGpRuBIig=
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-xxxxx... (ou GEMINI_API_KEY)
```

**Tout est configuré ! 🎉**

---

**Créé le :** 30 août 2026  
**Statut :** Prêt à utiliser  
**Support :** Voir documentation complète dans le dossier racine
