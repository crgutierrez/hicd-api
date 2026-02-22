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
