const HICDCrawler = require('./hicd-crawler');

async function testCrawler() {
    console.log('🧪 Iniciando teste do HICD Crawler...');
    console.log('=====================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // Teste apenas do login
        console.log('🔐 Testando processo de login...');
        await crawler.login();
        
        console.log('✅ Login testado com sucesso!');
        
        // Teste de uma pequena extração
        console.log('📊 Testando extração básica...');
        const data = await crawler.extractData();
        
        console.log(`✅ Extração testada! Coletados ${data.length} registros de exemplo`);
        
        // Salvar dados de teste
        if (data.length > 0) {
            await crawler.saveData(data.slice(0, 5), 'json'); // Salvar apenas os primeiros 5 para teste
            console.log('✅ Salvamento testado com sucesso!');
        }
        
        console.log('=====================================');
        console.log('🎉 Todos os testes passaram!');
        
    } catch (error) {
        console.error('❌ Erro durante os testes:');
        console.error(error.message);
        console.error('Stack trace:', error.stack);
        
    } finally {
        await crawler.logout();
        console.log('🔚 Teste finalizado');
    }
}

// Executar teste apenas se este arquivo for chamado diretamente
if (require.main === module) {
    testCrawler();
}

module.exports = testCrawler;
