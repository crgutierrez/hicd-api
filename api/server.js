const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// Importar rotas
const authRoutes = require('./routes/auth');
const clinicasRoutes = require('./routes/clinicas');
const pacientesRoutes = require('./routes/pacientes');
const cacheRoutes = require('./routes/cache');

// Criar instância do Express
const app = express();

// Helmet com CSP relaxado para o Swagger UI
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:']
        }
    }
}));
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

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'API HICD - Docs',
    swaggerOptions: { persistAuthorization: true }
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Rotas da API
app.use('/api/auth', authRoutes);
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

// Rota principal
app.get('/', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({
        message: 'API HICD - Sistema de Prontuário Eletrônico',
        version: '1.0.0',
        swagger: `${base}/api/docs`,
        endpoints: {
            auth: {
                login:  'POST /api/auth/login',
                status: 'GET  /api/auth/status'
            },
            clinicas: {
                listar:    'GET /api/clinicas',
                buscar:    'GET /api/clinicas/search?nome=<nome>',
                pacientes: 'GET /api/clinicas/:id/pacientes',
                stats:     'GET /api/clinicas/:id/stats',
                pareceres: 'GET /api/clinicas/:id/pareceres'
            },
            pacientes: {
                buscar:     'GET /api/pacientes/search?prontuario=<numero>',
                porLeito:   'GET /api/pacientes/search-leito?leito=<leito>',
                detalhes:   'GET /api/pacientes/:prontuario',
                evolucoes:  'GET /api/pacientes/:prontuario/evolucoes',
                analise:    'GET /api/pacientes/:prontuario/analise',
                exames:     'GET /api/pacientes/:prontuario/exames',
                prescricoes:'GET /api/pacientes/:prontuario/prescricoes'
            },
            cache: {
                stats:             'GET    /api/cache/stats',
                clear:             'DELETE /api/cache/clear',
                invalidatePatient: 'DELETE /api/cache/invalidate/patient/:prontuario',
                invalidateType:    'DELETE /api/cache/invalidate/type/:type',
                clean:             'POST   /api/cache/clean'
            }
        }
    });
});


// Middleware para tratar rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        message: 'A rota solicitada não existe',
        availableEndpoints: [
            'GET  /',
            'GET  /api/health',
            'GET  /api/docs',
            'GET  /api/docs.json',
            'POST /api/auth/login',
            'GET  /api/auth/status',
            'GET  /api/clinicas',
            'GET  /api/clinicas/search',
            'GET  /api/clinicas/:id/pacientes',
            'GET  /api/clinicas/:id/stats',
            'GET  /api/clinicas/:id/pareceres',
            'GET  /api/pacientes/search',
            'GET  /api/pacientes/search-leito',
            'GET  /api/pacientes/:prontuario',
            'GET  /api/pacientes/:prontuario/evolucoes',
            'GET  /api/pacientes/:prontuario/analise',
            'GET  /api/pacientes/:prontuario/exames',
            'GET  /api/pacientes/:prontuario/prescricoes',
            'GET  /api/cache/stats',
            'DELETE /api/cache/clear',
            'DELETE /api/cache/invalidate/patient/:prontuario',
            'DELETE /api/cache/invalidate/type/:type',
            'POST /api/cache/clean'
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
