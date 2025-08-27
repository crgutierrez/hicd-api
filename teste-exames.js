#!/usr/bin/env node

const HICDCrawler = require('./hicd-crawler-refactored');

async function testarExames() {
    console.log('🧪 TESTE DE BUSCA DE EXAMES');
    console.log('========================================');

    const crawler = new HICDCrawler();
    
    try {
        // Habilitar modo debug
        crawler.setDebugMode(true);
        
        console.log('Iniciando login...');
        const loginSucesso = await crawler.login();
        
        if (!loginSucesso) {
            console.error('❌ Falha no login');
            return;
        }
        
        console.log('Login bem-sucedido.');

        // ID do paciente para teste (baseado no exemplo fornecido)
        const pacienteIdTeste = '40862';
        
        console.log(`Buscando exames para o paciente ${pacienteIdTeste}...`);
        
        // Buscar exames do paciente
        const exames = await crawler.evolutionService.getExames(pacienteIdTeste);
        
        console.log('\n📊 RESULTADO DOS EXAMES:');
        console.log('========================================');
        console.log(`Total de requisições encontradas: ${exames.length}`);
        
        if (exames.length > 0) {
            exames.forEach((requisicao, index) => {
                console.log(`\n[${index + 1}] REQUISIÇÃO ${requisicao.requisicao}`);
                console.log(`👤 Paciente: ${requisicao.nome}`);
                console.log(`📅 Data/Hora: ${requisicao.data} ${requisicao.hora}`);
                console.log(`👨‍⚕️ Médico: ${requisicao.medico}`);
                console.log(`🏥 Clínica: ${requisicao.clinica}`);
                console.log(`🔬 Exames (${requisicao.exames.length}):`);
                
                requisicao.exames.forEach((exame, examIndex) => {
                    console.log(`   ${examIndex + 1}. ${exame.codigo} - ${exame.nome}`);
                });
                
                console.log(`📋 RequisicaoId: ${requisicao.requisicaoId} | Linha: ${requisicao.linha}`);
                console.log('---');
            });
            
            // Salvar resultado em arquivo JSON
            const fs = require('fs');
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `output/exames-paciente-${pacienteIdTeste}-${timestamp}.json`;
            
            const resultado = {
                pacienteId: pacienteIdTeste,
                dataConsulta: new Date().toISOString(),
                totalRequisicoes: exames.length,
                requisicoes: exames
            };
            
            fs.writeFileSync(filename, JSON.stringify(resultado, null, 2));
            console.log(`\n💾 Resultado salvo em: ${filename}`);
            
        } else {
            console.log('❌ Nenhum exame encontrado para este paciente');
        }
        
        console.log('\n✅ TESTE DE EXAMES CONCLUÍDO!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        if (crawler.debugMode) {
            console.error(error.stack);
        }
    } finally {
        console.log('Finalizando o crawler...');
        await crawler.logout();
        console.log('Logout realizado.');
    }
}

// Executar o teste
testarExames().catch(console.error);
