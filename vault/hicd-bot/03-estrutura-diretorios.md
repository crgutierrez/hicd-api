---
tags:
  - akita/estrutura
aliases:
  - Estrutura
  - Diretórios
updated: 2026-05-21
---

# 03 · Estrutura de Diretórios

[[CLAUDE|← voltar ao Hub]]

---

## Árvore

```
hicd-bot/
├── api/                        # REST API layer (presentation + DTOs)
│   ├── controllers/
│   │   ├── clinicas.js         # listarClinicas, listarPacientesClinica
│   │   └── pacientes.js        # buscarPaciente, obterEvolucoes, obterExames, ...
│   ├── models/
│   │   ├── Paciente.js         # fromParserData, fromListData, toCompleto, toResumo
│   │   ├── Evolucao.js         # fromParserData, toCompleto, toResumo, toDadosClinicos
│   │   ├── Exame.js            # fromParserData, fromResultadosCompletos, toCompleto
│   │   └── Prescricao.js
│   ├── routes/                 # Express route definitions
│   ├── utils/
│   │   └── cache.js            # MemoryCache singleton
│   ├── shared-crawler.js       # Singleton HICDCrawler para toda a API
│   └── server.js               # Express app factory
├── src/                        # Crawler core (Clean Architecture informal)
│   ├── core/
│   │   └── http-client.js      # Infra: Axios + cookies + rate limit
│   ├── services/
│   │   ├── auth-service.js     # Login/logout com retry obrigatório
│   │   ├── patient-service.js  # getPacientesClinica, buscarPacientePorLeito
│   │   └── evolution-service.js# getEvolucoes, getExames, getPrescricoes, getResultadosExames
│   ├── parsers/
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
├── config.js                   # Configurações estáticas (URLs, timeouts, seletores CSS)
├── .env                        # Credenciais (NÃO commitado — ver .gitignore)
├── output/                     # Arquivos de debug/saída (gitignored)
├── hicd-frontend/              # Angular SPA (WIP)
│   └── src/app/
│       ├── clinics/
│       ├── patients/
│       ├── evolutions/
│       └── shared/
└── vault/hicd-bot/             # Esta wiki Obsidian
```

---

## Convenção de nomes

| Padrão | Exemplo | Observação |
|--------|---------|------------|
| `kebab-case.js` | `auth-service.js` | Todos os módulos JS |
| `PascalCase.js` | `Paciente.js` | Models (DTOs) |
| `_` prefix | `_normalizarLabel()` | Método privado (convenção, sem enforcement) |

---

## Onde cada tipo de lógica mora

| Se precisa de... | Vai em |
|-----------------|--------|
| Nova rota HTTP | `api/routes/` + `api/controllers/` |
| Nova lógica de scraping | `src/services/` |
| Novo parse de HTML | `src/parsers/` |
| Novo campo no response | `api/models/` |
| Novo seletor CSS / URL | `config.js` |

---

## Notas relacionadas

- [[01-arquitetura]]
- [[05-componentes]]
