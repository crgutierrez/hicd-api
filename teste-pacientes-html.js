/**
 * Teste específico da busca de pacientes com parser HTML atualizado
 * 
 * Este arquivo testa a nova implementação do parser de pacientes
 * baseado no HTML real retornado pelo sistema.
 */

const HICDCrawler = require('./hicd-crawler');

async function testePacientesHtml() {
    console.log('🧪 Teste do Parser HTML de Pacientes');
    console.log('===================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // 1. Login
        console.log('🔐 Fazendo login...');
        await crawler.login();
        console.log('✅ Login realizado');
        
        // 2. Buscar clínicas
        console.log('\n🏥 Buscando clínicas...');
        const clinicas = await crawler.getClinicas();
        console.log(`✅ ${clinicas.length} clínicas encontradas`);
        
        // 3. Testar busca de pacientes em clínicas específicas
        const clinicasTeste = [
            { codigo: '002', nome: 'C I P' },
            { codigo: '007', nome: 'U T I' },
            { codigo: '008', nome: 'ENFERMARIA A' }
        ];
        
        for (const clinicaTeste of clinicasTeste) {
            console.log(`\n👥 Testando clínica: ${clinicaTeste.nome} (${clinicaTeste.codigo})`);
            
            try {
                const pacientes = await crawler.getPacientesClinica(clinicaTeste.codigo);
                
                console.log(`✅ ${pacientes.length} pacientes encontrados na ${clinicaTeste.nome}`);
                
                if (pacientes.length > 0) {
                    console.log('\n📋 Dados dos primeiros pacientes:');
                    pacientes.slice(0, 3).forEach((paciente, index) => {
                        console.log(`\n${index + 1}. ${paciente.nome}`);
                        console.log(`   📄 Prontuário: ${paciente.prontuario}`);
                        console.log(`   🛏️ Leito: ${paciente.leito}`);
                        console.log(`   🏥 CID: ${paciente.cid}`);
                        console.log(`   📅 Data Internação: ${paciente.dataInternacao}`);
                        console.log(`   ⏰ Dias Internado: ${paciente.diasInternado}`);
                        console.log(`   🔍 Clínica: ${paciente.clinica}`);
                    });
                    
                    // Validar estrutura dos dados
                    const primeirosPacientes = pacientes.slice(0, 5);
                    const validacao = {
                        temNome: primeirosPacientes.every(p => p.nome && p.nome.length > 2),
                        temProntuario: primeirosPacientes.every(p => p.prontuario && p.prontuario.length > 0),
                        temLeito: primeirosPacientes.filter(p => p.leito && p.leito.length > 0).length,
                        temDataInternacao: primeirosPacientes.filter(p => p.dataInternacao && p.dataInternacao.length > 0).length,
                        temDiasInternado: primeirosPacientes.filter(p => p.diasInternado > 0).length
                    };
                    
                    console.log(`\n🔍 Validação dos dados:`);
                    console.log(`   ✅ Todos têm nome: ${validacao.temNome}`);
                    console.log(`   ✅ Todos têm prontuário: ${validacao.temProntuario}`);
                    console.log(`   📊 Com leito: ${validacao.temLeito}/${primeirosPacientes.length}`);
                    console.log(`   📊 Com data internação: ${validacao.temDataInternacao}/${primeirosPacientes.length}`);
                    console.log(`   📊 Com dias internado: ${validacao.temDiasInternado}/${primeirosPacientes.length}`);
                    
                } else {
                    console.log(`ℹ️ Nenhum paciente encontrado na ${clinicaTeste.nome}`);
                }
                
                // Delay entre clínicas
                await crawler.delay(1500);
                
            } catch (error) {
                console.error(`❌ Erro ao buscar pacientes da ${clinicaTeste.nome}:`, error.message);
            }
        }
        
        // 4. Teste com filtros
        console.log(`\n🔍 Testando busca com filtros na clínica C I P...`);
        
        try {
            // Teste com ordenação por nome
            const pacientesOrdenados = await crawler.getPacientesClinica('002', '', '', 'N');
            console.log(`✅ Busca ordenada por nome: ${pacientesOrdenados.length} pacientes`);
            
            await crawler.delay(1000);
            
            // Teste com ordenação por clínica+leito
            const pacientesClinicaLeito = await crawler.getPacientesClinica('002', '', '', 'C');
            console.log(`✅ Busca ordenada por clínica+leito: ${pacientesClinicaLeito.length} pacientes`);
            
        } catch (error) {
            console.error('❌ Erro nos testes com filtros:', error.message);
        }
        
        console.log('\n🎉 Teste do parser HTML de pacientes concluído!');
        
    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error.message);
        
        if (process.env.DEBUG_MODE === 'true') {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        await crawler.logout();
        console.log('\n🔚 Teste finalizado');
    }
}

async function testeExtracao() {
    console.log('📊 Teste de Extração Completa com Novo Parser');
    console.log('==============================================');
    
    const crawler = new HICDCrawler();
    
    try {
        await crawler.login();
        
        // Fazer extração limitada (apenas 3 clínicas para teste)
        console.log('\n📋 Executando extração limitada para teste...');
        
        const clinicas = await crawler.getClinicas();
        const clinicasLimitadas = clinicas.slice(0, 3);
        
        const dadosExtraidos = [];
        
        for (const clinica of clinicasLimitadas) {
            try {
                console.log(`\n🏥 Processando: ${clinica.nome}`);
                const pacientes = await crawler.getPacientesClinica(clinica.codigo);
                
                pacientes.forEach(paciente => {
                    dadosExtraidos.push({
                        ...paciente,
                        clinicaNome: clinica.nome,
                        clinicaCodigo: clinica.codigo,
                        timestamp: new Date().toISOString(),
                        url: crawler.indexUrl
                    });
                });
                
                console.log(`   ✅ ${pacientes.length} pacientes processados`);
                
                await crawler.delay(1000);
                
            } catch (error) {
                console.error(`   ❌ Erro na clínica ${clinica.nome}:`, error.message);
            }
        }
        
        // Salvar dados de teste
        if (dadosExtraidos.length > 0) {
            await crawler.saveData(dadosExtraidos, 'json');
            console.log(`\n💾 ${dadosExtraidos.length} registros salvos em teste`);
            
            // Estatísticas
            const estatisticas = {
                totalPacientes: dadosExtraidos.length,
                clinicasProcessadas: new Set(dadosExtraidos.map(p => p.clinicaCodigo)).size,
                pacientesPorClinica: {}
            };
            
            dadosExtraidos.forEach(paciente => {
                const clinica = paciente.clinicaNome;
                estatisticas.pacientesPorClinica[clinica] = (estatisticas.pacientesPorClinica[clinica] || 0) + 1;
            });
            
            console.log('\n📊 Estatísticas do teste:');
            console.log(JSON.stringify(estatisticas, null, 2));
        } else {
            console.log('\n⚠️ Nenhum dado extraído no teste');
        }
        
    } catch (error) {
        console.error('\n❌ Erro na extração de teste:', error.message);
    } finally {
        await crawler.logout();
    }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--extracao') || args.includes('-e')) {
    testeExtracao();
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Uso: node teste-pacientes-html.js [opções]

Opções:
  --extracao, -e  Teste de extração completa limitada
  --help, -h      Mostrar esta mensagem

Sem opções: Teste do parser HTML de pacientes
`);
} else {
    testePacientesHtml();
}

module.exports = { testePacientesHtml, testeExtracao };
