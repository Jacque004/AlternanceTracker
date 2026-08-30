# 📦 Rapport NPM Audit

**Date :** 30 août 2026  
**Projet :** AlternanceTracker

---

## ✅ BACKEND : Toutes vulnérabilités corrigées !

```bash
npm audit fix
```

**Résultat :** ✅ **0 vulnérabilités**

**Packages mis à jour :** 21 packages

---

## ⚠️ FRONTEND : 12 vulnérabilités restantes

### État après `npm audit fix --legacy-peer-deps`

**Total :** 12 vulnérabilités
- 🔴 **1 CRITIQUE**
- 🟠 **8 HAUTES**
- 🟡 **3 MOYENNES**

---

### 🔴 CRITIQUE (1)

#### Vitest < 3.2.6
**CVE :** GHSA-5xrq-8626-4rwp  
**Score :** Critique  
**Description :** Lecture/exécution de fichiers arbitraires via Vitest UI  
**Version actuelle :** 3.2.4  
**Fix disponible :** vitest@4.1.11 (breaking change)

**Action recommandée :**
```bash
cd frontend
npm install vitest@latest --save-dev
npm test # Vérifier que les tests passent toujours
```

**Impact :** Dev uniquement (Vitest n'est pas déployé en production)

---

### 🟠 HAUTES (8)

#### 1. minimatch 9.0.0 - 9.0.6
**CVE :** GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74  
**Description :** ReDoS via wildcards répétés  
**Affecte :**
- @typescript-eslint/typescript-estree
- @typescript-eslint/parser
- @typescript-eslint/type-utils
- @typescript-eslint/eslint-plugin
- @typescript-eslint/utils

**Action recommandée :**
```bash
npm update @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev
```

---

#### 2. pdfjs-dist >= 5.6.83 < 6.2.108
**CVE :** GHSA-hq66-cqwq-w95j  
**Description :** Exécution JavaScript arbitraire via PDF malveillant  
**Version actuelle :** Entre 5.6.83 et 6.2.107  
**Fix disponible :** pdfjs-dist@6.3.289 (breaking change)

**Action recommandée :**
```bash
npm install pdfjs-dist@latest
# Tester la génération de CV PDF
```

**Impact :** Fonctionnalité génération CV PDF à tester

---

#### 3. react-router 6.0.0 - 7.17.0
**CVE :** GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg  
**Description :**
- Open redirect via backslash dans <Link>
- Injection de constructeur via deserializeErrors()

**Version actuelle :** Entre 6.0.0 et 7.17.0  
**Fix disponible :** react-router-dom@7.18.3 (breaking change)

**Action recommandée :**
```bash
npm install react-router-dom@latest
# Tester toutes les routes et navigations
```

**Impact :** Toutes les routes de l'application

---

### 🟡 MOYENNES (3)

#### esbuild <= 0.24.2
**CVE :** GHSA-67mh-4wv8-2f99  
**Description :** Dev server peut recevoir des requêtes de n'importe quel site  
**Fix disponible :** via vite@8.2.2 (breaking change)

**Action recommandée :**
```bash
npm install vite@latest
# Tester npm run dev
```

**Impact :** Dev uniquement

---

## 🎯 PLAN D'ACTION

### Priorité IMMÉDIATE

```bash
# 1. Vitest (CRITIQUE - dev only)
cd frontend
npm install vitest@latest --save-dev
npm test

# 2. TypeScript-ESLint (HAUTE - dev only)
npm update @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev
npm run lint
```

### Priorité HAUTE (avec testing)

```bash
# 3. pdfjs-dist (HAUTE - production)
npm install pdfjs-dist@latest
# Test: Générer un CV PDF dans l'app

# 4. react-router-dom (HAUTE - production)
npm install react-router-dom@latest
# Test: Toutes les routes de l'app

# 5. vite (MOYENNE - dev only)
npm install vite@latest
# Test: npm run dev et npm run build
```

---

## 🧪 TESTS APRÈS MISE À JOUR

### Test vitest
```bash
cd frontend
npm test
```

### Test pdfjs-dist
1. Se connecter à l'app
2. Aller dans Profil → CV
3. Générer un CV PDF
4. Vérifier que le PDF est correctement généré

### Test react-router-dom
1. Tester toutes les routes :
   - `/` → Landing
   - `/login` → Login
   - `/register` → Register
   - `/dashboard` → Dashboard
   - `/applications` → Applications
   - `/applications/new` → Nouveau
   - `/applications/:id` → Détail
   - `/profile` → Profil
   - `/calendar` → Calendrier
2. Tester la navigation avec <Link>
3. Tester useNavigate()

### Test vite
```bash
npm run dev    # Dev server
npm run build  # Production build
npm run preview # Preview du build
```

---

## 📊 RÉCAPITULATIF

### Avant npm audit fix
- **Backend :** 4 vulnérabilités (2 low, 2 high)
- **Frontend :** ~26 vulnérabilités

### Après npm audit fix
- **Backend :** ✅ 0 vulnérabilités (100% corrigé !)
- **Frontend :** 12 vulnérabilités (breaking changes requis)

### Vulnérabilités restantes

| Package | Sévérité | Prod/Dev | Breaking Change |
|---------|----------|----------|-----------------|
| vitest | 🔴 Critique | Dev | Oui |
| minimatch | 🟠 Haute | Dev | Non |
| pdfjs-dist | 🟠 Haute | Prod | Oui |
| react-router | 🟠 Haute | Prod | Oui |
| esbuild | 🟡 Moyenne | Dev | Oui (via vite) |

**Production :** 2 vulnérabilités hautes (pdfjs-dist, react-router)  
**Dev uniquement :** 1 critique + 7 hautes/moyennes

---

## ⚠️ NOTES IMPORTANTES

1. **Vitest (CRITIQUE)** : Dev uniquement, ne pas déployer Vitest UI en production
2. **pdfjs-dist & react-router** : Production, nécessitent tests avant déploiement
3. **Breaking changes** : Toutes les mises à jour majeures peuvent casser du code
4. **Dependabot** : Configuré pour surveiller et créer des PRs automatiquement

---

## ✅ COMMANDES COMPLÈTES

```bash
# Tout en une fois (avec testing)
cd C:\\xampp\\htdocs\\AlternanceTracker\\frontend

# 1. Sauvegarder package.json
cp package.json package.json.backup

# 2. Mettre à jour tout
npm install vitest@latest --save-dev
npm update @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev
npm install pdfjs-dist@latest
npm install react-router-dom@latest
npm install vite@latest --save-dev

# 3. Tester
npm test
npm run lint
npm run dev

# 4. Si tout fonctionne
rm package.json.backup
git add package.json package-lock.json
git commit -m "deps: Update npm dependencies to fix vulnerabilities"

# 5. Si problèmes
mv package.json.backup package.json
npm install
```

---

## 🎯 IMPACT SUR LE SCORE DE SÉCURITÉ

### Avec frontend non corrigé
**Score global :** 87% (20/23 corrigées + 12 vulnérabilités npm)

### Avec frontend corrigé (après plan d'action)
**Score global :** 95%+ (20/23 + 0 vulnérabilités npm critiques)

---

**Créé le :** 30 août 2026  
**Prochaine action :** Mettre à jour les packages frontend avec breaking changes
