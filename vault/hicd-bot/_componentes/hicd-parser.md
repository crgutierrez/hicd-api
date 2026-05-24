---
tags:
  - akita/componente/parser
aliases:
  - HICDParser
  - hicd-parser
updated: 2026-05-21
tipo: parser (fachada)
camada: adapters
---

# hicd-parser (fachada)

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Fachada central de parsing: recebe o HTML bruto do HICD e delega aos parsers especializados conforme o tipo de dado. Ponto único de entrada de parsing para os services.

## Localização

`src/parsers/hicd-parser.js`

## Contrato (entradas e saídas)

```js
parser.parseClinicas(html) → [{id, nome}]
parser.parsePacientes(html) → [{prontuario, nome, leito, ...}]
parser.parseEvolucoes(html) → [{profissional, dataEvolucao, descricao, dadosEstruturados, ...}]
parser.parseExames(html) → [{sigla, nome, resultado, vr, ...}]
parser.parsePrescricao(html) → [{medicamento, dose, ...}]
```

## Dependências

- [[evolucao-parser]] — parsing de evoluções
- [[exames-parser]] — parsing de exames
- [[paciente-parser]] — parsing de pacientes
- [[clinica-parser]] — parsing de clínicas
- [[prescricao-parser]] — parsing de prescrições

## Edge Cases

### Entradas
- [ ] `html` null / `undefined` → retornar `[]` ou `{}`, não lançar exceção
- [ ] `html` vazio (`""`) → retornar `[]`
- [ ] `html` com estrutura inesperada (site HICD mudou) → retornar `[]` com log de warning

### Delegação
- [ ] Parser especializado lança exceção → fachada captura e loga, retorna `[]`

## Casos de teste sugeridos (TDD)

- [ ] **Caminho feliz:** delega corretamente para cada parser especializado
- [ ] **HTML null:** retorna `[]` sem exceção
- [ ] **Parser especializado falha:** fachada isola o erro

---

## Notas relacionadas

- [[evolucao-parser]]
- [[exames-parser]]
- [[paciente-parser]]
- [[clinica-parser]]
- [[prescricao-parser]]
