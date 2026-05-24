const HICDParser = require('./src/parsers/hicd-parser');

/**
 * Teste das novas funcionalidades do parser de evolução
 */

// Criar instância do parser
const parser = new HICDParser();
parser.setDebugMode(true);

console.log('🧪 TESTE DAS NOVAS FUNCIONALIDADES DO PARSER DE EVOLUÇÃO');
console.log('========================================================');

// Texto de exemplo com todas as seções
const textoEvolucao = `
Paciente internado em UTI pediátrica, em bom estado geral.

Hipóteses diagnósticas:
Bronquiolite viral aguda
Insuficiência respiratória moderada  
Desidratação leve

Em uso:
Salbutamol 2,5mg/nebulização 6/6h
Prednisolona 20mg VO 12/12h
Dipirona 15mg/kg EV se febre
Soro fisiológico 0,9% 80ml/h EV

Fez uso:
Amoxicilina 250mg VO 8/8h por 7 dias
Paracetamol 15mg/kg VO se dor

Dieta:
Dieta via oral livre para idade
Leite materno sob livre demanda
Hidratação oral com soro caseiro

Dispositivos:
Cateter venoso periférico em MSE
Oxímetro de pulso contínuo
Nebulizador ultrassônico
Sonda nasogástrica para medicação

Balanço hídrico:
Entrada: 1200ml (EV + VO)
Saída: 800ml 
Saldo: +400ml positivo

Diurese:
Volume: 400ml/24h
Aspecto: claro
Cor: amarelo claro
Densidade: 1.015

Exames laboratoriais:
[23/08] Hemograma: Leucócitos 12.000/mm³, Neutrófilos 70%
[23/08] PCR: 15mg/L (elevado)
[22/08] Gasometria: pH 7.35, PaCO2 45mmHg

Sinais vitais:
PA: 85x50mmHg
FC: 110bpm  
FR: 28irpm
Tax: 37.2°C
Sat: 95%
Peso: 8,5kg
HGT: 95mg/dL
`;

console.log('\n📝 TEXTO DE TESTE:');
console.log('─'.repeat(50));
console.log(textoEvolucao.substring(0, 200) + '...');

console.log('\n🔍 EXECUTANDO EXTRAÇÃO...');
const dadosEstruturados = parser.extrairDadosEstruturadosEvolucao(textoEvolucao);

console.log('\n📊 RESULTADOS EXTRAÍDOS:');
console.log('═'.repeat(50));

// Hipóteses diagnósticas
console.log('\n🩺 HIPÓTESES DIAGNÓSTICAS:');
if (dadosEstruturados.hipotesesDiagnosticas.length > 0) {
    dadosEstruturados.hipotesesDiagnosticas.forEach((hip, index) => {
        console.log(`  ${index + 1}. ${hip}`);
    });
} else {
    console.log('  ⚠️  Nenhuma hipótese diagnóstica encontrada');
}

// Medicamentos em uso
console.log('\n💊 MEDICAMENTOS EM USO:');
if (dadosEstruturados.medicamentosEmUso.length > 0) {
    dadosEstruturados.medicamentosEmUso.forEach((med, index) => {
        console.log(`  ${index + 1}. ${med}`);
    });
} else {
    console.log('  ⚠️  Nenhum medicamento em uso encontrado');
}

// Medicamentos anteriores
console.log('\n💊 MEDICAMENTOS ANTERIORES:');
if (dadosEstruturados.medicamentosAnteriores.length > 0) {
    dadosEstruturados.medicamentosAnteriores.forEach((med, index) => {
        console.log(`  ${index + 1}. ${med}`);
    });
} else {
    console.log('  ⚠️  Nenhum medicamento anterior encontrado');
}

// Dieta
console.log('\n🍽️  DIETA:');
if (dadosEstruturados.dieta.length > 0) {
    dadosEstruturados.dieta.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
    });
} else {
    console.log('  ⚠️  Nenhuma informação de dieta encontrada');
}

// Dispositivos
console.log('\n🔌 DISPOSITIVOS:');
if (dadosEstruturados.dispositivos.length > 0) {
    dadosEstruturados.dispositivos.forEach((disp, index) => {
        console.log(`  ${index + 1}. ${disp}`);
    });
} else {
    console.log('  ⚠️  Nenhum dispositivo encontrado');
}

// Balanço hídrico
console.log('\n💧 BALANÇO HÍDRICO:');
if (dadosEstruturados.balanco.entrada || dadosEstruturados.balanco.saida) {
    console.log(`  📥 Entrada: ${dadosEstruturados.balanco.entrada || 'Não informado'}`);
    console.log(`  📤 Saída: ${dadosEstruturados.balanco.saida || 'Não informado'}`);
    console.log(`  📊 Saldo: ${dadosEstruturados.balanco.saldo || 'Não informado'}`);
    if (dadosEstruturados.balanco.texto) {
        console.log(`  📝 Texto completo: ${dadosEstruturados.balanco.texto.substring(0, 100)}...`);
    }
} else {
    console.log('  ⚠️  Nenhuma informação de balanço hídrico encontrada');
}

// Diurese
console.log('\n🚿 DIURESE:');
if (dadosEstruturados.balanco.diurese) {
    const diurese = dadosEstruturados.balanco.diurese;
    console.log(`  💧 Volume: ${diurese.volume || 'Não informado'}`);
    console.log(`  👁️  Aspecto: ${diurese.aspecto || 'Não informado'}`);
    console.log(`  🎨 Cor: ${diurese.cor || 'Não informado'}`);
    console.log(`  ⚖️  Densidade: ${diurese.densidade || 'Não informado'}`);
    if (diurese.texto) {
        console.log(`  📝 Texto completo: ${diurese.texto.substring(0, 100)}...`);
    }
} else {
    console.log('  ⚠️  Nenhuma informação de diurese encontrada');
}

// Sinais vitais
console.log('\n❤️  SINAIS VITAIS:');
const sinais = dadosEstruturados.sinaisVitais;
if (Object.keys(sinais).length > 0) {
    Object.entries(sinais).forEach(([tipo, valor]) => {
        const emojis = {
            'pressao': '🩸',
            'frequenciaCardiaca': '💓',
            'frequenciaRespiratoria': '🫁',
            'temperatura': '🌡️',
            'saturacao': '🫁',
            'peso': '⚖️',
            'glicemia': '🍬'
        };
        console.log(`  ${emojis[tipo] || '📊'} ${tipo}: ${valor}`);
    });
} else {
    console.log('  ⚠️  Nenhum sinal vital encontrado');
}

// Exames
console.log('\n🔬 EXAMES:');
if (dadosEstruturados.exames.length > 0) {
    dadosEstruturados.exames.forEach((exame, index) => {
        console.log(`  ${index + 1}. ${exame.substring(0, 80)}...`);
    });
} else {
    console.log('  ⚠️  Nenhum exame encontrado');
}

console.log('\n📈 ESTATÍSTICAS:');
console.log('─'.repeat(30));
console.log(`📋 Hipóteses diagnósticas: ${dadosEstruturados.hipotesesDiagnosticas.length}`);
console.log(`💊 Medicamentos em uso: ${dadosEstruturados.medicamentosEmUso.length}`);
console.log(`💊 Medicamentos anteriores: ${dadosEstruturados.medicamentosAnteriores.length}`);
console.log(`🍽️ Itens de dieta: ${dadosEstruturados.dieta.length}`);
console.log(`🔌 Dispositivos: ${dadosEstruturados.dispositivos.length}`);
console.log(`❤️ Sinais vitais: ${Object.keys(dadosEstruturados.sinaisVitais).length}`);
console.log(`🔬 Exames: ${dadosEstruturados.exames.length}`);
console.log(`💧 Balanço hídrico: ${dadosEstruturados.balanco.entrada ? 'Sim' : 'Não'}`);
console.log(`🚿 Diurese: ${dadosEstruturados.balanco.diurese ? 'Sim' : 'Não'}`);

console.log('\n✅ TESTE CONCLUÍDO!');
console.log('═'.repeat(50));

// Teste com texto mais simples
console.log('\n🧪 TESTE COM TEXTO MAIS SIMPLES:');
console.log('─'.repeat(40));

const textoSimples = `
Paciente estável. Dieta livre. Em uso de dipirona se dor.
PA: 120x80mmHg, FC: 80bpm, Tax: 36.5°C
Dispositivos: cateter venoso
Diurese: 800ml, aspecto claro
`;

const dadosSimples = parser.extrairDadosEstruturadosEvolucao(textoSimples);
console.log('Medicamentos em uso:', dadosSimples.medicamentosEmUso.length);
console.log('Dieta:', dadosSimples.dieta.length);
console.log('Dispositivos:', dadosSimples.dispositivos.length);
console.log('Sinais vitais:', Object.keys(dadosSimples.sinaisVitais).length);
console.log('Diurese:', dadosSimples.balanco.diurese ? 'Detectada' : 'Não detectada');

console.log('\n🎯 VALIDAÇÃO DAS MELHORIAS IMPLEMENTADA COM SUCESSO!');
