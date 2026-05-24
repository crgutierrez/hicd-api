const HICDParser = require('./src/parsers/hicd-parser.js');
const cheerio = require('cheerio');

console.log('🧪 TESTE FINAL - DISPOSITIVOS COM QUEBRA DE LINHA');
console.log('=' .repeat(70));

// Simular chamada direta do método com texto limpo
const parser = new HICDParser();

// Texto limpo apenas com dispositivos
const textoDispositivos = "TOT 3,5 com cuff 07/08 - 11/08 TOT 3,5 com cuff 25/08 - 26/08 AVC VJD 4Fr DL 25/08 - 27/08 SNG 26/08 SVD 26/08-27/08 AVC VJID 4Fr DL 27/08";

console.log('\n📝 TEXTO DE DISPOSITIVOS:');
console.log(`"${textoDispositivos}"`);

console.log('\n🔧 CHAMADA DIRETA DO separarDispositivosMultiplos:');
const dispositivos = parser.separarDispositivosMultiplos(textoDispositivos);

console.log(`\n✅ DISPOSITIVOS SEPARADOS (${dispositivos.length}):`);
dispositivos.forEach((dispositivo, index) => {
    console.log(`${index + 1}. "${dispositivo}"`);
});

console.log('\n🔧 PROCESSAMENTO INDIVIDUAL:');
const dispositivosProcessados = [];
const dispositivosEmUso = [];

dispositivos.forEach((linha, index) => {
    console.log(`\n${index + 1}. Processando: "${linha}"`);
    
    // Padrão melhorado para capturar dispositivos com apenas data de início
    const dispositivoEstruturado = linha.match(/^(.+?)\s+(\d{2}\/\d{2})(?:\s*-\s*(\d{2}\/\d{2}))?(.*)$/);
    
    if (dispositivoEstruturado) {
        const nomeDispositivo = dispositivoEstruturado[1].trim();
        const dataInicio = dispositivoEstruturado[2];
        const dataFim = dispositivoEstruturado[3] || null;
        const observacoes = dispositivoEstruturado[4] ? dispositivoEstruturado[4].trim() : '';
        
        const dispositivo = {
            nome: nomeDispositivo,
            dataInicio: dataInicio,
            dataFim: dataFim,
            emUso: !dataFim, // Se não tem data fim, está em uso
            observacoes: observacoes,
            textoCompleto: linha
        };
        
        dispositivosProcessados.push(dispositivo);
        
        console.log(`   ✅ Nome: "${nomeDispositivo}"`);
        console.log(`   📅 Início: ${dataInicio}`);
        console.log(`   📅 Fim: ${dataFim || 'null'}`);
        console.log(`   🟢 Em uso: ${!dataFim}`);
        
        // Se não tem data fim, está em uso
        if (!dataFim) {
            dispositivosEmUso.push(dispositivo);
        }
    } else {
        console.log(`   ❌ Sem match estruturado - assumindo formato antigo`);
        
        const dispositivo = {
            nome: linha,
            dataInicio: null,
            dataFim: null,
            emUso: true,
            observacoes: '',
            textoCompleto: linha
        };
        
        dispositivosProcessados.push(dispositivo);
        dispositivosEmUso.push(dispositivo);
    }
});

console.log('\n📊 RESULTADO FINAL:');
console.log(`- Total de dispositivos: ${dispositivosProcessados.length}`);
console.log(`- Dispositivos em uso: ${dispositivosEmUso.length}`);
console.log(`- Dispositivos finalizados: ${dispositivosProcessados.length - dispositivosEmUso.length}`);

console.log('\n📋 LISTA COMPLETA - DISPOSITIVOS ESTRUTURADOS:');
dispositivosProcessados.forEach((dispositivo, index) => {
    const status = dispositivo.emUso ? '🟢 EM USO' : '🔴 FINALIZADO';
    const periodo = dispositivo.dataInicio ? 
        `${dispositivo.dataInicio}${dispositivo.dataFim ? ' - ' + dispositivo.dataFim : ''}` : 
        'sem datas';
    console.log(`${index + 1}. ${dispositivo.nome} (${periodo}) [${status}]`);
});

if (dispositivosEmUso.length > 0) {
    console.log('\n🟢 DISPOSITIVOS ATUALMENTE EM USO:');
    dispositivosEmUso.forEach((dispositivo, index) => {
        console.log(`${index + 1}. ${dispositivo.nome} (desde ${dispositivo.dataInicio || 'data não informada'})`);
    });
}

console.log('\n' + '='.repeat(70));
console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
console.log('='.repeat(70));
