# PR Securite - Template

## Objectif

Reduire la surface d'attaque, corriger les vulnerabilites critiques/hautes et fiabiliser les controles CI.

## Changements inclus

- Durcissement auth/JWT et gestion des erreurs en production.
- Corrections de vulnerabilites dependances (axios, pdfjs, follow-redirects, supabase CLI).
- Suppression de l'export Excel base sur `xlsx` vulnere.
- Durcissement `docker-compose` (secrets requis, pas de fallback faible).
- Ajout d'un workflow d'audit securite automatise (`security-audit.yml`).
- Ajout d'une politique d'audit codifiee (`scripts/security-audit.mjs`).

## Risque residuel connu

- `lodash` transitive via `recharts` (frontend) reste presente.
- Mesure compensatoire: aucune interpolation de templates lodash avec contenu non fiable.
- Action planifiee: migration/remplacement `recharts`.

## Plan de test

- [ ] `cd backend && npm run lint && npm test`
- [ ] `cd frontend && npm run lint && npm test`
- [ ] `npm run security:audit`
- [ ] Verification manuelle login + CRUD candidatures + export CSV/PDF

## Suivi post-merge

- Creer ticket de migration des graphiques pour retirer `lodash`.
- Revalider `npm audit --omit=dev` apres migration.

