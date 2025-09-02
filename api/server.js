const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar rotas
const clinicasRoutes = require('./routes/clinicas');
const pacientesRoutes = require('./routes/pacientes');
const cacheRoutes = require('./routes/cache');

// Criar instância do Express
const app = express();

// Configurar middlewares de segurança e logging
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Configurar parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para logging de requisições
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Rotas da API
app.use('/api/clinicas', clinicasRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/cache', cacheRoutes);

// Rota de saúde da API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Rota principal com documentação
app.get('/', (req, res) => {
    res.json({
        message: 'API HICD - Sistema de Prontuário Eletrônico',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            clinicas: {
                listar: 'GET /api/clinicas',
                buscar: 'GET /api/clinicas/search?nome=<nome>',
                pacientes: 'GET /api/clinicas/:id/pacientes'
            },
            pacientes: {
                buscar: 'GET /api/pacientes/search?prontuario=<numero>',
                detalhes: 'GET /api/pacientes/:prontuario',
                evolucoes: 'GET /api/pacientes/:prontuario/evolucoes',
                analise: 'GET /api/pacientes/:prontuario/analise',
                exames: 'GET /api/pacientes/:prontuario/exames',
                prescricoes: 'GET /api/pacientes/:prontuario/prescricoes'
            },
            cache: {
                stats: 'GET /api/cache/stats',
                clear: 'DELETE /api/cache/clear',
                invalidatePatient: 'DELETE /api/cache/invalidate/patient/:prontuario',
                invalidateType: 'DELETE /api/cache/invalidate/type/:type',
                clean: 'POST /api/cache/clean'
            }
        },
        documentation: 'Acesse /api/docs para documentação completa'
    });
});

// Rota de documentação
app.get('/api/docs', (req, res) => {
    res.json({  
        title: 'API HICD - Documentação',
        description: 'API REST para acessar dados do sistema HICD (Sistema de Prontuário Eletrônico)',
        version: '1.0.0',
        baseUrl: `${req.protocol}://${req.get('host')}/api`,
        endpoints: [
            {
                path: '/clinicas',
                method: 'GET',
                description: 'Lista todas as clínicas disponíveis',
                response: {
                    type: 'array',
                    items: {
                        id: 'string',
                        nome: 'string',
                        totalPacientes: 'number'
                    }
                }
            },
            {
                path: '/clinicas/search',
                method: 'GET',
                description: 'Busca clínicas por nome',
                parameters: [
                    { name: 'nome', type: 'string', required: true, description: 'Nome da clínica para buscar' }
                ]
            },
            {
                path: '/clinicas/:id/pacientes',
                method: 'GET',
                description: 'Lista pacientes de uma clínica específica',
                parameters: [
                    { name: 'id', type: 'string', required: true, description: 'ID da clínica' }
                ]
            },
            {
                path: '/pacientes/search',
                method: 'GET',
                description: 'Busca paciente por prontuário',
                parameters: [
                    { name: 'prontuario', type: 'string', required: true, description: 'Número do prontuário' }
                ]
            },
            {
                path: '/pacientes/:prontuario',
                method: 'GET',
                description: 'Obtém detalhes completos de um paciente',
                parameters: [
                    { name: 'prontuario', type: 'string', required: true, description: 'Número do prontuário' }
                ]
            },
            {
                path: '/pacientes/:prontuario/evolucoes',
                method: 'GET',
                description: 'Lista evoluções médicas de um paciente',
                parameters: [
                    { name: 'prontuario', type: 'string', required: true, description: 'Número do prontuário' }
                ]
            },
            {
                path: '/pacientes/:prontuario/analise',
                method: 'GET',
                description: 'Obtém análise clínica completa de um paciente',
                parameters: [
                    { name: 'prontuario', type: 'string', required: true, description: 'Número do prontuário' }
                ]
            },
            {   
                path: '/pacientes/:prontuario/exames',
                  method: 'GET',
                description: 'Obtém Exames  de um paciente',
                parameters: [
                    { name: 'prontuario', type: 'string', required: true, description: 'Número do prontuário' }
                ]
            },
            {
                path: '/pacientes/:prontuario/prescricoes',
                method: 'GET',
                description: 'Obtém prescrições de um paciente',
                parameters: [
                    { name: 'prontuario', type: 'string', required: true, description: 'Número do prontuário' }
                ]
            }
        ]
    });
});

// Middleware para tratar rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        message: 'A rota solicitada não existe',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'GET /api/docs',
            'GET /api/clinicas',
            'GET /api/clinicas/search',
            'GET /api/clinicas/:id/pacientes',
            'GET /api/pacientes/search',
            'GET /api/pacientes/:prontuario',
            'GET /api/pacientes/:prontuario/evolucoes',
            'GET /api/pacientes/:prontuario/analise',
            'GET /api/pacientes/:prontuario/exames',
            'GET /api/pacientes/:prontuario/prescricoes'
        ]
    });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro na API:', err);
    
    // Erro de validação
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Erro de validação',
            message: err.message,
            details: err.details || null
        });
    }
    
    // Erro de autenticação
    if (err.name === 'AuthenticationError') {
        return res.status(401).json({
            error: 'Erro de autenticação',
            message: 'Falha na autenticação com o sistema HICD'
        });
    }
    
    // Erro interno do servidor
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
