---
tags:
  - akita/stack
aliases:
  - Stack
updated: 2026-05-21
---

# 02 · Stack Tecnológica

[[CLAUDE|← voltar ao Hub]]

> Tudo o que está em uso, com versão. Versão importa: muita alucinação de IA vem de assumir versão antiga.

---

## Runtime

| Item | Versão | Observação |
|------|--------|------------|
| Node.js | >= 14.0.0 | Sem TypeScript — JavaScript puro |

---

## Crawler / Scraping (`src/`)

| Lib | Versão | Papel |
|-----|--------|-------|
| axios | ^1.6.0 | HTTP client — mantém cookies de sessão entre requests |
| cheerio | ^1.1.2 | Parse de HTML server-side (jQuery-like) |
| dotenv | ^16.3.1 | Variáveis de ambiente |

---

## API REST (`api/`)

| Lib | Versão | Papel |
|-----|--------|-------|
| express | ^4.18.2 | Framework HTTP |
| helmet | ^8.1.0 | Headers de segurança HTTP |
| morgan | ^1.10.1 | Logging de requests |
| cors | ^2.8.5 | CORS |
| swagger-jsdoc | ^6.2.8 | Geração de spec OpenAPI a partir de JSDoc |
| swagger-ui-express | ^5.0.1 | UI de documentação |

---

## Dev

| Lib | Versão | Papel |
|-----|--------|-------|
| nodemon | ^3.0.1 | Auto-reload em desenvolvimento |

---

## Segurança / Auth

| Item | Detalhe |
|------|---------|
| Auth token da API | AES-256-GCM (crypto nativo Node) |
| Key | `LOGIN_ENCRYPT_KEY` — ver [[04-variaveis-de-ambiente#LOGIN_ENCRYPT_KEY]] |
| Cache | MemoryCache in-process, TTL 10 min, cleanup a cada 5 min |

---

## Frontend (`hicd-frontend/`)

| Item | Observação |
|------|------------|
| Angular | SPA — work in progress, não em produção |
| PrimeNG | Componentes UI |

---

## Sem banco de dados

> [!info] Dados em memória apenas
> Não há banco de dados próprio. Todos os dados vêm do servidor HICD externo via scraping. O cache é **in-memory** e não persiste entre restarts. Ver [[08-infraestrutura]].

---

## Notas relacionadas

- [[01-arquitetura]]
- [[04-variaveis-de-ambiente]]
- [[08-infraestrutura]]
