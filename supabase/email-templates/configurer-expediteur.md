# Changer l’expéditeur en « AlternanceTracker »

Pour que les emails de confirmation s’affichent comme envoyés par **AlternanceTracker** (et non « Supabase Auth »), il faut configurer un **SMTP personnalisé** dans Supabase et définir le nom d’expéditeur.

## Étapes dans le tableau de bord Supabase

1. Ouvrez votre projet :  
   **https://supabase.com/dashboard/project/xvshjwddgchkbcoocenj**

2. Allez dans **Project Settings** (icône engrenage en bas à gauche) → onglet **Auth**.

3. Descendez jusqu’à la section **SMTP Settings**.

4. Activez **Enable Custom SMTP**.

5. Renseignez les champs selon votre fournisseur. **Guide détaillé Resend** (création de compte, clé API, paramètres) : voir **`resend-configuration.md`** dans ce dossier.

   Résumé rapide **Resend** :

   | Champ | Valeur |
   |-------|--------|
   | **Sender name** | `AlternanceTracker` |
   | **Sender email** | `onboarding@resend.dev` (test) ou `noreply@votredomaine.com` (domaine vérifié) |
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` |
   | **Username** | `resend` |
   | **Password** | Votre clé API Resend (commence par `re_`) |

6. Cliquez sur **Save**.

Dès que la configuration est enregistrée, les prochains emails de confirmation seront envoyés avec **AlternanceTracker** comme expéditeur (nom affiché dans la boîte mail).

---

**Sans SMTP personnalisé**, Supabase utilise son propre envoi et affiche « Supabase Auth » : il est nécessaire de configurer le SMTP pour changer l’expéditeur.
