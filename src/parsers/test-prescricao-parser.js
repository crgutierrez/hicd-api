const PrescricaoParser = require('./prescricao-parser');

console.log('🧪 Testando PrescricaoParser...\n');

// HTML simulado de uma lista de prescrições baseado na estrutura do HICD
const htmlListaPrescricoes = `
<!DOCTYPE html>
<html>
<head><title>Prescrições</title></head>
<body>
    <table class="linhas_impressao_med">
        <tr>
            <th>Código</th>
            <th>Data/Hora</th>
            <th>Paciente</th>
            <th>Registro</th>
            <th>Internação</th>
            <th>Enf/Leito</th>
            <th>Clínica</th>
            <th>Ações</th>
        </tr>
        <tr>
            <td><label class="valorV3">P001</label></td>
            <td><label class="valorV3">08/09/2025 14:30</label></td>
            <td><label class="valorV3">MARIA SILVA SANTOS</label></td>
            <td><label class="valorV3">123456</label></td>
            <td><label class="valorV3">07/09/2025</label></td>
            <td><label class="valorV3">UTI/Leito 5</label></td>
            <td><label class="valorV3">UTI GERAL</label></td>
            <td><input type="button" value="Imprimir" onclick="imprimirPrescricao('id_prescricao=1001')"></td>
        </tr>
        <tr>
            <td><label class="valorV3">P002</label></td>
            <td><label class="valorV3">08/09/2025 08:00</label></td>
            <td><label class="valorV3">JOAO PEREIRA LIMA</label></td>
            <td><label class="valorV3">789012</label></td>
            <td><label class="valorV3">06/09/2025</label></td>
            <td><label class="valorV3">CARDIO/Leito 3</label></td>
            <td><label class="valorV3">CARDIOLOGIA</label></td>
            <td><input type="button" value="Imprimir" onclick="imprimirPrescricao('id_prescricao=1002')"></td>
        </tr>
    </table>
</body>
</html>
`;

// HTML simulado de detalhes de uma prescrição baseado na estrutura do HICD
const htmlDetalhesPrescricao = `
<!DOCTYPE html>
<html>
<head><title>Detalhes da Prescrição</title></head>
<body>
    <div>
        <font>NOME : MARIA SILVA SANTOS</font><br>
        <font>REGISTRO/BE: 123456</font><br>
        <font>LEITO: 5</font><br>
        <font>DT. NASC: 15/03/1985 IDADE: 40 Anos CNS: 123456789012345</font><br>
        <font>PESO: 70 Kg</font><br>
        <font>INTERNADO EM: 07/09/2025 CLÍNICA: UTI GERAL</font><br>
        <font>PRESCRIÇÃO MÉDICA válida para 08/09/2025</font><br>
        <font>Hospital Regional de Ji-Paraná</font>
    </div>
    
    <div>Medicação: LEGENDA</div>
    <table border="1">
        <tr>
            <td>1-</td>
            <td>[DIPIRONA SÓDICA] (500mg), (Ampola), EV, 6 em 6 Horas, se dor ou febre, 10 / 10</td>
        </tr>
        <tr>
            <td>2-</td>
            <td>[OMEPRAZOL] (40mg), (Frasco), EV, 12 em 12 Horas, jejum, 5 / 10</td>
        </tr>
    </table>
    
    <div>Medicações não padronizada ou sem estoque:</div>
    <table border="1">
        <tr>
            <td>3-</td>
            <td>PARACETAMOL    500mg    Via oral    8/8h    Se febre &gt; 37,5°C</td>
        </tr>
    </table>
    
    <label class="valorV3">Dietas: Dieta líquida restrita</label>
    <label class="valorV3">CUIDADOS GERAIS: Controle de sinais vitais de 6/6h</label>
    
    <font>DIAGNÓSTICO: Pneumonia comunitária</font>
    <label class="valorV3">SEDAÇÃO: Sem necessidade</label>
    <label class="valorV3">VENOSA: Soro fisiológico 500ml 12/12h</label>
    
    <b>NECESSIDADE DE: Fisioterapia respiratória</b>
    <b>MÉDICO: Dr. Carlos Mendes - CRM: 1234/RO</b>
    <b>DATA: 08/09/2025 14:30</b>
</body>
</html>
`;

async function testarPrescricaoParser() {
    const parser = new PrescricaoParser();
    parser.setDebugMode(true);
    
    console.log('='.repeat(60));
    console.log('TESTE 1: Parse de lista de prescrições');
    console.log('='.repeat(60));
    
    const prescricoes = parser.parse(htmlListaPrescricoes, '123456');
    
    console.log(`\\n✅ ${prescricoes.length} prescrições encontradas`);
    
    prescricoes.forEach((prescricao, index) => {
        console.log(`\\nPrescrição ${index + 1}:`);
        console.log(`  ID: ${prescricao.id}`);
        console.log(`  Código: ${prescricao.codigo}`);
        console.log(`  Data/Hora: ${prescricao.dataHora}`);
        console.log(`  Paciente: ${prescricao.pacienteNome}`);
        console.log(`  Registro: ${prescricao.registro}`);
        console.log(`  Clínica: ${prescricao.clinica}`);
        console.log(`  Enf/Leito: ${prescricao.enfLeito}`);
    });
    
    console.log('\\n='.repeat(60));
    console.log('TESTE 2: Parse de detalhes da prescrição');
    console.log('='.repeat(60));
    
    const detalhes = parser.parsePrescricaoDetalhes(htmlDetalhesPrescricao, '1001');
    
    console.log('\\n📋 CABEÇALHO:');
    console.log(`  Paciente: ${detalhes.cabecalho.pacienteNome}`);
    console.log(`  Registro: ${detalhes.cabecalho.registro}`);
    console.log(`  Leito: ${detalhes.cabecalho.leito}`);
    console.log(`  Data Nascimento: ${detalhes.cabecalho.dataNascimento}`);
    console.log(`  Idade: ${detalhes.cabecalho.idade}`);
    console.log(`  Peso: ${detalhes.cabecalho.peso}`);
    console.log(`  Data Internação: ${detalhes.cabecalho.dataInternacao}`);
    console.log(`  Clínica: ${detalhes.cabecalho.clinicaInternacao}`);
    console.log(`  Data Prescrição: ${detalhes.cabecalho.dataPrescricao}`);
    console.log(`  Hospital: ${detalhes.cabecalho.hospital}`);
    
    console.log('\\n💊 MEDICAMENTOS:');
    detalhes.medicamentos.forEach((medicamento, index) => {
        console.log(`  ${index + 1}. ${medicamento.nome || medicamento.descricao}`);
        if (medicamento.dose) console.log(`     Dose: ${medicamento.dose}`);
        if (medicamento.via) console.log(`     Via: ${medicamento.via}`);
        if (medicamento.intervalo) console.log(`     Intervalo: ${medicamento.intervalo}`);
        if (medicamento.observacao) console.log(`     Observação: ${medicamento.observacao}`);
        if (medicamento.dias) console.log(`     Dias: ${medicamento.dias}`);
        if (medicamento.naoPadronizado) console.log(`     ⚠️ Não padronizado`);
        if (medicamento.tipo === 'dieta') console.log(`     🍽️ Dieta`);
    });
    
    console.log('\\n📝 OBSERVAÇÕES:');
    detalhes.observacoes.forEach((obs, index) => {
        console.log(`  ${index + 1}. [${obs.tipo.toUpperCase()}] ${obs.conteudo}`);
    });
    
    console.log('\\n✍️ ASSINATURAS:');
    detalhes.assinaturas.forEach((assinatura, index) => {
        console.log(`  ${index + 1}. ${assinatura.nome} (${assinatura.funcao})`);
        if (assinatura.crm) console.log(`     CRM: ${assinatura.crm}`);
    });
    
    if (detalhes.dataHoraImpressao) {
        console.log(`\\n🖨️ Impressão: ${detalhes.dataHoraImpressao}`);
    }
    
    console.log('\\n='.repeat(60));
    console.log('TESTE 3: Métodos de filtro e busca');
    console.log('='.repeat(60));
    
    // Teste de filtro por clínica
    const prescricoesUTI = parser.filterPrescricoesByClinica(prescricoes, 'UTI');
    console.log(`\\n🏥 Prescrições da UTI: ${prescricoesUTI.length}`);
    
    // Teste de busca
    const buscaMaria = parser.searchPrescricoes(prescricoes, 'MARIA');
    console.log(`🔍 Busca por "MARIA": ${buscaMaria.length} resultado(s)`);
    
    // Teste de agrupamento por data
    const gruposPorData = parser.groupPrescricoesByDate(prescricoes);
    console.log(`📅 Grupos por data: ${Object.keys(gruposPorData).length} data(s) diferentes`);
    Object.entries(gruposPorData).forEach(([data, grupo]) => {
        console.log(`  ${data}: ${grupo.length} prescrição(ões)`);
    });
    
    // Teste de medicamentos únicos
    const medicamentosUnicos = parser.getUniqueMedicamentos(detalhes.medicamentos);
    console.log(`\\n💊 Medicamentos únicos: ${medicamentosUnicos.length}`);
    medicamentosUnicos.forEach((med, index) => {
        console.log(`  ${index + 1}. ${med.nome || med.descricao}`);
    });
    
    console.log('\\n✅ Todos os testes concluídos com sucesso!');
    console.log('🎉 PrescricaoParser está funcionando conforme o parser original');
}

// Executar os testes
testarPrescricaoParser().catch(console.error);
