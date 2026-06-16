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

| Leito | Paciente                                          | Prontuário |
| ----- | ------------------------------------------------- | ---------- |
| 2     | [[DAVI OLIVEIRA DA CRUZ - 574779]]                | 574779     |
| 3     | [[RN DE ARYORRAINE MICHELLY F OLIVEIRA - 575972]] | 575972     |

---

## Aprendizados relacionados

- [[2026-06-16-cid-suffix-leito-uti-neonatal]]
