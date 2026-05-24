---
tags:
  - akita/principios
  - akita/tdd
  - akita/testes
aliases:
  - Padrões de Teste
  - AAA
  - Given When Then
  - Test Pyramid
updated: 2026-05-21
---

# 🧪 Padrões de Teste

> Como **estruturar** os testes que [[_padrao-tdd-edge-cases]] exige.

[[CLAUDE|← voltar ao Hub]] · [[_padrao-tdd-edge-cases|← TDD e Edge Cases]]

---

## 1 · AAA — Arrange, Act, Assert

**Para que serve:** estrutura padrão de teste unitário.

```js
it('parseia profissional e data da evolução', () => {
  // arrange
  const html = '<div id="areaHistEvol">...</div>';

  // act
  const result = parser.parseEvolucoes(html);

  // assert
  expect(result[0].profissional).toBe('Dr. João Silva');
  expect(result[0].dataEvolucao).toBe('01/03/2026');
});
```

**Regras:**
- **Uma única ação** no bloco *act*.
- **Um `expect` principal** por teste sempre que possível.
- Sem lógica (`if`, loops) no *act*.

**Quando usar:** padrão **default** para testes unitários.

---

## 2 · Given-When-Then (BDD)

**Para que serve:** testes de integração e cenários de negócio.

```js
describe('Busca de evoluções', () => {
  it('Dado paciente com evoluções, Quando busca com limite=1, Então retorna só a mais recente', async () => {
    // Given
    const prontuario = 45012;
    // When
    const res = await api.get(`/api/pacientes/${prontuario}/evolucoes?limite=1`);
    // Then
    expect(res.status).toBe(200);
    expect(res.data.evolucoes).toHaveLength(1);
  });
});
```

**Quando usar:** testes de integração com API real ou chamada ao HICD.

---

## 3 · Test Pyramid

```
        /\
       /e2e\          ← 5%   — fluxo completo (login → busca → parse)
      /------\
     / integr.\       ← 25%  — API Express + parser juntos
    /----------\
   /   unit     \     ← 70%  — parsers e models isolados
  /--------------\
```

### Unit (70%)
- Sem rede, sem HICD.
- Parsers testados com HTML fixo salvo em fixtures.
- Rodam em ms.

### Integration (25%)
- Express + parsers juntos.
- Mock do HICDCrawler (retorna HTML fixture).
- Valida roteamento, autenticação, serialização.

### E2E (5%)
- Apenas para caminhos críticos: login → busca de paciente → parse de evolução.
- Requer `.env` com credenciais reais.

---

## 4 · Test Data Builder e Object Mother

**Para que serve:** evitar duplicação de setup de fixtures.

```js
// test/factories/html-fixtures.js
function htmlEvolucaoSimples(overrides = {}) {
  return `<div id="areaHistEvol">
    <div class="row">${overrides.profissional || 'Dr. Teste'}</div>
    ...
  </div>`;
}

function htmlEvolucaoUTI(overrides = {}) {
  return htmlEvolucaoSimples({
    profissional: 'UTI Médica',
    ...overrides,
    incluirDiurese: true,
    incluirBH: true,
  });
}
```

**Regra:** fixtures de HTML do HICD ficam em `test/fixtures/html/` — arquivos `.html` reais capturados do servidor, com dados anonimizados.

---

## 5 · Property-Based Testing

**Para que serve:** testar parsers com entradas aleatórias para encontrar edge cases inesperados.

Útil especialmente para:
- `limparTextoEvolucao` — propriedade: qualquer string sem `\n` entra, sem `\n` sai.
- `_normalizarLabel` — propriedade: idempotente (`normalizar(normalizar(x)) === normalizar(x)`).
- `fromParserData` — propriedade: nunca lança exceção para qualquer objeto JS.

Biblioteca sugerida: `fast-check`.

---

## 6 · Convenções deste projeto

### Localização dos testes

- **Unit:** ao lado do arquivo testado, sufixo `.test.js` (ex.: `evolucao-parser.test.js`).
- **Integration:** `test/integration/<nome>.test.js`.
- **Fixtures HTML:** `test/fixtures/html/<nome>.html`.
- **Factories:** `test/factories/<entidade>.factory.js`.

### Nomenclatura

- Nome do `it` descreve **comportamento**: `'retorna null quando campo ausente'`, não `'testa _extrairCampo'`.
- Em português (alinhado ao domínio).

### Mocks vs Stubs vs Fakes

| Tipo | Quando usar |
|------|-------------|
| **Stub** | Default — HICDCrawler retorna HTML fixo |
| **Fake** | `InMemoryCache` no lugar de `MemoryCache` real |
| **Mock** | Quando verificar que `auth-service.login()` foi chamado 2x é o comportamento testado |

### Anti-padrões a evitar

- Testar com HTML do HICD sem anonimizar dados de pacientes.
- Testes que dependem da ordem de execução.
- `expect(result).toBeTruthy()` como único assert.
- Pular edge case "o HICD nunca manda isso" — ele manda.

---

## Notas relacionadas

- [[_padrao-tdd-edge-cases]] — ciclo TDD e o quê testar
- [[_principios-engenharia]]
- [[05-componentes]]
- [[07-dominio]]
