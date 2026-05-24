---
tags:
  - akita/componentes
aliases:
  - Componentes
updated: 2026-05-21
---

# 05 · Definição de Componentes

[[CLAUDE|← voltar ao Hub]]

> Índice de todos os componentes. Cada componente tem **uma nota canônica** em `_componentes/`. Esta nota só lista e linka.

---

## Controllers (Presentation)

| Componente | Nota | Responsabilidade |
|------------|------|-----------------|
| ClinicasController | [[_componentes/clinicas-controller]] | Listar clínicas e pacientes por clínica |
| PacientesController | [[_componentes/pacientes-controller]] | Busca, detalhes, evoluções, exames, prescrições, análise |

---

## Services (Application)

| Componente | Nota | Responsabilidade |
|------------|------|-----------------|
| AuthService | [[_componentes/auth-service]] | Login/logout com retry obrigatório |
| PatientService | [[_componentes/patient-service]] | Lista pacientes, busca por leito |
| EvolutionService | [[_componentes/evolution-service]] | Evoluções, exames, prescrições, resultados |

---

## Parsers (Adapters)

| Componente | Nota | Responsabilidade |
|------------|------|-----------------|
| HICDParser | [[_componentes/hicd-parser]] | Fachada — delega aos parsers especializados |
| EvolucaoParser | [[_componentes/evolucao-parser]] | HTML `#areaHistEvol` → objetos de evolução |
| ExamesParser | [[_componentes/exames-parser]] | HTML `exame.php` → objetos de exame |
| PacienteParser | [[_componentes/paciente-parser]] | HTML lista/cadastro → objeto de paciente |
| ClinicaParser | [[_componentes/clinica-parser]] | HTML lista → `[{id, nome}]` |
| PrescricaoParser | [[_componentes/prescricao-parser]] | HTML prescrição → `[{medicamento, dose, ...}]` |

---

## Models (Entidades/DTOs)

| Componente | Nota | Responsabilidade |
|------------|------|-----------------|
| Paciente | [[_componentes/paciente-model]] | DTO de paciente com serialização |
| Evolucao | [[_componentes/evolucao-model]] | DTO de evolução com dadosEstruturados |
| Exame | [[_componentes/exame-model]] | DTO de exame com resultados |

---

## Infra

| Componente | Nota | Responsabilidade |
|------------|------|-----------------|
| HICDHttpClient | [[_componentes/http-client]] | Axios + cookies de sessão + rate limit |
| MemoryCache | [[_componentes/memory-cache]] | Cache in-memory TTL 10min |
| SharedCrawler | [[_componentes/shared-crawler]] | Singleton HICDCrawler para toda a API |

---

## Endpoints da API

| Método | Rota | Controller |
|--------|------|------------|
| GET | `/api/clinicas` | ClinicasController.listarClinicas |
| GET | `/api/clinicas/:id/pacientes` | ClinicasController.listarPacientesClinica |
| GET | `/api/pacientes/search?prontuario=N` | PacientesController.buscarPaciente |
| GET | `/api/pacientes/search?nome=X` | PacientesController.buscarPaciente |
| GET | `/api/pacientes/search-leito?leito=N` | PacientesController.buscarPacientePorLeito |
| GET | `/api/pacientes/:prontuario` | PacientesController.obterDetalhesPaciente |
| GET | `/api/pacientes/:prontuario/evolucoes` | PacientesController.obterEvolucoesPaciente |
| GET | `/api/pacientes/:prontuario/exames` | PacientesController.obterExamesPaciente |
| GET | `/api/pacientes/:prontuario/prescricoes` | PacientesController.obterPrescricaoPaciente |
| GET | `/api/pacientes/:prontuario/analise` | PacientesController.obterAnaliseClinica |
| GET | `/api/cache/stats` | — |
| DELETE | `/api/cache/clear` | — |

---

## Notas relacionadas

- [[01-arquitetura]]
- [[03-estrutura-diretorios]]
