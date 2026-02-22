/**
 * Teste do parseClinicas com modelo Clinica
 */

const HICDParser = require('./hicd-parser');

// HTML de exemplo com select de clínicas (formato real do HICD)
const htmlTestClinicasReal = `
<html>
<body>
    <select id="clinica" name="clinica">
        <option value="0">Selecione uma clínica</option>
        <option value="001">Clínica Médica</option>
        <option value="002">UTI Geral</option>
        <option value="003">Cardiologia</option>
        <option value="004">Enfermaria 1</option>
        <option value="005">Pediatria</option>
    </select>
</body>
</html>
`;

async function testParseClinicasModelo() {
    console.log('🧪 Testando parseClinicas com modelo Clinica...\n');
    
    try {
        const parser = new HICDParser();
        parser.setDebugMode(true);
        
        console.log('1️⃣ Testando parse de clínicas com modelo:');
        const clinicas = parser.parseClinicas(htmlTestClinicasReal);
        
        console.log(`✅ ${clinicas.length} clínicas encontradas\n`);
        
        // Verifica se são instâncias do modelo Clinica
        console.log('2️⃣ Verificando instâncias do modelo:');
        clinicas.forEach((clinica, index) => {
            const isClinicaModel = clinica.constructor.name === 'Clinica';
            const temMetodos = typeof clinica.toResumo === 'function' && typeof clinica.isValid === 'function';
            
            console.log(`   ${index + 1}. [${clinica.codigo}] ${clinica.nome}`);
            console.log(`      - É instância Clinica: ${isClinicaModel ? '✅' : '❌'}`);
            console.log(`      - Tem métodos do modelo: ${temMetodos ? '✅' : '❌'}`);
            console.log(`      - É válida: ${clinica.isValid() ? '✅' : '❌'}`);
            console.log('');
        });
        
        // Testa métodos do modelo
        console.log('3️⃣ Testando métodos do modelo:');
        const primeiraClinica = clinicas[0];
        if (primeiraClinica) {
            console.log(`   - toResumo():`, primeiraClinica.toResumo());
            console.log(`   - toDetalhado():`, primeiraClinica.toDetalhado());
            console.log(`   - toString():`, primeiraClinica.toString());
            console.log(`   - toJSON():`, JSON.stringify(primeiraClinica.toJSON(), null, 2));
        }
        
        // Testa comparação
        console.log('\n4️⃣ Testando comparação entre clínicas:');
        if (clinicas.length >= 2) {
            const clinica1 = clinicas[0];
            const clinica2 = clinicas[1];
            console.log(`   - ${clinica1.toString()} === ${clinica2.toString()}: ${clinica1.equals(clinica2) ? '✅' : '❌'}`);
        }
        
        // Testa atualização
        console.log('\n5️⃣ Testando atualização de dados:');
        if (clinicas.length > 0) {
            const clinica = clinicas[0];
            console.log(`   - Antes: ${clinica.nome}`);
            clinica.update({ 
                nome: 'Clínica Médica Atualizada',
                endereco: 'Rua das Flores, 123',
                totalPacientes: 42
            });
            console.log(`   - Depois: ${clinica.nome}`);
            console.log(`   - Endereço: ${clinica.endereco}`);
            console.log(`   - Total pacientes: ${clinica.totalPacientes}`);
        }
        
        console.log('\n🎉 Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executa o teste
testParseClinicasModelo();
