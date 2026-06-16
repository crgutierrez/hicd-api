---
tags:
  - hospital/hospital-de-base
hospital: Hospital de Base
host: hb-hospub.sesau.ro.gov.br
updated: 2026-06-16
---

# Hospital de Base — Wiki

Espaço separado do **Hospital de Base** (HB), acessado via host `hb-hospub.sesau.ro.gov.br`.
Distinto do vault do HICD (Hospital Infantil, host `hicd-hospub.sesau.ro.gov.br`).

[[CLAUDE|← Hub do projeto]]

---

## Setores monitorados

### UTI - NEONATAL (código 008)

> Mapeamento de leito: o campo `leito` da API vem genérico ("UTI - NEONATAL").
> O **número do leito** está codificado no sufixo do campo `cid` (`008.046-00NN`).
> Ex.: `008.046-0002` → leito 2; `008.046-0003` → leito 3.
> Validado em 16/06/2026: a evolução do paciente 575972 cita "leito 03 liberado".

Mapa atual dos leitos 1–8 (16/06/2026):

| Leito | Paciente | Prontuário |
|---|---|---|
| 1 | LEITO BLOQUEADO (N/S) | 527721 |
| 2 | [[DAVI OLIVEIRA DA CRUZ - 574779]] | 574779 |
| 3 | [[RN DE ARYORRAINE MICHELLY F OLIVEIRA - 575972]] | 575972 |
| 4 | _vazio_ | — |
| 5 | [[BEATRIZ EMANUELLE BRICIO DA SILVA - 575433]] | 575433 |
| 6 | [[RN DE MARTHA DE OLIVEIRA CORREIA G1 - 575984]] | 575984 |
| 7 | _vazio_ | — |
| 8 | [[LIAM DAVI DA SILVA BRAGA - 575986]] | 575986 |

Cada paciente tem nota de **Resumo de Evolução** e **Fluxograma de exames** em `Pacientes/`.
Visão consolidada: [[UTI Neonatal - Indice de Leitos]].

---

## Aprendizados relacionados

- [[2026-06-16-cid-suffix-leito-uti-neonatal]]
