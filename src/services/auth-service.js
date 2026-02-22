const fs = require('fs').promises;
const path = require('path');

/**
 * Serviço de autenticação para o sistema HICD
 */
class HICDAuthService {
    constructor(httpClient, username, password) {
        this.httpClient = httpClient;
        this.username = username || process.env.HICD_USERNAME;
        this.password = password || process.env.HICD_PASSWORD;
        this.isLoggedIn = false;
        this.debugMode = false;
    }

    /**
     * Habilita/desabilita modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[DEBUG] Modo debug ${enabled ? 'habilitado' : 'desabilitado'}`);
    }

    /**
     * Salva HTML para debug
     */
    async saveDebugHtml(htmlContent, fileName) {
        if (!this.debugMode) return;
        
        try {
            const debugDir = path.join(__dirname, '../../debug');
            try {
                await fs.access(debugDir);
            } catch {
                await fs.mkdir(debugDir, { recursive: true });
            }
            
            const filePath = path.join(debugDir, fileName);
            await fs.writeFile(filePath, htmlContent, 'utf8');
            console.log(`[DEBUG] HTML salvo em: ${filePath}`);
        } catch (error) {
            console.error(`[DEBUG] Erro ao salvar HTML:`, error.message);
        }
    }

    /**
     * Faz login no sistema com retry automático
     * IMPORTANTE: O sistema tem um bug - a primeira requisição sempre falha
     */
    async login() {
        console.log('[LOGIN] Iniciando processo de autenticação...');
        
        // Primeira tentativa (que sempre falha devido ao bug do sistema)
        try {
            console.log('[LOGIN] Primeira tentativa (esperada falha devido ao bug do sistema)...');
            await this.attemptLogin();
        } catch (error) {
            console.log('[LOGIN] Primeira tentativa falhou conforme esperado');
        }

        // Aguardar um pouco antes da segunda tentativa
        await this.httpClient.delay(2000);

        // Segunda tentativa (esta deveria funcionar)
        for (let attempt = 1; attempt <= this.httpClient.maxRetries; attempt++) {
            try {
                console.log(`[LOGIN] Tentativa ${attempt + 1} de login...`);
                const result = await this.attemptLogin();
                
                if (result.success) {
                    // Verificar se o login foi bem-sucedido
                    const verifyResult = await this.verifyLogin();
                    if (verifyResult.success) {
                        this.isLoggedIn = true;
                        return { success: true, message: 'Login realizado com sucesso' };
                    }
                }
                
                if (attempt < this.httpClient.maxRetries) {
                    await this.httpClient.delay(3000);
                }
                
            } catch (error) {
                console.error(`[LOGIN] Erro na tentativa ${attempt + 1}:`, error.message);
                if (attempt < this.httpClient.maxRetries) {
                    await this.httpClient.delay(3000);
                }
            }
        }

        return { success: false, message: 'Falha no login após todas as tentativas' };
    }

    /**
     * Executa uma tentativa de login
     */
    async attemptLogin() {
        try {
            const urls = this.httpClient.getUrls();
            
            // Primeiro, acessar a página inicial para obter cookies de sessão
            console.log('[LOGIN] Obtendo cookies de sessão...');
            const initialResponse = await this.httpClient.get(urls.index);
            
            // Extrair cookies da resposta
            if (initialResponse.headers['set-cookie']) {
                const cookies = initialResponse.headers['set-cookie']
                    .map(cookie => cookie.split(';')[0])
                    .join('; ');
                this.httpClient.updateCookies(cookies);
            }

            // Preparar dados do login
            const loginData = new URLSearchParams({
                'Param': 'LOGIN',
                'user': this.username,
                'pass': this.password,
                'session': 'undefined'
            });

            console.log('[LOGIN] Enviando credenciais...');
            
            // Enviar requisição de login
            const loginResponse = await this.httpClient.post(urls.login, loginData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': urls.index,
                    'Origin': 'https://hicd-hospub.sesau.ro.gov.br'
                }
            });

            // Verificar resposta do login
            const responseText = loginResponse.data;
            console.log('[LOGIN] Resposta do servidor:', responseText.substring(0, 100));

            // Verificar se o login foi bem-sucedido
            if (responseText.includes('OK') || responseText.includes('sucesso') || loginResponse.status === 200) {
                // Extrair novos cookies se houver
                if (loginResponse.headers['set-cookie']) {
                    const newCookies = loginResponse.headers['set-cookie']
                        .map(cookie => cookie.split(';')[0])
                        .join('; ');
                    this.httpClient.updateCookies(newCookies);
                }
                
                return { success: true, message: 'Login realizado' };
            }

            return { success: false, message: 'Resposta do servidor não indica sucesso no login' };

        } catch (error) {
            console.error('[LOGIN] Erro durante tentativa de login:', error.message);
            return { success: false, message: `Erro durante login: ${error.message}` };
        }
    }

    /**
     * Verifica se o login foi bem-sucedido
     */
    async verifyLogin() {
        try {
            console.log('[LOGIN] Verificando status do login...');
            
            const urls = this.httpClient.getUrls();
            const verifyResponse = await this.httpClient.get(urls.index);
            const cheerio = require('cheerio');
            const $ = cheerio.load(verifyResponse.data);
            
            // Procurar indicadores de que o usuário está logado
            const loggedInIndicators = [
                $('body').text().includes(this.username),
                $('body').text().includes('Sair'),
                $('body').text().includes('Logout'),
                !$('body').text().includes('ANONYMOUS')
            ];

            const isLoggedIn = loggedInIndicators.some(indicator => indicator);
            
            if (isLoggedIn) {
                console.log('[LOGIN] ✅ Verificação de login confirmada');
                return { success: true, message: 'Login verificado com sucesso' };
            } else {
                console.log('[LOGIN] ❌ Verificação de login falhou');
                return { success: false, message: 'Verificação de login falhou' };
            }

        } catch (error) {
            console.error('[LOGIN] Erro ao verificar login:', error.message);
            return { success: false, message: `Erro ao verificar login: ${error.message}` };
        }
    }

    /**
     * Faz logout do sistema
     */
    async logout() {
        try {
            console.log('[LOGOUT] Fazendo logout...');
            
            const urls = this.httpClient.getUrls();
            await this.httpClient.post(urls.login, 
                new URLSearchParams({ 'Param': 'LOGOUT' }), 
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            this.isLoggedIn = false;
            this.httpClient.clearCookies();
            
            console.log('[LOGOUT] ✅ Logout realizado com sucesso');
            
        } catch (error) {
            console.error('[LOGOUT] Erro durante logout:', error.message);
        }
    }

    /**
     * Verifica se está logado
     */
    isAuthenticated() {
        return this.isLoggedIn;
    }
}

module.exports = HICDAuthService;
