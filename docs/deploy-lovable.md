# Deploy da API HICD para uso com Lovable

## Contexto importante

O **Lovable** é um gerador de frontends React — ele não hospeda APIs Node.js diretamente.
A arquitetura correta é:

```
[Lovable Frontend (React)] ──── HTTPS ────► [API HICD (Node.js/Express)]
        lovable.app                              Railway ou Render
```

A API precisa ser hospedada em um serviço separado que suporte processos Node.js
persistentes (não serverless), pois ela mantém sessão de cookies com o HICD entre requisições.

Plataformas recomendadas: **Railway** (mais simples) ou **Render** (free tier generoso).

---

## Pré-requisitos

- Conta no [Railway](https://railway.app) ou [Render](https://render.com)
- Repositório no GitHub com o código desta API
- `LOGIN_ENCRYPT_KEY` gerada (ver `.env`)

---

## Opção A — Deploy no Railway (recomendado)

### 1. Preparar o projeto

Certifique-se de que o `package.json` tem o script `start`:

```json
"scripts": {
  "start": "node api-server.js"
}
```

Confirme que o servidor escuta na porta do ambiente:

```js
// api-server.js
const PORT = process.env.PORT || 3000;
```

Já está configurado assim. ✅

### 2. Criar o serviço no Railway

1. Acesse [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Selecione este repositório
3. O Railway detecta automaticamente o Node.js e usa `npm start`

### 3. Configurar variáveis de ambiente

No painel do Railway → **Variables**, adicione:

| Variável | Valor |
|---|---|
| `LOGIN_ENCRYPT_KEY` | *(valor do seu `.env`)* |
| `NODE_ENV` | `production` |
| `PORT` | *(deixar em branco — Railway injeta automaticamente)* |

### 4. Obter a URL pública

Após o deploy → **Settings → Domains → Generate Domain**.
Você receberá algo como:
```
https://hicd-api-production.up.railway.app
```

---

## Opção B — Deploy no Render

### 1. Conectar o repositório

1. Acesse [render.com](https://render.com) e faça login (pode usar conta GitHub)
2. No dashboard → **New → Web Service**
3. Selecione **Build and deploy from a Git repository**
4. Autorize o acesso ao GitHub e selecione este repositório

### 2. Configurar o serviço

Preencha os campos:

| Campo | Valor |
|---|---|
| **Name** | `hicd-api` *(ou qualquer nome)* |
| **Region** | `Oregon (US West)` *(ou o mais próximo)* |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node api-server.js` |
| **Instance Type** | `Free` *(ou Starter para sem sleep)* |

> ⚠️ O script `start` do `package.json` aponta para `index.js` (crawler CLI),
> não para o servidor da API. Por isso o Start Command deve ser **`node api-server.js`**
> explicitamente, e não `npm start`.

### 3. Configurar variáveis de ambiente

Na mesma tela de criação, role até **Environment Variables** e adicione:

| Variável | Valor |
|---|---|
| `LOGIN_ENCRYPT_KEY` | *(valor do seu `.env`)* |
| `NODE_ENV` | `production` |

> O Render injeta `PORT` automaticamente — não é necessário configurar.

Clique em **Create Web Service** para iniciar o primeiro deploy.

### 4. Obter a URL pública

Após o deploy concluir, o Render exibe a URL no topo do painel do serviço:

```
https://hicd-api.onrender.com
```

Teste com:

```bash
curl https://hicd-api.onrender.com/api/health
```

### 5. Limitações do plano Free

| Comportamento | Detalhe |
|---|---|
| **Sleep após inatividade** | O serviço dorme após **15 minutos** sem requisições |
| **Cold start** | Primeira requisição após sleep demora ~30 segundos |
| **Perda de sessão** | O crawler perde o login HICD ao dormir — será necessário reautenticar via `Authorization` header ou `POST /api/auth/login` |
| **Horas de execução** | 750 horas/mês no plano Free (suficiente para uso contínuo em um único serviço) |

Para evitar o sleep, considere:
- **Plano Starter** ($7/mês) — sem sleep, mais memória
- Ou use um serviço de ping periódico (ex: UptimeRobot gratuito, configurado para fazer GET em `/api/health` a cada 10 minutos)

### 6. Redeploy automático

Por padrão o Render faz deploy automático a cada push na branch configurada. Para desativar:
**Settings → Build & Deploy → Auto-Deploy → Disable**

---

## Configurar CORS para o domínio do Lovable

Após hospedar a API, você precisa liberar o domínio do seu projeto Lovable.

Edite `api/server.js`:

```js
// Substituir:
app.use(cors());

// Por:
app.use(cors({
    origin: [
        'https://seu-projeto.lovable.app',  // domínio do Lovable
        'http://localhost:5173',             // desenvolvimento local
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Integrar com o Lovable

### 1. Definir a URL base da API no frontend

No projeto Lovable, crie um arquivo `src/lib/api.ts`:

```ts
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function login(payload: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
    });
    return res.json();
}

export async function getPacientes(clinicaId: string) {
    const res = await fetch(`${API_BASE}/api/clinicas/${clinicaId}/pacientes`);
    return res.json();
}

export async function getEvolucoes(prontuario: string) {
    const res = await fetch(`${API_BASE}/api/pacientes/${prontuario}/evolucoes`);
    return res.json();
}
```

### 2. Definir a variável de ambiente no Lovable

No painel do Lovable → **Settings → Environment Variables**:

```
VITE_API_URL=https://hicd-api-production.up.railway.app
```

---

## Fluxo de uso após o deploy

```
1. Gerar payload:
   node payload.js usuario senha

2. Fazer login na API:
   POST /api/auth/login  { payload: "..." }
   → O crawler autentica no HICD e fica pronto

3. Consumir os dados pelo frontend Lovable:
   GET /api/clinicas
   GET /api/clinicas/007/pacientes
   GET /api/pacientes/:prontuario/evolucoes
   etc.
```

> ⚠️ **Sessão:** o login no HICD é armazenado em memória. Se o servidor reiniciar
> (ex: novo deploy, sleep do Render), será necessário fazer o login novamente via
> `POST /api/auth/login`.

---

## Checklist de deploy

- [ ] `package.json` tem script `start`
- [ ] Servidor usa `process.env.PORT`
- [ ] `LOGIN_ENCRYPT_KEY` configurada nas variáveis do serviço
- [ ] CORS liberado para o domínio do Lovable
- [ ] `VITE_API_URL` configurada no projeto Lovable
- [ ] Teste de login via `POST /api/auth/login` funcionando na URL de produção
- [ ] Teste de endpoint protegido (`GET /api/clinicas`) retornando dados

---

## Referências

- [Deploy no Railway](https://railway.app)
- [Deploy no Render](https://render.com)
- [Conectando frontend Lovable a backend customizado](https://medium.com/@Faizahameds/integrating-loveable-generated-frontend-with-a-custom-node-js-backend-vite-tailwind-mongoose-12e3eb963d2e)
- [Guia de deploy do Lovable](https://vibecodingwithfred.com/blog/3-ways-to-move-lovable-website/)
- [Integração Lovable + Strapi (exemplo de backend externo)](https://strapi.io/blog/how-to-build-a-frontend-with-lovable-dev-for-your-strapi-backend)
