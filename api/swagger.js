/**
 * Especificação OpenAPI 3.0 da API HICD
 */

const spec = {
    openapi: '3.0.0',
    info: {
        title: 'API HICD',
        description: `API REST para acesso ao sistema HICD (Prontuário Eletrônico - SESAU/RO).

## Autenticação

Todas as rotas de clínicas, pacientes e cache exigem autenticação.

Há duas formas de autenticar:

**1. Login explícito** — faça \`POST /api/auth/login\` com o payload criptografado.
A sessão é mantida em memória enquanto o servidor estiver rodando.

**2. Auto-login por header** — envie o header \`Authorization\` com o mesmo payload criptografado
em qualquer requisição protegida. O servidor faz o login automaticamente se ainda não estiver autenticado.

### Formato do payload criptografado
AES-256-GCM aplicado sobre \`"login:senha"\`, codificado em base64: **IV (12 bytes) + AUTH_TAG (16 bytes) + CIPHERTEXT**.

Gere com: \`node payload.js usuario minhaSenha\``,
        version: '1.0.0',
        contact: { name: 'Cristiano' }
    },
    servers: [
        { url: 'http://localhost:3000', description: 'Desenvolvimento' }
    ],
    components: {
        securitySchemes: {
            AuthorizationHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'Authorization',
                description: 'Payload criptografado AES-256-GCM em base64. Aceita `Bearer <payload>` ou `<payload>` direto.'
            }
        },
        schemas: {
            Erro: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'string', example: 'Descrição curta do erro' },
                    message: { type: 'string', example: 'Detalhe do erro' }
                }
            },
            Clinica: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: '007' },
                    codigo: { type: 'string', example: '007' },
                    nome: { type: 'string', example: 'U T I' },
                    totalPacientes: { type: 'integer', example: 7 }
                }
            },
            PacienteResumo: {
                type: 'object',
                properties: {
                    prontuario: { type: 'string', example: '45164' },
                    nome: { type: 'string', example: 'FULANO DE TAL' },
                    leito: { type: 'string', example: '007-UTI 0001', nullable: true },
                    clinica: { type: 'string', example: 'U T I' }
                }
            },
            CacheStats: {
                type: 'object',
                properties: {
                    totalItems: { type: 'integer' },
                    validItems: { type: 'integer' },
                    expiredItems: { type: 'integer' },
                    estimatedSizeKB: { type: 'integer' },
                    defaultTTLMinutes: { type: 'integer' }
                }
            }
        }
    },
    security: [{ AuthorizationHeader: [] }],
    tags: [
        { name: 'Auth', description: 'Autenticação e sessão' },
        { name: 'Clínicas', description: 'Listagem e busca de clínicas' },
        { name: 'Pacientes', description: 'Dados clínicos de pacientes' },
        { name: 'Internações', description: 'Internações, desfecho, porta de entrada e boletins de emergência' },
        { name: 'Setores', description: 'Catálogo de setores do hospital' },
        { name: 'Cache', description: 'Gerenciamento do cache em memória' },
        { name: 'Sistema', description: 'Health check e informações gerais' }
    ],
    paths: {

        // ── AUTH ──────────────────────────────────────────────────────────────

        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Autenticar no sistema HICD',
                description: 'Recebe payload criptografado com `"login:senha"`, inicializa o crawler e autentica no HICD.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['payload'],
                                properties: {
                                    payload: {
                                        type: 'string',
                                        description: 'Base64 de IV(12b)+TAG(16b)+CIPHERTEXT — gerado com `node payload.js`',
                                        example: 'jhWBu1+Qn/q5l3HGJqlt9Hut/sPeZHco9+DM/puvVjE2g76NLeKUDnKE8V7QQg=='
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Login realizado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Login realizado com sucesso' }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: 'Payload ausente, inválido ou mal formatado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    401: { description: 'Credenciais rejeitadas pelo HICD', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/auth/status': {
            get: {
                tags: ['Auth'],
                summary: 'Verificar status de autenticação',
                security: [],
                responses: {
                    200: {
                        description: 'Status atual do crawler',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        authenticated: { type: 'boolean', example: true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        // ── CLÍNICAS ──────────────────────────────────────────────────────────

        '/api/clinicas': {
            get: {
                tags: ['Clínicas'],
                summary: 'Listar todas as clínicas',
                responses: {
                    200: {
                        description: 'Lista de clínicas (cache de 10 min)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { type: 'array', items: { $ref: '#/components/schemas/Clinica' } },
                                        total: { type: 'integer' },
                                        cache: { type: 'object', properties: { lastUpdate: { type: 'string', format: 'date-time' }, nextUpdate: { type: 'string', format: 'date-time' } } }
                                    }
                                }
                            }
                        }
                    },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/clinicas/search': {
            get: {
                tags: ['Clínicas'],
                summary: 'Buscar clínicas por nome',
                parameters: [
                    { name: 'nome', in: 'query', required: true, schema: { type: 'string' }, example: 'UTI' }
                ],
                responses: {
                    200: { description: 'Clínicas encontradas' },
                    400: { description: 'Parâmetro nome ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/clinicas/{id}/pacientes': {
            get: {
                tags: ['Clínicas'],
                summary: 'Listar pacientes de uma clínica',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '007' },
                    { name: 'formato', in: 'query', schema: { type: 'string', enum: ['resumido', 'completo', 'detalhado'], default: 'resumido' } }
                ],
                responses: {
                    200: { description: 'Pacientes da clínica', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, clinica: { $ref: '#/components/schemas/Clinica' }, data: { type: 'array', items: { $ref: '#/components/schemas/PacienteResumo' } }, total: { type: 'integer' } } } } } },
                    404: { description: 'Clínica não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/clinicas/{id}/stats': {
            get: {
                tags: ['Clínicas'],
                summary: 'Estatísticas de uma clínica',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '007' }
                ],
                responses: {
                    200: { description: 'Estatísticas da clínica' },
                    404: { description: 'Clínica não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/clinicas/{id}/pareceres': {
            get: {
                tags: ['Clínicas'],
                summary: 'Pareceres de todos os pacientes de uma clínica',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '007' }
                ],
                responses: {
                    200: { description: 'Pareceres encontrados nas evoluções' },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/clinicas/{id}': {
            get: {
                tags: ['Clínicas'],
                summary: 'Detalhes de uma clínica específica',
                description: 'Busca por `id`, `codigo` ou `nome`. Serve do cache de clínicas quando válido; caso contrário atualiza.',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '007' }
                ],
                responses: {
                    200: { description: 'Clínica encontrada', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Clinica' } } } } } },
                    404: { description: 'Clínica não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        // ── PACIENTES ─────────────────────────────────────────────────────────

        '/api/pacientes/search': {
            get: {
                tags: ['Pacientes'],
                summary: 'Buscar paciente por prontuário ou nome',
                parameters: [
                    { name: 'prontuario', in: 'query', schema: { type: 'string' }, example: '45164' },
                    { name: 'nome', in: 'query', schema: { type: 'string' }, example: 'Fulano' }
                ],
                responses: {
                    200: { description: 'Paciente(s) encontrado(s)' },
                    400: { description: 'Nenhum parâmetro informado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    404: { description: 'Paciente não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/search-leito': {
            get: {
                tags: ['Pacientes'],
                summary: 'Buscar paciente por leito',
                parameters: [
                    { name: 'leito', in: 'query', required: true, schema: { type: 'string' }, example: 'G7' }
                ],
                responses: {
                    200: { description: 'Paciente encontrado no leito' },
                    400: { description: 'Parâmetro leito ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    404: { description: 'Nenhum paciente no leito', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/{prontuario}': {
            get: {
                tags: ['Pacientes'],
                summary: 'Detalhes cadastrais do paciente',
                description: 'Dados demográficos e de internação. Cache 10 min.',
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' }
                ],
                responses: {
                    200: { description: 'Dados completos do paciente' },
                    404: { description: 'Paciente não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    422: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/{prontuario}/evolucoes': {
            get: {
                tags: ['Pacientes'],
                summary: 'Evoluções médicas do paciente',
                description: 'Cache 10 min.',
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' },
                    { name: 'formato', in: 'query', schema: { type: 'string', enum: ['resumido', 'detalhado', 'clinico'], default: 'detalhado' } },
                    { name: 'limite', in: 'query', schema: { type: 'integer', default: 1000 }, description: '0 = sem limite' }
                ],
                responses: {
                    200: { description: 'Lista de evoluções' },
                    404: { description: 'Nenhuma evolução encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/{prontuario}/evolucoes/ultimo-dia': {
            get: {
                tags: ['Pacientes'],
                summary: 'Evoluções do último dia registrado',
                description: 'Filtra apenas as evoluções cuja data (DD/MM/AAAA) é a mais recente encontrada. Cache 10 min.',
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' },
                    { name: 'formato', in: 'query', schema: { type: 'string', enum: ['resumido', 'detalhado', 'clinico'], default: 'detalhado' } }
                ],
                responses: {
                    200: {
                        description: 'Evoluções do dia mais recente',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        prontuario: { type: 'string' },
                                        data: { type: 'array', items: { type: 'object' } },
                                        dataReferencia: { type: 'string', example: '30/07/2026' },
                                        total: { type: 'integer' },
                                        formato: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    404: { description: 'Nenhuma evolução com data válida encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/{prontuario}/analise': {
            get: {
                tags: ['Pacientes'],
                summary: 'Análise clínica completa',
                description: 'Busca em paralelo cadastro, evoluções e exames. Extrai dados clínicos da última evolução. Cache 10 min.',
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' }
                ],
                responses: {
                    200: { description: 'Análise clínica estruturada' },
                    404: { description: 'Paciente não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/{prontuario}/exames': {
            get: {
                tags: ['Pacientes'],
                summary: 'Exames laboratoriais do paciente',
                description: 'Cache 10 min.',
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' },
                    { name: 'formato', in: 'query', schema: { type: 'string', enum: ['resumido', 'detalhado', 'resultados'], default: 'detalhado' } },
                    { name: 'incluirResultados', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } }
                ],
                responses: {
                    200: { description: 'Lista de exames com resultados' },
                    404: { description: 'Nenhum exame encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        '/api/pacientes/{prontuario}/prescricoes': {
            get: {
                tags: ['Pacientes'],
                summary: 'Prescrições médicas do paciente',
                description: 'Medicamentos, dietas e dispositivos. Cache 10 min.',
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' }
                ],
                responses: {
                    200: { description: 'Lista de prescrições com detalhes' },
                    404: { description: 'Nenhuma prescrição encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
                    503: { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } }
                }
            }
        },

        // ── CACHE ─────────────────────────────────────────────────────────────

        '/api/pacientes/{prontuario}/internacoes': {
            get: {
                tags: ['Internações'],
                summary: 'Internações do paciente, com desfecho e porta de entrada',
                description: `Cruza quatro fontes do HICD para montar a internação completa.

**Três avisos importantes para quem consome esta rota:**

1. \`setorAlta\` é o setor de **alta**, não o de entrada. Ele bate com o último setor
   das evoluções em 67% dos casos e com o primeiro em apenas 22%. A porta de entrada
   real está em \`percurso.setorEntrada\`, derivada do \`clinicaLeito\` das evoluções —
   56% das internações passam por dois ou mais setores.

2. \`desfecho: "Sem informação"\` **não** significa alta. Significa que não há documento
   no módulo RALTA nem menção nas evoluções. Cerca de 36% das internações caem nesse caso.

3. O óbito vem **exclusivamente** do texto das evoluções: quando o paciente morre ninguém
   escreve resumo de alta, então o RALTA fica vazio justamente nos óbitos.

O campo \`obitoNoProntuario\` roda no prontuário inteiro, independente das internações —
necessário porque o módulo Inter devolve HTTP 500 em prontuários muito longos (~1% dos
casos), e sem isso o óbito desses pacientes sumiria. Nesses casos \`erroModuloInternacoes\`
vem preenchido e a lista vem vazia.

\`percurso\` é **null** quando nenhuma evolução da internação traz \`clinicaLeito\` — acontece
sobretudo em evoluções de UTI, que não usam o formato estruturado. Nesses casos o resumo
\`passouPorUti\` recai sobre o \`setorAlta\` do módulo Inter.`,
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '36101' },
                    { name: 'desfecho', in: 'query', required: false, schema: { type: 'string', enum: ['true', 'false'], default: 'true' },
                      description: 'false pula a resolução de desfecho e percurso — bem mais rápido, pois dispensa buscar evoluções e RALTA' }
                ],
                responses: {
                    200: {
                        description: 'Internações do paciente',
                        content: { 'application/json': { example: {
                            success: true, prontuario: '36101', total: 14, erroModuloInternacoes: null,
                            obitoNoProntuario: { data: '09/11/2025 21:45:00', atividade: 'PEDIATRA', trecho: '...declarado óbito às 20:05' },
                            resumo: { noBienio: 14, porDesfecho: { 'Óbito': 1, Alta: 7, 'Sem informação': 6 }, passouPorUti: true },
                            data: [{
                                setorAlta: 'U T I', entrada: '01/11/2025 09:11', saida: '09/11/2025 22:21',
                                cidEntrada: 'R56', cidDescricao: 'CONVULSOES NAO CLASSIFICADAS EM OUTRA PARTE',
                                desfecho: 'Óbito', confianca: 'alta', fonte: 'Óbito constatado em evolução',
                                percurso: {
                                    setorEntrada: 'UIR 2 UNID-INTERN RAPIDA', portaDeEntrada: 'UIR',
                                    entrouPelaEmergencia: false, nSetores: 3,
                                    trajetoria: ['UIR 2 UNID-INTERN RAPIDA', 'EMERGENCIA - INTERNADOS', 'U T I'],
                                    horasAtePrimeiraEvolucao: 9.1
                                }
                            }]
                        } } }
                    },
                    500: { description: 'Erro ao consultar o HICD' }
                }
            }
        },
        '/api/pacientes/{prontuario}/relatorios-alta': {
            get: {
                tags: ['Internações'],
                summary: 'Documentos do módulo RALTA',
                description: `O módulo RALTA não guarda só resumos de alta. Numa amostra de 200 prontuários
apareceram cinco tipos: resumo de alta, relatório de transferência, laudo médico,
encaminhamento ambulatorial e documentos sem título identificável.

A classificação vem do **título** na primeira linha do documento, que é bem mais confiável
que varrer o corpo do texto — "transferido" aparece o tempo todo descrevendo movimentação
interna (emergência → UTI → enfermaria) dentro de resumos que terminam em alta.`,
                parameters: [{ name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '36101' }],
                responses: {
                    200: { description: 'Relatórios encontrados', content: { 'application/json': { example: {
                        success: true, prontuario: '36101', total: 7,
                        porTipo: { 'Resumo de alta': 6, 'Outro / não identificado': 1 },
                        data: [{ profissional: 'PAULA LAMEGO PASCHOALINO LOPES', dataRegistro: '23/10/2025 09:52:24', tipoDocumento: 'Resumo de alta', texto: '...' }]
                    } } } }
                }
            }
        },
        '/api/pacientes/{prontuario}/cadastro-same': {
            get: {
                tags: ['Pacientes'],
                summary: 'Cadastro do SAME — raça/cor, deficiência e código IBGE',
                description: `Única fonte no HICD com **raça/cor**, **deficiência** e **código IBGE do município**.
O cadastro do prontuário (\`GET /api/pacientes/{prontuario}\`) não traz esses campos.

Raça/cor segue a codificação do SUS: 1 branca, 2 negra, 3 parda, 4 amarela, 5 indígena,
0 não informado.

⚠️ **Cobertura baixa.** Numa amostra de 200 prontuários, 79% estavam com raça/cor
"não informado" — o campo é obrigatório no formulário mas aceita ficar em branco.
Antes de usar a variável em análise, meça a taxa de preenchimento da sua amostra.`,
                parameters: [{ name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '36101' }],
                responses: {
                    200: { description: 'Cadastro encontrado', content: { 'application/json': { example: {
                        success: true, prontuario: '36101',
                        data: { nome: 'ATHOS GABRIEL DE OLIVEIRA COSTA', sexo: 'M', racaCor: 'Parda', racaCorCodigo: '3',
                                deficiencia: 'Sem deficiência', municipioIbge: '1101104', uf: 'RO',
                                dataNascimento: '03/01/2024', cns: '706.8077.5332.8421', nomeMae: 'KATIELLY DE OLIVEIRA BARRA' }
                    } } } },
                    404: { description: 'O SAME não retornou cadastro para este prontuário' }
                }
            }
        },
        '/api/pacientes/{prontuario}/boletins-emergencia': {
            get: {
                tags: ['Internações'],
                summary: 'Boletins de Emergência — motivo da entrada, CID e classificação de risco',
                description: `O BE é a porta de entrada pela emergência e a única fonte, no HICD, de
**motivo da entrada**, **CID do atendimento** e **classificação de risco do protocolo de Manchester**.

O BE marca a **chegada**; o módulo Inter marca a **internação**. A defasagem mediana entre
os dois é de 48 minutos (p75 = 1,5 h), e 97% dos BEs têm uma internação correspondente em
até 24 horas — útil para calcular tempo de permanência na emergência antes de internar.

⚠️ **Custo:** cada BE exige duas requisições ao HICD. Pacientes com histórico longo chegam
a 15–22 boletins. Use \`limite\` para ler só os mais recentes.

⚠️ **Triagem pouco preenchida:** apenas ~13% dos BEs têm classificação de risco; nos demais
o HICD responde "Nenhum registro encontrado".`,
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '36101' },
                    { name: 'limite', in: 'query', required: false, schema: { type: 'integer', default: 0 },
                      description: 'Quantidade de BEs mais recentes a ler. 0 lê todos — pode ser lento.' }
                ],
                responses: {
                    200: { description: 'Boletins encontrados', content: { 'application/json': { example: {
                        success: true, prontuario: '36101', totalBes: 15, lidos: 2, comClassificacaoRisco: 2,
                        data: [{ be: '578155', motivo: 'QUEDA', cid: 'R56', chegada: '01/11/2025 09:13', saida: '01/11/2025 09:43',
                                 triagem: { classificacaoRisco: 'Amarelo', queixa: 'CRISE CONVULSIVA', spo2: '93' } }]
                    } } } }
                }
            }
        },
        '/api/setores': {
            get: {
                tags: ['Setores'],
                summary: 'Catálogo completo de setores do hospital',
                description: `São **29 setores**, contra os 25 devolvidos por \`GET /api/clinicas\`.

A diferença importa: \`/api/clinicas\` devolve o **censo vivo** — só setores com paciente
internado no momento. Ficam de fora as **UIR 1, 2 e 3** (códigos 003, 004 e 005), que são
setores em uso e respondem por internações reais. Quem monta denominador a partir do censo
perde essas internações silenciosamente.

A posição na lista é o próprio código: o primeiro nome é o setor 001.

⚠️ **O código 019 tem dois nomes ao mesmo tempo:** as evoluções o chamam "HOSPITAL DIA" e o
cadastro o chama "OBSERVAÇÃO", no mesmo período. Para agrupar por setor, use o código.`,
                responses: {
                    200: { description: 'Catálogo de setores', content: { 'application/json': { example: {
                        success: true, total: 29,
                        data: [{ codigo: '001', nome: 'EMERGENCIA - INTERNADOS' }, { codigo: '003', nome: 'UIR 1 UNID-INTERN RAPIDA' }],
                        observacao: 'Catálogo completo. /api/clinicas devolve apenas o censo vivo, sem as UIR.'
                    } } } }
                }
            }
        },
        '/api/cache/stats': {
            get: {
                tags: ['Cache'],
                summary: 'Estatísticas do cache em memória',
                security: [],
                responses: {
                    200: { description: 'Estatísticas', content: { 'application/json': { schema: { $ref: '#/components/schemas/CacheStats' } } } }
                }
            }
        },

        '/api/cache/clear': {
            delete: {
                tags: ['Cache'],
                summary: 'Limpar todo o cache',
                security: [],
                responses: { 200: { description: 'Cache limpo completamente' } }
            }
        },

        '/api/cache/invalidate/patient/{prontuario}': {
            delete: {
                tags: ['Cache'],
                summary: 'Invalidar cache de um paciente',
                security: [],
                parameters: [
                    { name: 'prontuario', in: 'path', required: true, schema: { type: 'string' }, example: '45164' }
                ],
                responses: { 200: { description: 'Cache do paciente invalidado' } }
            }
        },

        '/api/cache/invalidate/type/{type}': {
            delete: {
                tags: ['Cache'],
                summary: 'Invalidar cache por tipo',
                security: [],
                parameters: [
                    { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['cadastro', 'evolucoes', 'exames', 'prescricoes', 'analise'] }, example: 'evolucoes' }
                ],
                responses: { 200: { description: 'Cache do tipo invalidado' } }
            }
        },

        '/api/cache/clean': {
            post: {
                tags: ['Cache'],
                summary: 'Remover itens expirados do cache',
                security: [],
                responses: { 200: { description: 'Itens expirados removidos' } }
            }
        },

        // ── SISTEMA ───────────────────────────────────────────────────────────

        '/api/health': {
            get: {
                tags: ['Sistema'],
                summary: 'Health check',
                security: [],
                responses: {
                    200: {
                        description: 'Serviço operacional',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        uptime: { type: 'number' },
                                        version: { type: 'string', example: '1.0.0' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

module.exports = spec;
