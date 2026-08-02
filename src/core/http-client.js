const axios = require('axios');
require('dotenv').config();
const config = require('../../config');
const { isSessionExpiredHtml, sessionExpiredError } = require('./session');

/**
 * Cliente HTTP responsável pela comunicação com o sistema HICD
 */
class HICDHttpClient {
    /**
     * @param {object} [cfg=config] - config resolvida para o host desejado (config.forHost(host)).
     */
    constructor(cfg = config) {
        this.config = cfg;
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

        // URLs do sistema (host configurável via .env → config.js, ou por requisição via cfg)
        this.origin = cfg.origin;
        this.baseUrl = cfg.auth.baseUrl;
        this.loginUrl = cfg.auth.loginUrl;
        this.indexUrl = cfg.auth.indexUrl;

        // Controle de sessão
        this.cookies = '';

        // ===== Auto-cura de sessão expirada =====
        // authPhase = true durante login/logout (o auth-service seta/reseta) —
        // enquanto true, a detecção de expiração é ignorada para não recursar.
        this.authPhase = false;
        // Callback opcional (injetado pelo crawler) que refaz o login no HICD.
        // Assinatura: async () => void. Ausente = sem auto-cura (só detecção).
        this.onSessionExpired = null;

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
        return await this._request('get', url, undefined, config);
    }

    /**
     * Faz requisição POST
     */
    async post(url, data, config = {}) {
        return await this._request('post', url, data, config);
    }

    /**
     * Executor comum de GET/POST com auto-cura de sessão expirada.
     *
     * Se a resposta for a página de login/anônima do HICD (sessão morta),
     * dispara `onSessionExpired()` (re-login) e refaz a requisição UMA vez.
     * Se persistir (ou não houver handler), lança erro tipado SESSION_EXPIRED
     * em vez de deixar o parser devolver dados vazios silenciosamente.
     *
     * @private
     * @param {boolean} [retried=false] - guarda de retentativa (evita loop).
     */
    async _request(method, url, data, config, retried = false) {
        const response = method === 'get'
            ? await this.client.get(url, config)
            : await this.client.post(url, data, config);

        // Durante o próprio login/logout não interferir.
        if (this.authPhase) return response;
        if (!isSessionExpiredHtml(response && response.data)) return response;

        if (!retried && typeof this.onSessionExpired === 'function') {
            console.warn('[HTTP-CLIENT] Sessão HICD expirada — renovando login automaticamente...');
            await this.onSessionExpired();
            return await this._request(method, url, data, config, true);
        }

        // Sem handler, ou já retentou e continua expirada.
        throw sessionExpiredError();
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
