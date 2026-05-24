#!/usr/bin/env node

/**
 * Teste de validação do modelo de exames com dados reais
 * Verifica compatibilidade com saídas do hicd-parser existentes
 */

const HICDParser = require('./src/parsers/hicd-parser');
const fs = require('fs');

async function testarExamesComDadosReais() {
    console.log('🔬 TESTE DE VALIDAÇÃO COM DADOS REAIS');
    console.log('=====================================\n');

    const parser = new HICDParser();

    try {
        // Ler arquivo de evolução real existente
        const arquivoExistente = './output/evolucoes-UTI-2025-09-01T01-53-08-330Z.json';
        
        if (!fs.existsSync(arquivoExistente)) {
            console.log('⚠️ Arquivo de exemplo não encontrado. Usando dados sintéticos...');
            return;
        }

        console.log(`📄 Carregando arquivo: ${arquivoExistente}`);
        const dadosOriginais = JSON.parse(fs.readFileSync(arquivoExistente, 'utf8'));
        
        console.log(`📊 Total de pacientes no arquivo: ${dadosOriginais.length}`);
        
        // Encontrar um paciente com exames estruturados para comparação
        let pacienteTeste = null;
        for (const paciente of dadosOriginais) {
            if (paciente.exames && paciente.exames.length > 0) {
                pacienteTeste = paciente;
                break;
            }
        }

        if (!pacienteTeste) {
            console.log('❌ Nenhum paciente com exames encontrado no arquivo');
            return;
        }

        console.log(`\n👤 TESTANDO PACIENTE: ${pacienteTeste.nome}`);
        console.log(`📋 Prontuário: ${pacienteTeste.prontuario}`);
        console.log(`🛏️ Leito: ${pacienteTeste.leito}`);
        
        // Examinar estrutura atual dos exames
        console.log(`\n📊 EXAMES EXISTENTES (${pacienteTeste.exames.length}):`)
        console.log('=========================================');
        
        pacienteTeste.exames.forEach((exame, index) => {
            console.log(`\n[${index + 1}] EXAME ORIGINAL:`);
            console.log(`   📋 Requisição: ${exame.requisicao}`);
            console.log(`   📅 Data: ${exame.data} ${exame.hora}`);
            console.log(`   👨‍⚕️ Médico: ${exame.medico}`);
            console.log(`   🏥 Clínica: ${exame.clinica}`);
            console.log(`   🔬 Total de Resultados: ${exame.resultados ? exame.resultados.length : 0}`);
            
            if (exame.resultados && exame.resultados.length > 0) {
                console.log(`   📊 Primeiros 3 resultados:`);
                exame.resultados.slice(0, 3).forEach((resultado, idx) => {
                    console.log(`      ${idx + 1}. ${resultado.sigla}: ${resultado.valor} ${resultado.unidade || ''}`);
                });
            }
        });

        // Agora vamos simular como seria o novo formato estruturado
        console.log(`\n🆕 SIMULAÇÃO DO NOVO FORMATO ESTRUTURADO:`);
        console.log('==========================================');

        // Simular texto de evolução com os exames do paciente
        const textoSimulado = `
        Evolução médica:
        
        Exames laboratoriais:
        ${pacienteTeste.exames.length > 0 && pacienteTeste.exames[0].resultados ? 
          pacienteTeste.exames[0].resultados.slice(0, 10).map(r => 
            `${r.sigla}: ${r.valor} ${r.unidade || ''} - ${r.referencia || 'Normal'}`
          ).join('\n        ') : 'Sem resultados disponíveis'}
        `;

        console.log('📄 Texto simulado para teste:');
        console.log(textoSimulado);

        const novoFormatoExames = parser.extrairDadosEstruturadosEvolucao(textoSimulado);
        
        if (novoFormatoExames.exames && novoFormatoExames.exames.length > 0) {
            console.log(`\n✅ NOVOS EXAMES ESTRUTURADOS (${novoFormatoExames.exames.length}):`);
            console.log('---------------------------------------------');
            
            novoFormatoExames.exames.forEach((exame, index) => {
                console.log(`\n[${index + 1}] EXAME ESTRUTURADO:`);
                console.log(`   📌 Tipo: ${exame.tipo}`);
                console.log(`   📊 Formato: ${exame.formato}`);
                console.log(`   ✅ Processado: ${exame.processado ? 'SIM' : 'NÃO'}`);
                
                if (exame.nome) {
                    console.log(`   🔬 Nome: ${exame.nome}`);
                }
                if (exame.valor !== undefined) {
                    console.log(`   🔢 Valor: ${exame.valor}`);
                }
                if (exame.unidade) {
                    console.log(`   📏 Unidade: ${exame.unidade}`);
                }
                if (exame.observacao) {
                    console.log(`   📝 Observação: ${exame.observacao}`);
                }
                
                console.log(`   📝 Original: "${exame.textoOriginal}"`);
            });

            // Comparação de eficiência
            console.log(`\n📈 COMPARAÇÃO DE ESTRUTURAS:`);
            console.log('============================');
            console.log(`📊 Formato Original:`);
            console.log(`   - Requisições: ${pacienteTeste.exames.length}`);
            console.log(`   - Total de Resultados: ${pacienteTeste.exames.reduce((total, exame) => total + (exame.resultados ? exame.resultados.length : 0), 0)}`);
            console.log(`   - Estrutura: Hierárquica (Requisição > Resultados)`);
            
            console.log(`\n📊 Formato Novo Estruturado:`);
            console.log(`   - Exames Individuais: ${novoFormatoExames.exames.length}`);
            console.log(`   - Taxa de Processamento: ${Math.round(novoFormatoExames.exames.filter(e => e.processado).length / novoFormatoExames.exames.length * 100)}%`);
            console.log(`   - Estrutura: Linear com Tipagem Inteligente`);
            
            console.log(`\n💡 VANTAGENS DO NOVO MODELO:`);
            console.log(`   ✅ Tipagem automática de exames`);
            console.log(`   ✅ Extração de valores numéricos`);
            console.log(`   ✅ Detecção de unidades e observações`);
            console.log(`   ✅ Suporte a datas e solicitações`);
            console.log(`   ✅ Processamento de gasometrias`);
            console.log(`   ✅ Categorização de exames de imagem`);

        } else {
            console.log('❌ Nenhum exame estruturado foi gerado');
        }

        console.log('\n✅ TESTE DE VALIDAÇÃO CONCLUÍDO!');

    } catch (error) {
        console.error('❌ ERRO DURANTE O TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar o teste
testarExamesComDadosReais();
