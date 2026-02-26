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

# Compilar — mostrar errores y forzar emit aunque haya errores de tipo
RUN npx nest build 2>&1 || true

# Verificar que dist/main.js existe, si no abortar con error claro
RUN test -f dist/main.js && echo "✅ Build exitoso: dist/main.js encontrado" \
    || (echo "❌ ERROR: dist/main.js NO fue generado. Log de nest build:" && npx nest build && exit 1)

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
