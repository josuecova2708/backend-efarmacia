# ============================================================
# Stage 1: BUILD
# Instala todas las dependencias y compila TypeScript
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para bcrypt y Prisma
RUN apk add --no-cache openssl

# Copiar manifiestos de paquetes
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las dependencias (incluyendo devDeps como @nestjs/cli)
RUN npm install

# Generar cliente de Prisma
RUN npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript con NestJS CLI
RUN npx nest build

# ============================================================
# Stage 2: PRODUCTION
# Solo lo necesario para correr la app
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl postgresql-client

COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN npm install --omit=dev

# Generar cliente de Prisma para producción
RUN npx prisma generate

# Copiar el código compilado desde el builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Correr migraciones y arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
