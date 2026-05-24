---
tags:
  - akita/hub
aliases:
  - CLAUDE
  - Contexto do Projeto
updated: 2026-05-21
projeto: hicd-bot
---

# 🧠 CLAUDE — Hub de Contexto · hicd-bot

> Ponto de entrada da wiki de contexto deste projeto. **Toda nova navegação começa aqui.** Se você é o Claude lendo isso, leia o hub inteiro antes de seguir para qualquer nota filha.

**Última atualização:** `2026-05-21`
**Mantenedor:** Cristiano Gutierrez

---

## 📐 Princípios que regem este vault

Antes de produzir qualquer output (código, sugestão, refatoração), o Claude deve estar ciente de:

- [[_principios-engenharia|Princípios de engenharia]] — DRY, KISS, YAGNI, SOLID, Fail Fast, Tell Don't Ask, Law of Demeter, Boy Scout Rule, componentização, separação de responsabilidades, linguagem como contrato.
- [[_padrao-tdd-edge-cases|Padrão TDD e Edge Cases]] — **obrigatório para qualquer código**: Red → Green → Refactor, edge cases listados **antes** da implementação.
- [[_padroes-de-teste|Padrões de teste]] — como estruturar os testes: AAA, Given-When-Then, Test Pyramid, Test Data Builder/Object Mother, Property-Based Testing, convenções deste projeto.

> [!warning] Regra inegociável
> Qualquer código sugerido pelo Claude consultando este vault **precisa** seguir o padrão TDD descrito em [[_padrao-tdd-edge-cases]], os padrões de teste em [[_padroes-de-teste]], **e** os princípios em [[_principios-engenharia]]. Em caso de conflito entre princípios, consulte a [[_principios-engenharia#Quando os princípios entram em conflito|tabela de prioridades]].

---

## 🗺️ Seções AKITA (1–8)

1. [[01-arquitetura|Visão geral da arquitetura]]
2. [[02-stack|Stack tecnológica completa]]
3. [[03-estrutura-diretorios|Estrutura de diretórios]]
4. [[04-variaveis-de-ambiente|Variáveis de ambiente]]
5. [[05-componentes|Definição de componentes]] → notas detalhadas em `_componentes/`
6. [[06-aprendizados|Instruções corretivas e aprendizados]] → notas em `_aprendizados/`
7. [[07-dominio|Histórias de usuário e domínio]]
8. [[08-infraestrutura|Infraestrutura e dependências]]

---

## 🔍 Como o Claude deve usar este vault

1. **Sempre comece pelo hub.** Não pule para uma nota filha sem ter passado por aqui.
2. **Respeite a fonte canônica.** Cada informação mora num lugar só:
   - Variáveis de ambiente → [[04-variaveis-de-ambiente]]
   - Glossário de domínio → [[07-dominio]]
   - Componentes → notas em `_componentes/`
   - Erros passados → notas em `_aprendizados/`
3. **Não duplique.** Se for descrever algo que já está em outra nota, **linke** em vez de copiar.
4. **TDD primeiro.** Antes de codar qualquer componente, abra `_componentes/<nome>.md` e leia `## Edge Cases` + `## Casos de teste sugeridos`.
5. **Em caso de conflito** entre o vault e o código real: **pergunte ao humano** antes de assumir.
6. **Sugira atualizações.** Quando aprender algo novo, sugira em qual nota deveria entrar.

---

## ⚠️ Quirks críticos — leia antes de tocar o código

> Armadilhas reais que já causaram bugs. Detalhes em [[06-aprendizados]].

- **Primeiro login sempre falha no HICD por design** — o `auth-service.js` faz retry automático. Nunca remova o retry.
- **`evolucao-parser.js`**: usar `.replace(/\s+/g, ' ')` colapsa `\n` em espaço — use `[^\S\n]+` para preservar quebras de linha.
- **`(?:\s+\w+)*` em regex** consome `\n\n1` de listas numeradas — use `(?:[^\S\n]+\w+)*`.
- **Labels do HICD**: "Clinica / Leito:" (sem acento, espaços ao redor do `/`) — normalizar com `_normalizarLabel()` antes de comparar.
- **Textos em CAIXA ALTA**: usar flag `'i'` em todos os `extrairValor` de `extrairDadosEstruturadosEvolucao`.

---

## 🧭 Navegação rápida

- Tags principais: `#akita/arquitetura`, `#akita/stack`, `#akita/componente`, `#akita/aprendizado`, `#akita/dominio`
- Para descobrir componentes: `#akita/componente/service`, `#akita/componente/controller`, `#akita/componente/parser`, `#akita/componente/model`
- Para encontrar lições aprendidas: `#akita/aprendizado`

---

> [!info] Este documento é vivo
> A cada erro corrigido, decisão arquitetural nova ou aprendizado, atualize a nota correspondente. Se faltar uma nota para o que precisa registrar, crie uma e linke a partir do hub.
