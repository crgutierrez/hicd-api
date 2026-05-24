---
tags:
  - akita/principios
  - akita/tdd
aliases:
  - TDD
  - Edge Cases
  - Red Green Refactor
updated: 2026-05-21
---

# 🧪 Padrão TDD e Edge Cases

> Padrão **obrigatório** para qualquer código produzido neste projeto. Vale para humanos e para o Claude.

[[CLAUDE|← voltar ao Hub]]

---

## O ciclo

```
1. RED      → escreva um teste que falha
2. GREEN    → escreva o mínimo de código para o teste passar
3. REFACTOR → melhore o código mantendo todos os testes verdes
```

Nenhuma linha de código de produção é escrita sem um teste falhando que a justifique.

---

## Antes de escrever o primeiro teste

Para cada componente novo o desenvolvedor (ou o Claude) **abre a nota do componente em `_componentes/<nome>.md`** e preenche **duas seções primeiro**:

1. `## Edge Cases` — lista de situações limítrofes e patológicas.
2. `## Casos de teste sugeridos (TDD)` — checklist de testes a escrever.

Só depois disso começa a codar.

> [!info] Por que documentar antes
> Pensar em edge cases dentro do editor de código é tarde. Documentar primeiro força raciocínio sobre o contrato do componente, evita bugs comuns e dá ao Claude (e ao próximo dev) um mapa do que importa testar.

---

## Cobertura mínima de edge cases

### Entradas

- Entrada nula / `undefined` / vazia.
- Tipo incorreto.
- Tamanho fora do esperado.
- Caracteres especiais (Unicode, emojis, HTML entities — relevante para dados do HICD).
- Valores nos limites (zero, negativos, máximo do tipo).

### Estado

- Recurso não existe (404).
- Recurso em estado inválido para a operação.
- Concorrência (race condition).

### Dependências externas (servidor HICD)

- Timeout.
- Resposta 5xx.
- HTML com estrutura inesperada (site do HICD pode mudar).
- Sessão expirada (precisa de re-login).
- Rate limit atingido.

### Idempotência e ordem

- Mesma operação chamada duas vezes (cache deve retornar o mesmo resultado).
- Retry após falha de login.

### Segurança e autorização

- Request sem `Authorization` header.
- Token inválido / expirado.
- Token de outro usuário.

---

## Banco de edge cases por tipo de componente

> Use como **checklist mínimo**, não como camisa de força.

### HTTP Controller

- [ ] 400 — parâmetro inválido (prontuário não-numérico, formato incorreto)
- [ ] 401 — sem token / token inválido / token expirado
- [ ] 404 — paciente/clínica não encontrado
- [ ] 500 — exceção não tratada não vaza stack trace nem credenciais
- [ ] Injeção de parâmetros via query string

### Service (application layer)

- [ ] Caminho feliz
- [ ] Falha de cada dependência (HICDCrawler, MemoryCache)
- [ ] Sessão HICD expirada → re-login automático
- [ ] Idempotência: chamado 2x, cache retorna o mesmo
- [ ] Rollback / limpeza em falha parcial

### Parser (adapter)

- [ ] HTML vazio / `null`
- [ ] HTML com estrutura diferente do esperado (site mudou)
- [ ] Entidades HTML não decodificadas (`&amp;`, `&lt;`, etc.)
- [ ] Texto em CAIXA ALTA (labels podem ser ALL CAPS no HICD)
- [ ] Campos opcionais ausentes → retornar `null`, não lançar erro
- [ ] Encoding / caracteres especiais (acentos, ç)
- [ ] Valores de referência com formato variável ("VR:", "V.R     :", "V.R.:")

### Model (entidade/DTO)

- [ ] `fromParserData(null)` → comportamento definido
- [ ] Campos opcionais ausentes no raw data
- [ ] `toCompleto()` vs `toResumo()` — não vazar dados sensíveis
- [ ] Serialização de datas — formato consistente

---

## Anti-padrões em testes

- Testes que testam o mock (`expect(mockParser.parse).toHaveBeenCalled()` como único `expect`).
- Testes acoplados à implementação (quebram em qualquer refactor sem mudança de comportamento).
- Teste gigante com 20 asserts.
- Pular edge case "porque raramente acontece" — é o que aparece em produção.

---

## Notas relacionadas

- [[_padroes-de-teste]] — como estruturar os testes
- [[_principios-engenharia]]
- [[05-componentes]] — cada componente lista seus casos de teste sugeridos
- [[06-aprendizados]] — bugs e alucinações já registrados (muitos são edge cases esquecidos)
