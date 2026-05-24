---
name: exames
description: Analisa exames laboratoriais hospitalares em texto ou JSON. Agrupa por data, resume no formato compacto DATA: exame: valor, identifica alterações fora dos valores de referência, analisa tendências seriadas e destaca pontos de atenção clínica. Ativa quando o usuário pede análise de exames laboratoriais, revisão de resultados, tendência de exames, valores alterados, hemograma, bioquímica, gasometria, coagulograma, ou passa output do endpoint /exames da API HICD.
---

# Exames — Análise de Resultados Laboratoriais

## Propósito

Receber exames laboratoriais em texto livre ou JSON (output da API HICD) e produzir uma análise estruturada: agrupamento por data, identificação de alterações, tendências seriadas e pontos de atenção clínica.

**Princípio fundamental**: nunca inventar exames, datas, valores, unidades ou referências. Se ausente, declarar explicitamente.

---

## Como Executar a Análise

### Passo 0 — Identificar o formato de entrada

**Texto livre**: extrair datas, nomes de exames, valores, unidades e referências do texto.

**JSON da API HICD** (`/exames` ou `/exames?incluirResultados=true`): usar os campos:
- `data.sigla` ou `data.nome` → nome do exame
- `data[].resultados[].sigla` / `.descricao` → nome do item
- `data[].resultados[].valor` → valor encontrado
- `data[].resultados[].unidade` → unidade
- `data[].resultados[].referencia` → valor de referência
- `data[].resultados[].status` → `normal` / `alto` / `baixo`
- `data[].dataRequisicao` ou `data[].dataSolicitacao` → data

**Texto de evolução** (seção "Exames Complementares"): parsear linhas no formato `DD/MM SIGLA: valor unidade` ou `DD/MM SIGLA valor VR: ref`.

### Passo 1 — Determinar o período de análise

- Identificar todas as datas presentes nos exames.
- Considerar como **data de referência** a mais recente.
- Selecionar apenas os exames dos **últimos 5 dias** a partir dessa data (inclusive).
- Se houver menos de 5 dias com exames, usar todos disponíveis.
- Registrar o período analisado: `DD/MM/AAAA a DD/MM/AAAA`.

### Passo 2 — Normalizar nomes

Usar nomenclatura padronizada e objetiva:

| Abreviação comum | Nome padronizado |
|---|---|
| HB / Hgb | Hemoglobina |
| HT / Hct | Hematócrito |
| LEUC / WBC | Leucócitos |
| PLAQ / PLT | Plaquetas |
| SEG / Neut | Neutrófilos segmentados |
| LINF | Linfócitos |
| PCR / CRP | Proteína C-reativa |
| CREAT | Creatinina |
| UR / UREIA | Ureia |
| NA / Sódio | Sódio |
| K / Potássio | Potássio |
| TGO / AST | AST (TGO) |
| TGP / ALT | ALT (TGP) |
| FA | Fosfatase alcalina |
| GGT | Gama-GT |
| BT / BD / BI | Bilirrubina total / direta / indireta |
| GLICOSE / GLI | Glicose |
| LACT | Lactato |
| ALB | Albumina |
| FIBRIN | Fibrinogênio |
| CPK / CK | Creatinofosfoquinase |
| CKMB | CK-MB |
| INR / TAP | INR (TAP) |
| TTPA | TTPA |
| PROC / PCT | Procalcitonina |

Se a sigla não constar nessa tabela, usar o nome exatamente como aparece no texto.

---

## Formato de Saída Obrigatório

```markdown
# Resumo dos exames laboratoriais dos últimos 5 dias

**Período analisado**: DD/MM/AAAA a DD/MM/AAAA
**Data de referência**: DD/MM/AAAA (data mais recente encontrada)

---

## 1. Exames agrupados por data

**DD/MM/AAAA**: Hemoglobina: 14,7 g/dL | Leucócitos: 4.310 /mm³ | Plaquetas: 203.000 /mm³ | PCR: 6,27 mg/L

**DD/MM/AAAA**: Hemoglobina: 14,4 g/dL | Leucócitos: 9.400 /mm³ | Plaquetas: 223.000 /mm³ | PCR: 76,9 mg/L

*(ordenar da mais antiga para a mais recente)*

---

## 2. Alterações em relação aos valores de referência

### DD/MM/AAAA

- **Exame**: valor encontrado unidade
  - Referência: faixa de referência informada (ou "valor de referência não informado")
  - Interpretação: aumentado / reduzido / alterado
  - Comentário: breve análise objetiva (1 linha)

*(Se não houver alterações no dia: "Sem alterações identificadas nos valores de referência informados.")*

---

## 3. Tendência dos exames seriados

- **Hemoglobina**: tendência observada (ex.: estável — 14,7 → 14,4 g/dL)
- **Leucócitos**: tendência observada (ex.: em queda — 9.400 → 4.310 → /mm³)
- **PCR**: tendência observada (ex.: em queda acentuada — 124 → 6,27 mg/L)

*(Se não houver exames repetidos em dias diferentes: "Não há exames seriados suficientes para análise de tendência.")*

---

## 4. Pontos de atenção clínica

- Listar cada alteração laboratorial relevante em uma linha
- Destacar com ⚠️ alterações críticas ou muito discrepantes
- Relacionar alterações apenas quando houver dados suficientes no texto
- Não emitir diagnósticos — apenas destacar os dados

---

## 5. Observação de segurança

Esta análise é baseada exclusivamente nos exames fornecidos no texto. Não foram inventados dados ausentes. A interpretação deve ser correlacionada com o quadro clínico, exame físico e evolução do paciente.
```

---

## Regras de Conduta

- Nunca inventar exames, datas, valores, unidades ou referências
- Quando valor de referência ausente: escrever **"valor de referência não informado"**
- Quando unidade ausente: omitir o campo de unidade (não inventar)
- Exames repetidos no mesmo dia: listar todos, informando a repetição
- Tendências: baseadas apenas nos dados disponíveis; não extrapolar
- Comentários objetivos: sem adjetivos subjetivos como "preocupante" sem base numérica
- Linguagem médica técnica; abreviações padronizadas conforme tabela acima
- Se o texto estiver ambíguo (data ou valor incerto), declarar a ambiguidade explicitamente

---

## Formato de Entrada Aceito

**Texto livre** (seção de exames de uma evolução):
```
Usuário: /exames
26/04: HEMOGRAMA: LEUCÓCITOS 7.500; SEG:73%; PLAQUETAS: 189.000
       LACT 17,4 CA 9,02 CL 100,1 K 4,99 NA 138,3 UR 23,4
       CREAT 0,3 PCR 124 TGO 153 TGP 220
28/04: HG 14,7 HT 44 LEUC 4310 EOS1 SEG 59 LINF 31 MON 9
       PLAQ 203000 PCR 6,27 CPK 48,3 TGO 82,1 TGP 117
```

**JSON da API** (output de `/exames?incluirResultados=true`):
```
Usuário: /exames
[cola o JSON]
```

**Evolução já carregada no contexto**: se o usuário já buscou a evolução ou os exames anteriormente na conversa, usar os dados disponíveis sem solicitar novamente.