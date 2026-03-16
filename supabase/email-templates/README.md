# Emails de confirmation d'inscription — AlternanceTracker

Ce dossier contient le **template HTML** et l’**objet du mail** pour la confirmation d’inscription, avec le logo de la plateforme.

## Fichiers

- **`confirm-signup.html`** — Corps de l’email (HTML) à utiliser dans Supabase pour le template « Confirm signup ».
- **`confirm-signup-subject.txt`** — Objet du mail à renseigner dans Supabase.

## 1. Activer la confirmation par email dans Supabase

1. Ouvrez le [tableau de bord Supabase](https://supabase.com/dashboard) et sélectionnez votre projet.
2. Allez dans **Authentication** → **Providers** → **Email**.
3. Activez **« Confirm email »** (demander la confirmation de l’email à l’inscription).
4. Dans **Authentication** → **URL Configuration** :
   - **Site URL** : l’URL de votre frontend (ex. `https://votredomaine.com` ou `http://localhost:5173` en dev).
   - **Redirect URLs** : ajoutez les URLs autorisées après confirmation, par ex. :
     - `https://votredomaine.com/login`
     - `https://votredomaine.com/auth/confirm-success`
     - En local : `http://localhost:5173/login`, `http://localhost:5173/auth/confirm-success`.

## 2. Utiliser le template et l’objet dans Supabase

1. Dans le tableau de bord : **Authentication** → **Email Templates**.
2. Sélectionnez le template **« Confirm signup »**.
3. **Subject** : copiez le contenu de `confirm-signup-subject.txt` :
   ```
   Confirmez votre inscription — AlternanceTracker
   ```
4. **Body (Message)** : copiez tout le contenu de `confirm-signup.html` et collez-le dans l’éditeur du corps du mail.
5. Enregistrez.

## 3. Logo dans l’email

Le template utilise l’URL fixe du site déployé pour que le logo s’affiche correctement :

- **Production (GitHub Pages)** : `https://jacque004.github.io/AlternanceTracker/logo.svg`
- Le fichier logo est dans `frontend/public/logo.svg` ; il est servi à la racine du site au build.

Si vous déployez sur un autre domaine, remplacez dans `confirm-signup.html` l’URL de l’image par la vôtre (ex. `https://votredomaine.com/logo.svg`).

## 4. Personnalisation (prénom)

Le template utilise le prénom envoyé à l’inscription (`first_name` dans les metadata) :

- Si présent : « Bonjour **Prénom**, »
- Sinon : « Bonjour **futur alternant(e)** ».

Cela correspond aux champs `first_name` / `last_name` envoyés dans `signUp` côté frontend.

## 5. Envoi des emails (SMTP)

Pour que les emails partent en production :

- Configurez un **SMTP personnalisé** dans Supabase : **Project Settings** → **Auth** → **SMTP Settings** (SendGrid, Mailgun, Resend, Brevo, etc.).
- Sans SMTP, Supabase utilise son propre envoi (limité) et l’expéditeur affiché peut être « Supabase Auth ».

## 6. Afficher « AlternanceTracker » comme expéditeur (sans mention de Supabase)

Par défaut, le client mail peut afficher **« Supabase Auth »** comme expéditeur. Pour afficher **AlternanceTracker** (et ne plus mentionner Supabase) :

1. Allez dans **Project Settings** (engrenage) → **Auth** → **SMTP Settings**.
2. Activez **Enable Custom SMTP** et renseignez votre fournisseur (Resend, Brevo, SendGrid, etc.).
3. Dans les champs SMTP, définissez :
   - **Sender email** : l’adresse d’envoi (ex. `noreply@votredomaine.com` ou l’adresse fournie par Resend/Brevo).
   - **Sender name** : `AlternanceTracker` (c’est ce nom qui s’affichera à la place de « Supabase Auth »).

Le contenu de l’email (template) ne mentionne pas Supabase ; seul le nom d’expéditeur dépend de cette configuration.
