#!/usr/bin/env node

/**
 * Teste do novo modelo estruturado de exames
 * Valida o processamento dos diferentes tipos de exames
 */

const HICDParser = require('./src/parsers/hicd-parser');

function testarExamesEstruturados() {
    console.log('🧪 TESTE DO MODELO ESTRUTURADO DE EXAMES');
    console.log('========================================\n');

    const parser = new HICDParser();

    // Exemplos de diferentes tipos de exames baseados na saída real do hicd-parser
    const exemploTextoEvolucao = `
    Evolução médica do dia 02/09/2025:
    
    Hipóteses diagnósticas:
    Pneumonia aspirativa em tratamento
    Estado de mal epiléptico (07/08 - 25/08)
    Lesão hipóxico-isquêmica
    
    Em uso:
    Ceftazidima 150mg/kg/dia
    Prednisona 1mg/kg/dia
    Fenobarbital 5 gotas 20/20h
    
    Exames laboratoriais:
    [31/08] Hemoglobina: 9,40 g/dL - Baixa
    [31/08] Hematócrito: 27,50% - Dentro dos parâmetros
    Leucócitos: 10.210 /mm3 - Elevado
    Plaquetas: 445.000 /mm3
    Solicitar: Hemograma de controle
    Cultura: Hemocultura negativa
    RX Tórax: Melhora da pneumonia
    Gasometria: pH=7,35 pCO2=45 pO2=95 HCO3=22
    Urina: presença de leucócitos raros
    
    Exames de imagem:
    Ecocardiograma: Derrame pericárdico leve
    
    Sinais vitais:
    FC: 120 bpm
    FR: 35 ipm
    Peso: 4,5 kg
    `;

    console.log('📄 TEXTO DE EXEMPLO PARA TESTE:');
    console.log('--------------------------------');
    console.log(exemploTextoEvolucao);
    console.log('\n🔍 PROCESSANDO DADOS...\n');

    try {
        // Processar os dados da evolução
        const dadosProcessados = parser.extrairDadosEstruturadosEvolucao(exemploTextoEvolucao);

        console.log('📊 RESULTADOS DO PROCESSAMENTO:');
        console.log('================================\n');

        // Exibir exames estruturados
        if (dadosProcessados.exames && dadosProcessados.exames.length > 0) {
            console.log(`✅ EXAMES ENCONTRADOS: ${dadosProcessados.exames.length}`);
            console.log('-----------------------------------\n');

            dadosProcessados.exames.forEach((exame, index) => {
                console.log(`[${index + 1}] EXAME:`);
                console.log(`   📌 Tipo: ${exame.tipo}`);
                console.log(`   📊 Formato: ${exame.formato}`);
                console.log(`   ✅ Processado: ${exame.processado ? 'SIM' : 'NÃO'}`);
                
                if (exame.dataExame) {
                    console.log(`   📅 Data: ${exame.dataExame}`);
                }
                
                // Mostrar campos específicos baseados no tipo
                switch (exame.tipo) {
                    case 'laboratorial':
                        if (exame.formato === 'numerico') {
                            console.log(`   🔬 Nome: ${exame.nome}`);
                            console.log(`   🔢 Valor: ${exame.valor}`);
                            console.log(`   📏 Unidade: ${exame.unidade || 'N/A'}`);
                            if (exame.observacao) {
                                console.log(`   📝 Observação: ${exame.observacao}`);
                            }
                        } else if (exame.formato === 'descritivo') {
                            console.log(`   🔬 Nome: ${exame.nome}`);
                            console.log(`   📋 Resultado: ${exame.resultado}`);
                        }
                        break;
                    
                    case 'solicitacao':
                        console.log(`   📝 Exame Solicitado: ${exame.exameSolicitado}`);
                        break;
                    
                    case 'microbiologia':
                        console.log(`   🦠 Tipo: ${exame.tipoExame}`);
                        console.log(`   📋 Resultado: ${exame.resultado}`);
                        break;
                    
                    case 'imagem':
                        console.log(`   🖼️ Tipo: ${exame.tipoExame}`);
                        console.log(`   📋 Resultado: ${exame.resultado}`);
                        break;
                    
                    case 'gasometria':
                        console.log(`   💨 Conteúdo: ${exame.conteudo}`);
                        if (exame.valores && Object.keys(exame.valores).length > 0) {
                            console.log(`   📊 Valores extraídos:`);
                            Object.entries(exame.valores).forEach(([param, valor]) => {
                                console.log(`      ${param.toUpperCase()}: ${valor}`);
                            });
                        }
                        break;
                    
                    default:
                        console.log(`   📄 Conteúdo: ${exame.conteudo}`);
                }
                
                console.log(`   📝 Texto Original: "${exame.textoOriginal}"`);
                console.log('');
            });

            // Estatísticas dos tipos de exames
            console.log('📈 ESTATÍSTICAS DOS EXAMES:');
            console.log('----------------------------');
            const estatisticas = {};
            dadosProcessados.exames.forEach(exame => {
                const key = `${exame.tipo}_${exame.formato}`;
                estatisticas[key] = (estatisticas[key] || 0) + 1;
            });

            Object.entries(estatisticas).forEach(([tipo, quantidade]) => {
                console.log(`   ${tipo}: ${quantidade} exame(s)`);
            });

            // Exames processados vs não processados
            const processados = dadosProcessados.exames.filter(e => e.processado).length;
            const naoProcessados = dadosProcessados.exames.length - processados;
            
            console.log('\n📊 TAXA DE PROCESSAMENTO:');
            console.log(`   ✅ Processados: ${processados}/${dadosProcessados.exames.length} (${Math.round(processados/dadosProcessados.exames.length*100)}%)`);
            console.log(`   ⚠️ Não processados: ${naoProcessados}/${dadosProcessados.exames.length} (${Math.round(naoProcessados/dadosProcessados.exames.length*100)}%)`);

        } else {
            console.log('❌ Nenhum exame encontrado no texto');
        }

        // Mostrar também outros dados estruturados para contexto
        console.log('\n🔍 OUTROS DADOS ESTRUTURADOS:');
        console.log('------------------------------');
        console.log(`📋 Hipóteses Diagnósticas: ${dadosProcessados.hipotesesDiagnosticas?.length || 0}`);
        console.log(`💊 Medicamentos em Uso: ${dadosProcessados.medicamentosAtuais?.length || 0}`);
        console.log(`🔧 Dispositivos: ${dadosProcessados.dispositivos?.length || 0}`);
        console.log(`⚖️ Sinais Vitais: ${Object.keys(dadosProcessados.sinaisVitais || {}).length} registros`);

        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');

    } catch (error) {
        console.error('❌ ERRO DURANTE O TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar o teste
testarExamesEstruturados();
