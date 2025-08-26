const HICDCrawler = require('./hicd-crawler-refactored');

/**
 * Teste específico para análise da Enfermaria G usando a arquitetura refatorada
 */
async function testeEnfermariaGRefatorado() {
    const crawler = new HICDCrawler();
    
    try {
        console.log('🧪 TESTE - ANÁLISE DA ENFERMARIA G (VERSÃO REFATORADA)');
        console.log('='.repeat(60));
        console.log('[HICDCrawler] Sistema modular inicializado com sucesso');
        console.log('🏥 Testando método analisarEnfermariaG()...\n');
        
        // Habilitar modo debug para mais detalhes
        crawler.setDebugMode(false); // Desabilitado para teste mais limpo
        
        // Realizar análise completa da Enfermaria G
        const resultado = await crawler.analisarEnfermariaG({
            salvarArquivo: true,
            incluirDetalhes: true,
            diretorioSaida: 'output'
        });
        
        console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');
        
        // Verificar resultados
        if (resultado.totalPacientes > 0) {
            console.log(`✅ ${resultado.totalPacientes} pacientes encontrados na Enfermaria G`);
            console.log(`✅ ${resultado.sucessos} análises realizadas com sucesso`);
            console.log(`✅ ${resultado.pacientesComHDA} pacientes com HDA extraída`);
            console.log(`✅ ${resultado.pacientesComDiagnosticos} pacientes com diagnósticos`);
            
            if (resultado.arquivoSalvo) {
                console.log(`✅ Relatório salvo: ${resultado.arquivoSalvo}`);
            }
        } else {
            console.log('⚠️ Nenhum paciente encontrado na Enfermaria G');
        }
        
        // Fazer logout
        await crawler.logout();
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro durante teste:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Tentar fazer logout mesmo em caso de erro
        try {
            await crawler.logout();
        } catch (logoutError) {
            console.error('❌ Erro também no logout:', logoutError.message);
        }
        
        throw error;
    }
}

// Executar teste apenas se este arquivo for executado diretamente
if (require.main === module) {
    testeEnfermariaGRefatorado()
        .then(resultado => {
            console.log('\n📊 RESULTADO FINAL DO TESTE:');
            console.log(`- Clínica: ${resultado.clinica}`);
            console.log(`- Total de pacientes: ${resultado.totalPacientes}`);
            console.log(`- Taxa de sucesso: ${resultado.taxaSucesso}%`);
            console.log(`- Resumo: ${resultado.resumo}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 TESTE FALHOU:', error.message);
            process.exit(1);
        });
}

module.exports = { testeEnfermariaGRefatorado };
