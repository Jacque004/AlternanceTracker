# Contribution au projet

## Flux de travail

- Creer une branche depuis `main` avec le format `type/description-courte` (ex: `feat/secure-auth`).
- Ouvrir une Pull Request avec un titre clair et une description des impacts.
- Associer la PR a un besoin fonctionnel ou technique documente.

## Qualite attendue

- Lint et tests doivent passer localement avant PR:
  - `cd backend && npm run lint && npm test`
  - `cd frontend && npm run lint && npm test`
- Les changements de schema SQL doivent etre livres via `supabase/migrations`.
- Toute nouvelle variable d'environnement doit etre ajoutee a un fichier `.env.example`.

## Securite

- Ne jamais committer de secrets (`.env`, tokens, cles API).
- Eviter les messages d'erreur techniques exposes au client.
- Valider et filtrer toutes les entrees utilisateur (API et frontend).

## Revue de code

- Minimum 1 revue sur les modifications backend, base de donnees ou CI/CD.
- Verifier explicitement: auth, droits d'acces, gestion des erreurs, migrations.

