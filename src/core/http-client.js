const axios = require('axios');
require('dotenv').config();

/**
 * Cliente HTTP responsável pela comunicação com o sistema HICD
 */
class HICDHttpClient {
    constructor() {
        // Configuração do axios com jar de cookies
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            withCredentials: true
        });

        // URLs do sistema
        this.baseUrl = 'https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend';
        this.loginUrl = `${this.baseUrl}/controller/controller.php`;
        this.indexUrl = `${this.baseUrl}/index.php`;
        
        // Controle de sessão
        this.cookies = '';
        
        // Configurações de rate limiting
        this.requestDelay = parseInt(process.env.REQUEST_DELAY) || 1000;
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
    }

    /**
     * Implementa delay entre requisições
     */
    async delay(ms = this.requestDelay) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Faz requisição GET
     */
    async get(url, config = {}) {
        return await this.client.get(url, config);
    }

    /**
     * Faz requisição POST
     */
    async post(url, data, config = {}) {
        return await this.client.post(url, data, config);
    }

    /**
     * Atualiza os cookies do cliente
     */
    updateCookies(cookies) {
        this.cookies = cookies;
        this.client.defaults.headers.Cookie = cookies;
    }

    /**
     * Remove cookies (logout)
     */
    clearCookies() {
        this.cookies = '';
        delete this.client.defaults.headers.Cookie;
    }

    /**
     * Obtém as URLs do sistema
     */
    getUrls() {
        return {
            base: this.baseUrl,
            login: this.loginUrl,
            index: this.indexUrl
        };
    }
}

module.exports = HICDHttpClient;
