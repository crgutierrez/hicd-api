const HICDCrawler = require('./hicd-crawler');

async function testeBuscaPorLeito() {
    const crawler = new HICDCrawler();

    try {
        console.log('🔧 Configurando crawler...');
        crawler.setDebugMode(false); // Desabilitar debug para teste mais limpo

        console.log('🔑 Fazendo login...');
        await crawler.login();
        console.log('✅ Login realizado com sucesso\n');

        // Exemplos de busca por diferentes formatos de leito
        const leitosParaTeste = [
            'G7',    // Enfermaria G, leito 7
            'M2',    // Enfermaria M, leito 2  
            'A3',    // Enfermaria A, leito 3
            'H6'     // Enfermaria H, leito 6
        ];

        for (const leito of leitosParaTeste) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🔍 TESTANDO BUSCA POR LEITO: ${leito}`);
            console.log(`${'='.repeat(50)}`);

            try {
                // Busca simples (apenas lista pacientes)
                console.log(`\n📍 Busca simples no leito ${leito}:`);
                const pacientesSimples = await crawler.buscarPacientePorLeito(leito);
                
                if (pacientesSimples.length > 0) {
                    console.log(`\n✅ ${pacientesSimples.length} paciente(s) encontrado(s):`);
                    pacientesSimples.forEach((p, index) => {
                        console.log(`  ${index + 1}. ${p.nome} (${p.prontuario}) - Leito: ${p.leito} - Clínica: ${p.clinicaInfo.nome}`);
                    });

                    // Se encontrou pacientes, fazer busca detalhada do primeiro
                    const primeiroLeito = pacientesSimples[0].leito;
                    console.log(`\n📋 Fazendo busca detalhada para leito ${primeiroLeito}:`);
                    
                    const dadosDetalhados = await crawler.buscarPacienteDetalhadoPorLeito(primeiroLeito);
                    
                    console.log(`\n✅ Busca detalhada concluída!`);
                    console.log(`📊 Arquivo salvo com dados completos de ${dadosDetalhados.pacientesEncontrados} paciente(s)`);
                    
                    // Parar após encontrar o primeiro paciente para não sobrecarregar o teste
                    break;
                    
                } else {
                    console.log(`⚠️  Nenhum paciente encontrado no leito ${leito}`);
                }

            } catch (error) {
                console.error(`❌ Erro ao buscar leito ${leito}:`, error.message);
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log('🏁 TESTE DE BUSCA POR LEITO CONCLUÍDO');
        console.log(`${'='.repeat(50)}`);

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        process.exit(1);
    }
}

// Executar teste
testeBuscaPorLeito();
