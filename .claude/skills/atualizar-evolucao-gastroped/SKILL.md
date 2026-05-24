---
name: atualizar-evolucao-gastroped
description: Recupera a última evolução da Gastropediatria de um paciente, busca os exames laboratoriais desde a data dessa evolução até hoje via API HICD, e insere as novas linhas de exames no texto literal da evolução, seguindo o mesmo formato compacto já usado no documento (ex.: "- DD/MM/AA - Hb X; Leuco Y; ..."). Entrega o texto completo atualizado como arquivo e resumo das linhas adicionadas. Ativa quando o usuário pede para "atualizar a evolução da gastroped", "adicionar exames na evolução", "atualizar exames do [paciente] da gastroped", ou variantes.
---

# Atualizar Evolução Gastroped — Skill

## Propósito

Recuperar o texto literal da última evolução da Gastropediatria de um paciente, buscar os exames da API HICD desde a data dessa evolução até hoje, e inserir as novas linhas no texto da evolução no mesmo formato compacto já usado no documento.

**Princípio fundamental**: nunca inventar valores, datas ou resultados. Apenas inserir dados que existam na API. Preservar o texto original ipsis literis — só acrescentar, nunca editar o que já existe.

---

## Passo a Passo

### Passo 1 — Identificar o paciente e prontuário

Obter o prontuário do paciente a partir do contexto da conversa, da lista da Gastroped no vault, ou pedindo ao usuário.

Prontuários conhecidos (atualizar conforme necessário):
- ASAFE CANTANHEDE LEITE → 44826
- ENDRICK ORO WARAM → 45136
- VALLENTINA SOUSA SANTOS → 46659
- CELSON TOCOROM KAIU MON MIN ORO WARAM → 46798
- THALES DANIEL JUNIOR BRAS → 31628

### Passo 2 — Buscar a última evolução da Gastroped

Fazer requisição:

```
GET http://localhost:3000/api/pacientes/:prontuario/evolucoes?formato=detalhado&limite=30
Authorization: <token>
```

Varrer as evoluções buscando a mais recente que seja da Gastropediatria. Critérios (qualquer um):
- `profissional` contém "CRISTIANO" ou "JOANA" ou "WELLINTON" ou "GASTROPED"
- `conteudo.textoCompleto` contém "#GASTROENTEROLOGIA PEDIATRICA#" ou "PELA GASTROPED" ou "Sob Orientação Dra Joana" (case-insensitive)

Registrar a `dataEvolucao` dessa evolução (formato DD/MM/AAAA HH:MM:SS).

### Passo 3 — Extrair o texto literal e identificar formato dos exames

Usar o campo `conteudo.textoCompleto` como texto base.

Localizar a seção de exames laboratoriais no texto. O formato varia por evolução — identificar o padrão das últimas entradas. Exemplos comuns:

**Formato compacto (mais recente):**
```
- 17/05/26 - potassio 3,8; sodio 135
- 15/05/26 - creat 0,6; sodio 137; ureia 15; btf normal; tgo 95; tgp 116; potassio 6,06; INR 0,85; TTPa 0,79
```

**Formato descritivo (mais antigo):**
```
(08/05/26): HB 11,7; HT 34,5; LEUCO 20220; ...
24/04/2026 - Hemograma: Hb 10,3 g/dL; leucócitos 11000/mm³; ...
```

**Regra**: usar o mesmo padrão das últimas 2 entradas da seção de exames. Se o padrão for o compacto com traço (`- DD/MM/AA -`), usar esse. Se for outro, replicar.

### Passo 4 — Determinar período de busca de exames

- **Data de início**: data da evolução Gastroped (Passo 2) — inclusive
- **Data de fim**: data de hoje — inclusive
- Buscar apenas datas **posteriores** à última entrada de exames já registrada no texto

### Passo 5 — Buscar exames da API

```
GET http://localhost:3000/api/pacientes/:prontuario/exames?incluirResultados=true
Authorization: <token>
```

Para cada exame retornado, verificar se `data` (ou `dataRequisicao`/`dataSolicitacao`) está dentro do período definido no Passo 4.

Agrupar resultados por data. Para cada data com dados novos, construir uma linha no formato identificado no Passo 3.

#### Mapeamento de siglas → nomes compactos

| Sigla API | Nome no texto |
|---|---|
| HGB | Hb |
| HTO | Ht |
| WBC | Leuco |
| SEGM_VR | Seg |
| LINF_VR | Linf |
| MONO_VR | Mono |
| PLT | Plaq |
| CRQ | PCR |
| SOI / SOD | sodio |
| POS / POT | potassio |
| CRT | creat |
| URA | ureia |
| TG0 | tgo |
| TG2 | tgp |
| GL1 | glicose |
| BT | BT |
| BD | BD |
| BI | BI |
| TAP_TEMPO_DO_PLA | TAP |

Incluir apenas siglas com valor numérico válido. Ignorar campos de valor absoluto (VA) quando o percentual (VR) já estiver incluído. Ignorar campos sem valor ou com valor "0" em campos de desvio (BLAST, BASO, META, MIEL).

#### Formato da linha a construir

```
- DD/MM/AA - campo1 valor1; campo2 valor2; campo3 valor3
```

Ordenar os campos nesta sequência preferencial:
Hb → Ht → Leuco → Seg → Linf → Mono → Plaq → PCR → sodio → potassio → creat → ureia → tgo → tgp → BT → BD → BI → glicose → (demais campos em ordem alfabética)

### Passo 6 — Inserir as novas linhas no texto

Localizar o ponto de inserção: imediatamente **após** a última linha de exame laboratorial existente e **antes** da seção "Exames de imagem:" (ou da próxima seção não-laboratorial).

Inserir as novas linhas em ordem cronológica crescente.

**Regra de não-duplicação**: se uma data já estiver registrada no texto, não inserir linha para essa data.

### Passo 7 — Salvar o arquivo e entregar

Salvar o texto completo atualizado em:
```
/tmp/<nome-paciente-slug>-evolucao-gastroped-atualizada.txt
```

Onde `<nome-paciente-slug>` é o primeiro nome do paciente em minúsculas (ex.: `endrick`, `asafe`).

Entregar ao usuário:
1. **Arquivo** com o texto completo (via Telegram reply com attachment, ou exibindo o conteúdo)
2. **Resumo** das linhas adicionadas — listar apenas as datas novas e os valores inseridos

---

## Regras de Conduta

- Preservar o texto original ipsis literis — não corrigir ortografia, não reformatar, não alterar nada do original
- Só acrescentar dados que existam na API — nunca inventar
- Se não houver exames novos desde a data da evolução: informar "nenhum exame novo encontrado desde DD/MM/AAAA"
- Se a evolução Gastroped não for encontrada: informar e encerrar
- Se a API de exames retornar erro: registrar e informar ao usuário

---

## Tokens de autenticação

O token de autorização deve ser obtido do contexto da conversa. Se não estiver disponível, gerar com:

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
