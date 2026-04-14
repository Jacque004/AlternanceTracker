# AlternanceTracker

SaaS de gestion intelligente de candidatures d'alternance et d'emploi.

**Dépôt** : [github.com/Jacque004/AlternanceTracker](https://github.com/Jacque004/AlternanceTracker)

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

## 🔐 Authentification et données

- **Auth et données** : L'application utilise **Supabase** pour l'authentification (inscription, connexion, confirmation email) et le stockage des données (candidatures, profil, CV, lettres générées). Les utilisateurs se connectent via Supabase Auth.
- **IA** : Les fonctionnalités IA (analyse CV, score ATS, génération de lettre, analyse d'offre) peuvent passer par :
  - **Backend Express** : si `VITE_API_URL` est défini côté frontend, les appels IA sont envoyés au backend (routes `/ai/*`). Le backend utilise une clé OpenAI. L'authentification des requêtes vers le backend peut reposer sur un JWT (backend) ou sur le JWT Supabase si le backend est configuré pour le vérifier.
  - **Supabase Edge Functions** : si `VITE_API_URL` n'est pas défini, le frontend appelle les Edge Functions Supabase (ex. `generate-cover-letter`, `analyze-cv-alternance`, `analyze-job-offer`). Aucune configuration backend n'est alors nécessaire pour l'IA.
- En résumé : **données et auth = Supabase** ; **IA = backend Express (si VITE_API_URL) ou Edge Functions Supabase**.

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
# Optionnel : backend Express pour l'IA (analyse CV, ATS, etc.)
VITE_API_URL=http://localhost:5000/api

# Supabase (auth + données)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
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
- [Analyse des besoins et maquettage](docs/ANALYSE_BESOINS_MAQUETTAGE.md)
- [Plan de tests](docs/PLAN_TESTS.md)
- [Runbook de déploiement](docs/DEPLOIEMENT_RUNBOOK.md)
- [Guide sécurité](docs/SECURITE.md)
- [Guide de contribution](CONTRIBUTING.md)

## 📄 Licence

MIT

