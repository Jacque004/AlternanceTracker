# Configuration Supabase - AlternanceTracker

## 🚀 Migration vers Supabase

Ce projet utilise maintenant **Supabase** au lieu de Node.js/Express pour le backend.

## 📋 Prérequis

1. Créer un compte sur [Supabase](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL du projet et la clé API anonyme

## 🔧 Configuration

### 1. Variables d'environnement Frontend

Créez un fichier `.env` dans le dossier `frontend/` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

### 2. Configuration de la base de données

Dans le dashboard Supabase, allez dans **SQL Editor** et exécutez le script de migration :

```sql
-- Le fichier se trouve dans supabase/migrations/001_initial_schema.sql
```

Ou utilisez l'interface Supabase pour créer les tables manuellement :

#### Table `users`
- `id` (UUID, Primary Key, référence `auth.users`)
- `email` (TEXT, UNIQUE, NOT NULL)
- `first_name` (VARCHAR(100))
- `last_name` (VARCHAR(100))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### Table `applications`
- `id` (SERIAL, Primary Key)
- `user_id` (UUID, Foreign Key vers `users.id`)
- `company_name` (VARCHAR(255), NOT NULL)
- `position` (VARCHAR(255), NOT NULL)
- `status` (VARCHAR(50), DEFAULT 'pending')
- `application_date` (DATE)
- `response_date` (DATE)
- `notes` (TEXT)
- `location` (VARCHAR(255))
- `salary_range` (VARCHAR(100))
- `job_url` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3. Row Level Security (RLS)

Les politiques RLS sont définies dans le script de migration pour :
- Les utilisateurs ne peuvent voir/modifier que leurs propres données
- Sécurité automatique au niveau de la base de données

### 4. Edge Function pour l'IA

Pour la génération de lettres de motivation :

1. Installez Supabase CLI :
```bash
npm install -g supabase
```

2. Connectez-vous :
```bash
supabase login
```

3. Liez votre projet :
```bash
supabase link --project-ref votre-project-ref
```

4. Déployez la fonction :
```bash
supabase functions deploy generate-cover-letter
```

5. Configurez la variable d'environnement :
```bash
supabase secrets set OPENAI_API_KEY=votre-cle-openai
```

## 📦 Installation

```bash
# Frontend
cd frontend
npm install
```

## 🚀 Démarrage

```bash
cd frontend
npm run dev
```

## 🔐 Authentification

Supabase gère automatiquement :
- ✅ Inscription avec email/password
- ✅ Connexion
- ✅ Déconnexion
- ✅ Sessions persistantes
- ✅ Hashage des mots de passe (bcrypt)
- ✅ Tokens JWT

## 📊 Avantages de Supabase

1. **Pas de backend à maintenir** : Tout est géré par Supabase
2. **Base de données PostgreSQL** : Même technologie, mais hébergée
3. **Authentification intégrée** : Plus besoin de gérer JWT manuellement
4. **Row Level Security** : Sécurité au niveau de la base de données
5. **API REST automatique** : Générée automatiquement depuis les tables
6. **Edge Functions** : Pour les fonctions serverless (génération IA)

## 🔄 Différences avec l'ancien backend

### Avant (Node.js/Express)
- Backend Express à maintenir
- Gestion manuelle de JWT
- Routes API à créer
- Base de données locale PostgreSQL

### Maintenant (Supabase)
- Pas de backend à maintenir
- Authentification gérée par Supabase
- API REST automatique
- Base de données hébergée sur Supabase

## 📝 Notes

- Le dossier `backend/` peut être supprimé ou conservé pour référence
- Toutes les fonctionnalités sont maintenant dans le frontend avec Supabase
- Les Edge Functions remplacent les routes API pour les opérations serveur

