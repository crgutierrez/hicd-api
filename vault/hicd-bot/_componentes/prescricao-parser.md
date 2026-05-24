---
tags:
  - akita/componente/parser
aliases:
  - PrescricaoParser
  - prescricao-parser
updated: 2026-05-21
tipo: parser
camada: adapters
---

# prescricao-parser

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Converter o HTML da prescrição médica do HICD em lista de medicamentos estruturados.

## Localização

`src/parsers/prescricao-parser.js`

## Contrato (entradas e saídas)

**Saída:**
```js
[{
  medicamento: string,
  dose: string,
  frequencia: string,
  via: string,
  observacao?: string
}]
```

## Edge Cases

- [ ] Prescrição vazia → `[]`
- [ ] Medicamento sem dose explícita → `dose: null`
- [ ] HTML com estrutura diferente → `[]`
- [ ] HTML null → `[]`

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** medicamento, dose e frequência extraídos
- [ ] **Prescrição vazia:** retorna `[]`
- [ ] **HTML null:** retorna `[]`

---

## Notas relacionadas

- [[hicd-parser]]
