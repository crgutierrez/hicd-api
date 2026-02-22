# PRD — HICD Bot: API REST de Dados do Prontuário Eletrônico

**Versão:** 1.0
**Data:** 2026-02-22
**Autor:** Cristiano
**Status:** Em desenvolvimento

---

## 1. Visão Geral

O **HICD Bot** é uma API REST que expõe dados do sistema de prontuário eletrônico HICD (hospedado em `hicd-hospub.sesau.ro.gov.br`, da SESAU-RO). O sistema HICD não oferece uma API pública — todos os dados são acessíveis apenas via interface web com autenticação por sessão. O HICD Bot resolve isso atuando como um intermediário: autentica no HICD, extrai dados via scraping de HTML, transforma em modelos estruturados e os serve via REST/JSON com cache.

O sistema é voltado para uso interno por profissionais de saúde e desenvolvedores de ferramentas clínicas no contexto do hospital público de Rondônia.

---

## 2. Problema

O sistema HICD é a fonte central de verdade para:
- Pacientes internados (leito, clínica, prontuário)
- Evoluções médicas e de enfermagem
- Resultados de exames laboratoriais
- Prescrições médicas

Porém, ele possui sérias limitações de integração:
- **Sem API**: Dados só são acessíveis via interface web proprietária.
- **Interface lenta e fragmentada**: Para obter uma visão clínica completa de um paciente, o profissional precisa navegar por múltiplas telas.
- **Sem suporte a automações**: Não é possível gerar relatórios, passagem de plantão automatizada, dashboards ou alertas a partir do sistema nativo.
- **Bug de autenticação conhecido**: A primeira requisição de login sempre falha, exigindo retry automático.

---

## 3. Objetivos

1. Prover uma **API REST documentada** que abstrai o scraping do HICD.
2. Permitir que ferramentas clínicas (passagem de plantão, dashboards, alertas) consumam dados estruturados de pacientes em tempo real.
3. Reduzir a latência percebida via **cache em memória** com TTL configurável.
4. Manter **modelos de dados ricos** que unam informações dispersas pelo sistema (cadastro + evoluções + exames + prescrições) em uma única resposta.

---

## 4. Usuários e Personas

| Persona | Necessidade Principal |
|---|---|
| **Desenvolvedor interno** | Consumir dados do HICD via API para construir ferramentas clínicas (passagem de plantão, dashboards) |
| **Médico/Residente** | Obter visão consolidada de um paciente (últimas evoluções, exames recentes, prescrição ativa) via ferramenta externa |
| **Enfermeiro** | Consultar lista de pacientes por clínica/leito com dados de internação |
| **Administrador do sistema** | Monitorar saúde da API, invalidar cache, verificar estatísticas |

---

## 5. Escopo Atual (v1)

### 5.1 Clínicas

| Endpoint | Descrição |
|---|---|
| `GET /api/clinicas` | Lista todas as clínicas disponíveis no HICD com cache de 10 minutos |
| `GET /api/clinicas/search?nome=<termo>` | Busca clínicas por nome (substring, case-insensitive) |
| `GET /api/clinicas/:id/pacientes` | Lista pacientes internados em uma clínica; suporta `formato=resumido\|completo\|detalhado` |
| `GET /api/clinicas/:id/stats` | Análise estatística da clínica (pacientes por diagnóstico, atividade profissional) |
| `GET /api/clinicas/:idClinica/pareceres` | Busca pareceres clínicos de todos os pacientes de uma clínica |

### 5.2 Pacientes

| Endpoint | Descrição |
|---|---|
| `GET /api/pacientes/search?prontuario=<n>` | Busca por número de prontuário |
| `GET /api/pacientes/search?nome=<texto>` | Busca por nome (retorna múltiplos resultados) |
| `GET /api/pacientes/search-leito?leito=<n>` | Busca pelo identificador de leito |
| `GET /api/pacientes/:prontuario` | Dados completos de cadastro do paciente |
| `GET /api/pacientes/:prontuario/evolucoes` | Histórico de evoluções médicas |
| `GET /api/pacientes/:prontuario/analise` | Análise clínica consolidada (cadastro + evoluções + exames) |
| `GET /api/pacientes/:prontuario/exames` | Requisições de exames e resultados laboratoriais |
| `GET /api/pacientes/:prontuario/prescricoes` | Prescrições médicas ativas |

**Query parameters suportados para evoluções:**
- `limite` — número máximo de evoluções (padrão: 1000)
- `formato` — `resumido`, `detalhado`, `clinico`

**Query parameters suportados para exames:**
- `formato` — `resumido`, `detalhado`, `resultados`
- `incluirResultados` — `true` | `false` (busca resultados completos via URLs de impressão)

### 5.3 Cache

| Endpoint | Descrição |
|---|---|
| `GET /api/cache/stats` | Estatísticas do cache (total, válidos, expirados, tamanho estimado) |
| `DELETE /api/cache/clear` | Limpa todo o cache |
| `DELETE /api/cache/invalidate/patient/:prontuario` | Invalida todos os dados em cache de um paciente |
| `DELETE /api/cache/invalidate/type/:type` | Invalida por tipo (`exames`, `evolucoes`, `prontuarios`, `prescricoes`) |
| `POST /api/cache/clean` | Remove apenas os itens expirados |

---

## 6. Arquitetura de Alto Nível

```
Cliente HTTP
    │
    ▼
Express (api-server.js)
    ├── Middleware: helmet, cors, morgan, rate-limit (100 req/60s por IP)
    ├── Routes: /api/clinicas, /api/pacientes, /api/cache
    │
    ▼
Controllers (clinicas.js, pacientes.js)
    ├── Cache Layer (MemoryCache — TTL 10 min)
    │
    ▼
HICDCrawler (hicd-crawler-refactored.js)  ← facade principal
    ├── AuthService       → login com retry (1ª requisição sempre falha no HICD)
    ├── PatientService    → lista de clínicas e pacientes
    ├── EvolutionService  → cadastro, evoluções, exames, prescrições
    ├── HICDParser        → fachada de parsers especializados (cheerio)
    │   ├── ClinicaParser
    │   ├── PacienteParser
    │   ├── EvolucaoParser
    │   ├── ExamesParser
    │   ├── PrescricaoParser
    │   └── ProntuarioParser
    ├── ClinicalDataExtractor → análise de texto livre de evoluções
    └── ClinicAnalyzer        → análise agregada por clínica
    │
    ▼
HICD (hicd-hospub.sesau.ro.gov.br)
    └── POST controller.php com Param + ParamModule
```

### Fluxo de dados

O HICD expõe tudo via um único endpoint `controller.php` com `Param` e `ParamModule` no corpo form-encoded. Cada tipo de dado usa uma combinação diferente:

| Dado | Param | ParamModule |
|---|---|---|
| Clínicas | `SIGHO` | `2904` |
| Pacientes por clínica | `SIGHO` | `544` |
| Cadastro do paciente | `REGE` | `CONSPAC_OPEN` |
| Evoluções | `REGE` | `Evo` |
| Exames | `REGE` | `Exames` |
| Prescrições (módulo) | — | `2751` |

---

## 7. Modelos de Dados

### Paciente
```
prontuario, nome, nomeMae, dataNascimento, idade, sexo,
documentos (CPF, CNS, BE),
endereco (logradouro, bairro, municipio, estado, CEP),
contatos (telefone),
internacao (codigoClinica, nomeClinica, numeroLeito, diasInternacao)
```

### Evolucao
```
id, pacienteId, dataEvolucao,
profissional, atividade, clinicaLeito,
conteudo.textoCompleto,
dadosClinicosEstruturados:
  hipotesesDiagnosticas[], medicamentos[], exames[],
  sinaisVitais{}, procedimentos[]
metadata: temDiagnostico, temMedicamentos, temSinaisVitais
```

### Exame
```
requisicaoId, data, hora, medico, clinica,
examesSolicitados[],
resultados[]: { sigla, valor, unidade, referencia, status },
status: { coletado, processado, liberado, temResultados },
agrupamentoPorTipo: hemograma | bioquimica | coagulacao | imunologia | outros
```

### Prescricao
```
id, codigo, dataHora, validaPara,
paciente (nome, peso, leito, CNS, dataInternacao),
medicamentos[]: { nome, dose, apresentacao, via, intervalo, naoPadronizado },
dietas[]: { descricao, tipo },
observacoes[]: { tipo, descricao, prioridade },
assinaturas[], medico (nome, CRM)
```

---

## 8. Requisitos Não-Funcionais

| Requisito | Valor Atual |
|---|---|
| Rate limit | 100 requisições / 60 segundos por IP |
| Cache TTL padrão | 10 minutos |
| Limpeza de cache expirado | A cada 5 minutos (automático) |
| Timeout de requisições ao HICD | 30 segundos |
| Delay entre requisições ao HICD | 1000ms (configurável via `REQUEST_DELAY`) |
| Max retries de autenticação | 3 (configurável via `MAX_RETRIES`) |
| Limite de payload JSON | 10 MB |
| Node.js mínimo | 14.0.0 |

---

## 9. Configuração

Via arquivo `.env` (não versionado):

```env
HICD_USERNAME=<usuario>
HICD_PASSWORD=<senha>
REQUEST_DELAY=1000
MAX_RETRIES=3
PORT=3000
HOST=localhost
```

---

## 10. Limitações Conhecidas

| Limitação | Impacto | Mitigação Atual |
|---|---|---|
| 1ª requisição de login sempre falha (bug HICD) | Toda inicialização leva 2s+ a mais | Retry automático com delay |
| Sessão não é persistida entre restarts | Cada reinício requer novo login | Lazy init no primeiro request |
| Crawlerinstanciado por singleton no controller | Múltiplos workers compartilhariam estado | Sem multi-worker atualmente |
| Cache em memória sem limite de tamanho | Possível leak em produção de alto volume | TTL + limpeza periódica |
| Resultados de exames exigem uma requisição HTTP por exam req. | Latência alta para pacientes com muitos exames | Delay de 500ms entre requisições para não sobrecarregar o HICD |
| CPF hardcoded como fallback na busca de evoluções (`74413201272`) | Pode retornar dados errados em edge cases | Investigar origem desse valor |
| Credenciais default no código (`cristiano`/`12345678`) | Risco se exposto | Deve ser sempre sobrescrito via `.env` |

---

## 11. Fora do Escopo (v1)

- Autenticação da própria API (atualmente sem token/JWT exigido; apenas Basic Auth opcional)
- Escrita de dados de volta ao HICD (apenas leitura)
- Persistência em banco de dados
- Multi-tenancy (suporte a múltiplas credenciais/hospitais)
- Frontend próprio consumindo esta API (existe um Angular em `hicd-frontend/` em desenvolvimento separado)

---

## 12. Dependências Externas

| Pacote | Uso |
|---|---|
| `axios` | HTTP client para scraping do HICD |
| `cheerio` | Parser de HTML (jQuery-like no servidor) |
| `express` | Framework web |
| `helmet` | Headers de segurança HTTP |
| `cors` | Cross-origin resource sharing |
| `morgan` | Logging de requests HTTP |
| `dotenv` | Carregamento de variáveis de ambiente |

---

## 13. Bugs Identificados

Bugs encontrados por inspeção estática do código. Organizados por severidade.

---

### 🔴 Críticos — causam crash ou corrupção silenciosa

#### BUG-001 · `res.json()` dentro de `cache.getOrSet` em `obterExamesPaciente`
**Arquivo:** `api/controllers/pacientes.js`

Dentro da função passada para `cache.getOrSet`, existem dois retornos antecipados que chamam `res.status(...).json(...)` diretamente (para 404 e 422). O problema é que `getOrSet` interpreta o retorno da função como *dado a ser cacheado*, não como resposta HTTP. Ao finalizar, o controller chama `res.json(...)` novamente para enviar o resultado cacheado — nesse ponto o response já foi enviado e o processo lança `ERR_HTTP_HEADERS_SENT`, derrubando o servidor com `uncaughtException` (já que `api-server.js` chama `process.exit(1)` nesse caso).

```js
// Dentro do cache.getOrSet(...) — ERRADO
return res.status(404).json({ ... });   // envia response e retorna o objeto res
return res.status(422).json({ ... });   // idem

// Depois, fora do getOrSet — lança headers already sent
res.json({ success: true, data: resultadoCache.data });
```

**Correção:** substituir os retornos antecipados por `throw new Error(...)` e tratar no `catch` externo.

---

#### BUG-002 · `parsePareceres` não existe em `EvolucaoParser`
**Arquivo:** `api/controllers/clinicas.js:320`

```js
crawler.parser.evolucaoParser.parsePareceres(evolucao.texto, { ... });
```

O método `parsePareceres` nunca foi implementado em `EvolucaoParser`. Qualquer chamada a `GET /api/clinicas/:id/pareceres` lança `TypeError: crawler.parser.evolucaoParser.parsePareceres is not a function`. Adicionalmente, `evolucao.texto` não é um campo existente no objeto evolução — o campo correto é `evolucao.textoCompleto`.

**Impacto:** endpoint `/pareceres` está completamente quebrado.

---

#### BUG-003 · `evolucao.texto` indefinido no `EvolucaoParser`
**Arquivo:** `src/parsers/evolucao-parser.js:101`

```js
evolucao.textoLimpo = this.originalParser.limparTextoEvolucao(evolucao.texto);
// evolucao.texto não existe; o campo é evolucao.textoCompleto (linha 90)
```

`limparTextoEvolucao` recebe `undefined`, retorna `''`. Em seguida, `extrairResumoEvolucao('')` também retorna `''`. Todas as evoluções são salvas com `textoLimpo = ''` e `resumo = ''`, silenciosamente.

---

#### BUG-004 · Typo `listData.leigo` em `Paciente.fromListData`
**Arquivo:** `api/models/Paciente.js:108`

```js
leito: listData.leigo,   // typo: "leigo" em vez de "leito"
```

O campo `leito` nunca é preenchido quando pacientes vêm de listagem por clínica via `fromListData`. O endpoint `GET /api/pacientes/search-leito` usa esse factory e retorna sempre `leito: null`.

---

### 🟠 Altos — dados incorretos ou perda de dados silenciosa

#### BUG-005 · Dietas inseridas em `medicamentos` no `PrescricaoParser`
**Arquivo:** `src/parsers/prescricao-parser.js:176`

```js
detalhes.dietas.push({ numero, descricao });           // correto
detalhes.medicamentos.push({ tipo: 'dieta', ... });    // ERRADO — linha extra
```

Cada dieta é adicionada corretamente em `detalhes.dietas` e também incorretamente em `detalhes.medicamentos`. Isso contamina a lista de medicamentos com entradas `{ tipo: 'dieta' }`, corrompendo agregações e contagens baseadas em `medicamentos[]`.

---

#### BUG-006 · `formato=detalhado` chama método inexistente em `listarPacientesClinica`
**Arquivo:** `api/controllers/clinicas.js:196`

```js
case 'detalhado':
    dadosFormatados = pacientes.map(p => p.toDetalhado ? p.toDetalhado() : p);
```

O modelo `Paciente` não tem método `toDetalhado()` — apenas `toResumo()` e `toCompleto()`. O operador ternário faz fallback para `p` (objeto bruto), retornando a instância interna da classe em vez de um POJO serializado. A serialização JSON pode expor propriedades inesperadas ou omitir campos importantes.

---

#### BUG-007 · `fromParserData` chamado sem `prontuario` em `listarPacientesClinica`
**Arquivo:** `api/controllers/clinicas.js:174`

```js
const dadosCompletos = await crawler.getPacienteCadastro(pacienteData.prontuario);
paciente = Paciente.fromParserData(dadosCompletos);   // sem o 2º argumento
```

`fromParserData(parserData, prontuario)` usa `prontuario` para popular `id` e como fallback de `dadosBasicos.prontuario`. Sem o argumento, `paciente.id` será `null` para todos os pacientes retornados em `formato=completo`.

---

#### BUG-008 · `dadosEstruturados` sobrescrito duas vezes em `EvolucaoParser`
**Arquivo:** `src/parsers/evolucao-parser.js:91,103`

```js
evolucao.dadosEstruturados = this.retornaEvolucaoDetalhada($, rowQuatro);  // linha 91
// ...
evolucao.dadosEstruturados = this.originalParser.extrairDadosEstruturadosEvolucao(evolucao.textoCompleto);  // linha 103
```

O resultado de `retornaEvolucaoDetalhada` (que faz parsing estruturado do HTML) é descartado e substituído pelo resultado do `originalParser`. Como `evolucao.texto` é undefined (BUG-003), o `originalParser` recebe texto vazio e retorna um objeto quase vazio, jogando fora os dados extraídos na linha 91.

---

### 🟡 Médios — confiabilidade e performance

#### BUG-009 · Busca por nome dispara requisições ilimitadas em paralelo
**Arquivo:** `api/controllers/pacientes.js:78`

```js
const pacientes = await Promise.all(pacientesRaw.map(async (p) => {
    const pac = await crawler.getPacienteCadastro(p.prontuario);
    ...
}));
```

Se a busca por nome retornar 50 pacientes, 50 requisições simultâneas são disparadas contra o HICD. O servidor HICD não tem rate limiting documentado, mas o próprio `HICDHttpClient` tem delay configurado de 1s entre requisições — que é completamente ignorado aqui. Isso pode resultar em bloqueio de sessão, timeouts em cascata ou dados parciais.

---

#### BUG-010 · `MemoryCache.getOrSet` sem mutex — duplicate fetches
**Arquivo:** `api/utils/cache.js`

Duas requisições simultâneas para o mesmo endpoint (cache miss) vão ambas executar a função async, fazer duas chamadas ao HICD, e a segunda vai sobrescrever o cache da primeira. Além da carga duplicada no HICD, se as duas chamadas retornarem resultados ligeiramente diferentes (por exemplo, evolução sendo salva durante o intervalo), o dado cacheado é não-determinístico.

---

#### BUG-011 · Race condition em `initCrawler()`
**Arquivo:** `api/controllers/clinicas.js:13`, `api/controllers/pacientes.js:13`

```js
async initCrawler() {
    if (!this.crawler) {
        this.crawler = new HICDCrawler();
        await this.crawler.login();   // assíncrono, não protegido por lock
    }
}
```

Duas requisições simultâneas antes da primeira inicialização podem ambas passar no `if (!this.crawler)` — a segunda antes da primeira terminar o `await login()`. Resultado: dois `HICDCrawler` instanciados, dois logins simultâneos, o segundo sobrescrevendo `this.crawler`. O primeiro crawler fica órfão consumindo sessão no HICD.

---

#### BUG-012 · Seletor com encoding sensível em `PrescricaoParser`
**Arquivo:** `src/parsers/prescricao-parser.js:216`

```js
extractSimple('label.valorV3:contains("SEDAçãO:")', 'Sedação', 'SEDAçãO:');
```

O seletor cheerio usa o literal `"SEDAçãO:"` com caractere Unicode `ã` (U+00E3). Se o HTML do HICD retornar essa string com encoding diferente (ex: ISO-8859-1 ou entidade HTML `&atilde;`), o seletor não encontrará nada e a sedação será silenciosamente omitida da prescrição.

---

### ⚪ Baixos — qualidade e manutenção

#### BUG-013 · Logs de debug em código de produção
| Arquivo | Linha | Conteúdo |
|---|---|---|
| `api/models/Exame.js` | 49 | `console.log(parserData)` — imprime todo o objeto cru em cada exame parseado |
| `src/parsers/evolucao-parser.js` | 92–93 | `console.log('Dados  extraídos:', evolucao); console.log(evolucao)` — duplicado |
| `api/controllers/clinicas.js` | 318–319 | `console.log('evolucao'); console.log(evolucao)` |

---

#### BUG-014 · Comentário divergente no `ClinicasController`
**Arquivo:** `api/controllers/clinicas.js:8`

```js
this.cacheTimeout = 10 * 60 * 1000; // 5 minutos
```

O valor é 10 minutos; o comentário diz 5. Menor impacto funcional, mas causa confusão ao ajustar TTL.

---

#### BUG-015 · `basicAuth` middleware importado mas nunca aplicado
**Arquivo:** `api-server.js:4`, `api/middleware/auth.js`

```js
const { requestLogger, rateLimit } = require('./api/middleware/auth');
// basicAuth e validateHeaders são exportados mas não importados nem usados
```

A API não exige qualquer autenticação. `basicAuth` existe mas está completamente fora da cadeia de middlewares. Qualquer cliente na rede pode chamar todos os endpoints sem credenciais.

---

#### BUG-016 · Variáveis declaradas e nunca usadas em `EvolucaoParser`
**Arquivo:** `src/parsers/evolucao-parser.js:70,77,78`

```js
const row = rows.eq(i);          // nunca usado (cabecalhoRow é idêntico)
const textoRow = rows.eq(i + 1); // nunca usado
const assinaturaRow = rows.eq(i + 2); // nunca usado
```

Resquício de refatoração incompleta. Não causa bug funcional mas indica que a lógica de chunking de 5 linhas pode não estar mapeando corretamente todas as colunas da estrutura HTML.

---

### Resumo

| Severidade | Quantidade | Endpoints Afetados |
|---|---|---|
| 🔴 Crítico | 4 | `/exames`, `/pareceres`, evoluções (resumo), busca por leito |
| 🟠 Alto | 4 | `/clinicas/:id/pacientes`, prescrições |
| 🟡 Médio | 4 | busca por nome, todos os endpoints (cache/concorrência) |
| ⚪ Baixo | 4 | qualidade geral |

---

## 14. Próximos Passos Sugeridos

1. **Autenticação da API**: Implementar JWT ou API key para proteger os endpoints antes de expor em rede.
2. **Persistência de sessão HICD**: Serializar cookies para disco para sobreviver a restarts sem novo login.
3. **Cache com limite de tamanho**: Implementar eviction policy (LRU) para evitar leak de memória.
4. **Webhook/Polling de evoluções novas**: Notificar consumidores quando novas evoluções forem detectadas para um paciente.
5. **Endpoint de passagem de plantão**: Endpoint dedicado que agrega os dados mais relevantes de todos os pacientes de uma clínica em um único response otimizado para o workflow de troca de turno.
6. **Tratamento do CPF hardcoded**: Investigar e parametrizar o CPF usado como fallback na busca de evoluções.
