# Emails d'auth Supabase — AlternanceTracker

Ce dossier contient les **templates HTML** et les **objets des mails** d'auth Supabase, avec le logo de la plateforme.

## Fichiers

- **`confirm-signup.html`** — Corps de l’email (HTML) à utiliser dans Supabase pour le template « Confirm signup ».
- **`confirm-signup-subject.txt`** — Objet du mail à renseigner dans Supabase.
- **`reset-password.html`** — Corps de l’email (HTML) à utiliser dans Supabase pour le template de réinitialisation (« Reset password » / « Recovery »).
- **`reset-password-subject.txt`** — Objet du mail à renseigner dans Supabase.

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

## 2bis. Réinitialisation de mot de passe

1. Dans le tableau de bord : **Authentication** → **Email Templates**.
2. Sélectionnez le template **« Reset password »** (parfois affiché **« Recovery »**).
3. **Subject** : copiez le contenu de `reset-password-subject.txt` :
   ```
   Réinitialisez votre mot de passe — AlternanceTracker
   ```
4. **Body (Message)** : copiez tout le contenu de `reset-password.html` et collez-le dans l’éditeur du corps du mail.
5. Enregistrez.

## 3. Logo dans l’email

Le template utilise un PNG, seul format affiché de façon fiable dans les clients mail (Gmail, Outlook). L’URL est directe, sans redirection :

- **Production** : `https://alternancetracker.fr/logo.png`
- Image : le logo du site (pastille dégradée, « A » blanc, coche jaune, texte **Alternance** / **Tracker**), exporté en PNG dans `frontend/public/logo.png`. Le composant source est `frontend/src/components/Logo.tsx`.

Les clients mail n’affichent pas le SVG. Une URL inconnue comme `/logo.png` est renvoyée vers `404.html`, qui charge l’application : React signale alors « No routes matched location "/logo.png" ».

## 4. Personnalisation (prénom et nom)

À l’inscription, le frontend envoie dans les metadata Supabase (`options.data`) :

- `first_name` — prénom
- `last_name` — nom
- `full_name` — prénom et nom réunis (ex. `Michelle diango`)

Le template affiche :

- Si `full_name` est présent : « Bonjour **Michelle diango**, »
- Sinon, s’il y a un prénom (et éventuellement un nom) : « Bonjour **Prénom Nom**, »
- Sinon : « Bonjour **futur alternant(e)**, »

`{{ .Data }}` dans les templates Supabase correspond à `user_metadata`. Il faut recopier le HTML mis à jour dans **Authentication → Email Templates** pour que les prochains mails l’utilisent.

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
