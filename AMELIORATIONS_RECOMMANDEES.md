# Améliorations recommandées – AlternanceTracker

Ce document liste des pistes concrètes pour faire évoluer le projet, en s’appuyant sur l’existant (PROPOSITIONS_MISES_A_JOUR.md, CE_QUI_MANQUE_ETUDIANT.md) et l’état actuel du code.

---

## Ce qui est déjà en place

- **Candidatures** : liste, filtres (statut, recherche, tri), création/édition/suppression, date et lieu d’entretien, relance (marquer relancé).
- **Tableau de bord** : stats, récents, à relancer (7 j), entretiens à venir.
- **Export** : CSV, Excel, PDF des candidatures.
- **Conseils CV** : éditeur par sections, import PDF/TXT, sauvegarde Supabase, analyse alternance, score ATS, export .txt.
- **Profil** : infos étudiant (école, formation, année, LinkedIn, préférences notifications).
- **Analyser une offre** : analyse IA (résumé, adapter CV, lettre, entretien).
- **Modèles de lettres** : templates + génération IA (cover letter).
- **Auth** : Supabase (inscription, connexion, confirmation email).

---

## Priorité 1 – Impact utilisateur direct (rapide à mettre en place)

### 1.1 Générer une lettre depuis une candidature

**Objectif :** Depuis la fiche ou la liste d’une candidature, un bouton « Générer une lettre » qui ouvre la page Modèles de lettres avec entreprise + poste pré-remplis.

**À faire :**
- Dans `ApplicationForm.tsx` et éventuellement dans la liste `Applications.tsx`, ajouter un bouton « Générer une lettre ».
- Ce bouton peut faire un `<Link to="/modeles-lettres" state={{ companyName, position }}>` ou passer les paramètres en query : `/modeles-lettres?company=...&position=...`.
- Dans `ModelesLettres.tsx`, au chargement, lire `useLocation().state` ou `useSearchParams()` et pré-remplir les champs entreprise et poste (et lancer la génération IA si vous ajoutez un mode « pré-rempli »).

**Effort :** Faible | **Impact :** Élevé

---

### 1.2 Objectif de candidatures (dashboard)

**Objectif :** L’utilisateur fixe un objectif (ex. 5 candidatures / semaine ou / mois) et le dashboard affiche la progression (ex. « 3 / 5 cette semaine »).

**À faire :**
- Ajouter dans le profil (ou dans une table `user_settings`) un champ `weekly_goal` ou `monthly_goal` (nombre).
- Dans `Dashboard.tsx`, récupérer cet objectif et les stats déjà disponibles (`stats.monthlyData` ou requête par période), puis afficher une barre ou un texte du type « X / objectif cette semaine (ou ce mois) ».
- Optionnel : petit formulaire ou lien « Modifier mon objectif » vers le profil ou un modal.

**Effort :** Faible à moyen | **Impact :** Moyen (motivation)

---

### 1.3 Lien « Mes candidatures » depuis le Coaching

**Objectif :** Dans la page Coaching, rappeler que le suivi se fait dans l’app avec un lien vers « Mes candidatures ».

**À faire :**
- Dans `Coaching.tsx`, ajouter un encadré (ex. en haut ou après l’intro) : « Suivez vos candidatures (entreprise, poste, dates, relances) dans **Mes candidatures** » avec un `<Link to="/applications">Mes candidatures</Link>`.

**Effort :** Très faible | **Impact :** Moyen (cohérence produit)

---

## Priorité 2 – UX et performance

### 2.1 Pagination sur la liste des candidatures

**Objectif :** Si l’utilisateur a beaucoup de candidatures, afficher par pages (ex. 20 par page) au lieu de tout charger.

**À faire :**
- Dans `supabaseService.ts`, `applicationService.getAll` : accepter des paramètres `page` et `pageSize` (ou `limit`/`offset`), utiliser `.range((page-1)*pageSize, page*pageSize - 1)` et une requête `count` pour le total.
- Dans `Applications.tsx`, gérer un state `page` et afficher des boutons « Précédent » / « Suivant » ou une pagination numérique.

**Effort :** Moyen | **Impact :** Moyen (scalabilité)

---

### 2.2 Cache des données (React Query ou SWR)

**Objectif :** Éviter les re-fetch inutiles (ex. après retour sur la liste des candidatures ou le dashboard) et avoir un état « à jour » partagé.

**À faire :**
- Installer `@tanstack/react-query` (ou `swr`).
- Créer des hooks du type `useApplications(params)`, `useDashboardStats()` qui appellent vos services et utilisent le cache + invalidation après création/édition/suppression.
- Remplacer les `useEffect` + `useState` dans `Dashboard.tsx`, `Applications.tsx`, etc., par ces hooks.

**Effort :** Moyen | **Impact :** Moyen (fluidité, moins de requêtes)

---

### 2.3 Optimistic updates (statut, relance)

**Objectif :** Quand l’utilisateur change le statut d’une candidature ou marque « Relancé », l’UI se met à jour tout de suite ; en cas d’erreur, on revient en arrière et on affiche un toast.

**À faire :**
- Dans les composants qui appellent `applicationService.update` ou `markRelance`, avant l’appel : mettre à jour le state local (liste ou détail) avec la nouvelle valeur.
- Dans le `catch` : remettre l’ancienne valeur et `toast.error(...)`.

**Effort :** Faible | **Impact :** Bonne perception de réactivité

---

## Priorité 3 – Notifications et rappels

Vous avez déjà les migrations (relances, préférences, cron) et la doc `docs/NOTIFICATIONS_EMAIL.md`. Pour aller au bout :

- **Emails de relance** : Edge Function ou cron qui envoie un email « Pensez à relancer : [entreprise] – [poste] » aux utilisateurs qui ont des candidatures à relancer et `reminder_emails_enabled = true`.
- **Rappel entretien** : idem, la veille ou le jour J pour les candidatures avec `status = 'interview'` et `interview_date` renseigné.
- **Résumé hebdo** : Edge Function hebdo qui envoie un récap (nouvelles candidatures, statuts, relances à faire) si `weekly_summary_enabled = true`.

Cela demande la configuration d’un expéditeur email (Resend, SendGrid, etc.) et l’appel aux templates ou à une Edge Function d’envoi.

**Effort :** Moyen à élevé | **Impact :** Élevé (rétention, utilité)

---

## Priorité 4 – IA et contenu

### 4.1 Historique des lettres générées

**Objectif :** Sauvegarder les lettres générées (liées ou non à une candidature) pour les retrouver et les modifier.

**À faire :**
- Table `generated_letters` (user_id, title, content, application_id optionnel, created_at).
- Après génération dans `ModelesLettres.tsx`, proposer « Enregistrer cette lettre » et enregistrer en base.
- Page ou section « Mes lettres » (liste + détail) pour consultation / copie.

**Effort :** Moyen | **Impact :** Moyen

---

### 4.2 Historique des analyses CV

**Objectif :** Garder un historique des analyses « Conseils alternance » (et éventuellement ATS) pour comparer les versions.

**À faire :**
- Soit une table `cv_analyses` (user_id, cv_snapshot ou cv_id, type 'alternance'|'ats', result JSON ou text, created_at).
- Soit stocker la dernière analyse dans `user_cvs` (déjà ats_score + ats_analyzed_at ; vous pouvez ajouter un champ `last_advice_alternance`).
- Dans `ConseilsCV.tsx`, après une analyse, sauvegarder le résultat et afficher un lien « Voir la dernière analyse » ou une liste des analyses passées.

**Effort :** Moyen | **Impact :** Moyen

---

## Priorité 5 – Technique et maintenabilité

### 5.1 Unifier et documenter l’auth (Supabase vs backend)

Aujourd’hui les données et l’auth principale sont sur Supabase ; l’IA peut passer par le backend Express (JWT) ou par des Edge Functions. Pour éviter la confusion :

- **Documenter** dans le README : « Auth et données : Supabase. IA : backend Express si VITE_API_URL est défini, sinon Edge Functions Supabase. »
- Si vous voulez que l’analyse ATS (et autres appels IA) fonctionne avec la seule auth Supabase : soit le backend vérifie le JWT Supabase (avec la clé JWT du projet Supabase), soit vous déplacez ces appels dans des Edge Functions Supabase.

**Effort :** Moyen | **Impact :** Maintenabilité, moins d’erreurs 401/403

---

### 5.2 Tests

- **Backend :** Compléter les tests (auth, routes candidatures, AI controller) comme indiqué dans `backend/TESTS.md`.
- **E2E :** Un scénario type (login → créer une candidature → modifier le statut → voir le dashboard) avec Playwright ou Cypress.

**Effort :** Moyen à élevé | **Impact :** Confiance lors des mises à jour

---

### 5.3 Validation des entrées

- Étendre la validation (ex. schémas Zod ou Joi) à toutes les routes qui modifient des données (création/édition candidature, profil, etc.), côté backend si utilisé, et optionnellement côté frontend pour un retour immédiat.

**Effort :** Faible à moyen | **Impact :** Robustesse, moins d’erreurs métier

---

## Priorité 6 – Produit (plus tard)

- **Onboarding** : Après la première connexion, court parcours guidé (créer une candidature, remplir le profil, générer une lettre).
- **Graphiques dashboard** : Courbe des candidatures dans le temps, camembert par statut (les données existent déjà dans `getDashboardStatistics`).
- **PWA** : Manifest + Service Worker pour installation sur mobile et consultation hors ligne limitée.
- **Thème sombre** : Préférence dans le profil ou localStorage.
- **i18n** : Préparer les chaînes pour une version anglaise si besoin.

---

## Synthèse : par où commencer ?

| Ordre | Action | Fichiers principaux | Effort |
|-------|--------|---------------------|--------|
| 1 | Lettre depuis une candidature | `ApplicationForm.tsx`, `Applications.tsx`, `ModelesLettres.tsx` | Faible |
| 2 | Lien Coaching → Mes candidatures | `Coaching.tsx` | Très faible |
| 3 | Objectif candidatures (dashboard) | Profil / migration, `Dashboard.tsx`, `Profile.tsx` | Faible–moyen |
| 4 | Optimistic updates (statut / relance) | Composants liste + formulaire candidatures | Faible |
| 5 | Pagination liste candidatures | `supabaseService.ts`, `Applications.tsx` | Moyen |
| 6 | React Query / SWR | Hooks + `Dashboard.tsx`, `Applications.tsx` | Moyen |
| 7 | Notifications email (relances, entretiens) | Edge Functions, config email | Moyen–élevé |
| 8 | Historique lettres + analyses CV | Nouvelles tables, `ModelesLettres.tsx`, `ConseilsCV.tsx` | Moyen |

En commençant par les points 1 et 2, vous améliorez l’expérience avec peu de code. Ensuite, objectif dashboard et optimistic updates renforcent la perception de qualité ; pagination et cache deviennent utiles dès que le volume de données augmente.
