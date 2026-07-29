# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci (installation propre à partir de package-lock.json) est plus robuste
# que npm install ici : sur Docker Desktop/Windows (WSL2), un antivirus ou une
# limite mémoire trop basse peut interrompre npm en plein milieu de
# l'installation sans faire échouer la commande (bug connu npm : "Exit
# handler never called!"). Le build continuait alors avec un node_modules
# incomplet, d'où "sh: ng: not found" bien plus tard et un message confus.
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Vérification explicite : si @angular/cli n'a pas été installé, on échoue
# ici avec un message clair plutôt que de laisser `ng build` planter plus loin.
RUN test -x node_modules/.bin/ng || \
    (echo "ERREUR: node_modules/.bin/ng introuvable — l'installation npm a échoué ou a été interrompue (mémoire Docker Desktop insuffisante ou antivirus bloquant l'écriture de fichiers). Augmentez la RAM allouée à Docker Desktop (Settings > Resources) et relancez le build." >&2 && exit 1)

COPY tsconfig.json tsconfig.app.json ./
COPY angular.json ./
COPY src ./src
RUN npm run build -- --configuration production

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/boussolefret-ia-web/browser/. /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
