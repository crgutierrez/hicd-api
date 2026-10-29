# CLAUDE.md

Guia de referência para o Claude Code trabalhar neste repositório. Inclui arquitetura, stack, padrões, variáveis de ambiente, aprendizados e regras de negócio.

---

## 1. Visão Geral da Arquitetura

**Tipo**: Monorepo. Todo o código (crawler, API REST, frontend Angular) vive num único repositório.

**Divisão de serviços** (camadas independentes, não microsserviços):

```
┌─────────────────────────────────────────────────┐
│  Angular Frontend  (hicd-frontend/)             │  ← SPA (work in progress)
├─────────────────────────────────────────────────┤
│  REST API          (api/ + api-server.js)        │  ← Express, porta 3000
├─────────────────────────────────────────────────┤
│  Crawler Core      (src/ + hicd-crawler-refactored.js) │  ← scraping + parsing
├─────────────────────────────────────────────────┤
│  HICD Server externo (controller.php)           │  ← origem dos dados
└─────────────────────────────────────────────────┘
```

**Fluxo de dados**:
```
HTTP Request → Express Router → Controller
  → initCrawler() [lazy auth] → HICDCrawler
    → EvolutionService / PatientService
      → HICDHttpClient (POST controller.php)
        → HICDParser → Parser especializado (cheerio)
  → api/models/* (fromParserData) → JSON response
```

**Quirk crítico**: o HICD exige dois logins — o primeiro sempre falha por design. O `auth-service.js` faz retry automático.

---

## 2. Stack Tecnológica Completa

| Camada | Tecnologia | Versão / Notas |
|---|---|---|
| Runtime | Node.js | >= 14.0.0 |
| HTTP client (scraping) | Axios | ^1.6.0 — mantém cookies de sessão |
| HTML parsing | Cheerio | ^1.1.2 — jQuery-like server-side |
| API server | Express | ^4.18.2 |
| Segurança HTTP | Helmet | ^8.1.0 |
| Logging HTTP | Morgan | ^1.10.1 |
| CORS | cors | ^2.8.5 |
| Docs API | swagger-jsdoc + swagger-ui-express | ^6.2.8 / ^5.0.1 |
| Config | dotenv | ^16.3.1 |
| Dev reload | nodemon | ^3.0.1 |
| Frontend | Angular + PrimeNG | (hicd-frontend/ — WIP) |
| Auth token | AES-256-GCM (crypto nativo Node) | key em LOGIN_ENCRYPT_KEY |
| Cache | MemoryCache in-process | TTL 10 min, cleanup 5 min |

---

## 3. Estrutura de Diretórios

```
hicd-bot/
├── api/                        # REST API layer
│   ├── controllers/            # Request handlers (clinicas.js, pacientes.js)
│   ├── models/                 # Domain models (Paciente, Evolucao, Exame, Prescricao)
│   ├── routes/                 # Express route definitions
│   ├── utils/cache.js          # MemoryCache singleton
│   ├── shared-crawler.js       # Singleton HICDCrawler para toda a API
│   └── server.js               # Express app factory
├── src/                        # Crawler core (Clean Architecture informal)
│   ├── core/
│   │   └── http-client.js      # Infraestrutura: Axios + cookies + rate limit
│   ├── services/               # Casos de uso
│   │   ├── auth-service.js     # Login/logout com retry
│   │   ├── patient-service.js  # Lista de clínicas e pacientes
│   │   └── evolution-service.js# Evoluções, exames, cadastro, prescrições
│   ├── parsers/                # Adapters: HTML → objetos JS
│   │   ├── base-parser.js      # Classe base (todos os parsers estendem)
│   │   ├── hicd-parser.js      # Fachada — delega aos parsers especializados
│   │   ├── clinica-parser.js
│   │   ├── paciente-parser.js  # Usa regex (não cheerio) — mais rápido
│   │   ├── exames-parser.js
│   │   ├── evolucao-parser.js
│   │   ├── prontuario-parser.js
│   │   └── prescricao-parser.js
│   ├── extractors/
│   │   └── clinical-data-extractor.js  # Extração estruturada de dados clínicos
│   └── analyzers/
│       └── clinic-analyzer.js  # Estatísticas por clínica
├── hicd-crawler-refactored.js  # Entry point do crawler (usado pela API)
├── api-server.js               # Entry point da API (chama api/server.js)
├── hicd-frontend/              # Angular SPA (WIP)
│   └── src/app/
│       ├── clinics/
│       ├── patients/
│       ├── evolutions/
│       └── shared/
├── config.js                   # Configurações estáticas (URLs, timeouts, seletores)
├── .env                        # Credenciais (NÃO commitado)
├── output/                     # Arquivos de debug/saída (gitignored)
└── vault/hicd-bot/             # Wiki Obsidian deste projeto
```

**Padrão de organização**: Clean Architecture informal — `core` (infra), `services` (casos de uso), `parsers` (adapters), `models` (entidades/DTOs).

---

## 4. Variáveis de Ambiente

Arquivo `.env` (não commitado). Copiar de `.env.example`.

```env
# Host do servidor HICD (apenas hostname, sem https:// nem caminho).
# Default (quando ausente): hicd-hospub.sesau.ro.gov.br
HICD_HOST=hicd-hospub.sesau.ro.gov.br

# Credenciais HICD
HICD_USERNAME=seu_usuario
HICD_PASSWORD=sua_senha

# Comportamento do crawler
REQUEST_DELAY=1000        # ms entre requisições (evitar rate limiting)
MAX_RETRIES=3             # tentativas antes de desistir

# API
PORT=3000

# Auth token da API (AES-256-GCM, 32 bytes hex = 64 chars)
LOGIN_ENCRYPT_KEY=<hex-64-chars>
```

**Host configurável**: o host do HICD vem de `HICD_HOST` e é centralizado em `config.js`, que deriva `origin`, `auth.baseUrl`, `auth.loginUrl` e `auth.indexUrl`. Todos os pontos que precisam do host (`http-client.js`, `auth-service.js`, `patient-service.js`, `exames-parser.js`, `hicd-parser-original.js` e as URLs de prescrição em `hicd-crawler-refactored.js`) leem dali — **não** hardcode o host. Apenas o hostname é configurável; os caminhos (`/prontuario/frontend`, `/prescricao_medica3`, `/prontuario/generator/sadt`) assumem a mesma estrutura entre servidores.

**Gerar token de autorização para a API**:
```bash
node -e "
  require('dotenv').config();
  const c = require('crypto');
  const k = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
  const iv = c.randomBytes(12);
  const ci = c.createCipheriv('aes-256-gcm', k, iv);
  const e = Buffer.concat([ci.update('USER:PASS', 'utf8'), ci.final()]);
  const t = ci.getAuthTag();
  console.log(Buffer.concat([iv, t, e]).toString('base64'));
"
```

---

## 5. Definição de Componentes

### Controllers (`api/controllers/`)

| Controller | Métodos | Responsabilidade |
|---|---|---|
| `clinicas.js` | `listarClinicas`, `listarPacientesClinica` | Lista clínicas e pacientes por clínica |
| `pacientes.js` | `buscarPaciente`, `obterDetalhesPaciente`, `obterEvolucoesPaciente`, `obterAnaliseClinica`, `obterExamesPaciente`, `obterPrescricaoPaciente`, `buscarPacientePorLeito` | CRUD de pacientes e dados clínicos |

### Models (`api/models/`)

| Model | Factory | Serializadores |
|---|---|---|
| `Paciente` | `fromParserData(raw, prontuario)`, `fromListData(raw)` | `toCompleto()`, `toResumo()` |
| `Evolucao` | `fromParserData(raw)` | `toCompleto()`, `toResumo()`, `toDadosClinicos()` |
| `Exame` | `fromParserData(raw)`, `fromResultadosCompletos(raw)` | `toCompleto()`, `toResumo()`, `toResultados()` |
| `Prescricao` | via `getPrescricoesPaciente` | — |

### Services (`src/services/`)

| Service | Responsabilidade |
|---|---|
| `auth-service.js` | Login com retry (primeiro login sempre falha no HICD) |
| `patient-service.js` | `getPacientesClinica()`, `buscarPacientePorLeito()` |
| `evolution-service.js` | `getEvolucoes()`, `getExames()`, `getPrescricoes()`, `getResultadosExames()` |
| `internacao-service.js` | `getInternacoes()`, `getRelatoriosAlta()`, `getCatalogoSetores()`, `getCadastroSame()`, `getBoletinsEmergencia()`, `detectarObito()`, `resolverDesfecho()`, `derivarPercurso()` |

### Parsers (`src/parsers/`)

| Parser | Entrada | Saída |
|---|---|---|
| `clinica-parser.js` | HTML lista clínicas | `[{id, nome}]` |
| `paciente-parser.js` | HTML lista/cadastro paciente | `{prontuario, nome, dataInternacao, ...}` |
| `exames-parser.js` | HTML `exame.php` | `[{sigla, nome, resultado, vr, ...}]` |
| `evolucao-parser.js` | HTML `#areaHistEvol` | `{profissional, dataEvolucao, descricao, dadosEstruturados, ...}` |
| `prescricao-parser.js` | HTML prescrição | `[{medicamento, dose, ...}]` |
| `internacao-parser.js` | HTML `Inter`, `RALTA`, `SIINF/237` | `[{setorAlta, entrada, saida, cidEntrada}]`, relatórios tipados, catálogo de setores |
| `emergencia-parser.js` | HTML `EvolucaoBe`, `TRIAGEM` | `{motivo, cid, chegada}`, `{classificacaoRisco, queixa, sinais vitais}` |
| `cadastro-same-parser.js` | linha `pipe-delimited` do SAME | `{racaCor, deficiencia, municipioIbge, cns, ...}` |

### Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/clinicas` | Lista todas as clínicas |
| GET | `/api/clinicas/:id/pacientes` | Pacientes de uma clínica |
| GET | `/api/pacientes/search?prontuario=N` | Busca por prontuário |
| GET | `/api/pacientes/search?nome=X` | Busca por nome |
| GET | `/api/pacientes/search-leito?leito=N` | Busca por leito |
| GET | `/api/pacientes/:prontuario` | Detalhes completos |
| GET | `/api/pacientes/:prontuario/evolucoes?formato=detalhado\|clinico\|resumido&limite=N` | Evoluções |
| GET | `/api/pacientes/:prontuario/exames?formato=detalhado\|resultados\|resumido&incluirResultados=true` | Exames |
| GET | `/api/pacientes/:prontuario/prescricoes` | Prescrições |
| GET | `/api/pacientes/:prontuario/analise` | Análise clínica agregada |
| GET | `/api/pacientes/:prontuario/internacoes?desfecho=true\|false` | Internações com desfecho, óbito e porta de entrada |
| GET | `/api/pacientes/:prontuario/relatorios-alta` | Documentos do módulo RALTA, classificados por tipo |
| GET | `/api/pacientes/:prontuario/cadastro-same` | Raça/cor, deficiência, CNS e código IBGE |
| GET | `/api/pacientes/:prontuario/boletins-emergencia?limite=N` | BEs com motivo da entrada, CID e classificação de risco |
| GET | `/api/setores` | Catálogo completo de setores (29), não o censo vivo |
| GET | `/api/cache/stats` | Estatísticas do cache |
| DELETE | `/api/cache/clear` | Limpa o cache |

---

## 6. Instruções Corretivas e Aprendizados

> Registre aqui falhas da IA, alucinações e soluções. **Formato**: data · problema · causa · solução.

### 2026-10-29 — Lista de pacientes do HB tem uma coluna a mais: o leito caía no `cid`

- **Problema**: em `/api/clinicas/:id/pacientes` do HB, `leito` vinha `"UTI - NEONATAL"` para todos, o leito real (`008.046-0018`) aparecia em `cid` e a data de internação em `diasInternacao`. `/search-leito` não achava ninguém no HB.
- **Causa**: `paciente-parser.js` lia as colunas por **posição**. O HB acrescenta uma coluna **"Clínica"** antes do Leito (`Nome | Prontuário | Clínica | Leito | CID | Data Internação | Dias …`); no HICD ela não existe. Tudo deslocou uma casa. É o mesmo erro do parser de evoluções do HB, ao contrário: lá faltava uma linha, aqui sobra uma coluna.
- **Solução**: `mapearCabecalho()` lê os rótulos do cabeçalho (`<th>` no HB; primeira linha de `<td>` no HICD, com acentos como entidade HTML, que o `stripHtml` vira espaço — por isso `/interna/` e `cl.{0,3}nica`) e as linhas são lidas pelo rótulo. Sem cabeçalho reconhecível, cai na leitura por posição antiga. Novos campos: `leitoNumero` (`"18"`) e `clinicaNome`. HICD 007 sai idêntico ao anterior; HB 008 → 21/21 com leito correto. Testes em `test/lista-pacientes-colunas.test.js`.
- **Bug colateral, antigo**: `/search-leito` respondia **422 sempre**, em qualquer hospital — o serviço devolve uma lista e o controller a passava inteira ao `Paciente.fromListData`. E `[]` não é falsy, então o 404 nunca acontecia. Agora `data` é lista, com `total`.
- **Leito da prescrição ≠ leito atual**: o `enfLeito` da prescrição é o leito quando ela foi escrita. No 582019 a prescrição dizia `0460010` e a lista, 18 — com o leito 10 ocupado por outro paciente.
- **Regra**: já é a segunda vez que o HB difere em estrutura (linha de evolução, coluna de lista). Parser de tabela lê **pelo rótulo**, nunca pela posição.

### 2026-10-29 — API sem autenticação por requisição + login leniente valendo para todos

- **Problema**: no servidor exposto (`85.31.61.1:3000`), `GET /api/clinicas/008/pacientes` sem nenhum header devolvia o censo da UTI Neonatal do HB com nomes e prontuários. E, no mesmo servidor, `/evolucoes` do HB voltava vazio para **todo** paciente enquanto `/prescricoes` funcionava.
- **Causa 1**: `requireCrawler` fazia `if (isReady(host)) return next()` **antes** de olhar o `Authorization`. O token só era lido enquanto o crawler não tinha sessão; depois do primeiro login a API ficava aberta. `/api/cache/*` não tinha middleware nenhum e `/api/auth/status` dizia a qualquer um se havia sessão.
- **Causa 2**: `attemptLogin` aceitava `loginResponse.status === 200` como sucesso. O HICD recusa login com **HTTP 200 + `alert('Usuario Nao Existe (x)! ou Senha inválida')`**; o sucesso é só `<script>window.location='';</script>`. A sessão com usuário inválido ficava guardada para o host inteiro e, pela causa 1, nenhum token certo a substituía até reiniciar o container.
- **Solução**: o token é exigido e decifrado em **toda** requisição; a sessão só é reusada por quem apresenta as mesmas credenciais (`sharedCrawler.matches`, digest SHA-256 em tempo constante). Credencial diferente faz login e **só substitui a sessão se der certo** (`initCrawler` apagava a instância antes de tentar). `/api/cache` e `/api/auth/status` passaram a exigir token. `extrairErroLogin()` recusa a resposta com `alert(`. `getEvolucoes` lança `HICD_USUARIO_NAO_LOGADO` ao receber `Usuario nao esta logado` em vez de devolver `[]`. Testes em `test/auth-por-requisicao.test.js`; validado ao vivo no HB e no HICD.
- **Regra**: ausência de dado vinda de um módulo que exige mais permissão que os outros é sintoma de autenticação, não de paciente vazio — e um estado de login guardado por processo precisa ser conferido por requisição.

### 2026-10-15 — O HICD redesenhou o `imprime.php`: prescrição voltava sem medicamentos

- **Problema**: `/api/pacientes/:prontuario/prescricoes` devolvia `medicamentos: []` (e `dietas: []`, cabeçalho furado) em **todas** as prescrições — ex.: o 48755, cuja última prescrição tinha 8 medicamentos padronizados, 3 não padronizados, dieta e 7 cuidados gerais escritos no prontuário.
- **Causa**: o módulo de impressão de prescrição (`/prescricao_medica3/interface/imprime.php`) foi **redesenhado**. O `prescricao-parser.js` esperava o layout antigo — uma `<table border="1">` **por seção**, identificada pelo texto do elemento anterior conter "Medicação"+"LEGENDA". O HICD agora entrega **zero** tabelas `border="1"`: tudo está numa **única** `<table class="tabela-prescricao">`, com as seções delimitadas por linhas `<tr class="header-secao">` (DIETAS / MEDICAÇÃO / MEDICAÇÃO NÃO PADRONIZADA / CUIDADOS GERAIS). O seletor-âncora não casava com nada e o loop nunca entrava — ausência de estrutura lida como ausência de dado. Os rótulos do cabeçalho também mudaram: `REGISTRO/BE:`→`REG/BE:`, `INTERNADO EM:`→`INTERNADO:`, e a assinatura `MÉDICO:`→`PROFISSIONAL PRESCRITOR:`.
- **Solução**: `extrairSecoesLayoutNovo()` varre a `table.tabela-prescricao` mantendo a seção corrente (ditada pelas `tr.header-secao`) e despacha cada linha de dados para medicamentos/dietas/cuidados, **reusando** `extrairDadosMedicamento`/`extrairDadosMedicamentoNaoPadronizado` — o separador `,\xa0\xa0` (char 160) continua casando com `\s{2,}`, então a lógica de campos não mudou. O layout antigo (`table[border="1"]`) ficou como **fallback** quando `tabela-prescricao` não existe. Cabeçalho e assinatura passaram a aceitar os dois conjuntos de rótulos. Validado ao vivo: 48755 → 11 medicamentos; 26052 → prescrição só com cuidados gerais, 0 medicamentos (vazio correto, não regressão).
- **`textoMedicamento` continua a fonte de verdade** por medicamento — os campos parseados seguem best-effort (ver memória skill-prescricoes).

### 2026-10-15 — Hospital de Base (`hb-hospub`): grafia do host, credencial com espaço e login leniente

- **Host**: o HB é **`hb-hospub.sesau.ro.gov.br`** — resolve em DNS. A grafia invertida `hospub-hb.sesau.ro.gov.br` (que estava no `.env.hb`) **não resolve** (`ENOTFOUND`). `hicd-hospub.sesau.ro.gov.br` continua sendo o padrão. A allowlist em `config.js` lista `hb-hospub`; só esse (ou o `HICD_HOST` que subiu o servidor) é aceito no header `X-HICD-Host`.
- **Credencial**: o usuário do HB é **`cristiano sousa`** (com espaço), não `cristiano`. Com `cristiano` o login devolve `alert('Usuario Nao Existe (cristiano)!...')`.
- **Login leniente — a armadilha**: o `auth-service` marca `success: true` mesmo quando o HICD responde "Usuario Nao Existe", porque a verificação é frouxa. Pior: com só o cookie de sessão, **clínicas e prescrições retornam dados**, mas o módulo de evoluções (`Param=REGE`) exige usuário válido e responde **`Usuario nao esta logado`** (25 bytes) → **0 evoluções**. Logo: **`getEvolucoes` vazio enquanto prescrições funcionam é sintoma de credencial inválida**, não de parser nem de paciente sem evolução.
- **Rodar contra o HB**: instância dedicada — `set -a; source ./.env.hb; set +a; PORT=3001 node api-server.js` — e apontar o cliente/Hermes para `http://localhost:3001/api`. O token da API é o mesmo (criptografa só `usuário:senha`, host é ortogonal).

### 2026-10-15 — O HB serve um layout de evolução diferente: bloco sem a linha "Clinica:"

- **Problema**: no HB, `getEvolucoes` trazia os metadados (profissional, data, atividade) mas `descricao`/`textoLimpo`/`clinicaLeito` vinham **vazios em todas** as evoluções. No HICD o mesmo parser funciona.
- **Causa**: `evolucao-parser.js` localizava a descrição por **offset fixo** (`rowQuatro = i+3` a partir da linha `Profissional:`), o que embute a suposição de existir uma linha `Clinica:` em `i+2`. O HICD tem bloco de **5 linhas** (Profissional / Atividade / **Clinica** / Descrição / texto); o HB tem **4 linhas** (sem a `Clinica:`), então a `Descrição:` cai em **`i+2`** e o parser lia a linha errada. Não tem `#areaHistEvol` em nenhum dos dois no módulo `Evolucao`.
- **Solução**: trocar os offsets fixos por **busca do rótulo DENTRO do bloco** (de um `Profissional:` até o próximo) — `buscarNoBloco('Descrição:')`, `'Atividade:'`, `'Clínica:'`. Serve aos dois layouts e recupera também evoluções do HICD que porventura não tragam a linha `Clinica:` (que o offset fixo perdia em silêncio). Validado contra HTML real: HICD 48755 → 304/304 com descrição (sem regressão); HB 580265 → **0 → 112**.
- **Resquício**: no HB, `clinicaLeito` fica vazio nas evoluções (o layout não tem a linha `Clinica:`; o setor aparece como "Tipo: Internação"). Se precisar do setor no HB, derive de outra fonte (lista de pacientes / percurso do `Inter`).
- **Regra**: parser que depende de **posição fixa de linha/coluna** quebra quando outro servidor omite uma linha. Ancore por **rótulo dentro do bloco**, não por offset.

### 2026-09-16 — `registro` não é `prontuario`: o paciente fantasma 21640

- **Problema**: o prontuário `21640` entrou no dataset com **43 campos vazios** — sem sexo, idade, município, raça/cor ou desfecho — e ainda assim contava em `n=235`, classificado automaticamente como "sem cardiopatia".
- **Causa**: a coluna-chave do `docs/DRA_VERA_HICD_2024_2025.csv` chama-se **`registro`**, e ela vinha sendo passada direto para `--prontuarios` como se fosse o prontuário. Na maioria dos casos coincide (235 de 238 coletados; 14 de 15 numa amostra), mas no `21640` o `CONSPAC_OPEN` devolve resposta **vazia** (27 bytes). O pior é a assimetria: o módulo de evoluções **aceita** o número e devolve 750 evoluções, então a coleta parece ter funcionado e grava um `raw_*.json` mutilado, sem nenhum aviso.
- **Solução**: resolver o prontuário a partir do registro antes de coletar e **validar que `cadastro.dadosBasicos.nome` veio preenchido**. Sem nome, o registro é marcado como não resolvido e fica fora do denominador — nunca vira `raw_*.json`.
- **Testado e descartado**: **não existe `TIPOBUSCA=REG`** — devolve vazio. Os valores válidos são `PRONT` e `BE`. O `SSAME/pesq_Pront_Reg` devolve os 27 campos do cadastro mas **nenhum campo de prontuário** (o campo [2] é `00001` para todos). A busca por nome é `SSAME/pesq_Pront_Nome`.
- **Regra**: coleta que não confirma identidade do paciente é coleta falhada, não coleta parcial.

### 2026-09-14 — A triagem lia o marco amostral, não o prontuário

- **Problema**: duas cardiopatias congênitas **operadas** classificadas como "sem cardiopatia" — o 34990 (CIV de via de entrada corrigida, com Síndrome de Down) e o 39332 (ventriculoplastia com endocardite sobre o patch).
- **Causa**: `scripts/triagem_cardiopatia.py` varria as evoluções do `docs/DRA_VERA_HICD_2024_2025.csv` — o **marco amostral do estudo** —, não o prontuário. No 34990 a CIV está nas 20 evoluções da Dra. Luciana Nina, que não existem no CSV; a nota da Dra. Vera dizia só "pacth no septo interventricular". Segunda causa, independente: não havia termo para cardiopatia **corrigida**. No 39332 a conclusão do eco já estava transcrita na linha do CSV de classificação ("Pós Operatório de Ventriculoplastia e Endocardite no Patch") e ainda assim saiu `Não` — o dado estava lá, faltava a regra.
- **Solução**: a fonte primária passou a ser **todas as evoluções com `atividade = CARDIOLOGISTA`** do `raw_*.json`, de qualquer profissional, unidas ao CSV (que continua servindo a quem ainda não foi coletado). Saída ganhou a coluna `outros_cardiologistas`. Novo grupo de termos `cardiopatia operada`: `patch`/`pacth` junto de septo, `POT CIV`, `ventriculoplastia`, `atriosseptoplastia`, `valvoplastia`, `anel redutor`, `prótese valvar`. O `pa(?:tc|ct)h` existe porque o prontuário traz as duas grafias.
- **O `classificar_auto.py` passou a importar `fontes_do_prontuario` da triagem** em vez de reler o CSV — mesma lição do `reprocessar_obito.py`.
- **Texto boilerplate reescrito**: "sem qualquer achado registrado nas evoluções" afirmava ausência; agora diz "NÃO LIDO À MÃO — a varredura não encontrou (…) isto não afirma ausência de achado". 108 linhas automáticas refeitas.
- **Resultado**: 58 congênitas em 235 prontuários, sensibilidade 100% (58/58), nenhum falso negativo.
- **Limite que permanece**: para os prontuários **ainda não coletados**, a triagem cai de volta no CSV e volta a ser cega. A correção só vale depois da coleta.

### 2026-09-14 — "Óbito confirmado" não era óbito, e a cópia em Python desfez a correção

- **Problema**: um óbito de UTI (prontuário 38183, 8 meses, 112 dias internada) contado como "sem informação". A evolução dizia, com todas as letras: "Óbito confirmado 11h32. Informo a mãe. Emito atestado de óbito" — e a saída do `Inter` era 11:32 do mesmo dia.
- **Causa**: `OBITO_CONSTATADO` aceitava "óbito declarado" e "óbito constatado", mas não **"confirmado"**; aceitava "declaração de óbito", mas não **"atestado de óbito"**.
- **Solução**: os dois verbos entraram no padrão. Varredura dos 218 prontuários: 1 óbito novo, nenhum perdido. Mortalidade passou de 17 para 18 internações (18 → 19 pacientes).
- **O segundo bug foi pior**: rodar o `scripts/reprocessar_obito.py` logo depois **apagou** o óbito recém-detectado. Aquele script reescreveu a regex em Python, e a cópia velha sobrescreveu a nova. Regra duplicada em duas linguagens diverge — e divergiu na mesma sessão em que foi apontada. O script Python foi marcado como obsoleto; o `scripts/reprocessar_desfecho.js` passou a recalcular também o `obitoNoProntuario`, chamando o serviço em vez de reimplementar.
- **Regra**: scripts de reprocessamento **chamam o serviço**, nunca reescrevem a regra.

### 2026-09-14 — 40% de desfecho "sem informação" era falha de detecção, não dado faltante

- **Problema**: 230 das 566 internações (40,6%) sem desfecho, e só **2 transferências** no dataset inteiro — implausível num hospital que faz TFD aéreo de rotina.
- **Causa**: `resolverDesfecho()` só olhava o módulo RALTA e um padrão estreito de resumo de alta. Mas o HICD não obriga resumo: em metade dessas internações a alta está escrita na última evolução — às vezes o texto inteiro dela é `ALTA MEDICA`.
- **Solução**: passo 4 na precedência — desfecho declarado nas evoluções do **último dia** da internação (no máximo 6), com `confianca: 'média'`. Resultado: sem informação 40,6% → 21,9%, alta 50,7% → 68,4%, transferência 2 → 8. Nenhum óbito mudou (tem precedência). Reprocessamento sem recoletar: `node scripts/reprocessar_desfecho.js [--gravar]`, que chama o serviço em vez de reescrever a regex (o `reprocessar_obito.py` duplicou a regra em Python e as duas cópias podem divergir).
- **Por que só o último dia**: o prontuário recopia a admissão inteira todo dia; varrer a janela toda faz a história pregressa virar desfecho.
- **Quatro falsos positivos encontrados na validação à mão**, todos viraram regra:
  - **Alta de especialidade**: `ALTA CARDIOLÓGICA` no primeiro parecer da cardio, com o paciente internado mais 31 dias (35708). Removida do texto antes da busca — inclusive na forma `Neuropediatria- alta médica`.
  - **Narrativa de chegada**: "transferida para o Hospital Bom Pastor" é a HDA de como o paciente *chegou* (36170). O particípio `transferid[ao] para` saiu do padrão de transferência; só contam formas substantivas (`transferência para o hospital X`) e transporte/UTI aérea.
  - **Alta de outra internação**: "recebeu alta da UTI do SAMAR há 5 dias da admissão" (25183). O pretérito `recebeu alta` saiu do padrão.
  - **Passagem de equipe**: "alta da pediatria, aos cuidados da nefro" (14385) — segue internado.

### 2026-09-14 — Laudos de imagem não existem como módulo: o eco é uma evolução

- **Problema**: contagem de ecocardiogramas inflada em ~20× — um filtro textual devolveu 69 "laudos" para o prontuário 35649 onde havia 3 exames reais. E uma varredura por laudo de eco perdeu diagnósticos que não vêm do eco.
- **Causa**: o HICD não tem módulo de laudos de imagem. O ecocardiograma vive como **evolução** com `atividade = CARDIOLOGISTA`. Pior: a conclusão do parecer é **copiada e colada** nas evoluções diárias da pediatria e da nefrologia, então casar texto conta cada cópia como um laudo.
- **Solução**: filtrar por `profissional` (nome do cardiologista), nunca pelo texto. Três formatos coexistem: laudo formal (`LAUDO DE ECOCARDIODOPPLER PEDIÁTRICO` / `ECOCARDIOGRAMA BIDIMENSIONAL COM DOPPLER`, com `CONCLUSÃO:` e assinatura com CRM), eco à beira-leito (`PELA CARDIOPED / REALIZADO ECOCARDIODOPPLER AO LEITO`, sem laudo formal mas com diagnóstico) e parecer só clínico, sem eco nenhum.
- **Armadilhas relacionadas**: distúrbio de condução (bloqueio de ramo) é diagnosticado por **ECG**, com eco normal — quem varre só eco perde a categoria; o eco pode ser solicitado pelo HICD e **realizado no Hospital de Base**, mantendo o laudo do cardiologista do HICD.

### 2026-09-14 — Texto de triagem automática lido como se fosse leitura do prontuário

- **Problema**: três dos 19 pacientes de janeiro/2024 estavam descritos em `docs/classificacao_cardiologica.csv` como "sem laudo formal de ecocardiograma e sem qualquer achado" — e os três tinham ecocardiograma com achado, um deles laudo formal assinado por cardiologista.
- **Causa**: a frase é boilerplate emitida pelo `scripts/triagem_cardiopatia.py` quando ele não encontra os termos da sua lista. "Não achei" foi registrado com a redação de "não existe".
- **Solução**: linhas com `origem_classificacao = auto (triagem)` não são leitura do prontuário. Antes de afirmar ausência de achado, abrir as evoluções do cardiologista. Ao relatar números da amostra, declarar quantos prontuários não foram lidos à mão.

### 2026-09-14 — Teto de 400 evoluções: `Evo` vs `Evolucao`
- **Problema**: `getEvolucoes()` devolvia no máximo 400 evoluções por paciente, truncando o histórico antigo sem nenhum aviso.
- **Causa**: o teto é do `controller.php`, no módulo `ParamModule=Evo`. Não havia limite no nosso código.
- **Solução**: usar `ParamModule=Evolucao`, que não tem o teto (525 e 621 evoluções onde o `Evo` dava 400). Dois detalhes: ele exige **`TIPOBUSCA` em maiúsculo** (só com `tipoBusca` minúsculo devolve vazio), e não envolve as linhas no wrapper `#areaHistEvol` — o parser ganhou uma segunda estratégia que varre o documento inteiro. Blocos passaram a ser ancorados na linha `Profissional:` em vez de fatiados de 5 em 5.

### 2026-09-14 — Óbito só existe no texto das evoluções
- **Problema**: um levantamento de mortalidade reportou **0 óbitos** onde havia 17.
- **Causa**: o desfecho vinha do módulo `RALTA`. Quando o paciente morre ninguém escreve resumo de alta — o `RALTA` fica vazio **justamente nos óbitos**, e a ausência de documento estava sendo lida como ausência de óbito.
- **Solução**: `detectarObito()` varre o texto das evoluções. A precedência em `resolverDesfecho()` é: óbito em evolução → documento do RALTA → resumo de alta escrito como evolução → sem informação.
- **Armadilhas do detector**, todas encontradas em produção:
  - `preencho\s+DO` casava com "PREENCHO **DO**CUMENTOS" (falta de `\b`) — marcou óbito em paciente vivo.
  - O texto traz erro de digitação: "**Constatato** óbito às 15:10h". O padrão precisa ser `constat\w*`.
  - "risco de óbito" e "risco iminente de óbito" aparecem o tempo todo em paciente grave que sobrevive — exclusão explícita.
  - Óbito de terceiro ("mãe veio a óbito") precisa ser filtrado.
  - A detecção tem que rodar **também no nível do prontuário**: quando o módulo `Inter` falha não há internação a que prender o desfecho, e o óbito some.

### 2026-09-14 — O `setor` do módulo `Inter` é o de ALTA, não o de entrada
- **Problema**: contagem de "passagem por UTI" subestimada em 3× (18 contra 53 reais), com letalidade inflada de 26% para 72%.
- **Causa**: usávamos o campo `setor` do `Inter` como se fosse o setor de internação. Ele bate com o **último** setor das evoluções em 67% dos casos e com o primeiro em só 22%. Quem passa pela UTI e recebe alta da enfermaria aparecia só com a enfermaria.
- **Solução**: `derivarPercurso()` lê o `clinicaLeito` das evoluções. 56% das internações passam por 2+ setores (o recorde é 8). O campo do `Inter` foi renomeado para `setorAlta`.

### 2026-09-14 — Fronteira de palavra com acento quebra siglas
- **Problema**: "FARMÁCIA" era classificada como menção a **CIA** (comunicação interatrial).
- **Causa**: `(?<![a-z])cia(?![a-z])` parece correto e não é — em Python `[a-z]` é ASCII e não cobre "Á".
- **Solução**: fronteira que inclui acentuadas: `[a-zà-öø-ÿA-ZÀ-ÖØ-Þ]`. Outros falsos positivos do mesmo tipo: "Epstein-Barr" → Ebstein, "transfontanela" → Fontan.

### 2026-09-14 — `getClinicas()` é censo vivo, não catálogo
- **Problema**: internações em setores que "não existem".
- **Causa**: `getClinicas()` devolve só setores **com paciente internado no momento** — 25 dos 29. Faltam UIR 1, 2 e 3 (003–005) e o setor de teste (029), e as UIR respondem por internações reais.
- **Solução**: `getCatalogoSetores()` (`SIINF/237`) devolve os 29. A posição na lista é o código.
- **Cuidado extra**: o código **019** tem dois nomes ao mesmo tempo — "HOSPITAL DIA" nas evoluções, "OBSERVAÇÃO" no cadastro e no `Inter`, no mesmo período. **Agrupe por código, nunca por nome.**

### 2026-09-14 — Raça/cor e o cadastro do SAME
- **Problema**: conclusão precipitada de que o HICD não registra raça/cor.
- **Causa**: o campo não existe no cadastro do prontuário (`CONSPAC_OPEN`), que era o único consultado.
- **Solução**: está no cadastro do SAME — `Param=SSAME&ParamModule=pesq_Pront_Reg&pront=<registro>`, que devolve uma linha com 27 campos separados por `|`. Traz também deficiência, CNS, CPF e **código IBGE do município** (mais confiável que o nome em texto livre).
- **Ressalva de uso**: 79% dos 200 prontuários amostrados estavam com raça/cor "não informado". Meça a cobertura antes de usar em análise.

### 2026-09-14 — Boletim de Emergência (BE)
- **Descoberta**: o BE é a porta de entrada pela emergência, alcançável por `CONSPAC_OPEN` com `TIPOBUSCA=BE` e o número do BE em `PACIENTE`. Os números vêm do cadastro do prontuário (`getPacienteBE("...")` no HTML).
- **O que entrega**: `EvolucaoBe` dá motivo da entrada, CID e horário de chegada; `TRIAGEM` dá classificação de risco (Manchester), queixa e sinais vitais.
- **BE marca a chegada; `Inter` marca a internação** — defasagem mediana de 48 min (p75 = 1,5 h), com 97% dos BEs tendo internação correspondente em até 24 h.
- **Custo**: 2 requisições por BE, e pacientes com histórico longo têm 15–22 boletins. Triagem preenchida em só ~13%.

### 2026-09-14 — Fallback de coluna engolindo a evolução inteira
- **Problema**: 4 evoluções (de 43.294) com o campo `profissional` contendo até 5.345 caracteres e a `descricao` **vazia** — texto clínico perdido.
- **Causa**: o fallback criado para ler `Clinica: 019-HOSPITAL DIA` (rótulo e valor na mesma coluna) capturava tudo depois do primeiro `:` quando o HICD entrega a evolução sem a estrutura de colunas esperada.
- **Solução**: limitar o fallback a 80 caracteres. Efeito colateral positivo: o parser volta ao caminho normal e **recupera** essas evoluções.

### 2026-09-14 — Limitações conhecidas do módulo `Inter`
- Devolve **HTTP 500** em prontuários muito longos (~1% dos casos) — ele embute as evoluções dentro de cada internação e a resposta estoura. Retentativa não resolve. O serviço devolve `{ internacoes: [], erro }` em vez de propagar.
- Internação em curso não tem valor após "Saída:", e o regex capturava o rótulo seguinte como se fosse data. Só se aceita o que tem forma de data.
- Há inconsistências na origem: internação com saída anterior à entrada, internação de 553 dias, parecer registrado após a alta.

### 2026-06-16 — Host do HICD configurável via `.env`
- **Problema**: o host `hicd-hospub.sesau.ro.gov.br` estava hardcoded em 6+ arquivos, impossibilitando apontar para outro servidor (ex.: `hb-hospub.sesau.ro.gov.br`).
- **Solução**: centralizado em `config.js` lendo `HICD_HOST` (default = host de produção). `config.js` deriva `origin`/`baseUrl`/`loginUrl`/`indexUrl`; demais arquivos passam a referenciar `config.*`. Login testado com sucesso contra `hb-hospub`. Apenas o hostname é configurável (caminhos fixos).

### 2026-03-01 — `evolucao-parser.js`: colapso de newlines
- **Problema**: `limparTextoEvolucao` usava `.replace(/\s+/g, ' ')` — colapsava `\n` em espaço.
- **Causa**: regex genérica demais.
- **Solução**: usar `[^\S\n]+` para preservar quebras de linha: `.replace(/[^\S\n]+/g, ' ')`.

### 2026-03-01 — `parseSecaoSimples`: regex literal com newline
- **Problema**: regex com newline literal quebrava o parse de seções.
- **Solução**: usar lista de seções conhecidas como lookahead delimitador.

### 2026-03-01 — `extrairCampoDaLinha`: acento vs sem acento
- **Problema**: o HICD usa "Clinica / Leito:" (sem acento, com espaços ao redor do `/`), não "Clínica/Leito:".
- **Solução**: normalizar labels com `_normalizarLabel()` antes de comparar.

### 2026-03-01 — flags de regex em `extrairDadosEstruturadosEvolucao`
- **Problema**: evoluções em CAIXA ALTA ("EXAME FÍSICO:") não eram capturadas.
- **Solução**: adicionar flag `'i'` em todos os `extrairValor` dessa função.

### 2026-03-01 — `(?:\s+\w+)*` consumindo dígitos e newlines
- **Problema**: padrão `(?:\s+\w+)*` após nome de seção consumia `\n\n1` de listas numeradas.
- **Solução**: usar `(?:[^\S\n]+\w+)*` para restringir a espaço horizontal.

### 2026-03-01 — `exames-parser.js`: regex VR
- **Problema**: formato "V.R     :" (com pontos e espaços) não era capturado.
- **Solução**: regex `/\bVR\s*:|V\.?\s*R\.?\s*:/i`.

### 2026-03-01 — `paciente-parser.js`: entidades HTML e `dataInternacao`
- **Problema**: nomes com `&amp;` não eram decodificados; `dataInternacao` e `diasInternacao` não eram extraídos da lista.
- **Solução**: decodificar entidades HTML; ajustar seletores de extração.

---

## 7. Histórias de Usuário e Domínio

### Domínio
Sistema de prontuário eletrônico hospitalar brasileiro (HICD). Usuários são profissionais de saúde (médicos, enfermeiros, gestores) que precisam acessar dados de pacientes internados.

### Histórias Implementadas

**US-01 — Listar pacientes de uma clínica**
> Como gestor, quero ver todos os pacientes internados numa clínica, para monitorar a ocupação.
- `GET /api/clinicas/:id/pacientes`

**US-02 — Buscar paciente por prontuário**
> Como médico, quero buscar um paciente pelo número de prontuário para acessar seus dados rapidamente.
- `GET /api/pacientes/search?prontuario=N`

**US-03 — Buscar paciente por leito**
> Como enfermeiro, quero encontrar o paciente de um leito específico.
- `GET /api/pacientes/search-leito?leito=N`

**US-04 — Ver evoluções médicas**
> Como médico, quero acessar o histórico de evoluções de um paciente, com opção de formato resumido ou clínico.
- `GET /api/pacientes/:prontuario/evolucoes?formato=detalhado|clinico|resumido&limite=N`

**US-05 — Ver exames laboratoriais**
> Como médico, quero ver os exames de um paciente e seus resultados estruturados.
- `GET /api/pacientes/:prontuario/exames?incluirResultados=true`

**US-06 — Ver prescrições**
> Como farmacêutico, quero ver a prescrição atual de um paciente.
- `GET /api/pacientes/:prontuario/prescricoes`

**US-07 — Análise clínica agregada**
> Como médico, quero uma visão consolidada: dados do paciente + última evolução + exames recentes.
- `GET /api/pacientes/:prontuario/analise`

### Regras de Negócio

- **Autenticação**: API exige header `Authorization` com token AES-256-GCM ou sessão via `POST /api/auth/login`.
- **Cache**: respostas são cacheadas 10 minutos para reduzir carga no HICD.
- **Retry de login**: o primeiro login no HICD sempre falha — sistema faz retry automático.
- **Rate limiting**: `REQUEST_DELAY` ms entre requisições para não sobrecarregar o servidor HICD.
- **Dados clínicos estruturados**: evoluções são parseadas para extrair seções (Hipóteses Diagnósticas, Exame Físico, Conduta, Diurese, BH 24h, Medicamentos em uso).

---

## 8. Infraestrutura e Dependências

### Banco de Dados
Nenhum banco de dados próprio. Os dados vêm exclusivamente do servidor HICD externo via scraping. O cache é **in-memory** (não persistido entre restarts).

### Servidor HICD (dependência externa)
- **Protocolo**: HTTP POST para `controller.php`
- **Autenticação**: session cookie mantido pelo `http-client.js`
- **Módulos** (campo `ParamModule`): `Evolucao` (evoluções — ver §6), `Exames` → `exame.php`, `Paciente`, `Prescricao`, `Inter` (internações), `RALTA` (relatórios de alta), `CONSPAC_OPEN` (cadastro do prontuário e abertura de BE), `EvolucaoBe` + `TRIAGEM` (boletim de emergência), `SIINF/237` (catálogo de setores), `SSAME/pesq_Pront_Reg` (cadastro do SAME)
- **Quirk**: primeiro login sempre retorna erro — retry necessário

### Docker
Não há `docker-compose.yml` presente. A aplicação roda diretamente com Node.js. Para containerizar:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "api-server.js"]
```

### Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install && mkdir -p output

# API em produção (porta 3000)
npm run api

# API com auto-reload
npm run api-dev

# Crawler direto (extrai todas as clínicas)
npm run full

# Validar configuração
npm run validate

# Scripts de teste individuais
node test-cache.js
node test-parser-evolucao.js
node src/parsers/test-parsers.js
node src/parsers/test-evolucao-parser.js
node src/parsers/test-clinica-parser.js

# Scripts de debug (requerem .env com credenciais)
node debug-evolucoes.js <prontuario>
node debug-exames.js <prontuario>

# Limpar output
npm run clean
```

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

### 2026-09-20 — O filtro de "linha normal" do laudo engolia o achado que vinha depois

- **Problema**: o `42792` tinha laudo formal de ecocardiodoppler com "Canal Arterial minimo em vias de fechamento" e a triagem o classificou como **AUTO-NAO**, sem nenhum termo encontrado.
- **Causa**: `RUIDO_NORMAL` em `scripts/triagem_cardiopatia.py` existe para não contar "Artéria Pulmonar: Normal" como achado. Mas ele fazia `continue` na **linha inteira**, e o laudo do HICD escreve o achado **depois** da cláusula normal, na mesma linha: `Artéria Pulmonar: Normal e ramos confluentes. Canal arterial amplo de 7.2mm`; `Septo Interatrial: Íntegro. FOP 3,3 mm.`; `Situs: Sólitus e dextrocardia.`
- **Alcance**: **13 prontuários** com termo escondido atrás do "Normal", entre eles um canal arterial de 7,2 mm e uma dextrocardia.
- **Dano real: 1 caso em 677** — doze dos treze já tinham sido pegos na leitura à mão. A redundância entre triagem automática e leitura humana absorveu o defeito.
- **Solução**: remover a cláusula normal casada e continuar procurando no **resto** da linha, em vez de descartar a linha.
- **Regra**: filtro de ruído que opera por linha precisa consumir só o trecho que casou. Prontuário não respeita "uma afirmação por linha".

### 2026-09-20 — Auditoria da triagem automática: 43/43 dentro do domínio, 1,5% de erro residual

- **Pergunta**: dá para confiar nos 297 pacientes classificados **só** pela triagem automática, nunca lidos à mão?
- **Medida 1 — validação contra leitura humana**: dos 382 lidos à mão, separando quem veio da varredura por termo (enriquecido, por construção) dos demais: **43 `AUTO-NAO` do marco de cardiologistas, 0 falsos negativos**; 24 `AUTO-NAO` vindos da varredura, **15 falsos negativos (62,5%)**. Os 62,5% não são defeito: a triagem lê **evoluções de cardiologista** e esses pacientes não têm nenhuma. Com n=43 e zero erros, o limite superior de 95% (regra de três) é **7%** — declare isso, não "zero".
- **Medida 2 — ir atrás do erro em vez de estimá-lo**: a varredura por termo tinha rodado só sobre quem estava **fora** do marco. Rodada sobre os 307 classificados automaticamente, achou 11 casos: **4 cardiopatias reais perdidas** (`20969`, `26036`, `27011`, `40327`), 1 limítrofe, 2 hipóteses não confirmadas e 4 falsos positivos de sigla. **Erro residual medido: 1,3%–1,7%.**
- **Regra**: quando duas checagens independentes cobrem o mesmo conjunto — uma sobre evoluções de cardiologista, outra sobre todas as evoluções —, o erro de uma é absorvido pela outra. Foi o que aconteceu com o defeito do `RUIDO_NORMAL`: 13 prontuários afetados, 1 caso de dano.

### 2026-09-20 — `CIA` é o nome de um posto de saúde, e `CIV` é onde ficou o cateter

- **Problema**: cinco dos 54 achados da varredura por termo eram falso positivo de siglas que **não são diagnósticos**, e nenhum deles tinha ecocardiograma no prontuário.
- **Casos**: `39498` "Procurou atendimento de **CIA** em 03/04/25" — é o **Centro Integrado de Atendimento**, unidade de saúde de Porto Velho; `43432` "**CIA**: MAE ROZENE" — é o campo **acompanhante** do cabeçalho da evolução; `38151` "Dieta **cia** oral" — erro de digitação de **via** oral; `40511` "Acesso venoso central em **CIV**" — sítio anatômico do cateter (outra evolução do mesmo paciente escreve "em VSD"); `38086` "MÃE ... **COARCTAÇÃO** DA AORTA" — história **familiar**.
- **Solução**: nenhuma regex resolve isso — "CIA" ali está correta e é um substantivo próprio. A regra é de leitura: **achado de varredura sem exame que o sustente exige ler o contexto inteiro da evolução, não o trecho casado**. Os cinco viraram `Não` com a justificativa escrita na coluna `dx_cardio`.
- **Regra**: siglas de três letras em prontuário são ambíguas por padrão, e a ambiguidade não é só com exame laboratorial (`PCA` = procalcitonina) — é com **nome de serviço, campo de formulário, sítio anatômico e erro de digitação**.

### 2026-09-20 — Duplicata de prontuário: 678 registros, 676 pessoas

- **Problema**: `38496` e `39071` são a mesma criança (mesmo nome, mesma data de nascimento, mesma mãe), ambas classificadas como congênita. A criança entrava duas vezes no numerador **e** no denominador de prevalência.
- **Solução**: `duplicatas()` em `scripts/dataset_epidemio.py` detecta pares por `(nome, dataNascimento)` varrendo os `raw_*.json` — **detecção automática, não mapa escrito à mão**, para sobreviver às próximas coletas. O canônico é o de mais evoluções. As duas internações são eventos reais e distintos: **migram** para o canônico com a coluna `prontuario_origem` guardando a procedência, e o paciente deixa de contar em dobro (`prontuarios_duplicados`).
- **Por que não descartar o duplicado inteiro**: as internações dele existiram. Apagá-las corrigiria o numerador de pacientes quebrando o denominador de internações.

### 2026-09-18 — `PCA` no laboratório é PROCALCITONINA, não canal arterial

- **Problema**: varredura de termos de cardiopatia nos 6.127 internados fora do marco amostral devolveu 71 achados de "canal arterial" — **53 deles (75%) eram falso positivo**.
- **Causa**: a sigla `PCA` no laboratório do HICD é **procalcitonina**, e aparece no meio de listas de exames (`... PCR 136,7 PCA 0,36 CL 99 ...`). O padrão de persistência do canal arterial aceitava `PCA` solto.
- **Solução**: `${NB}pca${NA}(?!\s*[:=]?\s*\d)` — a sigla não vale quando seguida de número. Corrigidos, os achados caem de 110 para ~59 em 5.000 varridos (2,2% → 1,2%).
- **Da mesma varredura, outro falso positivo**: `fontan` casando com **"fontanela"**, que está no exame neurológico de todo lactente — 10 falsos positivos nos primeiros 150 pacientes. O `transfontanela` já estava excluído, mas não a forma simples. Precisa da fronteira acentuada: `${NB}fontan${NA}`.
- **`PCA` tem uma SEGUNDA homonímia**: na história obstétrica, `G3PCA0` é a fórmula **Gesta-Para-Cesárea-Aborto**. Escapou do filtro de laboratório porque não vem seguida de número isolado. Exige o lookbehind `(?<![G]\d)`. Foram mais 5 falsos positivos.
- **E o filtro post-hoc errou onde o scanner acertou**: usei `\bPCA` para limpar os resultados, e `\b` não casa em `2,40PCA` (dígito e letra são ambos `\w`, logo não há fronteira). A limpeza precisa da mesma fronteira acentuada do scanner, não de `\b`.
- **Regra**: sigla de três letras em prontuário é ambígua por padrão. Antes de usar `PCA`, `CIA`, `CIV`, `HP` como termo diagnóstico, verificar se existe **exame laboratorial** homônimo **e** se a sigla aparece em alguma **fórmula estruturada** (obstétrica, escalas).

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily). See `docs/agents/domain.md`.
