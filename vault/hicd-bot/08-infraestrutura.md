---
tags:
  - akita/infraestrutura
aliases:
  - Infraestrutura
  - Deploy
  - Comandos
updated: 2026-05-21
---

# 08 · Infraestrutura e Dependências

[[CLAUDE|← voltar ao Hub]]

---

## Banco de Dados

**Nenhum banco de dados próprio.** Os dados vêm exclusivamente do servidor HICD externo via scraping. O cache é **in-memory** (não persistido entre restarts).

---

## Servidor HICD (dependência externa)

| Item | Detalhe |
|------|---------|
| Protocolo | HTTP POST para `controller.php` |
| Autenticação | Session cookie mantido pelo [[_componentes/http-client]] |
| Módulos | `ParamModule=Evo` (evoluções), `Exames` → `exame.php`, `Paciente`, `Prescricao` |
| Quirk crítico | **Primeiro login sempre retorna erro** — retry necessário (ver [[_componentes/auth-service]]) |

---

## Estrutura HTML conhecida

> Documentação das páginas do HICD para orientar o parse. Atualizar aqui quando a estrutura mudar.

### Evoluções (ParamModule=Evo)

```
#areaHistEvol
  └── .row × 5 por evolução:
       Row 0: Profissional + Data Evolução
       Row 1: Atividade + Data Atualização
               Label: "Data Atualização:" (não "Data de Atualização:")
       Row 2: "Clinica / Leito:" (sem acento, espaços ao redor do "/")
       Row 3: Descrição label + coluna de conteúdo HTML (com <br> tags)
       Row 4: divider
```

### Exames (ParamModule=Exames → exame.php)

```html
<table class="table1">
  <tr id="SIGLA_CODE">
    <!-- id da <tr> é a sigla do exame -->
    Resultado---------------> VALUE UNIT
    V.R     : REF      <!-- linha separada, formato variável -->
```

Formatos de VR: `"VR:"`, `"V.R     :"`, `"V.R.:"`, `"V. R.:"`.

Blocos complexos sem linha `Resultado-->`: hemograma, TAP, TTPA.

---

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install && mkdir -p output

# API em produção (porta 3000)
npm run api

# API com auto-reload
npm run api-dev

# Crawler direto (extrai todas as clínicas)
npm run full

# Validar configuração
npm run validate

# Debug (requerem .env com credenciais)
node debug-evolucoes.js <prontuario>
node debug-exames.js <prontuario>
node debug-paciente.js <prontuario>
```

---

## Scripts de Teste

```bash
node test-cache.js
node test-parser-evolucao.js
node src/parsers/test-parsers.js
node src/parsers/test-evolucao-parser.js
node src/parsers/test-clinica-parser.js
```

---

## Docker (não containerizado)

Não há `docker-compose.yml`. A aplicação roda diretamente com Node.js.

**Para containerizar:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "api-server.js"]
```

---

## Cache

| Item | Valor |
|------|-------|
| Tipo | In-memory (processo Node) |
| TTL padrão | 10 minutos |
| Cleanup | A cada 5 minutos |
| Persistência | **Nenhuma** — reiniciar o processo limpa o cache |
| API | `GET /api/cache/stats`, `DELETE /api/cache/clear` |

---

## Cloudflare Tunnel

O arquivo `cloudflared.deb` está presente no repositório — usado para expor a API localmente via tunnel. Configuração: `<!-- TODO -->`.

---

## Notas relacionadas

- [[04-variaveis-de-ambiente]]
- [[_componentes/http-client]]
- [[_componentes/auth-service]]
- [[_componentes/memory-cache]]
