#!/usr/bin/env node

/**
 * Script de configuração inicial do HICD Crawler
 * 
 * Execute este script para configurar rapidamente o crawler
 * com suas credenciais e preferências.
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
    console.log('🚀 Configuração Inicial do HICD Crawler');
    console.log('=======================================\n');
    
    try {
        // Coletrar credenciais
        console.log('📝 Configuração de Credenciais:');
        const username = await question('Digite seu usuário HICD: ');
        const password = await question('Digite sua senha HICD: ');
        
        console.log('\n⚙️ Configurações de Performance:');
        const requestDelay = await question('Delay entre requisições (ms) [1000]: ') || '1000';
        const maxRetries = await question('Máximo de tentativas [3]: ') || '3';
        
        console.log('\n📁 Configurações de Saída:');
        const outputFormat = await question('Formato preferido (json/csv) [json]: ') || 'json';
        const verboseLogging = await question('Logs detalhados? (true/false) [true]: ') || 'true';
        
        // Criar arquivo .env
        const envContent = `# Configurações do HICD Crawler
# Gerado automaticamente em ${new Date().toISOString()}

# Credenciais de login
HICD_USERNAME=${username}
HICD_PASSWORD=${password}

# Configurações de Rate Limiting
REQUEST_DELAY=${requestDelay}
MAX_RETRIES=${maxRetries}

# Configurações de Output
OUTPUT_FORMAT=${outputFormat}
OUTPUT_DIR=./output

# Configurações de Debug
DEBUG_MODE=false
VERBOSE_LOGGING=${verboseLogging}
`;

        await fs.writeFile('.env', envContent);
        console.log('\n✅ Arquivo .env criado com sucesso!');
        
        // Criar diretório de saída
        try {
            await fs.access('./output');
        } catch {
            await fs.mkdir('./output', { recursive: true });
            console.log('✅ Diretório de saída criado!');
        }
        
        // Teste básico de configuração
        console.log('\n🧪 Testando configuração...');
        
        const HICDCrawler = require('./hicd-crawler');
        const crawler = new HICDCrawler();
        
        if (crawler.username === username) {
            console.log('✅ Credenciais carregadas corretamente!');
        } else {
            console.log('⚠️ Problemas ao carregar credenciais');
        }
        
        console.log('\n🎉 Configuração concluída!');
        console.log('\nPróximos passos:');
        console.log('1. Execute "npm test" para testar o crawler');
        console.log('2. Execute "npm start" para uma execução completa');
        console.log('3. Execute "npm run examples" para ver exemplos avançados');
        console.log('\n📖 Consulte o README.md para mais informações');
        
    } catch (error) {
        console.error('\n❌ Erro durante a configuração:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

async function checkSetup() {
    console.log('🔍 Verificando configuração atual...\n');
    
    // Verificar .env
    try {
        await fs.access('.env');
        console.log('✅ Arquivo .env encontrado');
        
        const envContent = await fs.readFile('.env', 'utf8');
        const hasUsername = envContent.includes('HICD_USERNAME=');
        const hasPassword = envContent.includes('HICD_PASSWORD=');
        
        if (hasUsername && hasPassword) {
            console.log('✅ Credenciais configuradas');
        } else {
            console.log('⚠️ Credenciais incompletas no .env');
        }
    } catch {
        console.log('❌ Arquivo .env não encontrado');
    }
    
    // Verificar diretório de saída
    try {
        await fs.access('./output');
        console.log('✅ Diretório de saída existe');
    } catch {
        console.log('❌ Diretório de saída não existe');
    }
    
    // Verificar dependências
    try {
        require('./hicd-crawler');
        console.log('✅ Dependências carregadas');
    } catch (error) {
        console.log('❌ Problemas com dependências:', error.message);
    }
    
    console.log('\nExecute "npm run setup" para reconfigurar');
}

// Analisar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--check') || args.includes('-c')) {
    checkSetup();
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Uso: node setup.js [opções]

Opções:
  --check, -c    Verificar configuração atual
  --help, -h     Mostrar esta mensagem

Sem opções: Executar configuração interativa
`);
} else {
    setup();
}

module.exports = { setup, checkSetup };
