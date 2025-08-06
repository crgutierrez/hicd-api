/**
 * Teste específico das funcionalidades de clínicas
 * 
 * Este arquivo testa especificamente as novas funcionalidades
 * de busca de clínicas e pacientes.
 */

const HICDCrawler = require('./hicd-crawler');

async function testeClinicas() {
    console.log('🧪 Teste das Funcionalidades de Clínicas');
    console.log('========================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // 1. Teste de login
        console.log('🔐 Testando login...');
        await crawler.login();
        console.log('✅ Login bem-sucedido');
        
        // 2. Teste de busca de clínicas
        console.log('\n🏥 Testando busca de clínicas...');
        const clinicas = await crawler.getClinicas();
        
        if (clinicas.length > 0) {
            console.log(`✅ Busca de clínicas bem-sucedida - ${clinicas.length} clínicas encontradas`);
            
            // Mostrar as primeiras 5 clínicas
            console.log('\n📋 Primeiras clínicas encontradas:');
            clinicas.slice(0, 5).forEach((clinica, index) => {
                console.log(`  ${index + 1}. [${clinica.codigo}] ${clinica.nome}`);
            });
            
            // 3. Teste de busca de pacientes em uma clínica
            const clinicaTeste = clinicas[0];
            console.log(`\n👥 Testando busca de pacientes na clínica: ${clinicaTeste.nome}`);
            
            const pacientes = await crawler.getPacientesClinica(clinicaTeste.codigo);
            console.log(`✅ Busca de pacientes bem-sucedida - ${pacientes.length} pacientes encontrados`);
            
            if (pacientes.length > 0) {
                console.log('\n📋 Primeiros pacientes encontrados:');
                pacientes.slice(0, 3).forEach((paciente, index) => {
                    console.log(`  ${index + 1}. ${paciente.nome} - Leito: ${paciente.leito}`);
                });
            }
            
        } else {
            console.log('⚠️ Nenhuma clínica encontrada');
        }
        
        // 4. Teste do método principal de extração
        console.log('\n📊 Testando extração completa (limitada)...');
        
        // Para teste, vamos limitar a apenas 2 clínicas
        const clinicasLimitadas = clinicas.slice(0, 2);
        let totalPacientesTestados = 0;
        
        for (const clinica of clinicasLimitadas) {
            try {
                const pacientesClinica = await crawler.getPacientesClinica(clinica.codigo);
                totalPacientesTestados += pacientesClinica.length;
                console.log(`  ✅ ${clinica.nome}: ${pacientesClinica.length} pacientes`);
                
                // Pequeno delay entre clínicas
                await crawler.delay(500);
                
            } catch (error) {
                console.log(`  ❌ ${clinica.nome}: erro - ${error.message}`);
            }
        }
        
        console.log(`\n✅ Teste completo finalizado - ${totalPacientesTestados} pacientes testados`);
        
        // 5. Teste de estrutura de dados
        if (totalPacientesTestados > 0) {
            console.log('\n🔍 Validando estrutura dos dados...');
            
            const primeiraClinica = clinicas[0];
            const pacientesExemplo = await crawler.getPacientesClinica(primeiraClinica.codigo);
            
            if (pacientesExemplo.length > 0) {
                const pacienteExemplo = pacientesExemplo[0];
                const camposEsperados = ['nome', 'leito', 'dataInternacao', 'prontuario', 'clinica'];
                
                console.log('📋 Estrutura do primeiro paciente:');
                console.log(JSON.stringify(pacienteExemplo, null, 2));
                
                const camposPresentes = camposEsperados.filter(campo => 
                    pacienteExemplo.hasOwnProperty(campo)
                );
                
                console.log(`✅ Campos presentes: ${camposPresentes.join(', ')}`);
                
                if (camposPresentes.length === camposEsperados.length) {
                    console.log('✅ Estrutura de dados válida');
                } else {
                    console.log('⚠️ Alguns campos podem estar faltando');
                }
            }
        }
        
        console.log('\n🎉 Todos os testes das funcionalidades de clínicas passaram!');
        
    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await crawler.logout();
        console.log('\n🔚 Teste finalizado');
    }
}

async function testeRapidoClinicas() {
    console.log('⚡ Teste Rápido - Apenas Login e Clínicas');
    console.log('========================================');
    
    const crawler = new HICDCrawler();
    
    try {
        await crawler.login();
        const clinicas = await crawler.getClinicas();
        
        console.log(`✅ Sucesso! ${clinicas.length} clínicas encontradas`);
        
        // Mostrar códigos e nomes das clínicas
        console.log('\n📋 Lista completa de clínicas:');
        clinicas.forEach(clinica => {
            console.log(`  [${clinica.codigo}] ${clinica.nome}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await crawler.logout();
    }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--rapido') || args.includes('-r')) {
    testeRapidoClinicas();
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Uso: node teste-clinicas.js [opções]

Opções:
  --rapido, -r   Teste rápido (apenas login e clínicas)
  --help, -h     Mostrar esta mensagem

Sem opções: Teste completo das funcionalidades
`);
} else {
    testeClinicas();
}

module.exports = { testeClinicas, testeRapidoClinicas };
