---
tags:
  - akita/principios
aliases:
  - Princípios
  - DRY
  - SOLID
  - KISS
  - YAGNI
  - Fail Fast
  - Tell Don't Ask
  - Law of Demeter
updated: 2026-05-21
---

# 📐 Princípios de Engenharia

> Princípios não-negociáveis que regem o código deste projeto e qualquer sugestão do Claude consultando este vault. **Quando dois princípios conflitam, ver [[#Quando os princípios entram em conflito|tabela de prioridades]] no fim da nota.**

[[CLAUDE|← voltar ao Hub]]

---

## Índice

1. [[#1 · DRY — Don't Repeat Yourself|DRY]]
2. [[#2 · KISS — Keep It Simple, Stupid|KISS]]
3. [[#3 · YAGNI — You Aren't Gonna Need It|YAGNI]]
4. [[#4 · Componentização|Componentização]]
5. [[#5 · Separação de responsabilidades|Separação de responsabilidades]]
6. [[#6 · SOLID|SOLID]]
7. [[#7 · Fail Fast|Fail Fast]]
8. [[#8 · Tell Don't Ask|Tell, Don't Ask]]
9. [[#9 · Law of Demeter|Law of Demeter]]
10. [[#10 · Boy Scout Rule|Boy Scout Rule]]
11. [[#11 · TDD obrigatório para código|TDD]]
12. [[#12 · Linguagem como contrato|Linguagem como contrato]]
13. [[#Quando os princípios entram em conflito|Conflitos]]
14. [[#Checklist antes de mergear código|Checklist]]

---

## 1 · DRY — Don't Repeat Yourself

**Definição operacional:** se a mesma informação (constante, regra, fluxo) aparece em dois lugares e mudar em um exige mudar no outro, **é bug**.

Como aplicar:

- Constantes em **um** módulo de configuração; outras partes importam.
- Regras de negócio em **um** use case / serviço; nunca espalhadas em controllers.
- Validação em **um** schema reutilizado em todo lugar que precisa.

**Anti-padrões:**

- Copy-paste de bloco de validação entre dois endpoints — refatore para schema único.
- Mesma string mágica em vários arquivos — vire constante exportada.

> [!warning] DRY tem limite — ver [[#3 · YAGNI — You Aren't Gonna Need It|YAGNI]] e [[#2 · KISS — Keep It Simple, Stupid|KISS]]
> Duas coisas que **parecem** iguais hoje mas evoluem por motivos diferentes amanhã (acoplamento acidental) não devem ser unificadas. **Prefira duplicação a abstração errada.**

---

## 2 · KISS — Keep It Simple, Stupid

**Definição operacional:** a solução mais simples que resolve o problema **agora** é a correta. Complexidade tem que ser justificada, não simplicidade.

Como aplicar:

- Função de 5 linhas é melhor que classe com 3 métodos para um caso de uso pontual.
- `if/else` direto é melhor que strategy pattern com 2 estratégias.
- Síncrono é melhor que assíncrono quando não há ganho real.

> [!info] KISS vs DRY
> Quando refatorar para DRY exigir abstração complexa, **KISS vence**. Duplicação simples > unificação complicada.

---

## 3 · YAGNI — You Aren't Gonna Need It

**Definição operacional:** não construa para necessidades futuras hipotéticas. Construa para o que existe **agora**, e refatore quando a necessidade aparecer de verdade.

Como aplicar:

- Sem campo, parâmetro, hook, opção "para o futuro".
- Sem interface com uma única implementação.
- Sem suporte a múltiplos provedores quando só usamos um.

> [!warning] YAGNI vs Edge Cases
> YAGNI **não** dispensa edge cases de [[_padrao-tdd-edge-cases]]. Edge cases tratam de situações que **podem acontecer** com o código atual — não de features futuras hipotéticas.

---

## 4 · Componentização

**Definição operacional:** unidades pequenas, com **responsabilidade única**, **interface clara** e **substituíveis**.

Como aplicar:

- Cada **service**, **parser**, **model**, **controller** mora em arquivo próprio.
- Cada componente tem nota própria em `_componentes/`.
- Funções > 40 linhas são suspeitas.
- Módulos com > 5 dependências no topo são suspeitos.

---

## 5 · Separação de responsabilidades

Camadas que **não** podem se misturar:

| Camada | Responsabilidade | Não pode |
|--------|------------------|----------|
| Core (infra) | HTTP client, cookies, rate limit | Conter regra de negócio |
| Services (application) | Casos de uso: auth, patient, evolution | Fazer parse de HTML direto |
| Parsers (adapters) | HTML → objetos JS | Fazer chamadas HTTP |
| Models (entidades/DTOs) | Estrutura de dados + serialização | Fazer chamadas HTTP ou parse |
| Controllers (presentation) | Parsing de request, autorização, resposta | Conter regra de negócio |

> [!warning] Regra de ouro
> Dependências apontam **só para dentro**: controllers → services → parsers/core.

---

## 6 · SOLID

### S — Single Responsibility Principle

> Uma classe/módulo tem **uma razão para mudar**.

- `EvolutionService` só orquestra busca de evoluções — não faz parse.
- `EvolucaoParser` só faz parse — não faz HTTP.

### O — Open/Closed Principle

> Aberto para **extensão**, fechado para **modificação**.

- Novos campos extraídos de evoluções → adicionar método no parser, não modificar o existente.

### L — Liskov Substitution Principle

> Subtipos devem ser **substituíveis** pelos seus tipos base sem quebrar quem usa.

### I — Interface Segregation Principle

> Muitas interfaces pequenas e específicas > uma interface gigante.

### D — Dependency Inversion Principle

> Dependa de **abstrações**, não de implementações.

- `HICDParser` como fachada — controllers e services dependem dela, não dos parsers específicos.

---

## 7 · Fail Fast

**Definição operacional:** detectar e sinalizar problemas o **mais cedo possível**, no ponto de entrada.

Como aplicar:

- Validar parâmetros de rota/query no controller antes de passar adiante.
- Lançar exceção imediatamente em pré-condições violadas.
- Não usar valores sentinela (`null`, `""`) para sinalizar erro.

> [!info] Aplicação prática no HICD-bot
> Se o prontuário vier inválido (não-numérico), rejeitar no controller — não deixar chegar ao crawler.

---

## 8 · Tell, Don't Ask

**Definição operacional:** em vez de **pedir** dados do objeto para decidir fora, **diga** ao objeto o que fazer.

Como aplicar em JavaScript:

- Models (`Paciente`, `Evolucao`, `Exame`) têm métodos `toCompleto()`, `toResumo()`, `toDadosClinicos()`.
- Quem usa o model pede uma **serialização**, não inspeciona campos para montar JSON.

---

## 9 · Law of Demeter

> "Não fale com estranhos." Fale apenas com vizinhos diretos.

Como aplicar:

- Cadeias longas (`a.b().c().d()`) são sinal de violação.
- Se você precisa de algo aninhado, peça ao objeto direto que entregue.

---

## 10 · Boy Scout Rule

> "Deixe o acampamento mais limpo do que encontrou."

Ao tocar um arquivo, deixe-o **um pouco melhor**. Um nome melhor, uma regex documentada, um TODO resolvido.

---

## 11 · TDD obrigatório para código

Ver [[_padrao-tdd-edge-cases]] para o detalhamento completo. Em resumo:

- Edge cases **listados antes** da implementação (na nota do componente).
- Teste falho **antes** do código de produção (Red).
- Implementação **mínima** para passar (Green).
- Refatoração **só com testes verdes** (Refactor).

---

## 12 · Linguagem como contrato

- Termos de domínio têm definição única em [[07-dominio]].
- Nomes de funções, classes e variáveis usam os termos do domínio.
- Se aparecer um termo novo no código, **adicione ao glossário antes de mergear**.

---

## Quando os princípios entram em conflito

| Conflito | Quem vence | Por quê |
|----------|------------|---------|
| DRY vs KISS | **KISS** | Duplicação simples é mais barata que abstração ruim. |
| DRY vs YAGNI | **YAGNI** | Não unifique até a segunda ocorrência aparecer **de verdade**. |
| OCP vs YAGNI | **YAGNI** | Não abra para extensão antes da segunda variação existir. |
| Componentização vs KISS | **KISS para código pequeno**, **componentização para código que cresce** | |
| Fail Fast vs UX | **Fail Fast no backend**, **mensagens amigáveis na borda** | |

Em caso de dúvida real: **escreva o código mais simples que funciona, com testes, e refatore quando a dor aparecer**.

---

## Checklist antes de mergear código

- [ ] **DRY:** nenhuma duplicação acidental introduzida (mas sem abstração prematura).
- [ ] **KISS:** a solução é a mais simples que resolve o problema atual?
- [ ] **YAGNI:** não há código "para o futuro" sem usuário hoje?
- [ ] **Componentização:** cada arquivo novo tem **uma** responsabilidade?
- [ ] **Separação:** camadas respeitadas?
- [ ] **Fail Fast:** input validado na borda; estado inválido nunca propaga?
- [ ] **TDD:** testes precederam o código; edge cases cobertos?
- [ ] **Linguagem:** nomes vêm do glossário; termos novos adicionados em [[07-dominio]]?
- [ ] **Vault atualizado:** notas em `_componentes/` refletem mudanças; se houve erro de IA, foi registrado em `_aprendizados/`.

---

## Notas relacionadas

- [[_padrao-tdd-edge-cases]] — ciclo TDD e checklist de edge cases por tipo de componente
- [[_padroes-de-teste]] — como estruturar os testes
- [[01-arquitetura]]
- [[05-componentes]]
- [[07-dominio]]
