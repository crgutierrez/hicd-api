#!/usr/bin/env node

/**
 * Teste do método analisarEnfermariaG
 * Demonstra como analisar todos os pacientes de uma clínica específica
 */

const HICDCrawler = require('./hicd-crawler.js');

async function testarAnaliseEnfermariaG() {
    console.log('🧪 TESTE - ANÁLISE DA ENFERMARIA G');
    console.log('='.repeat(50));
    
    const crawler = new HICDCrawler();
    
    try {
        // Testar método específico da Enfermaria G
        console.log('🏥 Testando método analisarEnfermariaG()...\n');
        
        const relatorio = await crawler.analisarEnfermariaG({
            salvarArquivo: true,
            incluirDetalhes: true,
            diretorioSaida: 'output'
        });
        
        console.log('\n📊 RELATÓRIO GERADO:');
        console.log('='.repeat(30));
        console.log(`• Clínica: ${relatorio.clinica}`);
        console.log(`• Total de pacientes: ${relatorio.totalPacientes}`);
        console.log(`• Sucessos: ${relatorio.sucessos}`);
        console.log(`• Falhas: ${relatorio.falhas}`);
        console.log(`• Taxa de sucesso: ${relatorio.taxaSucesso}%`);
        console.log(`• Pacientes com HDA: ${relatorio.pacientesComHDA}`);
        console.log(`• Pacientes com diagnósticos: ${relatorio.pacientesComDiagnosticos}`);
        
        if (relatorio.arquivoSalvo) {
            console.log(`• Arquivo salvo: ${relatorio.arquivoSalvo}`);
        }
        
        console.log(`\n📝 Resumo: ${relatorio.resumo}`);
        
        // Mostrar alguns exemplos de resultados
        if (relatorio.resultados && relatorio.resultados.length > 0) {
            console.log('\n🔍 EXEMPLOS DE RESULTADOS:');
            console.log('-'.repeat(30));
            
            const sucessos = relatorio.resultados.filter(r => r.status === 'sucesso');
            
            if (sucessos.length > 0) {
                console.log('\n✅ PACIENTES COM DADOS EXTRAÍDOS:');
                sucessos.slice(0, 3).forEach((resultado, index) => {
                    console.log(`\n${index + 1}. ${resultado.paciente.nome} (${resultado.paciente.prontuario})`);
                    console.log(`   Leito: ${resultado.paciente.leito}`);
                    if (resultado.analise.hda) {
                        console.log(`   HDA: ${resultado.analise.hda.substring(0, 100)}...`);
                    }
                    if (resultado.analise.profissionalResponsavel) {
                        console.log(`   Profissional: ${resultado.analise.profissionalResponsavel}`);
                    }
                    if (resultado.analise.hipotesesDiagnosticas && resultado.analise.hipotesesDiagnosticas.length > 0) {
                        console.log(`   Diagnósticos: ${resultado.analise.hipotesesDiagnosticas.length}`);
                    }
                });
            }
            
            const falhas = relatorio.resultados.filter(r => r.status !== 'sucesso');
            if (falhas.length > 0) {
                console.log('\n❌ PACIENTES COM FALHAS:');
                falhas.slice(0, 2).forEach((resultado, index) => {
                    console.log(`\n${index + 1}. ${resultado.paciente.nome} (${resultado.paciente.prontuario})`);
                    console.log(`   Leito: ${resultado.paciente.leito}`);
                    console.log(`   Erro: ${resultado.erro || 'Falha na extração'}`);
                });
            }
        }
        
        console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');
        
    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Fazer logout
        try {
            await crawler.logout();
        } catch (logoutError) {
            console.error('Erro no logout:', logoutError.message);
        }
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testarAnaliseEnfermariaG().catch(console.error);
}

module.exports = { testarAnaliseEnfermariaG };
