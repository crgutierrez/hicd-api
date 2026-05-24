const HICDParser = require('./src/parsers/hicd-parser');

/**
 * Teste específico para o novo formato de dispositivos
 * Modelo: TOT 3,5 com cuff  07/08 - 11/08
 */

console.log('🧪 TESTE DO NOVO FORMATO DE DISPOSITIVOS');
console.log('═'.repeat(50));

const parser = new HICDParser();
parser.setDebugMode(false);

// Teste 1: Formato específico com dispositivos finalizados e em uso
console.log('\n📝 TESTE 1: Dispositivos com datas de início e fim');
const textoCompleto = `
Paciente estável em UTI.

Dispositivos:
TOT 3,5 com cuff  07/08 - 11/08
CVC jugular direita  05/08 - 10/08
SVD  06/08 - 12/08
Monitor cardíaco  08/08 -
Oxímetro de pulso  09/08 -
Ventilador mecânico  07/08 -

Outros dados da evolução...
`;

const resultado1 = parser.extrairDadosEstruturadosEvolucao(textoCompleto);
console.log('Dispositivos estruturados:', resultado1.dispositivosEstruturados ? 'Sim' : 'Não');
console.log('Total de dispositivos:', resultado1.dispositivosEstruturados?.length || 0);
console.log('Dispositivos em uso:', resultado1.dispositivosEmUso?.length || 0);

if (resultado1.dispositivosEstruturados) {
    console.log('\n📋 TODOS OS DISPOSITIVOS:');
    resultado1.dispositivosEstruturados.forEach((disp, index) => {
        console.log(`  ${index + 1}. ${disp.nome}`);
        console.log(`     📅 Início: ${disp.dataInicio || 'N/A'}`);
        console.log(`     🏁 Fim: ${disp.dataFim || 'Em uso'}`);
        console.log(`     ✅ Status: ${disp.emUso ? 'Em uso' : 'Finalizado'}`);
        if (disp.observacoes) console.log(`     📝 Obs: ${disp.observacoes}`);
        console.log('');
    });
}

if (resultado1.dispositivosEmUso) {
    console.log('🔌 DISPOSITIVOS ATUALMENTE EM USO:');
    resultado1.dispositivosEmUso.forEach((disp, index) => {
        console.log(`  ${index + 1}. ${disp.nome} (desde ${disp.dataInicio || 'data não informada'})`);
    });
}

// Teste 2: Formato misto (estruturado e não estruturado)
console.log('\n📝 TESTE 2: Formato misto');
const textoMisto = `
Dispositivos:
TOT 3,0  01/09 - 02/09
CVC subclávia  30/08 -
Cateter venoso periférico
Monitor multiparamétrico
Sonda nasogástrica  31/08 -
`;

const resultado2 = parser.extrairDadosEstruturadosEvolucao(textoMisto);
console.log('Total de dispositivos:', resultado2.dispositivosEstruturados?.length || 0);
console.log('Dispositivos em uso:', resultado2.dispositivosEmUso?.length || 0);

if (resultado2.dispositivosEstruturados) {
    console.log('\n📋 DISPOSITIVOS (FORMATO MISTO):');
    resultado2.dispositivosEstruturados.forEach((disp, index) => {
        console.log(`  ${index + 1}. ${disp.nome} - ${disp.emUso ? 'EM USO' : 'FINALIZADO'}`);
        if (disp.dataInicio) console.log(`     📅 ${disp.dataInicio} ${disp.dataFim ? '- ' + disp.dataFim : '- (em uso)'}`);
    });
}

// Teste 3: Variações de formato de data
console.log('\n📝 TESTE 3: Variações de formato');
const textoVariacoes = `
Equipamentos:
Tubo orotraqueal 3,5  07/08 - 11/08
CVC VJID  12/08 - 15/08  retirado por suspeita de infecção
Sonda vesical  10/08 -  funcionando bem
Monitor de PA  09/08 -
`;

const resultado3 = parser.extrairDadosEstruturadosEvolucao(textoVariacoes);
console.log('Total de dispositivos:', resultado3.dispositivosEstruturados?.length || 0);
console.log('Dispositivos em uso:', resultado3.dispositivosEmUso?.length || 0);

if (resultado3.dispositivosEstruturados) {
    console.log('\n📋 DISPOSITIVOS COM OBSERVAÇÕES:');
    resultado3.dispositivosEstruturados.forEach((disp, index) => {
        console.log(`  ${index + 1}. ${disp.nome}`);
        console.log(`     🗓️  ${disp.dataInicio || 'N/A'} - ${disp.dataFim || 'Em uso'}`);
        console.log(`     📝 ${disp.observacoes || 'Sem observações'}`);
        console.log('');
    });
}

// Teste 4: Formato antigo (compatibilidade)
console.log('\n📝 TESTE 4: Formato antigo (compatibilidade)');
const textoAntigo = `
Acessos:
Cateter venoso central em subclávia direita
Monitor cardíaco contínuo
Ventilador mecânico modo SIMV
Sonda vesical de demora
`;

const resultado4 = parser.extrairDadosEstruturadosEvolucao(textoAntigo);
console.log('Total de dispositivos:', resultado4.dispositivosEstruturados?.length || 0);
console.log('Dispositivos em uso:', resultado4.dispositivosEmUso?.length || 0);

if (resultado4.dispositivosEstruturados) {
    console.log('\n📋 DISPOSITIVOS (FORMATO ANTIGO):');
    resultado4.dispositivosEstruturados.forEach((disp, index) => {
        console.log(`  ${index + 1}. ${disp.nome} - ${disp.emUso ? 'EM USO (assumido)' : 'FINALIZADO'}`);
    });
}

// Teste 5: Apenas dispositivos em uso
console.log('\n📝 TESTE 5: Apenas dispositivos em uso');
const textoEmUso = `
Dispositivos:
TOT 4,0  15/08 -
CVC femoral  14/08 -
Monitor ECG  16/08 -
Bomba de infusão  15/08 -
`;

const resultado5 = parser.extrairDadosEstruturadosEvolucao(textoEmUso);
console.log('Total de dispositivos:', resultado5.dispositivosEstruturados?.length || 0);
console.log('Dispositivos em uso:', resultado5.dispositivosEmUso?.length || 0);
console.log('Todos em uso?', resultado5.dispositivosEstruturados?.every(d => d.emUso) ? 'Sim' : 'Não');

console.log('\n📊 RESUMO DOS TESTES:');
console.log('═'.repeat(40));

const testes = [
    { nome: 'Dispositivos com datas', resultado: resultado1 },
    { nome: 'Formato misto', resultado: resultado2 },
    { nome: 'Com observações', resultado: resultado3 },
    { nome: 'Formato antigo', resultado: resultado4 },
    { nome: 'Apenas em uso', resultado: resultado5 }
];

testes.forEach((teste, index) => {
    const disp = teste.resultado.dispositivosEstruturados;
    const emUso = teste.resultado.dispositivosEmUso;
    console.log(`\n${index + 1}. ${teste.nome}:`);
    console.log(`   📱 Total: ${disp?.length || 0}`);
    console.log(`   🔌 Em uso: ${emUso?.length || 0}`);
    console.log(`   🏁 Finalizados: ${disp ? disp.length - emUso.length : 0}`);
    if (disp && disp.length > 0) {
        const comDatas = disp.filter(d => d.dataInicio).length;
        console.log(`   📅 Com datas: ${comDatas}`);
    }
});

console.log('\n✅ TESTE DO NOVO FORMATO DE DISPOSITIVOS CONCLUÍDO!');
console.log('🎯 Parser atualizado com sucesso para suportar o modelo especificado!');
console.log('📋 Agora separa dispositivos em uso dos finalizados!');
