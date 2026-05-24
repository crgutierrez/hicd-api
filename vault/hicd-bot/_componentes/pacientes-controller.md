---
tags:
  - akita/componente/controller
aliases:
  - PacientesController
  - pacientes-controller
updated: 2026-05-21
tipo: controller
camada: presentation
---

# pacientes-controller

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Handlers Express para todos os endpoints de pacientes: busca, detalhes, evoluções, exames, prescrições e análise clínica agregada.

## Localização

`api/controllers/pacientes.js`

## Contrato (entradas e saídas)

| Método | Handler | Parâmetros |
|--------|---------|------------|
| `buscarPaciente` | GET /api/pacientes/search | `?prontuario=N` ou `?nome=X` |
| `obterDetalhesPaciente` | GET /api/pacientes/:prontuario | `:prontuario` |
| `obterEvolucoesPaciente` | GET /api/pacientes/:prontuario/evolucoes | `?formato=detalhado\|clinico\|resumido&limite=N` |
| `obterAnaliseClinica` | GET /api/pacientes/:prontuario/analise | `:prontuario` |
| `obterExamesPaciente` | GET /api/pacientes/:prontuario/exames | `?formato=detalhado\|resultados\|resumido&incluirResultados=true` |
| `obterPrescricaoPaciente` | GET /api/pacientes/:prontuario/prescricoes | `:prontuario` |
| `buscarPacientePorLeito` | GET /api/pacientes/search-leito | `?leito=N` |

## Edge Cases

### Autenticação
- [ ] Sem `Authorization` → 401
- [ ] Token inválido → 401

### Parâmetros
- [ ] `:prontuario` não-numérico → 400 antes de chamar o crawler
- [ ] `?formato` com valor não-suportado → usar padrão ou 400?
- [ ] `?limite` negativo → usar padrão
- [ ] `?leito` vazio → 400

### Dados
- [ ] Paciente inexistente → 404
- [ ] Paciente sem evoluções → 200 com `[]`
- [ ] Paciente sem exames → 200 com `[]`

### Cache
- [ ] Evoluções cacheadas → segunda request usa cache
- [ ] `DELETE /api/cache/clear` invalida cache

## Casos de teste sugeridos (TDD)

- [ ] **Prontuário não-numérico:** 400 sem chamar o HICD
- [ ] **Paciente inexistente:** 404
- [ ] **Evoluções com limite:** retorna no máximo N itens
- [ ] **Formato resumido:** campos reduzidos
- [ ] **Sem token:** 401

---

## Notas relacionadas

- [[evolution-service]]
- [[patient-service]]
- [[paciente-model]]
- [[evolucao-model]]
- [[exame-model]]
- [[memory-cache]]
