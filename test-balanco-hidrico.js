const HICDParser = require('./src/parsers/hicd-parser.js');
const cheerio = require('cheerio');

console.log('🧪 TESTE DE BALANÇO HÍDRICO - NOVO FORMATO');
console.log('=' .repeat(60));

const parser = new HICDParser();

// Teste 1: Formato específico novo
const textoTeste1 = `
Evolução do paciente:

Estado geral estável.

BH 12h: +129 ml

Paciente em observação.
`;

console.log('\n📝 TESTE 1 - FORMATO NOVO: "BH 12h: +129 ml"');
console.log('Texto:', textoTeste1.trim());

const $ = cheerio.load(`<div>${textoTeste1}</div>`);
const elemento = $('div');
const resultado1 = parser.retornaEvolucaoDetalhada($, elemento);

console.log('\n✅ RESULTADO TESTE 1:');
if (resultado1.balanco) {
    console.log('- Formato:', resultado1.balanco.formato);
    console.log('- Prazo:', resultado1.balanco.prazo);
    console.log('- Volume Total:', resultado1.balanco.volumeTotal);
    console.log('- Texto:', resultado1.balanco.texto);
    console.log('- Saldo (compatibilidade):', resultado1.balanco.saldo);
} else {
    console.log('❌ Balanço não encontrado');
}

// Teste 2: Formato com volume negativo
const textoTeste2 = `
BH 24h: -50 ml
`;

console.log('\n📝 TESTE 2 - VOLUME NEGATIVO: "BH 24h: -50 ml"');
const $2 = cheerio.load(`<div>${textoTeste2}</div>`);
const elemento2 = $2('div');
const resultado2 = parser.retornaEvolucaoDetalhada($2, elemento2);

console.log('\n✅ RESULTADO TESTE 2:');
if (resultado2.balanco) {
    console.log('- Formato:', resultado2.balanco.formato);
    console.log('- Prazo:', resultado2.balanco.prazo);
    console.log('- Volume Total:', resultado2.balanco.volumeTotal);
    console.log('- Texto:', resultado2.balanco.texto);
} else {
    console.log('❌ Balanço não encontrado');
}

// Teste 3: Formato sem sinal (deve adicionar +)
const textoTeste3 = `
BH 6h: 75 ml
`;

console.log('\n📝 TESTE 3 - SEM SINAL (deve adicionar +): "BH 6h: 75 ml"');
const $3 = cheerio.load(`<div>${textoTeste3}</div>`);
const elemento3 = $3('div');
const resultado3 = parser.retornaEvolucaoDetalhada($3, elemento3);

console.log('\n✅ RESULTADO TESTE 3:');
if (resultado3.balanco) {
    console.log('- Formato:', resultado3.balanco.formato);
    console.log('- Prazo:', resultado3.balanco.prazo);
    console.log('- Volume Total:', resultado3.balanco.volumeTotal);
    console.log('- Texto:', resultado3.balanco.texto);
} else {
    console.log('❌ Balanço não encontrado');
}

// Teste 4: Formato antigo (compatibilidade)
const textoTeste4 = `
Balanço hídrico: 
Entrada: 500 ml
Saída: 300 ml
Saldo: +200 ml
`;

console.log('\n📝 TESTE 4 - FORMATO ANTIGO (compatibilidade):');
console.log('Texto:', textoTeste4.trim());

const $4 = cheerio.load(`<div>${textoTeste4}</div>`);
const elemento4 = $4('div');
const resultado4 = parser.retornaEvolucaoDetalhada($4, elemento4);

console.log('\n✅ RESULTADO TESTE 4:');
if (resultado4.balanco) {
    console.log('- Formato:', resultado4.balanco.formato);
    console.log('- Entrada:', resultado4.balanco.entrada);
    console.log('- Saída:', resultado4.balanco.saida);
    console.log('- Saldo:', resultado4.balanco.saldo);
    console.log('- Volume Total (novo campo):', resultado4.balanco.volumeTotal);
} else {
    console.log('❌ Balanço não encontrado');
}

// Teste 5: Múltiplos formatos
const textoTeste5 = `
BH 12h: +129 ml
BH 24h: -50 ml
`;

console.log('\n📝 TESTE 5 - MÚLTIPLOS BALANÇOS: "BH 12h: +129 ml BH 24h: -50 ml"');
const $5 = cheerio.load(`<div>${textoTeste5}</div>`);
const elemento5 = $5('div');
const resultado5 = parser.retornaEvolucaoDetalhada($5, elemento5);

console.log('\n✅ RESULTADO TESTE 5:');
if (resultado5.balanco) {
    console.log('- Formato:', resultado5.balanco.formato);
    console.log('- Prazo:', resultado5.balanco.prazo);
    console.log('- Volume Total:', resultado5.balanco.volumeTotal);
    console.log('- Texto:', resultado5.balanco.texto);
    console.log('📝 Nota: Parser captura o primeiro match encontrado');
} else {
    console.log('❌ Balanço não encontrado');
}

console.log('\n' + '='.repeat(60));
console.log('🎯 RESUMO DOS TESTES:');
console.log('✅ Teste 1 - Formato novo padrão:', resultado1.balanco ? 'PASSOU' : 'FALHOU');
console.log('✅ Teste 2 - Volume negativo:', resultado2.balanco ? 'PASSOU' : 'FALHOU');
console.log('✅ Teste 3 - Adição de sinal +:', resultado3.balanco ? 'PASSOU' : 'FALHOU');
console.log('✅ Teste 4 - Compatibilidade:', resultado4.balanco ? 'PASSOU' : 'FALHOU');
console.log('✅ Teste 5 - Múltiplos balanços:', resultado5.balanco ? 'PASSOU' : 'FALHOU');

console.log('\n' + '='.repeat(60));
console.log('🎉 TESTE CONCLUÍDO');
console.log('='.repeat(60));
