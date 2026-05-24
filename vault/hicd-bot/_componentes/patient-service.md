---
tags:
  - akita/componente/service
aliases:
  - PatientService
  - patient-service
updated: 2026-05-21
tipo: service
camada: application
---

# patient-service

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Buscar a lista de pacientes de uma clínica e localizar pacientes por leito, fazendo as chamadas HTTP ao HICD e delegando o parse ao [[hicd-parser]].

## Localização

`src/services/patient-service.js`

## Contrato (entradas e saídas)

**getPacientesClinica:**
```js
// Entrada
{ clinicaId: string }

// Saída
[{ prontuario, nome, leito, dataInternacao, diasInternacao, ... }]
```

**buscarPacientePorLeito:**
```js
// Entrada
{ leito: string, clinicaId?: string }

// Saída
{ prontuario, nome, leito, ... } | null
```

## Dependências

- [[http-client]] — HTTP POST para o HICD
- [[hicd-parser]] — parse do HTML de resposta
- [[04-variaveis-de-ambiente#REQUEST_DELAY|REQUEST_DELAY]] — delay entre requests

## Edge Cases

### Entradas
- [ ] `clinicaId` inválido / não existente
- [ ] `leito` com formato variável ("1A", "UTI-5", "LEITO 1")
- [ ] `leito` inexistente na clínica → retornar `null`, não lançar erro

### Estado / HICD
- [ ] Clínica sem pacientes (lista vazia) → retornar `[]`
- [ ] Sessão expirada → re-login via auth-service
- [ ] Timeout do HICD → propagar erro

### Dados
- [ ] Paciente com nome contendo `&amp;` (entidades HTML) — ver [[_aprendizados/2026-03-01-paciente-parser-html-entities]]
- [ ] `dataInternacao` ausente no HTML → `null`, não undefined
- [ ] `diasInternacao` não parseável → `null`

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** retorna lista de pacientes para clínica válida
- [ ] **Clínica sem pacientes:** retorna `[]`
- [ ] **Busca por leito existente:** retorna o paciente correto
- [ ] **Busca por leito inexistente:** retorna `null`
- [ ] **Sessão expirada:** re-login e retry transparente
- [ ] **Timeout:** propaga erro descritivo

---

## Notas relacionadas

- [[hicd-parser]]
- [[paciente-parser]]
- [[http-client]]
