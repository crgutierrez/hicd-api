#!/usr/bin/env node

const HICDCrawler = require('./hicd-crawler-refactored');

async function testarExameEspecifico() {
    console.log('🎯 TESTE ESPECÍFICO DE EXAME');
    console.log('========================================');
    console.log('Testando extração de dados do onClick="imprimirEvo(\'25HI1001088\',\'7\')"');
    console.log('');

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

        // ID do paciente para teste
        const pacienteIdTeste = '40862';
        
        console.log(`Buscando exames para o paciente ${pacienteIdTeste}...`);
        
        // Buscar exames do paciente
        const exames = await crawler.evolutionService.getExames(pacienteIdTeste);
        
        // Buscar especificamente a requisição 25HI1001088
        const requisicaoEspecifica = exames.find(req => req.requisicao === '25HI1001088');
        
        if (requisicaoEspecifica) {
            console.log('\n🎯 REQUISIÇÃO ESPECÍFICA ENCONTRADA:');
            console.log('========================================');
            console.log(`📋 Requisição ID: ${requisicaoEspecifica.requisicao}`);
            console.log(`📅 Data: ${requisicaoEspecifica.data}`);
            console.log(`⏰ Hora: ${requisicaoEspecifica.hora}`);
            console.log(`👨‍⚕️ Médico: ${requisicaoEspecifica.medico}`);
            console.log(`🏥 Clínica: ${requisicaoEspecifica.clinica}`);
            console.log(`🆔 Linha (para onClick): ${requisicaoEspecifica.linha}`);
            console.log(`👤 Paciente: ${requisicaoEspecifica.nome}`);
            console.log(`🏥 Unidade: ${requisicaoEspecifica.unidadeSaude}`);
            
            console.log(`\n🔬 EXAMES DA REQUISIÇÃO (${requisicaoEspecifica.exames.length}):`);
            requisicaoEspecifica.exames.forEach((exame, index) => {
                console.log(`   ${index + 1}. Código: ${exame.codigo} - Nome: ${exame.nome}`);
            });
            
            console.log('\n📝 DADOS PARA FUNÇÃO onClick:');
            console.log(`   Requisição: '${requisicaoEspecifica.requisicao}'`);
            console.log(`   Linha: '${requisicaoEspecifica.linha}'`);
            console.log(`   onClick: imprimirEvo('${requisicaoEspecifica.requisicao}','${requisicaoEspecifica.linha}')`);
            
            console.log('\n📋 ESTRUTURA COMPLETA:');
            console.log(JSON.stringify(requisicaoEspecifica, null, 2));
            
        } else {
            console.log('❌ Requisição 25HI1001088 não encontrada');
            console.log('\n📋 Requisições disponíveis:');
            exames.forEach((req, index) => {
                console.log(`   ${index + 1}. ${req.requisicao} - ${req.data} ${req.hora} - Linha: ${req.linha}`);
            });
        }
        
        console.log('\n✅ TESTE ESPECÍFICO CONCLUÍDO!');
        
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
testarExameEspecifico().catch(console.error);
