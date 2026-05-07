# Arquitetura

## Tipo de projeto

**Monorepo** — crawler, API REST e frontend Angular num único repositório.

## Camadas

```
┌─────────────────────────────────────────────────┐
│  Angular Frontend  (hicd-frontend/)             │  SPA — work in progress
├─────────────────────────────────────────────────┤
│  REST API          (api/ + api-server.js)        │  Express, porta 3000
├─────────────────────────────────────────────────┤
│  Crawler Core      (src/ + hicd-crawler-refactored.js)  │  scraping + parsing
├─────────────────────────────────────────────────┤
│  HICD Server externo (controller.php)           │  origem dos dados
└─────────────────────────────────────────────────┘
```

## Fluxo de dados

```
HTTP Request
  → Express Router
  → Controller (lazy auth via initCrawler)
    → HICDCrawler
      → EvolutionService / PatientService
        → HICDHttpClient (POST controller.php)
          → HICDParser → Parser especializado (cheerio)
  → api/models/* (fromParserData)
  → JSON response
```

## Decisões arquiteturais

- **Sem banco de dados próprio** — dados vêm exclusivamente do scraping do HICD.
- **Cache in-memory** — MemoryCache com TTL de 10 minutos; não persiste entre restarts.
- **Singleton do crawler** — `api/shared-crawler.js` garante uma única instância autenticada para toda a API.
- **Parsers separados por domínio** — cada tipo de dado (clínica, paciente, exame, evolução) tem seu parser especializado.

## Quirk crítico do HICD

> O primeiro login sempre falha por design do servidor. O `auth-service.js` faz retry automático.

O HICD usa um único endpoint POST (`controller.php`) para todas as operações, diferenciadas pelo campo `ParamModule` no corpo da requisição.
