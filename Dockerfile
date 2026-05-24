# --- Etapa de Compilación ---
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./

# Instalar dependencias según el gestor de paquetes del proyecto
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# Copiar el código fuente (incluyendo el archivo .env si se incluye en el build context)
COPY . .

# Definir argumentos de compilación para variables de entorno de Firebase
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# Exponerlas a Vite durante el build
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Compilar la aplicación para producción
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  else npm run build; \
  fi

# --- Etapa de Producción (Servidor Nginx ultraligero) ---
FROM nginx:alpine

# Copiar los estáticos compilados de React/Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración base de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Reemplazar dinámicamente LISTEN_PORT con $PORT al arrancar en Cloud Run
# Cloud Run inyecta la variable $PORT (usualmente 8080)
CMD ["/bin/sh", "-c", "sed -i \"s/LISTEN_PORT/${PORT:-8080}/g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
