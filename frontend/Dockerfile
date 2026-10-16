FROM node:22-alpine

# Le frontend réexporte supabase/functions/_shared/offerPageText.ts par un
# chemin relatif hors du dossier frontend. Le contexte de build est la racine
# du dépôt, et l’arborescence de l’image reprend ce même décalage.
WORKDIR /workspace/frontend

COPY frontend/package*.json ./

# Pas de package-lock.json dans le dossier frontend (monorepo),
# on utilise donc npm install au lieu de npm ci
RUN npm install

COPY frontend/ ./
COPY supabase/functions/_shared/offerPageText.ts /workspace/supabase/functions/_shared/offerPageText.ts

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
