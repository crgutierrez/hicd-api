const HicdCrawler = require('./hicd-crawler');
const fs = require('fs/promises');

async function testePacienteDetalhado() {
    const crawler = new HicdCrawler();
    crawler.setDebugMode(true);
    
    try {
        console.log('🔑 Fazendo login...');
        const loginResult = await crawler.login();
        
        if (!loginResult.success) {
            console.error('❌ Falha no login:', loginResult.message);
            return;
        }
        
        console.log('✅ Login realizado com sucesso');

        // Testar com um paciente conhecido (do exemplo)
        const pacienteId = '40577';
        
        // 1. Obter informações de cadastro
        console.log('\n📋 Testando obtenção de cadastro do paciente...');
        const cadastro = await crawler.getPacienteCadastro(pacienteId);
        
        console.log('\n=== CADASTRO DO PACIENTE ===');
        console.log('Dados Básicos:', JSON.stringify(cadastro.dadosBasicos, null, 2));
        console.log('Dados Complementares:', JSON.stringify(cadastro.dadosComplementares, null, 2));
        console.log('Endereço:', JSON.stringify(cadastro.dadosEndereco, null, 2));
        console.log('Informações Adicionais:', JSON.stringify(cadastro.informacoesAdicionais, null, 2));

        // 2. Obter evoluções
        console.log('\n📖 Testando obtenção de evoluções...');
        const evolucoes = await crawler.getEvolucoes(pacienteId);
        
        console.log('\n=== EVOLUÇÕES DO PACIENTE ===');
        console.log(`Total de evoluções: ${evolucoes.totalEvolucoes}`);
        
        // Mostrar as 3 primeiras evoluções com mais detalhes
        evolucoes.evolucoes.slice(0, 3).forEach((evolucao, index) => {
            console.log(`\n--- Evolução ${index + 1} ---`);
            console.log(`ID: ${evolucao.id}`);
            console.log(`Profissional: ${evolucao.profissional}`);
            console.log(`Atividade: ${evolucao.atividade}`);
            console.log(`Data Evolução: ${evolucao.dataEvolucao}`);
            console.log(`Data Atualização: ${evolucao.dataAtualizacao}`);
            console.log(`Clínica/Leito: ${evolucao.clinicaLeito}`);
            console.log(`Descrição (primeiros 200 chars): ${evolucao.descricao.substring(0, 200)}...`);
        });

        // 3. Salvar resultados completos
        const timestamp = new Date().toISOString();
        
        const dadosCompletos = {
            timestamp,
            pacienteId,
            cadastro,
            evolucoes
        };

        const nomeArquivo = `output/paciente-detalhado-${pacienteId}-${timestamp.replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(nomeArquivo, JSON.stringify(dadosCompletos, null, 2));
        
        console.log(`\n💾 Dados completos salvos em: ${nomeArquivo}`);
        
        // 4. Estatísticas
        console.log('\n📊 ESTATÍSTICAS:');
        console.log(`- Paciente ID: ${pacienteId}`);
        console.log(`- Total de evoluções: ${evolucoes.totalEvolucoes}`);
        console.log(`- Campos de cadastro extraídos: ${Object.keys({...cadastro.dadosBasicos, ...cadastro.dadosComplementares, ...cadastro.dadosEndereco, ...cadastro.informacoesAdicionais}).length}`);
        
        // Distribuição por atividade
        const atividadeCount = {};
        evolucoes.evolucoes.forEach(evo => {
            const atividade = evo.atividade || 'Não informado';
            atividadeCount[atividade] = (atividadeCount[atividade] || 0) + 1;
        });
        
        console.log('\n📈 Distribuição por atividade:');
        Object.entries(atividadeCount)
            .sort(([,a], [,b]) => b - a)
            .forEach(([atividade, count]) => {
                console.log(`  - ${atividade}: ${count} evolução(ões)`);
            });
        
        console.log('\n✅ Teste de paciente detalhado concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Executar teste
if (require.main === module) {
    testePacienteDetalhado()
        .then(() => console.log('\n🏁 Teste finalizado'))
        .catch(error => console.error('💥 Erro fatal:', error));
}

module.exports = testePacienteDetalhado;
