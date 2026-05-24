---
tags:
  - akita/componente/controller
aliases:
  - ClinicasController
  - clinicas-controller
updated: 2026-05-21
tipo: controller
camada: presentation
---

# clinicas-controller

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Handlers Express para endpoints de clínicas: listar todas as clínicas e listar pacientes de uma clínica específica.

## Localização

`api/controllers/clinicas.js`

## Contrato (entradas e saídas)

**listarClinicas:**
```
GET /api/clinicas
Authorization: <token>
→ 200: { clinicas: [{id, nome}] }
→ 401: token inválido
→ 500: erro de scraping
```

**listarPacientesClinica:**
```
GET /api/clinicas/:id/pacientes
Authorization: <token>
→ 200: { clinicaId, pacientes: [...] }
→ 401: token inválido
→ 404: clínica não encontrada
→ 500: erro de scraping
```

## Dependências

- [[shared-crawler]] — instância do crawler
- [[memory-cache]] — cache de respostas
- [[04-variaveis-de-ambiente#LOGIN_ENCRYPT_KEY|LOGIN_ENCRYPT_KEY]] — validação do token

## Edge Cases

### Autenticação
- [ ] Sem header `Authorization` → 401
- [ ] Token malformado → 401
- [ ] Token expirado → 401

### Parâmetros
- [ ] `:id` inválido / não-numérico → 400
- [ ] `:id` de clínica inexistente → 404

### Cache
- [ ] Segunda request idêntica usa cache → não chama o HICD
- [ ] Cache expirado → nova request ao HICD

### Erros
- [ ] HICD offline → 503, não 500
- [ ] Stack trace não vaza na resposta

## Casos de teste sugeridos (TDD)

- [ ] **Sem token:** 401
- [ ] **Clínica válida:** 200 com lista de pacientes
- [ ] **Clínica inexistente:** 404
- [ ] **Cache hit:** second request mais rápida, sem nova chamada ao HICD
- [ ] **HICD timeout:** 503 sem stack trace

---

## Notas relacionadas

- [[patient-service]]
- [[clinica-parser]]
- [[memory-cache]]
