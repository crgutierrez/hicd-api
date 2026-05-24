---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: evolucao-parser
---

# 2026-03-01 · Label "Clinica / Leito:" sem acento não reconhecida

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

O campo `clinicaLeito` não era extraído das evoluções. O campo ficava `null` mesmo o HTML tendo o dado.

## Causa

O código buscava pela label "Clínica/Leito:" (com acento, sem espaços). O HICD envia "Clinica / Leito:" (sem acento, com espaços ao redor do `/`).

## Solução

Normalizar a label antes de comparar usando `_normalizarLabel()`:

```js
function _normalizarLabel(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '')             // remove espaços
    .replace(/[\/\-]/g, '');         // remove / e -
}

// Comparação:
if (_normalizarLabel(labelEncontrada) === _normalizarLabel('Clinica / Leito:')) { ... }
```

## Como evitar

> **Regra:** toda comparação de label com o HICD deve passar por `_normalizarLabel()`. **Nunca** comparar strings de label diretamente com `===` ou `.includes()` sem normalizar.

Aplicar para todos os campos: "Data Atualização:", "Atividade:", "Clinica / Leito:".
