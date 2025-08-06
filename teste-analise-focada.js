const HICDCrawler = require('./hicd-crawler');

async function testeFocadoAnaliseClinica() {
    const crawler = new HICDCrawler();

    try {
        console.log('🏥 TESTE FOCADO - EXTRAÇÃO DE HDA E HIPÓTESES DIAGNÓSTICAS');
        console.log('='.repeat(65));

        // Configurar crawler
        console.log('🔧 Configurando crawler...');
        crawler.setDebugMode(false);

        // Fazer login
        console.log('🔑 Fazendo login...');
        await crawler.login();
        console.log('✅ Login realizado com sucesso\n');

        // Lista de prontuários para testar (diferentes pacientes)
        const prontuarios = ['38701', '40577', '21640', '40231', '35947'];

        console.log(`🔍 ANALISANDO ${prontuarios.length} PACIENTES DIFERENTES`);
        console.log('='.repeat(50));

        for (let i = 0; i < prontuarios.length; i++) {
            const prontuario = prontuarios[i];
            
            try {
                console.log(`\n📋 PACIENTE ${i + 1}/${prontuarios.length} - Prontuário: ${prontuario}`);
                console.log('-'.repeat(40));

                // Extrair dados clínicos da última evolução
                const dadosClinicos = await crawler.extrairDadosClinicosUltimaEvolucao(prontuario);
                
                console.log(`📊 RESULTADO DA ANÁLISE:`);
                console.log(`• Data última evolução: ${dadosClinicos.dataUltimaEvolucao || 'N/A'}`);
                console.log(`• Profissional: ${dadosClinicos.profissionalResponsavel || 'N/A'}`);

                // Mostrar HDA
                if (dadosClinicos.hda) {
                    console.log(`\n📝 HDA (História da Doença Atual):`);
                    
                    // Truncar HDA se muito longa para melhor visualização
                    const hdaTruncada = dadosClinicos.hda.length > 200 
                        ? dadosClinicos.hda.substring(0, 200) + '...'
                        : dadosClinicos.hda;
                    
                    console.log(`   "${hdaTruncada}"`);
                } else {
                    console.log(`\n📝 HDA: ❌ Não encontrada na última evolução`);
                }

                // Mostrar hipóteses diagnósticas
                if (dadosClinicos.hipotesesDiagnosticas && dadosClinicos.hipotesesDiagnosticas.length > 0) {
                    console.log(`\n🎯 HIPÓTESES DIAGNÓSTICAS (${dadosClinicos.hipotesesDiagnosticas.length}):`);
                    dadosClinicos.hipotesesDiagnosticas.forEach((hipotese, index) => {
                        const hipoteseTruncada = hipotese.length > 100 
                            ? hipotese.substring(0, 100) + '...'
                            : hipotese;
                        console.log(`   ${index + 1}. ${hipoteseTruncada}`);
                    });
                } else {
                    console.log(`\n🎯 HIPÓTESES DIAGNÓSTICAS: ❌ Não encontradas`);
                }

                // Mostrar dados extras se existirem
                if (dadosClinicos.dadosExtras && Object.keys(dadosClinicos.dadosExtras).length > 0) {
                    console.log(`\n📋 DADOS EXTRAS:`);
                    
                    if (dadosClinicos.dadosExtras.condutas) {
                        const condutasTruncada = dadosClinicos.dadosExtras.condutas.length > 150 
                            ? dadosClinicos.dadosExtras.condutas.substring(0, 150) + '...'
                            : dadosClinicos.dadosExtras.condutas;
                        console.log(`   • Condutas: ${condutasTruncada}`);
                    }
                    
                    if (dadosClinicos.dadosExtras.exames && dadosClinicos.dadosExtras.exames.length > 0) {
                        console.log(`   • Exames: ${dadosClinicos.dadosExtras.exames.slice(0, 2).join(', ')}`);
                        if (dadosClinicos.dadosExtras.exames.length > 2) {
                            console.log(`     (+ ${dadosClinicos.dadosExtras.exames.length - 2} outros)`);
                        }
                    }
                    
                    if (dadosClinicos.dadosExtras.medicacoes) {
                        const medicacoesTruncada = dadosClinicos.dadosExtras.medicacoes.length > 150 
                            ? dadosClinicos.dadosExtras.medicacoes.substring(0, 150) + '...'
                            : dadosClinicos.dadosExtras.medicacoes;
                        console.log(`   • Medicações: ${medicacoesTruncada}`);
                    }
                }

                // Salvar análise individual
                const fs = require('fs').promises;
                const path = require('path');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = path.join('./output', `analise-focada-${prontuario}-${timestamp}.json`);
                
                await fs.writeFile(filename, JSON.stringify(dadosClinicos, null, 2), 'utf8');
                console.log(`\n💾 Dados salvos: analise-focada-${prontuario}-${timestamp}.json`);

                // Pausa entre análises para não sobrecarregar o servidor
                if (i < prontuarios.length - 1) {
                    console.log(`\n⏳ Aguardando antes da próxima análise...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`❌ Erro ao analisar prontuário ${prontuario}: ${error.message}`);
            }
        }

        // Resumo final
        console.log(`\n\n🏁 RESUMO DO TESTE FOCADO`);
        console.log('='.repeat(40));
        console.log(`✅ Funcionalidades demonstradas:`);
        console.log(`   📝 Extração de HDA (História da Doença Atual)`);
        console.log(`   🎯 Identificação de hipóteses diagnósticas`);
        console.log(`   📋 Coleta de dados extras (condutas, exames, medicações)`);
        console.log(`   🕐 Ordenação por data (evolução mais recente)`);
        console.log(`   🧠 Parsing inteligente de texto médico`);
        console.log(`   🔍 Múltiplos padrões de busca para dados clínicos`);
        
        console.log(`\n💡 PADRÕES RECONHECIDOS:`);
        console.log(`   • HDA: "HDA:", "História da doença atual:", "Quadro atual:"`);
        console.log(`   • Diagnósticos: "HD:", "Hipótese:", "Diagnóstico:", "CID:"`);
        console.log(`   • Condutas: "Conduta:", "Plano:", "Planejamento:"`);
        console.log(`   • Exames: "Exame:", "Solicitar:", "Solicitado:"`);
        console.log(`   • Medicações: "Medicação:", "Prescrição:", "Prescrito:"`);

        console.log(`\n🎯 USO RECOMENDADO:`);
        console.log(`   1. buscarPacienteComAnaliseClinica(leito) - Busca completa por leito`);
        console.log(`   2. extrairDadosClinicosUltimaEvolucao(prontuario) - Análise específica`);

    } catch (error) {
        console.error('❌ Erro durante teste focado:', error.message);
        process.exit(1);
    }
}

// Executar teste
testeFocadoAnaliseClinica();
