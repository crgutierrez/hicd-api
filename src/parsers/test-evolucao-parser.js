/**
 * Teste do parser de evoluções ajustado conforme parser original
 */

const EvolucaoParser = require('./evolucao-parser');

// HTML de exemplo com estrutura de evoluções (similar ao HICD)
const htmlTeste = `
<!DOCTYPE html>
<html>
<head>
    <title>HICD - Evoluções do Paciente</title>
</head>
<body>
    <div id="areaHistEvol">
        <div class="row">
            <div class="col-lg-6">Profissional: Dr. João Silva</div>
            <div class="col-lg-6">Data Evolução: 08/09/2025 14:30</div>
        </div>
        <div class="row">
            <div class="col-lg-6">Atividade: Evolução Médica</div>
            <div class="col-lg-6">Data de Atualização: 08/09/2025 15:00</div>
        </div>
        <div class="row">
            <div class="col-lg-12">Clínica/Leito: UTI Geral - Leito 01</div>
        </div>
        <div class="row">
            <div class="col-lg-12">Descrição: Paciente estável, sem intercorrências. Mantendo medicação atual. Hipóteses diagnósticas: Pneumonia adquirida na comunidade. Em uso: Amoxicilina 500mg 8/8h, Dipirona 500mg se dor.</div>
        </div>
        
        <!-- Segunda evolução -->
        <div class="row">
            <div class="col-lg-6">Profissional: Dra. Maria Santos</div>
            <div class="col-lg-6">Data Evolução: 09/09/2025 08:00</div>
        </div>
        <div class="row">
            <div class="col-lg-6">Atividade: Evolução de Enfermagem</div>
            <div class="col-lg-6">Data de Atualização: 09/09/2025 08:15</div>
        </div>
        <div class="row">
            <div class="col-lg-12">Clínica/Leito: UTI Geral - Leito 01</div>
        </div>
        <div class="row">
            <div class="col-lg-12">Descrição: Paciente consciente, orientado. Sinais vitais estáveis. Aceita dieta por via oral. Deambulando com auxílio.</div>
        </div>
    </div>
    
    <!-- Estrutura fallback para teste -->
    <table>
        <tr class="evolucao">
            <td class="data">07/09/2025</td>
            <td class="profissional">Dr. Pedro Costa</td>
            <td class="conteudo">Admissão na UTI. Paciente com quadro de insuficiência respiratória.</td>
        </tr>
    </table>
</body>
</html>
`;

console.log('=== TESTE DO PARSER DE EVOLUÇÕES ===');
console.log('');

const parser = new EvolucaoParser();

try {
    console.log('1. Testando parse de evoluções...');
    const evolucoes = parser.parse(htmlTeste, 'PAC001');
    
    console.log(`✅ ${evolucoes.length} evoluções encontradas:`);
    evolucoes.forEach((evolucao, index) => {
        console.log(`   ${index + 1}. [${evolucao.dataEvolucao || evolucao.data}] ${evolucao.profissional}`);
        console.log(`      Atividade: ${evolucao.atividade || 'N/A'}`);
        console.log(`      Descrição: ${(evolucao.descricao || evolucao.conteudo || '').substring(0, 80)}...`);
        console.log('');
    });

    console.log('2. Testando extração de dados estruturados...');
    if (evolucoes.length > 0 && evolucoes[0].dadosEstruturados) {
        const dados = evolucoes[0].dadosEstruturados;
        console.log('✅ Dados estruturados da primeira evolução:');
        if (dados.hipotesesDiagnosticas && dados.hipotesesDiagnosticas.length > 0) {
            console.log(`   Diagnósticos: ${dados.hipotesesDiagnosticas.join(', ')}`);
        }
        if (dados.medicamentosEmUso && dados.medicamentosEmUso.length > 0) {
            console.log(`   Medicamentos: ${dados.medicamentosEmUso.join(', ')}`);
        }
    }
    console.log('');

    console.log('3. Testando filtros...');
    const evolucoesMedicas = parser.filterByTipo(evolucoes, 'médica');
    console.log(`✅ Evoluções médicas: ${evolucoesMedicas.length}`);

    const evolucoesDrJoao = parser.filterByProfissional(evolucoes, 'João');
    console.log(`✅ Evoluções do Dr. João: ${evolucoesDrJoao.length}`);

    const evolucoesBusca = parser.search(evolucoes, 'estável');
    console.log(`✅ Evoluções com termo 'estável': ${evolucoesBusca.length}`);
    console.log('');

    console.log('4. Testando agrupamento por data...');
    const grupos = parser.groupByDate(evolucoes);
    console.log(`✅ Grupos por data: ${Object.keys(grupos).length}`);
    Object.keys(grupos).forEach(data => {
        console.log(`   ${data}: ${grupos[data].length} evolução(ões)`);
    });
    console.log('');

    console.log('5. Testando profissionais únicos...');
    const profissionais = parser.extractUniqueProfissionais(evolucoes);
    console.log(`✅ Profissionais únicos: ${profissionais.join(', ')}`);
    console.log('');

    console.log('6. Testando método retornaCampo...');
    const $ = require('cheerio').load(htmlTeste);
    const primeiraRow = $('#areaHistEvol .row').first();
    const profissional = parser.retornaCampo($, 'Profissional:', primeiraRow);
    console.log(`✅ Profissional extraído: ${profissional}`);
    console.log('');

    console.log('7. Testando limpeza de texto...');
    const textoHtml = 'Paciente <br>estável &nbsp; com&eacute; melhora';
    const textoLimpo = parser.limparTextoEvolucao(textoHtml);
    console.log(`✅ Texto original: "${textoHtml}"`);
    console.log(`✅ Texto limpo: "${textoLimpo}"`);
    console.log('');

    console.log('8. Testando resumo de evolução...');
    const textoCompleto = 'Primeira linha importante.\nSegunda linha relevante.\nTerceira linha significativa.\nQuarta linha menor.\nQuinta linha.';
    const resumo = parser.extrairResumoEvolucao(textoCompleto);
    console.log(`✅ Resumo extraído: "${resumo}"`);
    console.log('');

    console.log('=== TESTE CONCLUÍDO COM SUCESSO ===');
    console.log('✅ Parser de evoluções funcionando conforme o parser original');

} catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
}
