# Déploiement – AlternanceTracker

## Prérequis : Supabase CLI dans le projet

La CLI Supabase est installée **dans le projet** (pas en global). Depuis la racine du projet :

```bash
cd c:\xampp\htdocs\ProjetSaaS
npm install
```

Ensuite vous utiliserez `npx supabase` ou les scripts npm ci-dessous.

---

## 1. Se connecter et lier le projet (une seule fois)

```bash
npx supabase login
```

Une page web s’ouvre pour vous connecter à Supabase.

Puis lier ce dossier à votre projet Supabase (remplacez `VOTRE_PROJECT_REF` par l’ID du projet, visible dans l’URL du dashboard : `https://app.supabase.com/project/xxxxx`) :

```bash
npx supabase link --project-ref VOTRE_PROJECT_REF
```

---

## 2. Déployer l’Edge Function `analyze-cv-alternance`

```bash
npx supabase functions deploy analyze-cv-alternance
```

Ou avec le script npm :

```bash
npm run supabase:deploy
```

---

## 3. Configurer une clé API pour l’analyse (au moins une)

### Option recommandée : Google Gemini (gratuit, sans carte bancaire)

1. Allez sur **[Google AI Studio](https://aistudio.google.com/apikey)** (compte Google).
2. Cliquez sur **Get API key** / **Créer une clé API**.
3. Copiez la clé, puis dans le terminal :

```bash
npx supabase secrets set GEMINI_API_KEY=votre_cle_gemini_ici
```

La fonction utilisera Gemini en priorité. Quota gratuit suffisant pour un usage normal.

### Option alternative : OpenAI (payant après épuisement du quota)

Si vous préférez OpenAI (nécessite un compte et éventuellement une carte après quota gratuit) :

```bash
npx supabase secrets set OPENAI_API_KEY=sk-votre_cle_openai_ici
```

- La fonction utilise **Gemini si `GEMINI_API_KEY` est défini**, sinon OpenAI si `OPENAI_API_KEY` est défini.
- Vérifier les secrets : `npx supabase secrets list`.

---

## 4. (Optionnel) Vérifier que tout fonctionne

- Lancer le frontend : `npm run dev:frontend` (ou `npm run dev` pour tout).
- Se connecter, aller sur **Conseils CV**, coller un extrait de CV (au moins 50 caractères), cliquer sur **Analyser mon CV**.
- En cas d’erreur, ouvrir la console navigateur (F12) et l’onglet **Network** pour voir la réponse de la fonction.

---

## Résumé des commandes

| Action | Commande |
|--------|----------|
| Connexion Supabase | `npx supabase login` |
| Lier le projet | `npx supabase link --project-ref VOTRE_REF` |
| Déployer la fonction | `npx supabase functions deploy analyze-cv-alternance` ou `npm run supabase:deploy` |
| Clé Gemini (gratuit) | `npx supabase secrets set GEMINI_API_KEY=xxx` |
| Clé OpenAI (optionnel) | `npx supabase secrets set OPENAI_API_KEY=sk-xxx` |
| Lister les secrets | `npx supabase secrets list` |
| Logs de la fonction | `npx supabase functions logs analyze-cv-alternance` |
