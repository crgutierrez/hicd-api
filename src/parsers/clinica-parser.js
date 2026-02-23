const BaseParser = require('./base-parser');
const cheerio = require('cheerio');

// Constantes pré-compiladas no nível do módulo — evitam re-alocação por chamada
const WHITESPACE_RE = /\s+/g;

// Localiza o bloco <select> do campo de clínicas pelo id ou name
const SELECT_BLOCK_RE = /<select\b[^>]*(?:id=["']?clinica["']?|name=["']?clinica["']?|name=["']?idClinica["']?)[^>]*>([\s\S]*?)<\/select>/i;

// Extrai cada <option> com seu atributo value e texto
const OPTION_RE = /<option\b([^>]*)>([^<]*)<\/option>/gi;

// Extrai o valor do atributo value
const VALUE_ATTR_RE = /\bvalue=["']([^"']*)["']/i;

/**
 * Parser especializado para dados de clínicas do HICD.
 *
 * Estratégia de parse (em ordem de velocidade):
 *   1. Regex rápido — extrai o bloco <select> com regex e itera as <option>s
 *      sem construir DOM. ~10× mais rápido que cheerio para páginas grandes.
 *   2. Fallback cheerio — usado quando o regex não encontra o select pelo padrão
 *      principal (IDs alternativos). Acessa atributos via element.attribs, mais
 *      rápido que re-encapsular com $(el).
 *
 * Memoização por instância: o último HTML parseado é cacheado para que
 * findByCode() e extractAvailableCodes() não re-parsem o mesmo HTML.
 */
class ClinicaParser extends BaseParser {
    constructor() {
        super();
        this._lastHtml = null;
        this._lastResult = null;
    }

    /**
     * Parse principal. Retorna array de clínicas com { codigo, nome, status, dataUltimaAtualizacao }.
     */
    parse(html) {
        if (!html || typeof html !== 'string') return [];

        // Memoize: mesmo HTML → mesmo resultado sem re-parse
        if (html === this._lastHtml) {
            this.debug('Cache hit: reutilizando resultado anterior');
            return this._lastResult;
        }

        this.debug('Iniciando parse de clínicas');

        let clinicas;
        try {
            clinicas = this._parseRapido(html);

            if (clinicas === null) {
                this.debug('Regex não encontrou select; usando fallback cheerio');
                clinicas = this._parseFallback(html);
            }
        } catch (error) {
            this.error('Erro no parse de clínicas:', error);
            clinicas = [];
        }

        this.debug(`Parse concluído. ${clinicas.length} clínicas encontradas`);

        this._lastHtml = html;
        this._lastResult = clinicas;
        return clinicas;
    }

    /**
     * Extrai clínicas via regex puro, sem construir DOM.
     * Retorna null se não encontrar o select, para acionar o fallback.
     */
    _parseRapido(html) {
        const selectMatch = html.match(SELECT_BLOCK_RE);
        if (!selectMatch) return null;

        const selectContent = selectMatch[1];
        const clinicas = [];
        const timestamp = new Date().toISOString();
        let m;

        OPTION_RE.lastIndex = 0; // reset por ser global/sticky
        while ((m = OPTION_RE.exec(selectContent)) !== null) {
            const valueMatch = VALUE_ATTR_RE.exec(m[1]);
            if (!valueMatch) continue;

            const codigo = valueMatch[1].trim();
            if (!codigo || codigo === '0') continue;

            const nome = m[2].replace(WHITESPACE_RE, ' ').trim();
            if (!nome) continue;

            clinicas.push({ codigo, nome, status: 'ativo', dataUltimaAtualizacao: timestamp });
        }

        // Retorna null (não array vazio) para distinguir "select encontrado mas vazio"
        // de "select não encontrado" — só o segundo caso deve acionar fallback
        return clinicas;
    }

    /**
     * Fallback via cheerio para selects com IDs/names alternativos.
     * Usa element.attribs e children[0].data em vez de $(el) para evitar
     * re-encapsulamento desnecessário.
     */
    _parseFallback(html) {
        const $ = cheerio.load(html, { decodeEntities: true });
        const clinicas = [];
        const timestamp = new Date().toISOString();

        const seletores = [
            'select[id*="clinica"] option',
            'select[name*="clinica"] option',
            'select[id*="Clinica"] option',
            'select[name*="Clinica"] option',
        ];

        for (const seletor of seletores) {
            const options = $(seletor);
            if (options.length === 0) continue;

            this.debug(`Fallback: seletor "${seletor}" encontrou ${options.length} opções`);

            options.each((_, el) => {
                const codigo = (el.attribs.value ?? '').trim();
                if (!codigo || codigo === '0') return;

                // Acessa o nó de texto filho diretamente (mais rápido que .text())
                const nome = (el.children[0]?.data ?? '').replace(WHITESPACE_RE, ' ').trim();
                if (!nome) return;

                clinicas.push({ codigo, nome, status: 'ativo', dataUltimaAtualizacao: timestamp });
            });

            if (clinicas.length > 0) break;
        }

        return clinicas;
    }

    /**
     * Busca clínica específica por código.
     * Aproveita memoização do parse() para não re-parsear o mesmo HTML.
     */
    findByCode(html, codigo) {
        return this.parse(html).find(c => c.codigo === String(codigo)) || null;
    }

    /**
     * Retorna lista de códigos disponíveis ordenados.
     * Aproveita memoização do parse() para não re-parsear o mesmo HTML.
     */
    extractAvailableCodes(html) {
        try {
            return this.parse(html).map(c => c.codigo).sort();
        } catch (error) {
            this.error('Erro ao extrair códigos de clínicas:', error);
            return [];
        }
    }
}

module.exports = ClinicaParser;
