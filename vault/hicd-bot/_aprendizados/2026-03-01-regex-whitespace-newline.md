---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: evolucao-parser
---

# 2026-03-01 · `(?:\s+\w+)*` consumia `\n\n1` de listas numeradas

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

O parser de seções consumia o início de listas numeradas ("1.", "2.", etc.) que vinham logo após o cabeçalho da seção. O primeiro item da lista sumia do conteúdo extraído.

## Causa

O padrão `(?:\s+\w+)*` após o nome da seção tentava capturar sufixos do nome (ex.: "Hipóteses Diagnósticas Atuais"). Mas `\s+` inclui `\n`, então o padrão consumia `\n\n1` — o `\n\n` antes do número e o `1` do primeiro item.

## Solução

Substituir `(?:\s+\w+)*` por `(?:[^\S\n]+\w+)*` para restringir a espaço horizontal:

```js
// Antes (bugado — consome newlines):
/Hipóteses\s+Diagnósticas(?:\s+\w+)*/i

// Depois (correto — só espaço horizontal):
/Hipóteses\s+Diagnósticas(?:[^\S\n]+\w+)*/i
```

## Como evitar

> **Regra:** ao capturar sufixos opcionais de nome de seção, usar `[^\S\n]+` (espaço horizontal) em vez de `\s+` (qualquer whitespace). O conteúdo da seção começa na próxima linha — nunca consumir `\n`.
