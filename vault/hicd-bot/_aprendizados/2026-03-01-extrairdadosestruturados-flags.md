---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: evolucao-parser
---

# 2026-03-01 · Seções em CAIXA ALTA não capturadas (faltava flag `'i'`)

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

Evoluções escritas em CAIXA ALTA (prática comum de alguns médicos no HICD) tinham `dadosEstruturados` vazio. "AO EXAME FISICO:", "CONDUTA:", "HIPÓTESES:" não eram capturados.

## Causa

As chamadas a `extrairValor` em `extrairDadosEstruturadosEvolucao` não tinham a flag `'i'` (case-insensitive). Regex como `/Exame Físico:/` não casa com "AO EXAME FISICO:".

## Solução

Adicionar flag `'i'` em **todos** os `extrairValor` dessa função:

```js
// Antes:
const exameFisico = extrairValor(texto, /Exame\s+F[ií]sico:/);

// Depois:
const exameFisico = extrairValor(texto, /Exame\s+F[ií]sico:/i);
```

## Como evitar

> **Regra:** toda regex que captura seções de texto de evolução **deve** ter flag `'i'`. Profissionais de saúde escrevem em CAIXA ALTA com frequência no HICD.

Cheklist ao adicionar nova seção: (1) padrão, (2) variante sem acento, (3) variante em CAIXA ALTA.
