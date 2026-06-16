---
tags:
  - akita/aprendizado
updated: 2026-06-16
componente: patient-service
hospital: Hospital de Base
---

# 2026-06-16 · Número do leito codificado no sufixo do campo `cid` (UTI Neonatal)

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]] · [[Hospital de Base|← Wiki Hospital de Base]]

---

## Problema

Ao pedir "leito 2 / leito 3 da UTI Neonatal", não há como identificar o leito pelos
campos óbvios: na listagem `/api/clinicas/008/pacientes`, **todos** os pacientes vêm
com `leito` e `clinicaLeito` iguais a `"UTI - NEONATAL"` (genérico). A busca
`buscarPacientePorLeito` compara `p.leito`, então procurar por "2" não encontra nada.

## Causa

No Hospital de Base (`hb-hospub`), o número físico do leito não é populado no campo
`leito`. Ele aparece apenas no sufixo do campo `cid` retornado na lista de pacientes:

```
008.046-0002  → leito 2
008.046-0003  → leito 3
```

Padrão: `CCC.UUU-00NN`, onde `NN` é o número do leito (clínica 008 = UTI Neonatal).

## Solução

Para localizar um paciente por leito na UTI Neonatal: listar pacientes da clínica 008
e casar pelo sufixo do `cid` (`-00NN`), não pelo campo `leito`.

```js
// leito desejado = 2
const alvo = String(2).padStart(4, '0'); // "0002"
const paciente = pacientes.find(p => (p.cid || '').endsWith('-' + alvo));
```

## Validação

Confirmado em 16/06/2026: o paciente de `cid 008.046-0003` (575972) tem na própria
evolução médica o texto **"UTIN ciente – leito 03 liberado"**, batendo com o sufixo.

## Como evitar / observações

> **Regra:** o campo `leito` da API é genérico (nome da clínica). O número do leito
> está no sufixo do `cid`. Não confie em `buscarPacientePorLeito` para a UTI Neonatal.

- A mesma convenção provavelmente vale para outras clínicas; verificar antes de generalizar.
- Candidato a melhoria: `paciente-parser.js` poderia extrair `leitoNumero` do `cid`.
