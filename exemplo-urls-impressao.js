#!/usr/bin/env node

/**
 * EXEMPLO PRÁTICO: Como usar a funcionalidade de geração de URLs de impressão
 * 
 * Este exemplo demonstra como:
 * 1. Buscar exames de um paciente
 * 2. Gerar URLs de impressão para todos os exames
 * 3. Usar a URL específica para acessar os resultados
 */

const HICDCrawler = require('./hicd-crawler-refactored');

async function exemploUsoUrlsImpressao() {
    console.log('📚 EXEMPLO PRÁTICO - GERAÇÃO DE URLs DE IMPRESSÃO');
    console.log('=========================================================');

    const crawler = new HICDCrawler();
    
    try {
        // 1. LOGIN
        console.log('🔐 1. Fazendo login no sistema...');
        crawler.setDebugMode(false); // Desabilitar debug para output mais limpo
        const loginSucesso = await crawler.login();
        
        if (!loginSucesso) {
            console.error('❌ Falha no login');
            return;
        }
        console.log('✅ Login realizado com sucesso');

        // 2. BUSCAR EXAMES
        const pacienteId = '40862';
        console.log(`\n🔍 2. Buscando exames do paciente ${pacienteId}...`);
        
        const exames = await crawler.evolutionService.getExames(pacienteId);
        console.log(`✅ Encontradas ${exames.length} requisições de exames`);

        // 3. GERAR URLs DE IMPRESSÃO
        console.log('\n🖨️ 3. Gerando URLs de impressão...');
        
        const urlsImpressao = crawler.parser.gerarUrlsImpressao(
            exames, 
            pacienteId,  // co_paciente
            'PRONT'      // TIPOBUSCA
        );
        
        console.log(`✅ ${urlsImpressao.length} URLs geradas com sucesso`);

        // 4. DEMONSTRAR USO ESPECÍFICO
        console.log('\n🎯 4. EXEMPLO ESPECÍFICO - Requisição 25HI1001088:');
        console.log('=========================================================');
        
        const exemploEspecifico = urlsImpressao.find(url => url.requisicaoId === '25HI1001088');
        
        if (exemploEspecifico) {
            console.log(`📋 Requisição: ${exemploEspecifico.requisicaoId}`);
            console.log(`📅 Data/Hora: ${exemploEspecifico.data} ${exemploEspecifico.hora}`);
            console.log(`👨‍⚕️ Médico: ${exemploEspecifico.medico}`);
            console.log(`🆔 Linha: ${exemploEspecifico.linha}`);
            console.log(`🔬 Total de exames: ${exemploEspecifico.totalExames}`);
            
            console.log('\n📝 Query String gerada:');
            console.log(`   ${exemploEspecifico.queryString}`);
            
            console.log('\n🔐 Parâmetro codificado em Base64:');
            console.log(`   ${exemploEspecifico.param}`);
            
            console.log('\n🌐 URL completa para acesso direto:');
            console.log(`   ${exemploEspecifico.url}`);
            
            console.log('\n✨ Como usar no JavaScript original:');
            console.log(`   var queryString = "${exemploEspecifico.queryString}";`);
            console.log(`   var param = Base64.encode(queryString); // ${exemploEspecifico.param}`);
            console.log(`   var target = "${exemploEspecifico.url}";`);
            console.log(`   window.open(target, '_blank', 'toolbar=no,location=no...');`);
        }

        // 5. RESUMO DE TODAS AS URLs
        console.log('\n📊 5. RESUMO DE TODAS AS URLs GERADAS:');
        console.log('=========================================================');
        
        urlsImpressao.forEach((urlInfo, index) => {
            console.log(`[${index + 1}] ${urlInfo.requisicaoId} | ${urlInfo.data} | ${urlInfo.totalExames} exames`);
            console.log(`    URL: ${urlInfo.url.substring(0, 80)}...`);
        });

        // 6. SALVAR RESULTADO
        console.log('\n💾 6. Salvando resultado...');
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `output/exemplo-urls-${timestamp}.json`;
        
        const resultado = {
            pacienteId: pacienteId,
            exemplo: "Como gerar URLs de impressão para exames do sistema HICD",
            dataGeracao: new Date().toISOString(),
            totalUrlsGeradas: urlsImpressao.length,
            exemploEspecifico: exemploEspecifico,
            todasAsUrls: urlsImpressao,
            comoUsar: {
                passo1: "Buscar exames com getExames(pacienteId)",
                passo2: "Gerar URLs com gerarUrlsImpressao(exames, coPaciente, tipoBusca)",
                passo3: "Usar a URL gerada para acessar diretamente os resultados",
                formato: "idPrint_LINHA=CODIGO&idPrint_LINHA=CODIGO...",
                observacao: "A query string é codificada em Base64 e incluída no parâmetro 'param'"
            }
        };
        
        fs.writeFileSync(filename, JSON.stringify(resultado, null, 2));
        console.log(`✅ Arquivo salvo: ${filename}`);
        
        console.log('\n🎉 EXEMPLO CONCLUÍDO COM SUCESSO!');
        console.log('=========================================================');
        console.log('💡 Agora você pode usar as URLs geradas para acessar');
        console.log('   diretamente os resultados dos exames no sistema HICD!');
        
    } catch (error) {
        console.error('❌ Erro durante o exemplo:', error.message);
    } finally {
        console.log('\n🔚 Finalizando...');
        await crawler.logout();
        console.log('✅ Logout realizado.');
    }
}

// Executar o exemplo
exemploUsoUrlsImpressao().catch(console.error);
