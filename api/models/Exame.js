/**
 * Modelo de dados para Exames Laboratoriais
 */
class Exame {
    constructor(data = {}) {
        this.id = data.id || null;
        this.pacienteId = data.pacienteId || null;
        this.requisicaoId = data.requisicaoId || data.requisicao || null;
        this.data = data.data || null;
        this.hora = data.hora || null;
        this.medico = data.medico || null;
        this.clinica = data.clinica || null;
        this.unidadeSaude = data.unidadeSaude || null;
        
        // Lista de exames solicitados
        this.examesSolicitados = data.exames || data.examesSolicitados || [];
        
        // Resultados dos exames (quando disponíveis)
        this.resultados = data.resultados || [];
        
        // Status da requisição
        this.status = {
            coletado: data.coletado || false,
            processado: data.processado || false,
            liberado: data.liberado || false,
            temResultados: (data.resultados && data.resultados.length > 0) || false
        };
        
        // URLs relacionadas
        this.urls = {
            impressao: data.urlImpressao || null,
            parametros: data.parametrosUrl || null
        };
        
        // Metadados
        this.metadata = {
            totalExamesSolicitados: this.examesSolicitados.length,
            totalResultados: this.resultados.length,
            dataProcessamento: data.dataProcessamento || new Date().toISOString(),
            fonte: 'HICD',
            versao: '1.0'
        };
    }

    /**
     * Cria um objeto Exame a partir dos dados do parser
     */
    static fromParserData(parserData) {
        console.log(parserData)
        if (!parserData) return null;

        return new Exame({
            id: parserData.id,
            pacienteId: parserData.pacienteId,
            requisicaoId: parserData.requisicaoId || parserData.requisicao,
            data: parserData.data,
            hora: parserData.hora,
            medico: parserData.medico,
            clinica: parserData.clinica,
            unidadeSaude: parserData.unidadeSaude,
            exames: parserData.exames || [],
            resultados: parserData.resultados || []
        });
    }

    /**
     * Cria um objeto Exame com resultados completos
     */
    static fromResultadosCompletos(dadosCompletos) {
        if (!dadosCompletos) return null;

        const exame = new Exame({
            requisicaoId: dadosCompletos.requisicao,
            data: dadosCompletos.data,
            hora: dadosCompletos.hora,
            medico: dadosCompletos.medico,
            clinica: dadosCompletos.clinica,
            exames: dadosCompletos.exames || [],
            resultados: dadosCompletos.resultados || [],
            urlImpressao: dadosCompletos.url,
            parametrosUrl: dadosCompletos.param,
            dataProcessamento: dadosCompletos.dataProcessamento
        });

        // Atualizar status baseado nos resultados
        exame.status.temResultados = dadosCompletos.totalResultados > 0;
        exame.status.liberado = dadosCompletos.totalResultados > 0;

        return exame;
    }

    /**
     * Adiciona um resultado de exame
     */
    adicionarResultado(resultado) {
        if (!resultado) return;

        const resultadoFormatado = new ResultadoExame(resultado);
        this.resultados.push(resultadoFormatado);
        
        // Atualizar metadados
        this.metadata.totalResultados = this.resultados.length;
        this.status.temResultados = this.resultados.length > 0;
        
        return resultadoFormatado;
    }

    /**
     * Busca resultados por sigla
     */
    buscarResultadoPorSigla(sigla) {
        return this.resultados.filter(resultado => 
            resultado.sigla && resultado.sigla.toLowerCase() === sigla.toLowerCase()
        );
    }

    /**
     * Obtém todas as siglas dos resultados
     */
    obterSiglasResultados() {
        return [...new Set(this.resultados.map(r => r.sigla).filter(Boolean))];
    }

    /**
     * Retorna uma versão resumida do exame
     */
    toResumo() {
        return {
            id: this.id,
            pacienteId: this.pacienteId,
            requisicaoId: this.requisicaoId,
            data: this.data,
            hora: this.hora,
            medico: this.medico,
            clinica: this.clinica,
            status: this.status,
            resumo: {
                totalExamesSolicitados: this.metadata.totalExamesSolicitados,
                totalResultados: this.metadata.totalResultados,
                siglasDisponveis: this.obterSiglasResultados().slice(0, 5) // Primeiras 5 siglas
            },
            metadata: {
                dataProcessamento: this.metadata.dataProcessamento,
                fonte: this.metadata.fonte
            }
        };
    }

    /**
     * Retorna todos os dados do exame
     */
    toCompleto() {
        return {
            id: this.id,
            pacienteId: this.pacienteId,
            requisicaoId: this.requisicaoId,
            data: this.data,
            hora: this.hora,
            medico: this.medico,
            clinica: this.clinica,
            unidadeSaude: this.unidadeSaude,
            examesSolicitados: this.examesSolicitados,
            resultados: this.resultados.map(r => r.toCompleto ? r.toCompleto() : r),
            status: this.status,
            urls: this.urls,
            metadata: this.metadata
        };
    }

    /**
     * Retorna apenas os resultados dos exames
     */
    toResultados() {
        return {
            requisicaoId: this.requisicaoId,
            data: this.data,
            hora: this.hora,
            medico: this.medico,
            resultados: this.resultados.map(r => r.toCompleto ? r.toCompleto() : r),
            resumoEstatistico: {
                totalResultados: this.metadata.totalResultados,
                siglasUnicas: this.obterSiglasResultados().length,
                siglasDisponveis: this.obterSiglasResultados()
            },
            metadata: {
                dataProcessamento: this.metadata.dataProcessamento,
                fonte: this.metadata.fonte
            }
        };
    }

    /**
     * Valida se os dados obrigatórios estão presentes
     */
    isValid() {
        return !!(this.requisicaoId && this.pacienteId);
    }

    /**
     * Agrupa exames por tipo/categoria
     */
    static agruparPorTipo(exames) {
        const grupos = {
            hemograma: [],
            bioquimica: [],
            coagulacao: [],
            microbiologia: [],
            imunologia: [],
            outros: []
        };

        exames.forEach(exame => {
            const siglas = exame.obterSiglasResultados();
            
            if (siglas.some(s => ['HPL', 'HTO', 'HGB', 'WBC', 'RBC', 'PLT'].includes(s))) {
                grupos.hemograma.push(exame);
            } else if (siglas.some(s => ['GLI', 'URE', 'CRT', 'TG0', 'TG2'].includes(s))) {
                grupos.bioquimica.push(exame);
            } else if (siglas.some(s => ['TET', 'TPT', 'TTPA', 'RNI'].includes(s))) {
                grupos.coagulacao.push(exame);
            } else if (siglas.some(s => ['SFF', 'HVC', 'H1V'].includes(s))) {
                grupos.imunologia.push(exame);
            } else {
                grupos.outros.push(exame);
            }
        });

        return grupos;
    }
}

/**
 * Modelo para resultado individual de exame
 */
class ResultadoExame {
    constructor(data = {}) {
        this.sigla = data.sigla || null;
        this.valor = data.valor || null;
        this.unidade = data.unidade || null;
        this.valorNumerico = data.valorNumerico || null;
        this.referencia = data.referencia || null;
        this.status = data.status || 'normal';
        this.observacoes = data.observacoes || null;
        
        // Metadados do resultado
        this.metadata = {
            dataExtracao: new Date().toISOString(),
            fonte: 'HICD'
        };
    }

    /**
     * Retorna versão completa do resultado
     */
    toCompleto() {
        return {
            sigla: this.sigla,
            valor: this.valor,
            unidade: this.unidade,
            valorNumerico: this.valorNumerico,
            referencia: this.referencia,
            status: this.status,
            observacoes: this.observacoes,
            metadata: this.metadata
        };
    }

    /**
     * Retorna versão resumida do resultado
     */
    toResumo() {
        return {
            sigla: this.sigla,
            valor: this.valor,
            unidade: this.unidade,
            status: this.status
        };
    }

    /**
     * Verifica se o resultado é válido
     */
    isValid() {
        return !!(this.sigla && this.valor);
    }
}

module.exports = { Exame, ResultadoExame };
