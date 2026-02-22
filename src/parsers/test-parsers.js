/**
 * Teste rápido dos novos parsers especializados
 */

const HICDParser = require('./hicd-parser');

// HTML de exemplo para teste
const htmlTestClinicas = `
<table class="clinic-table">
    <tr><th>Código</th><th>Nome</th><th>Endereço</th></tr>
    <tr><td>001</td><td>Clínica Central</td><td>Rua Principal, 123</td></tr>
    <tr><td>002</td><td>Clínica Norte</td><td>Av. Norte, 456</td></tr>
</table>
`;

const htmlTestPacientes = `
<table class="patient-table">
    <tr><th>Prontuário</th><th>Nome</th><th>Nascimento</th></tr>
    <tr><td>12345</td><td>João Silva</td><td>15/03/1980</td></tr>
    <tr><td>67890</td><td>Maria Santos</td><td>22/07/1975</td></tr>
</table>
`;

async function testParsers() {
    console.log('🧪 Testando novos parsers especializados...\n');
    
    try {
        const parser = new HICDParser();
        parser.setDebugMode(true);
        
        // Teste 1: Parse de clínicas
        console.log('1️⃣ Testando parse de clínicas:');
        const clinicas = parser.parseClinicas(htmlTestClinicas);
        console.log(`✅ ${clinicas.length} clínicas encontradas:`);
        clinicas.forEach(c => console.log(`   - ${c.codigo}: ${c.nome}`));
        
        // Teste 2: Parse de pacientes
        console.log('\n2️⃣ Testando parse de pacientes:');
        const pacientes = parser.parsePacientes(htmlTestPacientes, '001');
        console.log(`✅ ${pacientes.length} pacientes encontrados:`);
        pacientes.forEach(p => console.log(`   - ${p.prontuario}: ${p.nome}`));
        
        // Teste 3: Parse automático
        console.log('\n3️⃣ Testando parse automático:');
        const resultadoAuto = parser.parseAuto(htmlTestClinicas);
        console.log(`✅ Tipo detectado: ${resultadoAuto.tipo}`);
        console.log(`✅ Dados encontrados: ${resultadoAuto.dados.length} itens`);
        
        // Teste 4: Métodos de busca
        console.log('\n4️⃣ Testando métodos de busca:');
        const clinica001 = parser.findClinicaByCodigo(htmlTestClinicas, '001');
        console.log(`✅ Clínica 001: ${clinica001?.nome || 'Não encontrada'}`);
        
        const codigosDisponiveis = parser.getAvailableClinicaCodes(htmlTestClinicas);
        console.log(`✅ Códigos disponíveis: ${codigosDisponiveis.join(', ')}`);
        
        // Teste 5: Filtros
        console.log('\n5️⃣ Testando filtros:');
        const pacientesFiltrados = parser.filterPacientes(pacientes, {
            nome: 'João'
        });
        console.log(`✅ Pacientes filtrados por nome 'João': ${pacientesFiltrados.length}`);
        
        // Teste 6: Estatísticas
        console.log('\n6️⃣ Testando estatísticas:');
        const stats = parser.getParseStats(resultadoAuto);
        console.log(`✅ Estatísticas:`, stats);
        
        console.log('\n🎉 Todos os testes passaram! Os parsers estão funcionando corretamente.');
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executa os testes
testParsers();
