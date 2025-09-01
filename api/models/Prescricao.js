/**
 * Modelo de dados para Prescrições Médicas
 */
class Prescricao {
    constructor(data = {}) {
        this.id = data.id || null;
        this.pacienteId = data.pacienteId || null;
        this.codigo = data.codigo || null;
        this.dataHora = data.dataHora || null;
        this.validaPara = data.validaPara || null;
        
        // Informações do paciente
        this.paciente = {
            nome: data.pacienteNome || null,
            prontuario: data.prontuario || null,
            registro: data.registro || null,
            dataNascimento: data.dataNascimento || null,
            idade: data.idade || null,
            peso: data.peso || null,
            cns: data.cns || null,
            leito: data.leito || null,
            enfLeito: data.enfLeito || null,
            dataInternacao: data.dataInternacao || null
        };
        
        // Informações da clínica/internação
        this.internacao = {
            clinica: data.clinica || null,
            setor: data.setor || null,
            internacao: data.internacao || null,
            hospital: data.hospital || null
        };
        
        // Dietas prescritas
        this.dietas = data.dietas || [];
        
        // Medicamentos prescritos
        this.medicamentos = data.medicamentos || [];
        
        // Observações e cuidados
        this.observacoes = data.observacoes || [];
        
        // Sedação prescrita
        this.sedacao = data.sedacao || null;
        
        // Terapia venosa
        this.terapiaVenosa = data.terapiaVenosa || null;
        
        // Necessidades especiais (fisioterapia, etc.)
        this.necessidades = data.necessidades || [];
        
        // Informações do médico responsável
        this.medico = {
            nome: data.medicoNome || null,
            crm: data.crm || null,
            dataAssinatura: data.dataAssinatura || null,
            assinatura: data.assinatura || null
        };
        
        // Informações sobre acompanhante
        this.acompanhante = data.acompanhante || null;
        
        // Assinaturas registradas
        this.assinaturas = data.assinaturas || [];
        
        // Data/hora de impressão
        this.dataHoraImpressao = data.dataHoraImpressao || null;
        
        // Metadados
        this.metadata = {
            totalMedicamentos: this.medicamentos.length,
            totalDietas: this.dietas.length,
            totalObservacoes: this.observacoes.length,
            totalAssinaturas: this.assinaturas.length,
            dataProcessamento: new Date().toISOString(),
            fonte: 'HICD',
            versao: '1.0'
        };
    }

    /**
     * Cria um objeto Prescrição a partir dos dados do parser
     */
    static fromParserData(parserData, listData = null) {
        if (!parserData) return null;

        const cabecalho = parserData.cabecalho || {};
        
        // Combinar dados da lista com dados detalhados
        const dadosCombinados = {
            id: parserData.id || listData?.id,
            codigo: listData?.codigo || null,
            dataHora: listData?.dataHora || cabecalho.dataPrescricao,
            validaPara: cabecalho.dataPrescricao,
            
            // Dados do paciente
            pacienteNome: cabecalho.pacienteNome,
            prontuario: cabecalho.prontuario || cabecalho.registro,
            registro: cabecalho.registro,
            dataNascimento: cabecalho.dataNascimento,
            idade: cabecalho.idade,
            peso: cabecalho.peso,
            cns: cabecalho.cns,
            leito: cabecalho.leito || listData?.enfLeito,
            enfLeito: listData?.enfLeito,
            dataInternacao: cabecalho.dataInternacao,
            
            // Dados da internação
            clinica: cabecalho.clinica || listData?.clinica,
            setor: cabecalho.clinica,
            internacao: listData?.internacao,
            hospital: cabecalho.hospital,
            
            // Prescrições
            dietas: parserData.dietas || [],
            medicamentos: parserData.medicamentos || [],
            observacoes: parserData.observacoes || [],
            sedacao: parserData.sedacao,
            terapiaVenosa: parserData.terapiaVenosa,
            necessidades: parserData.necessidades || [],
            
            // Médico
            medicoNome: cabecalho.medico,
            crm: cabecalho.crm,
            dataAssinatura: cabecalho.dataAssinatura,
            
            // Outros
            acompanhante: cabecalho.acompanhante,
            assinaturas: parserData.assinaturas || [],
            dataHoraImpressao: parserData.dataHoraImpressao
        };

        return new Prescricao(dadosCombinados);
    }

    /**
     * Cria um objeto Prescrição resumido para listagens
     */
    static fromListData(listData) {
        if (!listData) return null;

        return new Prescricao({
            id: listData.id,
            codigo: listData.codigo,
            dataHora: listData.dataHora,
            pacienteNome: listData.pacienteNome,
            prontuario: listData.prontuario,
            registro: listData.registro,
            leito: listData.enfLeito,
            clinica: listData.clinica,
            internacao: listData.internacao
        });
    }

    /**
     * Adiciona um medicamento à prescrição
     */
    adicionarMedicamento(medicamento) {
        if (!medicamento) return;

        const medicamentoFormatado = new MedicamentoPrescrito(medicamento);
        this.medicamentos.push(medicamentoFormatado);
        
        // Atualizar metadados
        this.metadata.totalMedicamentos = this.medicamentos.length;
        
        return medicamentoFormatado;
    }

    /**
     * Adiciona uma observação/cuidado à prescrição
     */
    adicionarObservacao(observacao) {
        if (!observacao) return;

        const observacaoFormatada = new ObservacaoPrescricao(observacao);
        this.observacoes.push(observacaoFormatada);
        
        // Atualizar metadados
        this.metadata.totalObservacoes = this.observacoes.length;
        
        return observacaoFormatada;
    }

    /**
     * Busca medicamentos por nome ou princípio ativo
     */
    buscarMedicamento(termo) {
        if (!termo) return [];
        
        const termoBusca = termo.toLowerCase();
        return this.medicamentos.filter(med => 
            med.nome && med.nome.toLowerCase().includes(termoBusca)
        );
    }

    /**
     * Agrupa observações por tipo
     */
    agruparObservacoesPorTipo() {
        const grupos = {};
        
        this.observacoes.forEach(obs => {
            const tipo = obs.tipo || 'Geral';
            if (!grupos[tipo]) {
                grupos[tipo] = [];
            }
            grupos[tipo].push(obs);
        });
        
        return grupos;
    }

    /**
     * Retorna medicamentos não padronizados
     */
    obterMedicamentosNaoPadronizados() {
        return this.medicamentos.filter(med => med.naoPadronizado === true);
    }

    /**
     * Retorna uma versão resumida da prescrição
     */
    toResumo() {
        return {
            id: this.id,
            codigo: this.codigo,
            dataHora: this.dataHora,
            validaPara: this.validaPara,
            paciente: {
                nome: this.paciente.nome,
                prontuario: this.paciente.prontuario,
                idade: this.paciente.idade,
                leito: this.paciente.leito
            },
            internacao: {
                clinica: this.internacao.clinica,
                hospital: this.internacao.hospital
            },
            medico: {
                nome: this.medico.nome,
                crm: this.medico.crm
            },
            resumo: {
                totalMedicamentos: this.metadata.totalMedicamentos,
                totalDietas: this.metadata.totalDietas,
                totalObservacoes: this.metadata.totalObservacoes,
                medicamentosNaoPadronizados: this.obterMedicamentosNaoPadronizados().length
            },
            metadata: {
                dataProcessamento: this.metadata.dataProcessamento,
                fonte: this.metadata.fonte
            }
        };
    }

    /**
     * Retorna todos os dados da prescrição
     */
    toCompleto() {
        return {
            id: this.id,
            codigo: this.codigo,
            dataHora: this.dataHora,
            validaPara: this.validaPara,
            paciente: this.paciente,
            internacao: this.internacao,
            dietas: this.dietas.map(d => d.toCompleto ? d.toCompleto() : d),
            medicamentos: this.medicamentos.map(m => m.toCompleto ? m.toCompleto() : m),
            observacoes: this.observacoes.map(o => o.toCompleto ? o.toCompleto() : o),
            sedacao: this.sedacao,
            terapiaVenosa: this.terapiaVenosa,
            necessidades: this.necessidades,
            medico: this.medico,
            acompanhante: this.acompanhante,
            assinaturas: this.assinaturas,
            dataHoraImpressao: this.dataHoraImpressao,
            metadata: this.metadata
        };
    }

    /**
     * Retorna apenas os medicamentos da prescrição
     */
    toMedicamentos() {
        return {
            id: this.id,
            codigo: this.codigo,
            dataHora: this.dataHora,
            paciente: {
                nome: this.paciente.nome,
                prontuario: this.paciente.prontuario
            },
            medico: {
                nome: this.medico.nome,
                crm: this.medico.crm
            },
            medicamentos: this.medicamentos.map(m => m.toCompleto ? m.toCompleto() : m),
            resumoEstatistico: {
                totalMedicamentos: this.metadata.totalMedicamentos,
                medicamentosNaoPadronizados: this.obterMedicamentosNaoPadronizados().length,
                vias: [...new Set(this.medicamentos.map(m => m.via).filter(Boolean))],
                intervalos: [...new Set(this.medicamentos.map(m => m.intervalo).filter(Boolean))]
            },
            metadata: {
                dataProcessamento: this.metadata.dataProcessamento,
                fonte: this.metadata.fonte
            }
        };
    }

    /**
     * Retorna apenas as observações e cuidados
     */
    toCuidados() {
        return {
            id: this.id,
            codigo: this.codigo,
            dataHora: this.dataHora,
            paciente: {
                nome: this.paciente.nome,
                prontuario: this.paciente.prontuario,
                leito: this.paciente.leito
            },
            observacoes: this.observacoes.map(o => o.toCompleto ? o.toCompleto() : o),
            observacoesPorTipo: this.agruparObservacoesPorTipo(),
            sedacao: this.sedacao,
            terapiaVenosa: this.terapiaVenosa,
            necessidades: this.necessidades,
            resumoEstatistico: {
                totalObservacoes: this.metadata.totalObservacoes,
                tiposObservacoes: Object.keys(this.agruparObservacoesPorTipo()).length
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
        return !!(this.id && this.paciente.prontuario && this.medico.nome);
    }

    /**
     * Agrupa prescrições por período
     */
    static agruparPorPeriodo(prescricoes) {
        const grupos = {
            hoje: [],
            ontem: [],
            ultimaSemana: [],
            ultimoMes: [],
            outros: []
        };

        const hoje = new Date();
        const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
        const ultimaSemana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        const ultimoMes = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

        prescricoes.forEach(prescricao => {
            if (!prescricao.dataHora) {
                grupos.outros.push(prescricao);
                return;
            }

            const dataPrescricao = new Date(prescricao.dataHora);
            
            if (dataPrescricao.toDateString() === hoje.toDateString()) {
                grupos.hoje.push(prescricao);
            } else if (dataPrescricao.toDateString() === ontem.toDateString()) {
                grupos.ontem.push(prescricao);
            } else if (dataPrescricao >= ultimaSemana) {
                grupos.ultimaSemana.push(prescricao);
            } else if (dataPrescricao >= ultimoMes) {
                grupos.ultimoMes.push(prescricao);
            } else {
                grupos.outros.push(prescricao);
            }
        });

        return grupos;
    }
}

/**
 * Modelo para medicamento prescrito
 */
class MedicamentoPrescrito {
    constructor(data = {}) {
        this.nome = data.nome || null;
        this.dose = data.dose || null;
        this.apresentacao = data.apresentacao || null;
        this.via = data.via || null;
        this.intervalo = data.intervalo || null;
        this.observacao = data.observacao || null;
        this.dias = data.dias || null;
        this.naoPadronizado = data.naoPadronizado || false;
        this.posologia = data.posologia || null;
        
        // Metadados do medicamento
        this.metadata = {
            dataExtracao: new Date().toISOString(),
            fonte: 'HICD'
        };
    }

    /**
     * Retorna versão completa do medicamento
     */
    toCompleto() {
        return {
            nome: this.nome,
            dose: this.dose,
            apresentacao: this.apresentacao,
            via: this.via,
            intervalo: this.intervalo,
            observacao: this.observacao,
            dias: this.dias,
            naoPadronizado: this.naoPadronizado,
            posologia: this.posologia,
            metadata: this.metadata
        };
    }

    /**
     * Retorna versão resumida do medicamento
     */
    toResumo() {
        return {
            nome: this.nome,
            dose: this.dose,
            via: this.via,
            intervalo: this.intervalo,
            naoPadronizado: this.naoPadronizado
        };
    }

    /**
     * Verifica se o medicamento é válido
     */
    isValid() {
        return !!(this.nome);
    }
}

/**
 * Modelo para observação/cuidado prescrito
 */
class ObservacaoPrescricao {
    constructor(data = {}) {
        this.tipo = data.tipo || 'Geral';
        this.descricao = data.descricao || data.toString();
        this.prioridade = data.prioridade || 'normal';
        
        // Metadados da observação
        this.metadata = {
            dataExtracao: new Date().toISOString(),
            fonte: 'HICD'
        };
    }

    /**
     * Retorna versão completa da observação
     */
    toCompleto() {
        return {
            tipo: this.tipo,
            descricao: this.descricao,
            prioridade: this.prioridade,
            metadata: this.metadata
        };
    }

    /**
     * Retorna versão resumida da observação
     */
    toResumo() {
        return {
            tipo: this.tipo,
            descricao: this.descricao,
            prioridade: this.prioridade
        };
    }

    /**
     * Verifica se a observação é válida
     */
    isValid() {
        return !!(this.descricao);
    }
}

/**
 * Modelo para dieta prescrita
 */
class DietaPrescrita {
    constructor(data = {}) {
        this.numero = data.numero || null;
        this.descricao = data.descricao || null;
        this.tipo = data.tipo || 'oral';
        this.observacoes = data.observacoes || null;
        
        // Metadados da dieta
        this.metadata = {
            dataExtracao: new Date().toISOString(),
            fonte: 'HICD'
        };
    }

    /**
     * Retorna versão completa da dieta
     */
    toCompleto() {
        return {
            numero: this.numero,
            descricao: this.descricao,
            tipo: this.tipo,
            observacoes: this.observacoes,
            metadata: this.metadata
        };
    }

    /**
     * Retorna versão resumida da dieta
     */
    toResumo() {
        return {
            numero: this.numero,
            descricao: this.descricao,
            tipo: this.tipo
        };
    }

    /**
     * Verifica se a dieta é válida
     */
    isValid() {
        return !!(this.descricao);
    }
}

module.exports = { 
    Prescricao, 
    MedicamentoPrescrito, 
    ObservacaoPrescricao, 
    DietaPrescrita 
};
