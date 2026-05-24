---
tags:
  - akita/componente/model
aliases:
  - Evolucao
  - evolucao-model
updated: 2026-05-21
tipo: model
camada: presentation
---

# Evolucao (model)

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

DTO de evolução com factory method e serializers para os formatos `detalhado`, `clinico` e `resumido` da API.

## Localização

`api/models/Evolucao.js`

## Contrato (entradas e saídas)

**Factory:**
```js
Evolucao.fromParserData(raw) → Evolucao
```

**Serializers:**
```js
evolucao.toCompleto() → {
  profissional, dataEvolucao, dataAtualizacao, atividade,
  clinicaLeito, descricao, textoLimpo, dadosEstruturados
}
evolucao.toResumo() → { profissional, dataEvolucao, atividade, textoLimpo }
evolucao.toDadosClinicos() → { profissional, dataEvolucao, dadosEstruturados }
```

## Edge Cases

- [ ] `dadosEstruturados` vazio (`{}`) → `toDadosClinicos()` retorna `{}`, não `null`
- [ ] `descricao` com `\n` preservados → `toCompleto()` mantém
- [ ] `textoLimpo` sem tags HTML → verificar que não há `<br>` residual
- [ ] Campo ausente no raw → `null`

## Casos de teste sugeridos (TDD)

- [ ] **toCompleto:** todos os 8 campos presentes
- [ ] **toResumo:** apenas 4 campos, sem `descricao` completo
- [ ] **toDadosClinicos:** apenas dados estruturados + identificação
- [ ] **dadosEstruturados vazio:** `{}`, não null

---

## Notas relacionadas

- [[evolucao-parser]]
- [[pacientes-controller]]
