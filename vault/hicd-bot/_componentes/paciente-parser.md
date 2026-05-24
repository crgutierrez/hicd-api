---
tags:
  - akita/componente/parser
aliases:
  - PacienteParser
  - paciente-parser
updated: 2026-05-21
tipo: parser
camada: adapters
---

# paciente-parser

[[CLAUDE|← Hub]] · [[05-componentes|← Índice de componentes]]

---

## Responsabilidade

Converter o HTML de lista de pacientes ou cadastro individual em objetos de paciente. Usa **regex** (não cheerio) para melhor performance — é o parser mais chamado da aplicação.

## Localização

`src/parsers/paciente-parser.js`

## Contrato (entradas e saídas)

**Saída (lista):**
```js
[{
  prontuario: number,
  nome: string,          // decodificado de HTML entities
  leito: string,
  dataInternacao: string,
  diasInternacao: number
}]
```

**Saída (cadastro):**
```js
{
  prontuario, nome, dataNascimento, sexo, convenio,
  dataInternacao, diasInternacao, medico, diagnostico
}
```

## Dependências

- `he` ou decode manual de entidades HTML
- regex (não cheerio)

## Edge Cases

### Entidades HTML
- [ ] Nome com `&amp;` → decodificar para `&`
- [ ] Nome com `&lt;`, `&gt;` → decodificar
- [ ] Nome com comentários HTML `<!-- ... -->` → remover antes de parsear

### Campos
- [ ] `dataInternacao` ausente → `null`
- [ ] `diasInternacao` não-numérico → `null`
- [ ] `prontuario` não-numérico → ignorar registro ou lançar?
- [ ] Nome com acentos → preservar

### Estrutura
- [ ] HTML da lista vazio (clínica sem pacientes) → `[]`

## Casos de teste sugeridos (TDD)

- [ ] **Nome com `&amp;`:** decodificado corretamente
- [ ] **`dataInternacao` extraída:** não `undefined`
- [ ] **`diasInternacao` extraído:** número, não string
- [ ] **Lista vazia:** retorna `[]`
- [ ] **Múltiplos pacientes:** todos parseados

## Aprendizados relacionados

- [[_aprendizados/2026-03-01-paciente-parser-html-entities]]

---

## Notas relacionadas

- [[hicd-parser]]
- [[paciente-model]]
- [[patient-service]]
