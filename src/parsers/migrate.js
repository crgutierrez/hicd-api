/**
 * Script de migração do parser monolítico para parsers especializados
 * Mantém compatibilidade total com código existente
 */

const fs = require('fs');
const path = require('path');

// Verifica se existe backup do parser original
const originalParserPath = path.join(__dirname, 'hicd-parser.js');
const backupParserPath = path.join(__dirname, 'hicd-parser-original.js');
const newParserPath = path.join(__dirname, 'hicd-parser-new.js');

function createBackup() {
    console.log('🔄 Criando backup do parser original...');
    
    if (fs.existsSync(originalParserPath)) {
        if (!fs.existsSync(backupParserPath)) {
            fs.copyFileSync(originalParserPath, backupParserPath);
            console.log('✅ Backup criado: hicd-parser-original.js');
        } else {
            console.log('ℹ️ Backup já existe: hicd-parser-original.js');
        }
    } else {
        console.log('⚠️ Parser original não encontrado');
    }
}

function replaceParser() {
    console.log('🔄 Substituindo parser por versão modular...');
    
    if (fs.existsSync(newParserPath)) {
        // Copia o novo parser sobre o antigo
        fs.copyFileSync(newParserPath, originalParserPath);
        console.log('✅ Parser substituído com sucesso');
        
        // Remove o arquivo temporário
        fs.unlinkSync(newParserPath);
        console.log('🧹 Arquivo temporário removido');
    } else {
        console.log('❌ Novo parser não encontrado');
        process.exit(1);
    }
}

function validateMigration() {
    console.log('🔍 Validando migração...');
    
    try {
        // Tenta importar o novo parser
        const HICDParser = require('./hicd-parser');
        const parser = new HICDParser();
        
        // Verifica se métodos essenciais existem
        const requiredMethods = [
            'setDebugMode',
            'parseClinicas',
            'parsePacientes',
            'parseExames',
            'parseEvolucoes'
        ];
        
        for (const method of requiredMethods) {
            if (typeof parser[method] !== 'function') {
                throw new Error(`Método ${method} não encontrado`);
            }
        }
        
        console.log('✅ Migração validada - todos os métodos essenciais disponíveis');
        return true;
        
    } catch (error) {
        console.error('❌ Erro na validação:', error.message);
        return false;
    }
}

function rollback() {
    console.log('🔙 Realizando rollback...');
    
    if (fs.existsSync(backupParserPath)) {
        fs.copyFileSync(backupParserPath, originalParserPath);
        console.log('✅ Rollback realizado com sucesso');
    } else {
        console.log('❌ Backup não encontrado para rollback');
    }
}

function showMigrationInfo() {
    console.log(`
📋 MIGRAÇÃO DO PARSER HICD
==========================

Esta migração substitui o parser monolítico por uma versão modular com:

✨ NOVOS RECURSOS:
  • Parsers especializados para cada entidade
  • Melhor organização e manutenibilidade do código
  • Funções de filtragem e busca avançadas
  • Detecção automática do tipo de página
  • Parse múltiplo para páginas complexas

🔄 COMPATIBILIDADE:
  • Mantém 100% de compatibilidade com código existente
  • Mesmos métodos e assinaturas
  • Backup automático do parser original

📁 NOVOS ARQUIVOS:
  • base-parser.js - Classe base com utilitários
  • clinica-parser.js - Parser especializado para clínicas
  • paciente-parser.js - Parser especializado para pacientes
  • exames-parser.js - Parser especializado para exames
  • evolucao-parser.js - Parser especializado para evoluções
  • prontuario-parser.js - Parser especializado para prontuários
  • index.js - Facilitador de importações

🚀 NOVOS MÉTODOS DISPONÍVEIS:
  • parseAuto() - Detecção automática do tipo
  • parseMultiple() - Parse de múltiplos tipos
  • filterPacientes() - Filtros avançados para pacientes
  • groupExamesByTipo() - Agrupamento de exames
  • filterEvolucoesByProfissional() - Filtros de evolução
  • E muitos outros...

`);
}

// Execução da migração
async function migrate() {
    showMigrationInfo();
    
    console.log('🚀 Iniciando migração...\n');
    
    try {
        // Passo 1: Criar backup
        createBackup();
        
        // Passo 2: Substituir parser
        replaceParser();
        
        // Passo 3: Validar migração
        const isValid = validateMigration();
        
        if (isValid) {
            console.log(`
✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!

O parser agora está modularizado e oferece novos recursos.
Para usar os parsers especializados diretamente:

const { ClinicaParser, PacienteParser } = require('./src/parsers');

Para usar o parser principal (recomendado):

const HICDParser = require('./src/parsers/hicd-parser');
const parser = new HICDParser();

Em caso de problemas, execute o rollback:
node src/parsers/migrate.js --rollback
`);
        } else {
            console.log('❌ Migração falhou, realizando rollback automático...');
            rollback();
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Erro durante migração:', error.message);
        console.log('🔙 Realizando rollback...');
        rollback();
        process.exit(1);
    }
}

// Verifica argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--rollback')) {
    console.log('🔙 Realizando rollback manual...');
    rollback();
} else if (args.includes('--info')) {
    showMigrationInfo();
} else {
    migrate();
}

module.exports = {
    migrate,
    rollback,
    validateMigration
};
