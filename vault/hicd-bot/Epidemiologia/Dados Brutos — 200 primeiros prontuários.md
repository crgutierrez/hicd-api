# Levantamento epidemiológico — dados brutos dos 200 primeiros prontuários

**Fonte primária:** `docs/DRA_VERA_HICD_2024_2025.csv` (1.384 evoluções da cardiopediatria · 626 prontuários)
**Fonte secundária:** HICD — `SSAME/pesq_Pront_Reg` (cadastro do SAME), `CONSPAC_OPEN`, `Inter` (internações), `RALTA` (relatórios de alta), `SIINF/237` (setores), `Evolucao`
**Recorte:** 200 primeiros prontuários na ordem de aparição do CSV — **32% da base**. A ordem do arquivo não é cronológica (ver seção 6), mas concentra set/2024–abr/2025.
**Data de extração:** 14/09/2026

```bash
node scripts/coleta_epidemio.js --prontuarios <lista>     # coleta principal
node scripts/coleta_be.js --prontuarios <lista> --limite-bes 3   # boletins de emergência
node scripts/catalogo_setores.js                          # catálogo de setores
python3 scripts/triagem_cardiopatia.py --n 200            # triagem automática
python3 scripts/classificar_auto.py                       # classifica o grupo sem achados
python3 scripts/porta_entrada.py                          # porta de entrada e trajetória
python3 scripts/dataset_epidemio.py                       # dataset final
```

**Saídas:** `dataset_pacientes.csv` (200) · `dataset_internacoes.csv` (521) · `porta_entrada.csv` · `triagem.csv` · `catalogo_setores.csv` · `docs/classificacao_cardiologica.csv` · `raw_<pront>.json` · `be_<pront>.json`

---

## Panorama

| | n=200 |
|---|---|
| **Cardiopatia congênita** | **52 (26%)** — 7 cianogênicas, 45 acianogênicas |
| Cardiopatia adquirida | 8 |
| Sem cardiopatia | 140 |
| **Óbitos** | **17 (8,5%)** |
| Lactentes < 1 ano | 77 (39%) |
| Passagem por UTI | **53** |
| Internações (biênio) | 385 |
| Raça/cor preenchida | 42 (21%) |

---

## 1. Como 200 prontuários foram classificados

Aos 50 a classificação caso a caso ainda cabia. Aos 200, não — e aos 626 seria inviável. Construí a triagem automática que vinha sendo adiada.

**`scripts/triagem_cardiopatia.py`** varre duas fontes por prontuário — as evoluções da cardiopediatria e as hipóteses diagnósticas de todas as especialidades — procurando 24 famílias de termos (forame oval, CIA, CIV, canal arterial, Fallot, transposição, atresia, coarctação, estenose valvar, hipoplasia, BAV, anomalia coronariana, arritmia, miocardiopatia, Kawasaki e outros). O critério é deliberadamente conservador: **ausência total de termo → classificação automática como "sem cardiopatia"; qualquer sinal → leitura humana.**

**Validação contra as 50 classificações manuais:**

| | com cardiopatia | sem cardiopatia |
|---|---|---|
| Marcado para revisão | **19** | 10 |
| Auto-classificado como "sem" | **0** | 21 |

**Sensibilidade 100% — nenhum congênito conhecido escapou.** O custo são 10 falsos positivos, que foram para leitura e se revelaram normais. Trocar falso positivo por falso negativo é a direção certa num levantamento de prevalência.

**Resultado nos 200:** 101 auto-classificados, 99 lidos à mão. A leitura manual caiu para **metade** do volume, e a proporção melhora com a escala — dos 150 novos, 98 foram automáticos e só 52 exigiram leitura.

A coluna `origem_classificacao` do CSV registra a procedência de cada linha, e a triagem nunca sobrescreve leitura humana.

### Falsos positivos que obrigaram a ajustar o casamento de termos

| Texto | Casava com | Correção |
|---|---|---|
| "FARMÁCIA" | sigla **CIA** | `\b` não serve: `[a-z]` do lookbehind não cobre "Á". Fronteira de palavra passou a incluir acentuadas |
| "Epstein-Barr" | **Ebstein** (anomalia de) | exclusão explícita |
| "transfontanela" | **Fontan** (cirurgia de) | fronteira de palavra |

O primeiro é o mais instrutivo: `(?<![a-z])cia(?![a-z])` parece correto e não é, porque em Python `[a-z]` é ASCII. Sozinho ele transformava toda menção a farmácia em suspeita de comunicação interatrial.

---

## 2. Variáveis demográficas

**Sexo:** M 111 · F 88

**Faixa etária:** <1 ano **77 (39%)** · 1–2a 18 · 2–5a 30 · 5–10a 35 · ≥10a 37

**Procedência:** Porto Velho 123 · Jaru 13 · Ji-Parana 8 · Ariquemes 6 · Vilhena 6 · Guajara-Mirim 6 · Humaita 4 · Cacoal 3 · Alto Paraiso 2 · Rolim De Moura 2 e mais 21 municípios. **76 dos 200 (38%) vêm do interior** — confirma o papel do HICD como referência estadual.

**Raça/cor:** 39 pardas · 2 indígenas · 1 branca · **157 não informado (79%)**.

> ⚠️ **A variável raça/cor não se sustenta.** Com 200 casos a perda é de 79% — praticamente igual aos 80% que eu via com 20. Não é ruído de amostra pequena: é o padrão de preenchimento do campo. Dos 42 registros preenchidos, 39 são "parda", o que deixa a distribuição sem variabilidade útil. Recomendo declarar a perda em vez de reportar proporções.

---

## 3. Variáveis clínicas

### 3.1 Cardiopatia congênita — 52/200 (26%)

Critério: entram forame oval pérvio isolado, anomalias coronarianas e distúrbios de condução, desde que **documentados em exame**.

| Classe | n |
|---|---|
| **Cianogênica** | **7** |
| Acianogênica — shunt E→D | 31 |
| Acianogênica — obstrutiva | 7 |
| Acianogênica — distúrbio de condução | 5 |
| Acianogênica — anomalia coronariana | 1 |
| Acianogênica — outras (colateral aórtica) | 1 |

**Momento do diagnóstico:** precoce (<1 ano) **42** · tardio **10**. **30 dos 52 congênitos são lactentes <1 ano.**

### 3.2 As 7 cardiopatias cianogênicas

**22717** — ATRESIA TRICÚSPIDE com vasos normoposicionados — pós-operatório tardio de cirurgia de Glenn (2019), com estenose pulmonar importante na junção APD/APE. Cianose perioral e periférica com baqueteamento digital e cansaço aos esforços; sobrecarga biatrial e ventricular esquerda ao ECG; FEVE 68%. Meta de saturação acima de 80%. TFD preenchido · *vivo*

**37799** — Tetralogia de Fallot (correção total em jan/2024) com CIA residual de 5 mm (OS, fluxo E-D), monocúspide em VSVD, ampliação de VSVD/TP; insuficiência tricúspide leve a moderada; aumento e hipocinesia de VD · ***óbito***

**38044** — TRANSPOSIÇÃO DAS GRANDES ARTÉRIAS — pós-operatório de atriosseptostomia de Rashkind e cirurgia de Jatene com fechamento de CIV e CIA, ventriculoplastia e atriosseptoplastia. Residual: estenose leve pulmonar e de ramos pulmonares, CIV muscular trabecular pequena, aumento leve de VE. Complicado por quilotórax e trombose de MID/VCI (anticoagulação com varfarina, RNI alvo 2–3) · *vivo*

**38601** — DEFEITO DO SEPTO ATRIOVENTRICULAR TOTAL (DSAVT) TIPO A DE RASTELLI com DEXTROPOSIÇÃO DA AORTA (cavalgamento do septo em 50%): CIA ostium secundum de 4 mm + CIA ostium primum de 6 mm com fluxo E→D, CIV perimembranosa de mal alinhamento de 6 mm com fluxo bidirecional, hiperfluxo pulmonar e canal arterial pérvio. Cianose progressiva com saturação entre 73 e 91% em O2. Trissomia do 21. TFD solicitado, com pedido de judic · *vivo*

**38870** — ATRESIA PULMONAR com CIA ostium secundum de 10 mm, tronco pulmonar e ramos HIPOPLÁSICOS (TP mede 3 mm), canal arterial pérvio como fonte de fluxo pulmonar; insuficiência tricúspide importante (gradiente VD-AD 80 mmHg), dilatação e hipertrofia moderadas de VD, aumento importante de AD, congestão de VCI e supra-hepáticas · ***óbito***

**38944** — ATRESIA TRICÚSPIDE com CIV AMPLA perimembranosa, CIA ampla não restritiva e HIPOPLASIA DO VD. Pós-operatório de atriosseptostomia com ampliação da CIA e BANDAGEM PULMONAR; posteriormente CIRURGIA DE GLENN (anastomose VCS/APD) com bom fluxo pulmonar. Cianose central persistente com saturação entre 75 e 81%. Furosemida, AAS, captopril, espironolactona. Seguimento no HCor por TFD · *vivo*

**39256** — TRANSPOSIÇÃO DAS GRANDES ARTÉRIAS com CIV AMPLA de 10 mm e ESTENOSE PULMONAR (anel de 7 mm, gradiente 38 mmHg, desvio posterior infundibular): cianose importante com saturação de 35 a 83%. Correção em dois tempos — abertura de CIA e dupla ligadura do canal arterial (16/03/2025), depois JATENE com fechamento de CIV, ampliação da parede anterior do VD e fechamento da CIA (24/04/2025). Evoluiu com ENDOCARDITE com múltip · *vivo*


Dois óbitos entre as 7: a Tetralogia de Fallot (37799) e a atresia pulmonar com hipoplasia de tronco e ramos (38870, com 1 mês de vida). As outras 5 chegaram a correção cirúrgica — Jatene, Glenn, bandagem pulmonar — via TFD.

**O gargalo do TFD aparece em vários casos.** Transferência fora de domicílio é o caminho de toda cardiopatia que exige cirurgia, e as evoluções registram as esperas: o 38496 aguardou regularização da documentação da mãe na Polícia Federal; o 38601 teve pedido de judicialização do TFD; o 37171 (coarctação grave) esperou de junho a julho de 2024 e foi transferido em UTI aérea. É um achado de organização de serviço que vale para a discussão.

### 3.3 Cardiopatia adquirida — 8/200

Miocardiopatia dilatada pós-viral é o padrão: **pós-COVID** (36101), **pós-rotavírus** (38275), **pós-COVID e rotavírus** (35749, que chegou a iniciar trâmites de transplante cardíaco), **pós-miocardite** (38903). Somam-se Kawasaki (38092), cardiopatia reumática com prótese mitral calcificada e estenose crítica (34186), hipertensão pulmonar secundária a anemia falciforme (8683) e miocardiopatia secundária a pseudo-hipoparatireoidismo (37849).

---

## 4. Porta de entrada e movimentação entre setores

O módulo `Inter` registra **um** setor por internação — e ele é o setor de **alta**, não o de entrada. Testando contra o `clinicaLeito` das evoluções:

| O setor do `Inter` corresponde a… | n | % |
|---|---|---|
| **último setor da internação (alta)** | **243** | **67%** |
| primeiro setor (entrada) | 81 | 22% |
| não aparece em nenhuma evolução | 38 | 10% |

**56% das internações passam por dois ou mais setores.** O recorde é 8 setores numa internação. O `Inter` mostra só o último.

### Porta de entrada real, derivada das evoluções

| Porta | Internações |
|---|---|
| Observação / Hospital Dia (019) | 139 |
| UIR 1, 2 e 3 (003–005) | 95 |
| Direto em enfermaria ou UTI | 71 |
| Emergência (001) | 15 |
| CIP (002) | 9 |
| Sala de procedimento (020) | 5 |

Trajetórias típicas: `Hospital Dia → CIP → UTI → Enfermaria M → Enfermaria J` (35027) · `Hospital Dia → CIP → Isolamento → Enfermaria K` (37929) · `UIR 1 → Enfermaria L` (1704).

### O erro que isso corrigiu

Eu vinha contando **passagem por UTI pelo setor do `Inter`** — ou seja, só contava quem *recebeu alta* da UTI. Quem passou pela UTI e saiu pela enfermaria não entrava.

| | reportado antes | correto |
|---|---|---|
| Passaram por UTI | 18 | **53** |
| Letalidade entre eles | 13/18 = **72%** | 14/53 = **26%** |

Subestimava por um fator de 3, e a letalidade de 72% que eu destaquei era artefato de seleção: contando só quem morre *na* UTI, sobram os que morreram lá. Os 26% são clinicamente plausíveis.

### Sobre a data de entrada

Testei usar a data declarada nas evoluções (`DIH:`, presente em 75% dos prontuários) em vez da entrada do `Inter`. **A do `Inter` é melhor.** Das 521 internações: 40% com DIH idêntica, 48% sem DIH no período, 12% divergentes — e as divergências grandes são ruído de digitação, não informação:

- **erro de ano**: divergências de exatamente 365, 366 e 371 dias (39007, 39141, 39506 — o médico escreve 2024 em vez de 2025)
- **cabeçalho copiado**: DIH de internação anterior repetida na evolução nova (37793 com +128d, 15943 com +138d)

A primeira evolução vem, na mediana, **10,8 h depois** da entrada registrada no `Inter` (p90 = 23,4 h) — compatível com "interna hoje, evolui amanhã cedo". Se a entrada do `Inter` fosse data de setor, veríamos evoluções *antes* dela.

**Conclusão:** data de entrada pelo `Inter`; setor de entrada e trajetória pelas evoluções. É o que o `dataset_internacoes.csv` traz agora, nas colunas `setor_entrada`, `setor_alta`, `porta_de_entrada`, `n_setores_na_internacao` e `trajetoria_na_internacao`.

---

### O Boletim de Emergência — a fonte que faltava para a entrada

Cada paciente tem uma lista de **BE** (Boletim de Emergência) no cadastro, alcançável por `Param=REGE&ParamModule=CONSPAC_OPEN&PACIENTE=<número do BE>&TIPOBUSCA=BE`. Abrir um BE dá acesso ao *Registro Eletrônico da Emergência*, com dois módulos úteis:

| Módulo | O que traz |
|---|---|
| `EvolucaoBe` | **motivo da entrada**, **CID do atendimento**, chegada e saída da emergência |
| `TRIAGEM` | **classificação de risco (Manchester)**, queixa, sinais vitais na chegada, comorbidades declaradas |

**O BE marca a chegada; o `Inter` marca a internação.** Confrontando 325 BEs com as internações:

| Intervalo entre a chegada ao BE e a internação | n | % |
|---|---|---|
| menos de 1 h | 188 | 58% |
| 1–6 h | 105 | 32% |
| 6–24 h | 21 | 6% |
| mais de 24 h | 2 | 1% |
| BE sem internação correspondente | 9 | 3% |

**Mediana de 48 minutos** (p25 = 30 min, p75 = 1,5 h). No 37799, por exemplo, o BE registra chegada às 20:15 e o `Inter` internação às 21:32 — a diferença é o tempo de permanência na emergência antes de internar.

Isso valida a data de entrada do `Inter` e ainda entrega uma variável nova: **tempo entre chegada e internação**, na coluna `horas_chegada_ate_internacao`.

### Motivo da entrada — 281 das 385 internações do biênio (73%)

| Motivo | n |
|---|---|
| INTERNACAO | 66 |
| CONSULTA MEDICA | 52 |
| AVALIACAO PARA O ESPECIALISTA | 25 |
| FALTA DE AR | 18 |
| FEBRE | 16 |
| DOR ABDOMINAL | 9 |
| PNEUMONIA | 8 |
| DOR | 6 |
| FEBRE + VOMITO | 6 |
| GRIPE | 5 |

O perfil confirma o que a porta de entrada já sugeria: **"internação", "consulta médica" e "avaliação para o especialista" somam 143 das 281** — a maioria destas passagens é eletiva ou de encaminhamento, não urgência.

> ⚠️ **A classificação de risco existe mas quase não é preenchida.** Dos 333 BEs lidos, só **42 (13%)** têm classificação de Manchester; nos demais o módulo responde "Nenhum registro encontrado" — a triagem não foi feita, não é falha de extração (verifiquei o HTML). Entre os 42 preenchidos: amarelo 21, verde 16, vermelho 4, azul 1. É a mesma história da raça/cor — campo disponível, preenchimento insuficiente para análise.

> **Custo de coleta:** os BEs exigem 2 requisições cada, além de uma para listar. Coletei os **3 últimos BEs** de cada paciente (333 no total, ~1 min por bloco de 50 pacientes). Para os 626 com histórico completo, o volume cresce bastante — vale decidir se o motivo da entrada e a classificação de risco justificam o tempo.

---

## 5. Variáveis de desfecho

### Mortalidade — 17 óbitos (8,5%)

| Prontuário | Idade | Óbito | Setor | Cardiopatia congênita |
|---|---|---|---|---|
| 25183 | 6a 0m | 06/02/2026 | U T I | Não |
| 35025 | 1a 3m | 15/11/2024 | U T I | **Sim** |
| 35727 | 2a 8m | 14/10/2024 | ENFERMARIA L | Não |
| 35749 | 1a 2m | 04/12/2024 | U T I | Não |
| 36101 | 1a 10m | 09/11/2025 | U T I | Não |
| 36163 | 4a 7m | 04/09/2025 | U T I | Não |
| 37299 | 2m 26d | 24/09/2024 | U T I | Não |
| 37793 | 8m 2d | 27/03/2025 | EMERGENCIA - INTERNADOS | Não |
| 37799 | 11m 21d | 23/08/2024 | U T I | **Sim** |
| 37861 | 6m 3d | 29/08/2024 | U T I | Não |
| 38070 | 0m 9d | 24/10/2024 | C I P | Não |
| 38114 | 12a 6m | 17/11/2024 | U T I | Não |
| 38298 | 4a 7m | 08/12/2024 | U T I | **Sim** |
| 38424 | 10a 4m | 27/01/2025 | U T I | Não |
| 38870 | 1m 2d | 09/01/2025 | U T I | **Sim** |
| 39043 | 1a 1m | 15/02/2025 | U T I | Não |
| 39263 | 4a 10m | 18/03/2025 | U T I | Não |

**Letalidade por grupo:** cardiopatia congênita **4/52 (7,7%)** · sem cardiopatia congênita **13/147 (8,8%)**.

> Com n=50 eu havia apontado uma diferença (11% contra 19%) sugerindo que a cardiopatia congênita não era o que matava. Com n=200 **as duas taxas convergem e a diferença desaparece**. Era flutuação de amostra pequena. A leitura que se sustenta é mais simples: nesta população a mortalidade acompanha a gravidade global do paciente, não a presença de cardiopatia.

**UTI e óbito:** **53 passaram por UTI e 14 morreram — letalidade de 26%.** Três óbitos ocorreram sem passagem por UTI.

> ⚠️ Eu havia reportado 18 passagens por UTI e letalidade de 72%. Estava errado: contava a UTI pelo setor do `Inter`, que é o setor de **alta** — só entrava quem recebeu alta *da* UTI, ou seja, um recorte enviesado para óbito. Ver seção 4.

### Desfecho das 385 internações do biênio

| Desfecho | n | % |
|---|---|---|
| Alta | 206 | 54% |
| **Sem informação** | **140** | **36%** |
| Indeterminado | 21 | 5% |
| Óbito | 16 | 4% |
| Transferência | 2 | — |

> ⚠️ **36% das internações do biênio não têm desfecho conhecido.** A proporção é estável desde n=20 (era 31% aos 50) e não melhora com escala — é característica da fonte, não da amostra. São sobretudo passagens curtas por Observação e UIR, sem documento no `RALTA` e sem menção nas evoluções. Para a análise de desfecho dos 626, ou se recupera essa informação por outra via (AIH/SIH-SUS), ou ela entra como perda declarada. **Não pode ser tratada como alta.**

O óbito continua vindo exclusivamente do texto das evoluções — nenhum dos 17 tinha registro no `RALTA`, porque em óbito não se escreve resumo de alta.

---

## 6. Análise comparativa temporal — biênio 2024–2025

| Período | Internações | Pacientes | Permanência mediana | Óbitos |
|---|---|---|---|---|
| 2024-S1 | 35 | 20 | 6.7 d | 1 |
| 2024-S2 | 163 | 126 | 9.4 d | 9 |
| 2025-S1 | 142 | 97 | 7.0 d | 5 |
| 2025-S2 | 45 | 26 | 7.5 d | 1 |

**A base temporal finalmente ficou utilizável.** Aos 20 prontuários, 2025-S1 tinha 1 paciente; aos 50, ainda 13 internações. Agora os quatro semestres têm entre 35 e 163 internações, com óbitos distribuídos ao longo do período.

> ⚠️ **Ainda não é uma série temporal válida — e o motivo não é o que eu supunha.** Eu vinha afirmando que o CSV está em ordem cronológica pela data do parecer. **Não está.**

### A estrutura real do arquivo: dois blocos concatenados

| | Pacientes | Evoluções | Período | Ordenação interna |
|---|---|---|---|---|
| **Bloco 1** (pos. 1–474) | 474 | 1.103 | 16/01/2024 a 30/12/2025 | 76% cronológica |
| **Bloco 2** (pos. 475–626) | 152 | 281 | 07/02/2024 a 13/08/2024 | 76% cronológica |

O bloco 2 **não acrescenta nenhum mês novo** — os 7 meses que ele cobre já estão no bloco 1. São pacientes adicionais do mesmo período, provavelmente de uma segunda extração. Isso explica por que nenhuma chave de ordenação testada (primeira evolução, última evolução, número do prontuário) fecha em 100%: o arquivo é a concatenação de duas listas, cada uma aproximadamente cronológica.

**Consequência prática:** os 200 primeiros caem todos no bloco 1 e concentram set/2024–abr/2025. O início de 2024 está majoritariamente no fim do arquivo — **os pacientes com parecer entre janeiro e maio de 2024 estão nas posições 451–626**.

### A produção de pareceres não é homogênea no biênio

Isso não é artefato de amostragem — é característica do serviço, e afeta qualquer denominador temporal:

| Período | Evoluções/mês |
|---|---|
| jan–abr/2024 | 20 a 37 |
| ago/2024 | 34 |
| demais meses | mediana de **65** |

Há três lacunas de uma semana ou mais sem nenhum registro: **28/03 a 16/04/2024 (19 dias)**, 21/03 a 01/04/2025 (11 dias) e 30/01 a 06/02/2024 (7 dias) — compatíveis com férias ou afastamento. O arquivo também começa só em **16/01/2024**: as duas primeiras semanas de janeiro não têm registro.

> **Para o objetivo 3:** contar internações por semestre sem ajustar pela produção de pareceres mistura "quantos cardiopatas houve" com "quanto a cardiologista trabalhou naquele mês". Se a comparação temporal for mantida, vale normalizar pelo número de pareceres emitidos, ou declarar os períodos de baixa produção.

---

## 7. Falhas e limitações da coleta

1. **Módulo `Inter` devolve HTTP 500 em prontuários muito longos** — 2 casos em 200 (34387 com 2.047 evoluções, 20969). O módulo embute as evoluções dentro de cada internação e a resposta estoura. Esses pacientes entram com demografia e evoluções, mas sem dados de internação. Marcados em `falha_modulo_internacoes`. Taxa de 1% — em 626 devem ser ~6 casos.
2. **Cadastro vazio nas duas fontes** — 1 caso (21640): CONSPAC e SAME retornam vazio, mas há 750 evoluções e nenhuma internação. Provável registro mesclado ou inativo. Marcado em `cadastro_indisponivel`.
3. **Internação em curso quebrava o parse da saída.** Quando não há data de saída, o regex capturava o rótulo seguinte ("Informações de Entrada do Paciente:") como se fosse data. Corrigido: só vale o que tem forma de data.
4. **Evoluções de UTI não usam o formato estruturado** — os casos graves concentram-se em UTI, e é justamente onde `hipotesesDiagnosticas` vem vazio. A triagem compensa parcialmente porque também varre o texto das notas da cardiopediatria.
5. **36% das internações sem desfecho** (seção 5) e **79% sem raça/cor** (seção 2).
6. **Dois bugs no detector de óbito, encontrados em auditoria e corrigidos:**
   - A detecção só rodava dentro do laço das internações. Quando o `Inter` falha (HTTP 500) o paciente não tem internação e nunca era avaliado — o **20969 morreu em 17/11/2025 e estava contado como vivo**. A busca agora roda também no nível do prontuário.
   - `preencho\s+DO` casava com "PREENCHO **DO**CUMENTOS" — o mesmo bug de fronteira de palavra do CIA/FARMÁCIA. Marcou óbito no **35727**, que recebeu alta e tem registro de ambulatório de egressos 4 meses depois. E marcou o **39043** pelo motivo errado e na data errada (o óbito real estava 7 dias adiante).
7. **Erro de digitação no prontuário derrota casamento exato.** O óbito do 39043 está escrito "**Constatato** óbito às 15:10h", sem o "d" — nenhum padrão pegava. O casamento passou a ser tolerante (`constat\w*`), com exclusão explícita de "risco de óbito".
8. **`reprocessar_obito.py`** reaplica a regra sobre os `raw_*.json` em cache, sem refazer a coleta no HICD. Use-o depois de qualquer mudança na detecção.
9. **Campo `profissional` engolindo a evolução inteira — corrigido.** Em 4 evoluções (de 43.294) o HICD entrega o registro sem a estrutura de colunas esperada: rótulo e texto caem na mesma célula. O fallback que eu havia criado para ler `Clinica: 019-HOSPITAL DIA` capturava tudo depois do primeiro `:` — num caso, 5.345 caracteres no campo do profissional, **com a descrição da evolução ficando vazia**. Limitei o fallback a 80 caracteres (nome de profissional ou setor não passa disso), e o efeito foi melhor que o esperado: o parser volta ao caminho normal e **recupera** essas evoluções, em vez de apenas evitar a corrupção. Restam ~25 evoluções com descrição vazia em 43 mil (0,06%), que são registros em branco na origem.

---

## 8. Ressalvas metodológicas

1. **101 dos 200 foram classificados automaticamente.** Auditei uma amostra aleatória de 30 desses casos, lendo as evoluções da cardiopediatria uma a uma: **nenhuma cardiopatia congênita perdida**. Somando às 21 da validação anterior, são 0 falsos negativos em 51 casos — mas pela regra de três o limite superior de 95% ainda é **~6%**, que em 626 prontuários seriam até 25 casos. Dois limítrofes que um revisor mais inclusivo classificaria de outro jeito: 39506 (prolapso leve de valva mitral) e 39355 (insuficiência mitral moderada).
2. **As 99 classificações manuais são leitura minha, sem segunda opinião.** Casos como o 38298 (estenose supravalvar pulmonar num eco de 2020, aceito como documentação) e o 17179 (TSV diagnosticada fora do HICD) dependem de julgamento clínico que pode divergir.
3. **A amostra não é só de cardiopatia congênita.** 52/200 têm cardiopatia congênita; 140 não têm nenhuma, e boa parte é rastreio que deu normal. O CSV são todos os pareceres da Dra. Vera.
4. **CID não serve de filtro isolado.** Entre os congênitos, a Tetralogia de Fallot entrou por R100 (abdome agudo), a ponte miocárdica por R074 (dor torácica), a coarctação por I25 e I50, a atresia tricúspide por I25. Filtrar por Q20–Q28 perderia boa parte dos casos.
5. **Óbito só aparece no texto das evoluções** — nunca no `RALTA`.
6. **Três decisões de critério** já fixadas e aplicadas: FOP isolado conta se documentado; anomalias coronarianas e distúrbios de condução contam; achado apenas referido em anamnese, sem exame, não conta (casos 38077, 1704, 39229).
7. **Momento do diagnóstico** usa corte de 1 ano de idade, inferido da narrativa.
8. **A ordem dos prontuários no CSV não é cronológica** (só 74% dos pares em ordem crescente) nem numérica nem aleatória — nenhuma chave testada a explica. Mas produz viés temporal na prática: os 200 primeiros concentram set/2024–abr/2025 e quase não cobrem o início de 2024 nem o segundo semestre de 2025. **A evolução mais antiga do arquivo é de 16/01/2024 (prontuário 35649, na posição 454)** — está fora dos 200.
9. **Comorbidades do grupo automático contêm ruído.** 12 dos 101 trazem medicamento ou sinal vital na lista ("SALBUTAMOL SPRAY 100MCG/JATO", "PA alvo: P50 96/55") e 19 estão vazias. O campo `hipotesesDiagnosticas` do HICD absorve essas linhas e o filtro não pega tudo. Use a coluna com cautela; para os congênitos, a leitura foi manual.
10. **Inconsistências de data na origem:** uma internação com saída anterior à entrada (17179: 31/03/2026 → 28/03/2026) e uma de 553 dias (25183). Um parecer escrito após a alta (38867).
