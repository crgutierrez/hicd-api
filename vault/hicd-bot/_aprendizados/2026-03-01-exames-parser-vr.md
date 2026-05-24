---
tags:
  - akita/aprendizado
updated: 2026-03-01
componente: exames-parser
---

# 2026-03-01 · Regex VR não capturava formato "V.R     :"

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

---

## Problema

O campo `vr` (valor de referência) ficava `null` para muitos exames mesmo estando presente no HTML.

## Causa

A regex capturava apenas `"VR:"` mas o HICD usa múltiplos formatos: `"V.R     :"` (com pontos e múltiplos espaços), `"V.R.:"`, `"V. R.:"`.

## Solução

Regex que captura todos os formatos conhecidos:

```js
const VR_REGEX = /\bVR\s*:|V\.?\s*R\.?\s*:/i;
```

Esta regex captura:
- `VR:` — formato curto
- `VR :` — com espaço
- `V.R:` — com ponto
- `V.R     :` — com espaços extras
- `V.R.:` — com dois pontos após
- `V. R.:` — com espaço entre letras

## Como evitar

> **Regra:** ao fazer regex para labels do HICD, sempre testar com pelo menos 3 variantes de formatação. O HICD não tem padrão consistente de whitespace, pontos ou acentos.

Ver também [[_aprendizados/2026-03-01-extraircampodal-inha-acento]] — mesmo problema em outro contexto.
