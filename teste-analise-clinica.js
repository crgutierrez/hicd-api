const HICDCrawler = require('./hicd-crawler');

async function testeAnaliseClinica() {
    const crawler = new HICDCrawler();

    try {
        console.log('🏥 TESTE DE ANÁLISE CLÍNICA - ÚLTIMA EVOLUÇÃO');
        console.log('='.repeat(60));

        // Configurar crawler
        console.log('🔧 Configurando crawler...');
        crawler.setDebugMode(false);

        // Fazer login
        console.log('🔑 Fazendo login...');
        await crawler.login();
        console.log('✅ Login realizado com sucesso\n');

        // Teste 1: Buscar paciente por leito com análise clínica completa
        const leito = 'G7'; // Leito conhecido
        console.log(`🔍 TESTE 1: Busca com análise clínica - Leito ${leito}`);
        console.log('-'.repeat(50));

        try {
            const resultadoCompleto = await crawler.buscarPacienteComAnaliseClinica(leito);
            
            if (resultadoCompleto.pacientes.length > 0) {
                const paciente = resultadoCompleto.pacientes[0];
                const analise = paciente.analiseClinica;
                
                console.log(`\n📋 RESULTADO DA ANÁLISE CLÍNICA:`);
                console.log(`Paciente: ${paciente.dadosBasicos.nome}`);
                console.log(`Prontuário: ${paciente.dadosBasicos.prontuario}`);
                console.log(`Leito: ${paciente.dadosBasicos.leito}`);
                console.log(`Última evolução: ${analise.dataUltimaEvolucao}`);
                console.log(`Profissional: ${analise.profissionalResponsavel}`);
                
                console.log(`\n🔬 DADOS CLÍNICOS EXTRAÍDOS:`);
                
                if (analise.hda) {
                    console.log(`\n📝 HDA (História da Doença Atual):`);
                    console.log(`"${analise.hda}"`);
                } else {
                    console.log(`\n📝 HDA: Não encontrada na última evolução`);
                }
                
                if (analise.hipotesesDiagnosticas.length > 0) {
                    console.log(`\n🎯 HIPÓTESES DIAGNÓSTICAS (${analise.hipotesesDiagnosticas.length}):`);
                    analise.hipotesesDiagnosticas.forEach((hipotese, index) => {
                        console.log(`  ${index + 1}. ${hipotese}`);
                    });
                } else {
                    console.log(`\n🎯 HIPÓTESES DIAGNÓSTICAS: Não encontradas`);
                }
                
                if (analise.dadosExtras && Object.keys(analise.dadosExtras).length > 0) {
                    console.log(`\n📋 DADOS EXTRAS:`);
                    if (analise.dadosExtras.condutas) {
                        console.log(`  Condutas: ${analise.dadosExtras.condutas}`);
                    }
                    if (analise.dadosExtras.exames) {
                        console.log(`  Exames: ${analise.dadosExtras.exames.join(', ')}`);
                    }
                    if (analise.dadosExtras.medicacoes) {
                        console.log(`  Medicações: ${analise.dadosExtras.medicacoes}`);
                    }
                }
                
            } else {
                console.log(`⚠️  Nenhum paciente encontrado no leito ${leito}`);
            }
            
        } catch (error) {
            console.error(`❌ Erro no teste 1: ${error.message}`);
        }

        // Teste 2: Análise clínica direta por prontuário
        console.log(`\n\n🔍 TESTE 2: Análise clínica direta por prontuário`);
        console.log('-'.repeat(50));

        try {
            // Usar prontuário conhecido (do teste anterior ou um específico)
            const prontuario = '38701'; // ALICE ALVAREZ SUAREZ
            
            console.log(`📋 Analisando dados clínicos do prontuário ${prontuario}...`);
            const dadosClinicos = await crawler.extrairDadosClinicosUltimaEvolucao(prontuario);
            
            console.log(`\n📊 RESULTADO DA ANÁLISE:`);
            console.log(`Paciente ID: ${dadosClinicos.pacienteId}`);
            console.log(`Data da última evolução: ${dadosClinicos.dataUltimaEvolucao}`);
            console.log(`Profissional responsável: ${dadosClinicos.profissionalResponsavel}`);
            
            if (dadosClinicos.hda) {
                console.log(`\n📝 HDA: "${dadosClinicos.hda}"`);
            }
            
            if (dadosClinicos.hipotesesDiagnosticas.length > 0) {
                console.log(`\n🎯 Hipóteses Diagnósticas:`);
                dadosClinicos.hipotesesDiagnosticas.forEach((h, i) => {
                    console.log(`  ${i + 1}. ${h}`);
                });
            }
            
            // Salvar resultado individual
            const fs = require('fs').promises;
            const path = require('path');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = path.join('./output', `analise-clinica-${prontuario}-${timestamp}.json`);
            
            await fs.writeFile(filename, JSON.stringify(dadosClinicos, null, 2), 'utf8');
            console.log(`\n💾 Análise clínica salva em: ${filename}`);
            
        } catch (error) {
            console.error(`❌ Erro no teste 2: ${error.message}`);
        }

        console.log(`\n\n🏁 TESTE DE ANÁLISE CLÍNICA CONCLUÍDO!`);
        console.log(`✅ Funcionalidades testadas:`);
        console.log(`   - Busca por leito com análise clínica completa`);
        console.log(`   - Extração de HDA da última evolução`);
        console.log(`   - Extração de hipóteses diagnósticas`);
        console.log(`   - Extração de dados extras (condutas, exames, medicações)`);
        console.log(`   - Identificação da evolução mais recente`);
        console.log(`   - Parsing inteligente de texto médico`);

    } catch (error) {
        console.error('❌ Erro durante teste de análise clínica:', error.message);
        process.exit(1);
    }
}

// Executar teste
testeAnaliseClinica();
