const HicdCrawler = require('./hicd-crawler');
const fs = require('fs/promises');

async function testeMultiplosPacientesDetalhados() {
    const crawler = new HicdCrawler();
    crawler.setDebugMode(false); // Desabilitar debug para performance
    
    try {
        console.log('🔑 Fazendo login...');
        const loginResult = await crawler.login();
        
        if (!loginResult.success) {
            console.error('❌ Falha no login:', loginResult.message);
            return;
        }
        
        console.log('✅ Login realizado com sucesso');

        // 1. Obter lista de clínicas
        console.log('\n🏥 Obtendo lista de clínicas...');
        const clinicas = await crawler.getClinicas();
        console.log(`✅ ${clinicas.length} clínicas encontradas`);

        // 2. Buscar alguns pacientes de diferentes clínicas (limitado para teste)
        // Configurações do teste
        const maxClinicas = 2; // Teste rápido com apenas 2 clínicas
        const maxPacientesPorClinica = 1; // Apenas 1 paciente por clínica para teste rápido
        
        const dadosDetalhados = [];
        let totalPacientesProcessados = 0;

        console.log(`\n🔍 Processando até ${maxClinicas} clínicas...`);

        for (let i = 0; i < maxClinicas; i++) {
            const clinica = clinicas[i];
            console.log(`\n📍 Processando clínica: ${clinica.nome} (${clinica.codigo})`);
            
            try {
                // Obter pacientes da clínica
                const pacientes = await crawler.getPacientesClinica(clinica.codigo);
                
                // Verificar se o resultado tem a estrutura esperada
                if (!pacientes || !Array.isArray(pacientes)) {
                    console.log(`   ⚠️  Estrutura de dados inválida para clínica ${clinica.nome}`);
                    console.log(`   Resultado recebido:`, JSON.stringify(pacientes, null, 2));
                    continue;
                }
                
                if (pacientes.length === 0) {
                    console.log(`   ⚠️  Nenhum paciente encontrado na clínica ${clinica.nome}`);
                    continue;
                }

                console.log(`   ✅ Encontrados ${pacientes.length} pacientes na clínica ${clinica.nome}`);

                // Processar alguns pacientes desta clínica
                const pacientesParaProcessar = pacientes.slice(0, maxPacientesPorClinica);
                
                for (const paciente of pacientesParaProcessar) {
                    try {
                        console.log(`   👤 Processando paciente: ${paciente.nome} (${paciente.prontuario})`);
                        
                        // Obter cadastro detalhado
                        const cadastro = await crawler.getPacienteCadastro(paciente.prontuario);
                        
                        // Obter evoluções
                        const evolucoes = await crawler.getEvolucoes(paciente.prontuario);
                        
                        // Compilar dados
                        const dadosPaciente = {
                            clinica: {
                                codigo: clinica.codigo,
                                nome: clinica.nome
                            },
                            dadosBasicos: paciente,
                            cadastroDetalhado: cadastro,
                            evolucoes: evolucoes,
                            timestamp: new Date().toISOString()
                        };
                        
                        dadosDetalhados.push(dadosPaciente);
                        totalPacientesProcessados++;
                        
                        console.log(`   ✅ Paciente ${paciente.nome}: ${evolucoes.totalEvolucoes} evoluções encontradas`);
                        
                        // Delay para não sobrecarregar o servidor
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (error) {
                        console.error(`   ❌ Erro ao processar paciente ${paciente.nome}:`, error.message);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Erro ao processar clínica ${clinica.nome}:`, error.message);
            }
        }

        // 3. Salvar resultados
        const timestamp = new Date().toISOString();
        const nomeArquivo = `output/multiplos-pacientes-detalhados-${timestamp.replace(/[:.]/g, '-')}.json`;
        
        const resultadoFinal = {
            timestamp,
            totalPacientesProcessados,
            totalClinicasProcessadas: maxClinicas,
            pacientes: dadosDetalhados
        };
        
        await fs.writeFile(nomeArquivo, JSON.stringify(resultadoFinal, null, 2));
        
        // 4. Relatório estatístico
        console.log('\n📊 RELATÓRIO FINAL:');
        console.log(`- Total de pacientes processados: ${totalPacientesProcessados}`);
        console.log(`- Total de clínicas processadas: ${maxClinicas}`);
        console.log(`- Arquivo salvo: ${nomeArquivo}`);
        
        // Estatísticas por clínica
        const estatisticasPorClinica = {};
        dadosDetalhados.forEach(paciente => {
            const clinicaNome = paciente.clinica.nome;
            if (!estatisticasPorClinica[clinicaNome]) {
                estatisticasPorClinica[clinicaNome] = {
                    pacientes: 0,
                    totalEvolucoes: 0
                };
            }
            estatisticasPorClinica[clinicaNome].pacientes++;
            estatisticasPorClinica[clinicaNome].totalEvolucoes += paciente.evolucoes.totalEvolucoes;
        });
        
        console.log('\n📈 Estatísticas por clínica:');
        Object.entries(estatisticasPorClinica).forEach(([clinica, stats]) => {
            console.log(`  - ${clinica}: ${stats.pacientes} paciente(s), ${stats.totalEvolucoes} evolução(ões)`);
        });
        
        // Distribuição de atividades profissionais
        const atividadeCount = {};
        dadosDetalhados.forEach(paciente => {
            paciente.evolucoes.evolucoes.forEach(evo => {
                const atividade = evo.atividade || 'Não informado';
                atividadeCount[atividade] = (atividadeCount[atividade] || 0) + 1;
            });
        });
        
        console.log('\n🏥 Top 10 atividades profissionais:');
        Object.entries(atividadeCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([atividade, count]) => {
                console.log(`  - ${atividade}: ${count} evolução(ões)`);
            });
        
        console.log('\n✅ Teste de múltiplos pacientes detalhados concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Executar teste
if (require.main === module) {
    testeMultiplosPacientesDetalhados()
        .then(() => console.log('\n🏁 Teste finalizado'))
        .catch(error => console.error('💥 Erro fatal:', error));
}

module.exports = testeMultiplosPacientesDetalhados;
