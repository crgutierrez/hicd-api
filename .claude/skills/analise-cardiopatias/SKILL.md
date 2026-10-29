---
name: analise-cardiopatias
description: Analisa prontuários do estudo epidemiológico de cardiopatias congênitas pediátricas do HICD (Dra. Vera, 2024-2025). Coleta prontuários a partir do registro, roda a triagem automática, classifica em congênita/adquirida com Croti & Park, resolve desfecho e óbito, e monta o dataset. Ativa quando o usuário pede análise de cardiopatias, coleta de prontuários do estudo, triagem cardiológica, classificação de cardiopatia congênita, amostra de um mês, verificação de diagnósticos perdidos ou lacunas de período.
---

# Análise de Cardiopatias Congênitas — Estudo HICD 2024-2025

## Propósito

Levantamento epidemiológico de cardiopatias congênitas em pediatria no HICD, tendo como marco amostral os pareceres da **Dra. Vera Joana Becker de Melo e Silva**.

**Princípio fundamental**: nunca inventar dados. "A varredura não encontrou" **nunca** é escrito como "não existe".

---

## 1. As três leis deste estudo

Cada uma nasceu de um erro real. Violar qualquer uma reintroduz o erro.

### Lei 1 — O `registro` não é o prontuário

A coluna-chave de `docs/DRA_VERA_HICD_2024_2025.csv` chama-se **`registro`**. Recupere o prontuário a partir dele **antes** de coletar, e trate a falha como erro.

- **Medido nos 626 registros do CSV**: 625 resolvem, **0 divergem** (`registro == prontuario`), e **1 não resolve — o `21640`**. A recuperação não traduz um número em outro; ela **valida**.
- Rode `node scripts/resolver_prontuarios.js` antes de coletar. O mapa fica em `output/epidemio/registro_para_prontuario.json`.
- O módulo de evoluções **aceita** o número mesmo assim e devolve 750 evoluções — a coleta "funciona" e grava um `raw_*.json` mutilado.
- Resultado: paciente fantasma no dataset, 43 campos vazios, contando em `n` e classificado como negativo.
- **Não existe `TIPOBUSCA=REG`** (testado, devolve vazio). Só `PRONT` e `BE`.

**Validação obrigatória**: `cadastro.dadosBasicos.nome` preenchido. Sem nome, o registro vai para a lista de não resolvidos e **fica fora do denominador**.

### Lei 2 — A triagem lê o prontuário, não o marco amostral

`scripts/triagem_cardiopatia.py` já lê **todas** as evoluções com `atividade = CARDIOLOGISTA` do `raw_*.json`, de qualquer profissional. Nunca voltar a filtrar só pela Dra. Vera.

- **Por quê**: a CIV operada do `34990` está nas evoluções da **Dra. Luciana Nina**, ausentes do CSV. A ventriculoplastia do `39332` foi perdida por falta de termo para cardiopatia **corrigida**.
- Há pelo menos três cardiologistas no HICD: **Dra. Vera**, **Dra. Luciana Nina** (CRM/RO 5840) e **Dra. Marcela Flavia Terra Cruz Mendes**. 22% dos prontuários têm cardiologista fora do marco amostral.
- **Limite que permanece**: para prontuário ainda não coletado, a triagem cai de volta no CSV e volta a ser cega.

### Lei 3 — Script de reprocessamento chama o serviço

Nunca reescrever regra de negócio em Python. `scripts/reprocessar_obito.py` duplicou a regex de óbito e **apagou um óbito real** (`38183`) ao rodar depois da correção em JS. Está marcado como obsoleto.

Use **`node scripts/reprocessar_desfecho.js`** — simulação por padrão, grava só com `--gravar`. Recalcula desfecho por internação **e** `obitoNoProntuario`.

---

## 1-B. O protocolo manda — e a execução diverge dele

Referência: `docs/pre-projeto_cardiopatias_HICD_2024-2025.docx`.

| O protocolo diz | A execução faz |
|---|---|
| §1.6.2 — amostra é **"a totalidade dos pacientes com cardiopatia congênita internados"** (censo) | marco amostral = **pareceres da Dra. Vera** (amostra de conveniência) |
| Período **01/01/2024 a 31/12/2025** | CSV começa em **16/01/2024** |
| §1.6.8 — excluir prontuário com **dados incompletos** | `21640` entrou com 43 campos vazios |
| OE3 — "internações **por** cardiopatia congênita" | só **4,7%** das internações de cardiopatas têm CID Q20–Q28 |

### Varredura de todos os cardiologistas — feita em 17/09/2026

Varri os **6.127 pacientes internados fora do marco** (arquivo de prescrições) procurando qualquer evolução com `atividade = CARDIOLOGISTA`. Não existe consulta global por especialidade no HICD: o `SIADT/5599` ("Produção Profissionais") filtra por CPF e por área de **SADT**, não cobre evolução clínica.

| | |
|---|---|
| Pacientes varridos | 6.127 |
| Com evolução de cardiologista | 64 |
| **Com avaliação DENTRO de 2024-2025** | **6** |

Dos 6: **5 vistos só pela Dra. Luciana Nina** e **1 (`35631`) visto pela Dra. Vera mas ausente do CSV dela**.

> **Conclusão que inverte a suspeita inicial**: o CSV da Dra. Vera é praticamente completo para o período — erra 1 em 626 (0,16%). Os outros 58 achados são de 2017–2023 e 2026, fora do biênio, e o export os exclui corretamente.
>
> **O marco ampliado tem 631 pacientes**, não centenas a mais. Lista em `output/epidemio/marco_ampliado_novos.json`.

### Varredura por TERMO — a lacuna residual do M1, medida em 20/09/2026

A varredura por atividade é cega para o cardiopata que **nunca recebeu parecer** (criança com CIV conhecida internada por pneumonia). Para medir isso, varri os mesmos 6.127 procurando **termo estrutural de cardiopatia em qualquer evolução** do biênio, de qualquer profissional.

| | |
|---|---|
| Varridos | 6.127 |
| Com termo, brutos | 116 |
| **Após remover o PCA-procalcitonina** | **64 (1,04%)** |
| Destes, com termo **estrutural** | **54** |
| Só menção genérica a "cardiopatia congênita" | 10 |

Termos: CIA 28 · canal arterial 19 · cardiopatia congênita 19 · CIV 19 · coarctação 2 · cardiopatia operada 2 · hipoplasia 1 · ventrículo único 1 · Fallot 1.

> **Dimensão final do M1**: além dos 631 do marco, há cerca de **54 pacientes com indício estrutural de cardiopatia que nunca receberam parecer cardiológico** — uma lacuna de ~8,6% sobre a amostra, não os 90,9% que o alcance bruto sugeria. Exemplos concretos: `17401` (síndrome de SHONE com cardioplastia por coarctação em 2019), `22665` (CIV com abordagem cirúrgica aos 7 meses), `1985` (PCA pregressa).
>
> Resultado em `output/epidemio/varredura_termos_limpa.json`. Precisam de leitura para confirmar — a taxa de confirmação aqui tende a ser menor que os 63% do grupo REVISAR, porque muitos são menção a história pregressa já resolvida.

**A lacuna do marco amostral é medida, não suposta**: das 115 internações de cardiopatas confirmados dentro do biênio, **26 (22,6%) não geram parecer nenhum**. Um paciente que interne uma única vez tem ~1 chance em 4 de nunca entrar na amostra.

**Sempre filtre `no_bienio == 'Sim'`** — o dataset tem 624 internações mas só **456** estão em 2024–2025. Ignorar isso desloca a taxa de alta de 71,3% para 67,6%.

---

## 2. Fluxo de trabalho

```
registro (CSV) → resolve prontuário → coleta → triagem → classificação → reprocessa desfecho → dataset
```

### Passo 1 — Selecionar a coorte

```bash
# pacientes com parecer da Dra. Vera num mês
python3 - <<'PY'
import csv; csv.field_size_limit(10**9)
v=list(csv.DictReader(open('docs/DRA_VERA_HICD_2024_2025.csv',encoding='utf-8')))
mes='2024-02'
print(sorted({r['registro'] for r in v if r['data_evo'][:7]==mes}))
PY
```

> **Nunca ordene por posição de linha.** O CSV são **11 trechos ascendentes concatenados** — só 74% dos pares consecutivos estão em ordem crescente. Ordene por `data_evo`.

### Passo 2 — Coletar

```bash
node scripts/coleta_epidemio.js --prontuarios 35824,35112,...
```

- ~30–60 s por prontuário. Acima de ~15, rodar em lotes — a coleta de 20 estourou 10 minutos.
- Depois de coletar, **confira cadastro vazio** (Lei 1).

### Passo 3 — Triagem

```bash
python3 scripts/triagem_cardiopatia.py --coletados          # tudo que já foi coletado
python3 scripts/triagem_cardiopatia.py --prontuarios A,B,C   # lista explícita
```

Saída: `AUTO-NAO` (nenhum termo) ou `REVISAR` (algum termo → leitura humana). Coluna `outros_cardiologistas` mostra quando o diagnóstico veio de fora do marco amostral.

### Passo 4 — Classificar

```bash
python3 scripts/classificar_auto.py   # só toca em AUTO-NAO sem classificação manual
```

Os `REVISAR` são lidos à mão e escritos em `docs/classificacao_cardiologica.csv`:

| Coluna | Conteúdo |
|---|---|
| `cardiopatia_congenita` | `Sim` / `Não` / `Sim (anomalia coronariana)` |
| `classe` | Croti & Park: `Cianogênica` / `Acianogênica (shunt E→D)` / `Acianogênica (distúrbio de condução)` / `Não se aplica` / `Não se aplica (cardiopatia adquirida)` |
| `dx_cardio` | diagnóstico com as medidas do laudo |
| `momento_dx` | `Precoce` / `Tardio` — **idade ao diagnóstico, não idade no exame** |
| `comorbidades` | não cardiológicas |
| `origem_classificacao` | `manual` ou `auto (triagem)` |

### Passo 5 — Desfecho e dataset

> **`dataset_epidemio.py` inclui TODOS os prontuários coletados**, não só os classificados. Quem ainda não foi lido entra com `cardiopatia_congenita = "Pendente de leitura"` e `status_classificacao = "PENDENTE"`. Antes de 17/09/2026 o script filtrava por classificação e **descartava 187 pacientes e 475 internações sem aviso** — o denominador de internações ficava incompleto em silêncio.
>
> `dataset_internacoes.csv` carrega `cardiopatia_congenita`, `classe_croti_park` e `status_classificacao` em cada linha, para marcar a internação e não só o paciente.


```bash
node scripts/reprocessar_desfecho.js --gravar
python3 scripts/dataset_epidemio.py
```

---

## 3. Armadilhas de leitura do prontuário

Todas encontradas em produção. Verifique cada uma antes de classificar.

| Armadilha | Caso | O que parece × o que é |
|---|---|---|
| **Cateter transfixando o septo** | `35604` | Parece CIA; é iatrogenia. O eco seguinte, após tracionar o cateter, traz o septo íntegro |
| **Idade no exame ≠ idade ao diagnóstico** | `35824` | Eco aos 10 anos; Fallot diagnosticado **na Bolívia em 2013**, no 1º ano de vida. Ler a HPP da admissão |
| **Parecer não cardiológico** | `31602`, `34653`, `36055`, `36060` | `tipo = CARDIOLOGISTA` descreve o **cadastro da profissional**. Em 16/02/2024 ela cobriu a **ortopedia** — 5 pareceres que começam com `HICD - SETOR ORTOPEDIA` |
| **Cardiopatia corrigida** | `34990`, `39332` | "patch no septo interventricular" **é** CIV. O prontuário escreve `PACHT` e `Pacth` |
| **Arritmia por artefato** | `34575` | Flutter atrial ao ECG; repetido com eletrodos em linha paraesternal, deu ritmo sinusal (mesocardia) |
| **Exame pedido e nunca realizado** | `35937`, `35963`, `36052` | Eco solicitado, resultado nunca voltou. **Não é ausência de doença** |
| **Laudo se propaga copiado** | `35649` | Filtro textual devolveu 69 "laudos" onde havia 3 exames. Contar por `profissional`, nunca por texto |
| **Condução vem do ECG** | `35856` | Bloqueio de ramo direito diagnosticado por **ECG**, com eco normal. Quem varre só eco perde a categoria |
| **Achado vascular ≠ cardiopatia** | `35010` | Trombose de veia cava superior, 7 ecos seriados, septos íntegros em todos |
| **Erro de identificação no laudo** | `35649` | Laudo da Kayla traz `Id: Antonelly` (outra paciente, 35689) e nascimento 2023 em vez de 2013 |
| **Evolução do paciente errado, retratada depois** | `40600`, `43600` | A cardiopediatra escreve a evolução inteira e na nota SEGUINTE retrata: *"esta evolução anterior corresponde ao paciente Benjamim de Souza"* / *"favor desconsiderar evolução anterior"*. Quem varre por texto sem ler a nota seguinte importa o diagnóstico para o paciente errado |
| **Defeito referido × documentado** | `35565`, `37314`, `37175`, `40679`, `36987`, `40110`, `41146`, `40204`, `4365` | Cardiopatia na lista de problemas e ecocardiograma NORMAL. Classificados `Não` pelo §1.6.8 (sem confirmação por imagem). **Assimetria em aberto**: defeito documentado que depois normalizou (`37725`, `39924`, `40334`, `41612`, `40804`, `27024`) foi contado `Sim` |
| **BRD completo × incompleto** | `28930` × `35856` | BRD **incompleto** é variante da normalidade na infância → `Não`. BRD **completo** → `Sim`. Quando o laudo não especifica (`40476`, `41181`), registrar a ressalva na linha |
| **Kawasaki é adquirido** | `36053`, `39961` | Lesão coronariana de Kawasaki é **adquirida**. A categoria `Sim (anomalia coronariana)` fica reservada a congênitos — ALCAPA (`39581`, `43170`) |
| **"Atresia" quase nunca é cardíaca** | `21473`, `40666`, `43322` | Atresia de **esôfago**, de **jejuno** e de **coanas**. Exigir o qualificador (tricúspide, pulmonar, aórtica, mitral) |

### Fronteira de palavra com acento

`\b` é ASCII e não cobre `Á` — "FARMÁCIA" casa com a sigla **CIA**. Use:

```python
L = 'a-zà-öø-ÿA-ZÀ-ÖØ-Þ'
```

Outros falsos positivos do mesmo tipo: "Epstein-Barr" → Ebstein, **"fontanela" → Fontan** (não só "transfontanela" — está no exame neurológico de todo lactente), "CIV IgG" (citomegalovírus) → CIV.

> ⚠️ **`PCA` no laboratório é PROCALCITONINA**, não persistência do canal arterial. Aparece como `PCA 0,36` no meio de listas de exames e foi **75% dos achados** desse termo numa varredura (53 de 71). Use `${NB}pca${NA}(?!\s*[:=]?\s*\d)` — a sigla não vale seguida de número.
>
> **`PCA` tem DUAS homonímias**: no laboratório é **procalcitonina** (`PCA 0,36`) e na história obstétrica é a fórmula **Gesta-Para-Cesárea-Aborto** (`G3PCA0`). O padrão precisa de `(?<![G]\d)${NB}pca${NA}(?!\s*[:=]?\s*\d)`.
>
> **E cuidado com o filtro de limpeza**: `\bPCA` NÃO casa em `2,40PCA`, porque dígito e letra são ambos `\w` e não há fronteira ali. Use a mesma fronteira acentuada do scanner.
>
> **Regra geral**: sigla de três letras em prontuário é ambígua por padrão. Antes de usar `PCA`, `CIA`, `CIV` ou `HP` como termo diagnóstico, verifique se existe **exame laboratorial** homônimo **e** se a sigla aparece em alguma **fórmula estruturada**.

> ⚠️ **`CIA` e `CIV` também são homônimos — e não só de exame.** Encontrados na leitura à mão dos 54 achados da varredura:
>
> | Texto | O que é de verdade | Caso |
> |---|---|---|
> | "Procurou atendimento de **CIA** em 03/04/25" | **Centro Integrado de Atendimento** — uma unidade de saúde de Porto Velho | `39498` |
> | "**CIA**: MAE ROZENE" | campo **acompanhante** do cabeçalho da evolução | `43432` |
> | "Dieta **cia** oral" | erro de digitação de **via** oral | `38151` |
> | "Acesso venoso central em **CIV**" | **sítio anatômico** do cateter — outra evolução do mesmo paciente escreve "em VSD" | `40511` |
> | "MÃE ... **COARCTAÇÃO** DA AORTA" | história **familiar**, não da paciente | `38086` |
>
> Nenhum desses casos tem ecocardiograma no prontuário. **Achado de varredura sem exame que o sustente pede leitura do contexto inteiro, não do trecho.**

---

## 4. Como escrever a classificação

Linhas `auto (triagem)` **não são leitura do prontuário**. O texto é:

> "Sem cardiopatia congênita pela triagem automática — **NÃO LIDO À MÃO**. A varredura não encontrou laudo formal de ecocardiograma nem termo de cardiopatia nas evoluções de cardiologista deste prontuário. **Isto não afirma ausência de achado**: confirme abrindo as evoluções antes de usar esta linha como negativa."

Ao relatar números, **declarar quantos prontuários não foram lidos à mão**.

---

## 5. Cobertura — o que o estudo pode e não pode afirmar

| Variável | Cobertura | Uso |
|---|---|---|
| Sexo, idade, município | ~100% | livre |
| Desfecho | 78% | reportar o % sem informação |
| **Raça/cor** | **21%** (79% "não informado") | **medir antes de usar** |
| **Triagem de Manchester** | **~13%** | insuficiente |

### Lacunas de período — três camadas

1. **O arquivo começa em 16/01/2024.** A 1ª quinzena não existe nele, e havia atividade cardiológica (Dra. Nina em 03/01 e 06/01).
2. **Ausências da cardiologista**: 28/03–16/04/2024 (12 dias úteis) e 21/03–01/04/2025 (6 dias úteis). Nas evoluções coletadas dessas janelas **não há nenhum cardiologista** — a queda mede férias, não demanda.
3. **A amostra coletada não cobre o biênio**: na prática é **set/2024 a abr/2025**, mais jan e fev/2024. Nove meses com cobertura zero, incluindo **mai–dez/2025 inteiro**.

> **O objetivo 3 (comparação temporal) não pode ser feito com a amostra atual** — compararia meses coletados com meses não coletados.

### Denominador — e o alcance real do estudo

`docs/prescricoes_fev2024_dez2025.csv` (67.564 prescrições, 23 meses, 6.737 pacientes válidos) e `docs/janeiro_2024.csv` (326 pacientes).

| | |
|---|---|
| Crianças internadas no biênio (fev/24–dez/25) | 6.737 |
| Com parecer da Dra. Vera | 610 |
| **Alcance do marco amostral** | **9,1%** |
| **Nunca entram no estudo** | **90,9%** |

Taxa mensal de parecer: **mediana 7,8%** (4,6% a 11,6%) — 1 a cada 13 internados.

**Defeitos do arquivo, todos medidos:**

- O campo `Observacao` declara os próprios problemas: **2.485** linhas `sem registro de internacao` (811 pessoas), **1.113** com `homonimo - registro definido pelo periodo de internacao` (registro **inferido**, 121 pacientes, 8 no marco — os 8 foram validados e conferem), **9** `AMBIGUO`.
- **Ambulatório dentro do denominador**: CONSULTORIO 01/02, TRIAGEM e DESATIVADA TESTE somam 3.286 prescrições; **213 pacientes nunca foram internados**.
- **O denominador varia 9,5%** conforme a definição: 6.737 (tudo) → 6.524 (sem só-ambulatoriais) → 6.099 (sem só-hospital-dia). **Fixe a definição antes de calcular qualquer taxa.**
- `C I P` e `CIP` são o mesmo setor com duas grafias — reforça: agrupar por código.
- **Validação boa**: os 610 nomes do marco batem com o cadastro do HICD, 610/610.

> ⚠️ **A captação varia no tempo.** Fev–abr/2024 tem taxa média de 5,2%; o resto ~8%. Mesmo com cobertura de prontuário em 100%, comparar períodos no OE3 mistura variação de doença com variação de prática de parecer. Reporte taxa, não contagem bruta.

> ✅ **Duplicata no marco amostral — resolvida**: `38496` e `39071` são **a mesma criança** (EMILIANO ARNEZ ROBLES, nasc. 17/01/2024, mesma mãe, Trissomia 21 + PCA amplo), com **duas internações distintas e reais** (15/11–31/12/2024 e 09–12/02/2025).
>
> O `dataset_epidemio.py` agora detecta duplicatas sozinho, por `(nome, data de nascimento)`, em `duplicatas()`. O canônico é o de mais evoluções; as internações do duplicado **migram** para ele com a coluna `prontuario_origem` preservando a procedência, e o paciente deixa de ser contado duas vezes (coluna `prontuarios_duplicados`). Detecção automática, não mapa escrito à mão — assim sobrevive às próximas coletas.

---

## 6. Desfecho e óbito

Precedência em `resolverDesfecho()`:

```
1. óbito constatado em evolução        → confiança alta
2. documento do RALTA                  → confiança alta
3. resumo de alta escrito como evolução→ confiança média
4. desfecho na evolução do último dia   → confiança média
5. sem informação
```

- **Só o último dia** entra no passo 4 — o prontuário recopia a admissão inteira todo dia.
- Para análise conservadora, filtrar **`confianca_desfecho == 'alta'`**.
- **Óbito só existe no texto das evoluções** — em óbito ninguém escreve resumo de alta, então o RALTA fica vazio justamente nos óbitos.
- O padrão precisa tolerar: `constatato` (erro de digitação real), `óbito confirmado`, `atestado de óbito`. Excluir "risco de óbito" e óbito de terceiro ("mãe veio a óbito").
- **`setor` do módulo `Inter` é o de ALTA**, não o de entrada. A porta de entrada vem do `clinicaLeito` das evoluções.
- **UTI**: as notas de UTI vêm sem `clinicaLeito` — usar as duas fontes, senão a passagem por UTI é subcontada.

### Registros corrompidos na origem

Filtrar antes de qualquer estatística de tempo de internação:

- `saida < entrada` (ex.: `17179`, saída 3 dias antes da entrada)
- duração absurda (`22870`: 1.105 dias; `>365` dias)
- `Inter` devolve **HTTP 500** em ~1% dos prontuários muito longos — o serviço devolve `{internacoes: [], erro}`

---

## 7. Estado atual

Atualizado em **20/09/2026**, depois de ler à mão os 54 achados da varredura por termo.

| | |
|---|---|
| Registros resolvidos | 625 de 626 (só o `21640` falha) |
| **Prontuários no marco** | **678** — 632 do marco ampliado (cardiologistas) + **46 trazidos pela varredura de termos** |
| Excluído pelo §1.6.8 do protocolo | `21640` (sem cadastro) → `output/epidemio/excluidos/` |
| Duplicata resolvida | `39071` funde em `38496` — 676 pacientes, 678 registros |
| **Cobertura por semestre** | **100% nos quatro** (era 27,9 / 75,2 / 51,6 / 0,0) |
| **Aguardando leitura à mão** | **0 — amostra fechada** |
| Lidos à mão / automáticos | **382 / 297** |
| Base de casos (exclui "referida, não confirmada") | **664** |
| **Cardiopatias congênitas** | **205 (30,9%)** — 21 cianogênicas · **sem FOP isolado: 165 (24,8%)** |
| Referida, não confirmada | 12, contadas à parte |
| Óbitos | 53 pacientes (21 entre as congênitas) |
| Internações | **1.706** (**1.149 no biênio**) |

**Mortalidade**: congênitas **10,7%** (22/205) × demais **6,8%** (31/459). Sem FOP isolado: **11,5%** (19/165). Na amostra parcial de 235 o sinal era **inverso** (8,6% × 9,6%) — não reporte mortalidade com amostra incompleta.

**Lactentes < 1 ano: 61,0%** · diagnóstico precoce 75,5% · passagem por UTI 23,0%.

**OE3** (internações de congênitos no biênio, cobertura 100%): 2024-S1 **70** · 2024-S2 **74** · 2025-S1 **74** · 2025-S2 **105**. Sem FOP isolado: 58 · 57 · 63 · 80.
> Normalize pela taxa mensal de parecer antes de interpretar a tendência (erro M20).

**O que a varredura por termo acrescentou** — os **48 alvos estruturais** lidos à mão (54 prontuários coletados) renderam **35 cardiopatias confirmadas, 6 referidas e 7 falsos positivos de sigla** que nunca tinham recebido parecer da cardiopediatria, entre elas `36978` (TGV + CIV + CIA em paliação univentricular: bandagem 2019, Glenn 2024, Fontan 2025), `39321` (Tetralogia de Fallot com atresia pulmonar e DSAV tipo A de Rastelli, corrigida), `17401` (síndrome de SHONE), `32541` (CIA + CIV subpulmonar + PCA + hipoplasia da aorta ascendente, corrigida em São José do Rio Preto). **46 dos 46 acrescentados ao marco não tinham NENHUMA evolução de cardiologista** — é a medida direta da lacuna M1.

**Auditoria de confiabilidade (20/09/2026)** — ver `vault/hicd-bot/Epidemiologia/Auditoria de confiabilidade — o que sustenta e o que não sustenta.md`:

- Triagem automática validada contra leitura humana **dentro do seu domínio**: **43 `AUTO-NAO` do marco de cardiologistas, 0 falsos negativos**. Limite superior de 95% pela regra de três: **7%** — declare assim, nunca "zero".
- Varredura por termo rodada sobre os **307 nunca lidos à mão**: 11 achados, **4 cardiopatias reais perdidas** (`20969`, `26036`, `27011`, `40327`) + 1 limítrofe (`42792`). **Erro residual medido: 1,3%–1,7%.** Todos corrigidos.
- Defeito de código encontrado pela auditoria: `RUIDO_NORMAL` descartava a linha inteira e engolia o achado escrito **depois** da cláusula normal (13 prontuários, 1 caso de dano real). Corrigido.

**Pendências conhecidas:**

- 6 prontuários com HTTP 500 no módulo `Inter` (`20969`, `33549`, `34387`, `40600`, `41522`, `5641`) — sem dados de internação, óbito ainda detectado no nível do prontuário.
- Cobertura de cor/raça 38,1%; triagem de Manchester 0% entre as congênitas — declarar como limitação, não analisar.
- M20: a taxa de parecer varia no tempo — o OE3 precisa ser normalizado antes de virar tendência.

## DECISÕES DO ORIENTANDO — 20/09/2026

Quatro decisões fechadas. Estão implementadas; não reabrir sem pedido.

| Decisão | O que vale |
|---|---|
| **FOP isolado** | **FICA no numerador.** Mas **toda tabela carrega a coluna "sem FOP isolado"** — rode `python3 scripts/tabelas_oe.py`, que já produz as duas colunas lado a lado. A divergência com Park (2016) é deliberada e precisa aparecer em cada número, não numa nota de rodapé. São 36 de 168 (21,4%); prevalência 26,9% com, 21,1% sem |
| **Referida × documentado** | **Categoria própria**: `cardiopatia_congenita = "Referida, não confirmada"`. Sai do numerador E do denominador de casos (base 625, não 631), reportada à parte. São **6**: `35565`, `36987`, `37175`, `37314`, `40204`, `40679` — todos com **diagnóstico prévio estabelecido** e eco normal aqui. NÃO entram: hipótese levantada e afastada nesta internação (`37207`, `39547`, `40110`, `41146`) nem diagnóstico prévio **refutado** por imagem (`4365`, 3 ecos dizem levocardia contra dextrocardia na HPP) |
| **Denominador** | **Todos os registros válidos do arquivo de prescrições: 6.737.** Sem excluir ambulatório nem hospital-dia. Declarar assim na metodologia |
| **§1.6.2 / marco amostral** | **Manter "totalidade"** e fechar a lacuna: ler os **54** achados da varredura por termo (`output/epidemio/alvos_varredura.txt`). Coleta lançada por `scripts/coletar_54.sh` |

- **DECIDIDO em 17/09/2026 — Hospital Dia É internação.** Entra no denominador e nas contagens de internação. São 143 internações do biênio com passagem por Hospital Dia e 425 pacientes que só aparecem lá. Registrar essa escolha no texto do TCC (§metodologia), porque ela muda o denominador em 6,3%.
- **Resolvido em 20/09/2026** — a duplicata `38496`/`39071` deixou de ser decisão: `dataset_epidemio.py` funde duplicatas sozinho por `(nome, data de nascimento)`.
- **Marcador manual de FOP isolado**: escrever `[FOP isolado]` no início do `dx_cardio` força a coluna de sensibilidade, e `[não-FOP]` força o contrário. Existe porque a regex erra nos dois sentidos — "comunicação interatrial tipo fossa oval" **é** um FOP e casa com o padrão de outras lesões; e um eco neonatal que descreve CIA + canal arterial mas cujo controle mostra só FOP ficava preso ao primeiro laudo. Quem leu decide; a regex é fallback.
- Decisões ainda em aberto: **FOP isolado tem corte de idade?** (hoje não tem — um FOP aos 2 dias de vida e um aos 5 anos contam igual) e **qual data ancora a internação ao período** (hoje é a entrada).
- **FOP isolado são 13 das 58 congênitas (22,4%)** e Park (2016) — referência do próprio protocolo — trata o forame oval pérvio como variante da normalidade. Sem eles a prevalência cai de 24,7% para 19,1%. Rodar como análise de sensibilidade.
- **OE3 destravado em 17/09/2026**: cobertura 100% nos quatro semestres. Internações no biênio: 2024-S1 185 · 2024-S2 224 · 2025-S1 229 · 2025-S2 167. A ressalva M1 (marco amostral) continua valendo.
- **Permanência inválida é anulada, não filtrada**: `dataset_epidemio.py` zera `permanencia_dias` e preenche `permanencia_invalida` quando a saída é anterior à entrada ou a duração passa de 365 dias. São **8 internações** (`17179`, `25183`, `40540`, `42170` ×3, `7072`, `22870`). A linha continua contando como internação, mas nunca entra em estatística de duração.
- **6 prontuários com `Inter` em HTTP 500** (`20969`, `33549`, `34387`, `40600`, `41522`, `5641`) — todos com >1.500 evoluções. Mantêm demografia e óbito; perdem a lista de internações.

---

## 8. Arquivos

| Caminho | Papel |
|---|---|
| `docs/DRA_VERA_HICD_2024_2025.csv` | marco amostral — 1.384 evoluções, 626 registros |
| `docs/classificacao_cardiologica.csv` | classificação curada (versionado) |
| `docs/prescricoes_fev2024_dez2025.csv` | denominador mensal |
| `docs/janeiro_2024.csv` | denominador de jan/2024 |
| `output/epidemio/raw_<pront>.json` | coleta bruta por prontuário |
| `output/epidemio/dataset_*.csv` | datasets finais |
| `scripts/resolver_prontuarios.js` | resolve registro → prontuário (Lei 1) |
| `scripts/coletar_pendentes.sh` | coleta em lote, com retomada (`setsid nohup`) |
| `scripts/coleta_epidemio.js` | coleta unitária |
| `scripts/triagem_cardiopatia.py` | triagem |
| `scripts/classificar_auto.py` | classificação automática |
| `scripts/reprocessar_desfecho.js` | reprocessa desfecho + óbito |
| `scripts/dataset_epidemio.py` | monta os datasets |
| `scripts/tabelas_oe.py` | tabelas dos OE **com a coluna de sensibilidade do FOP** (obrigatória) |
| `scripts/coletar_54.sh` | coleta os achados da varredura por termo |
| `vault/hicd-bot/Epidemiologia/` | notas do estudo |

> `scripts/reprocessar_obito.py` está **obsoleto** — não rodar (Lei 3).
