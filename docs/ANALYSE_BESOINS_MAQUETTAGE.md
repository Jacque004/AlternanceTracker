# Analyse des besoins et maquettage

## Cibles utilisateurs

- Etudiants et jeunes diplomes en recherche d'alternance/emploi
- Utilisateurs souhaitant structurer et suivre leurs candidatures

## Besoins fonctionnels

- Centraliser les candidatures et leur statut
- Suivre les relances et les dates cles
- Generer ou analyser des contenus de candidature avec l'IA
- Obtenir une vue synthese (tableau de bord)

## Parcours principaux

1. Inscription / connexion
2. Creation d'une candidature
3. Mise a jour du statut jusqu'a la decision finale
4. Consultation du dashboard et des statistiques

## Maquettage (niveau projet)

- Ecran authentification: `frontend/src/pages/Login.tsx`, `Register.tsx`
- Ecran gestion candidatures: `frontend/src/pages/Applications.tsx`, `ApplicationForm.tsx`
- Ecran pilotage: `frontend/src/pages/HomeRoute.tsx`, `Calendar.tsx`

## Criteres UX

- Navigation claire par sections
- Acces protege aux pages privees
- Retour utilisateur visible (notifications, etats de chargement)
- Cohesion visuelle sur les composants principaux

