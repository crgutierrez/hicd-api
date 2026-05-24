---
tags:
  - akita/componente/parser
aliases:
  - ClinicaParser
  - clinica-parser
updated: 2026-05-21
tipo: parser
camada: adapters
---

# clinica-parser

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Converter o HTML da lista de clínicas do HICD em array `[{id, nome}]`.

## Localização

`src/parsers/clinica-parser.js`

## Contrato (entradas e saídas)

**Saída:**
```js
[{ id: string, nome: string }]
```

## Edge Cases

- [ ] HTML sem clínicas → `[]`
- [ ] Clínica com nome vazio → excluir ou incluir com `nome: ""`
- [ ] `id` duplicado → incluir ambos (é dado do HICD, não nosso problema normalizar)
- [ ] HTML null → `[]`

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** lista de `{id, nome}` extraída
- [ ] **HTML null:** retorna `[]`
- [ ] **Lista vazia:** retorna `[]`

---

## Notas relacionadas

- [[hicd-parser]]
- [[clinicas-controller]]
