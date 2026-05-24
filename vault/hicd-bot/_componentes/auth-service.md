---
tags:
  - akita/componente/service
aliases:
  - AuthService
  - auth-service
updated: 2026-05-21
tipo: service
camada: application
---

# auth-service

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Realizar login e logout no servidor HICD, com retry automático obrigatório. O primeiro login **sempre falha por design do servidor HICD** — o retry não é opcional.

## Localização

`src/services/auth-service.js`

## Contrato (entradas e saídas)

**Entrada:**
```js
// Credenciais vêm de process.env via config.js
// HICD_USERNAME, HICD_PASSWORD
```

**Saída:**
- Login bem-sucedido: session cookie mantido pelo [[http-client]]
- Falha após MAX_RETRIES: lança erro com detalhes

**Variáveis consumidas:**
- [[04-variaveis-de-ambiente#HICD_USERNAME|HICD_USERNAME]]
- [[04-variaveis-de-ambiente#HICD_PASSWORD|HICD_PASSWORD]]
- [[04-variaveis-de-ambiente#MAX_RETRIES|MAX_RETRIES]]

## Dependências

- [[http-client]] — para enviar o POST de login ao HICD

## Edge Cases

### Entradas
- [ ] Credenciais vazias / ausentes no `.env`
- [ ] Credenciais corretas mas sessão já ativa (re-login desnecessário)

### Comportamento do HICD
- [ ] **Primeira tentativa sempre retorna "erro" de login** — isso é normal, não um bug
- [ ] Segunda tentativa deve funcionar com as mesmas credenciais
- [ ] `MAX_RETRIES` esgotado sem sucesso → lançar erro descritivo
- [ ] Servidor HICD offline / timeout

### Estado
- [ ] Login chamado em paralelo (duas requests simultâneas antes da sessão estar pronta)
- [ ] Sessão expirada durante uso → re-login deve ser transparente

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** login bem-sucedido na segunda tentativa (retry funciona)
- [ ] **Primeira tentativa falha:** `login()` chama `loginUnico()` pelo menos 2x
- [ ] **MAX_RETRIES esgotado:** lança erro após N tentativas
- [ ] **Credenciais ausentes:** lança erro antes de tentar HTTP
- [ ] **Timeout no HICD:** propaga erro com contexto

## Aprendizados relacionados

- [[_aprendizados/2026-03-01-evolucao-parser-newlines]] — contexto: sessão válida mas parse falhando

---

## Notas relacionadas

- [[http-client]]
- [[shared-crawler]]
- [[04-variaveis-de-ambiente]]
