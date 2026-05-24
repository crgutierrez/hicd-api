const HICDParser = require('./src/parsers/hicd-parser.js');

// Texto de exemplo com múltiplos dispositivos em uma linha
const textoTeste = `
Evolução do paciente:

Estado geral estável.

Dispositivos: TOT 3,5 com cuff 07/08 - 11/08 TOT 3,5 com cuff 25/08 - 26/08 AVC VJD 4Fr DL 25/08 - 27/08 SNG 26/08 SVD 26/08-27/08 AVC VJID 4Fr DL 27/08

Paciente em observação.
`;

const parser = new HICDParser();

console.log('🧪 TESTE DE QUEBRA DE LINHA - DISPOSITIVOS MÚLTIPLOS');
console.log('=' .repeat(60));

// Testar o método de separação diretamente
const linhaDispositivos = "TOT 3,5 com cuff 07/08 - 11/08 TOT 3,5 com cuff 25/08 - 26/08 AVC VJD 4Fr DL 25/08 - 27/08 SNG 26/08 SVD 26/08-27/08 AVC VJID 4Fr DL 27/08";

console.log('\n📝 LINHA ORIGINAL:');
console.log(`"${linhaDispositivos}"`);

console.log('\n🔧 TESTE DO MÉTODO separarDispositivosMultiplos:');
const dispositivosSeparados = parser.separarDispositivosMultiplos(linhaDispositivos);

console.log(`\n✅ DISPOSITIVOS SEPARADOS (${dispositivosSeparados.length}):`);
dispositivosSeparados.forEach((dispositivo, index) => {
    console.log(`${index + 1}. "${dispositivo}"`);
});

console.log('\n🎯 RESULTADO ESPERADO:');
const esperado = [
    "TOT 3,5 com cuff 07/08 - 11/08",
    "TOT 3,5 com cuff 25/08 - 26/08", 
    "AVC VJD 4Fr DL 25/08 - 27/08",
    "SNG 26/08",
    "SVD 26/08-27/08",
    "AVC VJID 4Fr DL 27/08"
];

esperado.forEach((dispositivo, index) => {
    console.log(`${index + 1}. "${dispositivo}"`);
});

console.log('\n📊 COMPARAÇÃO:');
let acertos = 0;
for (let i = 0; i < Math.max(dispositivosSeparados.length, esperado.length); i++) {
    const obtido = dispositivosSeparados[i] || 'AUSENTE';
    const esperadoItem = esperado[i] || 'AUSENTE';
    const match = obtido === esperadoItem;
    
    if (match) acertos++;
    
    console.log(`${i + 1}. ${match ? '✅' : '❌'} Obtido: "${obtido}" | Esperado: "${esperadoItem}"`);
}

console.log(`\n📈 PRECISÃO: ${acertos}/${esperado.length} (${((acertos/esperado.length)*100).toFixed(1)}%)`);

// Testar o parser completo
console.log('\n' + '='.repeat(60));
console.log('🧪 TESTE DO PARSER COMPLETO');
console.log('='.repeat(60));

try {
    // Simular o elemento DOM com cheerio
    const cheerio = require('cheerio');
    const $ = cheerio.load(`<div>${textoTeste}</div>`);
    const elemento = $('div');
    
    const resultado = parser.retornaEvolucaoDetalhada($, elemento);
    
    console.log('\n📋 DISPOSITIVOS ESTRUTURADOS:');
    if (resultado.dispositivosEstruturados && resultado.dispositivosEstruturados.length > 0) {
        resultado.dispositivosEstruturados.forEach((dispositivo, index) => {
            console.log(`${index + 1}. ${dispositivo.nome} (${dispositivo.dataInicio}${dispositivo.dataFim ? ' - ' + dispositivo.dataFim : ''}) [${dispositivo.emUso ? 'EM USO' : 'FINALIZADO'}]`);
        });
        
        console.log(`\n📊 ESTATÍSTICAS:`);
        console.log(`- Total de dispositivos: ${resultado.dispositivosEstruturados.length}`);
        console.log(`- Dispositivos em uso: ${resultado.dispositivosEmUso ? resultado.dispositivosEmUso.length : 0}`);
        console.log(`- Dispositivos finalizados: ${resultado.dispositivosEstruturados.length - (resultado.dispositivosEmUso ? resultado.dispositivosEmUso.length : 0)}`);
        
        if (resultado.dispositivosEmUso && resultado.dispositivosEmUso.length > 0) {
            console.log(`\n🟢 DISPOSITIVOS EM USO:`);
            resultado.dispositivosEmUso.forEach((dispositivo, index) => {
                console.log(`${index + 1}. ${dispositivo.nome} (desde ${dispositivo.dataInicio})`);
            });
        }
    } else {
        console.log('❌ Nenhum dispositivo estruturado encontrado');
        console.log('\n🔍 DEBUG - Dados retornados:');
        console.log('- dispositivos:', resultado.dispositivos);
        console.log('- dispositivosEstruturados:', resultado.dispositivosEstruturados);
        console.log('- dispositivosEmUso:', resultado.dispositivosEmUso);
    }
    
} catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error.stack);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 TESTE CONCLUÍDO');
console.log('='.repeat(60));
