# Estrutura de Diretórios

Organização do monorepo seguindo **Clean Architecture informal**:
- `core` → infraestrutura
- `services` → casos de uso
- `parsers` → adapters (HTML → JS)
- `models` → entidades/DTOs

```
hicd-bot/
│
├── api/                          # REST API layer
│   ├── controllers/
│   │   ├── clinicas.js           # listarClinicas, listarPacientesClinica
│   │   └── pacientes.js          # buscarPaciente, obterEvolucoes, obterExames...
│   ├── models/
│   │   ├── Paciente.js           # fromParserData, fromListData → toCompleto, toResumo
│   │   ├── Evolucao.js           # fromParserData → toCompleto, toDadosClinicos
│   │   ├── Exame.js              # fromParserData, fromResultadosCompletos
│   │   └── Prescricao.js
│   ├── routes/
│   │   ├── clinicas.js
│   │   ├── pacientes.js
│   │   └── cache.js
│   ├── utils/
│   │   └── cache.js              # MemoryCache (TTL 10min)
│   ├── shared-crawler.js         # Singleton HICDCrawler
│   └── server.js                 # Express app factory
│
├── src/                          # Crawler core
│   ├── core/
│   │   └── http-client.js        # Axios + cookies + rate limiting
│   ├── services/
│   │   ├── auth-service.js       # Login com retry automático
│   │   ├── patient-service.js    # getPacientesClinica, buscarPorLeito
│   │   └── evolution-service.js  # getEvolucoes, getExames, getPrescricoes
│   ├── parsers/
│   │   ├── base-parser.js        # Classe base (todos estendem)
│   │   ├── hicd-parser.js        # Fachada — delega aos especializados
│   │   ├── clinica-parser.js
│   │   ├── paciente-parser.js    # Usa regex em vez de cheerio (performance)
│   │   ├── exames-parser.js
│   │   ├── evolucao-parser.js
│   │   ├── prontuario-parser.js
│   │   └── prescricao-parser.js
│   ├── extractors/
│   │   └── clinical-data-extractor.js  # Extração estruturada de dados clínicos
│   └── analyzers/
│       └── clinic-analyzer.js    # Estatísticas por clínica
│
├── hicd-crawler-refactored.js    # Entry point do crawler (usado pela API)
├── api-server.js                 # Entry point da API
├── config.js                     # Configs estáticas (URLs, timeouts, seletores)
├── .env                          # Credenciais (NÃO commitado)
│
├── hicd-frontend/                # Angular SPA (WIP)
│   └── src/app/
│       ├── clinics/
│       ├── patients/
│       ├── evolutions/
│       └── shared/
│
├── output/                       # Debug/saída (gitignored)
└── vault/hicd-bot/               # Esta wiki Obsidian
```
