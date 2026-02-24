FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Installer toutes les dépendances (y compris dev) pour disposer de TypeScript (tsc) lors du build
RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

