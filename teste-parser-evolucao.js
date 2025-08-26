#!/usr/bin/env node

const HICDParser = require('./src/parsers/hicd-parser');

// HTML de exemplo baseado na estrutura fornecida
const htmlTeste = `
<div id="areaHistEvol">
    <div class="row">
        <div class="col-lg-4">
            <b>Profissional:</b>
        </div>
        <div class="col-lg-8">
            TAMILA FERNANDES ARAGAO
        </div>
    </div>
    <div class="row">
        <div class="col-lg-4">
            <b>Data Evolução:</b>
        </div>
        <div class="col-lg-8">
            23/08/2025 15:28:30
        </div>
    </div>
    <div class="row">
        <div class="col-lg-4">
            <b>Atividade:</b>
        </div>
        <div class="col-lg-8">
            PEDIATRA Sub-Atividade: PEDIATRA - UTI PEDIATRICA
        </div>
    </div>
    <div class="row">
        <div class="col-lg-4">
            <b>Data Atualização:</b>
        </div>
        <div class="col-lg-8">
            23/08/2025 15:28:30
        </div>
    </div>
    <div class="row">
        <div class="col-lg-4">
            <b>Clinica / Leito:</b>
        </div>
        <div class="col-lg-8">
            007-U T I
        </div>
    </div>
    <div class="panel-body">
        <fieldset>
            <div id="txtView">
                Admissão em UTIP<br>
                Nome: Abbie Narcimar Mata Farias<br>
                Data de nascimento: 27/06/2025<br>
                Idade: 2 meses<br>
                Mãe: Inês Maria Farias Asencio<br>
                Peso 19/08: 3,405kg<br><br>
                
                Hipóteses diagnósticas:<br>
                Recém-nascido pré-termo<br>
                Malformação fetal - Holoprosencefalia semilobar<br>
                Crise convulsiva<br><br>
                
                Em uso:<br>
                Piperacilina + Tazobactam 299,6mg/kg/dia<br>
                Fenobarbital (5)<br>
                Levetiracetam (41,2)<br><br>
                
                Exames laboratoriais:<br>
                Hb:8,3;Ht:27,1%; Leuco:6000<br>
                PCR:28,99; Ureia: 12<br>
            </div>
        </fieldset>
    </div>
</div>
`;

console.log('🧪 TESTE DO PARSER DE EVOLUÇÃO');
console.log('=====================================');

try {
    const parser = new HICDParser();
    const evolucoes = parser.parseEvolucoes(htmlTeste, 'TESTE123');
    
    console.log(`✅ Parser executado com sucesso!`);
    console.log(`📊 Evoluções extraídas: ${evolucoes.length}`);
    
    if (evolucoes.length > 0) {
        const evolucao = evolucoes[0];
        console.log('\n📋 DADOS EXTRAÍDOS:');
        console.log('=====================================');
        console.log(`👨‍⚕️ Profissional: ${evolucao.profissional}`);
        console.log(`📅 Data Evolução: ${evolucao.dataEvolucao}`);
        console.log(`🏥 Atividade: ${evolucao.atividade}`);
        console.log(`🔧 Sub-Atividade: ${evolucao.subAtividade}`);
        console.log(`📅 Data Atualização: ${evolucao.dataAtualizacao}`);
        console.log(`🏥 Clínica/Leito: ${evolucao.clinicaLeito}`);
        console.log(`📝 Descrição: ${evolucao.descricao.substring(0, 100)}...`);
        
        console.log('\n🔍 DADOS ESTRUTURADOS DETALHADOS:');
        console.log('=====================================');
        console.log(`⚖️ Peso: ${evolucao.dadosEstruturados?.sinaisVitais?.peso || 'Não encontrado'}`);
        
        if (evolucao.dadosEstruturados?.hipotesesDiagnosticas?.length > 0) {
            console.log(`📊 Hipóteses Diagnósticas (${evolucao.dadosEstruturados.hipotesesDiagnosticas.length}):`);
            evolucao.dadosEstruturados.hipotesesDiagnosticas.forEach((hip, i) => {
                console.log(`   ${i + 1}. ${hip}`);
            });
        }
        
        if (evolucao.dadosEstruturados?.medicamentos?.length > 0) {
            console.log(`💊 Medicamentos em Uso (${evolucao.dadosEstruturados.medicamentos.length}):`);
            evolucao.dadosEstruturados.medicamentos.forEach((med, i) => {
                console.log(`   ${i + 1}. ${med}`);
            });
        }
        
        if (evolucao.dadosEstruturados?.exames?.length > 0) {
            console.log(`🧪 Exames Laboratoriais (${evolucao.dadosEstruturados.exames.length}):`);
            evolucao.dadosEstruturados.exames.forEach((exam, i) => {
                console.log(`   ${i + 1}. ${exam}`);
            });
        }
        
        // Outros sinais vitais se extraídos
        const sinais = evolucao.dadosEstruturados?.sinaisVitais;
        if (sinais && Object.keys(sinais).length > 1) {
            console.log(`💓 Outros Sinais Vitais:`);
            Object.entries(sinais).forEach(([key, value]) => {
                if (key !== 'peso') {
                    console.log(`   ${key}: ${value}`);
                }
            });
        }
        
        console.log('\n📄 TEXTO COMPLETO:');
        console.log('=====================================');
        console.log(evolucao.textoCompleto.substring(0, 300) + '...');
        
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    } else {
        console.log('❌ Nenhuma evolução foi extraída');
    }
    
} catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error(error.stack);
}
