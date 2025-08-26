const HICDCrawler = require('./hicd-crawler-refactored');
const fs = require('fs').promises;
const path = require('path');

async function testarEnfermariaUTI() {
    const crawler = new HICDCrawler();
    crawler.setDebugMode(true);

    try {
        console.log('Iniciando login...');
        const loginResult = await crawler.login();
        if (!loginResult.success) {
            console.error('Falha no login:', loginResult.message);
            return;
        }
        console.log('Login bem-sucedido.');

        const enfermariaNome = 'UTI';
        let codigoEnfermaria = null;

        console.log('Buscando clínicas disponíveis...');
        const clinicas = await crawler.getClinicas();
        
        // Encontrar o código da enfermaria 'UTI'
        for (const clinica of clinicas) {
            if (clinica.nome.replace(/\s/g, '').toUpperCase().includes(enfermariaNome.replace(/\s/g, '').toUpperCase())) {
                codigoEnfermaria = clinica.codigo;
                console.log(`Encontrado código para ${enfermariaNome}: ${codigoEnfermaria}`);
                break;
            }
        }

        if (!codigoEnfermaria) {
            console.error(`Enfermaria ${enfermariaNome} não encontrada.`);
            return;
        }

        console.log(`Buscando pacientes da enfermaria ${enfermariaNome} (${codigoEnfermaria})...`);
        const pacientesEnfermaria = await crawler.getPacientesClinica(codigoEnfermaria);
        console.log(`Encontrados ${pacientesEnfermaria.length} pacientes na ${enfermariaNome}.`);

        const pacientesComEvolucoes = [];

        // Processar apenas os primeiros 3 pacientes para depuração
        const pacientesParaTeste = 
        pacientesEnfermaria;
        // pacientesEnfermaria.slice(0, 1);
        
        for (let i = 0; i < pacientesParaTeste.length; i++) {
            const paciente = pacientesParaTeste[i];
            console.log(`\n[${i + 1}/${pacientesParaTeste.length}] Processando paciente: ${paciente.nome} (${paciente.prontuario})`);
            
            try {
                // Delay antes de buscar evoluções para evitar sobrecarga
                if (i > 0) {
                    console.log('Aguardando antes da próxima requisição...');
                    await crawler.httpClient.delay(2000);
                }
                
                console.log('Buscando evoluções...');
                const evolucoesPaciente = await crawler.getEvolucoes(paciente.prontuario);
                
                console.log(`✅ Encontradas ${evolucoesPaciente ? evolucoesPaciente.length : 0} evoluções`);
                
                pacientesComEvolucoes.push({
                    prontuario: paciente.prontuario,
                    nome: paciente.nome,
                    leito: paciente.leito,
                    evolucoes: evolucoesPaciente || []
                });
                
            } catch (error) {
                console.error(`❌ Erro ao buscar evoluções para ${paciente.nome}:`, error.message);
                
                // Adicionar o paciente mesmo com erro, mas sem evoluções
                pacientesComEvolucoes.push({
                    prontuario: paciente.prontuario,
                    nome: paciente.nome,
                    leito: paciente.leito,
                    dataInternacao: paciente.dataInternacao,
                    evolucoes: [],
                    erro: error.message
                });
            }
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = './output';
        const filename = path.join(outputDir, `evolucoes-${enfermariaNome}-${timestamp}.json`);

        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(filename, JSON.stringify(pacientesComEvolucoes, null, 2), 'utf8');

        // Resumo dos resultados
        console.log('\n📊 RESUMO DO TESTE:');
        console.log('='.repeat(50));
        console.log(`🏥 Enfermaria: ${enfermariaNome}`);
        console.log(`👥 Total de pacientes encontrados: ${pacientesEnfermaria.length}`);
        console.log(`🧪 Pacientes testados: ${pacientesParaTeste.length}`);
        console.log(`✅ Pacientes processados com sucesso: ${pacientesComEvolucoes.filter(p => !p.erro).length}`);
        console.log(`❌ Pacientes com erro: ${pacientesComEvolucoes.filter(p => p.erro).length}`);
        console.log(`📄 Total de evoluções coletadas: ${pacientesComEvolucoes.reduce((total, p) => total + (p.evolucoes ? p.evolucoes.length : 0), 0)}`);
        console.log(`💾 Arquivo salvo: ${filename}`);

        console.log(`\n✅ Teste da enfermaria ${enfermariaNome} concluído!`);

    } catch (error) {
        console.error('❌ Ocorreu um erro durante o teste:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        console.log('Finalizando o crawler...');
        await crawler.logout();
        console.log('Logout realizado.');
    }
}

testarEnfermariaUTI();