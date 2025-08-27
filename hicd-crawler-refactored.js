const HICDHttpClient = require('./src/core/http-client');
const HICDAuthService = require('./src/services/auth-service');
const HICDParser = require('./src/parsers/hicd-parser');
const PatientService = require('./src/services/patient-service');
const EvolutionService = require('./src/services/evolution-service');
const ClinicalDataExtractor = require('./src/extractors/clinical-data-extractor');
const ClinicAnalyzer = require('./src/analyzers/clinic-analyzer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Classe principal do HICD Crawler - refatorada com arquitetura modular
 * 
 * Responsabilidades separadas em:
 * - HICDHttpClient: Comunicação HTTP
 * - HICDAuthService: Autenticação
 * - HICDParser: Parse de dados HTML
 * - PatientService: Gestão de pacientes
 * - EvolutionService: Gestão de evoluções
 * - ClinicalDataExtractor: Extração de dados clínicos
 * - ClinicAnalyzer: Análise de clínicas
 */
class HICDCrawler {
    constructor() {
        // Inicializar componentes modulares
        this.httpClient = new HICDHttpClient();
        this.authService = new HICDAuthService(this.httpClient);
        this.parser = new HICDParser();
        this.patientService = new PatientService(this.httpClient, this.parser);
        this.evolutionService = new EvolutionService(this.httpClient, this.parser);
        this.clinicalExtractor = new ClinicalDataExtractor();
        this.clinicAnalyzer = new ClinicAnalyzer(
            this.patientService, 
            this.evolutionService, 
            this.clinicalExtractor
        );
        
        console.log('[HICDCrawler] Sistema modular inicializado com sucesso');
    }

    // ========================================
    // MÉTODOS DE CONFIGURAÇÃO
    // ========================================

    /**
     * Habilita/desabilita modo debug em todos os componentes
     */
    setDebugMode(enabled) {
        this.authService.setDebugMode(enabled);
        this.parser.setDebugMode(enabled);
        this.clinicalExtractor.setDebugMode(enabled);
        console.log(`[HICD CRAWLER] Modo debug ${enabled ? 'habilitado' : 'desabilitado'} em todos os componentes`);
    }

    // ========================================
    // MÉTODOS DE AUTENTICAÇÃO
    // ========================================

    /**
     * Faz login no sistema
     */
    async login() {
        const result = await this.authService.login();
        if (result.success) {
            this.isLoggedIn = true;
        }
        return result;
    }

    /**
     * Faz logout do sistema
     */
    async logout() {
        await this.authService.logout();
        this.isLoggedIn = false;
    }

    /**
     * Verifica se está autenticado
     */
    get isLoggedIn() {
        return this.authService.isAuthenticated();
    }

    set isLoggedIn(value) {
        // Este setter existe para compatibilidade com código legado
        // O estado real é gerenciado pelo AuthService
    }

    // ========================================
    // MÉTODOS DE BUSCA DE DADOS
    // ========================================

    /**
     * Busca clínicas disponíveis
     */
    async getClinicas() {
        this.verificarAutenticacao();
        return await this.patientService.getClinicas();
    }

    /**
     * Busca todos os pacientes do sistema
     */
    async buscarPacientes() {
        this.verificarAutenticacao();
        return await this.patientService.buscarPacientes();
    }

    /**
     * Busca pacientes de uma clínica específica
     */
    async getPacientesClinica(codigoClinica, referencia = '', filtroNome = '', ordem = '') {
        this.verificarAutenticacao();
        return await this.patientService.getPacientesClinica(codigoClinica, referencia, filtroNome, ordem);
    }

    /**
     * Busca paciente por leito específico
     */
    async buscarPacientePorLeito(leitoDesejado) {
        this.verificarAutenticacao();
        return await this.patientService.buscarPacientePorLeito(leitoDesejado);
    }

    /**
     * Busca cadastro do paciente
     */
    async getPacienteCadastro(pacienteId, tipoBusca = 'PRONT') {
        this.verificarAutenticacao();
        return await this.evolutionService.getPacienteCadastro(pacienteId, tipoBusca);
    }

    /**
     * Busca evoluções do paciente
     */
    async getEvolucoes(pacienteId, filtros = {}) {
        this.verificarAutenticacao();
        return await this.evolutionService.getEvolucoes(pacienteId, filtros);
    }
    /**
     * Busca exames do Paciente
     */
    async getExames(pacienteId, filtros = {}) {
        this.verificarAutenticacao();
        return await this.evolutionService.getResultadosExames(pacienteId, filtros);
    }

    // ========================================
    // MÉTODOS DE ANÁLISE CLÍNICA
    // ========================================

    /**
     * Extrai dados clínicos da última evolução médica
     */
    async extrairDadosClinicosUltimaEvolucao(pacienteId) {
        this.verificarAutenticacao();
        console.log(`🔬 Extraindo dados clínicos da última evolução médica do paciente ${pacienteId}...`);
        
        try {
            const evolucoes = await this.evolutionService.getEvolucoes(pacienteId);
            return await this.clinicalExtractor.extrairDadosClinicosUltimaEvolucao(evolucoes);
        } catch (error) {
            console.error(`❌ Erro ao extrair dados clínicos do paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    /**
     * Analisa todos os pacientes de uma clínica específica
     */
    async analisarClinica(nomeClinica, opcoes = {}) {
        this.verificarAutenticacao();
        return await this.clinicAnalyzer.analisarClinica(nomeClinica, opcoes);
    }

    /**
     * Método específico para analisar a Enfermaria G
     */
    async analisarEnfermariaG(opcoes = {}) {
        return await this.clinicAnalyzer.analisarEnfermariaG(opcoes);
    }

    /**
     * Método genérico para analisar qualquer enfermaria
     */
    async analisarEnfermaria(enfermaria, opcoes = {}) {
        return await this.clinicAnalyzer.analisarEnfermaria(enfermaria, opcoes);
    }

    // ========================================
    // MÉTODOS DE BUSCA COMPLETA (LEGADO)
    // ========================================

    /**
     * Busca completa de paciente por leito com dados detalhados e análise clínica
     */
    async buscarPacienteComAnaliseClinica(leitoDesejado) {
        console.log(`\n🔍 Iniciando busca com análise clínica para leito ${leitoDesejado}...`);
        
        try {
            // Primeiro buscar os pacientes no leito
            const pacientesEncontrados = await this.buscarPacientePorLeito(leitoDesejado);
            
            if (pacientesEncontrados.length === 0) {
                console.log(`❌ Nenhum paciente encontrado no leito ${leitoDesejado}`);
                return {
                    leito: leitoDesejado,
                    pacientesEncontrados: 0,
                    pacientes: [],
                    timestamp: new Date().toISOString()
                };
            }

            const dadosCompletos = [];

            for (const paciente of pacientesEncontrados) {
                console.log(`\n🔬 Analisando paciente: ${paciente.nome} (${paciente.prontuario})`);
                
                try {
                    const analiseClinica = await this.extrairDadosClinicosUltimaEvolucao(paciente.prontuario);
                    
                    dadosCompletos.push({
                        paciente: paciente,
                        analiseClinica: analiseClinica,
                        timestamp: new Date().toISOString()
                    });
                    
                } catch (error) {
                    console.error(`❌ Erro na análise clínica do paciente ${paciente.nome}:`, error.message);
                    dadosCompletos.push({
                        paciente: paciente,
                        analiseClinica: null,
                        erro: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            const resultado = {
                leito: leitoDesejado,
                pacientesEncontrados: pacientesEncontrados.length,
                pacientes: dadosCompletos,
                timestamp: new Date().toISOString()
            };

            // Salvar resultado
            await this.salvarBuscaComAnaliseClinica(resultado);

            return resultado;

        } catch (error) {
            console.error(`[BUSCA COM ANÁLISE] Erro:`, error.message);
            throw error;
        }
    }

    /**
     * Busca completa de paciente por leito com dados detalhados
     */
    async buscarPacienteDetalhadoPorLeito(leitoDesejado) {
        try {
            // Primeiro buscar os pacientes no leito
            const pacientesEncontrados = await this.buscarPacientePorLeito(leitoDesejado);
            
            if (pacientesEncontrados.length === 0) {
                console.log(`❌ Nenhum paciente encontrado no leito ${leitoDesejado}`);
                return {
                    leito: leitoDesejado,
                    pacientesEncontrados: 0,
                    pacientes: [],
                    timestamp: new Date().toISOString()
                };
            }

            const dadosDetalhados = [];

            for (const paciente of pacientesEncontrados) {
                console.log(`\n📋 Buscando dados detalhados: ${paciente.nome} (${paciente.prontuario})`);
                
                try {
                    const cadastro = await this.getPacienteCadastro(paciente.prontuario);
                    const evolucoes = await this.getEvolucoes(paciente.prontuario);
                    
                    dadosDetalhados.push({
                        paciente: paciente,
                        cadastro: cadastro,
                        evolucoes: evolucoes,
                        timestamp: new Date().toISOString()
                    });
                    
                } catch (error) {
                    console.error(`❌ Erro ao buscar dados do paciente ${paciente.nome}:`, error.message);
                    dadosDetalhados.push({
                        paciente: paciente,
                        cadastro: null,
                        evolucoes: [],
                        erro: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            const resultado = {
                leito: leitoDesejado,
                pacientesEncontrados: pacientesEncontrados.length,
                pacientes: dadosDetalhados,
                timestamp: new Date().toISOString()
            };

            // Salvar resultado
            await this.salvarBuscaPorLeito(resultado);

            return resultado;

        } catch (error) {
            console.error(`[BUSCA DETALHADA] Erro:`, error.message);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS DE EXTRAÇÃO E SALVAMENTO
    // ========================================

    /**
     * Extrai dados do sistema (funcionalidade principal legada)
     */
    async extractData() {
        this.verificarAutenticacao();

        console.log('[EXTRAÇÃO] Iniciando extração de dados...');
        const extractedData = [];

        try {
            const clinicas = await this.getClinicas();
            
            for (const clinica of clinicas) {
                console.log(`[EXTRAÇÃO] Processando clínica: ${clinica.nome}`);
                const pacientes = await this.getPacientesClinica(clinica.codigo);
                
                for (const paciente of pacientes) {
                    const dadosPaciente = {
                        clinica: clinica.nome,
                        paciente: paciente,
                        timestamp: new Date().toISOString()
                    };
                    
                    extractedData.push(dadosPaciente);
                }
                
                await this.httpClient.delay(1000);
            }

            console.log(`[EXTRAÇÃO] ✅ Extração concluída: ${extractedData.length} registros`);
            return extractedData;

        } catch (error) {
            console.error('[EXTRAÇÃO] Erro durante extração:', error.message);
            throw error;
        }
    }

    /**
     * Salva dados extraídos
     */
    async saveData(data, format = 'json') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = './output';
            
            // Criar diretório de saída se não existir
            await fs.mkdir(outputDir, { recursive: true });

            if (format.toLowerCase() === 'json') {
                const filename = path.join(outputDir, `hicd-data-${timestamp}.json`);
                await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
                console.log(`[SALVAMENTO] ✅ Dados salvos em JSON: ${filename}`);
                
            } else if (format.toLowerCase() === 'csv') {
                const csvData = this.convertToCSV(data);
                const filename = path.join(outputDir, `hicd-data-${timestamp}.csv`);
                await fs.writeFile(filename, csvData, 'utf8');
                console.log(`[SALVAMENTO] ✅ Dados salvos em CSV: ${filename}`);
            }

            // Salvar também um log da execução
            const logFilename = path.join(outputDir, `hicd-log-${timestamp}.txt`);
            const logData = {
                timestamp: new Date().toISOString(),
                recordsCount: data.length,
                executionSummary: `Extração concluída com ${data.length} registros`
            };
            await fs.writeFile(logFilename, JSON.stringify(logData, null, 2), 'utf8');

        } catch (error) {
            console.error('[SALVAMENTO] Erro ao salvar dados:', error.message);
            throw error;
        }
    }

    /**
     * Converte dados para CSV
     */
    convertToCSV(data) {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Escapar valores que contêm vírgulas ou aspas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Salva resultado da busca com análise clínica
     */
    async salvarBuscaComAnaliseClinica(dados) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = './output';
            const leitoSeguro = dados.leito.replace(/[^a-zA-Z0-9]/g, '');
            
            await fs.mkdir(outputDir, { recursive: true });

            const filename = path.join(outputDir, `busca-clinica-leito-${leitoSeguro}-${timestamp}.json`);
            await fs.writeFile(filename, JSON.stringify(dados, null, 2), 'utf8');
            
            console.log(`\n💾 Dados completos salvos em: ${filename}`);
            this.logResumoClinico(dados);

        } catch (error) {
            console.error('[SALVAMENTO CLÍNICO] Erro ao salvar busca com análise clínica:', error.message);
        }
    }

    /**
     * Salva resultado da busca por leito
     */
    async salvarBuscaPorLeito(dados) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = './output';
            const leitoSeguro = dados.leito.replace(/[^a-zA-Z0-9]/g, '');
            
            await fs.mkdir(outputDir, { recursive: true });

            const filename = path.join(outputDir, `busca-leito-${leitoSeguro}-${timestamp}.json`);
            await fs.writeFile(filename, JSON.stringify(dados, null, 2), 'utf8');
            
            console.log(`\n💾 Dados salvos em: ${filename}`);
            
            // Log resumo
            console.log(`\n📊 RESUMO DA BUSCA:`);
            console.log(`- Leito pesquisado: ${dados.leito}`);
            console.log(`- Pacientes encontrados: ${dados.pacientesEncontrados}`);

        } catch (error) {
            console.error('[SALVAMENTO] Erro ao salvar busca por leito:', error.message);
        }
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    /**
     * Verifica se está autenticado
     */
    verificarAutenticacao() {
        if (!this.authService.isAuthenticated()) {
            throw new Error('É necessário fazer login antes de usar esta funcionalidade');
        }
    }

    /**
     * Log resumo clínico
     */
    logResumoClinico(dados) {
        console.log(`\n🏥 RESUMO CLÍNICO DA BUSCA:`);
        console.log(`- Leito pesquisado: ${dados.leito}`);
        console.log(`- Pacientes encontrados: ${dados.pacientesEncontrados}`);
        
        if (dados.pacientes.length > 0) {
            const pacientesComAnalise = dados.pacientes.filter(p => p.analiseClinica);
            console.log(`- Análises clínicas realizadas: ${pacientesComAnalise.length}`);
            
            const pacientesComHDA = pacientesComAnalise.filter(p => p.analiseClinica.hda);
            console.log(`- Pacientes com HDA: ${pacientesComHDA.length}`);
            
            const pacientesComDiagnosticos = pacientesComAnalise.filter(p => 
                p.analiseClinica.hipotesesDiagnosticas && p.analiseClinica.hipotesesDiagnosticas.length > 0);
            console.log(`- Pacientes com diagnósticos: ${pacientesComDiagnosticos.length}`);
        }
    }
}

module.exports = HICDCrawler;
