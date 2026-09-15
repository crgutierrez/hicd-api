# Levantamento epidemiológico — Dra. Vera (Cardiopediatria) 2024–2025

**Lote de validação:** 3 primeiros prontuários do arquivo `docs/DRA_VERA_HICD_2024_2025.csv`
**Data de extração:** 10/09/2026 (reprocessado após a correção do teto de 400 evoluções)
**Base do CSV:** 1.384 evoluções · 626 prontuários únicos · 100% assinadas por VERA JOANA BECKER DE MELO E SILVA (tipo `CARDIOLOGISTA`)

**Método:** os *diagnósticos cardiológicos* saem das evoluções da própria Dra. Vera no CSV (campos `DX:` / `HD:` / conclusão do ecocardiodoppler). Os *outros diagnósticos* saem das evoluções completas do prontuário no HICD (todas as especialidades), campo `hipotesesDiagnosticas` + `diagnosticosAnteriores`.

**Reprodução:** `python3 scripts/epidemio_extract.py --n 3` (requer a API rodando).

---

## Registro 19764

**Identificação:** Joel Barbosa Duarte · M · DN 31/01/2012 (12 anos em 2024) · Porto Velho
**Evoluções da cardio no CSV:** 2 (19/08/2024 e 20/08/2024)
**Evoluções totais no HICD:** 57 (22/10/2018 → 05/09/2024) — histórico completo

### Diagnósticos cardiológicos
| Diagnóstico | Data | Origem |
|---|---|---|
| Distúrbio de condução do ramo direito (DCRD) ao ECG | 19/08/2024 | Evolução cardio — `DX:` |
| Ecocardiodoppler pediátrico **dentro do padrão de normalidade** (FEVE 67%; refluxo tricúspide discreto, gradiente sistólico VD–AD 17 mmHg; demais estruturas normais) | 20/08/2024 | Laudo ecocardio |
| Liberado para cirurgia sob anestesia geral — **ASA I** | 20/08/2024 | Conduta cardio |

> **Desfecho cardiológico:** sem cardiopatia estrutural. Alteração eletrocardiográfica isolada (DCRD), afastada lesão cardíaca direita ao eco.

### Outros diagnósticos
- Nódulo cervical volumoso à esquerda a esclarecer (3 meses de evolução) — hipóteses: **cisto branquial?**, **linfangioma?**, **lipoma**
- Adenomegalia retroauricular
- Pós-operatório de **exérese de tumor cervical** (04/09/2024)
- Punção do nódulo cervical para estudo do conteúdo (13/08/2024)
- Antecedente: internação em 2018 por edema em olho direito
- História familiar: pai com traço falciforme e policistos renais; história de câncer nas famílias materna e paterna

**Motivo do parecer cardiológico:** avaliação pré-operatória (risco cirúrgico) de exérese de tumor cervical, com ECG alterado.

---

## Registro 9702

**Identificação:** Daniel Leão de Oliveira · DN 05/01/2015 (9 anos e 6 meses em 2024) · Porto Velho
**Evoluções da cardio no CSV:** 1 (16/08/2024)
**Evoluções totais no HICD:** 525 (08/02/2019 → 26/04/2026) — histórico completo

### Diagnósticos cardiológicos
| Diagnóstico | Data | Origem |
|---|---|---|
| Ecocardiodoppler à beira do leito: **ausência de trombos intracavitários, em VCI e VCS**; FEVE 100%, boa função miocárdica → **dentro do padrão da normalidade** | 16/08/2024 | Evolução cardio |

> **Desfecho cardiológico:** sem cardiopatia estrutural e sem trombo intracavitário. O parecer foi solicitado para pesquisa de fonte embólica/trombo no contexto de trombose venosa profunda.

**Achados cardiovasculares registrados por outras equipes** (não pela cardiopediatria — classificar conforme o critério do estudo):
- **Trombose venosa profunda** de veia ilíaca, femoral comum e JSF à esquerda, crônica, em recanalização (13/08/2024, USG doppler; confirmada em 26/08/2024) — anticoagulação com enoxaparina a partir de 12/08/2024
- **Picos hipertensivos** (17/08/2024) — secundários a bexigoma; tratados com anlodipino 10 mg/dia (14/08/2024); **resolvidos após passagem de SVD**

### Outros diagnósticos
- **Megacólon congênito (Hirschsprung)** — anatomopatológico de 20/02/2023 confirmando aganglionose do reto
- PO de retossigmoidectomia + abaixamento de cólon (09/07/2024)
- **Abdome agudo obstrutivo — bridas (íleo paralítico)** (17/07/2024): laparotomia transversa infraumbilical + abdome congelado + lise de aderências + colostomia em alça + dreno de Penrose
- Choque com necessidade de noradrenalina (16–17/07/2024)
- Ventilação mecânica com extubação em 24/07/2024
- **Síndrome de abstinência + delirium** com agitação psicomotora e alucinações (avaliada pela neurologia em 28/07/2024) — resolvida em 09/08/2024
- Febre (31/07 a 02/08/2024) — múltiplos esquemas ATB: ceftriaxona + metronidazol, cefepime, piperacilina-tazobactam, clindamicina
- **Abscesso de hemiescroto esquerdo** (USG 09/08/2024 — edema de parede e coleção de 1,2 mL)
- **Distúrbio hidroeletrolítico** (hipomagnesemia, hipocalcemia) — corrigido em 16/08/2024
- **Bexigoma de repetição** com sinais indiretos de **refluxo vesicoureteral** (TC abdome 08/08/2024: bexiga com volume estimado 806 mL; USG RVU com doppler 15/08/2024)
- **ITU** (02/09/2024) — amoxicilina + clavulanato
- Dilatação do colédoco a esclarecer (cálculo?) + **pancreatite** (11/09/2024)
- Desnutrição/suporte: NPT prolongada com progressão de dieta
- Sintomas respiratórios em 14/01/2026 (já de alta da CIPE)
- Antecedentes: COVID-19 (2 episódios); conjuntivite (21/08/2024)

---

## Registro 36101

**Identificação:** Athos Gabriel de Oliveira Costa · M · DN 03/01/2024 · Candeias do Jamari–RO
**Evoluções da cardio no CSV:** 18 (24/02/2024 → 03/11/2025) — o mais seguido do lote
**Evoluções totais no HICD:** 621 (20/02/2024 → 09/11/2025) — histórico completo, cobrindo a internação índice

### Diagnósticos cardiológicos
| Diagnóstico | Data / evolução | Origem |
|---|---|---|
| **Miocardite pós-COVID-19** | HD inicial em 24/02/2024 | Evolução cardio — `HD:` |
| **Miocardiopatia dilatada pós-COVID-19** | consolidado a partir de 07/03/2024 | Laudos ecocardio |
| Aumento de câmaras esquerdas (AE e VE) — leve a moderado | 24/02/2024 e seguimento | Ecocardio |
| **Disfunção diastólica do VE** | 07/03/2024 → 21/01/2025 (normalizada) | Ecocardio |
| Insuficiência/refluxo mitral discreto | 24/02/2024; 03/11/2025 | Ecocardio |
| Coronárias normais · ausência de coarctação de aorta · ausência de vegetações | 24/02/2024 | Ecocardio |
| Taquicardia (sinusal?) — registrada pela pediatria | 18/08/2024 | Evolução pediatria |

**Exposição documentada:** **RT-PCR para COVID-19 em swab de orofaringe, 22/02/2024 — DETECTÁVEL/POSITIVO**. É a confirmação laboratorial que ancora o rótulo "pós-COVID" de toda a linha cardiológica deste paciente — dois dias antes da primeira avaliação da cardiopediatria.

**Seguimento da FEVE:** 88% (01/03/24) → 83% (07/03/24) → 73% (07/05/24) → 87% (20/08/24) → 75% (21/01/25) → 92% (06/03/25) → 87% (03/06/25) → 63% (24/06/25) → 84% (11/09/25) → 65% (03/11/25)

**Marcos do tratamento:**
- 24/02/2024 — carvedilol + furosemida + captopril
- 20/08/2024 — carvedilol 0,5 mg/kg/dia + espironolactona 2 mg/kg/dia
- 21/01/2025 — troca captopril → **enalapril** 0,5 mg/kg/dia
- 24/06/2025 — **alta cardiológica**; suspensas espironolactona e furosemida
- 11/09/2025 — eco **dentro do padrão da normalidade** → suspensos enalapril, carvedilol e espironolactona
- 03/11/2025 — reavaliação à beira leito após PCR: aumento leve de AE e moderado de VE, FEVE 65% → **retomados** espironolactona 1 mg/kg/dia e enalapril 0,5 mg/kg/dia, restrição hídrica

> **Desfecho cardiológico:** miocardiopatia dilatada pós-COVID com função sistólica preservada na maior parte do seguimento; normalização em 09/2025 seguida de nova dilatação de câmaras em 11/2025.

### Outros diagnósticos

**Internação índice — UTI, fevereiro/março de 2024**
- **COVID-19 confirmado** (RT-PCR 22/02/2024 positivo)
- Admitido na UTI proveniente da CIP/HICD, em O₂ suplementar sob Hood a 50%, com CVC em veia subclávia
- Quadro de apresentação: febre + gemência + irritabilidade + taquipneia + taquicardia + hipoatividade + vômitos
- **Sepse tardia?** — hipótese inicial (diferencial com pneumonia, ITU, meningite, massa de mediastino)
- **Laringite pós-extubação** (02/03/2024)
- **Atelectasia esquerda** (02/03/2024) — resolvida em 03/03/2024
- Tendência à hiperglicemia (27/02/2024)
- Risco leve de LPP (Braden Q 21 → 12)

**Achados congênitos / dismórficos**
- **Glaucoma congênito**
- **Teste do pezinho alterado** — pendente de repetição de exames
- **Alterações de quirodáctilos e pododáctilos** — sustentam a hipótese de síndrome genética levantada em 05/06/2025
- Investigação de síndrome genética (05/06/2025) · **TEA?** (02/06/2025)

**Neurológicos**
- Primeiras crises documentadas: **convulsão afebril** (16/08/2024) e **convulsão febril** (18/08/2024) — fenobarbital, com ajuste pela neuropediatria
- **Epilepsia de difícil controle** — hipótese de origem pós-COVID-19; escapes convulsivos de repetição
- **Síndrome de West?** (02/11/2025) · **ECNE — encefalopatia crônica não evolutiva** (03/11/2025)
- **Meningite** (11–12/12/2024) — **descartada por exames laboratoriais** em 13/12/2024
- Dúvida recorrente sobre **má aderência terapêutica** como causa dos escapes

**Infecciosos / respiratórios**
- Pneumonia bacteriana (aspirativa?) — 19/01/2025, resolvida em 28/01/2025
- **PAC** (viral? bacteriana?) — 06/2025; PAC de repetição
- **Pneumonia broncoaspirativa** (31/10/2025)
- **Sepse** + IRA pré-renal + anasarca + edema agudo de pulmão (18/06/2025) — resolvidos
- OMA (18/06/2025) · GECA (20/01/2025, superada; recidiva 23/10/2025) · febre a esclarecer de repetição

**Hematológicos / nutricionais**
- **Anemia** — moderada a grave (Hb 6,6 em 16/06/2025), transfusão de CH 10 mL/kg → Hb 10,5 em 17/06/2025
- **Desnutrição / baixo peso** com **Z-escore < −3** (14/12/2024) · alimentação inadequada (peso estacionado em 5,8–7 kg entre 08/2024 e 06/2025)

**Eventos graves**
- **PCR** na entrada da emergência em 02/11/2025 (cianótico; gasometria pH 7,03 / pCO₂ 50,3 / HCO₃ 14 / lactato 9,3), com broncoaspiração e hemorragia alveolar
- Queda da cama (31/10/2025)

**Sociais**
- **Suspeita de maus tratos** (06/06/2025) — acompanhamento pela assistência social
- **Vulnerabilidade social** (11/09/2025)

**A esclarecer**
- Alargamento de mediastino (timoma? artefato? tumor?) — 14/10/2025

---

## Limitações e pendências desta validação

1. ~~**Truncamento das evoluções do HICD em 400 registros.**~~ **Resolvido em 10/09/2026.** O teto era do módulo `ParamModule=Evo` do `controller.php`. O HICD expõe um segundo módulo, `ParamModule=Evolucao`, sem esse limite. Após a correção em `evolution-service.js` e `evolucao-parser.js`, os três prontuários passaram a vir completos: 57 (inalterado), **400 → 525** e **400 → 621**. O período recuperado do 36101 (fev–dez/2024) trouxe a confirmação do RT-PCR de COVID-19, o glaucoma congênito, as alterações de dáctilos e a primeira crise convulsiva — todos relevantes para o estudo.
2. **Inconsistência no 36101:** os laudos de ecocardio registram `Prematuridade: N`, mas a história patológica pregressa de 16/10/2025 registra "PREMATURA 6 M". Precisa de conferência.
3. **Critério de classificação a definir:** no 9702, TVP de ilíaca esquerda e picos hipertensivos são cardiovasculares mas foram conduzidos por pediatria/nefrologia, não pela cardiopediatria. Mesma dúvida para a taquicardia sinusal do 36101. Definir se entram como "diagnóstico cardiológico" ou como "outros".
4. **Ruído no parser de hipóteses diagnósticas.** O campo `hipotesesDiagnosticas` do HICD absorve linhas que não são diagnósticos (medicamentos, dietas, sinais vitais, escores de enfermagem, cabeçalhos como "# EXAMES COMPLEMENTARES"). A triagem nestes 3 casos foi manual; para escalar aos 626 prontuários será preciso uma regra de filtragem.
5. **Confirmar a ordem:** "3 primeiros" foi interpretado como ordem de aparição no CSV (19764, 9702, 36101), não ordem numérica nem cronológica.
