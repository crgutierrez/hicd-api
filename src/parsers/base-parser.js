const cheerio = require('cheerio');

/**
 * Classe base para todos os parsers do HICD
 * Fornece funcionalidades comuns e utilitários
 */
class BaseParser {
    constructor() {
        this.debugMode = process.env.NODE_ENV === 'development';
    }

    /**
     * Habilita/desabilita modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Log de debug condicional
     */
    debug(message, data = null) {
        if (this.debugMode) {
            console.log(`[PARSER] ${message}`, data || '');
        }
    }

    /**
     * Log de erro
     */
    error(message, error = null) {
        console.error(`[PARSER ERROR] ${message}`, error || '');
    }

    /**
     * Carrega HTML com cheerio e trata erros
     */
    loadHTML(html) {
        console.log('Carregando HTML para parsing...');
        console.log(cheerio)
        try {
            if (!html || typeof html !== 'string') {
                console.log('HTML inválido ou vazio recebido para parsing.');
                throw new Error('HTML inválido ou vazio');
            }
            // console.log('HTML recebido para parsing:', html); // Log dos primeiros 500 caracteres do HTML
            return cheerio.load(html);
        } catch (error) {
            console.log('erro......');
            console.log('Erro ao carregar HTML:', error);
            console.log('HTML recebido:', html);

            this.error('Erro ao carregar HTML:', error);
            this.error('HTML recebido:', html);
            throw error;
        }
    }

    /**
     * Limpa e normaliza texto extraído
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    /**
     * Extrai texto de um elemento jQuery
     */
    extractText(element) {
        if (!element || !element.text) return '';
        return this.cleanText(element.text());
    }

    /**
     * Converte data do formato brasileiro para ISO
     */
    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Formato esperado: DD/MM/YYYY ou DD/MM/YYYY HH:mm
            const cleanDate = dateString.trim();
            const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/;
            const match = cleanDate.match(dateRegex);

            if (match) {
                const [, day, month, year, hour = '00', minute = '00'] = match;
                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00.000Z`;
                return new Date(isoDate).toISOString();
            }

            return null;
        } catch (error) {
            this.error('Erro ao converter data:', error);
            return null;
        }
    }

    /**
     * Extrai número/código de uma string
     */
    extractNumber(text) {
        if (!text) return null;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    }

    /**
     * Valida se um objeto tem propriedades obrigatórias
     */
    validateRequired(obj, requiredFields) {
        if (!obj) return false;

        for (const field of requiredFields) {
            if (!obj[field]) {
                this.debug(`Campo obrigatório ausente: ${field}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Aplica transformações em massa para um array de objetos
     */
    transformArray(array, transformer) {
        if (!Array.isArray(array)) return [];

        return array
            .map(transformer)
            .filter(item => item !== null && item !== undefined);
    }

    /**
     * Mescla dados de múltiplas fontes com prioridade
     */
    mergeData(primary, secondary = {}) {
        const result = { ...secondary };

        Object.keys(primary).forEach(key => {
            if (primary[key] !== null && primary[key] !== undefined) {
                result[key] = primary[key];
            }
        });

        return result;
    }

    /**
     * Extrai atributos de dados (data-*) de um elemento
     */
    extractDataAttributes(element) {
        const data = {};
        const attributes = element.get(0)?.attribs || {};

        Object.keys(attributes).forEach(attr => {
            if (attr.startsWith('data-')) {
                const key = attr.replace('data-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                data[key] = attributes[attr];
            }
        });

        return data;
    }

    /**
     * Cria timestamp atual
     */
    getCurrentTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Gera ID único baseado em timestamp e random
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = BaseParser;
