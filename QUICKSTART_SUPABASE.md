# Démarrage rapide avec Supabase

## ✅ Configuration terminée

Vos clés Supabase ont été configurées dans `frontend/.env`.

## 🚀 Prochaines étapes

### 1. Créer les tables dans Supabase

1. Connectez-vous à votre dashboard Supabase : https://supabase.com/dashboard/project/xvshjwddgchkbcoocenj
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase/migrations/001_initial_schema.sql`
5. Exécutez la requête

### 2. Installer les dépendances

```bash
cd frontend
npm install
```

### 3. Démarrer l'application

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 📋 Vérification

1. **Créer un compte** : Allez sur http://localhost:3000/register
2. **Vérifier l'email** : Supabase enverra un email de confirmation (si activé)
3. **Se connecter** : Utilisez vos identifiants pour vous connecter
4. **Créer une candidature** : Testez la création d'une candidature

## 🔧 Configuration Edge Function (Optionnel)

Pour activer la génération de lettres de motivation avec l'IA :

1. Installez Supabase CLI :
```bash
npm install -g supabase
```

2. Connectez-vous :
```bash
supabase login
```

3. Liez votre projet :
```bash
supabase link --project-ref xvshjwddgchkbcoocenj
```

4. Configurez la clé OpenAI :
```bash
supabase secrets set OPENAI_API_KEY=votre-cle-openai
```

5. Déployez la fonction :
```bash
supabase functions deploy generate-cover-letter
```

## 📝 Notes importantes

- **Secret Key** : Ne partagez jamais votre secret key (`sb_secret_...`) publiquement
- **Publishable Key** : C'est la clé utilisée dans le frontend (déjà configurée)
- **RLS** : Les politiques Row Level Security sont déjà configurées dans la migration SQL
- **Email confirmation** : Par défaut, Supabase peut demander la confirmation d'email. Vous pouvez désactiver cela dans Authentication > Settings

## 🐛 Dépannage

### Erreur de connexion
- Vérifiez que les variables d'environnement sont correctes
- Redémarrez le serveur de développement après modification du .env

### Erreur "relation does not exist"
- Assurez-vous d'avoir exécuté le script de migration SQL dans Supabase

### Erreur d'authentification
- Vérifiez que l'email confirmation est désactivée ou confirmez votre email
- Vérifiez les logs dans le dashboard Supabase

