---
name: hipoteses
description: Analisa hipóteses diagnósticas de uma evolução médica hospitalar. Identifica divergências, contradições e lacunas entre as hipóteses e a clínica descrita. Sugere hipóteses não consideradas, classifica a coerência diagnóstica e reformula as hipóteses de forma mais defensável. Ativa quando o usuário pede análise diagnóstica, revisão de hipóteses, avaliação de evolução médica, coerência clínica, diagnóstico diferencial ou raciocínio clínico.
---

# Hipóteses — Análise Diagnóstica de Evolução Médica

## Propósito

Analisar criticamente as hipóteses diagnósticas de uma evolução médica, cruzando-as com os dados clínicos descritos. Identifica falhas de raciocínio, sugere diagnósticos não considerados e produz uma reformulação mais coerente e defensável.

**Princípio fundamental**: nunca inventar dados. Se algo não estiver descrito na evolução, usar "não referido".

---

## Como Executar a Análise

Ao receber uma evolução médica (texto livre, JSON ou output do endpoint `/evolucoes/ultimo-dia`), execute as 8 etapas abaixo em ordem. Apresente cada etapa com cabeçalho numerado.

---

### Etapa 1 — Extração dos Dados Clínicos

Extraia e liste explicitamente:

- **Identificação**: idade, sexo, peso, procedência
- **Queixa principal**
- **História da doença atual (HDA)**: tempo de evolução, sintomas, progressão
- **História patológica pregressa (HPP)**: comorbidades, internações prévias, alergias, medicamentos de uso contínuo
- **Fez uso / Medicamentos em uso**: listar com datas quando presentes
- **Exame físico**: sinais vitais, achados por sistema
- **Exames complementares**: listar resultados relevantes com datas
- **Hipóteses diagnósticas declaradas**: listar exatamente como escritas

Se algum item não constar na evolução, registrar como **"não referido"**.

---

### Etapa 2 — Análise das Hipóteses Declaradas

Para cada hipótese diagnóstica listada pelo médico:

| Hipótese | Sustentada pelos dados? | Justificativa |
|---|---|---|
| (hipótese 1) | Sim / Parcialmente / Não | (dados que sustentam ou contradizem) |

Critérios de avaliação:
- A hipótese tem suporte em pelo menos um achado clínico, laboratorial ou de imagem?
- Há contradição direta entre a hipótese e os dados descritos?
- A hipótese é muito genérica, sem especificidade diagnóstica?

---

### Etapa 3 — Divergências e Contradições

Liste explicitamente:

- **Contradições diretas**: hipótese X afirma Y, mas dado clínico Z contradiz.
- **Hipóteses pouco sustentadas**: listadas sem nenhum dado de suporte na evolução.
- **Omissões relevantes**: achado clínico ou laboratorial importante que não foi incorporado às hipóteses.

Se não houver divergências, declarar: *"Não foram identificadas contradições diretas."*

---

### Etapa 4 — Hipóteses Não Consideradas

Sugira diagnósticos diferenciais que deveriam ser considerados com base **exclusivamente** nos dados descritos na evolução. Para cada sugestão:

- Qual achado clínico/laboratorial/de imagem a sustenta
- Por que não pode ser descartada com os dados disponíveis

Não sugerir hipóteses sem ancoragem nos dados descritos.

---

### Etapa 5 — Lacunas e Dados Ausentes

Liste perguntas clínicas e exames que, se respondidos, mudariam ou refinariam o diagnóstico diferencial. Exemplos de categorias:

- Anamnese complementar
- Exames laboratoriais ausentes ou pendentes
- Exames de imagem não realizados
- Avaliações especializadas indicadas

---

### Etapa 6 — Classificação da Coerência Diagnóstica

Classifique em uma das quatro categorias, com justificativa de 1–2 frases:

| Classificação | Critério |
|---|---|
| **Coerente** | Todas as hipóteses têm suporte nos dados; nenhuma contradição identificada |
| **Parcialmente coerente** | A maioria das hipóteses é sustentada, mas há lacunas ou 1–2 hipóteses frágeis |
| **Pouco coerente** | Hipóteses predominantemente não sustentadas ou com contradições relevantes |
| **Insuficiente para análise** | Dados clínicos insuficientes para avaliar as hipóteses listadas |

---

### Etapa 7 — Reformulação das Hipóteses

Proponha uma lista reformulada das hipóteses diagnósticas, ordenada por probabilidade clínica (mais provável primeiro), baseada nos dados disponíveis. Use nomenclatura médica padronizada. Formato sugerido:

```
1. [Hipótese mais provável] — sustentada por: [dados]
2. [Segunda hipótese] — sustentada por: [dados]
3. [Diagnóstico a excluir] — necessita de: [exame/dado]
```

Não remover hipóteses originais sem justificativa explícita.

---

### Etapa 8 — Síntese Final

Um parágrafo objetivo (máx. 5 linhas) resumindo:
- O perfil clínico do paciente
- A qualidade do raciocínio diagnóstico observado
- A principal recomendação para aprimorar a análise

---

## Regras de Conduta

- Linguagem médica objetiva e técnica
- Nunca inventar sintomas, achados ou resultados não descritos
- Quando dado ausente: usar **"não referido"**, nunca omitir silenciosamente
- Não emitir juízo de valor sobre o médico — apenas análise técnica dos dados
- Manter neutralidade: a análise é sobre os dados, não sobre a conduta
- Se a evolução vier como JSON (output da API), extrair os campos `conteudo.textoCompleto` e `dadosClinicosEstruturados`

---

## Formato de Entrada Aceito

**Texto livre** (colar diretamente a evolução):
```
Usuário: /hipoteses
[cola o texto da evolução]
```

**JSON da API** (output de `/evolucoes/ultimo-dia` ou `/evolucoes`):
```
Usuário: /hipoteses
[cola o JSON da evolução]
```

**Prontuário já carregado no contexto**: se o usuário já buscou a evolução anteriormente na conversa, usar os dados disponíveis sem solicitar novamente.
