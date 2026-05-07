# Aprendizados e Correções

Registro de erros, alucinações da IA e soluções encontradas. Cada entrada previne que o mesmo erro se repita.

---

## 2026-03-01 — `evolucao-parser.js`: colapso de quebras de linha

**Arquivo**: `src/parsers/evolucao-parser.js` → `limparTextoEvolucao`
**Problema**: `.replace(/\s+/g, ' ')` colapsava `\n` em espaço, destruindo a formatação das evoluções.
**Causa**: regex genérica demais.
**Solução**: `replace(/[^\S\n]+/g, ' ')` — preserva `\n`, só colapsa espaços horizontais.

---

## 2026-03-01 — `parseSecaoSimples`: regex com newline literal

**Arquivo**: `src/parsers/evolucao-parser.js`
**Problema**: regex com `\n` literal quebrava o parse de seções clínicas.
**Solução**: usar lista de seções conhecidas (`SECOES_DELIMITADORAS`) como lookahead delimitador.

---

## 2026-03-01 — Labels com acento vs sem acento no HICD

**Arquivo**: `src/parsers/evolucao-parser.js` → `extrairCampoDaLinha`
**Problema**: O HICD usa `"Clinica / Leito:"` (sem acento, espaços ao redor do `/`), não `"Clínica/Leito:"`.
**Solução**: normalizar com `_normalizarLabel()` antes de comparar.
**Regra geral**: nunca assumir formatação consistente no HTML do HICD — normalizar antes de comparar.

---

## 2026-03-01 — Regex sem flag `'i'` em evoluções CAIXA ALTA

**Arquivo**: `src/parsers/evolucao-parser.js` → `extrairDadosEstruturadosEvolucao`
**Problema**: evoluções de UTI escritas em CAIXA ALTA (`"EXAME FÍSICO:"`) não eram capturadas.
**Solução**: flag `'i'` em todos os `extrairValor` dessa função.
**Regra geral**: sempre usar flag `'i'` em regex de captura de labels do HICD.

---

## 2026-03-01 — `(?:\s+\w+)*` consumindo dígitos e newlines

**Arquivo**: parsers em geral
**Problema**: padrão `(?:\s+\w+)*` após nome de seção consumia `\n\n1` de listas numeradas, engolindo conteúdo.
**Solução**: `(?:[^\S\n]+\w+)*` — restringe a espaço horizontal.

---

## 2026-03-01 — `exames-parser.js`: formato VR com pontos

**Arquivo**: `src/parsers/exames-parser.js`
**Problema**: formato `"V.R     :"` (pontos + espaços) não era capturado pelo regex de valores de referência.
**Solução**: regex `/\bVR\s*:|V\.?\s*R\.?\s*:/i`.

---

## 2026-03-01 — `paciente-parser.js`: entidades HTML e campos ausentes

**Arquivo**: `src/parsers/paciente-parser.js`
**Problema 1**: nomes com `&amp;` não eram decodificados.
**Problema 2**: `dataInternacao` e `diasInternacao` não eram extraídos da lista de pacientes.
**Solução**: decodificar entidades HTML; ajustar seletores de extração na lista.

---

## Como adicionar uma nova entrada

Quando a IA falhar ou alucinar, documente aqui:

```
## YYYY-MM-DD — <título curto>
**Arquivo**: caminho/do/arquivo.js
**Problema**: o que deu errado
**Causa**: por que aconteceu
**Solução**: como foi resolvido
**Regra geral**: (opcional) princípio para evitar reincidência
```
