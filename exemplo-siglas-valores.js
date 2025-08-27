/**
 * Exemplo prático: Extrair siglas e valores dos exames
 */

const HICDCrawler = require('./hicd-crawler-refactored');

async function exemploSiglasValores() {
    const crawler = new HICDCrawler();
    
    try {
        console.log('🧪 EXTRAÇÃO DE SIGLAS E VALORES DOS EXAMES\n');
        
        // Login
        console.log('🔐 Fazendo login...');
        await crawler.login('usuario', 'senha');
        console.log('✅ Login realizado!\n');
        
        const pacienteId = '40862';
        
        // Buscar resultados dos exames
        console.log(`🔬 Buscando exames do paciente ${pacienteId}...`);
        const resultados = await crawler.evolutionService.getResultadosExames(pacienteId);
        
        if (resultados.length === 0) {
            console.log('❌ Nenhum resultado encontrado');
            return;
        }
        
        console.log('📊 SIGLAS E VALORES ENCONTRADOS:\n');
        console.log('=' .repeat(80));
        
        let contadorGeral = 0;
        
        resultados.forEach((requisicao, reqIndex) => {
            console.log(`\n📋 REQUISIÇÃO ${reqIndex + 1}: ${requisicao.requisicao}`);
            console.log(`📅 Data: ${requisicao.data} ${requisicao.hora}`);
            console.log(`👨‍⚕️ Médico: ${requisicao.medico}`);
            console.log('-'.repeat(60));
            
            if (requisicao.resultados && requisicao.resultados.length > 0) {
                requisicao.resultados.forEach((resultado, resIndex) => {
                    contadorGeral++;
                    console.log(`${contadorGeral.toString().padStart(3)}. ${resultado.sigla.padEnd(15)} | ${resultado.valor.padEnd(20)} | ${resultado.unidade || 'sem unidade'}`);
                });
            } else {
                console.log('   ⚠️ Nenhum resultado extraído desta requisição');
            }
        });
        
        console.log('\n' + '=' .repeat(80));
        console.log(`📊 RESUMO: ${contadorGeral} resultados extraídos de ${resultados.length} requisições`);
        
        // Criar arquivo CSV simples com os resultados
        const csvLines = ['Requisicao,Data,Hora,Medico,Sigla,Valor,Unidade'];
        
        resultados.forEach(requisicao => {
            if (requisicao.resultados) {
                requisicao.resultados.forEach(resultado => {
                    const linha = [
                        requisicao.requisicao,
                        requisicao.data,
                        requisicao.hora,
                        requisicao.medico,
                        resultado.sigla,
                        resultado.valor,
                        resultado.unidade || ''
                    ].join(',');
                    csvLines.push(linha);
                });
            }
        });
        
        const fs = require('fs');
        const nomeArquivoCSV = `exames-siglas-valores-${pacienteId}.csv`;
        fs.writeFileSync(nomeArquivoCSV, csvLines.join('\n'));
        console.log(`💾 Arquivo CSV salvo: ${nomeArquivoCSV}`);
        
        // Mostrar estatísticas
        const todasSiglas = resultados.flatMap(r => r.resultados?.map(res => res.sigla) || []);
        const siglasUnicas = [...new Set(todasSiglas)];
        
        console.log(`\n📈 ESTATÍSTICAS:`);
        console.log(`   Siglas únicas encontradas: ${siglasUnicas.length}`);
        console.log(`   Exemplos de siglas: ${siglasUnicas.slice(0, 10).join(', ')}`);
        
        if (siglasUnicas.length > 10) {
            console.log(`   ... e mais ${siglasUnicas.length - 10} siglas`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await crawler.logout();
        console.log('\n✅ Logout realizado!');
    }
}

exemploSiglasValores().catch(console.error);
