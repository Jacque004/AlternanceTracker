# AlternanceTracker

SaaS de gestion intelligente de candidatures d'alternance et d'emploi.

## 🚀 Technologies

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Base de données**: PostgreSQL
- **Authentification**: JWT + bcrypt
- **Containerisation**: Docker
- **CI/CD**: GitHub Actions

## 📋 Fonctionnalités

- ✅ Authentification sécurisée (JWT, hashage bcrypt)
- ✅ Gestion du profil utilisateur
- ✅ CRUD complet des candidatures
- ✅ Tableau de bord analytique (statistiques, graphiques)
- ✅ Génération assistée par IA (lettre de motivation)
- ✅ Déploiement via Docker et CI/CD

## 🛠️ Installation

### Prérequis

- Node.js 18+
- Docker et Docker Compose
- PostgreSQL (ou via Docker)

### Démarrage rapide avec Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### Démarrage en développement

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Démarrer en mode développement
npm run dev
```

## 📁 Structure du projet

```
ProjetSaaS/
├── backend/          # API Express + TypeScript
├── frontend/         # Application React + TypeScript
├── docs/            # Documentation
└── docker-compose.yml
```

## 🔐 Variables d'environnement

### Backend (.env)
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/alternancetracker
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-openai-api-key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 📝 Scripts disponibles

- `npm run dev` - Démarre frontend et backend en mode développement
- `npm run build` - Build de production
- `npm run docker:up` - Démarre les conteneurs Docker
- `npm run docker:down` - Arrête les conteneurs Docker

## 🧪 Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## 📚 Documentation

- [Guide d'installation détaillé](SETUP.md)
- [Démarrage rapide](QUICKSTART.md)
- [Architecture du projet](ARCHITECTURE.md)

## 📄 Licence

MIT

