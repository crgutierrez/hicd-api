/**
 * Teste para buscar resultados completos dos exames
 */

const HICDCrawler = require('./hicd-crawler-refactored');
const fs = require('fs');

async function testeResultadosExames() {
    const crawler = new HICDCrawler();
    
    try {
        console.log('🚀 Iniciando teste de resultados de exames...\n');
        
        // Login
        console.log('🔐 Fazendo login...');
        const loginSuccess = await crawler.login('usuario', 'senha');
        
        if (!loginSuccess) {
            console.error('❌ Falha no login');
            return;
        }
        
        console.log('✅ Login realizado com sucesso!\n');
        
        // ID do paciente para teste
        const pacienteId = '40862';
        
        // Buscar resultados completos dos exames
        console.log(`📊 Buscando resultados completos dos exames do paciente ${pacienteId}...`);
        const resultadosCompletos = await crawler.evolutionService.getResultadosExames(pacienteId);
        
        if (resultadosCompletos.length === 0) {
            console.log('⚠️ Nenhum resultado de exame encontrado');
            return;
        }
        
        console.log(`\n✅ ${resultadosCompletos.length} requisições processadas com resultados!\n`);
        
        // Mostrar resumo dos resultados
        let totalResultados = 0;
        resultadosCompletos.forEach((exame, index) => {
            console.log(`📋 Requisição ${index + 1}: ${exame.requisicao}`);
            console.log(`   📅 Data: ${exame.data} ${exame.hora}`);
            console.log(`   👨‍⚕️ Médico: ${exame.medico}`);
            console.log(`   🏥 Clínica: ${exame.clinica}`);
            console.log(`   🔬 Resultados encontrados: ${exame.totalResultados}`);
            
            if (exame.resultados && exame.resultados.length > 0) {
                console.log(`   📊 Primeiros resultados:`);
                exame.resultados.slice(0, 5).forEach((resultado, idx) => {
                    console.log(`      ${idx + 1}. ${resultado.sigla}: ${resultado.valor} ${resultado.unidade || ''}`);
                });
                
                if (exame.resultados.length > 5) {
                    console.log(`      ... e mais ${exame.resultados.length - 5} resultados`);
                }
            }
            
            totalResultados += exame.totalResultados;
            console.log('');
        });
        
        console.log(`📊 RESUMO FINAL:`);
        console.log(`   Total de requisições: ${resultadosCompletos.length}`);
        console.log(`   Total de resultados: ${totalResultados}`);
        
        // Salvar em arquivo JSON para análise
        const dadosCompletos = {
            pacienteId: pacienteId,
            dataProcessamento: new Date().toISOString(),
            totalRequisicoes: resultadosCompletos.length,
            totalResultados: totalResultados,
            resultados: resultadosCompletos
        };
        
        const nomeArquivo = `resultados-exames-${pacienteId}-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(nomeArquivo, JSON.stringify(dadosCompletos, null, 2));
        console.log(`\n💾 Dados salvos em: ${nomeArquivo}`);
        
        // Mostrar exemplo de uso prático
        console.log(`\n🔍 EXEMPLO DE ANÁLISE DOS RESULTADOS:`);
        if (totalResultados > 0) {
            const todosResultados = resultadosCompletos.flatMap(r => r.resultados);
            
            // Agrupar por sigla
            const resultadosPorSigla = {};
            todosResultados.forEach(resultado => {
                if (!resultadosPorSigla[resultado.sigla]) {
                    resultadosPorSigla[resultado.sigla] = [];
                }
                resultadosPorSigla[resultado.sigla].push(resultado);
            });
            
            console.log(`   📈 Exames mais frequentes:`);
            Object.entries(resultadosPorSigla)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 5)
                .forEach(([sigla, resultados], index) => {
                    const valoresUnicos = [...new Set(resultados.map(r => r.valor))];
                    console.log(`      ${index + 1}. ${sigla}: ${resultados.length} ocorrências (valores: ${valoresUnicos.slice(0, 3).join(', ')}${valoresUnicos.length > 3 ? '...' : ''})`);
                });
        }
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Logout
        console.log('\n🔓 Fazendo logout...');
        await crawler.logout();
        console.log('✅ Logout realizado com sucesso!');
    }
}

// Executar teste
testeResultadosExames().catch(console.error);
