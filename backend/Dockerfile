FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Contexte Docker = dossier backend (pas le lockfile racine). Versions épinglées dans package.json.
RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

