/**
 * Gestão multi-tenant das instâncias do crawler, uma por host HICD.
 * Cada host mantém sua própria sessão/cookies e login independente.
 * Inicializada via POST /api/auth/login ou auto-login no middleware.
 */

const crypto = require('crypto');
const HICDCrawler = require('../hicd-crawler-refactored');
const config = require('../config');

// Map<hostCanônico, HICDCrawler>
const instances = new Map();

// Map<hostCanônico, Buffer> — digest das credenciais que abriram a sessão.
// Cada requisição apresenta o próprio token; só reusa a sessão quem prova as
// mesmas credenciais (ver `matches`). Guardamos o digest, nunca a senha.
const digests = new Map();

function digest(username, password) {
    return crypto.createHash('sha256').update(`${username}:${password}`, 'utf8').digest();
}

// Factory injetável (facilita testes sem bater na rede).
let crawlerFactory = (username, password, cfg) => new HICDCrawler(username, password, cfg);

/**
 * Inicializa o crawler para um host específico e executa o login no HICD.
 * Substitui a instância anterior daquele host **só se o novo login der certo**:
 * uma tentativa com credencial errada não derruba a sessão boa que já existe.
 * @param {string} username
 * @param {string} password
 * @param {string} [host] - host HICD (validado contra allowlist). Vazio = host padrão.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function initCrawler(username, password, host) {
    const cfg = config.forHost(host);        // valida host (throw se inválido)
    const canonical = cfg.host;

    const instance = crawlerFactory(username, password, cfg);
    const result = await instance.login();

    if (result.success) {
        instances.set(canonical, instance);
        digests.set(canonical, digest(username, password));
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

/**
 * Informa se as credenciais são as mesmas que abriram a sessão ativa do host.
 * Comparação em tempo constante.
 * @param {string} [host]
 * @param {string} username
 * @param {string} password
 */
function matches(host, username, password) {
    let canonical;
    try {
        canonical = config.resolveHost(host);
    } catch {
        return false;
    }
    const atual = digests.get(canonical);
    if (!atual || !instances.has(canonical)) return false;
    return crypto.timingSafeEqual(atual, digest(username, password));
}

// ===== Hooks de teste =====
function __setCrawlerFactory(fn) { crawlerFactory = fn; }
function __reset() {
    instances.clear();
    digests.clear();
    crawlerFactory = (username, password, cfg) => new HICDCrawler(username, password, cfg);
}

module.exports = { initCrawler, getCrawler, isReady, matches, __setCrawlerFactory, __reset };
