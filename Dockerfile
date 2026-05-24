# --- Etapa de Compilación ---
FROM node:24-alpine AS build

WORKDIR /app

# Definir entorno de CI para evitar diálogos interactivos
ENV CI=true

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* pnpm-workspace.yaml* ./

# Instalar dependencias según el gestor de paquetes del proyecto
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# Copiar el código fuente (incluyendo el archivo .env si se incluye en el build context)
COPY . .



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
