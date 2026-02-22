/**
 * Teste do parseClinicas conforme parser original
 */

const HICDParser = require('./hicd-parser');

// HTML de teste simulando a estrutura original do HICD
const htmlTestClinicas = `
<!DOCTYPE html>
<html>
<head>
    <title>HICD - Sistema</title>
</head>
<body>
    <div>
        <label for="clinica">Selecione a Clínica:</label>
        <select id="clinica" name="clinica">
            <option value="0">Selecione...</option>
            <option value="001">Clínica Médica</option>
            <option value="002">Cardiologia</option>
            <option value="003">Neurologia</option>
            <option value="004">Pediatria</option>
            <option value="005">UTI Geral</option>
            <option value="006">Enfermaria Masculina</option>
            <option value="007">Enfermaria Feminina</option>
        </select>
    </div>
</body>
</html>
`;

async function testParseClinicas() {
    console.log('🧪 Testando parseClinicas conforme parser original...\n');
    
    const parser = new HICDParser();
    parser.setDebugMode(true);
    
    try {
        const clinicas = parser.parseClinicas(htmlTestClinicas);
        
        console.log(`✅ Parse concluído: ${clinicas.length} clínicas encontradas\n`);
        
        console.log('📋 Lista de clínicas:');
        clinicas.forEach((clinica, index) => {
            console.log(`${index + 1}. Código: ${clinica.codigo} | Nome: ${clinica.nome}`);
        });
        
        // Verificações específicas
        console.log('\n🔍 Verificações:');
        
        // Deve ignorar a option com value="0"
        const temOpcaoZero = clinicas.some(c => c.codigo === '0');
        console.log(`- Ignora opção "Selecione..." (value="0"): ${!temOpcaoZero ? '✅' : '❌'}`);
        
        // Deve ter exatamente 7 clínicas (ignorando a primeira)
        console.log(`- Quantidade esperada (7): ${clinicas.length === 7 ? '✅' : '❌'}`);
        
        // Verifica estrutura dos objetos
        const estruturaCorreta = clinicas.every(c => 
            c.hasOwnProperty('codigo') && 
            c.hasOwnProperty('nome') &&
            typeof c.codigo === 'string' &&
            typeof c.nome === 'string'
        );
        console.log(`- Estrutura dos objetos correta: ${estruturaCorreta ? '✅' : '❌'}`);
        
        // Testa clínicas específicas
        const clinicaMedica = clinicas.find(c => c.codigo === '001');
        const utiGeral = clinicas.find(c => c.codigo === '005');
        
        console.log(`- Clínica Médica (001) encontrada: ${clinicaMedica ? '✅' : '❌'}`);
        console.log(`- UTI Geral (005) encontrada: ${utiGeral ? '✅' : '❌'}`);
        
        if (clinicaMedica) {
            console.log(`- Nome da Clínica Médica: "${clinicaMedica.nome}"`);
        }
        
        if (utiGeral) {
            console.log(`- Nome da UTI Geral: "${utiGeral.nome}"`);
        }
        
        console.log('\n🎉 Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executa o teste
testParseClinicas();
