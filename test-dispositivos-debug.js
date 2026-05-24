const HICDParser = require('./src/parsers/hicd-parser.js');
const cheerio = require('cheerio');

console.log('🧪 TESTE ESPECÍFICO - DEBUG DO PARSER DE DISPOSITIVOS');
console.log('=' .repeat(70));

// HTML simulado mais realista
const htmlTeste = `
<div class="evolucao-content">
    <div class="dados-evolucao">
        Estado geral estável.
        
        Dispositivos: TOT 3,5 com cuff 07/08 - 11/08 TOT 3,5 com cuff 25/08 - 26/08 AVC VJD 4Fr DL 25/08 - 27/08 SNG 26/08 SVD 26/08-27/08 AVC VJID 4Fr DL 27/08
        
        Paciente em observação.
    </div>
</div>
`;

const parser = new HICDParser();
const $ = cheerio.load(htmlTeste);

console.log('\n📝 HTML DE ENTRADA:');
console.log(htmlTeste.trim());

console.log('\n🔧 TESTE DO PARSER retornaEvolucaoDetalhada:');

try {
    const elemento = $('.evolucao-content');
    const resultado = parser.retornaEvolucaoDetalhada($, elemento);
    
    console.log('\n📋 RESULTADO COMPLETO:');
    console.log(JSON.stringify(resultado, null, 2));
    
    // Teste com texto direto
    console.log('\n🔧 TESTE COM TEXTO DIRETO:');
    const textoCompleto = elemento.text();
    console.log('Texto extraído:', textoCompleto);
    
    // Verificar se o padrão "Dispositivos:" é detectado
    const dispositivosMatch = textoCompleto.match(/Dispositivos:\s*([\s\S]*?)(?:\s*Exames|\s*Culturas:|\s*Pareceres:|\s*Balanço|\s*Diurese|$)/i);
    console.log('\nMatch de dispositivos:', dispositivosMatch);
    
    if (dispositivosMatch) {
        const linhaDispositivos = dispositivosMatch[1].trim();
        console.log('\nLinha extraída:', `"${linhaDispositivos}"`);
        
        const dispositivos = parser.separarDispositivosMultiplos(linhaDispositivos);
        console.log('\nDispositivos separados:', dispositivos);
        
        // Processar cada dispositivo
        dispositivos.forEach((linha, index) => {
            console.log(`\n${index + 1}. Processando: "${linha}"`);
            const dispositivoEstruturado = linha.match(/^(.+?)\s+(\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2})?(.*)$/);
            if (dispositivoEstruturado) {
                console.log(`   ✅ Match: nome="${dispositivoEstruturado[1].trim()}", inicio="${dispositivoEstruturado[2]}", fim="${dispositivoEstruturado[3] || 'null'}"`);
            } else {
                console.log(`   ❌ Sem match estruturado`);
            }
        });
    }
    
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
}

console.log('\n' + '='.repeat(70));
console.log('🎉 DEBUG CONCLUÍDO');
console.log('='.repeat(70));
