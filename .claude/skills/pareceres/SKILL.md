---
name: pareceres
description: Busca pareceres médicos pendentes ou solicitados em todos os pacientes da Clínica 0. Para cada paciente, analisa o último dia de evolução, identifica menções a parecer, interconsulta, avaliação de especialidade. Extrai solicitante, especialidade, status e trecho relevante. Grava nota estruturada no vault Obsidian em Pareceres/Clínica 0 - Pareceres.md. Ativa quando o usuário pede pareceres pendentes, interconsultas, avaliações de especialidade, pareceres solicitados, resumo de pareceres da clínica.
---

# Pareceres — Busca de Pareceres Médicos na Clínica 0

## Propósito

Varrer todos os pacientes internados (Clínica 0), analisar o último dia de evolução de cada um, identificar menções a pareceres médicos e gerar uma nota consolidada no vault Obsidian.

**Princípio fundamental**: nunca inventar dados. Ausente = "não referido".

---

## Passo a Passo

### Passo 1 — Buscar lista de pacientes

Fazer requisição HTTP ao endpoint local:

```
GET http://localhost:3000/api/clinicas/0/pacientes
Authorization: <token>
```

Extrair de cada paciente: `prontuario`, `nome`, `clinicaLeito` / `leito`.

Se o endpoint retornar erro, registrar na nota e encerrar com a informação disponível.

### Passo 2 — Buscar último dia de evolução de cada paciente

Para cada prontuário da lista, chamar:

```
GET http://localhost:3000/api/pacientes/:prontuario/evolucoes/ultimo-dia?formato=detalhado
Authorization: <token>
```

Processar em lotes de 5 pacientes em paralelo para não sobrecarregar o servidor HICD.

Se um paciente falhar, registrar o prontuário como "erro ao buscar evolução" e continuar.

### Passo 3 — Identificar pareceres nas evoluções

Para cada evolução do último dia, varrer o campo `conteudo.textoCompleto` buscando os termos:

```
parecer | solicito parecer | solicitado parecer | aguardo parecer
avaliação da especialidade | encaminhado para avaliação
interconsulta | avaliar com | discutido com
solicitado avaliação | solicito avaliação | parecer de
```

Usar busca **case-insensitive** e com variações de acentuação.

Se qualquer termo for encontrado, marcar o paciente como **com parecer identificado**.

### Passo 4 — Extrair dados do parecer

Para cada menção encontrada, extrair:

| Campo | Como extrair |
|---|---|
| **Solicitante** | Profissional da evolução (`profissional`) ou especialidade mencionada antes do verbo ("Neurocirugia solicita...") |
| **Especialidade solicitada** | Especialidade citada após "parecer de", "avaliação da", "encaminhado para" |
| **Status** | Inferir do texto: `solicitado` / `aguardando` / `respondido` / `não informado` |
| **Trecho relevante** | Sentença(s) que contêm o termo de parecer — máximo 300 caracteres |
| **Hipóteses diagnósticas** | `dadosClinicosEstruturados.hipotesesDiagnosticas` ou seção "HIPÓTESES DIAGNÓSTICAS" no texto |

**Regras de classificação de status:**

| Texto encontrado | Status |
|---|---|
| "aguardo parecer", "aguardando avaliação", "pendente" | `aguardando` |
| "solicito", "solicitado", "encaminhado" | `solicitado` |
| "respondido", "avaliado por", "conforme parecer" | `respondido` |
| Menção vaga sem verbo de ação claro | `menção a avaliação especializada` |

Se houver mais de um parecer na mesma evolução, listar cada um como entrada separada.

### Passo 5 — Verificar notas existentes no vault

Para cada paciente com parecer identificado, verificar se existe nota em:

```
vault/hicd-bot/Pacientes/{{nome}} - {{prontuario}}.md
vault/hicd-bot/Pacientes/*{{prontuario}}*.md
```

Se encontrar, adicionar wikilinks no detalhamento.

### Passo 6 — Verificar se nota já existe

Verificar: `vault/hicd-bot/Pareceres/Clínica 0 - Pareceres.md`

- **Se não existir**: criar do zero.
- **Se existir**: ler, preservar histórico de atualizações e substituir tabela + detalhamentos com dados mais recentes.

### Passo 7 — Gravar a nota

Usar `Write` ou `Edit` seguindo o template abaixo.

---

## Template da Nota

```markdown
# Pareceres — Clínica 0

## Última atualização

Data da atualização: {{data_atualizacao}}
Pacientes analisados: {{total_pacientes}}
Pacientes com parecer identificado: {{total_com_parecer}}

---

## Lista de pacientes com pareceres identificados

| Paciente | Leito | Hipóteses diagnósticas | Solicitante | Especialidade solicitada | Status | Data da evolução |
|---|---|---|---|---|---|---|
| [[NOME - PRONTUARIO\|NOME]] ou NOME | LEITO | HIPÓTESE | SOLICITANTE | ESPECIALIDADE | STATUS | DATA |

---

## Detalhamento por paciente

### {{nome_paciente}} — Leito {{leito}}

- **Hipóteses diagnósticas**: {{hipoteses_diagnosticas}}
- **Solicitante / quem pediu**: {{solicitante}}
- **Especialidade solicitada**: {{especialidade_solicitada}}
- **Status do parecer**: {{status}}
- **Data da evolução analisada**: {{data_evolucao}}
- **Trecho da evolução**: "{{trecho_relevante}}"
- **Nota no vault**: [[{{nome}} - {{prontuario}}]] *(se existir)*

---

## Pacientes sem parecer identificado

- {{nome_paciente}} — Leito {{leito}}

---

## Pendências relacionadas a pareceres

- {{paciente}} — {{pendencia}}

---

## Histórico de atualizações

- {{data_atualizacao}} — Nota atualizada com base nas últimas evoluções disponíveis da Clínica 0.
```

---

## Regras de Conduta

- Nunca inventar nome, leito, hipótese, solicitante ou especialidade
- Se especialidade não identificável: **"especialidade não referida"**
- Se solicitante não identificável: **"solicitante não referido"**
- Se dúvida entre parecer formal e discussão clínica: **"menção a avaliação especializada"**
- Wikilinks apenas para notas confirmadas no vault via `Glob`
- Manter apenas dados mais recentes na tabela — histórico fica em "Histórico de atualizações"
- Não duplicar pacientes: se o mesmo prontuário aparecer em duas evoluções do dia, consolidar
- Se a lista de pacientes for muito grande (>50), processar em lotes e registrar progresso
- Se o servidor não estiver disponível, registrar o erro na nota e não gravar dados parciais

---

## Tokens de autenticação

O token de autorização deve ser obtido do contexto da conversa. Se não houver token disponível, solicitar ao usuário antes de iniciar.

O token padrão desta sessão pode ser gerado com:

```bash
node -e "
  require('dotenv').config();
  const c = require('crypto');
  const k = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
  const iv = c.randomBytes(12);
  const ci = c.createCipheriv('aes-256-gcm', k, iv);
  const e = Buffer.concat([ci.update(process.env.HICD_USERNAME+':'+process.env.HICD_PASSWORD,'utf8'),ci.final()]);
  const t = ci.getAuthTag();
  console.log(Buffer.concat([iv,t,e]).toString('base64'));
"
```