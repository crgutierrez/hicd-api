---
tags:
  - akita/componente/infra
aliases:
  - HICDHttpClient
  - http-client
updated: 2026-05-21
tipo: infra
camada: core
---

# http-client

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Wrapper sobre Axios que mantém o cookie de sessão do HICD entre requests e aplica rate limiting configurável via [[04-variaveis-de-ambiente#REQUEST_DELAY|REQUEST_DELAY]].

## Localização

`src/core/http-client.js`

## Contrato (entradas e saídas)

**post:**
```js
// Entrada
{
  url: string,
  params: { ParamModule: string, [key: string]: string }
}

// Saída
{ data: string }  // HTML da resposta HICD
```

## Dependências

- `axios` — HTTP client
- [[04-variaveis-de-ambiente#REQUEST_DELAY|REQUEST_DELAY]] — ms entre requests

## Edge Cases

### Rede / HICD
- [ ] Timeout (`ETIMEDOUT`, `ECONNRESET`) → lançar erro descritivo
- [ ] HICD retorna 500 → lançar com status code
- [ ] HICD retorna HTML de erro (não o esperado) → propagar HTML para o parser detectar
- [ ] Rate limit atingido (HICD bloqueia por muitas requests) → `REQUEST_DELAY` deve prevenir

### Sessão
- [ ] Cookie expirado → o http-client não detecta (responsabilidade do auth-service detectar via HTML de response)
- [ ] Primeira request sem cookie → deve funcionar para o endpoint de login

### Concorrência
- [ ] Múltiplas requests simultâneas respeitam o `REQUEST_DELAY`

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** POST bem-sucedido retorna HTML
- [ ] **Timeout:** lança erro com contexto
- [ ] **REQUEST_DELAY respeitado:** segunda request não dispara antes de N ms
- [ ] **Cookie preservado:** header Cookie enviado após login bem-sucedido

---

## Notas relacionadas

- [[auth-service]]
- [[04-variaveis-de-ambiente]]
