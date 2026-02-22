/**
 * Instância singleton do crawler, compartilhada entre todos os controllers.
 * Inicializada via POST /api/auth/login com as credenciais do usuário.
 */

const HICDCrawler = require('../hicd-crawler-refactored');

let crawlerInstance = null;

/**
 * Inicializa o crawler com as credenciais fornecidas e executa o login no HICD.
 * Substitui qualquer instância anterior.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function initCrawler(username, password) {
    crawlerInstance = null;

    const instance = new HICDCrawler(username, password);
    const result = await instance.login();

    if (result.success) {
        crawlerInstance = instance;
    }

    return result;
}

/**
 * Retorna a instância ativa do crawler.
 * @throws {Error} se o crawler não foi inicializado
 */
function getCrawler() {
    if (!crawlerInstance) {
        throw new Error('Crawler não inicializado. Faça login via POST /api/auth/login');
    }
    return crawlerInstance;
}

/**
 * Informa se o crawler está pronto para uso.
 */
function isReady() {
    return crawlerInstance !== null;
}

module.exports = { initCrawler, getCrawler, isReady };
