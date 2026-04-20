# Architecture - AlternanceTracker

## Vue d'ensemble

AlternanceTracker est une application SaaS full-stack construite avec une architecture moderne et scalable.

## Stack technique

### Backend et données
- **Données & auth (parcours principal)** : **Supabase** (PostgreSQL managé, **Supabase Auth**, politiques **RLS**). Le frontend parle à la base via le client JS avec le jeton utilisateur.
- **API Express (optionnelle)** : Node.js + TypeScript, routes REST et `/ai/*` si le frontend est configuré avec `VITE_API_URL` ; peut s’appuyer sur JWT applicatif ou sur la vérification du JWT Supabase selon le déploiement.
- **Sécurité (Express)** : bcrypt, Helmet, express-validator lorsque le serveur Express est utilisé.
- **IA** : OpenAI / Gemini côté Edge Functions ou côté Express selon la configuration.

### Frontend
- **Framework** : React 18 avec TypeScript
- **Build tool** : Vite
- **Routing** : React Router v6
- **Styling** : Tailwind CSS
- **Graphiques** : Recharts
- **Notifications** : React Hot Toast
- **HTTP Client** : Axios

### DevOps
- **Containerisation** : Docker & Docker Compose
- **CI/CD** : GitHub Actions
- **Base de données** : PostgreSQL (containerisé)

## Architecture du backend

```
backend/
├── src/
│   ├── index.ts              # Point d'entrée de l'application
│   ├── controllers/          # Logique métier
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── application.controller.ts
│   │   ├── dashboard.controller.ts
│   │   └── ai.controller.ts
│   ├── routes/               # Définition des routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── application.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── ai.routes.ts
│   ├── middleware/           # Middlewares personnalisés
│   │   └── auth.middleware.ts
│   ├── database/             # Configuration et migrations
│   │   ├── connection.ts
│   │   └── migrate.ts
│   └── utils/                # Utilitaires
│       └── validation.ts
```

### Flux de données

1. **Requête HTTP** → Express Router
2. **Middleware d'authentification** (si route protégée)
3. **Validation** (express-validator)
4. **Controller** → Logique métier
5. **Base de données** → PostgreSQL via pg
6. **Réponse JSON** → Client

## Architecture du frontend

```
frontend/
├── src/
│   ├── main.tsx              # Point d'entrée
│   ├── App.tsx               # Composant racine avec routing
│   ├── components/           # Composants réutilisables
│   │   ├── Layout.tsx
│   │   └── PrivateRoute.tsx
│   ├── pages/                # Pages de l'application
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Applications.tsx
│   │   ├── ApplicationForm.tsx
│   │   └── Profile.tsx
│   ├── contexts/             # Contextes React
│   │   └── AuthContext.tsx
│   ├── services/             # Services API
│   │   └── api.ts
│   └── types/                # Types TypeScript
│       └── index.ts
```

### Flux de données

1. **Composant React** → Appel service API
2. **Service API** → Axios avec intercepteurs
3. **Backend API** → Traitement et réponse
4. **Context/State** → Mise à jour de l'état
5. **Re-render** → Affichage des données

## Base de données

### Schéma

#### Table `users`
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR UNIQUE)
- `password` (VARCHAR - hashé avec bcrypt)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### Table `applications`
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER FOREIGN KEY → users.id)
- `company_name` (VARCHAR)
- `position` (VARCHAR)
- `status` (VARCHAR) - 'pending', 'interview', 'accepted', 'rejected'
- `application_date` (DATE)
- `response_date` (DATE)
- `notes` (TEXT)
- `location` (VARCHAR)
- `salary_range` (VARCHAR)
- `job_url` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Index
- `idx_applications_user_id` sur `user_id`
- `idx_applications_status` sur `status`
- `idx_applications_date` sur `application_date`

## Sécurité

### Authentification
- **JWT** : Tokens signés avec secret, expiration 7 jours
- **Hashage** : bcrypt avec salt rounds = 10
- **Middleware** : Vérification du token sur chaque route protégée

### Protection
- **Helmet** : En-têtes de sécurité HTTP
- **CORS** : Configuration restrictive
- **Rate Limiting** : 100 requêtes / 15 minutes par IP
- **Validation** : express-validator côté serveur
- **XSS Protection** : Helmet + validation des entrées

### Bonnes pratiques
- Mots de passe jamais stockés en clair
- Tokens JWT dans localStorage (à considérer httpOnly cookies en production)
- Validation stricte des données
- Protection CSRF (à implémenter pour production)

## API REST

### Endpoints

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion

#### Utilisateur
- `GET /api/users/profile` - Profil (protégé)
- `PUT /api/users/profile` - Mise à jour (protégé)

#### Candidatures
- `GET /api/applications` - Liste (protégé)
- `GET /api/applications/:id` - Détails (protégé)
- `POST /api/applications` - Créer (protégé)
- `PUT /api/applications/:id` - Modifier (protégé)
- `DELETE /api/applications/:id` - Supprimer (protégé)

#### Dashboard
- `GET /api/dashboard/statistics` - Statistiques (protégé)
- `GET /api/dashboard/recent` - Récentes (protégé)

#### IA
- `POST /api/ai/cover-letter` - Générer lettre (protégé)

## Déploiement

### Docker
- **Multi-stage builds** pour optimiser les images
- **Volumes** pour la persistance des données PostgreSQL
- **Networks** pour l'isolation des services
- **Health checks** pour PostgreSQL

### CI/CD
- **GitHub Actions** : Tests automatiques
- **Build** : Vérification des builds frontend/backend
- **Docker** : Build des images (sur push)

## Évolutions possibles

1. **Cache** : Redis pour les sessions et cache
2. **Queue** : Bull/BullMQ pour les tâches asynchrones
3. **Monitoring** : Sentry, LogRocket
4. **Tests** : Jest, React Testing Library
5. **E2E** : Playwright, Cypress
6. **Documentation API** : Swagger/OpenAPI
7. **WebSockets** : Notifications en temps réel
8. **Microservices** : Séparation des services (IA, analytics)

## Performance

### Optimisations actuelles
- Index sur les colonnes fréquemment requêtées
- Requêtes SQL optimisées
- Lazy loading des composants React
- Code splitting avec Vite

### Améliorations possibles
- Pagination pour les listes
- Cache des requêtes fréquentes
- CDN pour les assets statiques
- Compression gzip/brotli

