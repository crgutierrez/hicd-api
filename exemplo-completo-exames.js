/**
 * Sistema Completo de Extração de Resultados de Exames do HICD
 * 
 * Este exemplo demonstra como:
 * 1. Buscar as requisições de exames de um paciente
 * 2. Gerar URLs de impressão para cada exame
 * 3. Fazer requisições para as URLs e extrair os resultados
 * 4. Parse das siglas e valores dos exames
 * 5. Gerar relatório estruturado
 */

const HICDCrawler = require('./hicd-crawler-refactored');
const fs = require('fs');

async function exemploCompletoExames() {
    const crawler = new HICDCrawler();
    
    try {
        console.log('🏥 SISTEMA COMPLETO DE EXTRAÇÃO DE EXAMES HICD\n');
        console.log('='.repeat(70));
        
        // 1. Login
        console.log('\n📋 ETAPA 1: AUTENTICAÇÃO');
        console.log('🔐 Fazendo login no sistema HICD...');
        await crawler.login('usuario', 'senha');
        console.log('✅ Login realizado com sucesso!');
        
        // 2. Configurar paciente
        const pacienteId = '40862';
        console.log(`\n📋 ETAPA 2: CONFIGURAÇÃO`);
        console.log(`👤 Paciente ID: ${pacienteId}`);
        
        // 3. Buscar e processar exames
        console.log('\n📋 ETAPA 3: EXTRAÇÃO DOS RESULTADOS');
        console.log('🔬 Iniciando busca completa dos exames...');
        
        const resultados = await crawler.evolutionService.getResultadosExames(pacienteId);
        
        if (resultados.length === 0) {
            console.log('❌ Nenhum resultado de exame encontrado');
            return;
        }
        
        // 4. Processar e estruturar dados
        console.log('\n📋 ETAPA 4: PROCESSAMENTO DOS DADOS');
        
        const dadosEstruturados = {
            pacienteId: pacienteId,
            dataProcessamento: new Date().toISOString(),
            totalRequisicoes: resultados.length,
            resumoResultados: [],
            resultadosDetalhados: resultados
        };
        
        let totalResultados = 0;
        const siglasEncontradas = new Set();
        
        // Organizar dados por requisição
        resultados.forEach((requisicao, index) => {
            const resumo = {
                numero: index + 1,
                requisicaoId: requisicao.requisicao,
                data: requisicao.data,
                hora: requisicao.hora,
                medico: requisicao.medico,
                clinica: requisicao.clinica,
                totalResultados: requisicao.totalResultados || 0,
                siglas: []
            };
            
            if (requisicao.resultados) {
                requisicao.resultados.forEach(resultado => {
                    siglasEncontradas.add(resultado.sigla);
                    resumo.siglas.push({
                        sigla: resultado.sigla,
                        valor: resultado.valor,
                        unidade: resultado.unidade || '',
                        valorNumerico: resultado.valorNumerico
                    });
                });
                totalResultados += requisicao.resultados.length;
            }
            
            dadosEstruturados.resumoResultados.push(resumo);
        });
        
        dadosEstruturados.totalResultados = totalResultados;
        dadosEstruturados.totalSiglasUnicas = siglasEncontradas.size;
        dadosEstruturados.siglasUnicas = Array.from(siglasEncontradas).sort();
        
        // 5. Relatório detalhado
        console.log('\n📋 ETAPA 5: RELATÓRIO FINAL');
        console.log('='.repeat(70));
        console.log(`\n📊 RESUMO EXECUTIVO:`);
        console.log(`   👤 Paciente: ${pacienteId}`);
        console.log(`   📋 Requisições processadas: ${dadosEstruturados.totalRequisicoes}`);
        console.log(`   🔬 Total de resultados extraídos: ${dadosEstruturados.totalResultados}`);
        console.log(`   🏷️  Siglas únicas identificadas: ${dadosEstruturados.totalSiglasUnicas}`);
        
        console.log(`\n🔬 DETALHAMENTO POR REQUISIÇÃO:`);
        
        dadosEstruturados.resumoResultados.forEach(req => {
            console.log(`\n   📋 Requisição ${req.numero}: ${req.requisicaoId}`);
            console.log(`      📅 Data/Hora: ${req.data} ${req.hora}`);
            console.log(`      👨‍⚕️ Médico: ${req.medico}`);
            console.log(`      🏥 Clínica: ${req.clinica}`);
            console.log(`      📊 Resultados: ${req.totalResultados}`);
            
            if (req.siglas.length > 0) {
                console.log(`      🏷️  Siglas encontradas:`);
                req.siglas.slice(0, 5).forEach(sigla => {
                    const valorLimpo = sigla.valor.length > 50 ? sigla.valor.substring(0, 50) + '...' : sigla.valor;
                    console.log(`         ${sigla.sigla}: ${valorLimpo} ${sigla.unidade}`);
                });
                if (req.siglas.length > 5) {
                    console.log(`         ... e mais ${req.siglas.length - 5} resultados`);
                }
            }
        });
        
        console.log(`\n🏷️  SIGLAS IDENTIFICADAS NO SISTEMA:`);
        const siglasAgrupadas = [];
        for (let i = 0; i < dadosEstruturados.siglasUnicas.length; i += 10) {
            siglasAgrupadas.push(dadosEstruturados.siglasUnicas.slice(i, i + 10));
        }
        
        siglasAgrupadas.forEach((grupo, index) => {
            console.log(`   ${grupo.join(', ')}`);
        });
        
        // 6. Salvar arquivos
        console.log('\n📋 ETAPA 6: SALVAMENTO DE ARQUIVOS');
        
        // Arquivo JSON completo
        const nomeArquivoJSON = `exames-completo-${pacienteId}-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(nomeArquivoJSON, JSON.stringify(dadosEstruturados, null, 2));
        console.log(`💾 Dados completos salvos: ${nomeArquivoJSON}`);
        
        // Arquivo CSV simplificado
        const csvLines = ['Requisicao,Data,Hora,Medico,Clinica,Sigla,Valor,Unidade,ValorNumerico'];
        
        dadosEstruturados.resumoResultados.forEach(req => {
            req.siglas.forEach(sigla => {
                const linha = [
                    req.requisicaoId,
                    req.data,
                    req.hora,
                    `"${req.medico}"`,
                    `"${req.clinica}"`,
                    sigla.sigla,
                    `"${sigla.valor.replace(/"/g, '""')}"`,
                    sigla.unidade,
                    sigla.valorNumerico || ''
                ].join(',');
                csvLines.push(linha);
            });
        });
        
        const nomeArquivoCSV = `exames-siglas-${pacienteId}-${new Date().toISOString().split('T')[0]}.csv`;
        fs.writeFileSync(nomeArquivoCSV, csvLines.join('\n'));
        console.log(`📊 Planilha CSV salva: ${nomeArquivoCSV}`);
        
        // 7. Sugestões de uso
        console.log('\n📋 ETAPA 7: SUGESTÕES DE USO');
        console.log(`\n💡 POSSÍVEIS APLICAÇÕES DOS DADOS:`);
        console.log(`   📈 Análise de tendências dos valores ao longo do tempo`);
        console.log(`   🔍 Identificação de valores fora dos padrões de referência`);
        console.log(`   📊 Geração de gráficos evolutivos dos exames`);
        console.log(`   🤖 Integração com sistemas de análise médica automatizada`);
        console.log(`   📱 Desenvolvimento de aplicações móveis para acompanhamento`);
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
        
    } catch (error) {
        console.error('\n❌ ERRO DURANTE O PROCESSAMENTO:', error.message);
        console.error('Stack completo:', error.stack);
    } finally {
        // Logout
        console.log('\n🔓 Fazendo logout do sistema...');
        await crawler.logout();
        console.log('✅ Logout realizado com sucesso!');
    }
}

// Executar o exemplo
exemploCompletoExames().catch(console.error);
