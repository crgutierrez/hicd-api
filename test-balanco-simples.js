const HICDParser = require('./src/parsers/hicd-parser.js');

console.log('🧪 TESTE SIMPLES - BALANÇO HÍDRICO');
console.log('=' .repeat(50));

const parser = new HICDParser();

// Teste direto do texto
const textos = [
    "BH 12h: +129 ml",
    "BH 24h: -50 ml", 
    "BH 6h: 75 ml",
    "Balanço hídrico: entrada 500ml saída 300ml saldo +200ml"
];

console.log('\n🔧 TESTE DOS PADRÕES REGEX:');

textos.forEach((texto, index) => {
    console.log(`\n${index + 1}. Texto: "${texto}"`);
    
    // Testar padrão específico novo
    const padraoNovo = /BH\s+(\d+)h:\s*([+-]?\d+(?:[.,]\d+)?)\s*ml/i;
    const matchNovo = texto.match(padraoNovo);
    
    if (matchNovo) {
        console.log(`   ✅ Padrão novo detectado!`);
        console.log(`   - Prazo: ${matchNovo[1]}h`);
        console.log(`   - Volume: ${matchNovo[2]}`);
        
        // Garantir sinal +
        const volumeFormatado = matchNovo[2].startsWith('+') || matchNovo[2].startsWith('-') 
            ? matchNovo[2] 
            : '+' + matchNovo[2];
        console.log(`   - Volume formatado: ${volumeFormatado} ml`);
    } else {
        console.log(`   ❌ Padrão novo não detectado`);
        
        // Testar padrão antigo
        const padraoAntigo = /Balanço hídrico:\s*([\s\S]*?)$/i;
        const matchAntigo = texto.match(padraoAntigo);
        
        if (matchAntigo) {
            console.log(`   ✅ Padrão antigo detectado!`);
            console.log(`   - Texto: ${matchAntigo[1]}`);
        } else {
            console.log(`   ❌ Nenhum padrão detectado`);
        }
    }
});

console.log('\n' + '='.repeat(50));
console.log('🎉 TESTE CONCLUÍDO');
console.log('='.repeat(50));
