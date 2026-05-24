---
tags:
  - akita/dominio
aliases:
  - Domínio
  - Histórias de Usuário
  - Glossário
updated: 2026-05-21
---

# 07 · Histórias de Usuário e Domínio

[[CLAUDE|← voltar ao Hub]]

---

## Domínio

Sistema de **prontuário eletrônico hospitalar brasileiro (HICD)**. Usuários são profissionais de saúde (médicos, enfermeiros, gestores) que precisam acessar dados de pacientes internados.

O HICD-bot é uma camada de API sobre o HICD: realiza scraping do sistema legado e expõe dados estruturados via REST.

---

## Histórias de Usuário implementadas

### US-01 — Listar pacientes de uma clínica

> Como gestor, quero ver todos os pacientes internados numa clínica, para monitorar a ocupação.

- Endpoint: `GET /api/clinicas/:id/pacientes`
- Controller: [[_componentes/clinicas-controller]]

---

### US-02 — Buscar paciente por prontuário

> Como médico, quero buscar um paciente pelo número de prontuário para acessar seus dados rapidamente.

- Endpoint: `GET /api/pacientes/search?prontuario=N`
- Controller: [[_componentes/pacientes-controller]]

---

### US-03 — Buscar paciente por leito

> Como enfermeiro, quero encontrar o paciente de um leito específico.

- Endpoint: `GET /api/pacientes/search-leito?leito=N`
- Controller: [[_componentes/pacientes-controller]]
- Mapeamento de leitos: [[De-Para Leitos]]

---

### US-04 — Ver evoluções médicas

> Como médico, quero acessar o histórico de evoluções de um paciente, com opção de formato resumido ou clínico.

- Endpoint: `GET /api/pacientes/:prontuario/evolucoes?formato=detalhado|clinico|resumido&limite=N`
- Controller: [[_componentes/pacientes-controller]]
- Parser: [[_componentes/evolucao-parser]]

---

### US-05 — Ver exames laboratoriais

> Como médico, quero ver os exames de um paciente e seus resultados estruturados.

- Endpoint: `GET /api/pacientes/:prontuario/exames?incluirResultados=true`
- Controller: [[_componentes/pacientes-controller]]
- Parser: [[_componentes/exames-parser]]

---

### US-06 — Ver prescrições

> Como farmacêutico, quero ver a prescrição atual de um paciente.

- Endpoint: `GET /api/pacientes/:prontuario/prescricoes`
- Controller: [[_componentes/pacientes-controller]]

---

### US-07 — Análise clínica agregada

> Como médico, quero uma visão consolidada: dados do paciente + última evolução + exames recentes.

- Endpoint: `GET /api/pacientes/:prontuario/analise`
- Controller: [[_componentes/pacientes-controller]]

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Prontuário** | Identificador único numérico do paciente no HICD. Chave primária para todas as buscas. |
| **Clínica** | Unidade hospitalar (ex.: UTI, Gastroped, Pediatria). Tem um `id` e `nome` no HICD. |
| **Leito** | Identificador de cama dentro de uma clínica. Formato variável (ex.: "1A", "UTI-5"). |
| **Evolução** | Registro clínico cronológico feito por um profissional de saúde. Contém texto livre + dados estruturados. |
| **Dados estruturados** | Seções extraídas do texto da evolução: Hipóteses Diagnósticas, Exame Físico, Conduta, Diurese, BH 24h, Medicamentos em uso. |
| **Exame** | Resultado laboratorial ou de imagem associado ao paciente. Tem sigla, nome, resultado, valor de referência. |
| **VR** | "Valor de Referência" — intervalo normal para um exame. Formato variável no HTML do HICD. |
| **Prescrição** | Lista de medicamentos prescritos ao paciente com dose e horário. |
| **Atividade** | Campo do HICD que identifica o tipo de evolução (ex.: "Evolução Médica", "Evolução de Enfermagem"). |
| **BH 24h** | Balanço Hídrico de 24 horas — saldo entre entradas e saídas de líquidos. |
| **Diurese** | Volume de urina produzido, registrado em evoluções de UTI. |
| **HosPub** | Sistema de origem alternativo com numeração de leitos diferente do sistema informal. Ver [[De-Para Leitos]]. |
| **controller.php** | Endpoint do servidor HICD que recebe todas as requisições via POST com `ParamModule`. |
| **ParamModule** | Campo de POST que define qual módulo do HICD acessar: `Evo`, `Exames`, `Paciente`, `Prescricao`. |
| **Session cookie** | Cookie mantido pelo `http-client.js` para autenticação com o HICD. Expira após inatividade. |

---

## Regras de Negócio

1. **Autenticação**: API exige header `Authorization` com token AES-256-GCM ou sessão via `POST /api/auth/login`. Ver [[04-variaveis-de-ambiente#LOGIN_ENCRYPT_KEY]].
2. **Cache**: respostas são cacheadas 10 minutos para reduzir carga no HICD.
3. **Retry de login**: o primeiro login no HICD sempre falha — sistema faz retry automático. Ver [[_componentes/auth-service]].
4. **Rate limiting**: [[04-variaveis-de-ambiente#REQUEST_DELAY]] ms entre requisições para não sobrecarregar o HICD.
5. **Dados clínicos estruturados**: evoluções são parseadas para extrair seções específicas. Ver [[_componentes/evolucao-parser]].

---

## Notas relacionadas

- [[_componentes/evolucao-parser]] — extração de dadosEstruturados
- [[_componentes/exames-parser]] — parse de resultados
- [[De-Para Leitos]] — mapeamento de leitos HosPub → informal
- [[08-infraestrutura]]
