# Plan de tests

## Objectif

Garantir la qualite fonctionnelle et la securite avant mise en production.

## Perimetre

- Backend API (auth, candidatures, dashboard, IA)
- Frontend (routes protegees, formulaires, etats d'interface)
- Base de donnees (migrations, contraintes, isolation des donnees)

## Strategie

1. Tests unitaires backend (`jest`)
2. Tests unitaires frontend (`vitest` + Testing Library)
3. Verifications manuelles critiques en pre-release
4. Execution automatique via CI GitHub Actions

## Cas critiques (minimum)

- Authentification
  - inscription valide/invalide
  - connexion valide/invalide
  - acces refuse sans token
- Applications
  - CRUD utilisateur authentifie
  - isolation stricte des donnees entre utilisateurs
  - tri autorise uniquement sur colonnes whitelist
- Frontend
  - redirection vers `/login` sans session
  - acces autorise avec session
  - rendu stable des pages principales

## Criteres d'acceptation release

- Lint backend + frontend: OK
- Tests backend + frontend: OK
- Build backend + frontend: OK
- Migrations appliquees sans erreur sur environnement cible

