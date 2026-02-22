const ClinicaParser = require('./clinica-parser');
const PacienteParser = require('./paciente-parser');
const ExamesParser = require('./exames-parser');
const EvolucaoParser = require('./evolucao-parser');
const ProntuarioParser = require('./prontuario-parser');
const PrescricaoParser = require('./prescricao-parser');

/**
 * Parser principal do HICD que unifica todos os parsers especializados
 * Mantém compatibilidade com a interface original
 */
class HICDParser {
    constructor() {
        this.debugMode = true;
        // process.env.NODE_ENV === 'development';
        
        // Inicializa parsers especializados
        this.clinicaParser = new ClinicaParser();
        this.pacienteParser = new PacienteParser();
        this.examesParser = new ExamesParser();
        this.evolucaoParser = new EvolucaoParser();
        this.prontuarioParser = new ProntuarioParser();
        this.prescricaoParser = new PrescricaoParser();
        
        this.debug('HICDParser inicializado com parsers especializados');
    }

    /**
     * Habilita/desabilita modo debug em todos os parsers
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.clinicaParser.setDebugMode(enabled);
        this.pacienteParser.setDebugMode(enabled);
        this.examesParser.setDebugMode(enabled);
        this.evolucaoParser.setDebugMode(enabled);
        this.prontuarioParser.setDebugMode(enabled);
        this.debug(`Modo debug ${enabled ? 'habilitado' : 'desabilitado'} para todos os parsers`);
    }

    /**
     * Log de debug condicional
     */
    debug(message, data = null) {
        if (this.debugMode) {
            console.log(`[HICD-PARSER] ${message}`, data || '');
        }
    }

    /**
     * Log de erro
     */
    error(message, error = null) {
        console.error(`[HICD-PARSER ERROR] ${message}`, error || '');
    }

    // ==========================================
    // MÉTODOS DE CLÍNICAS
    // ==========================================

    /**
     * Parse de clínicas (mantém compatibilidade)
     */
    parseClinicas(html) {
        this.debug('Delegando parse de clínicas para ClinicaParser');
        try {
            return this.clinicaParser.parse(html);
        } catch (error) {
            this.error('Erro no parse de clínicas:', error);
            throw error;
        }
    }

    /**
     * Busca clínica específica por código
     */
    findClinicaByCodigo(html, codigo) {
        return this.clinicaParser.findByCode(html, codigo);
    }

    /**
     * Extrai códigos de clínicas disponíveis
     */
    getAvailableClinicaCodes(html) {
        return this.clinicaParser.extractAvailableCodes(html);
    }

    // ==========================================
    // MÉTODOS DE PACIENTES
    // ==========================================

    /**
     * Parse de pacientes (mantém compatibilidade)
     */
    parsePacientes(html, codigoClinica = null) {
        this.debug('Delegando parse de pacientes para PacienteParser', { codigoClinica });
        try {
            return this.pacienteParser.parse(html, codigoClinica);
        } catch (error) {
            this.error('Erro no parse de pacientes:', error);
            throw error;
        }
    }
    parsePacienteCadastro(html, codigoClinica = null) {
        this.debug('Delegando parse de pacientes para PacienteParser', { codigoClinica });
        try {
            return this.pacienteParser.parsePacienteCadastro(html, codigoClinica);
        } catch (error) {
            this.error('Erro no parse de pacientes:', error);
            throw error;
        }
    }

    /**
     * Busca paciente específico por prontuário
     */
    findPacienteByProntuario(html, prontuario, codigoClinica = null) {
        return this.pacienteParser.findByProntuario(html, prontuario, codigoClinica);
    }

    /**
     * Extrai prontuários disponíveis
     */
    getAvailableProntuarios(html, codigoClinica = null) {
        return this.pacienteParser.extractAvailableProntuarios(html, codigoClinica);
    }

    /**
     * Filtra pacientes por critérios
     */
    filterPacientes(pacientes, filtros = {}) {
        return this.pacienteParser.filterPacientes(pacientes, filtros);
    }

    // ==========================================
    // MÉTODOS DE EXAMES
    // ==========================================

    /**
     * Parse de exames (mantém compatibilidade)
     */
    parseExames(html, prontuario = null) {
        this.debug('Delegando parse de exames para ExamesParser', { prontuario });
        try {
            return this.examesParser.parse(html, prontuario);
        } catch (error) {
            this.error('Erro no parse de exames:', error);
            throw error;
        }
    }

    /**
     * Filtra exames por tipo
     */
    filterExamesByTipo(exames, tipo) {
        return this.examesParser.filterByTipo(exames, tipo);
    }

    /**
     * Filtra exames por período
     */
    filterExamesByPeriodo(exames, dataInicio, dataFim) {
        return this.examesParser.filterByPeriodo(exames, dataInicio, dataFim);
    }

    /**
     * Agrupa exames por tipo
     */
    groupExamesByTipo(exames) {
        return this.examesParser.groupByTipo(exames);
    }

    /**
     * Busca exames por termo
     */
    searchExames(exames, termo) {
        return this.examesParser.search(exames, termo);
    }

    /**
     * Extrai tipos de exames disponíveis
     */
    getAvailableExamTypes(html) {
        return this.examesParser.extractAvailableTypes(html);
    }

    /**
     * Gera URLs de impressão para exames
     */
    gerarUrlsImpressao(requisicoes, coPaciente = '', tipoBusca = '') {
        this.debug('Delegando geração de URLs de impressão para ExamesParser', { 
            totalRequisicoes: requisicoes?.length, 
            coPaciente, 
            tipoBusca 
        });
        try {
            return this.examesParser.gerarUrlsImpressao(requisicoes, coPaciente, tipoBusca);
        } catch (error) {
            this.error('Erro na geração de URLs de impressão:', error);
            throw error;
        }
    }

    /**
     * Gera URL de impressão para uma requisição específica
     */
    gerarUrlImpressaoExames(requisicaoId, linha, exames, coPaciente = '', tipoBusca = '') {
        this.debug('Delegando geração de URL de impressão para ExamesParser', { 
            requisicaoId, 
            linha, 
            totalExames: exames?.length 
        });
        try {
            return this.examesParser.gerarUrlImpressaoExames(requisicaoId, linha, exames, coPaciente, tipoBusca);
        } catch (error) {
            this.error('Erro na geração de URL de impressão:', error);
            throw error;
        }
    }

    /**
     * Parse das informações de uma requisição de exame
     */
    parseExameInformacoes($, fieldset, pacienteId, index) {
        return this.examesParser.parseExameInformacoes($, fieldset, pacienteId, index);
    }

    /**
     * Parse da lista de exames dentro de uma requisição
     */
    parseListaExames($, fieldset) {
        return this.examesParser.parseListaExames($, fieldset);
    }

    /**
     * Parse dos resultados de exames de uma URL de impressão
     */
    parseResultadosExames(html, requisicaoId = '') {
        this.debug('Delegando parse de resultados de exames para ExamesParser', { requisicaoId });
        try {
            return this.examesParser.parseResultadosExames(html);
        } catch (error) {
            this.error('Erro no parse de resultados de exames:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS DE EVOLUÇÕES
    // ==========================================

    /**
     * Parse de evoluções (mantém compatibilidade)
     */
    parseEvolucoes(html, prontuario = null) {
        this.debug('Delegando parse de evoluções para EvolucaoParser', { prontuario });
        try {
            return this.evolucaoParser.parse(html, prontuario);
        } catch (error) {
            this.error('Erro no parse de evoluções:', error);
            throw error;
        }
    }

    /**
     * Filtra evoluções por período
     */
    filterEvolucoesByPeriodo(evolucoes, dataInicio, dataFim) {
        return this.evolucaoParser.filterByPeriodo(evolucoes, dataInicio, dataFim);
    }

    /**
     * Filtra evoluções por profissional
     */
    filterEvolucoesByProfissional(evolucoes, profissional) {
        return this.evolucaoParser.filterByProfissional(evolucoes, profissional);
    }

    /**
     * Filtra evoluções por tipo
     */
    filterEvolucoesByTipo(evolucoes, tipo) {
        return this.evolucaoParser.filterByTipo(evolucoes, tipo);
    }

    /**
     * Busca evoluções por termo
     */
    searchEvolucoes(evolucoes, termo) {
        return this.evolucaoParser.search(evolucoes, termo);
    }

    /**
     * Agrupa evoluções por data
     */
    groupEvolucoesByDate(evolucoes) {
        return this.evolucaoParser.groupByDate(evolucoes);
    }

    /**
     * Extrai profissionais únicos
     */
    getUniqueProfissionais(evolucoes) {
        return this.evolucaoParser.extractUniqueProfissionais(evolucoes);
    }

    // ==========================================
    // MÉTODOS DE PRONTUÁRIO
    // ==========================================

    /**
     * Parse completo de prontuário (novo método)
     */
    parseProntuario(html, prontuario = null) {
        this.debug('Delegando parse de prontuário para ProntuarioParser', { prontuario });
        try {
            return this.prontuarioParser.parse(html, prontuario);
        } catch (error) {
            this.error('Erro no parse de prontuário:', error);
            throw error;
        }
    }

    /**
     * Extrai resumo do prontuário
     */
    extractProntuarioResumo(prontuario) {
        return this.prontuarioParser.extractResumo(prontuario);
    }

    // ==========================================
    // MÉTODOS AUXILIARES E UTILITÁRIOS
    // ==========================================

    /**
     * Parse automático baseado no contexto HTML
     * Tenta detectar o tipo de página e aplicar o parser apropriado
     */
    parseAuto(html, context = {}) {
        this.debug('Iniciando parse automático', context);
        
        try {
            const detectedType = this.detectPageType(html);
            this.debug('Tipo de página detectado:', detectedType);

            switch (detectedType) {
                case 'clinicas':
                    return {
                        tipo: 'clinicas',
                        dados: this.parseClinicas(html)
                    };

                case 'pacientes':
                    return {
                        tipo: 'pacientes',
                        dados: this.parsePacientes(html, context.codigoClinica)
                    };

                case 'exames':
                    return {
                        tipo: 'exames',
                        dados: this.parseExames(html, context.prontuario)
                    };

                case 'evolucoes':
                    return {
                        tipo: 'evolucoes',
                        dados: this.parseEvolucoes(html, context.prontuario)
                    };

                case 'prontuario':
                    return {
                        tipo: 'prontuario',
                        dados: this.parseProntuario(html, context.prontuario)
                    };

                default:
                    this.debug('Tipo não detectado, tentando parse de todos os tipos');
                    return this.parseMultiple(html, context);
            }

        } catch (error) {
            this.error('Erro no parse automático:', error);
            throw error;
        }
    }

    /**
     * Detecta o tipo de página baseado no conteúdo HTML
     */
    detectPageType(html) {
        if (!html) return 'unknown';

        const htmlLower = html.toLowerCase();

        // Palavras-chave para diferentes tipos
        const patterns = {
            clinicas: ['clínica', 'clinica', 'clinic', 'código da clínica', 'lista de clínicas'],
            pacientes: ['paciente', 'patient', 'prontuário', 'prontuario', 'lista de pacientes'],
            exames: ['exame', 'exam', 'resultado', 'laboratorial', 'lista de exames'],
            evolucoes: ['evolução', 'evolucao', 'evolution', 'nota médica', 'evolução médica'],
            prontuario: ['prontuário completo', 'dados do paciente', 'histórico médico', 'ficha médica']
        };

        let scores = {};
        
        // Calcula score para cada tipo baseado nas palavras-chave
        for (const [tipo, keywords] of Object.entries(patterns)) {
            scores[tipo] = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'gi');
                const matches = htmlLower.match(regex);
                if (matches) {
                    scores[tipo] += matches.length;
                }
            }
        }

        // Retorna o tipo com maior score
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) return 'unknown';

        return Object.keys(scores).find(key => scores[key] === maxScore);
    }

    /**
     * Parse múltiplo - tenta todos os parsers
     */
    parseMultiple(html, context = {}) {
        const resultados = {
            tipo: 'multiple',
            dados: {}
        };

        // Tenta cada parser
        const parsers = [
            { nome: 'clinicas', metodo: () => this.parseClinicas(html) },
            { nome: 'pacientes', metodo: () => this.parsePacientes(html, context.codigoClinica) },
            { nome: 'exames', metodo: () => this.parseExames(html, context.prontuario) },
            { nome: 'evolucoes', metodo: () => this.parseEvolucoes(html, context.prontuario) },
            { nome: 'prontuario', metodo: () => this.parseProntuario(html, context.prontuario) }
        ];

        for (const parser of parsers) {
            try {
                const resultado = parser.metodo();
                if (resultado && (Array.isArray(resultado) ? resultado.length > 0 : Object.keys(resultado).length > 0)) {
                    resultados.dados[parser.nome] = resultado;
                    this.debug(`Parse ${parser.nome} bem-sucedido:`, { 
                        count: Array.isArray(resultado) ? resultado.length : 'objeto' 
                    });
                }
            } catch (error) {
                this.debug(`Parse ${parser.nome} falhou:`, error.message);
            }
        }

        return resultados;
    }

    // ==========================================
    // MÉTODOS DE PRESCRIÇÕES
    // ==========================================

    /**
     * Parse de prescrições (mantém compatibilidade)
     */
    parsePrescricoes(html, prontuario = null) {
        this.debug('Parse de prescrições iniciado');
        this.prescricaoParser.setDebugMode(this.debugMode);
        return this.prescricaoParser.parse(html, prontuario);
    }

    /**
     * Parse detalhado de uma prescrição específica
     */
    parsePrescricaoDetalhes(html, idPrescricao) {
        this.debug('Parse de detalhes da prescrição iniciado');
        this.prescricaoParser.setDebugMode(this.debugMode);
        return this.prescricaoParser.parsePrescricaoDetalhes(html, idPrescricao);
    }

    /**
     * Filtra prescrições por período
     */
    filterPrescricoesByPeriodo(prescricoes, dataInicio, dataFim) {
        return this.prescricaoParser.filterPrescricoesByPeriodo(prescricoes, dataInicio, dataFim);
    }

    /**
     * Filtra prescrições por clínica
     */
    filterPrescricoesByClinica(prescricoes, clinica) {
        return this.prescricaoParser.filterPrescricoesByClinica(prescricoes, clinica);
    }

    /**
     * Filtra medicamentos por tipo
     */
    filterMedicamentosByTipo(medicamentos, tipo) {
        return this.prescricaoParser.filterMedicamentosByTipo(medicamentos, tipo);
    }

    /**
     * Busca prescrições por termo
     */
    searchPrescricoes(prescricoes, termo) {
        return this.prescricaoParser.searchPrescricoes(prescricoes, termo);
    }

    /**
     * Busca medicamentos por termo
     */
    searchMedicamentos(medicamentos, termo) {
        return this.prescricaoParser.searchMedicamentos(medicamentos, termo);
    }

    /**
     * Agrupa prescrições por data
     */
    groupPrescricoesByDate(prescricoes) {
        return this.prescricaoParser.groupPrescricoesByDate(prescricoes);
    }

    /**
     * Extrai medicamentos únicos
     */
    getUniqueMedicamentos(medicamentos) {
        return this.prescricaoParser.getUniqueMedicamentos(medicamentos);
    }

    // ==========================================
    // MÉTODOS DE PRONTUÁRIO
    // ==========================================

    /**
     * Parse completo de prontuário (novo método)
     */
    parseProntuario(html, prontuario = null) {
        this.debug('Parse de prontuário iniciado');
        this.prontuarioParser.setDebugMode(this.debugMode);
        return this.prontuarioParser.parse(html, prontuario);
    }

    /**
     * Extrai resumo do prontuário
     */
    extractProntuarioResumo(prontuario) {
        return this.prontuarioParser.extractResumo(prontuario);
    }

    // ==========================================
    // MÉTODOS UTILITÁRIOS
    // ==========================================

    /**
     * Valida estrutura HTML básica
     */
    validateHTML(html) {
        if (!html || typeof html !== 'string') {
            throw new Error('HTML inválido ou vazio');
        }

        if (html.trim().length === 0) {
            throw new Error('HTML vazio');
        }

        return true;
    }

    /**
     * Extrai estatísticas gerais do parse
     */
    getParseStats(resultado) {
        const stats = {
            tipo: resultado.tipo,
            timestamp: new Date().toISOString(),
            totais: {}
        };

        if (resultado.tipo === 'multiple') {
            for (const [tipo, dados] of Object.entries(resultado.dados)) {
                stats.totais[tipo] = Array.isArray(dados) ? dados.length : 1;
            }
        } else {
            stats.totais[resultado.tipo] = Array.isArray(resultado.dados) ? resultado.dados.length : 1;
        }

        return stats;
    }

    /**
     * Método de conveniência para debugging
     */
    debugParse(html, context = {}) {
        this.setDebugMode(true);
        try {
            const resultado = this.parseAuto(html, context);
            const stats = this.getParseStats(resultado);
            this.debug('Estatísticas do parse:', stats);
            return resultado;
        } finally {
            this.setDebugMode(false);
        }
    }
}

module.exports = HICDParser;
