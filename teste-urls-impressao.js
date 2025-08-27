#!/usr/bin/env node

const HICDCrawler = require('./hicd-crawler-refactored');

async function testarUrlsImpressao() {
    console.log('🖨️ TESTE DE GERAÇÃO DE URLs DE IMPRESSÃO');
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

        // ID do paciente para teste
        const pacienteIdTeste = '40862';
        
        console.log(`Buscando exames para o paciente ${pacienteIdTeste}...`);
        
        // Buscar exames do paciente
        const exames = await crawler.evolutionService.getExames(pacienteIdTeste);
        
        if (exames.length === 0) {
            console.log('❌ Nenhum exame encontrado para gerar URLs');
            return;
        }

        console.log('\n🔗 GERANDO URLs DE IMPRESSÃO:');
        console.log('========================================');

        // Gerar URLs de impressão para todas as requisições
        const urlsImpressao = crawler.parser.gerarUrlsImpressao(exames, pacienteIdTeste, 'PRONT');
        
        console.log(`✅ ${urlsImpressao.length} URLs de impressão geradas:`);
        
        urlsImpressao.forEach((urlInfo, index) => {
            console.log(`\n[${index + 1}] REQUISIÇÃO ${urlInfo.requisicao}`);
            console.log(`📅 Data/Hora: ${urlInfo.data} ${urlInfo.hora}`);
            console.log(`👨‍⚕️ Médico: ${urlInfo.medico}`);
            console.log(`🔬 Total de exames: ${urlInfo.totalExames}`);
            console.log(`📋 Query String: ${urlInfo.queryString}`);
            console.log(`🔐 Param (Base64): ${urlInfo.param}`);
            console.log(`🌐 URL: ${urlInfo.url}`);
            console.log('---');
        });

        // Teste específico com a requisição 25HI1001088 (exemplo da solicitação)
        const requisicaoEspecifica = exames.find(req => req.requisicao === '25HI1001088');
        
        if (requisicaoEspecifica) {
            console.log('\n🎯 TESTE ESPECÍFICO - REQUISIÇÃO 25HI1001088:');
            console.log('========================================');
            
            const urlEspecifica = crawler.parser.gerarUrlImpressaoExames(
                requisicaoEspecifica.requisicaoId,
                requisicaoEspecifica.linha,
                requisicaoEspecifica.exames,
                pacienteIdTeste,
                'PRONT'
            );
            
            console.log(`📋 Requisição: ${requisicaoEspecifica.requisicao}`);
            console.log(`🆔 Linha: ${requisicaoEspecifica.linha}`);
            console.log(`🔬 Exames (${requisicaoEspecifica.exames.length}):`);
            requisicaoEspecifica.exames.forEach((exame, i) => {
                console.log(`   ${i + 1}. ${exame.codigo} - ${exame.nome}`);
            });
            
            console.log(`\n📝 Query String gerada:`);
            console.log(`   ${urlEspecifica.queryString}`);
            
            console.log(`\n🔐 Param Base64:`);
            console.log(`   ${urlEspecifica.param}`);
            
            console.log(`\n🌐 URL completa:`);
            console.log(`   ${urlEspecifica.url}`);

            // Decodificar para verificar
            const decodificado = Buffer.from(urlEspecifica.param, 'base64').toString();
            console.log(`\n✅ Verificação (decodificação Base64):`);
            console.log(`   ${decodificado}`);
        }

        // Salvar resultado
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `output/urls-impressao-${pacienteIdTeste}-${timestamp}.json`;
        
        const resultado = {
            pacienteId: pacienteIdTeste,
            dataGeracao: new Date().toISOString(),
            totalUrlsGeradas: urlsImpressao.length,
            urlsImpressao: urlsImpressao
        };
        
        fs.writeFileSync(filename, JSON.stringify(resultado, null, 2));
        console.log(`\n💾 URLs salvas em: ${filename}`);
        
        console.log('\n✅ TESTE DE URLs DE IMPRESSÃO CONCLUÍDO!');
        
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
testarUrlsImpressao().catch(console.error);
