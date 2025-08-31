const app = require('./api/server');

const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
🚀 Servidor API HICD iniciado!
=====================================
📡 Porta: ${PORT}
🌐 URL: http://localhost:${PORT}
📚 Documentação: http://localhost:${PORT}/api/docs
💚 Health Check: http://localhost:${PORT}/api/health
=====================================

📋 Endpoints principais:
• GET /api/clinicas - Lista clínicas
• GET /api/pacientes/search?prontuario=123 - Busca paciente
• GET /api/pacientes/:prontuario/evolucoes - Evoluções médicas
• GET /api/pacientes/:prontuario/exames - Exames laboratoriais
• GET /api/pacientes/:prontuario/analise - Análise clínica completa

🎯 Novos recursos:
• Modelos estruturados (Paciente, Evolucao, Exame)
• Múltiplos formatos de resposta (resumido, detalhado, completo, clinico)
• Validação automática de dados
• Análise clínica inteligente
• Cache otimizado para performance

📖 Para mais informações, acesse: /api/docs
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔴 Recebido sinal de interrupção. Finalizando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔴 Recebido sinal de terminação. Finalizando servidor...');
    process.exit(0);
});

module.exports = app;
