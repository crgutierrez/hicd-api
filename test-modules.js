// Teste simples de carregamento dos módulos refatorados
console.log('🧪 Testando carregamento dos módulos refatorados...\n');

const modules = [
    { name: 'HttpClient', path: './src/core/http-client' },
    { name: 'AuthService', path: './src/services/auth-service' },
    { name: 'Parser', path: './src/parsers/hicd-parser' },
    { name: 'PatientService', path: './src/services/patient-service' },
    { name: 'EvolutionService', path: './src/services/evolution-service' },
    { name: 'ClinicalExtractor', path: './src/extractors/clinical-data-extractor' },
    { name: 'ClinicAnalyzer', path: './src/analyzers/clinic-analyzer' },
    { name: 'HICDCrawler', path: './hicd-crawler-refactored' }
];

let sucessos = 0;
let falhas = 0;

for (const module of modules) {
    try {
        require(module.path);
        console.log(`✅ ${module.name}: OK`);
        sucessos++;
    } catch (error) {
        console.error(`❌ ${module.name}: ERRO - ${error.message}`);
        falhas++;
    }
}

console.log(`\n📊 Resultado: ${sucessos} sucessos, ${falhas} falhas`);

if (falhas === 0) {
    console.log('🎉 Todos os módulos carregados com sucesso!');
    
    // Teste de instanciação
    try {
        const HICDCrawler = require('./hicd-crawler-refactored');
        const crawler = new HICDCrawler();
        console.log('✅ Instanciação do crawler: OK');
        console.log('📋 Componentes disponíveis:');
        console.log(`   - httpClient: ${!!crawler.httpClient}`);
        console.log(`   - authService: ${!!crawler.authService}`);
        console.log(`   - parser: ${!!crawler.parser}`);
        console.log(`   - patientService: ${!!crawler.patientService}`);
        console.log(`   - evolutionService: ${!!crawler.evolutionService}`);
        console.log(`   - clinicalExtractor: ${!!crawler.clinicalExtractor}`);
        console.log(`   - clinicAnalyzer: ${!!crawler.clinicAnalyzer}`);
    } catch (error) {
        console.error('❌ Erro na instanciação:', error.message);
    }
} else {
    console.log('❌ Há problemas nos módulos. Verifique os erros acima.');
    process.exit(1);
}
