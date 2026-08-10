const axios = require('axios');
const http = require('http');
const https = require('https');
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

        // Agents com keep-alive: reutilizam a conexão TCP/TLS entre requisições.
        // Sem isso, cada request abre um socket novo e refaz o handshake TLS —
        // proibitivo ao buscar centenas de laudos (N+1 de resultados de exames).
        // maxSockets limita o pool (não sobrecarrega o HICD); deve acompanhar a
        // concorrência do batch de exames (EXAM_BATCH_SIZE).
        const maxSockets = parseInt(process.env.HTTP_MAX_SOCKETS) || 10;
        const agentOpts = { keepAlive: true, keepAliveMsecs: 30000, maxSockets };
        this.httpAgent = new http.Agent(agentOpts);
        this.httpsAgent = new https.Agent(agentOpts);

        // Configuração do axios com jar de cookies
        this.client = axios.create({
            timeout: 30000,
            httpAgent: this.httpAgent,
            httpsAgent: this.httpsAgent,
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
        // Single-flight do re-login: garante UM re-login por vez. Requisições
        // concorrentes que detectam sessão expirada aguardam o mesmo login em
        // vez de disparar vários — evita PHPSESSIDs conflitantes que invalidam
        // a sessão um do outro (tempestade de re-autenticação).
        this._reloginPromise = null;

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
            // Single-flight: só o primeiro request cria o re-login; os demais
            // concorrentes aguardam a MESMA promise. Sem await entre o teste e a
            // atribuição (JS single-thread) → sem race na criação.
            if (!this._reloginPromise) {
                console.warn('[HTTP-CLIENT] Sessão HICD expirada — renovando login automaticamente...');
                this._reloginPromise = Promise.resolve()
                    .then(() => this.onSessionExpired())
                    .catch(err => console.error('[HTTP-CLIENT] Falha ao renovar sessão HICD:', err?.message))
                    .finally(() => { this._reloginPromise = null; });
            } else {
                console.warn('[HTTP-CLIENT] Sessão expirada — aguardando re-login já em andamento...');
            }
            await this._reloginPromise;
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
