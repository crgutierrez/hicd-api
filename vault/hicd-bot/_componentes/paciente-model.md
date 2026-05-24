---
tags:
  - akita/componente/model
aliases:
  - Paciente
  - paciente-model
updated: 2026-05-21
tipo: model
camada: presentation
---

# Paciente (model)

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

DTO de paciente com factory methods para criar a partir do parser e serializers para diferentes formatos de resposta da API.

## Localização

`api/models/Paciente.js`

## Contrato (entradas e saídas)

**Factories:**
```js
Paciente.fromParserData(raw, prontuario) → Paciente
Paciente.fromListData(raw) → Paciente
```

**Serializers:**
```js
paciente.toCompleto() → { prontuario, nome, dataNascimento, sexo, convenio, dataInternacao, diasInternacao, medico, diagnostico }
paciente.toResumo() → { prontuario, nome, leito, dataInternacao, diasInternacao }
```

## Edge Cases

- [ ] `fromParserData(null)` → comportamento definido (não lançar, retornar objeto vazio ou lançar erro descritivo)
- [ ] `fromParserData` com campos opcionais ausentes → `null` nos campos, não `undefined`
- [ ] `toCompleto()` não vaza dados sensíveis (credenciais, internos)
- [ ] `toResumo()` inclui apenas campos documentados

## Casos de teste sugeridos (TDD)

- [ ] **fromListData:** campos de lista extraídos corretamente
- [ ] **fromParserData:** campos de cadastro extraídos
- [ ] **toResumo:** não inclui campos de `toCompleto`
- [ ] **Campo ausente no raw:** `null`, não `undefined`

---

## Notas relacionadas

- [[paciente-parser]]
- [[pacientes-controller]]
