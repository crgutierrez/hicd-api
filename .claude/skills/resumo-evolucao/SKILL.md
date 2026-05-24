---
name: resumo-evolucao
description: Recebe uma ou mais evoluções médicas hospitalares e gera uma nota estruturada no vault Obsidian em vault/hicd-bot/Pacientes/. Extrai hipóteses diagnósticas, medicações, conduta, pendências e folha de rosto do paciente. Cria ou atualiza a nota preservando histórico. Ativa quando o usuário pede resumo de evolução, nota do paciente, criar nota no vault, atualizar Obsidian, pendências do paciente, folha de rosto clínica.
---

# Resumo de Evolução — Geração de Nota no Vault Obsidian

## Propósito

Receber evoluções médicas (texto livre ou JSON da API HICD) e produzir uma nota estruturada salva em `vault/hicd-bot/Pacientes/{{nome}} - {{prontuario}}.md`, criando ou atualizando o arquivo.

**Princípio fundamental**: nunca inventar dados. Ausente = "não referido".

---

## Passo a Passo

### Passo 1 — Identificar o último dia de evolução

- Se múltiplas evoluções: selecionar a de `dataEvolucao` mais recente.
- Se JSON da API: campo `dataEvolucao` ou `dataReferencia`.
- Se texto livre: identificar a data mais recente no texto.

### Passo 2 — Extrair os campos da evolução mais recente

| Campo | Como extrair |
|---|---|
| **Nome** | Campo `nome` do cadastro, ou primeira linha de identificação no texto |
| **Prontuário** | Campo `prontuario` ou `pacienteId`, ou menção explícita no texto |
| **Leito** | Campo `clinicaLeito`, ou linha "Clinica / Leito:" no texto |
| **Data de entrada** | Campo `dataInternacao`, ou frase "data da internação hospitalar" no texto |
| **Dias internado** | Calcular: `data_ultima_evolucao − data_entrada` em dias inteiros. Se impossível: "não calculável com os dados fornecidos" |
| **Hipóteses diagnósticas** | Seção "► HIPÓTESES DIAGNÓSTICAS" ou `dadosClinicosEstruturados.hipotesesDiagnosticas` |
| **Hipótese principal** | Primeira hipótese numerada, ou a mais citada na evolução |
| **Medicações em uso** | Seção "Em uso:", "Medicações em uso:", ou `dadosClinicosEstruturados.medicamentosEmUso` |
| **Conduta** | Seção "► CONDUTA" ou `dadosClinicosEstruturados.conduta` |
| **Pendências** | Ver Passo 3 |
### Passo 3 — Identificar pendências

Varrer o texto inteiro buscando frases com as palavras-gatilho:

```
aguardo | aguardando | pendente | solicitado | programado
a avaliar | encaminhado para | aguardo resultado | a realizar
marcado para | para agendar | em aberto
```

Classificar cada pendência em uma categoria:

- **Exames**: resultados laboratoriais, imagens, culturas, biopsias
- **Avaliações / pareceres**: interconsultas, especialidades, retorno
- **Procedimentos / intervenções**: cirurgias, punções, cateterizações, coletas
- **Outras pendências**: demais itens não classificados

Se uma pendência já tiver seção própria na evolução (ex.: "Pendências:"), priorizar esse texto. Complementar com achados no texto corrido.

### Passo 4 — Verificar notas existentes no vault

Usar a ferramenta `Glob` para buscar em `vault/hicd-bot/`:

```
vault/hicd-bot/Pacientes/{{nome}}*.md
vault/hicd-bot/Pacientes/*{{prontuario}}*.md
vault/hicd-bot/**/*{{nome}}*.md
```

Coletar wikilinks válidos para a seção "Links de análise":
- `[[Análise de hipóteses - {{nome}}]]` — se existir arquivo correspondente
- `[[Análise de exames - {{nome}}]]` — se existir arquivo correspondente
- `[[Resumo evolutivo - {{nome}}]]` — versão anterior do próprio resumo

### Passo 5 — Verificar se a nota já existe

**Caminho**: `vault/hicd-bot/Pacientes/{{nome}} - {{prontuario}}.md`

- **Se não existir**: criar do zero com o template.
- **Se existir**: ler o conteúdo atual, preservar o "Histórico de atualizações" existente e atualizar todos os outros campos com os dados mais recentes.

### Passo 6 — Calcular dias internado

```
dias = floor((data_ultima_evolucao - data_entrada) / 86400000)
```

Datas no formato `DD/MM/YYYY`: converter para `Date` antes de subtrair.
Se qualquer uma das datas for inválida ou ausente: "não calculável com os dados fornecidos".

### Passo 7 — Escrever a nota

Usar a ferramenta `Write` (nova nota) ou `Edit` (atualização). O conteúdo deve seguir o template abaixo **exatamente**.

---

## Template da Nota

```markdown
# {{nome}} — Resumo de Evolução

## Folha de rosto

| Campo | Informação |
|---|---|
| Nome | {{nome}} |
| Prontuário | {{prontuario}} |
| Leito | {{leito}} |
| Hipótese diagnóstica principal | {{hipotese_diagnostica_principal}} |
| Data de entrada | {{data_entrada}} |
| Dias internado | {{dias_internado}} |
| Última atualização | {{data_ultima_evolucao}} |

---

## Resumo do último dia de evolução

Data da evolução analisada: {{data_ultima_evolucao}}

### Hipóteses diagnósticas

- {{hipotese_1}}
- {{hipotese_2}}

### Medicações em uso

- {{medicacao_1}}
- {{medicacao_2}}

### Última conduta

{{ultima_conduta}}

### Pendências

#### Exames

- {{pendencia_exame_1}}

#### Avaliações / pareceres

- {{pendencia_avaliacao_1}}

#### Procedimentos / intervenções

- {{pendencia_procedimento_1}}

#### Outras pendências

- {{outra_pendencia_1}}

---

## Links de análise

- [[Análise de hipóteses - {{nome}}]]
- [[Análise de exames - {{nome}}]]

---

## Histórico de atualizações

- {{data_hoje}} — Nota criada/atualizada com base na evolução de {{data_ultima_evolucao}}.
```

**Valores ausentes**: substituir por "não referido".
**Seções sem itens**: substituir pelo texto padrão indicado no template (ex.: "Conduta não referida na última evolução.").
**Links de análise sem arquivo no vault**: remover o wikilink correspondente. Se nenhum link existir: "Não foram encontradas análises relacionadas no vault."

---

## Regras de Conduta

- Nunca inventar dados clínicos, datas, nomes ou valores
- Priorizar sempre a evolução mais recente quando houver múltiplas
- Se houver divergência entre nota existente e dados novos: atualizar o campo e registrar em "Observações" (adicionar seção se necessário)
- Não duplicar seções do histórico; apenas acrescentar nova linha
- Wikilinks no formato Obsidian: `[[Nome da nota]]`
- O arquivo deve ser salvo **exatamente** em `vault/hicd-bot/Pacientes/{{nome}} - {{prontuario}}.md`
- Criar o diretório `vault/hicd-bot/Pacientes/` se não existir (usar `Write` — ele cria o path)

---

## Formato de Entrada Aceito

**JSON do endpoint `/evolucoes/ultimo-dia`** (recomendado):
```
/resumo-evolucao
[cola o JSON]
```

**Texto livre de uma evolução**:
```
/resumo-evolucao
[cola o texto da evolução]
```

**Dados já no contexto da conversa**: se o usuário já buscou a evolução ou o cadastro do paciente anteriormente nesta conversa, usar esses dados sem solicitar novamente.