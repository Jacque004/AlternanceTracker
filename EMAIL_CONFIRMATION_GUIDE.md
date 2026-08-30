# 📧 Guide de Configuration - Confirmation Email

**Objectif :** Exiger la confirmation d'email pour tous les nouveaux comptes

---

## 🎯 Pourquoi c'est important

- **Sécurité :** Vérifie que l'utilisateur possède vraiment l'adresse email
- **Anti-spam :** Empêche la création de comptes avec des emails invalides
- **Qualité :** Assure une base utilisateurs authentique
- **Conformité :** Bonne pratique RGPD

---

## ⚙️ Configuration Supabase Auth

Le projet utilise Supabase Auth pour l'authentification. La confirmation email est déjà partiellement configurée mais doit être appliquée strictement.

### Étape 1 : Configuration Supabase Dashboard

1. **Se connecter à** [Supabase Dashboard](https://app.supabase.com)

2. **Aller dans** : `Authentication` → `Settings` → `Email Auth`

3. **Activer les options suivantes :**
   ```
   ✅ Enable Email Confirmations
   ✅ Secure email change (require confirmation on both emails)
   ```

4. **Configurer les templates d'email :**
   - **Confirmation email** : Personnaliser le message
   - **URL de confirmation** : `https://votre-domaine.com/auth/confirm`
   - **Redirect URL** : `https://votre-domaine.com/dashboard`

### Étape 2 : Variables d'environnement

Éditer `frontend/.env` :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
VITE_APP_URL=https://votre-domaine.com
```

Éditer `backend/.env` (si utilisé) :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-service-key
```

---

## 💻 Code à ajouter/modifier

### 1. Frontend - Page de confirmation

Créer : `frontend/src/pages/EmailConfirmation.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      // Supabase gère automatiquement la confirmation via l'URL
      // On vérifie juste si l'utilisateur est maintenant connecté
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage('Erreur lors de la confirmation de l\'email.');
        return;
      }

      if (session?.user?.email_confirmed_at) {
        setStatus('success');
        setMessage('Email confirmé avec succès ! Redirection...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setStatus('error');
        setMessage('La confirmation de l\'email a échoué. Le lien a peut-être expiré.');
      }
    };

    confirmEmail();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Confirmation d'email
          </h2>
        </div>

        {status === 'loading' && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{message}</p>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{message}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/register')}
                className="text-sm font-medium text-red-800 hover:text-red-700"
              >
                Retour à l'inscription →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Frontend - Ajouter la route

Modifier : `frontend/src/App.tsx`

```typescript
import EmailConfirmation from './pages/EmailConfirmation';

// Dans les routes :
<Route path="/auth/confirm" element={<EmailConfirmation />} />
```

### 3. Frontend - Modifier le Register

Modifier : `frontend/src/pages/Register.tsx`

Remplacer la logique d'inscription par :

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        }
      }
    });

    if (error) throw error;

    if (data.user && !data.user.confirmed_at) {
      // Afficher message de confirmation
      setSuccess(true);
      setSuccessMessage(
        'Compte créé ! Veuillez vérifier votre email pour confirmer votre inscription. ' +
        'Consultez également votre dossier spam si vous ne voyez pas l\'email.'
      );
    }
  } catch (error: any) {
    setError(error.message || 'Erreur lors de l\'inscription');
  } finally {
    setLoading(false);
  }
};
```

### 4. Frontend - Bloquer l'accès avant confirmation

Modifier : `frontend/src/components/PrivateRoute.tsx`

```typescript
export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate('/login');
        return;
      }

      // Vérifier si l'email est confirmé
      if (!session.user.email_confirmed_at) {
        navigate('/email-not-confirmed');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return user ? <>{children}</> : null;
}
```

### 5. Frontend - Page "Email non confirmé"

Créer : `frontend/src/pages/EmailNotConfirmed.tsx`

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function EmailNotConfirmed() {
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Non connecté');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        }
      });

      if (error) throw error;

      setResent(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Confirmez votre email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Un email de confirmation a été envoyé à votre adresse.
            Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
        </div>

        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Consultez également votre dossier spam si vous ne voyez pas l'email.
              </p>
            </div>
          </div>
        </div>

        {resent && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Email de confirmation renvoyé avec succès !
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={loading || resent}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Envoi...' : resent ? 'Email renvoyé' : 'Renvoyer l\'email'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Tests

### Test 1 : Inscription avec confirmation
```bash
# 1. S'inscrire avec un vrai email
# 2. Vérifier qu'on ne peut PAS se connecter au dashboard directement
# 3. Ouvrir l'email de confirmation
# 4. Cliquer sur le lien
# 5. Vérifier la redirection vers /dashboard
```

### Test 2 : Renvoi de l'email
```bash
# 1. S'inscrire mais ne pas confirmer
# 2. Essayer d'accéder au dashboard
# 3. Être redirigé vers /email-not-confirmed
# 4. Cliquer sur "Renvoyer l'email"
# 5. Vérifier la réception du nouvel email
```

### Test 3 : Lien expiré
```bash
# 1. Attendre 24h après l'inscription
# 2. Cliquer sur le lien (devrait être expiré)
# 3. Vérifier le message d'erreur
# 4. Redemander un nouvel email
```

---

## 📧 Template d'email personnalisé

Dans Supabase Dashboard → Authentication → Email Templates :

### Confirmation Email

**Subject :** `Confirmez votre compte AlternanceTracker`

**Body :**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4F46E5;">Bienvenue sur AlternanceTracker !</h1>
    
    <p>Merci de vous être inscrit sur AlternanceTracker, votre assistant intelligent pour suivre vos candidatures en alternance.</p>
    
    <p>Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Confirmer mon email
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
      <br>
      <a href="{{ .ConfirmationURL }}" style="color: #4F46E5;">{{ .ConfirmationURL }}</a>
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
      Ce lien est valable pendant 24 heures. Si vous n'avez pas demandé cette inscription, ignorez cet email.
    </p>
    
    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      © 2026 AlternanceTracker. Tous droits réservés.
    </p>
  </div>
</body>
</html>
```

---

## ✅ Checklist de déploiement

- [ ] Activer "Enable Email Confirmations" dans Supabase Dashboard
- [ ] Personnaliser le template d'email
- [ ] Configurer l'URL de redirection (`/auth/confirm`)
- [ ] Créer la page `EmailConfirmation.tsx`
- [ ] Créer la page `EmailNotConfirmed.tsx`
- [ ] Ajouter les routes dans `App.tsx`
- [ ] Modifier `Register.tsx` pour utiliser `signUp` avec options
- [ ] Modifier `PrivateRoute.tsx` pour vérifier `email_confirmed_at`
- [ ] Tester avec un vrai email
- [ ] Vérifier que le spam n'attrape pas l'email
- [ ] Documenter pour les utilisateurs (FAQ)

---

## 🚨 Points d'attention

1. **Emails de spam :** Configurer SPF/DKIM pour Supabase
2. **Délai d'envoi :** Peut prendre 1-2 minutes
3. **Lien expiré :** Après 24h, proposer de renvoyer
4. **Support utilisateur :** Prévoir une FAQ pour "Je n'ai pas reçu l'email"
5. **Migration :** Les utilisateurs existants devront confirmer leur email lors de leur prochaine connexion

---

## 📊 Impact

**Avant :**
- Inscription sans vérification
- Emails invalides possibles
- Risque de spam/abus

**Après :**
- ✅ Email vérifié obligatoire
- ✅ Base utilisateurs authentique
- ✅ Réduction du spam
- ✅ Meilleure conformité RGPD

---

**Documentation créée le :** 30 août 2026  
**Statut :** Prêt à implémenter  
**Priorité :** Moyenne (amélioration UX/sécurité)
