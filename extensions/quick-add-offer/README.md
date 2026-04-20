# Extension « AlternanceTracker — Ajouter l’offre »

Extension **Chrome / Edge (Chromium)** en Manifest V3 : depuis la page d’une offre d’emploi, un clic ouvre **Nouvelle candidature** dans votre déploiement AlternanceTracker avec `jobUrl` prérempli (même flux que le favori ou le paramètre d’URL).

## Installation (mode développeur)

1. Ouvrez `chrome://extensions` (ou `edge://extensions`).
2. Activez **Mode développeur**.
3. **Charger l’extension non empaquetée** → choisissez le dossier `extensions/quick-add-offer` de ce dépôt.

## Première utilisation

1. Cliquez sur l’icône de l’extension.
2. Saisissez l’**URL de base** de votre app (ex. `https://jacque004.github.io/AlternanceTracker` sans slash final, ou votre domaine).
3. **Enregistrer l’URL de l’app** (stockage local synchronisé Chrome si vous êtes connecté au compte Google du navigateur).
4. Ouvrez l’onglet de l’offre, rouvrez la popup → **Ouvrir « Nouvelle candidature » avec cette page**.

Vous devez être **connecté** à l’app pour enregistrer la candidature ; le bouton **Remplir depuis la page** utilise l’Edge Function `fetch-job-metadata` si elle est déployée.

## Publication (Chrome Web Store)

Ajoutez des icônes (`manifest.json` → `action.default_icon`) et les métadonnées requises par le store ; ce dossier fournit uniquement un noyau minimal pour usage personnel / équipe.
