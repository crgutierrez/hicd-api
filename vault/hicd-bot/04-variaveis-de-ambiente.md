---
tags:
  - akita/config
aliases:
  - Variáveis de Ambiente
  - Env
  - .env
updated: 2026-05-21
---

# 04 · Variáveis de Ambiente

[[CLAUDE|← voltar ao Hub]]

> **Fonte canônica** de todas as variáveis de ambiente. Outras notas referenciam daqui via wikilink, ex.: `[[04-variaveis-de-ambiente#LOGIN_ENCRYPT_KEY]]`.

---

## Arquivo `.env`

O arquivo `.env` **não é commitado**. Está no `.gitignore`. Para criar:

```bash
cp .env.example .env
# editar com as credenciais reais
```

---

## Variáveis

### HICD_USERNAME

```env
HICD_USERNAME=seu_usuario
```

Login do usuário no sistema HICD. Usado pelo `auth-service.js`.

> [!warning] Nunca comitar
> Esta variável contém credencial real. O `.gitignore` já a exclui via `.env`.

---

### HICD_PASSWORD

```env
HICD_PASSWORD=sua_senha
```

Senha do usuário no sistema HICD. Usado pelo `auth-service.js`.

> [!warning] Nunca comitar

---

### REQUEST_DELAY

```env
REQUEST_DELAY=1000
```

Milissegundos de espera entre requisições ao HICD. Evita rate limiting.
Padrão: `1000` ms. Aumentar se o servidor começar a rejeitar requests.

---

### MAX_RETRIES

```env
MAX_RETRIES=3
```

Número máximo de tentativas antes de desistir de uma operação.
Padrão: `3`. O primeiro login sempre falha (quirk do HICD) — o retry é obrigatório.

---

### PORT

```env
PORT=3000
```

Porta em que a API Express escuta.
Padrão: `3000`.

---

### LOGIN_ENCRYPT_KEY

```env
LOGIN_ENCRYPT_KEY=<hex-64-chars>
```

Chave AES-256-GCM usada para criptografar tokens de autorização da API.
Deve ser uma string hexadecimal de **64 caracteres** (32 bytes).

**Gerar nova chave:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Gerar token de autorização para uso nos requests:**
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

Substitua `USER:PASS` pelas credenciais reais (`HICD_USERNAME:HICD_PASSWORD`).

---

## Uso do token nas chamadas de API

```bash
curl -H "Authorization: <token-base64>" http://localhost:3000/api/clinicas
```

---

## Notas relacionadas

- [[_componentes/auth-service|auth-service]] — onde as variáveis são consumidas
- [[08-infraestrutura]] — como rodar a aplicação
