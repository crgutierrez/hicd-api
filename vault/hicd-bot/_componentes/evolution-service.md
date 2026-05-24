---
tags:
  - akita/componente/service
aliases:
  - EvolutionService
  - evolution-service
updated: 2026-05-21
tipo: service
camada: application
---

# evolution-service

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Orquestrar a busca de evoluções, exames, prescrições e resultados de exames de um paciente, fazendo chamadas HTTP ao HICD e delegando o parse ao [[hicd-parser]].

## Localização

`src/services/evolution-service.js`

## Contrato (entradas e saídas)

**getEvolucoes:**
```js
// Entrada
{ prontuario: number, limite?: number }
// Saída
[{ profissional, dataEvolucao, descricao, dadosEstruturados, ... }]
```

**getExames:**
```js
// Entrada
{ prontuario: number }
// Saída
[{ sigla, nome, resultado, vr, ... }]
```

**getPrescricoes:**
```js
// Entrada
{ prontuario: number }
// Saída
[{ medicamento, dose, frequencia, ... }]
```

**getResultadosExames:**
```js
// Entrada
{ prontuario: number }
// Saída
{ exames: [...], resultadosCompletos: [...] }
```

## Dependências

- [[http-client]] — HTTP POST `ParamModule=Evo`, `Exames`, `Prescricao`
- [[hicd-parser]] — delega parse do HTML
- [[04-variaveis-de-ambiente#REQUEST_DELAY|REQUEST_DELAY]]

## Edge Cases

### Entradas
- [ ] `prontuario` não-numérico
- [ ] `limite` zero ou negativo → usar padrão
- [ ] Paciente sem evoluções → retornar `[]`

### Estado / HICD
- [ ] Sessão expirada → re-login automático
- [ ] Timeout → propagar com contexto
- [ ] HTML de evolução vazio → `[]`
- [ ] `ParamModule=Exames` retorna HTML de `exame.php` diferente do esperado

### Parse
- [ ] Evolução sem `dadosEstruturados` extraíveis (texto livre médico) → `{}`, não erro
- [ ] Exame com VR em formato não-padrão (`"V.R     :"`) → ver [[_aprendizados/2026-03-01-exames-parser-vr]]

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** retorna evoluções para prontuário válido
- [ ] **Sem evoluções:** retorna `[]`
- [ ] **Com limite:** retorna no máximo N evoluções
- [ ] **Exames com VR variável:** todos os formatos de VR parseados
- [ ] **Sessão expirada durante getExames:** retry transparente
- [ ] **HTML inesperado:** retorna `[]`, não lança exceção

## Aprendizados relacionados

- [[_aprendizados/2026-03-01-evolucao-parser-newlines]]
- [[_aprendizados/2026-03-01-exames-parser-vr]]

---

## Notas relacionadas

- [[hicd-parser]]
- [[evolucao-parser]]
- [[exames-parser]]
- [[http-client]]
