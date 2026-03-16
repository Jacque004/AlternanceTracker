# Propositions de mises à jour – AlternanceTracker

Document de propositions pour les prochaines évolutions de l’application, basé sur l’état actuel du code (Supabase, backend Express, IA, pages existantes).

---

## Priorité 1 – Impact utilisateur direct

### 1.1 Notifications et rappels
- **Relances** : Le dashboard affiche déjà les candidatures « à relancer » (7 jours). Proposer une action en un clic (ex. « Marquer relancé » ou « Planifier rappel ») et/ou une **notification in-app** ou par email (Supabase Auth + template email ou Edge Function).
- **Rappels entretien** : Rappel la veille ou le jour J pour les candidatures en statut « Entretien » (avec date d’entretien si vous ajoutez ce champ).
- **Résumé hebdo** : Email hebdomadaire optionnel (nouvelles candidatures, statuts mis à jour, relances à faire).

### 1.2 Filtres et recherche sur les candidatures
- **Filtres** : Par statut (déjà partiel), par date (création, date de candidature), par entreprise ou poste.
- **Recherche** : Champ de recherche full-text sur entreprise, poste, notes.
- **Tri** : Par date de candidature, date de création, entreprise (A–Z), statut.

### 1.3 Export des données
- **Export CSV/Excel** : Liste des candidatures (avec filtres actuels) pour suivi perso ou partage avec un conseiller.
- **Export PDF** : Synthèse du tableau de bord (stats + liste récente) pour entretiens ou dossiers.

### 1.4 Date d’entretien et champs optionnels
- Ajouter un champ **date d’entretien** (et éventuellement **heure / lieu**) pour les candidatures en statut « Entretien ».
- Afficher cette date sur le dashboard et dans la liste, et l’utiliser pour les rappels (voir 1.1).

---

## Priorité 2 – IA et contenu

### 2.1 Génération de lettre depuis une candidature
- Depuis la fiche d’une candidature (ou depuis la liste), bouton **« Générer une lettre pour cette candidature »** qui pré-remplit entreprise + poste (et optionnellement infos du profil) pour l’outil IA existant.
- Lien direct vers la page Modèles de lettres avec ces champs pré-remplis.

### 2.2 Analyse d’offre depuis une URL
- Sur la page **Analyser une offre** : saisie d’une **URL** d’offre (LinkedIn, Indeed, etc.) → le backend ou une Edge Function récupère le texte (scraping ou API) puis appelle l’IA pour l’analyse.
- Alternative plus simple : **coller le texte** de l’offre (déjà en place) + bouton « Ouvrir dans un nouvel onglet » pour faciliter le copier-coller depuis l’onglet de l’offre.

### 2.3 Conseils CV et coaching
- **Conseils CV** : Sauvegarder les analyses IA dans le profil ou dans une section « Mes analyses CV » (historique) pour comparer les versions.
- **Coaching** : Structurer la page (par thème : entretien, négociation, premier emploi) et ajouter des **fiches courtes** générées par IA ou statiques + possibilité de poser une question courte (IA) pour aller plus loin.

### 2.4 Modèles de lettres
- **Templates** : 2–3 modèles types (alternance, stage, premier emploi) en plus de la génération libre.
- **Historique** : Sauvegarder les lettres générées (liées ou non à une candidature) pour les réutiliser ou les modifier.

---

## Priorité 3 – Technique et cohérence

### 3.1 Unifier la source de données et l’auth
- Aujourd’hui : **Supabase** pour les données (applications, dashboard) et une partie de l’IA (Edge Functions), **backend Express** pour auth JWT, users, et une autre partie de l’IA.
- **Option A** : Tout passer sur Supabase (auth + données + Edge Functions pour l’IA) et réduire le backend à un proxy optionnel (ex. appels OpenAI centralisés).
- **Option B** : Garder Supabase pour auth + données, et faire appeler par le frontend **uniquement** le backend Express pour l’IA (déjà partiellement le cas avec `VITE_API_URL`). Documenter clairement ce choix dans le README et `.env.example`.

### 3.2 Sécurité et robustesse
- **Rate limiting** : Déjà en place sur `/api/`. Vérifier aussi les Edge Functions Supabase (limites par utilisateur ou par IP).
- **Validation** : Étendre la validation (ex. `applicationUpdateSchema`) à toutes les routes qui modifient des données (côté backend si encore utilisé).
- **Tests** : Compléter les tests backend (auth, dashboard, AI controller) et ajouter quelques tests E2E ou d’intégration (ex. parcours « créer candidature → modifier statut »).

### 3.3 Performance et UX
- **Cache / requêtes** : Éviter les appels redondants (ex. React Query ou SWR pour applications et dashboard).
- **Optimistic updates** : Lors de la mise à jour du statut d’une candidature, mettre à jour l’UI tout de suite et annuler en cas d’erreur.
- **Pagination** : Sur la liste des candidatures si le nombre peut devenir important (ex. 20–50 par page).

---

## Priorité 4 – Produit et expérience

### 4.1 Onboarding
- Après inscription : court **parcours guidé** (créer une première candidature, remplir le profil, générer une lettre) pour augmenter l’engagement.

### 4.2 Profil utilisateur
- **Photo / avatar** (Supabase Storage).
- **CV upload** : stocker un ou plusieurs CV (fichiers) et les lier aux analyses « Conseils CV » et à la génération de lettres.
- **Préférences** : langue, rappels activés/désactivés, fréquence du résumé hebdo.

### 4.3 Tableau de bord
- **Objectif** : Nombre de candidatures ciblé par semaine/mois et indicateur de progression.
- **Graphiques** : Courbe des candidatures dans le temps, répartition par statut (camembert ou barres) si pas déjà présent.
- **Widget « À faire »** : Relances + entretiens à venir (une seule zone d’action).

### 4.4 Mobile et PWA
- **Responsive** : S’assurer que toutes les pages (formulaires, listes, dashboard) sont confortables sur mobile.
- **PWA** : Manifest + Service Worker pour installation sur téléphone et usage hors ligne limité (ex. consultation des candidatures en cache).

---

## Priorité 5 – Plus tard

- **Multi-comptes / équipes** : Partager des candidatures (ex. binôme alternance) ou espace « conseiller ».
- **Intégrations** : Import depuis LinkedIn ou Indeed (API ou export manuel).
- **Thème sombre** : Préférence utilisateur (localStorage ou profil).
- **i18n** : Préparer les chaînes pour une version anglaise si besoin.

---

## Synthèse recommandée (ordre suggéré)

| Ordre | Mise à jour | Effort estimé | Impact |
|-------|-------------|---------------|--------|
| 1 | Filtres + recherche + tri sur candidatures | Moyen | Élevé |
| 2 | Date d’entretien + rappels (notifications) | Moyen | Élevé |
| 3 | Génération lettre depuis une candidature | Faible | Élevé |
| 4 | Export CSV des candidatures | Faible | Moyen |
| 5 | Unifier et documenter Supabase vs backend (IA + auth) | Moyen | Moyen (maintenabilité) |
| 6 | Historique lettres générées + templates | Moyen | Moyen |
| 7 | Pagination liste candidatures + React Query/SWR | Moyen | Moyen |
| 8 | Onboarding + objectifs dashboard | Moyen | Moyen |

Vous pouvez piocher dans cette liste en fonction du temps disponible et des retours utilisateurs. Si vous indiquez les 2–3 priorités qui vous intéressent en premier, on peut détailler les tâches (issues, fichiers à toucher, API) pour les implémenter pas à pas.
