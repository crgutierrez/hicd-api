---
tags:
  - akita/componente/parser
aliases:
  - ExamesParser
  - exames-parser
updated: 2026-05-21
tipo: parser
camada: adapters
---

# exames-parser

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Converter o HTML da página `exame.php` do HICD em objetos de exame estruturados, incluindo extração do valor de referência (VR) em seus múltiplos formatos.

## Localização

`src/parsers/exames-parser.js`

## Contrato (entradas e saídas)

**Entrada:** HTML de `exame.php`

**Saída:**
```js
[{
  sigla: string,       // id da <tr> na tabela
  nome: string,
  resultado: string,
  vr: string,          // valor de referência — pode ser null
  unidade: string
}]
```

## Dependências

- `cheerio` — parse do HTML

## Edge Cases

### Estrutura HTML
- [ ] `table.table1 tr[id]` ausente (página diferente do esperado) → `[]`
- [ ] `tr` sem `id` → ignorar
- [ ] Bloco complexo sem linha `Resultado-->` (hemograma, TAP, TTPA) → estratégia alternativa de parse

### VR (Valor de Referência)
- [ ] Formato `"VR:"` → capturar
- [ ] Formato `"V.R     :"` (espaços extras) → capturar com regex `/\bVR\s*:|V\.?\s*R\.?\s*:/i`
- [ ] Formato `"V.R.:"` → capturar
- [ ] VR ausente → retornar `null`, não string vazia
- [ ] VR em linha separada vs inline

### Valores
- [ ] Resultado com unidade embutida (`"12.3 g/dL"`)
- [ ] Resultado com texto descritivo ("Negativo", "Reagente")
- [ ] Resultado vazio → `null`

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** sigla, resultado e VR extraídos para exame comum
- [ ] **VR com espaços extras ("V.R     :"):** capturado corretamente
- [ ] **VR ausente:** campo `vr` é `null`
- [ ] **Hemograma (bloco complexo):** sub-itens extraídos
- [ ] **HTML null/vazio:** retorna `[]`
- [ ] **tabela sem `table1`:** retorna `[]`

## Aprendizados relacionados

- [[_aprendizados/2026-03-01-exames-parser-vr]] — regex VR

---

## Notas relacionadas

- [[hicd-parser]]
- [[exame-model]]
- [[08-infraestrutura#Exames (ParamModule=Exames → exame.php)]]
