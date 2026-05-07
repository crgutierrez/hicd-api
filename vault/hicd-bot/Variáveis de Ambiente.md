# Variáveis de Ambiente

Arquivo `.env` na raiz do projeto (não commitado).

```env
# Credenciais HICD
HICD_USERNAME=seu_usuario
HICD_PASSWORD=sua_senha

# Comportamento do crawler
REQUEST_DELAY=1000        # ms entre requisições (evitar rate limiting)
MAX_RETRIES=3             # tentativas antes de desistir

# API
PORT=3000

# Auth token da API — AES-256-GCM — 32 bytes hex (64 chars)
LOGIN_ENCRYPT_KEY=<hex-64-chars>
```

## Gerar LOGIN_ENCRYPT_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Gerar token de autorização para a API

Substitua `USER:PASS` pelas credenciais reais:

```bash
node -e "
  require('dotenv').config();
  const c = require('crypto');
  const k = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
  const iv = c.randomBytes(12);
  const ci = c.createCipheriv('aes-256-gcm', k, iv);
  const e = Buffer.concat([ci.update('USER:PASS', 'utf8'), ci.final()]);
  const t = ci.getAuthTag();
  console.log(Buffer.concat([iv, t, e]).toString('base64'));
"
```

## Usar o token

```bash
curl "http://localhost:3000/api/pacientes/26052/evolucoes?limite=1&formato=detalhado" \
  -H "Authorization: <TOKEN_BASE64>"
```
