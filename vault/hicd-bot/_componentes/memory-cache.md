---
tags:
  - akita/componente/infra
aliases:
  - MemoryCache
  - cache
updated: 2026-05-21
tipo: infra
camada: application
---

# memory-cache

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Cache in-memory singleton com TTL e cleanup automático. Evita requisições repetidas ao HICD para o mesmo dado dentro da janela de TTL.

## Localização

`api/utils/cache.js`

## Contrato (entradas e saídas)

```js
cache.get(key: string) → value | undefined
cache.set(key: string, value: any, ttlMs?: number) → void
cache.delete(key: string) → void
cache.clear() → void
cache.stats() → { size: number, keys: string[] }
```

**TTL padrão:** 10 minutos
**Cleanup automático:** a cada 5 minutos remove entradas expiradas

## Edge Cases

### Entradas
- [ ] `key` vazia (`""`) → comportamento definido (não deve crashar)
- [ ] `value` null / undefined → deve armazenar e retornar corretamente
- [ ] `ttlMs` zero ou negativo → expirar imediatamente

### Estado
- [ ] `get` em chave expirada → retornar `undefined` (não o valor antigo)
- [ ] `get` em chave inexistente → retornar `undefined`
- [ ] Cache com muitas entradas → cleanup periódico funciona
- [ ] Restart do processo → cache limpo (esperado — in-memory)

### Concorrência
- [ ] `set` e `get` simultâneos para a mesma chave → sem race condition em Node.js (event loop single-thread)

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** `set` seguido de `get` retorna o valor
- [ ] **TTL expirado:** `get` após TTL retorna `undefined`
- [ ] **Delete:** `get` após `delete` retorna `undefined`
- [ ] **Clear:** todas as chaves removidas
- [ ] **Stats:** retorna count correto

---

## Notas relacionadas

- [[shared-crawler]]
- [[08-infraestrutura#Cache]]
