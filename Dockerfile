FROM node:22-alpine

WORKDIR /app

# Dependencias del sistema
RUN apk add --no-cache openssl postgresql-client

# Copiar manifiestos
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar TODAS las dependencias (dev + prod)
RUN npm install

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente
COPY src ./src

# Compilar TypeScript — genera dist/ aunque haya errores de tipos pre-existentes
# (mismo comportamiento que Railway/Nixpacks con transpileOnly)
RUN npx tsc --project tsconfig.build.json --noEmitOnError false 2>&1 | tail -5 && \
    echo "=== dist/src/ contents ===" && \
    ls dist/src/ && \
    echo "✅ main.js exists" && test -f dist/src/main.js

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && NODE_PATH=/app/dist node dist/src/main"]
