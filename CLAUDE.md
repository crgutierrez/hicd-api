# CLAUDE.md

Guia de referência para o Claude Code trabalhar neste repositório. Inclui arquitetura, stack, padrões, variáveis de ambiente, aprendizados e regras de negócio.

---

## 1. Visão Geral da Arquitetura

**Tipo**: Monorepo. Todo o código (crawler, API REST, frontend Angular) vive num único repositório.

**Divisão de serviços** (camadas independentes, não microsserviços):

```
┌─────────────────────────────────────────────────┐
│  Angular Frontend  (hicd-frontend/)             │  ← SPA (work in progress)
├─────────────────────────────────────────────────┤
│  REST API          (api/ + api-server.js)        │  ← Express, porta 3000
├─────────────────────────────────────────────────┤
│  Crawler Core      (src/ + hicd-crawler-refactored.js) │  ← scraping + parsing
├─────────────────────────────────────────────────┤
│  HICD Server externo (controller.php)           │  ← origem dos dados
└─────────────────────────────────────────────────┘
```

**Fluxo de dados**:
```
HTTP Request → Express Router → Controller
  → initCrawler() [lazy auth] → HICDCrawler
    → EvolutionService / PatientService
      → HICDHttpClient (POST controller.php)
        → HICDParser → Parser especializado (cheerio)
  → api/models/* (fromParserData) → JSON response
```

**Quirk crítico**: o HICD exige dois logins — o primeiro sempre falha por design. O `auth-service.js` faz retry automático.

---

## 2. Stack Tecnológica Completa

| Camada | Tecnologia | Versão / Notas |
|---|---|---|
| Runtime | Node.js | >= 14.0.0 |
| HTTP client (scraping) | Axios | ^1.6.0 — mantém cookies de sessão |
| HTML parsing | Cheerio | ^1.1.2 — jQuery-like server-side |
| API server | Express | ^4.18.2 |
| Segurança HTTP | Helmet | ^8.1.0 |
| Logging HTTP | Morgan | ^1.10.1 |
| CORS | cors | ^2.8.5 |
| Docs API | swagger-jsdoc + swagger-ui-express | ^6.2.8 / ^5.0.1 |
| Config | dotenv | ^16.3.1 |
| Dev reload | nodemon | ^3.0.1 |
| Frontend | Angular + PrimeNG | (hicd-frontend/ — WIP) |
| Auth token | AES-256-GCM (crypto nativo Node) | key em LOGIN_ENCRYPT_KEY |
| Cache | MemoryCache in-process | TTL 10 min, cleanup 5 min |

---

## 3. Estrutura de Diretórios

```
hicd-bot/
├── api/                        # REST API layer
│   ├── controllers/            # Request handlers (clinicas.js, pacientes.js)
│   ├── models/                 # Domain models (Paciente, Evolucao, Exame, Prescricao)
│   ├── routes/                 # Express route definitions
│   ├── utils/cache.js          # MemoryCache singleton
│   ├── shared-crawler.js       # Singleton HICDCrawler para toda a API
│   └── server.js               # Express app factory
├── src/                        # Crawler core (Clean Architecture informal)
│   ├── core/
│   │   └── http-client.js      # Infraestrutura: Axios + cookies + rate limit
│   ├── services/               # Casos de uso
│   │   ├── auth-service.js     # Login/logout com retry
│   │   ├── patient-service.js  # Lista de clínicas e pacientes
│   │   └── evolution-service.js# Evoluções, exames, cadastro, prescrições
│   ├── parsers/                # Adapters: HTML → objetos JS
│   │   ├── base-parser.js      # Classe base (todos os parsers estendem)
│   │   ├── hicd-parser.js      # Fachada — delega aos parsers especializados
│   │   ├── clinica-parser.js
│   │   ├── paciente-parser.js  # Usa regex (não cheerio) — mais rápido
│   │   ├── exames-parser.js
│   │   ├── evolucao-parser.js
│   │   ├── prontuario-parser.js
│   │   └── prescricao-parser.js
│   ├── extractors/
│   │   └── clinical-data-extractor.js  # Extração estruturada de dados clínicos
│   └── analyzers/
│       └── clinic-analyzer.js  # Estatísticas por clínica
├── hicd-crawler-refactored.js  # Entry point do crawler (usado pela API)
├── api-server.js               # Entry point da API (chama api/server.js)
├── hicd-frontend/              # Angular SPA (WIP)
│   └── src/app/
│       ├── clinics/
│       ├── patients/
│       ├── evolutions/
│       └── shared/
├── config.js                   # Configurações estáticas (URLs, timeouts, seletores)
├── .env                        # Credenciais (NÃO commitado)
├── output/                     # Arquivos de debug/saída (gitignored)
└── vault/hicd-bot/             # Wiki Obsidian deste projeto
```

**Padrão de organização**: Clean Architecture informal — `core` (infra), `services` (casos de uso), `parsers` (adapters), `models` (entidades/DTOs).

---

## 4. Variáveis de Ambiente

Arquivo `.env` (não commitado). Copiar `.env.example` se existir.

```env
# Credenciais HICD
HICD_USERNAME=seu_usuario
HICD_PASSWORD=sua_senha

# Comportamento do crawler
REQUEST_DELAY=1000        # ms entre requisições (evitar rate limiting)
MAX_RETRIES=3             # tentativas antes de desistir

# API
PORT=3000

# Auth token da API (AES-256-GCM, 32 bytes hex = 64 chars)
LOGIN_ENCRYPT_KEY=<hex-64-chars>
```

**Gerar token de autorização para a API**:
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

---

## 5. Definição de Componentes

### Controllers (`api/controllers/`)

| Controller | Métodos | Responsabilidade |
|---|---|---|
| `clinicas.js` | `listarClinicas`, `listarPacientesClinica` | Lista clínicas e pacientes por clínica |
| `pacientes.js` | `buscarPaciente`, `obterDetalhesPaciente`, `obterEvolucoesPaciente`, `obterAnaliseClinica`, `obterExamesPaciente`, `obterPrescricaoPaciente`, `buscarPacientePorLeito` | CRUD de pacientes e dados clínicos |

### Models (`api/models/`)

| Model | Factory | Serializadores |
|---|---|---|
| `Paciente` | `fromParserData(raw, prontuario)`, `fromListData(raw)` | `toCompleto()`, `toResumo()` |
| `Evolucao` | `fromParserData(raw)` | `toCompleto()`, `toResumo()`, `toDadosClinicos()` |
| `Exame` | `fromParserData(raw)`, `fromResultadosCompletos(raw)` | `toCompleto()`, `toResumo()`, `toResultados()` |
| `Prescricao` | via `getPrescricoesPaciente` | — |

### Services (`src/services/`)

| Service | Responsabilidade |
|---|---|
| `auth-service.js` | Login com retry (primeiro login sempre falha no HICD) |
| `patient-service.js` | `getPacientesClinica()`, `buscarPacientePorLeito()` |
| `evolution-service.js` | `getEvolucoes()`, `getExames()`, `getPrescricoes()`, `getResultadosExames()` |

### Parsers (`src/parsers/`)

| Parser | Entrada | Saída |
|---|---|---|
| `clinica-parser.js` | HTML lista clínicas | `[{id, nome}]` |
| `paciente-parser.js` | HTML lista/cadastro paciente | `{prontuario, nome, dataInternacao, ...}` |
| `exames-parser.js` | HTML `exame.php` | `[{sigla, nome, resultado, vr, ...}]` |
| `evolucao-parser.js` | HTML `#areaHistEvol` | `{profissional, dataEvolucao, descricao, dadosEstruturados, ...}` |
| `prescricao-parser.js` | HTML prescrição | `[{medicamento, dose, ...}]` |

### Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/clinicas` | Lista todas as clínicas |
| GET | `/api/clinicas/:id/pacientes` | Pacientes de uma clínica |
| GET | `/api/pacientes/search?prontuario=N` | Busca por prontuário |
| GET | `/api/pacientes/search?nome=X` | Busca por nome |
| GET | `/api/pacientes/search-leito?leito=N` | Busca por leito |
| GET | `/api/pacientes/:prontuario` | Detalhes completos |
| GET | `/api/pacientes/:prontuario/evolucoes?formato=detalhado\|clinico\|resumido&limite=N` | Evoluções |
| GET | `/api/pacientes/:prontuario/exames?formato=detalhado\|resultados\|resumido&incluirResultados=true` | Exames |
| GET | `/api/pacientes/:prontuario/prescricoes` | Prescrições |
| GET | `/api/pacientes/:prontuario/analise` | Análise clínica agregada |
| GET | `/api/cache/stats` | Estatísticas do cache |
| DELETE | `/api/cache/clear` | Limpa o cache |

---

## 6. Instruções Corretivas e Aprendizados

> Registre aqui falhas da IA, alucinações e soluções. **Formato**: data · problema · causa · solução.

### 2026-03-01 — `evolucao-parser.js`: colapso de newlines
- **Problema**: `limparTextoEvolucao` usava `.replace(/\s+/g, ' ')` — colapsava `\n` em espaço.
- **Causa**: regex genérica demais.
- **Solução**: usar `[^\S\n]+` para preservar quebras de linha: `.replace(/[^\S\n]+/g, ' ')`.

### 2026-03-01 — `parseSecaoSimples`: regex literal com newline
- **Problema**: regex com newline literal quebrava o parse de seções.
- **Solução**: usar lista de seções conhecidas como lookahead delimitador.

### 2026-03-01 — `extrairCampoDaLinha`: acento vs sem acento
- **Problema**: o HICD usa "Clinica / Leito:" (sem acento, com espaços ao redor do `/`), não "Clínica/Leito:".
- **Solução**: normalizar labels com `_normalizarLabel()` antes de comparar.

### 2026-03-01 — flags de regex em `extrairDadosEstruturadosEvolucao`
- **Problema**: evoluções em CAIXA ALTA ("EXAME FÍSICO:") não eram capturadas.
- **Solução**: adicionar flag `'i'` em todos os `extrairValor` dessa função.

### 2026-03-01 — `(?:\s+\w+)*` consumindo dígitos e newlines
- **Problema**: padrão `(?:\s+\w+)*` após nome de seção consumia `\n\n1` de listas numeradas.
- **Solução**: usar `(?:[^\S\n]+\w+)*` para restringir a espaço horizontal.

### 2026-03-01 — `exames-parser.js`: regex VR
- **Problema**: formato "V.R     :" (com pontos e espaços) não era capturado.
- **Solução**: regex `/\bVR\s*:|V\.?\s*R\.?\s*:/i`.

### 2026-03-01 — `paciente-parser.js`: entidades HTML e `dataInternacao`
- **Problema**: nomes com `&amp;` não eram decodificados; `dataInternacao` e `diasInternacao` não eram extraídos da lista.
- **Solução**: decodificar entidades HTML; ajustar seletores de extração.

---

## 7. Histórias de Usuário e Domínio

### Domínio
Sistema de prontuário eletrônico hospitalar brasileiro (HICD). Usuários são profissionais de saúde (médicos, enfermeiros, gestores) que precisam acessar dados de pacientes internados.

### Histórias Implementadas

**US-01 — Listar pacientes de uma clínica**
> Como gestor, quero ver todos os pacientes internados numa clínica, para monitorar a ocupação.
- `GET /api/clinicas/:id/pacientes`

**US-02 — Buscar paciente por prontuário**
> Como médico, quero buscar um paciente pelo número de prontuário para acessar seus dados rapidamente.
- `GET /api/pacientes/search?prontuario=N`

**US-03 — Buscar paciente por leito**
> Como enfermeiro, quero encontrar o paciente de um leito específico.
- `GET /api/pacientes/search-leito?leito=N`

**US-04 — Ver evoluções médicas**
> Como médico, quero acessar o histórico de evoluções de um paciente, com opção de formato resumido ou clínico.
- `GET /api/pacientes/:prontuario/evolucoes?formato=detalhado|clinico|resumido&limite=N`

**US-05 — Ver exames laboratoriais**
> Como médico, quero ver os exames de um paciente e seus resultados estruturados.
- `GET /api/pacientes/:prontuario/exames?incluirResultados=true`

**US-06 — Ver prescrições**
> Como farmacêutico, quero ver a prescrição atual de um paciente.
- `GET /api/pacientes/:prontuario/prescricoes`

**US-07 — Análise clínica agregada**
> Como médico, quero uma visão consolidada: dados do paciente + última evolução + exames recentes.
- `GET /api/pacientes/:prontuario/analise`

### Regras de Negócio

- **Autenticação**: API exige header `Authorization` com token AES-256-GCM ou sessão via `POST /api/auth/login`.
- **Cache**: respostas são cacheadas 10 minutos para reduzir carga no HICD.
- **Retry de login**: o primeiro login no HICD sempre falha — sistema faz retry automático.
- **Rate limiting**: `REQUEST_DELAY` ms entre requisições para não sobrecarregar o servidor HICD.
- **Dados clínicos estruturados**: evoluções são parseadas para extrair seções (Hipóteses Diagnósticas, Exame Físico, Conduta, Diurese, BH 24h, Medicamentos em uso).

---

## 8. Infraestrutura e Dependências

### Banco de Dados
Nenhum banco de dados próprio. Os dados vêm exclusivamente do servidor HICD externo via scraping. O cache é **in-memory** (não persistido entre restarts).

### Servidor HICD (dependência externa)
- **Protocolo**: HTTP POST para `controller.php`
- **Autenticação**: session cookie mantido pelo `http-client.js`
- **Módulos** (campo `ParamModule`): `Evo` (evoluções), `Exames` → `exame.php`, `Paciente`, `Prescricao`
- **Quirk**: primeiro login sempre retorna erro — retry necessário

### Docker
Não há `docker-compose.yml` presente. A aplicação roda diretamente com Node.js. Para containerizar:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "api-server.js"]
```

### Comandos de Desenvolvimento

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

# Scripts de teste individuais
node test-cache.js
node test-parser-evolucao.js
node src/parsers/test-parsers.js
node src/parsers/test-evolucao-parser.js
node src/parsers/test-clinica-parser.js

# Scripts de debug (requerem .env com credenciais)
node debug-evolucoes.js <prontuario>
node debug-exames.js <prontuario>

# Limpar output
npm run clean
```

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
