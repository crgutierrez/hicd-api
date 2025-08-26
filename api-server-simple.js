const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Importar rotas simples
const clinicasRoutes = require('./api/routes/clinicas-simple');
const pacientesRoutes = require('./api/routes/pacientes-simple');

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
        status: 'Modo de teste - rotas simplificadas',
        endpoints: {
            health: 'GET /api/health',
            clinicas: {
                listar: 'GET /api/clinicas',
                buscar: 'GET /api/clinicas/search?nome=<nome>'
            },
            pacientes: {
                buscar: 'GET /api/pacientes/search?prontuario=<numero>',
                buscarLeito: 'GET /api/pacientes/search-leito?leito=<numero>'
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
            'GET /',
            'GET /api/health',
            'GET /api/clinicas',
            'GET /api/clinicas/search',
            'GET /api/pacientes/search',
            'GET /api/pacientes/search-leito'
        ]
    });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro na API:', err);
    
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
    console.log('\n🚀 API HICD (Modo Teste) iniciada com sucesso!');
    console.log(`📡 Servidor rodando em: http://${HOST}:${PORT}`);
    console.log(`💚 Health check: http://${HOST}:${PORT}/api/health`);
    console.log('\n📋 Endpoints de teste disponíveis:');
    console.log(`    GET  http://${HOST}:${PORT}/api/clinicas`);
    console.log(`    GET  http://${HOST}:${PORT}/api/clinicas/search?nome=<nome>`);
    console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/search?prontuario=<numero>`);
    console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/search-leito?leito=<numero>`);
    console.log('\n🔧 Pressione Ctrl+C para parar o servidor\n');
});

// Tratamento de sinais do sistema
process.on('SIGTERM', () => {
    console.log('\n📴 Recebido SIGTERM. Parando servidor graciosamente...');
    server.close(() => {
        console.log('✅ Servidor parado com sucesso.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n📴 Recebido SIGINT (Ctrl+C). Parando servidor graciosamente...');
    server.close(() => {
        console.log('✅ Servidor parado com sucesso.');
        process.exit(0);
    });
});

module.exports = app;
