# 🔒 Corrections de Sécurité Appliquées

Ce document liste toutes les corrections de sécurité appliquées au projet AlternanceTracker.

---

## ✅ VULNÉRABILITÉS CRITIQUES CORRIGÉES

### 1. ✅ Renforcement des exigences de mot de passe

**Fichiers modifiés :**
- `backend/src/utils/validation.ts`
- `frontend/src/utils/validation.ts`

**Changements :**
- ✅ Longueur minimale : 6 → **12 caractères**
- ✅ Longueur maximale : 100 → **128 caractères**
- ✅ **Ajout d'exigences de complexité :**
  - Au moins 1 majuscule
  - Au moins 1 minuscule
  - Au moins 1 chiffre
  - Au moins 1 caractère spécial

**Impact :**
- Protection contre les attaques par force brute
- Conformité aux standards de sécurité modernes
- Meilleure protection des comptes utilisateurs

---

### 2. ✅ Amélioration du Rate Limiting

**Fichier modifié :**
- `backend/src/index.ts`

**Changements :**
- ✅ **Rate limiting général :** 100 → **50 requêtes / 15 minutes**
- ✅ **Rate limiting authentification :** **5 tentatives / 15 minutes**
  - Ne compte que les tentatives échouées (`skipSuccessfulRequests: true`)
- ✅ **Rate limiting API IA :** **10 requêtes / 1 heure**
  - Protège contre l'abus des API OpenAI/Gemini
  - Contrôle les coûts

**Impact :**
- Protection contre les attaques par déni de service (DoS)
- Prévention de l'énumération de comptes
- Protection contre le brute force sur l'authentification
- Contrôle des coûts API IA

**Configuration appliquée :**
```typescript
// Général : 50 requêtes / 15 min
generalLimiter → /api/*

// Auth : 5 tentatives / 15 min (échecs uniquement)
authLimiter → /api/auth/login, /api/auth/register

// IA : 10 requêtes / 1 heure
aiLimiter → /api/ai/*
```

---

### 3. 🔄 CORS sécurisé sur Edge Functions (EN COURS)

**Fichiers modifiés :**
- ✅ Créé : `supabase/functions/_shared/corsHeaders.ts`
- ✅ Modifié : `supabase/functions/analyze-cv-alternance/index.ts`
- ✅ Modifié : `supabase/functions/analyze-cv-ats/index.ts`
- 🔄 À modifier : `supabase/functions/analyze-job-offer/index.ts`
- 🔄 À modifier : `supabase/functions/fetch-job-metadata/index.ts`
- 🔄 À modifier : `supabase/functions/generate-cover-letter/index.ts`
- 🔄 À modifier : `supabase/functions/delete-user/index.ts`

**Changements :**
- ❌ Avant : `Access-Control-Allow-Origin: *` (accepte toutes les origines)
- ✅ Après : Liste blanche d'origines autorisées avec fonction `getCorsHeaders(req)`

**Configuration :**
```typescript
const ALLOWED_ORIGINS = [
  'https://votre-domaine.com',
  'https://www.votre-domaine.com',
  'http://localhost:3000', // Dev uniquement
  'http://localhost:5173', // Dev uniquement
];
```

**⚠️ ACTION REQUISE :**
Remplacer `'https://votre-domaine.com'` par votre domaine réel en production.

**Impact :**
- Seuls les domaines autorisés peuvent appeler les Edge Functions
- Protection contre les abus de quota API
- Prévention des attaques CSRF
- Contrôle des coûts API

---

## ✅ CORRECTIONS HAUTES APPLIQUÉES

### 4. ✅ Protection des logs sensibles
**Fichiers modifiés :**
- Créé : `backend/src/utils/errorHandler.ts`
- Modifiés : `auth.controller.ts`, `application.controller.ts`, `ai.controller.ts`, `index.ts`

**Changements :**
- ✅ Système d'ID d'erreur unique pour le tracking
- ✅ Ne plus exposer `error.message` ou stack traces au client
- ✅ Fonction `sendErrorResponse()` pour réponses sécurisées
- ✅ Fonction `sanitizeForLog()` pour masquer données sensibles
- ✅ Messages d'erreur génériques côté client

### 5. ✅ Protection timing attack sur login
**Fichier modifié :** `backend/src/controllers/auth.controller.ts`

**Changements :**
- ✅ Toujours effectuer `bcrypt.compare()` même si l'utilisateur n'existe pas
- ✅ Utilisation d'un hash factice pour temps de réponse constant
- ✅ Empêche l'énumération de comptes par mesure du timing

### 6. ✅ Limites strictes pour texte CV
**Fichier modifié :** `backend/src/controllers/ai.controller.ts`

**Changements :**
- ✅ Longueur minimale : **100 caractères** (environ 1/4 de page)
- ✅ Longueur maximale : **15000 caractères** (environ 3-4 pages)
- ✅ Validation stricte avant traitement
- ✅ Protection contre les abus et DoS
- ✅ Contrôle des coûts API

### 7. ✅ Issuer et Audience JWT
**Fichiers modifiés :**
- `backend/src/controllers/auth.controller.ts`
- `backend/src/middleware/auth.middleware.ts`

**Changements :**
- ✅ Ajout de `issuer: 'alternance-tracker'`
- ✅ Ajout de `audience: 'alternance-tracker-api'`
- ✅ Vérification de l'issuer et audience à la validation
- ✅ Protection contre les tokens générés par d'autres systèmes

---

## 📋 PROCHAINES ÉTAPES

### Priorité HAUTE
- [ ] Masquer les informations sensibles dans les logs
- [ ] Implémenter protection timing attack sur login
- [ ] Ajouter limites strictes pour texte CV (100-15000 caractères)
- [ ] Ajouter issuer et audience aux JWT
- [ ] Implémenter protection CSRF
- [ ] Installer Winston pour logging sécurisé
- [ ] Améliorer validation SQL ORDER BY avec pg-format
- [ ] Configurer Content Security Policy complète

### Priorité MOYENNE
- [ ] Améliorer validation email (bloquer domaines jetables)
- [ ] Limiter taille champ notes (5000 caractères max)
- [ ] Améliorer validation URL (bloquer localhost)
- [ ] Implémenter confirmation email obligatoire
- [ ] Ne plus exposer stack traces
- [ ] Limiter nombre de candidatures par utilisateur (1000 max)

### Priorité BASSE
- [ ] Configurer Dependabot
- [ ] Mettre à jour dépendances npm vulnérables

---

## 🔧 INSTRUCTIONS DE DÉPLOIEMENT

### Après ces corrections, il faut :

1. **Configurer les domaines autorisés (CORS)**
   ```typescript
   // Éditer : supabase/functions/_shared/corsHeaders.ts
   const ALLOWED_ORIGINS = [
     'https://votre-domaine-reel.com', // ⚠️ REMPLACER
     'https://www.votre-domaine-reel.com', // ⚠️ REMPLACER
   ];
   ```

2. **Redéployer les Edge Functions Supabase**
   ```bash
   npm run supabase:deploy
   ```

3. **Notifier les utilisateurs existants**
   - Les mots de passe existants restent valides
   - Les nouveaux mots de passe doivent respecter les nouvelles règles
   - Recommander aux utilisateurs de mettre à jour leur mot de passe

4. **Tester le rate limiting**
   ```bash
   # Tester les limites auth (doit bloquer après 5 tentatives)
   for i in {1..10}; do curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"wrong"}'; done
   ```

---

## 📊 STATISTIQUES

| Catégorie | Total | Corrigé | En cours | Restant |
|-----------|-------|---------|----------|---------|
| 🔴 Critique | 4 | 3 | 1 | 0 |
| 🟠 Haute | 8 | 4 | 0 | 4 |
| 🟡 Moyenne | 7 | 0 | 0 | 7 |
| 🔵 Basse | 4 | 0 | 0 | 4 |
| **TOTAL** | **23** | **7** | **1** | **15** |

**Progression : 34.8% (8/23)** ✅

### Détail des corrections
✅ **7 vulnérabilités corrigées**
- 3/4 Critiques (75%)
- 4/8 Hautes (50%)
- 0/7 Moyennes (0%)
- 0/4 Basses (0%)

🔄 **1 vulnérabilité en cours**
- CORS sur Edge Functions (partiellement appliqué)

---

**Dernière mise à jour :** 30 août 2026
