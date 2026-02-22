# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HICD Bot is a Node.js crawler and REST API for extracting and serving data from HICD (Sistema de Prontuário Eletrônico — a Brazilian hospital electronic health records system). The system scrapes patient data, medical evolutions, exams, and prescriptions by authenticating against a remote HICD server.

**Known HICD system quirk**: The first login request always fails by design. The auth service implements automatic retry to handle this.

## Commands

```bash
# Install dependencies
npm install && mkdir -p output

# Start the REST API server (port 3000)
npm run api                    # Production
npm run api-dev                # Development with auto-reload (nodemon)

# Run the crawler directly (extracts all clinics)
npm start                      # index.js
npm run full                   # crawler-completo.js (recommended)

# Check configuration validity
npm run validate               # Validates .env and config.js

# Run individual test scripts (no test framework; all tests are standalone scripts)
node test-cache.js
node test-parser-evolucao.js
node src/parsers/test-parsers.js
node src/parsers/test-evolucao-parser.js
node src/parsers/test-clinica-parser.js

# Clean output files
npm run clean
```

## Architecture

The project has three distinct layers:

### 1. Crawler Core (`src/` + `hicd-crawler-refactored.js`)

`hicd-crawler-refactored.js` is the main entry point used by the API. It composes:
- `src/core/http-client.js` — Axios wrapper that maintains session cookies and handles rate limiting
- `src/services/auth-service.js` — Login/logout with retry logic for the first-request-always-fails bug
- `src/services/patient-service.js` — Clinic and patient list fetching
- `src/services/evolution-service.js` — Medical evolutions, exams, cadastro, and prescriptions
- `src/parsers/hicd-parser.js` — Facade that delegates to specialized parsers:
  - `clinica-parser.js`, `paciente-parser.js`, `exames-parser.js`, `evolucao-parser.js`, `prontuario-parser.js`, `prescricao-parser.js`
- `src/extractors/clinical-data-extractor.js` — Structured clinical data extraction
- `src/analyzers/clinic-analyzer.js` — Per-clinic statistics

All parsers extend `src/parsers/base-parser.js` and use `cheerio` to parse HTML responses from the HICD server.

### 2. REST API (`api/`)

Express server (`api/server.js`) exposed through `api-server.js`:
- `api/routes/` — Route definitions (clinicas, pacientes, cache)
- `api/controllers/clinicas.js`, `api/controllers/pacientes.js` — Request handlers; each controller lazily initializes `HICDCrawler` and calls it on every request (no connection pooling)
- `api/models/` — Data models (`Paciente`, `Evolucao`, `Exame`, `Prescricao`) with `fromParserData()` factory methods and serialization methods (`toCompleto()`, `toResumo()`, `toDadosClinicos()`)
- `api/utils/cache.js` — In-memory `MemoryCache` (TTL 10 min, auto-cleanup every 5 min); used in controllers via `cache.getOrSet(key, fetchFn)`

**API endpoints:**
- `GET /api/clinicas` — List all clinics
- `GET /api/clinicas/:id/pacientes` — Patients in a clinic
- `GET /api/pacientes/search?prontuario=<n>` — Search by prontuário
- `GET /api/pacientes/search-leito?leito=<n>` — Search by bed number
- `GET /api/pacientes/:prontuario` — Full patient details
- `GET /api/pacientes/:prontuario/evolucoes?formato=detalhado|clinico|resumido&limite=N`
- `GET /api/pacientes/:prontuario/exames?formato=detalhado|resultados|resumido`
- `GET /api/pacientes/:prontuario/prescricoes`
- `GET /api/cache/stats`, `DELETE /api/cache/clear`

### 3. Angular Frontend (`hicd-frontend/`)

Angular project (work in progress) structured under `hicd-frontend/src/app/` with modules: `clinics`, `patients`, `evolutions`, `shared`. Uses PrimeNG components. This frontend is separate from the legacy vanilla-JS frontend in `frontend/`.

## Configuration

Credentials and settings come from `.env` (not committed):
```env
HICD_USERNAME=seu_usuario
HICD_PASSWORD=sua_senha
REQUEST_DELAY=1000
MAX_RETRIES=3
PORT=3000
```

`config.js` exports static settings (URLs, network timeouts, selectors) and is loaded separately from `.env`.

## Data Flow

```
HTTP Request → Express Router → Controller
  → initCrawler() [lazy auth] → HICDCrawler
    → EvolutionService/PatientService
      → HICDHttpClient (POST to controller.php)
        → HICDParser → Specialized Parser (cheerio)
  → api/models/* (fromParserData) → JSON response
```

The HICD server uses a single POST endpoint (`controller.php`) for all operations, distinguished by `Param` and `ParamModule` fields in form-encoded bodies.
