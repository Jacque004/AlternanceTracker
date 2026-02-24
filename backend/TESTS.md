# Guide de Tests - Authentification

Ce document décrit les tests disponibles pour l'authentification.

## Tests Automatisés

### Exécution des tests

```bash
cd backend
npm test
```

### Tests disponibles

#### 1. Test connexion valide
- **Fichier**: `src/__tests__/auth.controller.test.ts`
- **Description**: Vérifie qu'un utilisateur peut se connecter avec des identifiants valides
- **Scénario**: Email et mot de passe corrects
- **Résultat attendu**: Token JWT généré, utilisateur retourné

#### 2. Test email inexistant
- **Fichier**: `src/__tests__/auth.controller.test.ts`
- **Description**: Vérifie la gestion d'un email qui n'existe pas
- **Scénario**: Email non présent dans la base de données
- **Résultat attendu**: Erreur 401 avec message "Email ou mot de passe incorrect"

#### 3. Test mauvais mot de passe
- **Fichier**: `src/__tests__/auth.controller.test.ts`
- **Description**: Vérifie la gestion d'un mot de passe incorrect
- **Scénario**: Email valide mais mot de passe incorrect
- **Résultat attendu**: Erreur 401 avec message "Email ou mot de passe incorrect"

#### 4. Tests middleware auth
- **Fichier**: `src/__tests__/auth.middleware.test.ts`
- **Description**: Vérifie le fonctionnement du middleware d'authentification
- **Scénarios**:
  - Token valide
  - Token manquant
  - Token invalide
  - Token expiré
- **Résultat attendu**: Protection correcte des routes

## Tests Manuels (Frontend avec Supabase)

### Prérequis
1. Avoir un compte Supabase configuré
2. Avoir créé au moins un utilisateur de test

### Scénarios de test

#### Test 1: Connexion valide
1. Aller sur `/login`
2. Entrer un email valide et un mot de passe correct
3. Cliquer sur "Se connecter"
4. **Résultat attendu**: 
   - Message de succès "Connexion réussie !"
   - Redirection vers `/dashboard`
   - Session active

#### Test 2: Email inexistant
1. Aller sur `/login`
2. Entrer un email qui n'existe pas (ex: `inexistant@test.com`)
3. Entrer n'importe quel mot de passe
4. Cliquer sur "Se connecter"
5. **Résultat attendu**: 
   - Message d'erreur "Email ou mot de passe incorrect"
   - Pas de redirection
   - Reste sur la page de login

#### Test 3: Mauvais mot de passe
1. Aller sur `/login`
2. Entrer un email valide
3. Entrer un mot de passe incorrect
4. Cliquer sur "Se connecter"
5. **Résultat attendu**: 
   - Message d'erreur "Email ou mot de passe incorrect"
   - Pas de redirection
   - Reste sur la page de login

#### Test 4: Gestion expiration token
1. Se connecter avec succès
2. Attendre l'expiration du token (ou modifier manuellement la date d'expiration dans localStorage)
3. Essayer d'accéder à une page protégée
4. **Résultat attendu**: 
   - Redirection automatique vers `/login`
   - Session supprimée

#### Test 5: Redirection dashboard
1. Se connecter avec succès
2. **Résultat attendu**: 
   - Redirection automatique vers `/dashboard`
   - Affichage du contenu du dashboard

#### Test 6: Gestion erreurs réseau
1. Couper la connexion internet
2. Essayer de se connecter
3. **Résultat attendu**: 
   - Message d'erreur approprié
   - Pas de crash de l'application

## Couverture des tests

- ✅ Endpoint POST /login
- ✅ Comparaison bcrypt
- ✅ Génération JWT
- ✅ Middleware auth
- ✅ Gestion expiration token
- ✅ Formulaire login
- ✅ Stockage sécurisé token (Supabase gère automatiquement)
- ✅ Redirection dashboard
- ✅ Gestion erreurs
- ✅ Test mauvais mot de passe
- ✅ Test email inexistant
- ✅ Test connexion valide

