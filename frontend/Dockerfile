FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Pas de package-lock.json dans le dossier frontend (monorepo),
# on utilise donc npm install au lieu de npm ci
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]

