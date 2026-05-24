const HICDParser = require('./src/parsers/hicd-parser.js');
const cheerio = require('cheerio');

console.log('🧪 TESTE INTEGRADO - BALANÇO HÍDRICO NO PARSER');
console.log('=' .repeat(60));

const parser = new HICDParser();

// HTML com balanço hídrico
const htmlTeste = `
<div class="evolucao-content">
    <div class="dados-evolucao">
        Estado geral estável.
        
        BH 12h: +129 ml
        
        Paciente em observação.
    </div>
</div>
`;

const $ = cheerio.load(htmlTeste);
const elemento = $('.evolucao-content');

console.log('\n📝 HTML DE ENTRADA:');
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
        
        // Debug: verificar o texto extraído
        const textoCompleto = elemento.text();
        console.log('\n🔍 DEBUG - Texto extraído do elemento:');
        console.log(`"${textoCompleto}"`);
        
        // Testar os padrões manualmente
        console.log('\n🔍 DEBUG - Teste manual dos padrões:');
        const padroes = [
            /BH\s+(\d+)h:\s*([+-]?\d+(?:[.,]\d+)?)\s*ml/i,
            /Balanço hídrico\s+(\d+)h:\s*([+-]?\d+(?:[.,]\d+)?)\s*ml/i,
            /Balanço\s+(\d+)h:\s*([+-]?\d+(?:[.,]\d+)?)\s*ml/i,
            /Balanço hídrico:\s*([\s\S]*?)(?:\s*Diurese:|\s*Exames|\s*Culturas:|\s*Pareceres:|\s*Paciente|$)/i
        ];
        
        padroes.forEach((padrao, index) => {
            const match = textoCompleto.match(padrao);
            console.log(`${index + 1}. Padrão ${index + 1}: ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
            if (match) {
                console.log(`   Grupos: [${match.slice(1).join(', ')}]`);
            }
        });
    }
    
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 TESTE CONCLUÍDO');
console.log('='.repeat(60));
