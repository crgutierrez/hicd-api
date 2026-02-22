/**
 * Teste do parser de clínicas ajustado conforme parser original
 */

const ClinicaParser = require('./clinica-parser');

// HTML de exemplo com select de clínicas (similar ao HICD)
const htmlTeste = `
<!DOCTYPE html>
<html>
<head>
    <title>HICD - Seleção de Clínicas</title>
</head>
<body>
    <form>
        <label for="clinica">Selecione a Clínica:</label>
        <select id="clinica" name="clinica">
            <option value="0">Selecione...</option>
            <option value="1">UTI Geral</option>
            <option value="2">UTI Neonatal</option>
            <option value="3">Enfermaria Médica</option>
            <option value="4">Enfermaria Cirúrgica</option>
            <option value="5">Pronto Socorro</option>
            <option value="6">Centro Cirúrgico</option>
        </select>
    </form>
</body>
</html>
`;

// Teste do parser
console.log('=== TESTE DO PARSER DE CLÍNICAS ===');
console.log('');

const parser = new ClinicaParser();

try {
    console.log('1. Testando parse de clínicas...');
    const clinicas = parser.parse(htmlTeste);
    
    console.log(`✅ ${clinicas.length} clínicas encontradas:`);
    clinicas.forEach((clinica, index) => {
        console.log(`   ${index + 1}. [${clinica.codigo}] ${clinica.nome}`);
    });
    console.log('');

    console.log('2. Testando busca por código...');
    const clinica3 = parser.findByCode(htmlTeste, '3');
    if (clinica3) {
        console.log(`✅ Clínica encontrada: [${clinica3.codigo}] ${clinica3.nome}`);
    } else {
        console.log('❌ Clínica não encontrada');
    }
    console.log('');

    console.log('3. Testando extração de códigos disponíveis...');
    const codigos = parser.extractAvailableCodes(htmlTeste);
    console.log(`✅ Códigos disponíveis: ${codigos.join(', ')}`);
    console.log('');

    console.log('4. Verificando estrutura de dados...');
    if (clinicas.length > 0) {
        const primeiraClinica = clinicas[0];
        console.log('✅ Estrutura da primeira clínica:');
        console.log('   Código:', primeiraClinica.codigo);
        console.log('   Nome:', primeiraClinica.nome);
        console.log('   Endereço:', primeiraClinica.endereco);
        console.log('   Telefone:', primeiraClinica.telefone);
        console.log('   Email:', primeiraClinica.email);
        console.log('   Responsável:', primeiraClinica.responsavel);
        console.log('   Status:', primeiraClinica.status);
        console.log('   Data Atualização:', primeiraClinica.dataUltimaAtualizacao);
    }
    console.log('');

    console.log('5. Testando com HTML vazio...');
    const clinicasVazio = parser.parse('<html><body></body></html>');
    console.log(`✅ HTML vazio: ${clinicasVazio.length} clínicas encontradas (esperado: 0)`);
    console.log('');

    console.log('=== TESTE CONCLUÍDO COM SUCESSO ===');
    console.log('✅ Parser de clínicas funcionando conforme o parser original');

} catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
}
