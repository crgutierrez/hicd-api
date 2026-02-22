/**
 * Modelo de dados para Clínica no sistema HICD
 */

class Clinica {
    constructor(data = {}) {
        this.id = data.id || data.codigo || null;
        this.codigo = data.codigo || null;
        this.nome = data.nome || '';
        this.totalPacientes = data.totalPacientes || 0;
        this.endereco = data.endereco || '';
        this.telefone = data.telefone || '';
        this.email = data.email || '';
        this.responsavel = data.responsavel || '';
        this.status = data.status || 'ativa';
        this.dataUltimaAtualizacao = data.dataUltimaAtualizacao || new Date().toISOString();
    }

    /**
     * Cria uma instância de Clínica a partir dos dados do parser
     */
    static fromParserData(data) {
        return new Clinica({
            codigo: data.codigo,
            nome: data.nome,
            endereco: data.endereco || '',
            telefone: data.telefone || '',
            email: data.email || '',
            responsavel: data.responsavel || '',
            status: data.status || 'ativa',
            dataUltimaAtualizacao: data.dataUltimaAtualizacao
        });
    }

    /**
     * Cria uma instância de Clínica a partir dos dados do crawler
     */
    static fromCrawlerData(data) {
        return new Clinica({
            id: data.id || data.codigo,
            codigo: data.codigo,
            nome: data.nome,
            totalPacientes: data.totalPacientes || 0
        });
    }

    /**
     * Retorna representação resumida da clínica
     */
    toResumo() {
        return {
            id: this.id,
            codigo: this.codigo,
            nome: this.nome,
            totalPacientes: this.totalPacientes,
            status: this.status
        };
    }

    /**
     * Retorna representação detalhada da clínica
     */
    toDetalhado() {
        return {
            id: this.id,
            codigo: this.codigo,
            nome: this.nome,
            totalPacientes: this.totalPacientes,
            endereco: this.endereco,
            telefone: this.telefone,
            email: this.email,
            responsavel: this.responsavel,
            status: this.status,
            dataUltimaAtualizacao: this.dataUltimaAtualizacao
        };
    }

    /**
     * Retorna representação completa da clínica
     */
    toCompleto() {
        return this.toDetalhado();
    }

    /**
     * Retorna dados para JSON
     */
    toJSON() {
        return this.toDetalhado();
    }

    /**
     * Valida se os dados da clínica são válidos
     */
    isValid() {
        return this.codigo && this.nome && this.codigo.trim() !== '' && this.nome.trim() !== '';
    }

    /**
     * Atualiza os dados da clínica
     */
    update(data) {
        if (data.nome) this.nome = data.nome;
        if (data.endereco !== undefined) this.endereco = data.endereco;
        if (data.telefone !== undefined) this.telefone = data.telefone;
        if (data.email !== undefined) this.email = data.email;
        if (data.responsavel !== undefined) this.responsavel = data.responsavel;
        if (data.status) this.status = data.status;
        if (data.totalPacientes !== undefined) this.totalPacientes = data.totalPacientes;
        
        this.dataUltimaAtualizacao = new Date().toISOString();
        return this;
    }

    /**
     * Compara se duas clínicas são iguais (por código)
     */
    equals(outraClinica) {
        return this.codigo === outraClinica.codigo;
    }

    /**
     * Retorna string representando a clínica
     */
    toString() {
        return `[${this.codigo}] ${this.nome}`;
    }
}

module.exports = Clinica;
