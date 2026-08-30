# 🤖 Guide Chatbot Intelligent - AlternanceTracker

**Date :** 30 août 2026  
**Statut :** ✅ Prêt à utiliser  
**IA :** Gemini (100% gratuit)

---

## 🎉 CHATBOT AJOUTÉ !

Un assistant virtuel intelligent a été ajouté à votre application pour guider vos utilisateurs ! 🚀

### ✨ Fonctionnalités

✅ **Assistant intelligent** - Répond aux questions sur l'alternance  
✅ **Aide à la navigation** - Guide dans l'application  
✅ **Conseils personnalisés** - Donne des conseils pour les candidatures  
✅ **IA Gemini** - 100% gratuit, réponses en 2-5 secondes  
✅ **Interface élégante** - Bulle de chat flottante  
✅ **Suggestions** - Questions rapides suggérées  
✅ **Historique** - Conversation contextuelle  
✅ **Rate Limiting** - 30 messages / 15 minutes  
✅ **Protection CSRF** - Sécurisé  

---

## 📁 FICHIERS CRÉÉS

### Backend (2 fichiers)

1. **`backend/src/controllers/chatbot.controller.ts`** (300 lignes)
   - Logique du chatbot
   - Intégration Gemini API (gratuit)
   - Fallback OpenAI
   - Suggestions de questions
   - Gestion de l'historique

2. **`backend/src/routes/chatbot.routes.ts`**
   - Routes API :
     - `POST /api/chatbot/message` - Envoyer un message
     - `GET /api/chatbot/suggestions` - Obtenir des suggestions

### Frontend (1 fichier)

3. **`frontend/src/components/ChatBot.tsx`** (300 lignes)
   - Composant React
   - Interface bulle de chat
   - Suggestions intelligentes
   - Animation de typing
   - Auto-scroll

### Backend modifié

4. **`backend/src/index.ts`**
   - Route `/api/chatbot` ajoutée
   - Rate limiting chatbot (30/15min)
   - Protection CSRF activée

---

## 🚀 INSTALLATION

### Étape 1 : Ajouter le chatbot dans l'application

Ouvrir : `frontend/src/App.tsx`

Ajouter en haut (après les autres imports) :

```typescript
import ChatBot from './components/ChatBot';
```

Ajouter à la fin du return (avant la dernière balise) :

```typescript
return (
  // ... votre code existant ...
  
  {/* Chatbot intelligent */}
  <ChatBot />
</div>
```

**OU** si vous avez un composant `Layout.tsx` :

Ouvrir : `frontend/src/components/Layout.tsx`

```typescript
import ChatBot from './ChatBot';

// Dans le return, avant la fermeture :
return (
  // ... code existant ...
  
  <ChatBot />
</div>
```

### Étape 2 : Redémarrer le backend (si déjà démarré)

```bash
# Arrêter le backend (Ctrl+C)
cd C:\xampp\htdocs\AlternanceTracker\backend
npm run dev
```

### Étape 3 : Redémarrer le frontend

```bash
# Arrêter le frontend (Ctrl+C)
cd C:\xampp\htdocs\AlternanceTracker\frontend
npm run dev
```

---

## 🧪 TESTER LE CHATBOT

### 1. Ouvrir l'application

http://localhost:5173

### 2. Se connecter

Utiliser votre compte créé précédemment

### 3. Voir le bouton flottant

En bas à droite de l'écran : 💬

### 4. Cliquer sur le bouton

La fenêtre du chatbot s'ouvre ! 🎉

### 5. Tester des questions

**Questions suggérées :**
- "Comment créer une candidature ?"
- "Comment générer une lettre de motivation ?"
- "Quelles sont les étapes d'une bonne candidature ?"
- "Comment suivre mes entretiens ?"
- "Que faire après un refus ?"
- "Comment améliorer mon CV ?"

**Questions personnalisées :**
- "J'ai reçu 5 refus, que faire ?"
- "Comment préparer un entretien ?"
- "Combien de candidatures par semaine ?"
- "Comment relancer une entreprise ?"

---

## 🎨 PERSONNALISER LE CHATBOT

### Changer le nom de l'assistant

Fichier : `frontend/src/components/ChatBot.tsx`

Ligne 136 :
```typescript
<h3 className="font-semibold">Assistant AlternanceTracker</h3>
// Changer en :
<h3 className="font-semibold">Votre Nom</h3>
```

### Changer les couleurs

Remplacer `indigo` par une autre couleur Tailwind :
- `red`, `blue`, `green`, `purple`, `pink`, `yellow`, etc.

Exemple :
```typescript
className="bg-indigo-600"  // Bouton bleu
// Changer en :
className="bg-purple-600"  // Bouton violet
```

### Ajouter plus de suggestions

Fichier : `backend/src/controllers/chatbot.controller.ts`

Ligne 171 - Ajouter dans le tableau `suggestions` :

```typescript
{
  id: 7,
  text: 'Votre question ici',
  category: 'conseil',
},
```

### Modifier le comportement de l'assistant

Fichier : `backend/src/controllers/chatbot.controller.ts`

Lignes 11-58 - Modifier le `SYSTEM_PROMPT` :

```typescript
const SYSTEM_PROMPT = `Tu es l'assistant virtuel d'AlternanceTracker...
// Personnaliser le prompt système
`;
```

### Changer le rate limiting

Fichier : `backend/src/index.ts`

Ligne 122 :
```typescript
max: 30, // 30 messages toutes les 15 minutes
// Augmenter ou réduire selon vos besoins
max: 50, // Par exemple
```

---

## 🔧 CONFIGURATION AVANCÉE

### Utiliser OpenAI au lieu de Gemini

Le chatbot utilise **Gemini par défaut** (gratuit).

Pour passer à OpenAI :
1. Commenter `GEMINI_API_KEY` dans `backend/.env`
2. Décommenter et configurer `OPENAI_API_KEY`

Le système bascule automatiquement !

### Ajouter un avatar au chatbot

Ajouter une image dans `frontend/public/chatbot-avatar.png`

Puis dans `ChatBot.tsx` ligne 135 :

```typescript
<div className="flex items-center space-x-2">
  <img src="/chatbot-avatar.png" alt="Avatar" className="w-8 h-8 rounded-full" />
  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
  <h3 className="font-semibold">Assistant AlternanceTracker</h3>
</div>
```

### Sauvegarder les conversations

Pour sauvegarder l'historique dans la base de données, créer une table :

```sql
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Puis modifier le contrôleur pour sauvegarder chaque message.

---

## 📊 ANALYTICS

### Suivre l'utilisation

Ajouter dans `chatbot.controller.ts` après la ligne 142 :

```typescript
// Logger pour analytics
console.log(`[Chatbot] User ${req.userId} asked: "${message.substring(0, 50)}..."`);
```

### Statistiques d'utilisation

Créer un endpoint :

```typescript
// GET /api/chatbot/stats
export const getStats = async (req: AuthRequest, res: Response) => {
  // Compter les messages
  // Temps de réponse moyen
  // Questions les plus fréquentes
};
```

---

## ⚠️ LIMITATIONS

### Rate Limiting

- **30 messages / 15 minutes** par utilisateur
- Si dépassé : "Trop de messages envoyés au chatbot"
- Ajustable dans `backend/src/index.ts`

### Longueur des messages

- **Maximum 1000 caractères** par message
- Défini ligne 119 de `chatbot.controller.ts`

### Historique

- Garde les **10 derniers messages**
- Pour économiser les tokens API
- Configurable ligne 31 et 145

### API Gratuite (Gemini)

- **60 requêtes / minute** (quota Google)
- Si dépassé, attendre 1 minute
- Largement suffisant pour usage normal

---

## 🐛 DÉPANNAGE

### Le chatbot ne s'ouvre pas

**Vérifier :**
1. Le composant est bien importé dans `App.tsx` ou `Layout.tsx`
2. Le frontend est redémarré après ajout
3. Pas d'erreurs dans la console du navigateur (F12)

### "Erreur lors de l'envoi du message"

**Vérifier :**
1. Le backend tourne sur le port 5000
2. L'utilisateur est bien connecté
3. La clé `GEMINI_API_KEY` est dans `backend/.env`
4. Pas d'erreurs dans les logs backend

### Rate limiting trop restrictif

**Solution :**

Fichier : `backend/src/index.ts`

Ligne 122 :
```typescript
max: 30, // Augmenter à 50 ou 100
```

### Le chatbot répond en anglais

**Solution :**

Fichier : `backend/src/controllers/chatbot.controller.ts`

Ligne 11 - Ajouter au début du SYSTEM_PROMPT :

```typescript
const SYSTEM_PROMPT = `**IMPORTANT : Tu dois TOUJOURS répondre en français !**

Tu es l'assistant virtuel...`;
```

---

## 📈 AMÉLIORATIONS FUTURES

### Idées d'amélioration

✨ **Multi-langue** - Détecter la langue de l'utilisateur  
✨ **Recherche sémantique** - Chercher dans les candidatures  
✨ **Actions directes** - "Crée une candidature pour [entreprise]"  
✨ **Notifications** - Alertes pour entretiens à venir  
✨ **Analytics** - Dashboard admin avec stats d'usage  
✨ **Feedback** - Pouces 👍 👎 sur les réponses  
✨ **Voice** - Reconnaissance vocale  
✨ **Markdown** - Support du formatage dans les réponses  

### Contexte enrichi

Pour rendre l'assistant encore plus intelligent, lui donner accès à :

```typescript
const userContext = {
  nbCandidatures: 15,
  nbEntretiens: 3,
  dernierRefus: '2026-08-25',
  objectifSemaine: 5,
  // ...
};

// L'envoyer avec chaque message
```

---

## 💰 COÛTS

### Gemini API (Par défaut)

- **100% GRATUIT** ✅
- 60 requêtes/minute
- Aucune carte bancaire
- Parfait pour production

### OpenAI (Optionnel)

- ~$0.002 / 1K tokens
- GPT-3.5-turbo
- Carte bancaire requise
- $5 de crédit offert

**Recommandation :** Rester sur Gemini (gratuit) 💚

---

## ✅ CHECKLIST D'INSTALLATION

- [ ] Fichiers backend créés (contrôleur + routes)
- [ ] Route ajoutée dans `index.ts`
- [ ] Composant `ChatBot.tsx` créé
- [ ] Composant importé dans `App.tsx` ou `Layout.tsx`
- [ ] Backend redémarré
- [ ] Frontend redémarré
- [ ] Chatbot visible en bas à droite
- [ ] Test d'envoi de message
- [ ] Réponse reçue en 2-5 secondes

---

## 🎊 RÉSULTAT

Votre application dispose maintenant d'un **assistant intelligent gratuit** pour guider vos utilisateurs ! 🎉

**Fonctionnalités :**
- ✅ Répond aux questions 24/7
- ✅ Donne des conseils personnalisés
- ✅ Aide à la navigation
- ✅ 100% gratuit (Gemini)
- ✅ Interface élégante
- ✅ Sécurisé (CSRF + Rate Limiting)

**Vos utilisateurs vont adorer ! 💚**

---

**Créé le :** 30 août 2026  
**Technologie :** React + TypeScript + Gemini API  
**Coût :** 0€ (gratuit à vie)  
**Prêt à utiliser :** OUI ✅
