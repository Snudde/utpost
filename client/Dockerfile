# Utpost-klienten (Vue). Enkel version för M3: bygger appen och serverar dist/ med Vites
# preview-server. Node och alla node_modules följer med in i imagen, så den väger några
# hundra MB. Det är medvetet – multi-stage build med nginx kommer i M4.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY client/package.json client/
RUN npm ci --workspace=client

COPY shared/ shared/
COPY client/ client/
RUN npm run build --workspace=client

WORKDIR /app/client
EXPOSE 3001
# --host 0.0.0.0: lyssna på alla adresser i containern, annars nås den inte utifrån.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3001"]