const BaseParser = require('./base-parser');

/**
 * Parser especializado para dados de clínicas do HICD
 */
class ClinicaParser extends BaseParser {
    constructor() {
        super();
        this.debug('ClinicaParser inicializado');
    }

    /**
     * Parse principal para extrair dados de clínicas - baseado no parser original
     * Extrai lista de clínicas do HTML do select #clinica
     */
    parse(html) {
        this.debug('Iniciando parse de clínicas');
        
        try {
            const $ = this.loadHTML(html);
            const clinicas = [];

            // Parse específico do select de clínicas conforme parser original
            $('#clinica option').each((i, element) => {
                const codigo = $(element).val();
                const nome = $(element).text().trim();

                if (codigo && nome && codigo !== '0') {
                    console.log(`   - Clínica encontrada: [${codigo}] ${nome}`);
                    clinicas.push({
                        codigo: codigo,
                        nome: nome,
                        endereco: '',
                        telefone: '',
                        email: '',
                        responsavel: '',
                        status: 'ativo',
                        dataUltimaAtualizacao: this.getCurrentTimestamp()
                    });
                }
            });

            this.debug(`Parse concluído. ${clinicas.length} clínicas encontradas`);
            return clinicas;

        } catch (error) {
            this.error('Erro no parse de clínicas:', error);
            return [];
        }
    }

    /**
     * Busca clínica específica por código
     */
    findByCode(html, codigo) {
        const clinicas = this.parse(html);
        return clinicas.find(c => c.codigo === String(codigo)) || null;
    }

    /**
     * Extrai lista de códigos de clínicas disponíveis
     */
    extractAvailableCodes(html) {
        try {
            const clinicas = this.parse(html);
            return clinicas.map(c => c.codigo).sort();
        } catch (error) {
            this.error('Erro ao extrair códigos de clínicas:', error);
            return [];
        }
    }
}

module.exports = ClinicaParser;
