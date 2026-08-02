/**
 * Gestão multi-tenant das instâncias do crawler, uma por host HICD.
 * Cada host mantém sua própria sessão/cookies e login independente.
 * Inicializada via POST /api/auth/login ou auto-login no middleware.
 */

const HICDCrawler = require('../hicd-crawler-refactored');
const config = require('../config');

// Map<hostCanônico, HICDCrawler>
const instances = new Map();

// Factory injetável (facilita testes sem bater na rede).
let crawlerFactory = (username, password, cfg) => new HICDCrawler(username, password, cfg);

/**
 * Inicializa o crawler para um host específico e executa o login no HICD.
 * Substitui qualquer instância anterior daquele host.
 * @param {string} username
 * @param {string} password
 * @param {string} [host] - host HICD (validado contra allowlist). Vazio = host padrão.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function initCrawler(username, password, host) {
    const cfg = config.forHost(host);        // valida host (throw se inválido)
    const canonical = cfg.host;

    instances.delete(canonical);

    const instance = crawlerFactory(username, password, cfg);
    const result = await instance.login();

    if (result.success) {
        instances.set(canonical, instance);
    }

    return result;
}

/**
 * Retorna a instância ativa do crawler para o host informado.
 * @param {string} [host] - host HICD. Vazio = host padrão.
 * @throws {Error} se o crawler daquele host não foi inicializado
 */
function getCrawler(host) {
    const canonical = config.resolveHost(host);
    const instance = instances.get(canonical);
    if (!instance) {
        throw new Error(`Crawler não inicializado para o host "${canonical}". Faça login via POST /api/auth/login`);
    }
    return instance;
}

/**
 * Informa se o crawler do host está pronto para uso.
 * @param {string} [host]
 */
function isReady(host) {
    let canonical;
    try {
        canonical = config.resolveHost(host);
    } catch {
        return false;
    }
    return instances.has(canonical);
}

// ===== Hooks de teste =====
function __setCrawlerFactory(fn) { crawlerFactory = fn; }
function __reset() {
    instances.clear();
    crawlerFactory = (username, password, cfg) => new HICDCrawler(username, password, cfg);
}

module.exports = { initCrawler, getCrawler, isReady, __setCrawlerFactory, __reset };
