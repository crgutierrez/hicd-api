#!/usr/bin/env node

const app = require('./api/server');
const { requestLogger, rateLimit } = require('./api/middleware/auth');

// Aplicar middlewares globais
app.use(requestLogger);
app.use(rateLimit());

// Configurar porta
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Função para iniciar o servidor
function startServer() {
    try {

        
        const server = app.listen(PORT, HOST, () => {
            console.log('\n🚀 API HICD iniciada com sucesso!');
            console.log(`📡 Servidor rodando em: http://${HOST}:${PORT}`);
            console.log(`📚 Documentação: http://${HOST}:${PORT}/api/docs`);
            console.log(`💚 Health check: http://${HOST}:${PORT}/api/health`);
            console.log('\n📋 Endpoints disponíveis:');
            console.log('  📋 Clínicas:');
            console.log(`    GET  http://${HOST}:${PORT}/api/clinicas`);
            console.log(`    GET  http://${HOST}:${PORT}/api/clinicas/search?nome=<nome>`);
            console.log(`    GET  http://${HOST}:${PORT}/api/clinicas/:id/pacientes`);
            console.log(`    GET  http://${HOST}:${PORT}/api/clinicas/:id/stats`);
            console.log('  👤 Pacientes:');
            console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/search?prontuario=<numero>`);
            console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/search-leito?leito=<numero>`);
            console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/:prontuario`);
            console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/:prontuario/evolucoes`);
            console.log(`    GET  http://${HOST}:${PORT}/api/pacientes/:prontuario/analise`);
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

        // Tratamento de erros não capturados
        process.on('uncaughtException', (error) => {
            console.error('❌ Erro não capturado:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promise rejeitada não tratada:', reason);
            console.error('Promise:', promise);
            process.exit(1);
        });

        return server;
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Verificar se o arquivo está sendo executado diretamente
if (require.main === module) {
    // Carregar variáveis de ambiente
    require('dotenv').config();
    
    console.log('🔄 Iniciando API HICD...');
    startServer();
}

module.exports = { app, startServer };
