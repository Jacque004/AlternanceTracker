# Configurer Resend pour les emails AlternanceTracker

Guide pas à pas : créer un compte Resend, récupérer les infos SMTP, puis les renseigner dans Supabase pour que l’expéditeur soit **AlternanceTracker**.

---

## Partie 1 : Sur Resend (resend.com)

### 1. Créer un compte

1. Allez sur **https://resend.com**
2. Cliquez sur **Sign up** et créez un compte (email ou Google/GitHub).

### 2. Créer une clé API (API Key)

1. Une fois connecté, allez dans **API Keys** :  
   https://resend.com/api-keys  
   (ou menu **Developers** → **API Keys**)
2. Cliquez sur **Create API Key**.
3. Donnez un nom (ex. `Supabase AlternanceTracker`).
4. Choisissez les permissions (au minimum **Sending access**).
5. Cliquez sur **Add**.
6. **Copiez la clé** (elle commence par `re_`) et gardez-la précieusement : elle ne sera plus affichée en entier ensuite.

### 3. Adresse d’envoi (expéditeur)

- **Pour tester rapidement** : Resend permet d’envoyer depuis `onboarding@resend.dev` sans vérifier de domaine. Vous pourrez utiliser cette adresse comme **Sender email** dans Supabase.
- **Pour la production** : ajoutez et vérifiez votre domaine dans **Domains** (https://resend.com/domains), puis utilisez une adresse du type `noreply@votredomaine.com` comme **Sender email**.

---

## Partie 2 : Dans Supabase

1. Ouvrez votre projet :  
   **https://supabase.com/dashboard/project/xvshjwddgchkbcoocenj**

2. Allez dans **Project Settings** (engrenage) → **Auth** → section **SMTP Settings**.

3. Activez **Enable Custom SMTP**.

4. Renseignez exactement :

   | Champ | Valeur |
   |-------|--------|
   | **Sender name** | `AlternanceTracker` |
   | **Sender email** | `onboarding@resend.dev` (test) ou `noreply@votredomaine.com` (après vérification de domaine) |
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` (recommandé) ou `587` |
   | **Username** | `resend` |
   | **Password** | Votre clé API Resend (celle qui commence par `re_`) |

5. Cliquez sur **Save**.

---

## Vérification

- Créez un nouveau compte de test sur votre app (ou utilisez « Resend confirmation email » si disponible).
- L’email de confirmation doit arriver et s’afficher comme envoyé par **AlternanceTracker** (`onboarding@resend.dev` ou votre adresse personnalisée).
- Vous pouvez aussi consulter les envois sur Resend : **Emails** → https://resend.com/emails

---

## En cas de problème

- **Erreur d’authentification** : vérifiez que la clé API est bien collée sans espace, et qu’elle a les droits d’envoi.
- **Emails non reçus** : regardez dans les spams ; vérifiez les logs dans Supabase (**Authentication** → **Logs**) et dans Resend (**Emails**).
- **Domaine** : pour utiliser une adresse en `@votredomaine.com`, le domaine doit être ajouté et vérifié dans **Domains** sur Resend.
