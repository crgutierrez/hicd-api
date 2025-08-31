/**
 * Modelo de dados para Evolução Médica
 */
class Evolucao {
    constructor(data = {}) {
        this.id = data.id || null;
        this.pacienteId = data.pacienteId || null;
        this.dataEvolucao = data.dataEvolucao || null;
        this.dataAtualizacao = data.dataAtualizacao || null;
        this.profissional = data.profissional || null;
        this.atividade = data.atividade || null;
        this.subAtividade = data.subAtividade || null;
        this.clinicaLeito = data.clinicaLeito || null;
        
        // Conteúdo principal
        this.conteudo = {
            textoCompleto: data.textoCompleto || data.descricao || null,
            resumo: data.resumo || null
        };
        
        // Dados estruturados extraídos da evolução
        this.dadosClinicosEstruturados = data.dadosEstruturados || data.dadosClinicosEstruturados || {
            hipotesesDiagnosticas: [],
            medicamentos: [],
            medicamentosAnteriores: [],
            exames: [],
            sinaisVitais: {},
            procedimentos: []
        };
        
        // Metadados
        this.metadata = {
            tamanhoTexto: this.conteudo.textoCompleto ? this.conteudo.textoCompleto.length : 0,
            temDiagnostico: this._analisarPresencaDiagnostico(),
            temMedicamentos: this.dadosClinicosEstruturados.medicamentos?.length > 0,
            temSinaisVitais: Object.keys(this.dadosClinicosEstruturados.sinaisVitais || {}).length > 0,
            dataExtracao: new Date().toISOString(),
            fonte: 'HICD',
            versao: '1.0'
        };
    }

    /**
     * Cria um objeto Evolução a partir dos dados do parser
     */
    static fromParserData(parserData) {
        if (!parserData) return null;

        return new Evolucao({
            id: parserData.id,
            pacienteId: parserData.pacienteId,
            dataEvolucao: parserData.dataEvolucao,
            dataAtualizacao: parserData.dataAtualizacao,
            profissional: parserData.profissional,
            atividade: parserData.atividade,
            subAtividade: parserData.subAtividade,
            clinicaLeito: parserData.clinicaLeito,
            textoCompleto: parserData.textoCompleto || parserData.descricao,
            dadosEstruturados: parserData.dadosEstruturados
        });
    }

    /**
     * Analisa se há diagnóstico no texto
     */
    _analisarPresencaDiagnostico() {
        if (!this.conteudo.textoCompleto) return false;
        
        const texto = this.conteudo.textoCompleto.toLowerCase();
        return texto.includes('diagnóstico') || 
               texto.includes('hipótese') ||
               texto.includes('suspeita') ||
               texto.includes('cid');
    }

    /**
     * Gera um resumo automático da evolução
     */
    gerarResumo(tamanhoMaximo = 200) {
        if (!this.conteudo.textoCompleto) return null;
        
        const texto = this.conteudo.textoCompleto.trim();
        if (texto.length <= tamanhoMaximo) {
            return texto;
        }
        
        // Tentar quebrar em uma frase completa
        const resumoBase = texto.substring(0, tamanhoMaximo);
        const ultimoPonto = resumoBase.lastIndexOf('.');
        const ultimaVirgula = resumoBase.lastIndexOf(',');
        
        let pontoCorte = ultimoPonto > (tamanhoMaximo * 0.7) ? ultimoPonto + 1 : 
                        ultimaVirgula > (tamanhoMaximo * 0.8) ? ultimaVirgula + 1 : 
                        tamanhoMaximo;
        
        this.conteudo.resumo = texto.substring(0, pontoCorte) + 
                              (pontoCorte < texto.length ? '...' : '');
        
        return this.conteudo.resumo;
    }

    /**
     * Retorna uma versão resumida da evolução
     */
    toResumo() {
        return {
            id: this.id,
            pacienteId: this.pacienteId,
            dataEvolucao: this.dataEvolucao,
            profissional: this.profissional,
            atividade: this.atividade,
            clinicaLeito: this.clinicaLeito,
            resumo: this.conteudo.resumo || this.gerarResumo(),
            indicadores: {
                temDiagnostico: this.metadata.temDiagnostico,
                temMedicamentos: this.metadata.temMedicamentos,
                temSinaisVitais: this.metadata.temSinaisVitais,
                tamanhoTexto: this.metadata.tamanhoTexto
            },
            metadata: {
                dataExtracao: this.metadata.dataExtracao,
                fonte: this.metadata.fonte
            }
        };
    }

    /**
     * Retorna todos os dados da evolução
     */
    toCompleto() {
        return {
            id: this.id,
            pacienteId: this.pacienteId,
            dataEvolucao: this.dataEvolucao,
            dataAtualizacao: this.dataAtualizacao,
            profissional: this.profissional,
            atividade: this.atividade,
            subAtividade: this.subAtividade,
            clinicaLeito: this.clinicaLeito,
            conteudo: {
                textoCompleto: this.conteudo.textoCompleto,
                resumo: this.conteudo.resumo || this.gerarResumo()
            },
            dadosClinicosEstruturados: this.dadosClinicosEstruturados,
            metadata: this.metadata
        };
    }

    /**
     * Retorna apenas os dados clínicos estruturados
     */
    toDadosClinicos() {
        return {
            id: this.id,
            pacienteId: this.pacienteId,
            dataEvolucao: this.dataEvolucao,
            profissional: this.profissional,
            dadosClinicosEstruturados: this.dadosClinicosEstruturados,
            resumoIndicadores: {
                totalHipotesesDiagnosticas: this.dadosClinicosEstruturados.hipotesesDiagnosticas?.length || 0,
                totalMedicamentos: this.dadosClinicosEstruturados.medicamentos?.length || 0,
                totalExames: this.dadosClinicosEstruturados.exames?.length || 0,
                temSinaisVitais: Object.keys(this.dadosClinicosEstruturados.sinaisVitais || {}).length > 0,
                totalProcedimentos: this.dadosClinicosEstruturados.procedimentos?.length || 0
            },
            metadata: {
                dataExtracao: this.metadata.dataExtracao,
                fonte: this.metadata.fonte
            }
        };
    }

    /**
     * Valida se os dados obrigatórios estão presentes
     */
    isValid() {
        return !!(this.id && this.pacienteId && (this.dataEvolucao || this.dataAtualizacao));
    }

    /**
     * Extrai medicamentos únicos de todas as evoluções
     */
    static extrairMedicamentosUnicos(evolucoes) {
        const medicamentosSet = new Set();
        
        evolucoes.forEach(evolucao => {
            if (evolucao.dadosClinicosEstruturados) {
                (evolucao.dadosClinicosEstruturados.medicamentos || []).forEach(med => {
                    medicamentosSet.add(med);
                });
                (evolucao.dadosClinicosEstruturados.medicamentosAnteriores || []).forEach(med => {
                    medicamentosSet.add(med);
                });
            }
        });
        
        return Array.from(medicamentosSet);
    }

    /**
     * Extrai diagnósticos únicos de todas as evoluções
     */
    static extrairDiagnosticosUnicos(evolucoes) {
        const diagnosticosSet = new Set();
        
        evolucoes.forEach(evolucao => {
            if (evolucao.dadosClinicosEstruturados?.hipotesesDiagnosticas) {
                evolucao.dadosClinicosEstruturados.hipotesesDiagnosticas.forEach(diag => {
                    diagnosticosSet.add(diag);
                });
            }
        });
        
        return Array.from(diagnosticosSet);
    }
}

module.exports = Evolucao;
