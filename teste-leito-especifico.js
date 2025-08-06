const HICDCrawler = require('./hicd-crawler');

async function testeBuscaLeitoEspecifico() {
    const crawler = new HICDCrawler();

    try {
        console.log('🔧 Configurando crawler...');
        crawler.setDebugMode(false);

        console.log('🔑 Fazendo login...');
        await crawler.login();
        console.log('✅ Login realizado com sucesso\n');

        // Teste com leito específico formatado como solicitado
        const leito = 'G7'; // Enfermaria G, leito 7

        console.log(`🔍 BUSCANDO PACIENTE NO LEITO ${leito}`);
        console.log(`${'='.repeat(40)}`);

        // Busca simples primeiro
        console.log(`\n📍 Busca por pacientes no leito ${leito}:`);
        const pacientes = await crawler.buscarPacientePorLeito(leito);

        if (pacientes.length > 0) {
            console.log(`\n✅ ${pacientes.length} paciente(s) encontrado(s):`);
            pacientes.forEach((paciente, index) => {
                console.log(`  ${index + 1}. Nome: ${paciente.nome}`);
                console.log(`     Prontuário: ${paciente.prontuario}`);
                console.log(`     Leito: ${paciente.leito}`);
                console.log(`     Clínica: ${paciente.clinicaInfo.nome}`);
                console.log(`     Dias internado: ${paciente.diasInternado}`);
                console.log('');
            });

            // Fazer busca detalhada apenas do primeiro paciente encontrado
            const primeiroPaciente = pacientes[0];
            console.log(`📋 Obtendo dados detalhados de: ${primeiroPaciente.nome}`);
            console.log(`${'─'.repeat(40)}`);

            try {
                // Buscar cadastro detalhado
                console.log('📄 Obtendo cadastro...');
                const cadastro = await crawler.getPacienteCadastro(primeiroPaciente.prontuario);
                console.log('✅ Cadastro obtido com sucesso');

                // Buscar evoluções
                console.log('📋 Obtendo evoluções...');
                const evolucoes = await crawler.getEvolucoes(primeiroPaciente.prontuario);
                console.log(`✅ ${evolucoes.totalEvolucoes} evoluções obtidas`);

                // Salvar dados completos
                const dadosCompletos = {
                    leitoPesquisado: leito,
                    pacienteEncontrado: {
                        dadosBasicos: primeiroPaciente,
                        cadastro: cadastro,
                        evolucoes: evolucoes
                    },
                    timestamp: new Date().toISOString()
                };

                const fs = require('fs').promises;
                const path = require('path');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = path.join('./output', `paciente-leito-${leito}-${timestamp}.json`);
                
                await fs.writeFile(filename, JSON.stringify(dadosCompletos, null, 2), 'utf8');
                
                console.log(`\n💾 Dados completos salvos em: ${filename}`);

                // Resumo final
                console.log(`\n📊 RESUMO FINAL:`);
                console.log(`- Leito pesquisado: ${leito}`);
                console.log(`- Paciente: ${primeiroPaciente.nome}`);
                console.log(`- Prontuário: ${primeiroPaciente.prontuario}`);
                console.log(`- Leito sistema: ${primeiroPaciente.leito}`);
                console.log(`- Clínica: ${primeiroPaciente.clinicaInfo.nome}`);
                console.log(`- Total de evoluções: ${evolucoes.totalEvolucoes}`);
                console.log(`- Campos do cadastro: ${Object.keys(cadastro).length}`);

            } catch (error) {
                console.error(`❌ Erro ao obter dados detalhados: ${error.message}`);
            }

        } else {
            console.log(`⚠️  Nenhum paciente encontrado no leito ${leito}`);
            
            // Sugerir outros formatos
            console.log(`\n💡 Tentando outros formatos de leito...`);
            const outrosFormatos = ['G07', 'G.7', 'G-7', '012-7', '012.012-0007'];
            
            for (const formato of outrosFormatos) {
                try {
                    const pacientesAlt = await crawler.buscarPacientePorLeito(formato);
                    if (pacientesAlt.length > 0) {
                        console.log(`✅ Encontrado com formato "${formato}": ${pacientesAlt.length} paciente(s)`);
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Erro com formato "${formato}": ${error.message}`);
                }
            }
        }

        console.log(`\n🏁 Busca por leito específico concluída!`);

    } catch (error) {
        console.error('❌ Erro durante a busca:', error.message);
        process.exit(1);
    }
}

// Executar teste
testeBuscaLeitoEspecifico();
