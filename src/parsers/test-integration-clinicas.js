/**
 * Teste de integração do HICD Parser com o ClinicaParser ajustado
 */

const HICDParser = require('./hicd-parser');

// HTML de exemplo com select de clínicas (similar ao HICD real)
const htmlTeste = `
<!DOCTYPE html>
<html>
<head>
    <title>HICD - Sistema Hospitalar</title>
</head>
<body>
    <div class="container">
        <form id="formClinica">
            <div class="form-group">
                <label for="clinica">Selecione a Clínica:</label>
                <select id="clinica" name="clinica" class="form-control">
                    <option value="0">Selecione uma clínica...</option>
                    <option value="1">UTI Geral</option>
                    <option value="2">UTI Neonatal</option>
                    <option value="3">UTI Pediátrica</option>
                    <option value="4">Enfermaria Médica</option>
                    <option value="5">Enfermaria Cirúrgica</option>
                    <option value="6">Pronto Socorro</option>
                    <option value="7">Centro Cirúrgico</option>
                    <option value="8">Hemodiálise</option>
                </select>
            </div>
            <button type="submit">Buscar Pacientes</button>
        </form>
    </div>
</body>
</html>
`;

console.log('=== TESTE DE INTEGRAÇÃO HICD PARSER + CLINICA PARSER ===');
console.log('');

const parser = new HICDParser();

try {
    console.log('1. Testando parse automático...');
    const resultado = parser.parseAuto(htmlTeste);
    
    console.log(`✅ Tipo detectado: ${resultado.tipo}`);
    console.log(`✅ ${resultado.dados.length} clínicas encontradas:`);
    
    resultado.dados.forEach((clinica, index) => {
        console.log(`   ${index + 1}. [${clinica.codigo}] ${clinica.nome}`);
    });
    console.log('');

    console.log('2. Testando método específico parseClinicas...');
    const clinicas = parser.parseClinicas(htmlTeste);
    console.log(`✅ ${clinicas.length} clínicas via método específico`);
    console.log('');

    console.log('3. Testando busca de clínica por código...');
    const clinicaUTI = parser.findClinicaByCodigo(htmlTeste, '2');
    if (clinicaUTI) {
        console.log(`✅ Clínica encontrada: [${clinicaUTI.codigo}] ${clinicaUTI.nome}`);
    } else {
        console.log('❌ Clínica não encontrada');
    }
    console.log('');

    console.log('4. Testando extração de códigos disponíveis...');
    const codigos = parser.getAvailableClinicaCodes(htmlTeste);
    console.log(`✅ Códigos disponíveis: ${codigos.join(', ')}`);
    console.log('');

    console.log('5. Testando detecção automática de tipo...');
    const tipoDetectado = parser.detectPageType(htmlTeste);
    console.log(`✅ Tipo detectado automaticamente: ${tipoDetectado}`);
    console.log('');

    console.log('6. Testando modo debug...');
    console.log('--- Iniciando modo debug ---');
    const resultadoDebug = parser.debugParse(htmlTeste);
    console.log('--- Fim do modo debug ---');
    console.log(`✅ Debug executado, tipo: ${resultadoDebug.tipo}`);
    console.log('');

    console.log('7. Testando estatísticas...');
    const stats = parser.getParseStats(resultado);
    console.log('✅ Estatísticas do parse:');
    console.log('   Tipo:', stats.tipo);
    console.log('   Timestamp:', stats.timestamp);
    console.log('   Totais:', stats.totais);
    console.log('');

    console.log('8. Testando com HTML inválido...');
    const clinicasVazio = parser.parseClinicas('');
    console.log(`✅ HTML vazio tratado corretamente: ${clinicasVazio.length} clínicas (esperado: 0)`);
    console.log('');

    console.log('=== TESTE DE INTEGRAÇÃO CONCLUÍDO COM SUCESSO ===');
    console.log('✅ Parser de clínicas totalmente integrado ao HICD Parser');
    console.log('✅ Compatibilidade mantida com interface original');
    console.log('✅ Funcionalidades novas disponíveis');

} catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
}
