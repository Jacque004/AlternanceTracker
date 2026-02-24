# Ce qui manque pour qu’AlternanceTracker soit parfait pour un étudiant

## 1. Cœur métier : suivi des candidatures (priorité haute)

**Constat :** La base de données, le backend et les services frontend gèrent déjà les **candidatures** (CRUD + statistiques), mais **aucune page ne les affiche ni ne permet de les gérer**.

- **Tableau de bord / Mes candidatures**  
  - Liste de toutes les candidatures (entreprise, poste, statut, date).  
  - Filtres par statut (en attente, entretien, accepté, refusé).  
  - Indicateurs : nombre total, répartition par statut, évolution dans le temps (déjà calculés côté service : `getDashboardStatistics`).

- **Ajout d’une candidature**  
  - Formulaire : entreprise, poste, statut, date de candidature, date de réponse, notes, lieu, fourchette salariale, lien de l’offre.  
  - Enregistrement via `applicationService.create` (Supabase ou API selon config).

- **Modification / suppression**  
  - Édition d’une candidature existante (changer le statut après un entretien ou une réponse).  
  - Suppression si besoin.

Sans cette partie, l’app ne permet pas de “suivre” ses candidatures comme indiqué dans le Coaching et dans le nom “AlternanceTracker”.

---

## 2. Expérience utilisateur et vie étudiante

- **Page d’accueil après connexion**  
  - Aujourd’hui : redirection vers “Conseils CV”.  
  - Mieux : un vrai **tableau de bord** (résumé des candidatures + liens rapides vers Coaching, Conseils CV, ajout de candidature).

- **Rappels / relances**  
  - Rappel des candidatures “en attente” sans réponse depuis X jours (ex. 7–10 jours) pour encourager la relance (comme dans le Coaching).

- **Profil étudiant enrichi**  
  - Champs optionnels : école, formation, année, rythme d’alternance, date de début recherchée, lien LinkedIn.  
  - Utile pour personnaliser les conseils (CV, coaching) et plus tard des stats ou du matching.

- **Export / partage**  
  - Export des candidatures en CSV ou PDF (pour suivi perso ou partage avec un conseiller).

---

## 3. Cohérence avec le Coaching

- Le Coaching recommande de “tenir un tableau (entreprise, poste, date de candidature, relance, réponse)”.  
- **L’app doit être ce tableau** : une page “Mes candidatures” avec liste + formulaire d’ajout/édition comble ce manque.

- Option : dans le Coaching, ajouter un encadré du type “Suivez vos candidatures dans **Mes candidatures**” avec un lien vers la page.

---

## 4. Idées bonus (plus tard)

- **Calendrier des entretiens** : dates d’entretiens liées aux candidatures.  
- **Pièces jointes** : stocker CV/lettre envoyés par candidature (Supabase Storage).  
- **Modèles de lettres** : templates de lettres de motivation par type d’entreprise.  
- **Notifications** : email ou push pour “Relancer la candidature X” après 7–10 jours.  
- **Mode hors-ligne / PWA** : consulter et ajouter des candidatures sans réseau.  
- **Statistiques personnelles** : taux de réponse, délai moyen, nombre de candidatures par mois (les données existent déjà via `getDashboardStatistics`).

---

## 5. Résumé des priorités

| Priorité | Élément | Impact |
|----------|--------|--------|
| **P0** | Page “Mes candidatures” (liste + filtres) | Cœur métier de l’app |
| **P0** | Formulaire “Ajouter une candidature” | Indispensable pour utiliser le suivi |
| **P0** | Modifier / supprimer une candidature | Mise à jour du statut (entretien, accepté, refusé) |
| **P1** | Tableau de bord d’accueil avec stats | Vue d’ensemble et motivation |
| **P1** | Rappel “candidatures à relancer” | Aligne l’app avec le Coaching |
| **P2** | Profil enrichi (formation, école, etc.) | Meilleure personnalisation |
| **P2** | Export CSV/PDF | Pratique pour l’étudiant et les conseillers |

En implémentant au minimum les éléments **P0**, l’app devient réellement un outil de suivi des candidatures pour un étudiant en quête d’alternance, en plus des conseils CV et du Coaching déjà présents.
