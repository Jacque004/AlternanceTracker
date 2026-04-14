# Securite du projet

## Mesures en place

- Secret JWT obligatoire au demarrage du backend.
- Validation et parametrage des requetes SQL sensibles (tri whitelist).
- Erreurs techniques masquees en production.
- CI avec lint + tests bloquants.

## Bonnes pratiques obligatoires

- Ne jamais versionner de secrets dans Git.
- Definir des secrets forts pour `JWT_SECRET` et `POSTGRES_PASSWORD`.
- Limiter les permissions des tokens/API keys.
- Mettre a jour les dependances regulierement et verifier `npm audit`.

## Controle avant release

- `cd backend && npm audit --omit=dev`
- `cd frontend && npm audit --omit=dev`
- `cd backend && npm run lint && npm test`
- `cd frontend && npm run lint && npm test`
- `npm run security:audit`

## Risques residuels connus

- Certaines alertes `npm audit` concernent des dependances de developpement/outillage.
- Les mises a jour majeures (`vite`, `eslint`, `typescript-eslint`) doivent etre planifiees et testees.

