---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: evolucao-parser
---

# 2026-03-01 · `parseSecaoSimples` com regex de newline literal

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

`parseSecaoSimples` não conseguia delimitar onde uma seção terminava e a próxima começava. Resultado: seções capturavam texto demais (até o final do documento) ou não capturavam nada.

## Causa

A regex usava newline literal no padrão, que quebrava dependendo do ambiente e do formato do HTML. O delimitador de "fim de seção" era frágil.

## Solução

Usar a lista de seções conhecidas (`SECOES_DELIMITADORAS`) como lookahead para delimitar onde a seção atual termina:

```js
const SECOES_DELIMITADORAS = [
  'Hipóteses Diagnósticas', 'Hipóteses Diagnosticas',
  'Exame Físico', 'Exame Fisico', 'AO EXAME FISICO',
  'Conduta', 'Em uso', 'Medicações em Uso',
  'Fez uso', 'Diurese', 'BH 24h',
  'Hemoderivados', 'Culturas', 'Procedimentos', 'Pareceres'
];

// Regex usa lookahead para parar na próxima seção conhecida
const lookahead = SECOES_DELIMITADORAS
  .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const pattern = new RegExp(`(?:${lookahead})`, 'i');
```

## Como evitar

> **Regra:** nunca usar newline literal em regex de delimitação de seções. Sempre derivar os delimitadores da lista `SECOES_DELIMITADORAS` para manter DRY e evitar inconsistências.
