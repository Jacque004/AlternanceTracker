# Offres d'emploi

La page `/offres` lit la table `job_offers` dans Supabase. Elle ne collecte rien elle-même. La collecte est l'Edge Function `collect-job-offers`, déclenchée par un cron avec `CRON_SECRET` (même principe que `send-reminders`).

Appliquer `supabase/migrations/028_job_offers.sql` avant d'utiliser la page.

## Sources

### Démonstration (`mock-dev`)

| | |
|---|---|
| Méthode | Jeu de données fixe dans le code |
| API | Aucune |
| Activation | `JOB_OFFERS_ENABLE_MOCK=true` sur la fonction, **uniquement en développement** |
| Limites | 22 offres fictives, URLs `https://example.com/alternancetracker-demo/...` |
| Champs | Titre, entreprise, lieu, alternance, niveau, domaine, salaire parfois, télétravail, description |
| Fréquence | À chaque collecte tant que la variable est présente |

Ces lignes sont marquées `is_demo`. Ce ne sont pas de vraies annonces. Ne pas activer ce connecteur en production.

### La bonne alternance

| | |
|---|---|
| Nom | La bonne alternance (API Apprentissage, Ministère du Travail) |
| Méthode | API officielle, un seul `GET` par collecte |
| URL | `https://api.apprentissage.beta.gouv.fr/api/job/v1/search` |
| Documentation | https://api.apprentissage.beta.gouv.fr/fr/explorer/recherche-offre |
| Authentification | Jeton créé sur l'espace développeurs, envoyé en `Authorization: Bearer` |
| Activation | `LBA_API_KEY` sur la fonction. Sans clé, le connecteur ne part pas |
| Limites | 60 appels / minute sur cette route. Usage gratuit réservé aux usages non lucratifs. La revente ou la facturation de l'accès aux candidats est interdite par l'éditeur |
| Champs utilisés | Identifiant, titre, entreprise, ville, contrat, télétravail, diplôme, description, URL de candidature, date |
| Fréquence conseillée | Une fois par jour |
| Réglages | `LBA_ROMES` (défaut `M1805`), `LBA_LATITUDE`, `LBA_LONGITUDE`, `LBA_RADIUS` (défaut 30 km si les coordonnées sont fournies) |

Les objets qui n'ont pas de titre, d'entreprise ou d'URL http(s) publique sont ignorés et comptés comme ignorés. Une offre dont le champ `is_delegated` vaut vrai est aussi ignorée : elle est diffusée par un centre de formation, pas par l'entreprise. Aucun contournement d'authentification : un refus de l'API (401, 429) arrête l'enregistrement de cette source.

### Jooble

| | |
|---|---|
| Nom | Jooble (recherche France) |
| Méthode | API officielle, un seul `POST` par collecte |
| URL | `https://fr.jooble.org/api/{clé}` |
| Documentation | https://fr.jooble.org/api/about |
| Authentification | Clé dans l'URL, créée sur le portail France |
| Activation | `JOOBLE_API_KEY` sur la fonction. Sans clé, le connecteur ne part pas |
| Limites | 500 requêtes au total sur l'offre gratuite, pas 500 par mois. Une collecte = une requête |
| Champs utilisés | Identifiant, titre, entreprise, lieu, extrait, salaire, type, lien Jooble, date, site d'origine |
| Fréquence conseillée | Quelques fois par semaine, pas un cron horaire |
| Réglages | `JOOBLE_KEYWORDS` (défaut `alternance`), `JOOBLE_LOCATION` (défaut `France`), `JOOBLE_RESULTS` (1 à 20, défaut 20) |

Seuls les stages et les alternances sont enregistrés. Le lien stocké est celui de Jooble. Le nom du site d'origine (quand Jooble le fournit) est ajouté en fin de description.

## Entreprises seulement

Quelle que soit la source, une annonce dont l'employeur est un CFA, un lycée, une école, une université ou un organisme de formation n'est pas enregistrée. Le secteur d'activité « enseignement » ou « formation continue » a le même effet, ainsi que le code NAF 85, sauf l'enseignement de la conduite. Une auto-école qui recrute un enseignant reste une entreprise. Les groupements d'employeurs (GEIQ) restent aussi : ils sont l'employeur du contrat.

### France Travail

Non branché. L'API officielle (`https://francetravail.io`) demande une application OAuth propre à chaque client et l'acceptation de ses conditions. Aucun connecteur ne simule cet accès.

## Planification

```sql
-- Exemple, à adapter. Ne pas committer le secret.
-- SELECT cron.schedule(
--   'collect-job-offers-daily',
--   '15 6 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/collect-job-offers',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer VOTRE_CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
```

Les offres dont `expires_at` est passé passent en `expired`. Elles restent en base et sortent de la recherche. Une URL directe `/offres/:id` affiche encore la fiche.

## Lien avec les candidatures

`applications.job_offer_id` pointe vers l'offre, sans dupliquer le pipeline. Le bouton « Ajouter à mes candidatures » crée une ligne `applications` au statut `to_apply`.
