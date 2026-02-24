# Déployer AlternanceTracker et l’ajouter à ton portfolio

Ce guide explique comment mettre en ligne **AlternanceTracker** et l’afficher sur ton portfolio [jacque004.github.io/jacques-website](https://jacque004.github.io/jacques-website/#projet). Dépôt du projet : [github.com/Jacque004/AlternanceTracker](https://github.com/Jacque004/AlternanceTracker).

---

## 1. Déployer l’application

L’app comporte :
- **Frontend** (React + Vite) → à héberger sur **Vercel** ou Netlify
- **Backend** (Express) → à héberger sur **Render** ou Railway
- **Base de données** → déjà sur **Supabase** (aucun déploiement à faire)

### Étape A – Backend (Render recommandé)

1. **Pousser le code**  
   Utilise le dépôt [AlternanceTracker](https://github.com/Jacque004/AlternanceTracker). Pousse le code du dossier `backend/` (structure monorepo : racine du repo avec sous-dossiers `backend/` et `frontend/`).

2. **Créer un service sur [Render](https://render.com)**  
   - New → Web Service  
   - Connecte ton repo GitHub  
   - **Root Directory** : `backend` (si le backend est dans un sous-dossier)  
   - **Build Command** : `npm install && npm run build`  
   - **Start Command** : `npm start`  
   - **Environment** : ajoute les variables suivantes  

   | Variable        | Valeur / où la trouver |
   |-----------------|-------------------------|
   | `NODE_ENV`      | `production`            |
   | `PORT`          | `10000` (ou laissé par défaut par Render) |
   | `DATABASE_URL`  | Supabase → Project Settings → Database → Connection string (URI), mode « Transaction » |
   | `JWT_SECRET`    | Une chaîne secrète longue et aléatoire (générateur en ligne ou `openssl rand -hex 32`) |
   | `CORS_ORIGIN`   | **À remplir après** l’étape B : l’URL du frontend (ex. `https://ton-app.vercel.app`) |

3. **Déployer**  
   Après le premier déploiement, note l’URL du service (ex. `https://alternancetracker-api.onrender.com`). Tu en auras besoin pour le frontend et pour `CORS_ORIGIN`.

4. **CORS**  
   Une fois le frontend déployé, reviens sur Render et mets à jour `CORS_ORIGIN` avec l’URL réelle du frontend (ex. `https://alternancetracker.vercel.app`).

---

### Étape B – Frontend (Vercel recommandé)

1. **Repo GitHub**  
   Même dépôt [AlternanceTracker](https://github.com/Jacque004/AlternanceTracker), avec le frontend dans le sous-dossier `frontend/`.

2. **Créer un projet sur [Vercel](https://vercel.com)**  
   - Import ton repo GitHub  
   - **Root Directory** : `frontend` (si le frontend est dans un sous-dossier)  
   - **Framework Preset** : Vite  
   - **Build Command** : `npm run build`  
   - **Output Directory** : `dist`  

3. **Variables d’environnement** (Vercel → Settings → Environment Variables)  

   | Variable                 | Valeur |
   |--------------------------|--------|
   | `VITE_SUPABASE_URL`      | `https://xvshjwddgchkbcoocenj.supabase.co` (ou ton URL Supabase) |
   | `VITE_SUPABASE_ANON_KEY` | Ta clé anon Supabase (Dashboard → Project Settings → API → anon public) |
   | `VITE_API_URL`           | URL de ton backend (ex. `https://alternancetracker-api.onrender.com/api`) |

4. **Déployer**  
   Après le déploiement, note l’URL du site (ex. `https://alternancetracker.vercel.app`).  
   Remets à jour `CORS_ORIGIN` sur Render avec cette URL.

---

## 2. Ajouter le projet sur ton portfolio

Ton portfolio est hébergé sur **GitHub Pages** : dépôt `jacque004/jacques-website`. Pour ajouter AlternanceTracker dans la section **Projets** :

1. **Clone le repo du portfolio** (s’il n’est pas déjà sur ta machine) :
   ```bash
   git clone https://github.com/jacque004/jacques-website.git
   cd jacques-website
   ```

2. **Ouvre le fichier où sont définis les projets**  
   Selon la structure du site (HTML, React, ou générateur type Jekyll/Hugo), cherche un fichier du type :
   - `index.html`, `projects.html`
   - ou un JSON/JS (ex. `data/projects.json`, `src/data/projects.js`)
   - ou des composants (ex. `src/sections/Projects.jsx`)

3. **Ajoute une entrée pour AlternanceTracker**  
   En t’inspirant des autres projets (Hello Shop, AppartPN, etc.), ajoute un bloc de ce type.  
   **Si le contenu est en Markdown ou en texte structuré** :

   ```markdown
   ## AlternanceTracker

   Application de suivi des candidatures en alternance : tableau de bord, conseils CV et coaching.

   [Voir plus](https://TON-URL-VERCEL.vercel.app) [Code](https://github.com/Jacque004/AlternanceTracker)
   ```

   **Si les projets sont dans un tableau / liste (ex. JSON ou JS)** :

   ```json
   {
     "title": "AlternanceTracker",
     "description": "Application de suivi des candidatures en alternance : tableau de bord, conseils CV et coaching.",
     "links": [
       { "label": "Voir plus", "url": "https://TON-URL-VERCEL.vercel.app" },
       { "label": "Code", "url": "https://github.com/Jacque004/AlternanceTracker" }
     ]
   }
   ```

   Remplace `https://TON-URL-VERCEL.vercel.app` par l’URL réelle de ton frontend déployé sur Vercel.

4. **Commit et push**  
   Après modification, commit et push sur la branche utilisée par GitHub Pages (souvent `main` ou `gh-pages`). Le site se met à jour après quelques minutes.

---

## 3. Récapitulatif des URLs à préparer

| Élément        | Où / quoi |
|----------------|-----------|
| **Frontend**   | URL Vercel (ex. `https://alternancetracker.vercel.app`) → à mettre dans le portfolio et dans `CORS_ORIGIN` du backend |
| **Backend**    | URL Render (ex. `https://alternancetracker-api.onrender.com`) → à mettre dans `VITE_API_URL` du frontend |
| **Supabase**   | Déjà configuré ; en prod, utilise les mêmes `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` que en local si le projet Supabase est le même |

---

## 4. Vérifications après déploiement

- Ouvrir l’URL du frontend : la page de login s’affiche.
- S’inscrire / se connecter : les appels passent bien vers le backend (pas d’erreur CORS).
- Vérifier que le lien « Voir plus » sur le portfolio pointe vers l’URL du frontend.

Si tu veux, on peut détailler la structure exacte des fichiers de `jacques-website` pour coller au format (HTML, React ou autre) et te donner le diff exact à faire.
