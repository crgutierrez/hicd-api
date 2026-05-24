---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: evolucao-parser
---

# 2026-03-01 · `limparTextoEvolucao` colapsava `\n` em espaço

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

O campo `textoLimpo` das evoluções chegava como um bloco único sem quebras de linha. Listas, seções e parágrafos ficavam colados, tornando o texto ilegível e quebrando o parse das seções clínicas.

## Causa

`limparTextoEvolucao` usava `.replace(/\s+/g, ' ')` — a regex `\s+` captura **qualquer espaço em branco**, incluindo `\n`. Resultado: toda quebra de linha virava um espaço.

## Solução

Substituir por `[^\S\n]+` que captura espaços horizontais mas **não** `\n`:

```js
// Antes (bugado):
texto.replace(/\s+/g, ' ')

// Depois (correto):
texto.replace(/[^\S\n]+/g, ' ')
```

## Como evitar

> **Regra:** nunca usar `\s+` quando o objetivo é normalizar apenas espaços horizontais. Sempre que precisar preservar quebras de linha, usar `[^\S\n]+`.

Aplicar esta regra em qualquer regex de "limpar espaços" em parsers de HTML.
