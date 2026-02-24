FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Utiliser npm install en production plutôt que npm ci,
# car il n'y a pas de package-lock.json dans le dossier backend
RUN npm install --omit=dev

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

