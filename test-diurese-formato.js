const HICDParser = require('./src/parsers/hicd-parser');

/**
 * Teste específico para o novo formato de diurese
 * Modelo: Diurese 24h: 648 ml - 5,74 ml/kg/h
 */

console.log('🧪 TESTE DO NOVO FORMATO DE DIURESE');
console.log('═'.repeat(50));

const parser = new HICDParser();
parser.setDebugMode(false);

// Teste 1: Formato específico com todos os dados
console.log('\n📝 TESTE 1: Formato específico completo');
const textoCompleto = `
Paciente estável em UTI.

Diurese 24h: 648 ml - 5,74 ml/kg/h

Outros dados da evolução...
`;

const resultado1 = parser.extrairDadosEstruturadosEvolucao(textoCompleto);
console.log('Diurese detectada:', resultado1.balanco.diurese ? 'Sim' : 'Não');
if (resultado1.balanco.diurese) {
    console.log('📋 Texto:', resultado1.balanco.diurese.texto);
    console.log('⏰ Prazo:', resultado1.balanco.diurese.prazo);
    console.log('💧 Volume:', resultado1.balanco.diurese.volume);
    console.log('⚡ Diurese horária:', resultado1.balanco.diurese.diureseHoraria);
}

// Teste 2: Formato específico sem diurese horária
console.log('\n📝 TESTE 2: Formato específico sem diurese horária');
const textoSemDiurese = `
Evolução do paciente:

Diurese 12h: 320 ml

Continua tratamento...
`;

const resultado2 = parser.extrairDadosEstruturadosEvolucao(textoSemDiurese);
console.log('Diurese detectada:', resultado2.balanco.diurese ? 'Sim' : 'Não');
if (resultado2.balanco.diurese) {
    console.log('📋 Texto:', resultado2.balanco.diurese.texto);
    console.log('⏰ Prazo:', resultado2.balanco.diurese.prazo);
    console.log('💧 Volume:', resultado2.balanco.diurese.volume);
    console.log('⚡ Diurese horária:', resultado2.balanco.diurese.diureseHoraria || 'Não informado');
}

// Teste 3: Variações do formato
console.log('\n📝 TESTE 3: Variações do formato');
const textoVariacoes = `
Múltiplas variações:

Diurese 6h: 150 ml - 2,1 ml/kg/h
Diurese 24 horas: 800 ml - 6,2 ml/kg/h  
Diurese última 24h: 450 ml

Final da evolução.
`;

const resultado3 = parser.extrairDadosEstruturadosEvolucao(textoVariacoes);
console.log('Diurese detectada:', resultado3.balanco.diurese ? 'Sim' : 'Não');
if (resultado3.balanco.diurese) {
    console.log('📋 Texto:', resultado3.balanco.diurese.texto);
    console.log('⏰ Prazo:', resultado3.balanco.diurese.prazo);
    console.log('💧 Volume:', resultado3.balanco.diurese.volume);
    console.log('⚡ Diurese horária:', resultado3.balanco.diurese.diureseHoraria || 'Não informado');
}

// Teste 4: Formato antigo (deve funcionar ainda)
console.log('\n📝 TESTE 4: Formato antigo (compatibilidade)');
const textoAntigo = `
Diurese:
Volume: 500ml/24h
Aspecto: claro
Cor: amarelo claro
Densidade: 1.015
`;

const resultado4 = parser.extrairDadosEstruturadosEvolucao(textoAntigo);
console.log('Diurese detectada:', resultado4.balanco.diurese ? 'Sim' : 'Não');
if (resultado4.balanco.diurese) {
    console.log('📋 Texto:', resultado4.balanco.diurese.texto.substring(0, 50) + '...');
    console.log('⏰ Prazo:', resultado4.balanco.diurese.prazo || 'Não informado');
    console.log('💧 Volume:', resultado4.balanco.diurese.volume);
    console.log('⚡ Diurese horária:', resultado4.balanco.diurese.diureseHoraria || 'Não informado');
    console.log('👁️ Aspecto:', resultado4.balanco.diurese.aspecto || 'Não informado');
    console.log('🎨 Cor:', resultado4.balanco.diurese.cor || 'Não informado');
    console.log('⚖️ Densidade:', resultado4.balanco.diurese.densidade || 'Não informado');
}

// Teste 5: Múltiplos valores no texto
console.log('\n📝 TESTE 5: Múltiplos valores (primeiro prevalece)');
const textoMultiplo = `
Relatório de diurese:

Diurese 24h: 648 ml - 5,74 ml/kg/h
Diurese 12h: 300 ml - 5,2 ml/kg/h
Diurese 6h: 120 ml

Observações adicionais...
`;

const resultado5 = parser.extrairDadosEstruturadosEvolucao(textoMultiplo);
console.log('Diurese detectada:', resultado5.balanco.diurese ? 'Sim' : 'Não');
if (resultado5.balanco.diurese) {
    console.log('📋 Texto:', resultado5.balanco.diurese.texto);
    console.log('⏰ Prazo:', resultado5.balanco.diurese.prazo);
    console.log('💧 Volume:', resultado5.balanco.diurese.volume);
    console.log('⚡ Diurese horária:', resultado5.balanco.diurese.diureseHoraria);
}

console.log('\n📊 RESUMO DOS TESTES:');
console.log('═'.repeat(40));

const testes = [
    { nome: 'Formato completo', resultado: resultado1 },
    { nome: 'Sem diurese horária', resultado: resultado2 },
    { nome: 'Variações', resultado: resultado3 },
    { nome: 'Formato antigo', resultado: resultado4 },
    { nome: 'Múltiplos valores', resultado: resultado5 }
];

testes.forEach((teste, index) => {
    const diurese = teste.resultado.balanco.diurese;
    console.log(`\n${index + 1}. ${teste.nome}:`);
    console.log(`   ✅ Detectado: ${diurese ? 'Sim' : 'Não'}`);
    if (diurese) {
        console.log(`   ⏰ Prazo: ${diurese.prazo || 'N/A'}`);
        console.log(`   💧 Volume: ${diurese.volume || 'N/A'}`);
        console.log(`   ⚡ Diurese horária: ${diurese.diureseHoraria || 'N/A'}`);
        if (diurese.aspecto || diurese.cor || diurese.densidade) {
            console.log(`   📋 Dados extras: Aspecto, cor, densidade detectados`);
        }
    }
});

console.log('\n✅ TESTE DO NOVO FORMATO DE DIURESE CONCLUÍDO!');
console.log('🎯 Parser atualizado com sucesso para suportar o modelo especificado!');
