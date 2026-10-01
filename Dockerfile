# =============================================================
# DOCKERFILE — Frontend Angular (DechetScan)
# =============================================================
# Ce Dockerfile utilise un "build multi-stage" (multi-étapes).
# C'est une technique très importante : on utilise deux images
# distinctes dans le même Dockerfile.
#
#  ÉTAPE 1 (build)  : image Node.js lourde → compile Angular
#  ÉTAPE 2 (finale) : image Nginx légère   → sert les fichiers
#
# Résultat : l'image finale ne contient QUE Nginx + les fichiers
# compilés. Elle ne contient plus Node.js ni node_modules.
# Taille finale ~50MB au lieu de ~1GB !
# =============================================================


# =============================================================
# ── STAGE 1 : BUILD ANGULAR ──────────────────────────────────
# =============================================================
# "AS builder" donne un nom à cette étape pour la référencer
# dans l'étape suivante.
# On utilise Node.js 22 (version LTS compatible Angular 22).
# =============================================================
FROM node:22-slim AS builder


# -------------------------------------------------------------
# Répertoire de travail pour le build
# -------------------------------------------------------------
WORKDIR /app


# -------------------------------------------------------------
# Installation des dépendances npm
# -------------------------------------------------------------
# On copie package.json et package-lock.json EN PREMIER
# pour profiter du cache Docker : si le code source change
# mais pas les dépendances, npm install n'est pas relancé.
# "npm ci" est plus rapide et strict que "npm install" :
#   - Installe exactement ce qui est dans package-lock.json
#   - Idéal pour les environnements CI/CD et Docker
# -------------------------------------------------------------
COPY package.json package-lock.json ./
RUN npm ci


# -------------------------------------------------------------
# Copie du code source et build de production
# -------------------------------------------------------------
# On copie tout le projet Angular, puis on lance le build.
# "ng build --configuration production" :
#   - Minifie et optimise le JavaScript/CSS
#   - Active le tree-shaking (supprime le code inutilisé)
#   - Active le service worker (PWA)
#   - Génère les fichiers dans dist/Projet_DechetScan/browser/
# -------------------------------------------------------------
COPY . .
RUN npm run build -- --configuration production


# =============================================================
# ── STAGE 2 : SERVEUR NGINX ──────────────────────────────────
# =============================================================
# On repart d'une image Nginx propre et légère.
# On y copie UNIQUEMENT les fichiers compilés depuis le stage 1.
# Node.js et node_modules ne sont PAS inclus dans cette image.
# =============================================================
FROM nginx:1.27-alpine


# -------------------------------------------------------------
# Suppression de la config Nginx par défaut
# -------------------------------------------------------------
# Nginx vient avec une config qui affiche juste "Welcome to Nginx".
# On la supprime pour mettre la nôtre à la place.
# -------------------------------------------------------------
RUN rm /etc/nginx/conf.d/default.conf


# -------------------------------------------------------------
# Copie de notre config Nginx personnalisée
# -------------------------------------------------------------
# Notre nginx.conf gère :
#   - Le routage Angular (toutes les URLs → index.html)
#   - Le proxy vers le backend Django (/api/ → backend:8000)
#   - Le proxy vers le microservice IA (/ia/ → ia-service:8001)
#   - La compression gzip pour les performances
# -------------------------------------------------------------
COPY nginx.conf /etc/nginx/conf.d/default.conf


# -------------------------------------------------------------
# Copie des fichiers Angular compilés depuis le stage 1
# -------------------------------------------------------------
# "COPY --from=builder" copie depuis l'étape "builder"
# définie plus haut. Le chemin correspond à l'output Angular :
# dist/<nom-projet>/browser/
# Ces fichiers sont déposés dans le dossier servi par Nginx.
# -------------------------------------------------------------
COPY --from=builder /app/dist/Projet_DechetScan/browser /usr/share/nginx/html


# -------------------------------------------------------------
# Port exposé
# -------------------------------------------------------------
# Nginx écoute sur le port 80 (HTTP standard).
# -------------------------------------------------------------
EXPOSE 80


# -------------------------------------------------------------
# Commande de lancement Nginx
# -------------------------------------------------------------
# "daemon off" : Nginx reste au premier plan (obligatoire pour
# Docker, sinon le conteneur se ferme immédiatement).
# -------------------------------------------------------------
CMD ["nginx", "-g", "daemon off;"]
