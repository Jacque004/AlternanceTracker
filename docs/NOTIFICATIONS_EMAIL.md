# Rappels et résumé hebdo par email

Ce guide explique comment activer l’envoi d’emails pour les **rappels** (relances, entretiens à venir) et le **résumé hebdomadaire**, en s’appuyant sur la structure déjà en place (préférences dans le profil, colonnes en base).

## Vue d’ensemble

| Fonctionnalité | Edge Function | Déclencheur suggéré | Contenu |
|----------------|---------------|---------------------|---------|
| **Rappels** (relances + entretiens) | `send-reminders` | Quotidien (ex. 8h) | Liste des candidatures à relancer et des entretiens à venir (aujourd’hui/demain) |
| **Résumé hebdo** | `send-weekly-summary` | Hebdo (ex. lundi 8h) | Stats + nouvelles candidatures + relances à faire |

Les utilisateurs activent/désactivent ces emails dans **Mon profil → Notifications**.

---

## 1. Fournisseur d’emails : Resend

[Resend](https://resend.com) est utilisé ici (gratuit jusqu’à 3 000 emails/mois). Vous pouvez le remplacer par SendGrid, Mailgun, etc.

1. Créer un compte sur [resend.com](https://resend.com).
2. **API Keys** : créer une clé API et la noter.
3. **Domaine** : ajouter et vérifier un domaine (ou utiliser `onboarding@resend.dev` en test).
4. Variables d’environnement pour les Edge Functions :
   - **Dashboard Supabase** → Project Settings → Edge Functions → **Secrets**
   - Ajouter :
     - `RESEND_API_KEY` = votre clé Resend (obligatoire pour envoyer les emails)
     - `CRON_SECRET` = une chaîne aléatoire longue (pour sécuriser l’appel par le cron)
     - `FROM_EMAIL` = ex. `AlternanceTracker <notifications@votredomaine.com>` (optionnel ; défaut : `onboarding@resend.dev` en test)

---

## 2. Edge Functions

Deux fonctions sont fournies :

- **`send-reminders`**  
  - Lit les utilisateurs avec `reminder_emails_enabled = true`.  
  - Pour chacun : candidatures « à relancer » (en attente depuis ≥ 7 jours, sans relance récente) et entretiens à venir (date aujourd’hui ou demain).  
  - Envoie un email par utilisateur concerné (Resend).

- **`send-weekly-summary`**  
  - Lit les utilisateurs avec `weekly_summary_enabled = true`.  
  - Pour chacun : stats (total, par statut), dernières candidatures, nombre de relances à faire.  
  - Envoie un email de résumé par utilisateur (Resend).

Les deux fonctions :
- N’agissent que si l’en-tête `Authorization: Bearer <CRON_SECRET>` est correct (appel réservé au cron ou à un script).
- Utilisent le **service role** Supabase pour lire `users` et `applications` (RLS contourné pour le job).

Déploiement :

```bash
supabase functions deploy send-reminders --no-verify-jwt
supabase functions deploy send-weekly-summary --no-verify-jwt
```

`--no-verify-jwt` permet au cron (sans JWT utilisateur) d’appeler la fonction ; la sécurité repose sur `CRON_SECRET`.

---

## 3. Planification (cron)

Deux options : **pg_cron** dans Supabase (recommandé) ou **cron externe** (GitHub Actions, Vercel Cron, etc.).

### Option A : pg_cron dans Supabase

1. Activer les extensions (une fois par projet) :

```sql
-- À exécuter dans l’éditeur SQL du Dashboard Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

(Sur certains plans, `pg_cron` est déjà activé ou à activer via Dashboard → Database → Extensions.)

2. Stocker l’URL du projet et le secret dans le Vault (recommandé) ou les mettre en dur dans le job :
   - **Dashboard** → Project Settings → Database → Vault (ou Variables).
   - Ou utiliser directement l’URL de la fonction et `CRON_SECRET` dans le body/header (voir exemples ci-dessous).

3. Planifier les jobs. Exemple : rappels tous les jours à 8h (Paris), résumé le lundi à 8h.

```sql
-- Rappels : tous les jours à 8h (heure Paris = UTC+1 ou UTC+2)
SELECT cron.schedule(
  'send-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Résumé hebdo : lundi à 8h
SELECT cron.schedule(
  'send-weekly-summary',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-weekly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Si vous ne utilisez pas le Vault, vous pouvez passer le secret en body et le lire dans la fonction, ou appeler depuis un cron externe qui envoie `Authorization: Bearer <CRON_SECRET>`.

Une alternative simple : le fichier **`supabase/migrations/007_cron_schedule_notifications.sql`** contient des exemples commentés. Décommentez les blocs, remplacez `VOTRE_PROJECT_REF` (réf. du projet Supabase) et `VOTRE_CRON_SECRET` par vos valeurs, puis exécutez le SQL dans l’éditeur Supabase.

### Option B : Cron externe

Appeler les Edge Functions en HTTP depuis un cron (GitHub Actions, Vercel, etc.) :

```bash
# Rappels (quotidien)
curl -X POST "https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-reminders" \
  -H "Authorization: Bearer VOTRE_CRON_SECRET" \
  -H "Content-Type: application/json"

# Résumé hebdo (une fois par semaine)
curl -X POST "https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-weekly-summary" \
  -H "Authorization: Bearer VOTRE_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Remplacer `VOTRE_PROJECT_REF` et `VOTRE_CRON_SECRET` par les valeurs réelles (secret = celui défini dans les secrets des Edge Functions).

---

## 4. Résumé des étapes

1. **Resend** : compte, clé API, domaine (ou email de test).
2. **Secrets Supabase** : `RESEND_API_KEY`, `CRON_SECRET`, `FROM_EMAIL`.
3. **Déployer** les Edge Functions `send-reminders` et `send-weekly-summary`.
4. **Planifier** :
   - soit avec pg_cron + pg_net (migration ou SQL manuel),
   - soit avec un cron externe qui envoie `Authorization: Bearer <CRON_SECRET>`.

Après cela, les utilisateurs qui ont coché les options dans **Mon profil → Notifications** recevront les rappels et/ou le résumé hebdo par email.
