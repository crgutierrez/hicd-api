const HICDCrawler = require('./hicd-crawler-refactored');

/**
 * Exemplo de uso do HICD Crawler refatorado
 * 
 * A nova arquitetura modular separou as responsabilidades:
 * - Crawler principal: Coordenação geral
 * - HttpClient: Comunicação HTTP
 * - AuthService: Autenticação
 * - Parser: Parse de dados HTML
 * - PatientService: Gestão de pacientes
 * - EvolutionService: Gestão de evoluções
 * - ClinicalDataExtractor: Extração de dados clínicos
 * - ClinicAnalyzer: Análise de clínicas
 */

async function exemploUso() {
    const crawler = new HICDCrawler();
    
    try {
        // Habilitar modo debug (opcional)
        crawler.setDebugMode(true);
        
        console.log('🚀 EXEMPLO DE USO - HICD CRAWLER REFATORADO');
        console.log('='.repeat(50));
        
        // 1. Fazer login
        console.log('\n1️⃣ Fazendo login...');
        const loginResult = await crawler.login();
        
        if (!loginResult.success) {
            console.error('❌ Falha no login:', loginResult.message);
            return;
        }
        
        console.log('✅ Login realizado com sucesso!');
        
        // 2. Listar clínicas disponíveis
        console.log('\n2️⃣ Buscando clínicas disponíveis...');
        const clinicas = await crawler.getClinicas();
        console.log(`✅ ${clinicas.length} clínicas encontradas`);
        
        // 3. Buscar pacientes de uma clínica específica
        console.log('\n3️⃣ Buscando pacientes da ENFERMARIA G...');
        const pacientesEnfermariaG = await crawler.getPacientesClinica('012');
        console.log(`✅ ${pacientesEnfermariaG.length} pacientes encontrados na ENFERMARIA G`);
        
        // 4. Análise completa de uma clínica
        console.log('\n4️⃣ Realizando análise completa da ENFERMARIA G...');
        const analiseCompleta = await crawler.analisarEnfermariaG({
            salvarArquivo: true,
            incluirDetalhes: true,
            diretorioSaida: 'output'
        });
        
        console.log('✅ Análise completa realizada!');
        console.log(`📊 Resumo: ${analiseCompleta.resumo}`);
        
        // 5. Buscar paciente por leito específico
        console.log('\n5️⃣ Buscando paciente no leito G1...');
        const pacienteLeito = await crawler.buscarPacientePorLeito('G1');
        console.log(`✅ ${pacienteLeito.length} paciente(s) encontrado(s) no leito G1`);
        
        // 6. Análise clínica de um paciente específico
        if (pacientesEnfermariaG.length > 0) {
            const primeiroPaciente = pacientesEnfermariaG[0];
            console.log(`\n6️⃣ Analisando dados clínicos do paciente ${primeiroPaciente.nome}...`);
            
            const dadosClinicosYes = await crawler.extrairDadosClinicosUltimaEvolucao(primeiroPaciente.prontuario);
            
            if (dadosClinicosYes) {
                console.log('✅ Dados clínicos extraídos:');
                console.log(`   - HDA: ${dadosClinicosYes.hda ? 'Encontrada' : 'Não encontrada'}`);
                console.log(`   - Hipóteses diagnósticas: ${dadosClinicosYes.hipotesesDiagnosticas?.length || 0}`);
                console.log(`   - Profissional: ${dadosClinicosYes.profissionalResponsavel || 'N/A'}`);
            }
        }
        
        // 7. Busca completa com análise clínica por leito
        console.log('\n7️⃣ Busca completa com análise clínica para leito G2...');
        const buscaCompleta = await crawler.buscarPacienteComAnaliseClinica('G2');
        console.log(`✅ Busca completa realizada: ${buscaCompleta.pacientesEncontrados} paciente(s)`);
        
        // 8. Logout
        console.log('\n8️⃣ Fazendo logout...');
        await crawler.logout();
        console.log('✅ Logout realizado!');
        
        console.log('\n🎉 EXEMPLO CONCLUÍDO COM SUCESSO!');
        console.log('📁 Verifique a pasta "output" para os arquivos gerados');
        
    } catch (error) {
        console.error('❌ Erro durante execução:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Executar exemplo apenas se este arquivo for executado diretamente
if (require.main === module) {
    exemploUso().catch(console.error);
}

module.exports = { exemploUso };
