# AlternanceTracker

SaaS de gestion intelligente de candidatures d'alternance et d'emploi.

**Dépôt** : [github.com/Jacque004/AlternanceTracker](https://github.com/Jacque004/AlternanceTracker)

## Stack technique (réel)

| Couche | Rôle |
|--------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind, React Router |
| **Auth & données** | **Supabase** : Auth (email / mot de passe, confirmation), PostgreSQL, **RLS**, stockage profil / candidatures / CV / lettres |
| **Backend Express** | **Optionnel** : routes REST historiques + `/ai/*` si vous pointez le frontend vers l’API (`VITE_API_URL`) |
| **IA** | **Backend** (OpenAI via Express si `VITE_API_URL`) **ou** **Supabase Edge Functions** (ex. `generate-cover-letter`, `analyze-job-offer`, `analyze-cv-alternance`, `fetch-job-metadata`) si le frontend n’utilise pas le backend |
| **Emails** | Edge Functions `send-reminders`, `send-weekly-summary` + Resend (voir [docs/NOTIFICATIONS_EMAIL.md](docs/NOTIFICATIONS_EMAIL.md)) |
| **DevOps** | Docker, GitHub Actions (selon configuration du dépôt) |

En pratique : **connexion et persistance = Supabase** ; le backend Node n’est requis que si vous choisissez cette voie pour certaines routes (ex. IA, ATS).

## Fonctionnalités

- Compte utilisateur Supabase (inscription, mot de passe oublié, session)
- CRUD candidatures, calendrier (entretiens / relances), tableau de bord
- Profil étudiant, objectifs, préférences d’emails
- Préparation : conseils CV, modèles / génération de lettres, analyse d’offre, coaching
- **Importer une offre** : depuis une URL (Edge Function `fetch-job-metadata`), lien direct, favori ou **extension navigateur** (dossier `extensions/quick-add-offer`)
- Export CSV/PDF, export RGPD JSON
- IA : selon configuration (Edge Functions ou backend Express)

## Importer une offre (URL ou favori)

1. **Dans l’app** : **Nouvelle candidature** → collez l’URL dans « URL de l’offre » → **Remplir depuis la page** (connexion requise). Déployez l’Edge Function : `supabase functions deploy fetch-job-metadata`.

2. **Lien direct** (partageable ou signet) : ouvrir  
   `{origine_de_votre_app}/applications/new?jobUrl=` + URL de l’offre **encodée** (`encodeURIComponent`).

3. **Favori navigateur** : remplacez `https://VOTRE_APP` par l’URL publique du frontend (y compris le chemin de base si vous en utilisez un, ex. GitHub Pages).

```javascript
javascript:(function(){var APP='https://VOTRE_APP';var u=encodeURIComponent(location.href);window.open(APP.replace(/\/$/,'')+'/applications/new?jobUrl='+u,'_blank');})();
```

4. **Extension Chrome / Edge** : chargez le dossier `extensions/quick-add-offer` en mode développeur (`chrome://extensions` → « Charger l’extension non empaquetée »). Indiquez l’URL de base de l’app une fois, puis utilisez « Ouvrir nouvelle candidature avec cette page » depuis l’onglet de l’offre. Détails : [extensions/quick-add-offer/README.md](extensions/quick-add-offer/README.md).

## Installation

### Prérequis

- Node.js 18+
- Compte **Supabase** (URL + clé anon pour le frontend ; migrations dans `supabase/migrations/`)
- Docker (optionnel, si vous utilisez `docker-compose`)

### Démarrage rapide avec Docker

```bash
docker-compose up -d
docker-compose logs -f
```

### Développement

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

Le frontend utilise **Supabase** dès que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définis. Le backend Express n’est lancé que si vous en avez besoin (ex. `VITE_API_URL` pour certaines routes IA).

## Structure du projet

```
ProjetSaaS/
├── backend/          # API Express + TypeScript (optionnel)
├── frontend/         # Application React + TypeScript
├── supabase/         # Migrations SQL, Edge Functions, config locale CLI
├── extensions/       # Extension navigateur (ajout rapide depuis l’URL de l’onglet)
├── docs/             # Documentation (sécurité, déploiement, emails…)
└── docker-compose.yml
```

## Authentification et données

- **Production type** : **Supabase Auth** + tables PostgreSQL côté Supabase, accès contrôlé par **RLS** depuis le frontend (`@supabase/supabase-js`).
- Le dossier `backend/` peut refléter une architecture antérieure (JWT + Postgres auto-hébergé) ; l’app livrée dans ce dépôt s’aligne sur **Supabase** pour l’auth et les données utilisateur.
- **IA** : voir tableau « Stack technique » — `VITE_API_URL` défini → appels vers Express ; sinon → Edge Functions.

## Variables d'environnement

### Backend (.env) — si vous utilisez l’API Express

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
# Optionnel : backend Express (certaines routes IA / ATS)
VITE_API_URL=http://localhost:5000/api

# Obligatoire pour l’app Supabase : auth + données + Edge Functions
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

## Scripts

- `npm run dev` — frontend + backend en parallèle (si monorepo configuré ainsi)
- `npm run build` — build production
- `npm run docker:up` / `npm run docker:down` — conteneurs

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Documentation

- [Guide d'installation](SETUP.md)
- [Démarrage rapide](QUICKSTART.md)
- [Architecture](ARCHITECTURE.md)
- [Rappels et emails](docs/NOTIFICATIONS_EMAIL.md)
- [Analyse des besoins](docs/ANALYSE_BESOINS_MAQUETTAGE.md)
- [Plan de tests](docs/PLAN_TESTS.md)
- [Runbook déploiement](docs/DEPLOIEMENT_RUNBOOK.md)
- [Sécurité](docs/SECURITE.md)
- [Contribution](CONTRIBUTING.md)

## Licence

MIT
