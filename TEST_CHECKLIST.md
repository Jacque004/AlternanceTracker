# Checklist de test – AlternanceTracker

## ✅ Vérifications automatiques (déjà faites)

- **Frontend** : `npm run build` (dans `frontend/`) → **OK**
- **Backend** : test d’application mis à jour (paramètres `id` en string). Les tests peuvent être relancés avec `npm run test` dans `backend/`.

---

## Tests manuels recommandés

### 1. Connexion / Inscription
- [ ] Page Login : saisir email/mot de passe → connexion → redirection vers le tableau de bord
- [ ] Lien « Créer un compte » → formulaire Register → inscription → message de confirmation
- [ ] Erreur « Email ou mot de passe incorrect » affichée en cas de mauvaise saisie

### 2. Navigation
- [ ] **Desktop** : tous les onglets visibles (Tableau de bord, Mes candidatures, Conseils CV, Analyser une offre, Coaching, Modèles de lettres, Profil)
- [ ] **Mobile / tablette** : menu hamburger → ouverture du panneau → tous les liens accessibles
- [ ] Clic sur le logo « AlternanceTracker » → retour au tableau de bord
- [ ] Au clavier : Tab jusqu’au lien « Aller au contenu principal » → Entrée → focus sur le contenu

### 3. Tableau de bord
- [ ] Affichage des cartes (Ajouter une candidature, Mes candidatures, Modèles de lettres, Coaching, Conseils CV, Analyser une offre)
- [ ] Si aucune candidature : message « Aucune candidature » + lien « Ajouter une candidature »
- [ ] Si des candidatures existent : stats (Total, En attente, Entretiens, Acceptées), « Dernières candidatures », éventuellement « Candidatures à relancer »

### 4. Mes candidatures
- [ ] Liste des candidatures avec filtre par statut
- [ ] Clic sur une ligne → formulaire d’édition
- [ ] « Ajouter une candidature » → formulaire de création → enregistrement → retour à la liste
- [ ] Boutons « Export CSV » et « Export PDF » (au moins un export vérifié)

### 5. Conseils CV
- [ ] Coller un texte de CV (≥ 50 caractères) → « Analyser mon CV » → affichage des conseils (si Supabase + IA configurés)

### 6. Analyser une offre
- [ ] Saisir une URL d’offre ou coller le texte → « Analyser l’offre et obtenir des conseils » → affichage des conseils (si la fonction Edge est déployée et les clés API configurées)

### 7. Coaching
- [ ] Ouverture/fermeture des sections (CV, Lettre, Stratégie, Réseau, Entretien, Relances)
- [ ] Liens « Mes candidatures » et « Modèles de lettres » fonctionnels

### 8. Modèles de lettres
- [ ] Ouverture de chaque type (PME, Grande entreprise, Startup, etc.) → affichage du modèle
- [ ] « Copier le modèle » → contenu copié dans le presse-papier

### 9. Profil
- [ ] Modification Prénom / Nom / champs étudiant (école, formation, etc.) → Enregistrer → message de succès
- [ ] Déconnexion → redirection vers la page de connexion

---

## En cas de problème

- **Conseils CV / Analyser une offre ne répondent pas** : vérifier `.env` (frontend) et clés API (Supabase Edge Functions).
- **Erreur de build** : `cd frontend && npm run build` pour voir les erreurs TypeScript.
- **Tests backend** : `cd backend && npm run test` (en cas d’out of memory, lancer avec moins de workers ou plus de mémoire Node si besoin).
