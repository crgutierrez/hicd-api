---
tags:
  - akita/componente/parser
aliases:
  - EvolucaoParser
  - evolucao-parser
updated: 2026-05-21
tipo: parser
camada: adapters
---

# evolucao-parser

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Converter o HTML do elemento `#areaHistEvol` do HICD em objetos de evolução estruturados. Inclui extração de seções clínicas do texto livre (Hipóteses Diagnósticas, Exame Físico, Conduta, Diurese, BH 24h, Medicamentos em uso).

## Localização

`src/parsers/evolucao-parser.js`

## Contrato (entradas e saídas)

**Entrada:**
```html
<!-- HTML do #areaHistEvol, blocos de 5 .row por evolução -->
```

**Saída:**
```js
[{
  profissional: string,
  dataEvolucao: string,       // "DD/MM/AAAA"
  dataAtualizacao: string,
  atividade: string,
  clinicaLeito: string,
  descricao: string,          // HTML completo com \n preservados
  textoLimpo: string,         // texto sem HTML, \n preservados
  dadosEstruturados: {
    hipotesesDiagnosticas?: string,
    exameFisico?: string,
    conduta?: string,
    diurese?: string,
    bh24h?: string,
    medicamentosEmUso?: string,
    fezUso?: string
  }
}]
```

## Dependências

- `cheerio` — parse do HTML
- Nenhuma dependência externa

## Edge Cases

> [!warning] Área de maior concentração de bugs — ver [[06-aprendizados]]

### Entradas
- [ ] HTML `null` / `undefined` → retornar `[]`
- [ ] HTML sem `#areaHistEvol` → retornar `[]`
- [ ] `#areaHistEvol` com zero `.row` → retornar `[]`

### Estrutura HTML
- [ ] Bloco com menos de 5 rows (HTML truncado)
- [ ] Rows fora da ordem esperada
- [ ] `<br>` tags na descrição → converter para `\n` (não espaço)

### Labels do HICD
- [ ] "Clinica / Leito:" com espaços ao redor do `/` e sem acento — normalizar com `_normalizarLabel()`
- [ ] "Data Atualização:" (não "Data de Atualização:") — label exato
- [ ] Labels em CAIXA ALTA ("EXAME FÍSICO:", "AO EXAME FISICO:") → flag `'i'` obrigatória

### Seções clínicas
- [ ] Evolução sem nenhuma seção estruturável (texto livre psicologia/cirurgia) → `dadosEstruturados: {}`
- [ ] Seção com texto muito longo (conduta extensa)
- [ ] Múltiplas seções na mesma evolução
- [ ] Seção que contém lista numerada (`\n\n1. ...`) — regex deve preservar `\n`

### `limparTextoEvolucao`
- [ ] **Não colapsar `\n` em espaço** — usar `[^\S\n]+` não `\s+`
- [ ] Remover tags HTML mas preservar quebras de linha originais
- [ ] Entidades HTML decodificadas (`&amp;` → `&`)

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** 5 campos base extraídos (profissional, dataEvolucao, dataAtualizacao, clinicaLeito, descricao)
- [ ] **`limparTextoEvolucao` preserva `\n`:** texto com `\n` não vira espaço
- [ ] **Label em CAIXA ALTA:** "EXAME FÍSICO:" é capturado igual a "Exame Físico:"
- [ ] **"Clinica / Leito:" sem acento:** campo extraído corretamente
- [ ] **Lista numerada:** `\n\n1.` no texto não é consumido pelo regex de seção
- [ ] **Evolução UTI:** diurese e bh24h extraídos quando presentes
- [ ] **Evolução psicologia:** `dadosEstruturados` retorna `{}` sem erro
- [ ] **HTML null:** retorna `[]`

## Aprendizados relacionados

- [[_aprendizados/2026-03-01-evolucao-parser-newlines]] — `\s+` vs `[^\S\n]+`
- [[_aprendizados/2026-03-01-parsesecaosimples-regex]] — `parseSecaoSimples` com newline literal
- [[_aprendizados/2026-03-01-extraircampodal-inha-acento]] — normalização de label
- [[_aprendizados/2026-03-01-extrairdadosestruturados-flags]] — flag `'i'` em CAIXA ALTA
- [[_aprendizados/2026-03-01-regex-whitespace-newline]] — `(?:\s+\w+)*` vs `(?:[^\S\n]+\w+)*`

---

## Notas relacionadas

- [[hicd-parser]]
- [[evolucao-model]]
- [[08-infraestrutura#Evoluções (ParamModule=Evo)]]
