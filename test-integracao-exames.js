#!/usr/bin/env node

/**
 * Teste de integração completo do novo modelo de exames
 * Verifica a funcionalidade end-to-end
 */

const HICDParser = require('./src/parsers/hicd-parser');

function testeIntegracaoCompleta() {
    console.log('🔬 TESTE DE INTEGRAÇÃO COMPLETA - MODELO ESTRUTURADO');
    console.log('===================================================\n');

    const parser = new HICDParser();

    // Dados de teste que simulam diferentes cenários reais
    const cenariosTeste = [
        {
            nome: "Evolução com Exames Laboratoriais Diversos",
            texto: `
            Evolução médica 02/09/2025:
            
            Exames laboratoriais:
            [01/09] Hemoglobina: 12,5 g/dL - Normal
            [01/09] Leucócitos: 8.500 /mm3 - Dentro da normalidade
            Solicitar: Gasometria arterial
            Cultura: Urinocultura negativa
            RX Tórax: Campos pulmonares limpos
            Gasometria: pH=7,40 pCO2=38 pO2=92 HCO3=24
            Glicemia: 95 mg/dL
            Ureia: 25,8 mg/dL - Levemente elevada
            `
        },
        {
            nome: "Evolução com Exames de Imagem",
            texto: `
            Evolução médica:
            
            Exames laboratoriais:
            Solicitar: TC de abdome com contraste
            Ultrassom: Vesícula biliar sem alterações
            Ressonância: RM de crânio sem lesões
            Ecocardiograma: Função sistólica preservada
            TC: Tomografia de tórax normal
            `
        },
        {
            nome: "Evolução com Microbiologia",
            texto: `
            Evolução médica:
            
            Exames laboratoriais:
            Cultura: Hemocultura positiva para S. aureus
            Antibiograma: Sensível à oxacilina
            Bacterioscopia: Cocos gram-positivos em cacho
            Hemocultura: Negativa após 48h
            `
        },
        {
            nome: "Evolução com Gasometrias Múltiplas",
            texto: `
            Evolução médica:
            
            Exames laboratoriais:
            [08:00] Gasometria: pH=7,35 pCO2=45 pO2=80 HCO3=25 Sat=95
            [14:00] pH=7,42 pCO2=38 pO2=95 HCO3=24
            Gasometria venosa: pH=7,38 pCO2=42
            `
        }
    ];

    let totalExamesProcessados = 0;
    let totalExamesEstruturados = 0;
    let sucessosPorTipo = {};

    console.log('🧪 EXECUTANDO CENÁRIOS DE TESTE:\n');

    cenariosTeste.forEach((cenario, index) => {
        console.log(`[${index + 1}] ${cenario.nome}`);
        console.log('=' + '='.repeat(cenario.nome.length + 3));
        
        try {
            const resultado = parser.extrairDadosEstruturadosEvolucao(cenario.texto);
            
            if (resultado.exames && resultado.exames.length > 0) {
                console.log(`✅ ${resultado.exames.length} exames encontrados:`);
                
                // Agrupar por tipo para análise
                const porTipo = {};
                resultado.exames.forEach(exame => {
                    const chave = `${exame.tipo}_${exame.formato}`;
                    porTipo[chave] = (porTipo[chave] || 0) + 1;
                    
                    // Contar sucessos globais
                    if (exame.processado) {
                        sucessosPorTipo[chave] = (sucessosPorTipo[chave] || 0) + 1;
                    }
                });
                
                // Mostrar estatísticas do cenário
                Object.entries(porTipo).forEach(([tipo, quantidade]) => {
                    console.log(`   📊 ${tipo}: ${quantidade}`);
                });
                
                totalExamesProcessados += resultado.exames.filter(e => e.processado).length;
                totalExamesEstruturados += resultado.exames.length;
                
                // Mostrar alguns exemplos destacados
                const exemplosDestacados = resultado.exames.filter(e => 
                    e.processado && ['laboratorial_numerico', 'gasometria_completo', 'solicitacao_pedido'].includes(`${e.tipo}_${e.formato}`)
                ).slice(0, 3);
                
                if (exemplosDestacados.length > 0) {
                    console.log(`   🔍 Exemplos destacados:`);
                    exemplosDestacados.forEach(exame => {
                        if (exame.tipo === 'laboratorial' && exame.formato === 'numerico') {
                            console.log(`      • ${exame.nome}: ${exame.valor} ${exame.unidade || ''}`);
                        } else if (exame.tipo === 'gasometria') {
                            const valores = Object.entries(exame.valores || {})
                                .map(([k,v]) => `${k.toUpperCase()}=${v}`)
                                .join(' ');
                            console.log(`      • Gasometria: ${valores}`);
                        } else if (exame.tipo === 'solicitacao') {
                            console.log(`      • Solicitação: ${exame.exameSolicitado}`);
                        }
                    });
                }
                
            } else {
                console.log('⚠️ Nenhum exame encontrado');
            }
            
            console.log('');
            
        } catch (error) {
            console.error(`❌ Erro no cenário ${index + 1}: ${error.message}`);
            console.log('');
        }
    });

    // Relatório final de performance
    console.log('📊 RELATÓRIO FINAL DE PERFORMANCE');
    console.log('==================================');
    console.log(`📈 Total de exames estruturados: ${totalExamesEstruturados}`);
    console.log(`✅ Total de exames processados: ${totalExamesProcessados}`);
    console.log(`🎯 Taxa de sucesso geral: ${Math.round(totalExamesProcessados/totalExamesEstruturados*100)}%`);
    
    console.log('\n📊 Sucessos por tipo de exame:');
    Object.entries(sucessosPorTipo).forEach(([tipo, quantidade]) => {
        console.log(`   ${tipo}: ${quantidade} exames`);
    });

    // Validações de qualidade
    console.log('\n🔍 VALIDAÇÕES DE QUALIDADE:');
    console.log('===========================');
    
    const validacoes = [
        {
            nome: 'Taxa de Processamento',
            esperado: 80,
            atual: Math.round(totalExamesProcessados/totalExamesEstruturados*100),
            unidade: '%'
        },
        {
            nome: 'Diversidade de Tipos',
            esperado: 5,
            atual: Object.keys(sucessosPorTipo).length,
            unidade: 'tipos'
        },
        {
            nome: 'Volume de Exames',
            esperado: 20,
            atual: totalExamesEstruturados,
            unidade: 'exames'
        }
    ];

    let validacoesPassaram = 0;
    validacoes.forEach(validacao => {
        const passou = validacao.atual >= validacao.esperado;
        const emoji = passou ? '✅' : '❌';
        console.log(`${emoji} ${validacao.nome}: ${validacao.atual} ${validacao.unidade} (esperado: ≥${validacao.esperado})`);
        if (passou) validacoesPassaram++;
    });

    // Conclusão
    console.log('\n🏁 CONCLUSÃO DO TESTE:');
    console.log('=======================');
    if (validacoesPassaram === validacoes.length) {
        console.log('🎉 TODOS OS TESTES PASSARAM!');
        console.log('✅ O modelo estruturado de exames está funcionando corretamente');
        console.log('📈 Performance dentro dos parâmetros esperados');
        console.log('🚀 Sistema pronto para produção');
    } else {
        console.log(`⚠️ ${validacoesPassaram}/${validacoes.length} validações passaram`);
        console.log('🔧 Pode ser necessário ajustes adicionais');
    }

    // Recomendações técnicas
    console.log('\n💡 RECOMENDAÇÕES TÉCNICAS:');
    console.log('===========================');
    console.log('✅ Implementar cache para melhorar performance');
    console.log('✅ Adicionar logs estruturados para monitoramento');
    console.log('✅ Considerar processamento assíncrono para grandes volumes');
    console.log('✅ Implementar validação de valores de referência');
    console.log('✅ Adicionar alertas para valores críticos');

    console.log('\n🔗 PRÓXIMOS PASSOS:');
    console.log('===================');
    console.log('1. Integrar com API endpoints existentes');
    console.log('2. Testar com dados de produção');
    console.log('3. Implementar métricas de monitoramento');
    console.log('4. Documentar casos de uso específicos');
    console.log('5. Treinar equipe nas novas funcionalidades');

    console.log('\n✅ TESTE DE INTEGRAÇÃO COMPLETO FINALIZADO!');
}

// Executar teste
testeIntegracaoCompleta();
