---
tags:
  - akita/componente/infra
aliases:
  - SharedCrawler
  - shared-crawler
updated: 2026-05-21
tipo: infra
camada: application
---

# shared-crawler

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Singleton do HICDCrawler compartilhado por todos os controllers da API. Garante que existe apenas uma instância autenticada no HICD por processo, com lazy initialization (só autentica quando a primeira request chega).

## Localização

`api/shared-crawler.js`

## Contrato (entradas e saídas)

```js
// Função de inicialização lazy — chamada pelos controllers
async initCrawler(credentials) → HICDCrawler

// O crawler expõe os services
crawler.evolutionService
crawler.patientService
```

## Dependências

- [[auth-service]] — inicialização via login
- [[evolution-service]]
- [[patient-service]]
- [[memory-cache]] — para cache das respostas nos controllers

## Edge Cases

### Inicialização
- [ ] Primeira request chega antes do login completar (duas requests simultâneas no boot)
- [ ] Login falha na inicialização → request deve retornar 503, não travar
- [ ] Credenciais ausentes no `.env` → erro claro antes de tentar login

### Estado
- [ ] Sessão expira após inicialização → re-login deve ser transparente para os controllers
- [ ] Processo reiniciado → singleton recomeça do zero (esperado)

## Casos de teste sugeridos (TDD)

- [ ] **Lazy init:** crawler não autentica até a primeira chamada
- [ ] **Singleton:** `initCrawler()` chamado 2x retorna a mesma instância
- [ ] **Falha de login:** propaga erro com status 503

---

## Notas relacionadas

- [[auth-service]]
- [[memory-cache]]
