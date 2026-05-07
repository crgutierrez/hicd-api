# Componentes

## Controllers

| Controller | Métodos principais |
|---|---|
| `api/controllers/clinicas.js` | `listarClinicas`, `listarPacientesClinica` |
| `api/controllers/pacientes.js` | `buscarPaciente`, `obterDetalhesPaciente`, `obterEvolucoesPaciente`, `obterAnaliseClinica`, `obterExamesPaciente`, `obterPrescricaoPaciente`, `buscarPacientePorLeito` |

## Models

| Model | Factories | Serializadores |
|---|---|---|
| `Paciente` | `fromParserData(raw, prontuario)`, `fromListData(raw)` | `toCompleto()`, `toResumo()` |
| `Evolucao` | `fromParserData(raw)` | `toCompleto()`, `toResumo()`, `toDadosClinicos()` |
| `Exame` | `fromParserData(raw)`, `fromResultadosCompletos(raw)` | `toCompleto()`, `toResumo()`, `toResultados()` |
| `Prescricao` | via `getPrescricoesPaciente` | — |

## Services

| Service | Responsabilidade |
|---|---|
| `auth-service.js` | Login com retry (primeiro login sempre falha no HICD) |
| `patient-service.js` | `getPacientesClinica()`, `buscarPacientePorLeito()` |
| `evolution-service.js` | `getEvolucoes()`, `getExames()`, `getPrescricoes()`, `getResultadosExames()` |

## Parsers

| Parser | Entrada | Saída principal |
|---|---|---|
| `clinica-parser.js` | HTML lista clínicas | `[{id, nome}]` |
| `paciente-parser.js` | HTML cadastro/lista | `{prontuario, nome, dataInternacao, ...}` |
| `exames-parser.js` | HTML `exame.php` | `[{sigla, nome, resultado, vr, ...}]` |
| `evolucao-parser.js` | HTML `#areaHistEvol` | `{profissional, dataEvolucao, descricao, dadosEstruturados}` |
| `prescricao-parser.js` | HTML prescrição | `[{medicamento, dose, ...}]` |

## Endpoints REST

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/clinicas` | Lista todas as clínicas |
| GET | `/api/clinicas/:id/pacientes` | Pacientes de uma clínica |
| GET | `/api/pacientes/search?prontuario=N` | Busca por prontuário |
| GET | `/api/pacientes/search?nome=X` | Busca por nome |
| GET | `/api/pacientes/search-leito?leito=N` | Busca por leito |
| GET | `/api/pacientes/:prontuario` | Detalhes completos do paciente |
| GET | `/api/pacientes/:prontuario/evolucoes` | Evoluções (`formato`, `limite`) |
| GET | `/api/pacientes/:prontuario/exames` | Exames (`formato`, `incluirResultados`) |
| GET | `/api/pacientes/:prontuario/prescricoes` | Prescrições |
| GET | `/api/pacientes/:prontuario/analise` | Análise clínica agregada |
| GET | `/api/cache/stats` | Estatísticas do cache |
| DELETE | `/api/cache/clear` | Limpa o cache |

## Cache

`api/utils/cache.js` — `MemoryCache` singleton:
- TTL: **10 minutos**
- Cleanup automático: **a cada 5 minutos**
- Uso: `cache.getOrSet(key, asyncFn)`
- Chaves: `cache.generateKey(tipo, prontuario, params?)`
