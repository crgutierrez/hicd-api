const HICDCrawler = require('./hicd-crawler');

async function main() {
    const crawler = new HICDCrawler();
    
    try {
        console.log('🚀 Iniciando HICD Crawler...');
        console.log('=====================================');
        
        // 1. Fazer login
        await crawler.login();
        
        // 2. Buscar clínicas disponíveis
        console.log('\n🏥 Buscando clínicas disponíveis...');
        const clinicas = await crawler.getClinicas();
        console.log(`✅ ${clinicas.length} clínicas encontradas`);
        
        // 3. Extrair dados de todas as clínicas
        console.log('\n📊 Extraindo dados de pacientes...');
        const data = await crawler.extractData();
        
        // 4. Salvar dados em ambos os formatos
        await crawler.saveData(data, 'json');
        await crawler.saveData(data, 'csv');
        
        // 5. Gerar relatório resumido
        console.log('\n📋 Relatório Final:');
        console.log('=====================================');
        console.log(`✅ Crawler executado com sucesso!`);
        console.log(`🏥 Clínicas processadas: ${clinicas.length}`);
        console.log(`� Total de pacientes coletados: ${data.length}`);
        
        // Resumo por clínica
        const resumoPorClinica = {};
        data.forEach(paciente => {
            const clinica = paciente.clinicaNome || 'Sem clínica';
            resumoPorClinica[clinica] = (resumoPorClinica[clinica] || 0) + 1;
        });
        
        console.log('\n📊 Pacientes por clínica:');
        Object.entries(resumoPorClinica)
            .sort(([,a], [,b]) => b - a)
            .forEach(([clinica, count]) => {
                console.log(`   • ${clinica}: ${count} pacientes`);
            });
        
    } catch (error) {
        console.error('❌ Erro durante execução do crawler:');
        console.error(error.message);
        
        // Log detalhado para debug
        if (process.env.DEBUG_MODE === 'true') {
            console.error('\nStack trace completo:');
            console.error(error.stack);
        }
        
        process.exit(1);
        
    } finally {
        // 4. Fazer logout
        await crawler.logout();
        console.log('\n🔚 Finalizando crawler...');
    }
}

// Executar o crawler
if (require.main === module) {
    main();
}

module.exports = main;
