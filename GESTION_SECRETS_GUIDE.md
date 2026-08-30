# 🔐 Guide - Gestion Sécurisée des Secrets

**Date :** 30 août 2026  
**Projet :** AlternanceTracker  
**Objectif :** Sécuriser le stockage et la gestion des secrets (clés API, tokens, mots de passe)

---

## ⚠️ PROBLÈME ACTUEL

Actuellement, les secrets sont stockés dans des fichiers `.env` en texte clair :

```bash
# backend/.env
JWT_SECRET=mon-secret-en-clair
OPENAI_API_KEY=sk-xxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@localhost/db
```

**Risques :**
- ❌ Secrets en texte clair sur le disque
- ❌ Risque de commit accidentel dans Git
- ❌ Accès à tous les secrets si un fichier fuite
- ❌ Pas de rotation automatique
- ❌ Pas d'audit des accès
- ❌ Difficile de révoquer un secret compromis

---

## ✅ SOLUTIONS RECOMMANDÉES

### 🏆 Option 1 : AWS Secrets Manager (Recommandé pour production)

**Avantages :**
- ✅ Chiffrement automatique (AWS KMS)
- ✅ Rotation automatique des secrets
- ✅ Audit complet (AWS CloudTrail)
- ✅ Contrôle d'accès IAM
- ✅ Versioning des secrets
- ✅ Intégration native AWS

**Coût :** ~$0.40/secret/mois + $0.05 per 10,000 appels API

#### Installation

```bash
npm install @aws-sdk/client-secrets-manager
```

#### Configuration

```typescript
// backend/src/config/secrets.ts
import { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'eu-west-1',
});

// Cache des secrets pour éviter trop d'appels API
const secretsCache: Map<string, { value: string; expires: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName: string): Promise<string> {
  // Vérifier le cache
  const cached = secretsCache.get(secretName);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} not found`);
    }

    // Mettre en cache
    secretsCache.set(secretName, {
      value: response.SecretString,
      expires: Date.now() + CACHE_TTL,
    });

    return response.SecretString;
  } catch (error: any) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw new Error(`Failed to fetch secret: ${error.message}`);
  }
}

// Fonction helper pour secrets JSON
export async function getSecretJSON(secretName: string): Promise<Record<string, string>> {
  const secretString = await getSecret(secretName);
  return JSON.parse(secretString);
}

// Initialiser les secrets au démarrage
export async function initSecrets(): Promise<void> {
  try {
    // Charger les secrets critiques
    const secrets = await getSecretJSON('alternance-tracker/production');
    
    // Définir comme variables d'environnement (pour compatibilité)
    process.env.JWT_SECRET = secrets.JWT_SECRET;
    process.env.OPENAI_API_KEY = secrets.OPENAI_API_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('✅ Secrets loaded from AWS Secrets Manager');
  } catch (error) {
    console.error('❌ Failed to load secrets:', error);
    process.exit(1); // Ne pas démarrer si les secrets ne sont pas accessibles
  }
}
```

#### Modification de index.ts

```typescript
// backend/src/index.ts
import 'dotenv/config';
import { initSecrets } from './config/secrets';

async function start() {
  // Charger les secrets AVANT tout le reste
  if (process.env.NODE_ENV === 'production') {
    await initSecrets();
  }

  // Le reste du code d'initialisation...
  const app = express();
  // ...
}

start().catch(console.error);
```

#### Création des secrets dans AWS

```bash
# Via AWS CLI
aws secretsmanager create-secret \
  --name alternance-tracker/production \
  --description "AlternanceTracker production secrets" \
  --secret-string '{
    "JWT_SECRET": "votre-secret-jwt",
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxx",
    "SUPABASE_SERVICE_ROLE_KEY": "xxxxxxxxxxxx",
    "CSRF_SECRET": "votre-secret-csrf"
  }' \
  --region eu-west-1

# Activer la rotation automatique (optionnel)
aws secretsmanager rotate-secret \
  --secret-id alternance-tracker/production \
  --rotation-lambda-arn arn:aws:lambda:eu-west-1:xxx:function:rotate-secrets \
  --rotation-rules AutomaticallyAfterDays=30
```

#### Permissions IAM requises

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:eu-west-1:*:secret:alternance-tracker/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:eu-west-1:*:key/*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.eu-west-1.amazonaws.com"
        }
      }
    }
  ]
}
```

---

### 🥈 Option 2 : HashiCorp Vault (Recommandé pour infrastructure complexe)

**Avantages :**
- ✅ Multi-cloud (AWS, Azure, GCP)
- ✅ Secrets dynamiques (génération à la demande)
- ✅ Rotation automatique
- ✅ Audit complet
- ✅ Chiffrement in-transit et at-rest
- ✅ Open-source

**Coût :** Gratuit (self-hosted) ou HCP Vault (~$0.03/heure)

#### Installation

```bash
npm install node-vault
```

#### Configuration

```typescript
// backend/src/config/vault.ts
import vault from 'node-vault';

const client = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
  token: process.env.VAULT_TOKEN,
});

export async function getVaultSecret(path: string): Promise<Record<string, any>> {
  try {
    const result = await client.read(`secret/data/${path}`);
    return result.data.data; // Vault KV v2
  } catch (error: any) {
    console.error(`Error reading secret ${path}:`, error);
    throw new Error(`Failed to read secret: ${error.message}`);
  }
}

export async function initVaultSecrets(): Promise<void> {
  try {
    const secrets = await getVaultSecret('alternance-tracker/production');
    
    process.env.JWT_SECRET = secrets.JWT_SECRET;
    process.env.OPENAI_API_KEY = secrets.OPENAI_API_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('✅ Secrets loaded from Vault');
  } catch (error) {
    console.error('❌ Failed to load secrets from Vault:', error);
    process.exit(1);
  }
}
```

#### Stockage dans Vault

```bash
# Activer KV secrets engine
vault secrets enable -version=2 kv

# Créer les secrets
vault kv put secret/alternance-tracker/production \
  JWT_SECRET="votre-secret" \
  OPENAI_API_KEY="sk-xxx" \
  SUPABASE_SERVICE_ROLE_KEY="xxx" \
  CSRF_SECRET="xxx"

# Lire les secrets
vault kv get secret/alternance-tracker/production
```

---

### 🥉 Option 3 : Variables d'environnement chiffrées

**Avantages :**
- ✅ Simple à implémenter
- ✅ Pas de dépendance externe
- ✅ Gratuit

**Inconvénients :**
- ❌ Pas de rotation automatique
- ❌ Pas d'audit
- ❌ Gestion manuelle

#### Installation

```bash
npm install dotenv-encrypted
```

#### Usage

```typescript
// backend/src/index.ts
import 'dotenv-encrypted/config';

// Secrets automatiquement déchiffrés depuis .env.encrypted
```

Créer `.env.encrypted` :

```bash
# Chiffrer les secrets
npx dotenv-encrypted encrypt

# Résultat: .env.encrypted (chiffré) + .env.key (clé de déchiffrement)
```

**Important :**
- Commiter `.env.encrypted` (sûr)
- NE JAMAIS commiter `.env.key`
- Stocker `.env.key` dans AWS Secrets Manager ou en variable d'environnement

---

### 🏅 Option 4 : Google Cloud Secret Manager

**Avantages :**
- ✅ Intégration GCP
- ✅ Rotation automatique
- ✅ Audit (Cloud Logging)
- ✅ IAM granulaire

```bash
npm install @google-cloud/secret-manager
```

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

async function getGCPSecret(name: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${name}/versions/latest`,
  });
  
  return version.payload?.data?.toString() || '';
}
```

---

### 🏅 Option 5 : Azure Key Vault

**Avantages :**
- ✅ Intégration Azure
- ✅ HSM-backed keys
- ✅ Rotation automatique

```bash
npm install @azure/keyvault-secrets @azure/identity
```

```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  `https://${VAULT_NAME}.vault.azure.net`,
  credential
);

async function getAzureSecret(name: string): Promise<string> {
  const secret = await client.getSecret(name);
  return secret.value || '';
}
```

---

## 🎯 COMPARAISON DES SOLUTIONS

| Critère | AWS SM | Vault | Dotenv-enc | GCP SM | Azure KV |
|---------|--------|-------|------------|--------|----------|
| **Coût** | 💰💰 | 💰 | Gratuit | 💰💰 | 💰💰 |
| **Facilité** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Rotation auto** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Audit** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Multi-cloud** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Sécurité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Recommandation :**
- **Production sur AWS** : AWS Secrets Manager
- **Multi-cloud ou infrastructure complexe** : HashiCorp Vault
- **Startup/petite équipe** : Dotenv-encrypted
- **Production sur GCP** : Google Cloud Secret Manager
- **Production sur Azure** : Azure Key Vault

---

## 🔒 BONNES PRATIQUES

### 1. Principe du moindre privilège

```typescript
// ❌ Mauvais: Accès à tous les secrets
const secrets = await getAllSecrets();

// ✅ Bon: Accès uniquement aux secrets nécessaires
const jwtSecret = await getSecret('JWT_SECRET');
```

### 2. Rotation régulière

```bash
# Rotation manuelle (AWS)
aws secretsmanager update-secret \
  --secret-id alternance-tracker/JWT_SECRET \
  --secret-string "nouveau-secret"

# Rotation automatique (tous les 30 jours)
aws secretsmanager rotate-secret \
  --secret-id alternance-tracker/JWT_SECRET \
  --rotation-rules AutomaticallyAfterDays=30
```

### 3. Ne jamais logger les secrets

```typescript
// ❌ Mauvais
console.log('JWT Secret:', process.env.JWT_SECRET);

// ✅ Bon
console.log('JWT Secret: [REDACTED]');
logger.info('Using JWT authentication', { hasSecret: !!process.env.JWT_SECRET });
```

### 4. Secrets différents par environnement

```
alternance-tracker/
  ├── development/
  │   ├── JWT_SECRET
  │   └── OPENAI_API_KEY
  ├── staging/
  │   ├── JWT_SECRET
  │   └── OPENAI_API_KEY
  └── production/
      ├── JWT_SECRET
      └── OPENAI_API_KEY
```

### 5. Vérifier l'accès aux secrets au démarrage

```typescript
async function validateSecrets(): Promise<void> {
  const required = ['JWT_SECRET', 'OPENAI_API_KEY', 'SUPABASE_URL'];
  
  for (const secret of required) {
    if (!process.env[secret]) {
      throw new Error(`Missing required secret: ${secret}`);
    }
  }
  
  console.log('✅ All required secrets are present');
}
```

### 6. Utiliser des secrets éphémères quand possible

```typescript
// Générer des tokens temporaires au lieu de clés permanentes
const temporaryToken = await generateTemporaryDatabaseCredentials({
  database: 'alternance-tracker',
  ttl: 3600, // 1 heure
});
```

---

## 🚀 MIGRATION PLAN

### Étape 1 : Choisir la solution

Sélectionner la solution adaptée selon :
- Infrastructure actuelle (AWS, GCP, Azure, on-premise)
- Budget
- Taille de l'équipe
- Complexité acceptée

### Étape 2 : Setup infrastructure

**AWS Secrets Manager :**
```bash
# 1. Créer les secrets
aws secretsmanager create-secret --name alternance-tracker/production --secret-string '{...}'

# 2. Configurer IAM
aws iam create-role --role-name AlternanceTrackerAppRole
aws iam attach-role-policy --role-name AlternanceTrackerAppRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### Étape 3 : Modifier le code

1. Installer les dépendances
2. Créer `config/secrets.ts`
3. Modifier `index.ts` pour charger les secrets
4. Tester en local avec secrets de dev
5. Déployer en staging
6. Déployer en production

### Étape 4 : Migrer les secrets

```bash
# Script de migration
node scripts/migrate-secrets-to-aws.js
```

```javascript
// scripts/migrate-secrets-to-aws.js
require('dotenv').config();
const { SecretsManagerClient, CreateSecretCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: 'eu-west-1' });

async function migrateSecrets() {
  const secrets = {
    JWT_SECRET: process.env.JWT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CSRF_SECRET: process.env.CSRF_SECRET,
  };

  const command = new CreateSecretCommand({
    Name: 'alternance-tracker/production',
    SecretString: JSON.stringify(secrets),
    Description: 'AlternanceTracker production secrets',
  });

  await client.send(command);
  console.log('✅ Secrets migrated to AWS Secrets Manager');
}

migrateSecrets().catch(console.error);
```

### Étape 5 : Supprimer les anciens .env

```bash
# Après confirmation que tout fonctionne
rm backend/.env
rm frontend/.env

# Ajouter au .gitignore (si pas déjà fait)
echo "*.env*" >> .gitignore
```

---

## 📊 CHECKLIST DE SÉCURITÉ

- [ ] Les secrets ne sont plus en texte clair
- [ ] `.env` n'est jamais commité dans Git
- [ ] Rotation automatique configurée (30-90 jours)
- [ ] Audit des accès activé
- [ ] Principe du moindre privilège appliqué
- [ ] Secrets différents par environnement
- [ ] Validation au démarrage
- [ ] Pas de logging des secrets
- [ ] Backup des secrets (hors du code)
- [ ] Documentation de la procédure de rotation
- [ ] Plan de révocation en cas de compromission

---

## 🆘 EN CAS DE COMPROMISSION

### Étapes immédiates

1. **Révoquer le secret compromis**
   ```bash
   aws secretsmanager update-secret \
     --secret-id alternance-tracker/JWT_SECRET \
     --secret-string "nouveau-secret-genere"
   ```

2. **Invalider tous les tokens JWT en cours**
   ```typescript
   // Incrémenter la version du secret ou changer complètement
   // Tous les tokens signés avec l'ancien secret seront invalides
   ```

3. **Auditer les accès**
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=ResourceName,AttributeValue=alternance-tracker/JWT_SECRET \
     --start-time 2026-08-01 \
     --end-time 2026-08-30
   ```

4. **Notifier l'équipe**

5. **Post-mortem**
   - Comment le secret a fuité
   - Quels systèmes ont été affectés
   - Actions correctives

---

## 💡 COÛT ESTIMÉ

### AWS Secrets Manager (Production moyenne)

```
Secrets: 10 secrets × $0.40 = $4.00/mois
API calls: 100,000 calls × $0.05/10k = $0.50/mois
-------------------------------------------
Total: $4.50/mois (~$54/an)
```

### HashiCorp Vault (Self-hosted)

```
Serveur EC2 t3.small: $15/mois
Stockage: $1/mois
-------------------------------------------
Total: $16/mois (~$192/an)
```

### HCP Vault (Managed)

```
Cluster: $0.03/heure × 730 heures = $22/mois
-------------------------------------------
Total: $22/mois (~$264/an)
```

---

## 📚 RESSOURCES

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [Google Secret Manager](https://cloud.google.com/secret-manager)
- [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Créé le :** 30 août 2026  
**Statut :** ✅ Prêt à implémenter  
**Recommandation :** AWS Secrets Manager pour production
