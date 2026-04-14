# Runbook de deploiement

## Prerequis

- Secrets configures (DB, JWT, OpenAI, Supabase)
- Docker et/ou environnement Node cible disponibles
- Acces a GitHub Actions et au registry d'images (si utilise)

## Procedure standard

1. Fusionner la PR sur `main`.
2. Laisser la CI executer lint, tests et build.
3. Deployer le frontend (workflow GitHub Actions).
4. Deployer le backend (container ou serveur Node).
5. Appliquer les migrations SQL si necessaire.
6. Verifier `/api/health` et parcours utilisateur critique.

## Verification post-deploiement

- Authentification utilisateur fonctionnelle
- CRUD candidatures fonctionnel
- Logs applicatifs sans erreurs critiques
- Aucune alerte de securite bloquante

## Rollback

- Revenir a la version precedente de l'image backend/frontend
- Reexecuter les checks de sante
- Ouvrir un incident avec cause, impact, action corrective

## Gestion des incidents

- Prioriser incidents auth et perte d'acces utilisateur
- Conserver traces techniques (logs, hash release, migration)
- Documenter un post-mortem court dans les 24h

