# Histórias de Usuário e Domínio

## Contexto do Domínio

Sistema de prontuário eletrônico hospitalar brasileiro (**HICD**). Usuários são profissionais de saúde — médicos, enfermeiros e gestores — que precisam acessar dados de pacientes internados.

O HICD Bot expõe esses dados via REST API, eliminando a necessidade de navegar manualmente pela interface web do HICD.

---

## Histórias Implementadas

### US-01 — Listar pacientes de uma clínica
> Como **gestor**, quero ver todos os pacientes internados numa clínica para monitorar a ocupação.

- Endpoint: `GET /api/clinicas/:id/pacientes`
- Retorna: lista com nome, prontuário, leito, dias de internação

---

### US-02 — Buscar paciente por prontuário
> Como **médico**, quero buscar um paciente pelo número de prontuário para acessar seus dados rapidamente.

- Endpoint: `GET /api/pacientes/search?prontuario=N`
- Retorna: dados completos do paciente (`toCompleto()`)

---

### US-03 — Buscar paciente por leito
> Como **enfermeiro**, quero encontrar o paciente de um leito específico sem saber o prontuário.

- Endpoint: `GET /api/pacientes/search-leito?leito=N`
- Retorna: dados resumidos do paciente (`toResumo()`)

---

### US-04 — Ver evoluções médicas
> Como **médico**, quero acessar o histórico de evoluções de um paciente, com opções de formato.

- Endpoint: `GET /api/pacientes/:prontuario/evolucoes?formato=detalhado|clinico|resumido&limite=N`
- Formatos disponíveis:
  - `detalhado`: dados completos incluindo texto bruto e estruturado
  - `clinico`: dados clínicos extraídos (hipóteses, conduta, exame físico, medicamentos)
  - `resumido`: apenas cabeçalho (profissional, data, clínica/leito)

---

### US-05 — Ver exames laboratoriais
> Como **médico**, quero ver os exames de um paciente com resultados estruturados e valores de referência.

- Endpoint: `GET /api/pacientes/:prontuario/exames?formato=detalhado|resultados|resumido&incluirResultados=true`
- `incluirResultados=true`: busca os resultados detalhados (operação mais lenta — N+1 requests)

---

### US-06 — Ver prescrições
> Como **farmacêutico**, quero ver a prescrição atual de um paciente.

- Endpoint: `GET /api/pacientes/:prontuario/prescricoes`

---

### US-07 — Análise clínica agregada
> Como **médico**, quero uma visão consolidada: dados do paciente + última evolução + exames recentes em uma única chamada.

- Endpoint: `GET /api/pacientes/:prontuario/analise`
- Agrega: cadastro + evoluções + exames em paralelo

---

## Regras de Negócio

| Regra | Descrição |
|---|---|
| **Auth obrigatório** | API exige header `Authorization` com token AES-256-GCM |
| **Cache de 10 min** | Respostas cacheadas para reduzir carga no HICD |
| **Retry de login** | Primeiro login no HICD sempre falha — retry automático |
| **Rate limiting** | `REQUEST_DELAY` ms entre requisições ao HICD |
| **Dados estruturados** | Evoluções são parseadas para extrair: Hipóteses Diagnósticas, Exame Físico, Conduta, Diurese, BH 24h, Medicamentos em uso |
| **Busca por nome** | Busca na clínica 0 com filtro de nome; retorna lista com dados cadastrais |
