---
name: recuperar-exames
description: Recupera os exames laboratoriais de um paciente da API HICD e PERSISTE os dados brutos porém organizados (por data e por tema clínico) em output/exames/<prontuario>.json, reaproveitando o que já foi recuperado para não re-requisitar. Ativa quando o usuário pede para "recuperar/buscar/baixar os exames do paciente", "armazenar/gravar os exames", "carregar exames do prontuário N", ou quando outra tarefa (fluxograma, análise de exames) precisa dos dados de exames e eles ainda não estão em cache.
---

# Recuperar Exames — Busca + Persistência Organizada

## Propósito

Buscar os exames de um paciente **uma única vez** na API HICD e gravar localmente em
`output/exames/<prontuario>.json` os dados **brutos porém organizados** (por data e por
tema clínico). Em chamadas seguintes, **reusar o arquivo** em vez de bater na API.

**Princípios:**
- Nunca inventar valores, datas ou resultados — apenas o que a API retorna.
- Não re-requisitar dados já recuperados (cache com TTL).
- `output/` é gitignored — dados de paciente **não** são commitados.

---

## Pré-requisitos

1. API no ar: `npm run api` (porta 3000).
2. Sessão logada: `POST /api/auth/login` feito **uma vez** (a sessão é mantida pelo
   crawler singleton no servidor; não há auth por requisição).
   - Para gerar o payload, ver `CLAUDE.md` §4 ou a memória do projeto.
3. `openpyxl` instalado apenas se for gerar fluxograma depois
   (`pip install --break-system-packages openpyxl`).

---

## Passo a Passo

### Passo 1 — Identificar o prontuário

Obter o prontuário do contexto da conversa, do vault, ou pedindo ao usuário.
Se o usuário informar **leito** (ex.: "leito 3 da UTI Neonatal"), resolver o prontuário
primeiro — atenção: na UTI Neonatal o nº do leito está no **sufixo do `cid`**
(`008.046-00NN`), não no campo `leito`. Ver aprendizado `2026-06-16-cid-suffix-leito-uti-neonatal`.

### Passo 2 — Recuperar e persistir (com reuso automático)

Rodar o helper a partir da raiz do repositório:

```bash
python3 scripts/exames_store.py <prontuario> --nome "<NOME>" --leito "<LEITO>"
```

- Se já existe `output/exames/<prontuario>.json` dentro do TTL (12h padrão), imprime
  `HIT ...` e **não** chama a API.
- Senão, busca em `/api/pacientes/<prontuario>/exames?formato=resultados&incluirResultados=true`,
  organiza e grava (`MISS ...`).
- Para forçar nova busca: acrescentar `--force`.
- Outras flags: `--base-url`, `--cache-dir`, `--ttl-hours`.

### Passo 3 — Ler os dados organizados

O arquivo `output/exames/<prontuario>.json` contém:

| Chave | Conteúdo |
|---|---|
| `meta` | prontuario, nome, leito, fetchedAt, totalRequisicoes, `datas[]` |
| `porData` | `{ "DD/MM": { SIGLA: valor_sanitizado } }` — grade data×sigla |
| `porTema` | grupos clínicos (Hemograma, Eletrólitos, Hepática, Lipidograma, …) com `{rotulo, sigla, valores}` |
| `bruto` | requisições originais da API, intactas (nunca re-requisitar) |

Os valores já vêm **sanitizados** (TTPA → `49,00s / INR 1,53`, tipagem → `O POSITIVO`,
"exame não realizado", sem boilerplate "Liberado por…").

### Passo 4 — Encaminhar para o consumidor

- **Fluxograma (planilha):** `python3 scripts/fluxograma_exames.py output/exames/<prontuario>.json --nome "<NOME>" --leito "<LEITO>" --out docs/fluxograma-<id>.xlsx --md /tmp/fluxo.md`
  (o `fluxograma_exames.py` lê tanto a resposta crua da API quanto este cache via a chave `bruto`).
- **Análise clínica:** passar `porData`/`porTema` para a skill [[exames]].

---

## Regras de Conduta

- Sempre tentar **HIT** antes de buscar; só usar `--force` quando o usuário pedir dados atualizados.
- Não duplicar lógica de organização/sanitização — ela vive em `scripts/exames_store.py`
  e `scripts/fluxograma_exames.py` (mapa de temas `GRUPOS` + `limpa()`).
- Se a API estiver fora do ar ou não logada, avisar o usuário e parar (não inventar dados).
- Mapa sigla→tema e regras (diferencial em `_VR`, VR não retornado, sorologias vêm da
  evolução) documentados no aprendizado `2026-06-16-fluxograma-exames-planilha-xlsx`.

---

## Entrada Aceita

```
/recuperar-exames 574779
/recuperar-exames leito 3 da uti neonatal
recuperar os exames do DAVI (574779) e gravar
```
