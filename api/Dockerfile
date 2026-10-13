# Utpost API. Byggs från repots ROT (context: . i compose.yaml, eller `docker build -f api/Dockerfile .`)
# eftersom api/ beror på workspace-paketet shared/ och lockfilen ligger i roten.
FROM node:22-alpine

WORKDIR /app

# Först bara paketfilerna. Det här lagret ändras sällan, så npm ci cachas mellan byggen
# och körs bara om när beroendena ändrats – inte varje gång en rad kod ändras.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
RUN npm ci --workspace=api --omit=dev

# Sedan koden. Ändras ofta, ligger därför sist.
COPY shared/ shared/
COPY api/ api/

WORKDIR /app/api
EXPOSE 4000
# Node 22.18+ kör routes/guides.ts direkt – inget byggsteg behövs.
CMD ["node", "src/index.js"]