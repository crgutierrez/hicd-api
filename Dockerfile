FROM node:20-alpine

WORKDIR /app

# Instala apenas dependências de produção usando o lockfile
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o código-fonte (o .dockerignore exclui .env, output/, frontend, etc.)
COPY . .

# Diretório de saída usado pelo crawler em runtime
RUN mkdir -p output

# API Express (ver config.js / PORT)
EXPOSE 3000

# Em container o servidor precisa escutar em todas as interfaces, não só localhost
# (api-server.js usa process.env.HOST || 'localhost').
ENV HOST=0.0.0.0

# Segredos (credenciais HICD, LOGIN_ENCRYPT_KEY) são injetados em runtime via
# --env-file / variáveis de ambiente, nunca embutidos na imagem.
CMD ["node", "api-server.js"]
