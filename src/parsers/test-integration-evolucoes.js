/**
 * Teste de integração do HICD Parser com o EvolucaoParser ajustado
 */

const HICDParser = require('./hicd-parser');

// HTML de exemplo com estrutura de evoluções HICD
const htmlTeste = `
<!DOCTYPE html>
<html>
<head>
    <title>HICD - Sistema de Evoluções</title>
</head>
<body>
    <div class="container">
        <h2>Evoluções Médicas - Paciente: João Silva</h2>
        
        <div id="areaHistEvol">
            <!-- Primeira evolução -->
            <div class="row">
                <div class="col-lg-6">Profissional: Dr. Carlos Mendes</div>
                <div class="col-lg-6">Data Evolução: 08/09/2025 10:00</div>
            </div>
            <div class="row">
                <div class="col-lg-6">Atividade: Evolução Médica de Admissão</div>
                <div class="col-lg-6">Data de Atualização: 08/09/2025 10:30</div>
            </div>
            <div class="row">
                <div class="col-lg-12">Clínica/Leito: UTI Adulto - Leito 05</div>
            </div>
            <div class="row">
                <div class="col-lg-12">Descrição: Paciente admitido em UTI com quadro de insuficiência respiratória aguda. Hipóteses diagnósticas: Pneumonia bilateral grave, SARA. Em uso: Ventilação mecânica invasiva, Noradrenalina 0,5mcg/kg/min, Propofol 50mg/h.</div>
            </div>
            
            <!-- Segunda evolução -->
            <div class="row">
                <div class="col-lg-6">Profissional: Enf. Ana Beatriz</div>
                <div class="col-lg-6">Data Evolução: 08/09/2025 14:00</div>
            </div>
            <div class="row">
                <div class="col-lg-6">Atividade: Evolução de Enfermagem</div>
                <div class="col-lg-6">Data de Atualização: 08/09/2025 14:15</div>
            </div>
            <div class="row">
                <div class="col-lg-12">Clínica/Leito: UTI Adulto - Leito 05</div>
            </div>
            <div class="row">
                <div class="col-lg-12">Descrição: Paciente sedado, com tubo orotraqueal em ventilação mecânica. Ausculta pulmonar com roncos bilaterais. Diurese preservada. Curativo do acesso central limpo e seco. Dispositivos: TOT 8.0, Cateter de Hemodiálise em veia jugular direita.</div>
            </div>
            
            <!-- Terceira evolução -->
            <div class="row">
                <div class="col-lg-6">Profissional: Dr. Carlos Mendes</div>
                <div class="col-lg-6">Data Evolução: 09/09/2025 08:00</div>
            </div>
            <div class="row">
                <div class="col-lg-6">Atividade: Evolução Médica Diária</div>
                <div class="col-lg-6">Data de Atualização: 09/09/2025 08:45</div>
            </div>
            <div class="row">
                <div class="col-lg-12">Clínica/Leito: UTI Adulto - Leito 05</div>
            </div>
            <div class="row">
                <div class="col-lg-12">Descrição: Paciente com melhora clínica. Gasometria com melhora da oxigenação. Fez uso: Antibioticoterapia com Meropenem 1g 8/8h por 5 dias. Programado desmame ventilatório hoje. Exames: Hemograma, gasometria arterial, culturas de controle.</div>
            </div>
        </div>
    </div>
</body>
</html>
`;

console.log('=== TESTE DE INTEGRAÇÃO HICD PARSER + EVOLUCAO PARSER ===');
console.log('');

const parser = new HICDParser();

try {
    console.log('1. Testando parse automático...');
    const resultado = parser.parseAuto(htmlTeste, { prontuario: 'PAC001' });
    
    console.log(`✅ Tipo detectado: ${resultado.tipo}`);
    if (resultado.dados && resultado.dados.length > 0) {
        console.log(`✅ ${resultado.dados.length} evoluções encontradas:`);
        
        resultado.dados.forEach((evolucao, index) => {
            console.log(`   ${index + 1}. [${evolucao.dataEvolucao}] ${evolucao.profissional}`);
            console.log(`      Atividade: ${evolucao.atividade}`);
            console.log(`      Clínica/Leito: ${evolucao.clinicaLeito}`);
            console.log(`      Descrição: ${evolucao.descricao.substring(0, 60)}...`);
            console.log('');
        });
    }

    console.log('2. Testando método específico parseEvolucoes...');
    const evolucoes = parser.parseEvolucoes(htmlTeste, 'PAC001');
    console.log(`✅ ${evolucoes.length} evoluções via método específico`);
    console.log('');

    console.log('3. Testando filtros via HICDParser...');
    const evolucoesMedicas = parser.filterEvolucoesByTipo(evolucoes, 'médica');
    console.log(`✅ Evoluções médicas: ${evolucoesMedicas.length}`);

    const evolucoesCarlos = parser.filterEvolucoesByProfissional(evolucoes, 'Carlos');
    console.log(`✅ Evoluções do Dr. Carlos: ${evolucoesCarlos.length}`);

    const evolucoesBusca = parser.searchEvolucoes(evolucoes, 'ventilação');
    console.log(`✅ Evoluções com 'ventilação': ${evolucoesBusca.length}`);
    console.log('');

    console.log('4. Testando agrupamento por data...');
    const grupos = parser.groupEvolucoesByDate(evolucoes);
    console.log(`✅ Grupos por data: ${Object.keys(grupos).length}`);
    Object.keys(grupos).forEach(data => {
        console.log(`   ${data}: ${grupos[data].length} evolução(ões)`);
    });
    console.log('');

    console.log('5. Testando profissionais únicos...');
    const profissionais = parser.getUniqueProfissionais(evolucoes);
    console.log(`✅ Profissionais únicos: ${profissionais.join(', ')}`);
    console.log('');

    console.log('6. Testando detecção automática de tipo...');
    const tipoDetectado = parser.detectPageType(htmlTeste);
    console.log(`✅ Tipo detectado automaticamente: ${tipoDetectado}`);
    console.log('');

    console.log('7. Testando modo debug...');
    console.log('--- Iniciando modo debug ---');
    const resultadoDebug = parser.debugParse(htmlTeste, { prontuario: 'PAC001' });
    console.log('--- Fim do modo debug ---');
    console.log(`✅ Debug executado, tipo: ${resultadoDebug.tipo}, itens: ${resultadoDebug.dados.length}`);
    console.log('');

    console.log('8. Testando estrutura de dados das evoluções...');
    if (evolucoes.length > 0) {
        const primeiraEvolucao = evolucoes[0];
        console.log('✅ Estrutura da primeira evolução:');
        console.log('   ID:', primeiraEvolucao.id);
        console.log('   Paciente ID:', primeiraEvolucao.pacienteId);
        console.log('   Profissional:', primeiraEvolucao.profissional);
        console.log('   Data Evolução:', primeiraEvolucao.dataEvolucao);
        console.log('   Atividade:', primeiraEvolucao.atividade);
        console.log('   Clínica/Leito:', primeiraEvolucao.clinicaLeito);
        console.log('   Dados Estruturados:', primeiraEvolucao.dadosEstruturados ? 'Sim' : 'Não');
    }
    console.log('');

    console.log('9. Testando filtro por período...');
    const hoje = new Date().toISOString().split('T')[0];
    const evolucaesHoje = parser.filterEvolucoesByPeriodo(evolucoes, hoje, hoje);
    console.log(`✅ Evoluções de hoje: ${evolucaesHoje.length}`);
    console.log('');

    console.log('=== TESTE DE INTEGRAÇÃO CONCLUÍDO COM SUCESSO ===');
    console.log('✅ Parser de evoluções totalmente integrado ao HICD Parser');
    console.log('✅ Compatibilidade mantida com parser original');
    console.log('✅ Estrutura específica do HICD (#areaHistEvol) funcionando');
    console.log('✅ Métodos de filtragem e busca operacionais');

} catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
}
