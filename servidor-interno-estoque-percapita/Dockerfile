# Dockerfile para Servidor Interno Fechado (On-Premise)
# Sistema de Estoque / Almoxarifado e Gestão de Per Capita

FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
RUN npm install

# Copiar código-fonte completo
COPY . .

# Compilar frontend
RUN npm run build

# Imagem final de produção enxuta
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/server-data ./server-data
COPY --from=builder /app/uploads ./uploads

VOLUME ["/app/server-data", "/app/uploads"]

EXPOSE 3000

CMD ["node", "server.js"]
