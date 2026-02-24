# Démarrage rapide - AlternanceTracker

## 🚀 Démarrage avec Docker (Recommandé)

```bash
# 1. Démarrer tous les services
docker-compose up -d

# 2. Exécuter les migrations de base de données
docker-compose exec backend npm run migrate

# 3. Accéder à l'application
# Frontend : http://localhost:3000
# Backend : http://localhost:5000/api/health
```

## 📦 Installation manuelle

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos configurations
npm run migrate
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
# Créer .env avec VITE_API_URL=http://localhost:5000/api
npm run dev
```

## ✅ Vérification

1. **Backend** : http://localhost:5000/api/health
   - Devrait retourner : `{"status":"OK","message":"AlternanceTracker API is running"}`

2. **Frontend** : http://localhost:3000
   - Devrait afficher la page de connexion

## 🔑 Première utilisation

1. Créez un compte sur http://localhost:3000/register
2. Connectez-vous
3. Créez votre première candidature
4. Explorez le tableau de bord analytique
5. Testez la génération de lettre de motivation avec l'IA

## 📝 Notes importantes

- **OpenAI API** : Pour utiliser la génération de lettres de motivation, vous devez configurer `OPENAI_API_KEY` dans le `.env` du backend
- **Base de données** : Les migrations créent automatiquement les tables nécessaires
- **JWT Secret** : Changez le `JWT_SECRET` en production pour la sécurité

## 🛠️ Commandes utiles

```bash
# Voir les logs Docker
docker-compose logs -f

# Arrêter les services
docker-compose down

# Redémarrer les services
docker-compose restart

# Réinitialiser la base de données (⚠️ supprime toutes les données)
docker-compose down -v
docker-compose up -d
docker-compose exec backend npm run migrate
```

