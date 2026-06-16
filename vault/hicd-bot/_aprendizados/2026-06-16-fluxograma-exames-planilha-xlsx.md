---
tags:
  - akita/aprendizado
updated: 2026-06-16
componente: scripts/fluxograma_exames.py
hospital: Hospital de Base
---

# 2026-06-16 · Geração do fluxograma de exames (planilha modelo UTI) + .xlsx

[[CLAUDE|← Hub]] · [[06-aprendizados|← Índice de aprendizados]] · [[Hospital de Base|← Wiki Hospital de Base]]

---

## Problema / contexto

"Fluxograma de exames" **não** é um diagrama (Mermaid). É a **planilha clássica de UTI**:
exames nas **linhas**, datas nas **colunas**, valores nas células (modelo em
`docs/fluxograma.webp` — Hospital João Paulo II). Primeira tentativa entregou um
diagrama Mermaid, o que estava errado.

## Solução

Gerar a partir do endpoint:
`GET /api/pacientes/:prontuario/exames?formato=resultados&incluirResultados=true`
(precisa de login na API). Script reutilizável: `scripts/fluxograma_exames.py`.

```bash
curl -s "http://localhost:3000/api/pacientes/574779/exames?formato=resultados&incluirResultados=true" -o /tmp/ex.json
python3 scripts/fluxograma_exames.py /tmp/ex.json \
  --nome "DAVI OLIVEIRA DA CRUZ" --leito "UTI Neonatal — 2" \
  --out docs/fluxograma-leito2-574779.xlsx --md /tmp/fluxo.md
```

Saídas: `.xlsx` (planilha editável, openpyxl) **e** tabela markdown (para nota no vault).

## Organização por TEMA (não só "modelo vs complementar")

Os exames fora do modelo padrão **entram na tabela agrupados pelo seu tema clínico**,
não num bloco separado de "complementares". O script usa `GRUPOS = [(tema, [(rótulo, sigla)])]`:

- **Hemograma**: HGB, HTO, RBC, VCM, HCM, CHCM, RDW, WBC, diferencial (BLAST/MIEL/META/BAST/SEGM/EOSI/BASO/LINF/**MONO**), PLT
- **Coagulação**: TAP, TTPA, RNI
- **Eletrólitos**: Na+/K+/CL- (SOD/POT/CLO), Mg/Ca/P, e variantes íon/gaso (SOI/POS/CLR)
- **Função renal**: URE, CRE
- **Hepática/pancreática**: TGO, TGP, GGT, FAL, BT/BD/BI, AMI, DHL (RESULTADO)
- **Proteínas**: PROT_TOT, ALBUMINA, GLOB
- **Lipidograma**: COL, **HDL**, RESULTADO_LD (LDL), COLESTEROL_V (VLDL), TRI
- **Enzimas musc./card.**: CPK, CMB (CKMB)
- **Marcadores infl./infecção**: PCR, PCA (procalcitonina), CRQ
- **Níveis séricos**: VAN (vancocinemia)
- **Gasometria**: PH/PO2/PCO2/HCO3/BE/SAO2, LAC
- **Imagem**: TRX (RX tórax), RAS (RX abdome), RAD, ABP · **Tipagem**: ABO/GCO/FRH · **Sorologias** (da evolução)

> Regra: ex. **monócitos → Hemograma**, **HDL → Lipidograma** (junto a colesterol/TG).

## Sanitização de células (blocos complexos)

Alguns resultados vêm como **texto cru multi-linha** (TTPA, tipagem, RX, "exame não realizado")
com boilerplate "Liberado por / Data do Cadastro / Impressa". Isso **quebra a tabela markdown**.
A função `limpa()` no script:
- corta tudo a partir de "Liberado por", "Data do Cadastro", "Impressa", "X X X X";
- TTPA → extrai tempo + INR (`49,00s / INR 1,53`);
- tipagem → exige a seta `Grupo Sanguineo--->` / `Fator Rh--->` (senão pega o "G" de "Grupo" do cabeçalho) → `O POSITIVO`;
- "EXAME NAO REAL..." → `não realizado`;
- colapsa `\n`, remove runs de setas `--->`, troca `|` por `/`, trunca ~48 chars.

## Mapeamento sigla (HICD) → linha do modelo

A parte não óbvia. Siglas do `exame.php`:

| Linha do modelo | Sigla | | Linha do modelo | Sigla |
|---|---|---|---|---|
| Hemoglobina | HGB | | Uréia | URE |
| Hematócrito | HTO | | Creatinina | CRE |
| Leucócitos | WBC | | TGO / TGP | TGO / TGP |
| Neutrófilos Bastões | BAST_VR (%) | | Bilirrubina T/D/I | BT / BD / BI |
| Neutrófilos Segmentados | SEGM_VR (%) | | Fosfatase Alcalina | FAL |
| Linfócitos | LINF_VR (%) | | Lactato | LAC |
| Plaquetas | PLT | | CPK / CKMB | CPK / CMB |
| Na+ / K+ / CL- | SOD / POT / CLO | | TAP / TTPA | TAP_TEMPO_DO_P / TTP |
| Mg+2 / Ca+2 / P | MAG / CAL / FOS | | | |

**Complementares** (relevantes, fora do modelo): `PCR`, `PCA` (procalcitonina),
`VAN` (vancocinemia), `ALBUMINA`, `PROT_TOT`, `GLOB`, `GGT`, lipídios (`COL/HDL/TRI`),
índices (`RBC/VCM/HCM/CHCM/RDW`), diferencial extra (`MONO_VR/EOSI_VR`).

## Como evitar / regras

> **Regra 1:** "fluxograma de exames" = planilha (linhas=exames, colunas=datas), não diagrama.
> **Regra 2:** o diferencial leucocitário usa o valor **relativo** (`*_VR`, em %), não o absoluto (`*_VA`).
> **Regra 3:** o HICD **não retorna VR** neste formato — não inventar faixas; valores são os absolutos reportados.
> **Regra 4:** sorologias (HIV/HBsAg/VDRL/Anti-HCV) não vêm do endpoint de exames — vêm do campo da evolução; marcar a origem.
> **Regra 5:** siglas sem linha no modelo → bloco "COMPLEMENTARES" (não descartar dado).

## Candidato a skill

Este fluxo é repetível — bom candidato a virar uma skill `/fluxograma-exames` (análoga à [[resumo-evolucao]]).
