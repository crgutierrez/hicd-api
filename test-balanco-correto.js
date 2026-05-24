const HICDParser = require('./src/parsers/hicd-parser.js');
const cheerio = require('cheerio');

console.log('🧪 TESTE CORRETO - BALANÇO HÍDRICO COM FORMATO ESPERADO');
console.log('=' .repeat(65));

const parser = new HICDParser();

// HTML no formato esperado pelo parser
const htmlTeste = `
<div class="row">
    <div class="col-lg-3">Descrição:</div>
    <div class="col-lg-9">
        <p>Estado geral estável.</p>
        <p>BH 12h: +129 ml</p>
        <p>Paciente em observação.</p>
    </div>
</div>
`;

const $ = cheerio.load(htmlTeste);
const elemento = $('.row');

console.log('\n📝 HTML DE ENTRADA (formato correto):');
console.log(htmlTeste.trim());

console.log('\n🔧 TESTE DO MÉTODO retornaEvolucaoDetalhada:');

try {
    const resultado = parser.retornaEvolucaoDetalhada($, elemento);
    
    console.log('\n📋 RESULTADO COMPLETO:');
    console.log('Chaves encontradas:', Object.keys(resultado));
    
    if (resultado.balanco) {
        console.log('\n✅ BALANÇO ENCONTRADO:');
        console.log('- Formato:', resultado.balanco.formato);
        console.log('- Prazo:', resultado.balanco.prazo);
        console.log('- Volume Total:', resultado.balanco.volumeTotal);
        console.log('- Texto:', resultado.balanco.texto);
        console.log('- Entrada:', resultado.balanco.entrada);
        console.log('- Saída:', resultado.balanco.saida);
        console.log('- Saldo:', resultado.balanco.saldo);
    } else {
        console.log('\n❌ BALANÇO NÃO ENCONTRADO');
        
        // Debug completo
        console.log('\n🔍 DEBUG COMPLETO:');
        console.log('Resultado completo:', JSON.stringify(resultado, null, 2));
    }
    
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
}

// Teste 2: Formato antigo
console.log('\n' + '='.repeat(65));
console.log('🧪 TESTE 2 - FORMATO ANTIGO');

const htmlTeste2 = `
<div class="row">
    <div class="col-lg-3">Descrição:</div>
    <div class="col-lg-9">
        <p>Estado geral estável.</p>
        <p>Balanço hídrico: Entrada: 500 ml Saída: 300 ml Saldo: +200 ml</p>
        <p>Paciente em observação.</p>
    </div>
</div>
`;

const $2 = cheerio.load(htmlTeste2);
const elemento2 = $2('.row');

console.log('\n📝 HTML TESTE 2 (formato antigo):');
console.log(htmlTeste2.trim());

try {
    const resultado2 = parser.retornaEvolucaoDetalhada($2, elemento2);
    
    if (resultado2.balanco) {
        console.log('\n✅ BALANÇO ANTIGO ENCONTRADO:');
        console.log('- Formato:', resultado2.balanco.formato);
        console.log('- Texto:', resultado2.balanco.texto);
        console.log('- Entrada:', resultado2.balanco.entrada);
        console.log('- Saída:', resultado2.balanco.saida);
        console.log('- Saldo:', resultado2.balanco.saldo);
    } else {
        console.log('\n❌ BALANÇO ANTIGO NÃO ENCONTRADO');
        console.log('Resultado:', JSON.stringify(resultado2, null, 2));
    }
} catch (error) {
    console.error('❌ Erro no teste 2:', error.message);
}

console.log('\n' + '='.repeat(65));
console.log('🎉 TESTE CONCLUÍDO');
console.log('='.repeat(65));
