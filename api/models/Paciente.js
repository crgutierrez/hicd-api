/**
 * Modelo de dados para Paciente
 */
class Paciente {
    constructor(data = {}) {
        this.id = data.id || null;
        this.prontuario = data.prontuario || null;
        this.nome = data.nome || null;
        this.nomeMae = data.nomeMae || null;
        this.dataNascimento = data.dataNascimento || null;
        this.idade = data.idade || null;
        this.sexo = data.sexo || null;
        this.documento = data.documento || null;
        this.cns = data.cns || null;
        this.be = data.be || null;
        
        // Endereço
        this.endereco = {
            logradouro: data.logradouro || null,
            numero: data.numero || null,
            complemento: data.complemento || null,
            bairro: data.bairro || null,
            municipio: data.municipio || null,
            estado: data.estado || null,
            cep: data.cep || null
        };
        
        // Contatos
        this.contatos = {
            telefone: data.telefone || null
        };
        
        // Responsável
        this.responsavel = {
            nome: data.responsavelNome || null
        };
        
        // Internação
        this.internacao = {
            codigoClinica: data.codigoClinica || null,
            nomeClinica: data.nomeClinica || null,
            numeroLeito: data.numeroLeito || null,
            clinicaLeito: data.clinicaLeito || null,
            diasInternacao: data.diasInternacao || null,
            dataInternacao: data.dataInternacao || null
        };
        
        // Metadados
        this.metadata = {
            dataUltimaAtualizacao: new Date().toISOString(),
            fonte: 'HICD',
            versao: '1.0'
        };
    }

    /**
     * Cria um objeto Paciente a partir dos dados do parser
     */
    static fromParserData(parserData, prontuario) {
        if (!parserData) return null;

        const dadosBasicos = parserData.dadosBasicos || {};
        const endereco = parserData.endereco || {};
        const contatos = parserData.contatos || {};
        const responsavel = parserData.responsavel || {};
        const internacao = parserData.internacao || {};

        return new Paciente({
            id: prontuario,
            prontuario: dadosBasicos.prontuario || prontuario,
            nome: dadosBasicos.nome,
            nomeMae: dadosBasicos.nomeMae,
            dataNascimento: dadosBasicos.dataNascimento,
            idade: dadosBasicos.idade,
            sexo: dadosBasicos.sexo,
            documento: parserData.documentos?.documento,
            cns: parserData.documentos?.cns,
            be: parserData.documentos?.be,
            logradouro: endereco.logradouro,
            numero: endereco.numero,
            complemento: endereco.complemento,
            bairro: endereco.bairro,
            municipio: endereco.municipio,
            estado: endereco.estado,
            cep: endereco.cep,
            telefone: contatos.telefone,
            responsavelNome: responsavel.nome,
            codigoClinica: internacao.codigoClinica,
            nomeClinica: internacao.nomeClinica,
            numeroLeito: internacao.numeroLeito,
            clinicaLeito: internacao.clinicaLeito,
            diasInternacao: internacao.diasInternacao,
            dataInternacao: internacao.dataInternacao
        });
    }

    /**
     * Cria um objeto Paciente resumido para listagens
     */
    static fromListData(listData) {
        if (!listData) return null;

        return new Paciente({
            id: listData.prontuario,
            prontuario: listData.prontuario,
            nome: listData.nome,
            idade: listData.idade,
            sexo: listData.sexo,
            numeroLeito: listData.leito || listData.clinicaLeito,
            nomeClinica: listData.clinica || listData.clinicaNome,
            clinicaLeito: listData.clinicaLeito || listData.leito,
            diasInternacao: listData.diasInternacao,
            dataInternacao: listData.dataInternacao
        });
    }

    /**
     * Retorna uma versão resumida do paciente
     */
    toResumo() {
        return {
            id: this.id,
            prontuario: this.prontuario,
            nome: this.nome,
            idade: this.idade,
            sexo: this.sexo,
            leito: this.internacao.numeroLeito,
            clinicaLeito: this.internacao.clinicaLeito,
            clinica: this.internacao.nomeClinica,
            diasInternacao: this.internacao.diasInternacao,
            dataInternacao: this.internacao.dataInternacao,
            metadata: this.metadata
        };
    }

    /**
     * Retorna todos os dados do paciente
     */
    toCompleto() {
        return {
            id: this.id,
            prontuario: this.prontuario,
            dadosBasicos: {
                nome: this.nome,
                nomeMae: this.nomeMae,
                dataNascimento: this.dataNascimento,
                idade: this.idade,
                sexo: this.sexo
            },
            documentos: {
                documento: this.documento,
                cns: this.cns,
                be: this.be
            },
            endereco: this.endereco,
            contatos: this.contatos,
            responsavel: this.responsavel,
            internacao: this.internacao,
            metadata: this.metadata
        };
    }

    /**
     * Valida se os dados obrigatórios estão presentes
     */
    isValid() {
        return !!(this.prontuario && (this.nome || this.id));
    }
}

module.exports = Paciente;
