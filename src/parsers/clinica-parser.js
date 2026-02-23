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
     * Parse principal para extrair dados de clínicas.
     * Tenta múltiplos seletores para localizar o select de clínicas.
     */
    parse(html) {
        this.debug('Iniciando parse de clínicas');

        try {
            const $ = this.loadHTML(html);
            const clinicas = [];

            // Tenta seletores em ordem de prioridade
            const selectores = [
                '#clinica option',
                'select[name="clinica"] option',
                'select[name="idClinica"] option',
                'select[id*="clinica" i] option',
                'select[name*="clinica" i] option'
            ];

            let encontrou = false;
            for (const seletor of selectores) {
                const options = $(seletor);
                if (options.length > 0) {
                    this.debug(`Seletor "${seletor}" encontrou ${options.length} opções`);
                    options.each((_, element) => {
                        const codigo = $(element).val()?.trim();
                        const nome = $(element).text().trim();
                        if (codigo && codigo !== '0' && nome) {
                            this.debug(`Clínica encontrada: [${codigo}] ${nome}`);
                            clinicas.push({
                                codigo,
                                nome: this.normalizarNome(nome),
                                status: 'ativo',
                                dataUltimaAtualizacao: this.getCurrentTimestamp()
                            });
                        }
                    });
                    encontrou = true;
                    break;
                }
            }

            if (!encontrou) {
                this.debug('Nenhum seletor de clínicas encontrou dados no HTML');
            }

            this.debug(`Parse concluído. ${clinicas.length} clínicas encontradas`);
            return clinicas;

        } catch (error) {
            this.error('Erro no parse de clínicas:', error);
            return [];
        }
    }

    /**
     * Normaliza o nome da clínica (remove espaços extras, padroniza maiúsculas)
     */
    normalizarNome(nome) {
        return nome.replace(/\s+/g, ' ').trim();
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
