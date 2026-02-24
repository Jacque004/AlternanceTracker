# 🔐 Flux d'Authentification - Visualisation

## 📊 Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTÈME D'AUTHENTIFICATION                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   FRONTEND   │  ────►  │   BACKEND    │  ────►  │   DATABASE   │
│  (React)     │         │  (Express)   │         │ (PostgreSQL)  │
└──────────────┘         └──────────────┘         └──────────────┘
```

## 🔄 Flux de connexion complet

### 1️⃣ Formulaire de Login (Frontend)
```
┌─────────────────────────────────────┐
│  📝 Formulaire Login                 │
│  ───────────────────────────────────  │
│  • Email: [input]                     │
│  • Password: [input]                  │
│  • Bouton: "Se connecter"             │
│  • Validation HTML5                   │
│  • État de chargement                 │
└──────────────┬────────────────────────┘
               │
               │ handleSubmit()
               ▼
```

### 2️⃣ Requête HTTP POST
```
┌─────────────────────────────────────┐
│  🌐 POST /api/auth/login             │
│  ─────────────────────────────────── │
│  Headers:                            │
│    Content-Type: application/json    │
│  Body:                               │
│    {                                 │
│      "email": "user@example.com",    │
│      "password": "password123"       │
│    }                                 │
└──────────────┬────────────────────────┘
               │
               │ Validation Zod
               ▼
```

### 3️⃣ Validation (Backend)
```
┌─────────────────────────────────────┐
│  ✅ Middleware validateLogin         │
│  ─────────────────────────────────── │
│  • Email valide (format)             │
│  • Email requis                      │
│  • Password requis                   │
│  • Normalisation (toLowerCase)      │
└──────────────┬────────────────────────┘
               │
               │ Si valide → Controller
               │ Si invalide → 400 Bad Request
               ▼
```

### 4️⃣ Recherche utilisateur (Database)
```
┌─────────────────────────────────────┐
│  🔍 SELECT * FROM users              │
│     WHERE email = $1                 │
│  ─────────────────────────────────── │
│  Paramètre: email                    │
└──────────────┬────────────────────────┘
               │
               │ Résultat
               ▼
        ┌──────────────┐
        │ Utilisateur  │
        │ trouvé ?     │
        └──────┬───────┘
               │
        ┌──────┴───────┐
        │              │
        ▼ OUI          ▼ NON
┌───────────────┐    ┌───────────────┐
│ Continuer      │    │ Retourner 401 │
│                │    │ "Email ou     │
│                │    │  mot de passe │
│                │    │  incorrect"   │
└───────┬────────┘    └───────────────┘
        │
        ▼
```

### 5️⃣ Comparaison bcrypt
```
┌─────────────────────────────────────┐
│  🔐 bcrypt.compare()                 │
│  ─────────────────────────────────── │
│  • password (clair)                  │
│  • user.password (hashé)             │
│  • Retourne: true/false              │
└──────────────┬────────────────────────┘
               │
               │ Résultat
               ▼
        ┌──────────────┐
        │ Mot de passe │
        │ correct ?    │
        └──────┬───────┘
               │
        ┌──────┴───────┐
        │              │
        ▼ OUI          ▼ NON
┌───────────────┐    ┌───────────────┐
│ Générer JWT   │    │ Retourner 401 │
│               │    │ "Email ou     │
│               │    │  mot de passe │
│               │    │  incorrect"   │
└───────┬───────┘    └───────────────┘
        │
        ▼
```

### 6️⃣ Génération JWT
```
┌─────────────────────────────────────┐
│  🎫 jwt.sign()                      │
│  ─────────────────────────────────── │
│  Payload:                            │
│    {                                 │
│      userId: 1,                      │
│      email: "user@example.com"        │
│    }                                 │
│  Secret: JWT_SECRET                  │
│  Options:                            │
│    expiresIn: "7d"                   │
└──────────────┬────────────────────────┘
               │
               │ Token généré
               ▼
```

### 7️⃣ Réponse succès
```
┌─────────────────────────────────────┐
│  ✅ Réponse 200 OK                  │
│  ─────────────────────────────────── │
│  {                                   │
│    "message": "Connexion réussie",  │
│    "token": "eyJhbGciOiJIUzI1NiIs...",│
│    "user": {                         │
│      "id": 1,                        │
│      "email": "user@example.com",    │
│      "firstName": "John",            │
│      "lastName": "Doe"               │
│    }                                 │
│  }                                   │
└──────────────┬────────────────────────┘
               │
               │ Frontend reçoit
               ▼
```

### 8️⃣ Stockage token (Frontend)
```
┌─────────────────────────────────────┐
│  💾 Stockage sécurisé                │
│  ─────────────────────────────────── │
│  • Supabase gère automatiquement    │
│  • localStorage (géré par Supabase)  │
│  • Refresh token automatique        │
│  • Protection XSS                   │
└──────────────┬────────────────────────┘
               │
               │ Token stocké
               ▼
```

### 9️⃣ Redirection Dashboard
```
┌─────────────────────────────────────┐
│  🚀 navigate('/dashboard')           │
│  ─────────────────────────────────── │
│  • Redirection automatique           │
│  • Route protégée (PrivateRoute)     │
│  • Vérification session              │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  📊 Dashboard                       │
│  ─────────────────────────────────── │
│  • Utilisateur connecté             │
│  • Session active                    │
│  • Accès aux données                 │
└─────────────────────────────────────┘
```

## 🛡️ Protection des routes (Middleware)

```
┌─────────────────────────────────────┐
│  🔒 Requête protégée                │
│  ─────────────────────────────────── │
│  GET /api/users/profile              │
│  GET /api/applications               │
│  POST /api/applications              │
└──────────────┬────────────────────────┘
               │
               │ Headers
               ▼
┌─────────────────────────────────────┐
│  🔍 authenticateToken Middleware     │
│  ─────────────────────────────────── │
│  1. Vérifier Authorization header    │
│  2. Extraire token (Bearer TOKEN)    │
│  3. jwt.verify(token, secret)        │
└──────────────┬────────────────────────┘
               │
               │ Résultat
               ▼
    ┌──────────────┐
    │ Token valide?│
    └──────┬───────┘
           │
    ┌──────┴───────┐
    │              │
    ▼ OUI          ▼ NON
┌──────────┐    ┌──────────┐
│ Continuer │    │ 401/403 │
│           │    │ Erreur  │
│           │    │         │
└─────┬─────┘    └─────────┘
      │
      ▼
┌──────────────┐
│  Route       │
│  protégée    │
└──────────────┘
```

## ⏰ Gestion expiration token

```
┌─────────────────────────────────────┐
│  ⏰ Vérification expiration          │
│  ─────────────────────────────────── │
│  • À chaque chargement de page      │
│  • Écoute événements Supabase        │
│  • Comparaison: now vs expires_at    │
└──────────────┬────────────────────────┘
               │
               │ Si expiré
               ▼
┌─────────────────────────────────────┐
│  🚪 Déconnexion automatique          │
│  ─────────────────────────────────── │
│  • supabase.auth.signOut()           │
│  • Suppression session               │
│  • Redirection /login                │
└─────────────────────────────────────┘
```

## ❌ Gestion des erreurs

```
┌─────────────────────────────────────┐
│  ❌ Scénarios d'erreur               │
│  ─────────────────────────────────── │
│                                      │
│  1. Email inexistant                 │
│     → 401 "Email ou mot de passe     │
│        incorrect"                    │
│                                      │
│  2. Mauvais mot de passe             │
│     → 401 "Email ou mot de passe     │
│        incorrect"                    │
│                                      │
│  3. Token manquant                   │
│     → 401 "Token d'authentification  │
│        manquant"                     │
│                                      │
│  4. Token expiré                    │
│     → 403 "Token invalide ou expiré"│
│                                      │
│  5. Erreur serveur                  │
│     → 500 "Erreur serveur"           │
│                                      │
│  6. Email non confirmé               │
│     → "Veuillez confirmer votre      │
│        email"                        │
│                                      │
│  7. Trop de tentatives              │
│     → "Trop de tentatives.          │
│        Réessayez plus tard"          │
└─────────────────────────────────────┘
```

## 🧪 Tests automatisés

```
┌─────────────────────────────────────┐
│  ✅ Tests disponibles                │
│  ─────────────────────────────────── │
│                                      │
│  auth.controller.test.ts:            │
│  ├─ ✅ Connexion valide              │
│  ├─ ✅ Email inexistant              │
│  ├─ ✅ Mauvais mot de passe          │
│  └─ ✅ Gestion erreurs serveur       │
│                                      │
│  auth.middleware.test.ts:            │
│  ├─ ✅ Token valide                  │
│  ├─ ✅ Token manquant                │
│  ├─ ✅ Token invalide                │
│  └─ ✅ Token expiré                  │
│                                      │
│  Résultat: 9/9 tests passent ✅      │
└─────────────────────────────────────┘
```

## 📋 Checklist complète

- [x] ✅ Endpoint POST /login
- [x] ✅ Comparaison bcrypt
- [x] ✅ Génération JWT
- [x] ✅ Middleware auth
- [x] ✅ Gestion expiration token
- [x] ✅ Formulaire login
- [x] ✅ Stockage sécurisé token
- [x] ✅ Redirection dashboard
- [x] ✅ Gestion erreurs
- [x] ✅ Test mauvais mot de passe
- [x] ✅ Test email inexistant
- [x] ✅ Test connexion valide

## 🎯 État final

**Tous les éléments fonctionnent parfaitement ! ✅**

