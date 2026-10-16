# Utpost-klienten (Vue), multi-stage (M4). Byggs från repots ROT, som api/Dockerfile.
#
# Steg 1 – build: Node och alla node_modules, bara för att köra vite build.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY client/package.json client/
RUN npm ci --workspace=client

COPY shared/ shared/
COPY client/ client/
RUN npm run build --workspace=client

# Steg 2 – det som blir imagen: nginx och de färdiga filerna. Inget Node, inga node_modules,
# ingen källkod. Allt från steg 1 som inte kopieras hit kastas.
FROM nginx:1.27-alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
# nginx-imagen har redan ett CMD som startar servern.



