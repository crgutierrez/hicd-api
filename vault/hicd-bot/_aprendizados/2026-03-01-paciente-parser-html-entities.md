---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: paciente-parser
---

# 2026-03-01 · Nomes com `&amp;` não decodificados; `dataInternacao` ausente

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

1. Pacientes com `&` no nome (ex.: "JOHNSON & JOHNSON") apareciam como "JOHNSON &amp; JOHNSON" na resposta da API.
2. Os campos `dataInternacao` e `diasInternacao` chegavam como `undefined` na lista de pacientes.

## Causa

1. O HTML do HICD usa entidades HTML (`&amp;`, `&lt;`, `&lt;`). O parser extraía o texto bruto do HTML sem decodificar entidades.
2. Os seletores de `dataInternacao` e `diasInternacao` não correspondiam à estrutura real da lista de pacientes.

## Solução

1. Decodificar entidades HTML após extração:
```js
function decodificarEntidades(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
```

2. Ajustar seletores de `dataInternacao` e `diasInternacao` para a estrutura real da tabela de lista.

## Como evitar

> **Regra 1:** todo campo de texto extraído do HICD deve passar por `decodificarEntidades()` antes de ser retornado.

> **Regra 2:** ao adicionar extração de novo campo, confirmar o seletor/regex com HTML real capturado (usar `debug-paciente.js`).
