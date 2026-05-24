---
tags:
  - akita/componente/model
aliases:
  - Exame
  - exame-model
updated: 2026-05-21
tipo: model
camada: presentation
---

# Exame (model)

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

DTO de exame laboratorial com factories para lista simples e resultados completos.

## Localização

`api/models/Exame.js`

## Contrato (entradas e saídas)

**Factories:**
```js
Exame.fromParserData(raw) → Exame
Exame.fromResultadosCompletos(raw) → Exame
```

**Serializers:**
```js
exame.toCompleto() → { sigla, nome, resultado, vr, unidade, data }
exame.toResumo() → { sigla, nome, resultado }
exame.toResultados() → { sigla, nome, resultado, vr, unidade, subResultados }
```

## Edge Cases

- [ ] `vr` null → `toCompleto()` inclui `vr: null`
- [ ] `subResultados` vazio vs ausente
- [ ] `fromParserData(null)` → comportamento definido

## Casos de teste sugeridos (TDD)

- [ ] **toResumo:** não inclui VR (campo desnecessário no resumo)
- [ ] **toResultados:** inclui sub-resultados quando presentes
- [ ] **VR null:** não omite o campo

---

## Notas relacionadas

- [[exames-parser]]
- [[pacientes-controller]]
