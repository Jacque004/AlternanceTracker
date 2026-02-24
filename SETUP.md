# Guide d'installation - AlternanceTracker

## Prérequis

- Node.js 18+ et npm
- Docker et Docker Compose (optionnel mais recommandé)
- PostgreSQL 15+ (si vous n'utilisez pas Docker)
- Clé API OpenAI (pour la génération de lettres de motivation)

## Installation

### Option 1 : Avec Docker (Recommandé)

1. **Cloner le projet** (si nécessaire)
   ```bash
   cd ProjetSaaS
   ```

2. **Configurer les variables d'environnement**
   
   Créez un fichier `.env` à la racine du projet ou configurez les variables dans `docker-compose.yml` :
   ```env
   JWT_SECRET=votre-secret-jwt-super-securise
   OPENAI_API_KEY=votre-cle-api-openai
   ```

3. **Démarrer les services**
   ```bash
   docker-compose up -d
   ```

4. **Exécuter les migrations de base de données**
   ```bash
   docker-compose exec backend npm run migrate
   ```

5. **Accéder à l'application**
   - Frontend : http://localhost:3000
   - Backend API : http://localhost:5000
   - PostgreSQL : localhost:5432

### Option 2 : Installation manuelle

#### Backend

1. **Installer les dépendances**
   ```bash
   cd backend
   npm install
   ```

2. **Configurer les variables d'environnement**
   
   Copiez `.env.example` vers `.env` et modifiez les valeurs :
   ```bash
   cp .env.example .env
   ```

   Éditez `.env` :
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgresql://user:password@localhost:5432/alternancetracker
   JWT_SECRET=votre-secret-jwt-super-securise
   JWT_EXPIRES_IN=7d
   OPENAI_API_KEY=votre-cle-api-openai
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Créer la base de données PostgreSQL**
   ```sql
   CREATE DATABASE alternancetracker;
   ```

4. **Exécuter les migrations**
   ```bash
   npm run migrate
   ```

5. **Démarrer le serveur**
   ```bash
   npm run dev
   ```

#### Frontend

1. **Installer les dépendances**
   ```bash
   cd frontend
   npm install
   ```

2. **Configurer les variables d'environnement**
   
   Créez un fichier `.env` :
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Démarrer le serveur de développement**
   ```bash
   npm run dev
   ```

## Utilisation

### Créer un compte

1. Accédez à http://localhost:3000
2. Cliquez sur "Créer un compte"
3. Remplissez le formulaire d'inscription

### Fonctionnalités principales

- **Tableau de bord** : Visualisez vos statistiques de candidatures
- **Gestion des candidatures** : CRUD complet pour vos candidatures
- **Génération IA** : Générez des lettres de motivation personnalisées
- **Profil** : Gérez vos informations personnelles

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion

### Utilisateur
- `GET /api/users/profile` - Obtenir le profil
- `PUT /api/users/profile` - Mettre à jour le profil

### Candidatures
- `GET /api/applications` - Liste des candidatures
- `GET /api/applications/:id` - Détails d'une candidature
- `POST /api/applications` - Créer une candidature
- `PUT /api/applications/:id` - Mettre à jour une candidature
- `DELETE /api/applications/:id` - Supprimer une candidature

### Dashboard
- `GET /api/dashboard/statistics` - Statistiques
- `GET /api/dashboard/recent` - Candidatures récentes

### IA
- `POST /api/ai/cover-letter` - Générer une lettre de motivation

## Développement

### Structure du projet

```
ProjetSaaS/
├── backend/              # API Express + TypeScript
│   ├── src/
│   │   ├── controllers/  # Contrôleurs
│   │   ├── routes/       # Routes API
│   │   ├── middleware/   # Middlewares
│   │   ├── database/     # Configuration DB
│   │   └── utils/        # Utilitaires
│   └── package.json
├── frontend/             # Application React + TypeScript
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── pages/        # Pages
│   │   ├── services/     # Services API
│   │   ├── contexts/     # Contextes React
│   │   └── types/        # Types TypeScript
│   └── package.json
└── docker-compose.yml    # Configuration Docker
```

### Scripts disponibles

**Racine du projet :**
- `npm run dev` - Démarrer frontend et backend
- `npm run docker:up` - Démarrer avec Docker
- `npm run docker:down` - Arrêter Docker

**Backend :**
- `npm run dev` - Mode développement
- `npm run build` - Build de production
- `npm run migrate` - Exécuter les migrations

**Frontend :**
- `npm run dev` - Mode développement
- `npm run build` - Build de production

## Dépannage

### Erreur de connexion à la base de données

Vérifiez que :
- PostgreSQL est démarré
- Les identifiants dans `.env` sont corrects
- La base de données existe

### Erreur CORS

Vérifiez que `CORS_ORIGIN` dans le `.env` du backend correspond à l'URL du frontend.

### Erreur OpenAI API

Assurez-vous d'avoir une clé API OpenAI valide dans le `.env` du backend.

## Production

Pour déployer en production :

1. Configurez les variables d'environnement de production
2. Build les applications :
   ```bash
   npm run build
   ```
3. Utilisez Docker Compose ou déployez séparément
4. Configurez un reverse proxy (nginx) pour le frontend
5. Utilisez HTTPS avec des certificats SSL

## Support

Pour toute question ou problème, consultez la documentation ou créez une issue.

