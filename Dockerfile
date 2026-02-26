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

# Compilar TypeScript con NestJS CLI
RUN npx nest build && echo "✅ Build OK" && ls dist/

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
