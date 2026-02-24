# Pousser le projet vers GitHub (AlternanceTracker)

Suis ces étapes **dans l’ordre** dans un terminal (PowerShell ou CMD), en étant dans le dossier du projet.

---

## 1. Ouvrir le dossier du projet

```powershell
cd c:\xampp\htdocs\ProjetSaaS
```

---

## 2. Initialiser Git (si pas déjà fait)

```powershell
git init
```

---

## 3. Branche principale

```powershell
git branch -M main
```

---

## 4. Lier le dépôt GitHub

```powershell
git remote add origin https://github.com/Jacque004/AlternanceTracker.git
```

Si tu as déjà un `origin` et que tu veux le remplacer :

```powershell
git remote remove origin
git remote add origin https://github.com/Jacque004/AlternanceTracker.git
```

---

## 5. Tout ajouter et committer

Les fichiers `.env` sont ignorés par `.gitignore`, ils ne seront pas poussés (c’est voulu).

```powershell
git add .
git status
git commit -m "Initial commit - AlternanceTracker"
```

---

## 6. Premier push

Si le dépôt **AlternanceTracker** est vide :

```powershell
git push -u origin main
```

Si GitHub affiche une erreur (ex. « refs don’t match »), c’est parfois parce que le dépôt a déjà une branche (ex. avec un README créé sur le site). Dans ce cas :

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 7. Après le push

- La **CI** (GitHub Actions) va se lancer automatiquement.
- Ensuite tu peux déployer : voir [DEPLOIEMENT_PORTFOLIO.md](DEPLOIEMENT_PORTFOLIO.md) (Render + Vercel + portfolio).

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `git` introuvable | Installe [Git pour Windows](https://git-scm.com/download/win) et rouvre le terminal. |
| Authentification refusée | Utilise un [Personal Access Token](https://github.com/settings/tokens) à la place du mot de passe, ou configure SSH. |
| Dépôt pas vide | `git pull origin main --allow-unrelated-histories` puis `git push -u origin main`. |
