/**
 * Exemplo de uso do HICD Crawler
 * 
 * Este arquivo demonstra como usar o crawler de forma mais avançada
 * com configurações personalizadas e tratamento específico de dados.
 */

const HICDCrawler = require('./hicd-crawler');

async function exemploBasico() {
    console.log('📋 Exemplo Básico de Uso');
    console.log('========================');
    
    const crawler = new HICDCrawler();
    
    try {
        await crawler.login();
        const data = await crawler.extractData();
        await crawler.saveData(data, 'json');
        console.log(`✅ Sucesso! Coletados ${data.length} registros`);
    } finally {
        await crawler.logout();
    }
}

async function exemploPersonalizado() {
    console.log('🎯 Exemplo com Configurações Personalizadas');
    console.log('===========================================');
    
    const crawler = new HICDCrawler();
    
    // Configurar delays personalizados
    crawler.requestDelay = 2000; // 2 segundos entre requisições
    crawler.maxRetries = 5;      // Máximo 5 tentativas
    
    try {
        await crawler.login();
        
        // Extrair dados com processamento personalizado
        console.log('[CUSTOM] Iniciando extração personalizada...');
        const data = await crawler.extractData();
        
        // Filtrar dados específicos
        const filteredData = data.filter(item => {
            // Exemplo: filtrar apenas registros com título específico
            return item.title && item.title.includes('prontuario');
        });
        
        console.log(`[CUSTOM] Dados filtrados: ${filteredData.length}/${data.length}`);
        
        // Salvar em ambos os formatos
        await crawler.saveData(filteredData, 'json');
        await crawler.saveData(filteredData, 'csv');
        
        console.log('✅ Extração personalizada concluída!');
        
    } finally {
        await crawler.logout();
    }
}

async function exemploComTratamentoErros() {
    console.log('🛡️ Exemplo com Tratamento Avançado de Erros');
    console.log('============================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // Tentativa de login com tratamento específico
        let loginSuccess = false;
        let attempts = 0;
        const maxLoginAttempts = 3;
        
        while (!loginSuccess && attempts < maxLoginAttempts) {
            try {
                attempts++;
                console.log(`[RETRY] Tentativa de login ${attempts}/${maxLoginAttempts}`);
                await crawler.login();
                loginSuccess = true;
            } catch (loginError) {
                console.error(`[RETRY] Falha na tentativa ${attempts}:`, loginError.message);
                
                if (attempts < maxLoginAttempts) {
                    console.log('[RETRY] Aguardando antes da próxima tentativa...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    throw new Error(`Login falhou após ${maxLoginAttempts} tentativas`);
                }
            }
        }
        
        // Extração com tratamento de páginas individuais
        console.log('[ROBUST] Iniciando extração robusta...');
        const allData = [];
        const errors = [];
        
        try {
            const data = await crawler.extractData();
            allData.push(...data);
        } catch (extractError) {
            errors.push({
                type: 'extraction',
                message: extractError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Salvar dados mesmo com alguns erros
        if (allData.length > 0) {
            await crawler.saveData(allData, 'json');
            console.log(`✅ Salvos ${allData.length} registros com sucesso`);
        }
        
        // Salvar relatório de erros
        if (errors.length > 0) {
            const errorReport = {
                timestamp: new Date().toISOString(),
                totalErrors: errors.length,
                errors: errors
            };
            
            const fs = require('fs').promises;
            await fs.writeFile(
                './output/error-report.json',
                JSON.stringify(errorReport, null, 2)
            );
            console.log(`⚠️ Relatório de erros salvo: ${errors.length} erros encontrados`);
        }
        
    } finally {
        await crawler.logout();
    }
}

async function exemploMonitoramento() {
    console.log('📊 Exemplo com Monitoramento de Performance');
    console.log('===========================================');
    
    const crawler = new HICDCrawler();
    const startTime = Date.now();
    
    try {
        console.log('[MONITOR] Iniciando monitoramento...');
        
        // Login com tempo
        const loginStart = Date.now();
        await crawler.login();
        const loginTime = Date.now() - loginStart;
        console.log(`[MONITOR] Login concluído em ${loginTime}ms`);
        
        // Extração com tempo
        const extractStart = Date.now();
        const data = await crawler.extractData();
        const extractTime = Date.now() - extractStart;
        console.log(`[MONITOR] Extração concluída em ${extractTime}ms`);
        
        // Salvamento com tempo
        const saveStart = Date.now();
        await crawler.saveData(data, 'json');
        const saveTime = Date.now() - saveStart;
        console.log(`[MONITOR] Salvamento concluído em ${saveTime}ms`);
        
        // Relatório final
        const totalTime = Date.now() - startTime;
        const performance = {
            timestamp: new Date().toISOString(),
            totalExecutionTime: totalTime,
            loginTime: loginTime,
            extractionTime: extractTime,
            saveTime: saveTime,
            recordsPerSecond: Math.round((data.length / totalTime) * 1000),
            totalRecords: data.length
        };
        
        console.log('[MONITOR] Relatório de Performance:');
        console.log(JSON.stringify(performance, null, 2));
        
        // Salvar relatório de performance
        const fs = require('fs').promises;
        await fs.writeFile(
            './output/performance-report.json',
            JSON.stringify(performance, null, 2)
        );
        
    } finally {
        await crawler.logout();
        const totalTime = Date.now() - startTime;
        console.log(`[MONITOR] Execução total: ${totalTime}ms`);
    }
}

// Menu de exemplos
async function main() {
    const examples = [
        { name: 'Básico', fn: exemploBasico },
        { name: 'Personalizado', fn: exemploPersonalizado },
        { name: 'Tratamento de Erros', fn: exemploComTratamentoErros },
        { name: 'Monitoramento', fn: exemploMonitoramento }
    ];
    
    console.log('🚀 Exemplos do HICD Crawler');
    console.log('===========================');
    console.log('Escolha um exemplo para executar:');
    
    examples.forEach((example, index) => {
        console.log(`${index + 1}. ${example.name}`);
    });
    
    // Para este exemplo, vamos executar o básico
    // Em um ambiente real, você poderia usar readline para escolha interativa
    const selectedExample = examples[0]; // Exemplo básico
    
    console.log(`\n📋 Executando: ${selectedExample.name}`);
    await selectedExample.fn();
}

// Executar apenas se este arquivo for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    exemploBasico,
    exemploPersonalizado,
    exemploComTratamentoErros,
    exemploMonitoramento
};
