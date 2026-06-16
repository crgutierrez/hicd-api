---
tags:
  - akita/aprendizados
aliases:
  - Aprendizados
  - Correções
  - Bugs
updated: 2026-05-21
---

# 06 · Instruções Corretivas e Aprendizados

[[CLAUDE|← voltar ao Hub]]

> Índice de erros da IA, alucinações e soluções. Cada aprendizado tem **uma nota canônica** em `_aprendizados/`. Esta nota só lista e linka.

---

## Aprendizados registrados

| Data | Slug | Resumo |
|------|------|--------|
| 2026-03-01 | [[_aprendizados/2026-03-01-evolucao-parser-newlines]] | `limparTextoEvolucao` colapsava `\n` em espaço |
| 2026-03-01 | [[_aprendizados/2026-03-01-parsesecaosimples-regex]] | `parseSecaoSimples` com newline literal quebrado |
| 2026-03-01 | [[_aprendizados/2026-03-01-extraircampodal-inha-acento]] | Label "Clinica / Leito:" sem acento não reconhecida |
| 2026-03-01 | [[_aprendizados/2026-03-01-extrairdadosestruturados-flags]] | Seções em CAIXA ALTA não capturadas (faltava flag `'i'`) |
| 2026-03-01 | [[_aprendizados/2026-03-01-regex-whitespace-newline]] | `(?:\s+\w+)*` consumia `\n\n1` de listas numeradas |
| 2026-03-01 | [[_aprendizados/2026-03-01-exames-parser-vr]] | Regex VR não capturava formato "V.R     :" |
| 2026-03-01 | [[_aprendizados/2026-03-01-paciente-parser-html-entities]] | Nomes com `&amp;` não decodificados; `dataInternacao` ausente |
| 2026-06-16 | [[_aprendizados/2026-06-16-cid-suffix-leito-uti-neonatal]] | Nº do leito vem no sufixo do `cid` (`008.046-00NN`), não no campo `leito` |
| 2026-06-16 | [[_aprendizados/2026-06-16-fluxograma-exames-planilha-xlsx]] | Fluxograma = planilha (exames×datas); script + mapa sigla→linha + .xlsx |

---

## Padrões de erro recorrentes

> Útil para o Claude reconhecer o tipo de erro antes de ler a nota específica.

### Regex no HICD

O HTML do HICD tem formatos inconsistentes: labels com/sem acento, espaços variáveis, texto em CAIXA ALTA, entidades HTML não decodificadas. Toda regex que captura dados do HICD precisa:

1. Usar flag `'i'` (case-insensitive)
2. Normalizar labels com `_normalizarLabel()` antes de comparar
3. Usar `[^\S\n]+` em vez de `\s+` quando quiser preservar quebras de linha
4. Usar `(?:[^\S\n]+\w+)*` em vez de `(?:\s+\w+)*` após cabeçalhos de seção

### Estrutura HTML do HICD

Ver [[08-infraestrutura#Estrutura HTML conhecida]] para a estrutura específica das páginas do HICD.

---

## Como registrar novo aprendizado

1. Criar `_aprendizados/AAAA-MM-DD-<slug>.md` usando o template abaixo.
2. Adicionar linha nesta tabela.
3. Se o erro tem componente relacionado, adicionar link em `_componentes/<nome>.md#Aprendizados relacionados`.

**Template:**
```markdown
---
tags:
  - akita/aprendizado
updated: AAAA-MM-DD
componente: <nome-do-componente>
---

# AAAA-MM-DD · <título curto>

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]]

## Problema
<o que quebrou, sintoma observado>

## Causa
<por que quebrou>

## Solução
<o que foi feito para corrigir>

## Como evitar
<regra geral que previne recorrência>
```

---

## Notas relacionadas

- [[_padrao-tdd-edge-cases]] — edge cases esquecidos são a principal fonte de aprendizados
- [[05-componentes]]
