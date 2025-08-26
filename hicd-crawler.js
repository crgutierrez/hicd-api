const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class HICDCrawler {
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
        
        // Credenciais (vindas do .env)
        this.username = process.env.HICD_USERNAME || 'cristiano';
        this.password = process.env.HICD_PASSWORD || '12345678';
        
        // Controle de sessão
        this.isLoggedIn = false;
        this.cookies = '';
        this.debugMode = false;
        
        // Configurações de rate limiting
        this.requestDelay = parseInt(process.env.REQUEST_DELAY) || 1000; // 1 segundo entre requisições
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
        
        console.log('[HICDCrawler] Inicializado com sucesso');
    }

    // Método para habilitar/desabilitar modo debug
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[DEBUG] Modo debug ${enabled ? 'habilitado' : 'desabilitado'}`);
    }

    // Método para salvar HTML de debug
    async saveDebugHtml(htmlContent, fileName) {
        if (!this.debugMode) return;
        
        try {
            const fs = require('fs/promises');
            const path = require('path');
            
            // Criar diretório debug se não existir
            const debugDir = path.join(__dirname, 'debug');
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
     * Implementa delay entre requisições
     */
    async delay(ms = this.requestDelay) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        await this.delay(2000);

        // Segunda tentativa (esta deveria funcionar)
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`[LOGIN] Tentativa ${attempt + 1} de login...`);
                const result = await this.attemptLogin();
                
                if (result.success) {
                    this.isLoggedIn = true;
                    console.log('[LOGIN] ✅ Login realizado com sucesso!');
                    return result;
                }
                
                if (attempt < this.maxRetries) {
                    console.log(`[LOGIN] Tentativa ${attempt + 1} falhou, aguardando antes da próxima...`);
                    await this.delay(3000);
                }
                
            } catch (error) {
                console.error(`[LOGIN] Erro na tentativa ${attempt + 1}:`, error.message);
                
                if (attempt < this.maxRetries) {
                    await this.delay(3000);
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
            // Primeiro, acessar a página inicial para obter cookies de sessão
            console.log('[LOGIN] Obtendo cookies de sessão...');
            const initialResponse = await this.client.get(this.indexUrl);
            
            // Extrair cookies da resposta
            if (initialResponse.headers['set-cookie']) {
                this.cookies = initialResponse.headers['set-cookie']
                    .map(cookie => cookie.split(';')[0])
                    .join('; ');
                
                // Configurar cookies para próximas requisições
                this.client.defaults.headers.Cookie = this.cookies;
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
            const loginResponse = await this.client.post(this.loginUrl, loginData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': this.indexUrl,
                    'Origin': 'https://hicd-hospub.sesau.ro.gov.br'
                }
            });

            // Verificar resposta do login
            const responseText = loginResponse.data;
            console.log('[LOGIN] Resposta do servidor:', responseText.substring(0, 100));

            // Verificar se o login foi bem-sucedido
            if (responseText.includes('OK') || responseText.includes('sucesso') || loginResponse.status === 200) {
                // Atualizar cookies se necessário
                if (loginResponse.headers['set-cookie']) {
                    const newCookies = loginResponse.headers['set-cookie']
                        .map(cookie => cookie.split(';')[0])
                        .join('; ');
                    this.cookies = this.cookies + '; ' + newCookies;
                    this.client.defaults.headers.Cookie = this.cookies;
                }

                // Verificar se realmente está logado fazendo uma requisição de teste
                return await this.verifyLogin();
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
            
            const verifyResponse = await this.client.get(this.indexUrl);
            const $ = cheerio.load(verifyResponse.data);
            
            // Procurar indicadores de que o usuário está logado
            // Adapte esses seletores conforme a estrutura real da página
            const loggedInIndicators = [
                $('body').text().includes(this.username),
                $('body').text().includes('Sair'),
                $('body').text().includes('Logout'),
                !$('body').text().includes('ANONYMOUS')
            ];

            const isLoggedIn = loggedInIndicators.some(indicator => indicator);
            
            if (isLoggedIn) {
                console.log('[LOGIN] ✅ Verificação de login confirmada');
                this.isLoggedIn = true;
                return { success: true, message: 'Login realizado com sucesso' };
            } else {
                console.log('[LOGIN] ❌ Verificação de login falhou');
                this.isLoggedIn = false;
                return { success: false, message: 'Falha na verificação do login' };
            }

        } catch (error) {
            console.error('[LOGIN] Erro ao verificar login:', error.message);
            return { success: false, message: `Erro ao verificar login: ${error.message}` };
        }
    }

    /**
     * Busca as clínicas disponíveis no sistema
     */
    async getClinicas() {
        if (!this.isLoggedIn) {
            throw new Error('É necessário fazer login antes de buscar clínicas');
        }

        console.log('[CLÍNICAS] Buscando clínicas disponíveis...');

        try {
            // Preparar dados da requisição para buscar clínicas
            const clinicasData = new URLSearchParams({
                'Param': 'SIGHO',
                'ParamModule': '2904'
            });

            // Fazer requisição para buscar clínicas
            const clinicasResponse = await this.client.post(this.loginUrl, clinicasData, {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://hicd-hospub.sesau.ro.gov.br',
                    'Referer': this.indexUrl,
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Requested-With': 'XMLHttpRequest',
                    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Linux"'
                }
            });

            // Parse do HTML de resposta para extrair as clínicas
            const $ = cheerio.load(clinicasResponse.data);
            const clinicas = [];

            // Extrair opções do select de clínicas
            $('#clinica option').each((i, element) => {
                const value = $(element).attr('value');
                const text = $(element).text().trim();
                
                if (value && value !== '') {
                    clinicas.push({
                        codigo: value,
                        nome: text,
                        index: i
                    });
                }
            });

            console.log(`[CLÍNICAS] ✅ Encontradas ${clinicas.length} clínicas disponíveis`);
            
            // Log das clínicas encontradas
            if (clinicas.length > 0) {
                console.log('[CLÍNICAS] Lista de clínicas:');
                clinicas.forEach(clinica => {
                    console.log(`  • ${clinica.codigo}: ${clinica.nome}`);
                });
            }

            return clinicas;

        } catch (error) {
            console.error('[CLÍNICAS] Erro ao buscar clínicas:', error.message);
            throw error;
        }
    }

    /**
     * Salva HTML de resposta para debug
     */
    async saveHtmlForDebug(html, filename) {
        try {
            if (process.env.DEBUG_MODE === 'true') {
                const outputDir = './output/debug';
                
                // Criar diretório de debug se não existir
                try {
                    await fs.access(outputDir);
                } catch {
                    await fs.mkdir(outputDir, { recursive: true });
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const debugFilename = path.join(outputDir, `${filename}-${timestamp}.html`);
                await fs.writeFile(debugFilename, html, 'utf8');
                console.log(`[DEBUG] HTML salvo para análise: ${debugFilename}`);
            }
        } catch (error) {
            console.error('[DEBUG] Erro ao salvar HTML:', error.message);
        }
    }

    /**
     * Busca todos os pacientes de todas as clínicas
     * @returns {Promise<Array>} - Array com todos os pacientes encontrados
     */
    async buscarPacientes() {
        if (!this.isLoggedIn) {
            throw new Error('É necessário fazer login antes de buscar pacientes');
        }

        console.log('[BUSCAR PACIENTES] Buscando todos os pacientes do sistema...');
        
        try {
            // Buscar todas as clínicas
            const clinicas = await this.getClinicas();
            const todosPacientes = [];

            if (clinicas.length === 0) {
                console.log('[BUSCAR PACIENTES] Nenhuma clínica encontrada');
                return todosPacientes;
            }

            // Para cada clínica, buscar os pacientes
            for (let i = 0; i < clinicas.length; i++) {
                const clinica = clinicas[i];
                
                try {
                    console.log(`[BUSCAR PACIENTES] Processando clínica ${i + 1}/${clinicas.length}: ${clinica.nome}`);
                    
                    const pacientesClinica = await this.getPacientesClinica(clinica.codigo);
                    
                    // Adicionar informações da clínica aos pacientes
                    const pacientesComClinica = pacientesClinica.map(paciente => ({
                        ...paciente,
                        clinicaNome: clinica.nome,
                        clinicaCodigo: clinica.codigo,
                        clinicaLeito: `${clinica.codigo}-${paciente.leito}` // Formato padrão
                    }));
                    
                    todosPacientes.push(...pacientesComClinica);
                    
                    console.log(`[BUSCAR PACIENTES] ${pacientesClinica.length} pacientes encontrados na ${clinica.nome}`);
                    
                    // Pausa entre clínicas para evitar sobrecarga
                    if (i < clinicas.length - 1) {
                        await this.delay(1000);
                    }
                    
                } catch (error) {
                    console.error(`[BUSCAR PACIENTES] Erro ao processar clínica ${clinica.nome}:`, error.message);
                    continue;
                }
            }

            console.log(`[BUSCAR PACIENTES] ✅ Total: ${todosPacientes.length} pacientes encontrados em ${clinicas.length} clínicas`);
            return todosPacientes;

        } catch (error) {
            console.error('[BUSCAR PACIENTES] Erro ao buscar pacientes:', error.message);
            throw error;
        }
    }

    /**
     * Busca pacientes de uma clínica específica
     */
    async getPacientesClinica(codigoClinica, referencia = '', filtroNome = '', ordem = '') {
        if (!this.isLoggedIn) {
            throw new Error('É necessário fazer login antes de buscar pacientes');
        }

        console.log(`[PACIENTES] Buscando pacientes da clínica ${codigoClinica}...`);

        try {
            // Preparar dados para busca de pacientes conforme o curl fornecido
            const pacientesData = new URLSearchParams({
                'Param': 'SIGHO',
                'ParamModule': '544',
                'idPai': 'Do581',
                'clinica': codigoClinica,
                'nome': filtroNome,
                'selRefClinica': referencia,
                'selOrderInter': ordem
            });

            console.log(`[PACIENTES] Parâmetros da busca: ${pacientesData.toString()}`);

            // Fazer requisição para buscar pacientes
            const pacientesResponse = await this.client.post(this.loginUrl, pacientesData, {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://hicd-hospub.sesau.ro.gov.br',
                    'Referer': this.indexUrl,
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Requested-With': 'XMLHttpRequest',
                    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Linux"'
                }
            });

            console.log(`[PACIENTES] Resposta recebida - tamanho: ${pacientesResponse.data.length} caracteres`);

            // Salvar HTML para debug se necessário
            await this.saveHtmlForDebug(pacientesResponse.data, `pacientes-clinica-${codigoClinica}`);

            // Parse do HTML de resposta para extrair os pacientes
            const $ = cheerio.load(pacientesResponse.data);
            const pacientes = [];

            // Verificar se há conteúdo na div principal
            const conteudoDiv = $('#Conteudo').html();
            if (!conteudoDiv) {
                console.log('[PACIENTES] Div #Conteudo não encontrada, tentando buscar tabela diretamente');
            }

            // Extrair dados dos pacientes da tabela
            $('table.hoverTable tbody tr, table.bordasimples tbody tr, table tr').each((i, element) => {
                const $row = $(element);
                const tds = $row.find('td');
                
                // Pular se não tiver colunas suficientes ou for cabeçalho
                if (tds.length < 6) {
                    return;
                }

                // Verificar se é linha de cabeçalho
                const firstCellText = $(tds[0]).text().trim();
                if (firstCellText.includes('Nome') || firstCellText.includes('background-color')) {
                    return;
                }

                // Verificar se é mensagem de "nenhum paciente encontrado"
                if (firstCellText.toLowerCase().includes('nenhum paciente encontrado')) {
                    console.log('[PACIENTES] Nenhum paciente encontrado para esta clínica');
                    return;
                }

                // Extrair dados do paciente conforme a estrutura HTML fornecida
                const nome = $(tds[0]).text().trim().replace(/\s+/g, ' ');
                const prontuario = $(tds[1]).text().trim();
                const leito = $(tds[2]).text().trim();
                const cid = $(tds[3]).text().trim();
                const dataInternacao = $(tds[4]).text().trim();
                const diasInternado = $(tds[5]).text().trim();

                // Validar se os dados básicos estão presentes
                if (nome && prontuario && nome.length > 2 && prontuario.length > 0) {
                    const paciente = {
                        nome: nome,
                        prontuario: prontuario,
                        leito: leito,
                        cid: cid,
                        dataInternacao: dataInternacao,
                        diasInternado: parseInt(diasInternado) || 0,
                        clinica: codigoClinica,
                        registroEletronico: true, // Todos parecem ter baseado no HTML
                        kanban: true // Todos parecem ter baseado no HTML
                    };

                    pacientes.push(paciente);
                    
                    console.log(`[PACIENTES] Paciente encontrado: ${nome} (${prontuario}) - Leito: ${leito}`);
                }
            });

            // Se não encontrou pacientes na tabela principal, tentar outras estruturas
            if (pacientes.length === 0) {
                console.log('[PACIENTES] Tentando estruturas alternativas de HTML...');
                
                // Tentar encontrar dados em outras estruturas possíveis
                $('tr').each((i, element) => {
                    const $row = $(element);
                    const text = $row.text();
                    
                    // Procurar por padrões de nome e prontuário
                    if (text.includes('&nbsp;') && text.length > 50) {
                        const tds = $row.find('td');
                        if (tds.length >= 6) {
                            const nome = $(tds[0]).text().trim().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
                            const prontuario = $(tds[1]).text().trim().replace(/&nbsp;/g, '');
                            
                            if (nome && prontuario && nome.length > 5) {
                                console.log(`[PACIENTES] Paciente alternativo encontrado: ${nome} (${prontuario})`);
                            }
                        }
                    }
                });
            }

            console.log(`[PACIENTES] ✅ Encontrados ${pacientes.length} pacientes na clínica ${codigoClinica}`);
            
            // Log detalhado dos primeiros pacientes para debug
            if (pacientes.length > 0) {
                console.log('[PACIENTES] Primeiros pacientes encontrados:');
                pacientes.slice(0, 3).forEach((p, index) => {
                    console.log(`  ${index + 1}. ${p.nome} - Prontuário: ${p.prontuario} - Leito: ${p.leito} - Dias: ${p.diasInternado}`);
                });
            }

            return pacientes;

        } catch (error) {
            console.error(`[PACIENTES] Erro ao buscar pacientes da clínica ${codigoClinica}:`, error.message);
            
            // Log adicional para debug
            if (error.response) {
                console.error(`[PACIENTES] Status da resposta: ${error.response.status}`);
                console.error(`[PACIENTES] Dados da resposta: ${error.response.data?.substring(0, 500)}...`);
            }
        }
    }

    /**
     * Busca pacientes por leito específico
     * @param {string} leitoDesejado - Leito no formato "G7" (Enfermaria G, leito 7) ou outros formatos
     * @returns {Promise<Array>} - Array de pacientes encontrados no leito especificado
     */
    async buscarPacientePorLeito(leitoDesejado) {
        if (!this.isLoggedIn) {
            throw new Error('É necessário fazer login antes de buscar pacientes');
        }

        console.log(`[BUSCA LEITO] Procurando paciente no leito ${leitoDesejado}...`);

        try {
            // Normalizar o formato do leito (ex: "G7" -> possíveis formatos do sistema)
            const leitoFormatado = this.formatarLeito(leitoDesejado);
            console.log(`[BUSCA LEITO] Formatos de busca: ${leitoFormatado.join(', ')}`);

            // Primeiro tentar buscar em todas as clínicas para encontrar o paciente
            const clinicas = await this.getClinicas();
            let pacientesEncontrados = [];

            for (const clinica of clinicas) {
                try {
                    console.log(`[BUSCA LEITO] Verificando clínica ${clinica.nome} (${clinica.codigo})...`);
                    
                    const pacientesClinica = await this.getPacientesClinica(clinica.codigo);
                    
                    // Filtrar pacientes que estão no leito desejado
                    const pacientesLeito = pacientesClinica.filter(paciente => {
                        return leitoFormatado.some(formato => {
                            return paciente.leito && (
                                paciente.leito.includes(formato) ||
                                paciente.leito.toLowerCase().includes(leitoDesejado.toLowerCase()) ||
                                this.compararLeitos(paciente.leito, leitoDesejado)
                            );
                        });
                    });

                    if (pacientesLeito.length > 0) {
                        console.log(`[BUSCA LEITO] ✅ Encontrado(s) ${pacientesLeito.length} paciente(s) no leito ${leitoDesejado} na clínica ${clinica.nome}`);
                        
                        // Adicionar informação da clínica aos pacientes
                        pacientesLeito.forEach(paciente => {
                            paciente.clinicaInfo = {
                                codigo: clinica.codigo,
                                nome: clinica.nome
                            };
                        });
                        
                        pacientesEncontrados.push(...pacientesLeito);
                    }

                } catch (error) {
                    console.log(`[BUSCA LEITO] Erro ao verificar clínica ${clinica.nome}: ${error.message}`);
                    continue;
                }
            }

            if (pacientesEncontrados.length === 0) {
                console.log(`[BUSCA LEITO] ⚠️  Nenhum paciente encontrado no leito ${leitoDesejado}`);
                return [];
            }

            console.log(`[BUSCA LEITO] ✅ Total: ${pacientesEncontrados.length} paciente(s) encontrado(s) no leito ${leitoDesejado}`);
            
            // Log detalhado dos pacientes encontrados
            pacientesEncontrados.forEach((paciente, index) => {
                console.log(`[BUSCA LEITO] ${index + 1}. ${paciente.nome} - Prontuário: ${paciente.prontuario} - Leito: ${paciente.leito} - Clínica: ${paciente.clinicaInfo.nome}`);
            });

            return pacientesEncontrados;

        } catch (error) {
            console.error(`[BUSCA LEITO] Erro ao buscar paciente no leito ${leitoDesejado}:`, error.message);
            throw error;
        }
    }

    /**
     * Formatar leito para diferentes possibilidades do sistema
     * @param {string} leito - Leito no formato "G7" ou similar
     * @returns {Array<string>} - Array com possíveis formatos
     */
    formatarLeito(leito) {
        const formatos = [];
        
        // Formato original
        formatos.push(leito);
        
        // Se for formato tipo "G7" (letra + número)
        const match = leito.match(/^([A-Z])(\d+)$/i);
        if (match) {
            const letra = match[1].toUpperCase();
            const numero = match[2];
            
            // Possíveis formatos baseados no que vi nos dados:
            // 012.012-0007 (ENFERMARIA G seria código 012)
            const codigoEnfermaria = this.getCodigoEnfermaria(letra);
            if (codigoEnfermaria) {
                formatos.push(`${codigoEnfermaria}.${codigoEnfermaria}-${numero.padStart(4, '0')}`);
                formatos.push(`${codigoEnfermaria}-${numero}`);
                formatos.push(`${letra}${numero}`);
                formatos.push(`${letra} ${numero}`);
                formatos.push(`${letra}.${numero}`);
                formatos.push(`${letra}-${numero}`);
            }
        }
        
        // Adicionar variações com zero padding
        if (/\d+$/.test(leito)) {
            const numero = leito.match(/(\d+)$/)[1];
            const prefixo = leito.replace(/\d+$/, '');
            formatos.push(`${prefixo}${numero.padStart(2, '0')}`);
            formatos.push(`${prefixo}${numero.padStart(3, '0')}`);
            formatos.push(`${prefixo}${numero.padStart(4, '0')}`);
        }

        return [...new Set(formatos)]; // Remove duplicatas
    }

    /**
     * Mapear letra da enfermaria para código do sistema
     * @param {string} letra - Letra da enfermaria (A, B, C, etc.)
     * @returns {string|null} - Código da enfermaria ou null se não encontrado
     */
    getCodigoEnfermaria(letra) {
        const mapeamento = {
            'A': '008', // ENFERMARIA A
            'B': '009', // ENFERMARIA B  
            'C': '010', // ENFERMARIA C
            'D': '011', // ENFERMARIA D
            'G': '012', // ENFERMARIA G
            'H': '013', // ENFERMARIA H
            'J': '015', // ENFERMARIA J
            'K': '016', // ENFERMARIA K
            'L': '017', // ENFERMARIA L
            'M': '018'  // ENFERMARIA M
        };
        
        return mapeamento[letra.toUpperCase()] || null;
    }

    /**
     * Comparar leitos de forma mais inteligente
     * @param {string} leitoSistema - Leito como aparece no sistema
     * @param {string} leitoBusca - Leito que estamos procurando
     * @returns {boolean} - Se são compatíveis
     */
    compararLeitos(leitoSistema, leitoBusca) {
        if (!leitoSistema || !leitoBusca) return false;
        
        // Remover espaços e converter para maiúsculo
        const sistema = leitoSistema.replace(/\s+/g, '').toUpperCase();
        const busca = leitoBusca.replace(/\s+/g, '').toUpperCase();
        
        // Verificar se o leito de busca está contido no leito do sistema
        return sistema.includes(busca) || busca.includes(sistema);
    }

    /**
     * Busca completa de paciente por leito com dados detalhados e análise clínica
     * @param {string} leitoDesejado - Leito desejado
     * @returns {Promise<Object>} - Dados completos do paciente com análise clínica
     */
    async buscarPacienteComAnaliseClinica(leitoDesejado) {
        console.log(`\n🔍 Iniciando busca com análise clínica para leito ${leitoDesejado}...`);
        
        try {
            // Primeiro buscar os pacientes no leito
            const pacientesEncontrados = await this.buscarPacientePorLeito(leitoDesejado);
            
            if (pacientesEncontrados.length === 0) {
                return {
                    leito: leitoDesejado,
                    pacientesEncontrados: 0,
                    pacientes: []
                };
            }

            const dadosCompletos = [];

            for (const paciente of pacientesEncontrados) {
                console.log(`\n📋 Obtendo dados completos e análise clínica de ${paciente.nome}...`);
                
                try {
                    // Obter cadastro detalhado
                    const cadastro = await this.getPacienteCadastro(paciente.prontuario);
                    
                    // Obter evoluções
                    const evolucoes = await this.getEvolucoes(paciente.prontuario);
                    
                    // Extrair dados clínicos da última evolução
                    const dadosClinicos = await this.extrairDadosClinicosUltimaEvolucao(paciente.prontuario);
                    
                    // Compilar dados
                    const dadosPaciente = {
                        dadosBasicos: paciente,
                        cadastroDetalhado: cadastro,
                        evolucoes: evolucoes,
                        analiseClinica: dadosClinicos,
                        timestamp: new Date().toISOString()
                    };
                    
                    dadosCompletos.push(dadosPaciente);
                    
                    console.log(`✅ Dados coletados:`);
                    console.log(`   - ${evolucoes.totalEvolucoes} evoluções`);
                    console.log(`   - HDA: ${dadosClinicos.hda ? 'Encontrada' : 'Não encontrada'}`);
                    console.log(`   - Hipóteses diagnósticas: ${dadosClinicos.hipotesesDiagnosticas.length}`);
                    
                } catch (error) {
                    console.error(`❌ Erro ao obter dados de ${paciente.nome}:`, error.message);
                }
            }

            const resultado = {
                leito: leitoDesejado,
                pacientesEncontrados: pacientesEncontrados.length,
                pacientes: dadosCompletos,
                timestamp: new Date().toISOString()
            };

            // Salvar resultado
            await this.salvarBuscaComAnaliseClinica(resultado);

            return resultado;

        } catch (error) {
            console.error(`[BUSCA COM ANÁLISE] Erro:`, error.message);
            throw error;
        }
    }

    /**
     * Salvar resultado da busca com análise clínica
     */
    async salvarBuscaComAnaliseClinica(dados) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = './output';
            const leitoSeguro = dados.leito.replace(/[^a-zA-Z0-9]/g, '');
            
            // Criar diretório se não existir
            try {
                await fs.access(outputDir);
            } catch {
                await fs.mkdir(outputDir, { recursive: true });
            }

            const filename = path.join(outputDir, `busca-clinica-leito-${leitoSeguro}-${timestamp}.json`);
            await fs.writeFile(filename, JSON.stringify(dados, null, 2), 'utf8');
            
            console.log(`\n💾 Dados completos salvos em: ${filename}`);
            
            // Log resumo clínico
            console.log(`\n🏥 RESUMO CLÍNICO DA BUSCA:`);
            console.log(`- Leito pesquisado: ${dados.leito}`);
            console.log(`- Pacientes encontrados: ${dados.pacientesEncontrados}`);
            
            if (dados.pacientes.length > 0) {
                dados.pacientes.forEach((p, index) => {
                    const analise = p.analiseClinica;
                    const totalEvolucoes = p.evolucoes?.totalEvolucoes || 0;
                    
                    console.log(`\n  📋 ${index + 1}. ${p.dadosBasicos.nome}:`);
                    console.log(`     - Prontuário: ${p.dadosBasicos.prontuario}`);
                    console.log(`     - Total de evoluções: ${totalEvolucoes}`);
                    console.log(`     - Última evolução: ${analise.dataUltimaEvolucao || 'N/A'}`);
                    console.log(`     - Profissional: ${analise.profissionalResponsavel || 'N/A'}`);
                    
                    if (analise.hda) {
                        console.log(`     - HDA: ${analise.hda.substring(0, 100)}${analise.hda.length > 100 ? '...' : ''}`);
                    }
                    
                    if (analise.hipotesesDiagnosticas.length > 0) {
                        console.log(`     - Hipóteses diagnósticas (${analise.hipotesesDiagnosticas.length}):`);
                        analise.hipotesesDiagnosticas.forEach((h, hi) => {
                            console.log(`       ${hi + 1}. ${h.substring(0, 80)}${h.length > 80 ? '...' : ''}`);
                        });
                    }
                });
            }

        } catch (error) {
            console.error('[SALVAMENTO CLÍNICO] Erro ao salvar busca com análise clínica:', error.message);
        }
    }

    /**
     * Busca completa de paciente por leito com dados detalhados
     * @param {string} leitoDesejado - Leito desejado
     * @returns {Promise<Object>} - Dados completos do paciente encontrado
     */
    async buscarPacienteDetalhadoPorLeito(leitoDesejado) {
        
        try {
            // Primeiro buscar os pacientes no leito
            const pacientesEncontrados = await this.buscarPacientePorLeito(leitoDesejado);
            
            if (pacientesEncontrados.length === 0) {
                return {
                    leito: leitoDesejado,
                    pacientesEncontrados: 0,
                    pacientes: []
                };
            }

            const dadosDetalhados = [];

            for (const paciente of pacientesEncontrados) {
                console.log(`\n📋 Obtendo dados detalhados de ${paciente.nome}...`);
                
                try {
                    // Obter cadastro detalhado
                    const cadastro = await this.getPacienteCadastro(paciente.prontuario);
                    
                    // Obter evoluções
                    const evolucoes = await this.getEvolucoes(paciente.prontuario);
                    
                    // Compilar dados
                    const dadosPaciente = {
                        dadosBasicos: paciente,
                        cadastroDetalhado: cadastro,
                        evolucoes: evolucoes,
                        timestamp: new Date().toISOString()
                    };
                    
                    dadosDetalhados.push(dadosPaciente);
                    
                    console.log(`✅ Dados coletados: ${evolucoes.totalEvolucoes} evoluções encontradas`);
                    
                } catch (error) {
                    console.error(`❌ Erro ao obter dados de ${paciente.nome}:`, error.message);
                }
            }

            const resultado = {
                leito: leitoDesejado,
                pacientesEncontrados: pacientesEncontrados.length,
                pacientes: dadosDetalhados,
                timestamp: new Date().toISOString()
            };

            // Salvar resultado
            await this.salvarBuscaPorLeito(resultado);

            return resultado;

        } catch (error) {
            console.error(`[BUSCA DETALHADA] Erro:`, error.message);
            throw error;
        }
    }

    /**
     * Salvar resultado da busca por leito
     */
    async salvarBuscaPorLeito(dados) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = './output';
            const leitoSeguro = dados.leito.replace(/[^a-zA-Z0-9]/g, '');
            
            // Criar diretório se não existir
            try {
                await fs.access(outputDir);
            } catch {
                await fs.mkdir(outputDir, { recursive: true });
            }

            const filename = path.join(outputDir, `busca-leito-${leitoSeguro}-${timestamp}.json`);
            await fs.writeFile(filename, JSON.stringify(dados, null, 2), 'utf8');
            
            console.log(`\n💾 Dados salvos em: ${filename}`);
            
            // Log resumo
            console.log(`\n📊 RESUMO DA BUSCA:`);
            console.log(`- Leito pesquisado: ${dados.leito}`);
            console.log(`- Pacientes encontrados: ${dados.pacientesEncontrados}`);
            if (dados.pacientes.length > 0) {
                console.log(`- Dados detalhados coletados: ${dados.pacientes.length}`);
                dados.pacientes.forEach((p, index) => {
                    const totalEvolucoes = p.evolucoes?.totalEvolucoes || 0;
                    console.log(`  ${index + 1}. ${p.dadosBasicos.nome} - ${totalEvolucoes} evoluções`);
                });
            }

        } catch (error) {
            console.error('[SALVAMENTO] Erro ao salvar busca por leito:', error.message);
        }
    }

    /**
     * Extrai dados do sistema (funcionalidade principal)
     */
    async extractData() {
        if (!this.isLoggedIn) {
            throw new Error('É necessário fazer login antes de extrair dados');
        }

        console.log('[EXTRAÇÃO] Iniciando extração de dados...');
        const extractedData = [];

        try {
            // 1. Buscar todas as clínicas disponíveis
            const clinicas = await this.getClinicas();
            
            if (clinicas.length === 0) {
                console.log('[EXTRAÇÃO] Nenhuma clínica encontrada');
                return extractedData;
            }

            // 2. Para cada clínica, buscar os pacientes
            for (let i = 0; i < clinicas.length; i++) {
                const clinica = clinicas[i];
                
                try {
                    console.log(`[EXTRAÇÃO] Processando clínica ${i + 1}/${clinicas.length}: ${clinica.nome}`);
                    
                    const pacientes = await this.getPacientesClinica(clinica.codigo);
                    
                    // Adicionar dados da clínica aos pacientes
                    pacientes.forEach(paciente => {
                        extractedData.push({
                            ...paciente,
                            clinicaNome: clinica.nome,
                            clinicaCodigo: clinica.codigo,
                            timestamp: new Date().toISOString(),
                            url: this.indexUrl
                        });
                    });
                    
                    // Rate limiting entre clínicas
                    if (i < clinicas.length - 1) {
                        await this.delay();
                    }
                    
                } catch (error) {
                    console.error(`[EXTRAÇÃO] Erro ao processar clínica ${clinica.nome}:`, error.message);
                    continue;
                }
            }

            console.log(`[EXTRAÇÃO] ✅ Extração concluída. ${extractedData.length} pacientes coletados de ${clinicas.length} clínicas`);
            return extractedData;

        } catch (error) {
            console.error('[EXTRAÇÃO] Erro durante extração de dados:', error.message);
            throw error;
        }
    }

    // Método para obter informações de cadastro do paciente
    async getPacienteCadastro(pacienteId, tipoBusca = 'PRONT') {
        try {
            const payload = new URLSearchParams({
                'Param': 'REGE',
                'ParamModule': 'CONSPAC_OPEN',
                'PACIENTE': pacienteId,
                'TIPOBUSCA': tipoBusca,
                'TIPOSEXO': 'undefined',
                'IDADE': 'undefined',
                'TIPOBUSCA_LOCAL': 'undefined'
            });

            console.log(`🔍 Buscando informações de cadastro do paciente ${pacienteId}...`);

            const response = await this.client.post(this.loginUrl, payload.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.status === 200) {
                const htmlContent = response.data;
                
                if (this.debugMode) {
                    const debugFileName = `debug-paciente-cadastro-${pacienteId}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
                    await this.saveDebugHtml(htmlContent, debugFileName);
                }

                return this.parsePacienteCadastro(htmlContent, pacienteId);
            } else {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao buscar cadastro do paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    // Parser para extrair informações de cadastro do paciente
    parsePacienteCadastro(html, pacienteId) {
        try {
            const $ = cheerio.load(html);
            
            // Informações básicas do paciente
            const cadastro = {
                pacienteId: pacienteId,
                dadosBasicos: {},
                dadosComplementares: {},
                dadosEndereco: {},
                informacoesAdicionais: {}
            };

            // Extrair informações dos painéis de dados do paciente
            $('.panel-body').each((index, element) => {
                const panelText = $(element).text();
                
                // Buscar padrões de dados do paciente
                const patterns = {
                    registro: /Registro:\s*(\d+)/i,
                    nome: /Nome:\s*([^\n]+)/i,
                    nomeMae: /Nome da mãe:\s*([^\n]+)/i,
                    nascimento: /Nascimento:\s*([^\s]+)/i,
                    idade: /Idade:\s*([^\n]+)/i,
                    sexo: /Sexo:\s*([^\n]+)/i,
                    be: /BE:\s*([^\s,]+)/i,
                    cns: /CNS:\s*([^\n]+)/i,
                    documento: /Documento:\s*([^\n]+)/i,
                    logradouro: /Logradouro:\s*([^\n]+)/i,
                    bairro: /Bairro:\s*([^\n]+)/i,
                    telefone: /Telefone:\s*([^\n]+)/i,
                    municipio: /Município:\s*([^\n]+)/i,
                    estado: /Estado:\s*([^\n]+)/i,
                    cep: /CEP:\s*([^\n]+)/i,
                    responsavel: /Responsável:\s*([^\n]+)/i,
                    clinicaLeito: /Clinica \/ Leito:\s*([^\n]+)/i
                };

                // Aplicar padrões
                for (const [key, pattern] of Object.entries(patterns)) {
                    const match = panelText.match(pattern);
                    if (match) {
                        const value = match[1].trim();
                        
                        // Categorizar os dados
                        if (['registro', 'nome', 'nascimento', 'idade', 'sexo'].includes(key)) {
                            cadastro.dadosBasicos[key] = value;
                        } else if (['be', 'cns', 'documento'].includes(key)) {
                            cadastro.dadosComplementares[key] = value;
                        } else if (['logradouro', 'bairro', 'municipio', 'estado', 'cep'].includes(key)) {
                            cadastro.dadosEndereco[key] = value;
                        } else {
                            cadastro.informacoesAdicionais[key] = value;
                        }
                    }
                }
            });

            console.log(`✅ Cadastro do paciente ${pacienteId} extraído com sucesso`);
            return cadastro;

        } catch (error) {
            console.error(`❌ Erro ao processar cadastro do paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    // Método para obter evoluções de internação
    async getEvolucoes(pacienteId, filtros = {}) {
        try {
            const payload = new URLSearchParams({
                'Param': 'REGE',
                'ParamModule': 'Evo',
                'IdPac': pacienteId,
                'Filtro': filtros.filtro || '',
                'edit': filtros.edit || '',
                'param': filtros.param || '',
                'mEvo': filtros.mEvo || 'undefined',
                'filter': filtros.filter || 'undefined',
                'cpf': filtros.cpf || '74413201272',
                'filtroTipo': filtros.filtroTipo || 'undefined',
                'TIPOBUSCA': filtros.tipoBusca || 'PRONT'
            });

            console.log(`📋 Buscando evoluções do paciente ${pacienteId}...`);

            const response = await this.client.post(this.loginUrl, payload.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.status === 200) {
                const htmlContent = response.data;
                
                if (this.debugMode) {
                    const debugFileName = `debug-evolucoes-${pacienteId}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
                    await this.saveDebugHtml(htmlContent, debugFileName);
                }

                return this.parseEvolucoes(htmlContent, pacienteId);
            } else {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao buscar evoluções do paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    // Parser para extrair evoluções
    parseEvolucoes(html, pacienteId) {
        try {
            const $ = cheerio.load(html);
            const evolucoes = [];
            const evolucoesMap = new Map(); // Para evitar duplicações por ID

            // Buscar todas as evoluções no HTML
            $('#areaHistEvol .row').each((index, element) => {
                const $row = $(element);
                
                // Verificar se é uma linha de cabeçalho de evolução (contém profissional)
                const profissionalText = $row.find('.col-lg-4 b').first().text().trim();
                
                if (profissionalText && !profissionalText.includes('Descrição')) {
                    const evolucao = {
                        id: null,
                        profissional: profissionalText,
                        atividade: '',
                        dataEvolucao: '',
                        dataAtualizacao: '',
                        clinicaLeito: '',
                        descricao: ''
                    };

                    // Buscar dados nas próximas linhas
                    let currentRow = $row;
                    let foundDescription = false;

                    // Iterar pelas próximas linhas para coletar dados
                    for (let i = 0; i < 10 && !foundDescription; i++) {
                        currentRow = currentRow.next('.row');
                        if (currentRow.length === 0) break;

                        const rowText = currentRow.text();

                        // Extrair atividade
                        if (rowText.includes('Atividade:')) {
                            const atividadeMatch = rowText.match(/Atividade:\s*([^Data]+)/);
                            if (atividadeMatch) {
                                let atividadeCompleta = atividadeMatch[1].trim();
                                
                                // Limpar texto da atividade removendo quebras de linha desnecessárias
                                atividadeCompleta = atividadeCompleta
                                    .replace(/\s+/g, ' ')
                                    .replace(/Data\s+(Evolução|Atualização).*/i, '')
                                    .trim();
                                
                                evolucao.atividade = atividadeCompleta;
                            }
                        }

                        // Extrair data de evolução
                        if (rowText.includes('Data Evolução:')) {
                            const dataMatch = rowText.match(/Data Evolução:\s*([^\s]+\s+[^\s]+)/);
                            if (dataMatch) {
                                evolucao.dataEvolucao = dataMatch[1].trim();
                            }
                        }

                        // Extrair data de atualização
                        if (rowText.includes('Data Atualização:')) {
                            const dataAtualizacaoMatch = rowText.match(/Data Atualização:\s*([^\s]+\s+[^\s]+)/);
                            if (dataAtualizacaoMatch) {
                                evolucao.dataAtualizacao = dataAtualizacaoMatch[1].trim();
                            }
                        }

                        // Extrair clínica/leito
                        if (rowText.includes('Clinica / Leito:')) {
                            const clinicaMatch = rowText.match(/Clinica \/ Leito:\s*([^\n]+)/);
                            if (clinicaMatch) {
                                evolucao.clinicaLeito = clinicaMatch[1].trim();
                            }
                        }

                        // Buscar painel de descrição
                        const descriptionPanel = currentRow.find('.panel-body fieldset div[id*="txtView"]');
                        if (descriptionPanel.length > 0) {
                            evolucao.descricao = descriptionPanel.html().trim();
                            
                            // Extrair ID da evolução do atributo id
                            const idMatch = descriptionPanel.attr('id');
                            if (idMatch) {
                                const id = idMatch.replace('txtView', '');
                                evolucao.id = id;
                            }
                            
                            foundDescription = true;
                        }
                    }

                    // Só processar se encontrou dados válidos
                    if (evolucao.profissional && (evolucao.atividade || evolucao.descricao)) {
                        const evolucaoId = evolucao.id || `temp_${Date.now()}_${index}`;
                        
                        // Verificar se já existe uma evolução com este ID
                        if (evolucoesMap.has(evolucaoId)) {
                            // Fazer junção das informações duplicadas
                            const existingEvolucao = evolucoesMap.get(evolucaoId);
                            
                            // Mesclar dados priorizando conteúdo mais completo
                            existingEvolucao.profissional = this.escolherMelhorConteudo(
                                existingEvolucao.profissional, 
                                evolucao.profissional
                            );
                            
                            existingEvolucao.atividade = this.escolherMelhorConteudo(
                                existingEvolucao.atividade, 
                                evolucao.atividade
                            );
                            
                            existingEvolucao.dataEvolucao = this.escolherMelhorConteudo(
                                existingEvolucao.dataEvolucao, 
                                evolucao.dataEvolucao
                            );
                            
                            existingEvolucao.dataAtualizacao = this.escolherMelhorConteudo(
                                existingEvolucao.dataAtualizacao, 
                                evolucao.dataAtualizacao
                            );
                            
                            existingEvolucao.clinicaLeito = this.escolherMelhorConteudo(
                                existingEvolucao.clinicaLeito, 
                                evolucao.clinicaLeito
                            );
                            
                            existingEvolucao.descricao = this.escolherMelhorConteudo(
                                existingEvolucao.descricao, 
                                evolucao.descricao
                            );
                            
                            console.log(`[EVOLUCOES] Dados mesclados para evolução ID ${evolucaoId}`);
                        } else {
                            // Adicionar nova evolução
                            evolucoesMap.set(evolucaoId, evolucao);
                        }
                    }
                }
            });

            // Converter Map para Array
            const evolucoesSemDuplicacao = Array.from(evolucoesMap.values());

            console.log(`✅ ${evolucoesSemDuplicacao.length} evoluções únicas extraídas para o paciente ${pacienteId}`);
            if (evolucoesMap.size !== evolucoes.length) {
                console.log(`[EVOLUCOES] Removidas ${evolucoes.length - evolucoesMap.size} duplicações`);
            }

            return {
                pacienteId: pacienteId,
                totalEvolucoes: evolucoesSemDuplicacao.length,
                evolucoes: evolucoesSemDuplicacao
            };

        } catch (error) {
            console.error(`❌ Erro ao processar evoluções do paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    /**
     * Extrai hipóteses diagnósticas e HDA da última evolução médica
     * @param {string} pacienteId - ID do paciente
     * @returns {Promise<Object>} - Dados clínicos extraídos
     */
    async extrairDadosClinicosUltimaEvolucao(pacienteId) {
        try {
            console.log(`🔬 Extraindo dados clínicos da última evolução médica do paciente ${pacienteId}...`);

            // Buscar todas as evoluções do paciente
            const evolucoes = await this.getEvolucoes(pacienteId);
            
            if (!evolucoes.evolucoes || evolucoes.evolucoes.length === 0) {
                return {
                    pacienteId: pacienteId,
                    ultimaEvolucao: null,
                    hipotesesDiagnosticas: [],
                    hda: null,
                    dataUltimaEvolucao: null,
                    profissionalResponsavel: null
                };
            }

            // Filtrar apenas evoluções médicas (médico ou residente)
            const evolucoesMedicas = evolucoes.evolucoes.filter(evolucao => {
                return this.isEvolucaoMedica(evolucao);
            });

            if (evolucoesMedicas.length === 0) {
                console.log(`⚠️  Nenhuma evolução médica encontrada para o paciente ${pacienteId}`);
                return {
                    pacienteId: pacienteId,
                    ultimaEvolucao: null,
                    hipotesesDiagnosticas: [],
                    hda: null,
                    dataUltimaEvolucao: null,
                    profissionalResponsavel: null,
                    observacao: "Nenhuma evolução médica encontrada"
                };
            }

            // Ordenar evoluções médicas por data (mais recente primeiro)
            const evolucoesMedicasOrdenadas = evolucoesMedicas.sort((a, b) => {
                const dataA = this.parseDataEvolucao(a.dataEvolucao);
                const dataB = this.parseDataEvolucao(b.dataEvolucao);
                return dataB - dataA;
            });

            // Buscar na última evolução médica (mais recente)
            const ultimaEvolucaoMedica = evolucoesMedicasOrdenadas[0];
            
            console.log(`📋 Analisando evolução médica de ${ultimaEvolucaoMedica.dataEvolucao} por ${ultimaEvolucaoMedica.profissional}`);
            console.log(`🏥 Atividade: ${ultimaEvolucaoMedica.atividade}`);

            const dadosClinicos = this.extrairDadosClinicosTexto(ultimaEvolucaoMedica.descricao);

            const resultado = {
                pacienteId: pacienteId,
                ultimaEvolucao: {
                    id: ultimaEvolucaoMedica.id,
                    data: ultimaEvolucaoMedica.dataEvolucao,
                    profissional: ultimaEvolucaoMedica.profissional,
                    atividade: ultimaEvolucaoMedica.atividade,
                    clinicaLeito: ultimaEvolucaoMedica.clinicaLeito
                },
                hipotesesDiagnosticas: dadosClinicos.hipotesesDiagnosticas,
                hda: dadosClinicos.hda,
                dataUltimaEvolucao: ultimaEvolucaoMedica.dataEvolucao,
                profissionalResponsavel: ultimaEvolucaoMedica.profissional,
                dadosExtras: dadosClinicos.dadosExtras,
                totalEvolucoesMedicas: evolucoesMedicas.length,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Dados clínicos extraídos de evolução médica:`);
            console.log(`- HDA: ${dadosClinicos.hda ? 'Encontrada' : 'Não encontrada'}`);
            console.log(`- Hipóteses diagnósticas: ${dadosClinicos.hipotesesDiagnosticas.length} encontradas`);
            console.log(`- Total de evoluções médicas: ${evolucoesMedicas.length}`);

            return resultado;

        } catch (error) {
            console.error(`❌ Erro ao extrair dados clínicos do paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    /**
     * Verifica se uma evolução é médica (feita por médico ou residente)
     * @param {Object} evolucao - Objeto da evolução
     * @returns {boolean} - Se é evolução médica
     */
    isEvolucaoMedica(evolucao) {
        if (!evolucao.atividade && !evolucao.profissional) {
            return false;
        }

        // Combinação dos campos para análise
        const textoAnalise = `${evolucao.atividade || ''} ${evolucao.profissional || ''}`.toLowerCase();

        // Padrões que indicam atividade médica
        const padroesMedicos = [
            'medico',
            'médico',
            'residente',
            'resident',
            'clinica medica',
            'clínica médica',
            'medicina',
            'clinico',
            'clínico',
            'dr.',
            'dra.',
            'doutor',
            'doutora'
        ];

        // Padrões que NÃO são atividades médicas (excluir)
        const padroesNaoMedicos = [
            'psicologo',
            'psicólogo',
            'enfermeiro',
            'enfermeira',
            'fisioterapeuta',
            'nutricionista',
            'farmaceutico',
            'farmacêutico',
            'assistente social',
            'fonoaudiologo',
            'fonoaudiólogo',
            'tecnico',
            'técnico',
            'auxiliar'
        ];

        // Primeiro verificar se NÃO é atividade médica
        const isNaoMedico = padroesNaoMedicos.some(padrao => textoAnalise.includes(padrao));
        if (isNaoMedico) {
            return false;
        }

        // Depois verificar se É atividade médica
        const isMedico = padroesMedicos.some(padrao => textoAnalise.includes(padrao));
        
        return isMedico;
    }

    /**
     * Converte string de data em objeto Date para comparação
     * @param {string} dataStr - Data no formato do sistema
     * @returns {Date} - Objeto Date
     */
    parseDataEvolucao(dataStr) {
        try {
            if (!dataStr) return new Date(0);
            
            // Tentar diferentes formatos de data
            const formatosData = [
                /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,  // DD/MM/YYYY HH:MM:SS
                /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,          // DD/MM/YYYY HH:MM
                /(\d{2})\/(\d{2})\/(\d{4})/,                           // DD/MM/YYYY
                /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,   // YYYY-MM-DD HH:MM:SS
                /(\d{4})-(\d{2})-(\d{2})/                             // YYYY-MM-DD
            ];

            for (const formato of formatosData) {
                const match = dataStr.match(formato);
                if (match) {
                    if (formato.source.includes('\\d{4}-')) {
                        // Formato YYYY-MM-DD
                        return new Date(match[1], match[2] - 1, match[3], match[4] || 0, match[5] || 0, match[6] || 0);
                    } else {
                        // Formato DD/MM/YYYY
                        return new Date(match[3], match[2] - 1, match[1], match[4] || 0, match[5] || 0, match[6] || 0);
                    }
                }
            }

            // Se não conseguir parsear, retornar data padrão
            return new Date(0);
            
        } catch (error) {
            console.error(`[PARSE DATA] Erro ao parsear data ${dataStr}:`, error.message);
            return new Date(0);
        }
    }

    /**
     * Extrai dados clínicos do texto da evolução médica
     * @param {string} textoEvolucao - Texto HTML da evolução
     * @returns {Object} - Dados clínicos extraídos
     */
    extrairDadosClinicosTexto(textoEvolucao) {
        try {
            if (!textoEvolucao) {
                return {
                    hipotesesDiagnosticas: [],
                    hda: null,
                    dadosExtras: {}
                };
            }

            // Remover tags HTML e normalizar texto
            const cheerio = require('cheerio');
            const $ = cheerio.load(textoEvolucao);
            const textoLimpo = $.text().replace(/\s+/g, ' ').trim();

            console.log(`[EXTRAÇÃO CLÍNICA] Analisando texto de ${textoLimpo.length} caracteres`);

            const dadosClinicos = {
                hipotesesDiagnosticas: [],
                hda: null,
                dadosExtras: {}
            };

            // 1. Extrair HDA (História da Doença Atual)
            dadosClinicos.hda = this.extrairHDA(textoLimpo);

            // 2. Extrair Hipóteses Diagnósticas
            dadosClinicos.hipotesesDiagnosticas = this.extrairHipotesesDiagnosticas(textoLimpo);

            // 3. Extrair outros dados clínicos relevantes
            dadosClinicos.dadosExtras = this.extrairDadosExtras(textoLimpo);

            return dadosClinicos;

        } catch (error) {
            console.error(`[EXTRAÇÃO CLÍNICA] Erro ao extrair dados clínicos:`, error.message);
            return {
                hipotesesDiagnosticas: [],
                hda: null,
                dadosExtras: {}
            };
        }
    }

    /**
     * Extrai HDA do texto da evolução
     * @param {string} texto - Texto da evolução
     * @returns {string|null} - HDA extraída
     */
    extrairHDA(texto) {
        try {
            const padroesHDA = [
                /HDA[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /História da doença atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /História atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /Doença atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /Quadro atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /Evolução[:\s]*([^\.]+(?:\.[^\.]*){0,3})/i
            ];

            for (const padrao of padroesHDA) {
                const match = texto.match(padrao);
                if (match && match[1] && match[1].trim().length > 20) {
                    const hda = match[1].trim()
                        .replace(/\s+/g, ' ')
                        .replace(/[,\s]*$/, ''); // Remove vírgulas e espaços no final
                    
                    console.log(`[HDA] Encontrada: ${hda.substring(0, 100)}...`);
                    return hda;
                }
            }

            // Se não encontrou com padrões específicos, tentar extrair do início do texto
            const linhas = texto.split(/[.!?]/).filter(l => l.trim().length > 30);
            if (linhas.length > 0) {
                const primeiraLinha = linhas[0].trim();
                if (primeiraLinha.length > 50 && !primeiraLinha.toLowerCase().includes('exame')) {
                    console.log(`[HDA] Extraída do início do texto: ${primeiraLinha.substring(0, 100)}...`);
                    return primeiraLinha;
                }
            }

            return null;

        } catch (error) {
            console.error(`[HDA] Erro ao extrair HDA:`, error.message);
            return null;
        }
    }

    /**
     * Extrai hipóteses diagnósticas do texto
     * @param {string} texto - Texto da evolução
     * @returns {Array<string>} - Lista de hipóteses diagnósticas
     */
    extrairHipotesesDiagnosticas(texto) {
        try {
            const hipoteses = [];

            // Padrões para identificar hipóteses diagnósticas
            const padroesDiagnosticos = [
                /(?:hipótese|hipóteses|diagnóstico|diagnósticos|suspeita|suspeitas)[s]?\s*(?:diagnóstica[s]?)?[:\s]*([^\.]+)/gi,
                /(?:HD|Hd|hd)[:\s]*([^\.]+)/gi,
                /(?:DX|Dx|dx)[:\s]*([^\.]+)/gi,
                /(?:CID|cid)[:\s]*([A-Z]\d{2}[^\.]*)/gi,
                /(?:impressão diagnóstica|impressão clínica)[:\s]*([^\.]+)/gi
            ];

            let matchCount = 0;
            for (const padrao of padroesDiagnosticos) {
                let match;
                while ((match = padrao.exec(texto)) !== null && matchCount < 10) {
                    const hipotese = match[1].trim()
                        .replace(/\s+/g, ' ')
                        .replace(/[,\s]*$/, '');
                    
                    if (hipotese.length > 5 && !hipoteses.includes(hipotese)) {
                        hipoteses.push(hipotese);
                        console.log(`[HIPÓTESE] Encontrada: ${hipotese}`);
                        matchCount++;
                    }
                }
            }

            // Buscar por códigos CID específicos
            const padroesCID = /\b[A-Z]\d{2}(?:\.\d{1,2})?\b/g;
            let matchCID;
            while ((matchCID = padroesCID.exec(texto)) !== null) {
                const cid = matchCID[0];
                if (!hipoteses.some(h => h.includes(cid))) {
                    hipoteses.push(`CID: ${cid}`);
                    console.log(`[HIPÓTESE CID] Encontrada: ${cid}`);
                }
            }

            return hipoteses;

        } catch (error) {
            console.error(`[HIPÓTESES] Erro ao extrair hipóteses diagnósticas:`, error.message);
            return [];
        }
    }

    /**
     * Extrai dados extras da evolução (condutas, exames, etc.)
     * @param {string} texto - Texto da evolução
     * @returns {Object} - Dados extras extraídos
     */
    extrairDadosExtras(texto) {
        try {
            const dadosExtras = {};

            // Padrões para condutas
            const padraoCondutas = /(?:conduta|condutas|plano|planejamento)[:\s]*([^\.]+(?:\.[^\.]*){0,2})/gi;
            const matchConduta = padraoCondutas.exec(texto);
            if (matchConduta) {
                dadosExtras.condutas = matchConduta[1].trim();
            }

            // Padrões para exames
            const padraoExames = /(?:exame|exames|solicitar|solicitado)[:\s]*([^\.]+)/gi;
            const exames = [];
            let matchExame;
            while ((matchExame = padraoExames.exec(texto)) !== null && exames.length < 5) {
                const exame = matchExame[1].trim();
                if (exame.length > 10) {
                    exames.push(exame);
                }
            }
            if (exames.length > 0) {
                dadosExtras.exames = exames;
            }

            // Padrões para medicações
            const padraoMedicacoes = /(?:medicação|medicamentos|prescrição|prescrito)[:\s]*([^\.]+)/gi;
            const matchMedicacao = padraoMedicacoes.exec(texto);
            if (matchMedicacao) {
                dadosExtras.medicacoes = matchMedicacao[1].trim();
            }

            return dadosExtras;

        } catch (error) {
            console.error(`[DADOS EXTRAS] Erro ao extrair dados extras:`, error.message);
            return {};
        }
    }

    /**
     * Escolhe o melhor conteúdo entre duas opções durante mesclagem
     * @param {string} conteudo1 - Primeiro conteúdo
     * @param {string} conteudo2 - Segundo conteúdo
     * @returns {string} - Melhor conteúdo
     */
    escolherMelhorConteudo(conteudo1, conteudo2) {
        // Se um dos conteúdos estiver vazio, retornar o outro
        if (!conteudo1 && conteudo2) return conteudo2;
        if (!conteudo2 && conteudo1) return conteudo1;
        if (!conteudo1 && !conteudo2) return '';
        
        // Se ambos existem, escolher o mais completo (maior)
        if (conteudo1.length >= conteudo2.length) {
            return conteudo1;
        } else {
            return conteudo2;
        }
    }

    /**
     * Extrai dados de uma página específica
     */
    async extractPageData(url) {
        try {
            const response = await this.client.get(url);
            const $ = cheerio.load(response.data);

            // Adapte esta lógica conforme a estrutura das páginas que você quer extrair
            const pageData = {
                url: url,
                timestamp: new Date().toISOString(),
                title: $('title').text().trim(),
                // Adicione aqui os campos específicos que você quer extrair
                // Exemplo:
                // patientName: $('.patient-name').text().trim(),
                // patientId: $('.patient-id').text().trim(),
                // records: []
            };

            // Extrair dados específicos conforme necessário
            // $('.record-item').each((i, element) => {
            //     pageData.records.push({
            //         date: $(element).find('.date').text().trim(),
            //         description: $(element).find('.description').text().trim()
            //     });
            // });

            return pageData;

        } catch (error) {
            console.error(`[EXTRAÇÃO] Erro ao extrair dados da página ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Salva os dados extraídos em arquivo
     */
    async saveData(data, format = 'json') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = './output';
            
            // Criar diretório de saída se não existir
            try {
                await fs.access(outputDir);
            } catch {
                await fs.mkdir(outputDir, { recursive: true });
            }

            if (format.toLowerCase() === 'json') {
                const filename = path.join(outputDir, `hicd-data-${timestamp}.json`);
                await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
                console.log(`[SALVAMENTO] ✅ Dados salvos em JSON: ${filename}`);
                
            } else if (format.toLowerCase() === 'csv') {
                const filename = path.join(outputDir, `hicd-data-${timestamp}.csv`);
                const csv = this.convertToCSV(data);
                await fs.writeFile(filename, csv, 'utf8');
                console.log(`[SALVAMENTO] ✅ Dados salvos em CSV: ${filename}`);
            }

            // Salvar também um log da execução
            const logFilename = path.join(outputDir, `hicd-log-${timestamp}.txt`);
            const logData = {
                timestamp: new Date().toISOString(),
                recordsCount: data.length,
                username: this.username,
                executionSummary: `Extração concluída com ${data.length} registros`
            };
            await fs.writeFile(logFilename, JSON.stringify(logData, null, 2), 'utf8');

        } catch (error) {
            console.error('[SALVAMENTO] Erro ao salvar dados:', error.message);
            throw error;
        }
    }

    /**
     * Converte dados para formato CSV
     */
    convertToCSV(data) {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Escapar valores que contêm vírgulas ou aspas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Faz logout do sistema
     */
    async logout() {
        try {
            console.log('[LOGOUT] Fazendo logout...');
            
            // Tentar fazer logout (adapte a URL conforme necessário)
            await this.client.post(`${this.baseUrl}/controller/controller.php`, 
                new URLSearchParams({ 'Param': 'LOGOUT' }), 
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            this.isLoggedIn = false;
            this.cookies = '';
            delete this.client.defaults.headers.Cookie;
            
            console.log('[LOGOUT] ✅ Logout realizado com sucesso');
            
        } catch (error) {
            console.error('[LOGOUT] Erro durante logout:', error.message);
        }
    }

    /**
     * Analisa todos os pacientes de uma clínica específica extraindo dados clínicos da última evolução médica
     * @param {string} nomeClinica - Nome da clínica a ser analisada (ex: "ENFERMARIA G", "UTI", etc.)
     * @param {Object} opcoes - Opções para a análise
     * @param {boolean} opcoes.salvarArquivo - Se deve salvar resultado em arquivo JSON (padrão: true)
     * @param {boolean} opcoes.incluirDetalhes - Se deve incluir detalhes completos da análise (padrão: true)
     * @param {string} opcoes.diretorioSaida - Diretório para salvar arquivos (padrão: "output")
     * @returns {Promise<Object>} Relatório completo da análise da clínica
     */
    async analisarClinica(nomeClinica, opcoes = {}) {
        const {
            salvarArquivo = true,
            incluirDetalhes = true,
            diretorioSaida = 'output'
        } = opcoes;

        console.log(`🏥 ANÁLISE COMPLETA - ${nomeClinica.toUpperCase()}`);
        console.log('='.repeat(60));
        
        try {
            // Verificar se está logado
            if (!this.isLoggedIn) {
                console.log('🔑 Fazendo login...');
                await this.login();
                console.log('✅ Login realizado com sucesso\n');
            }
            
            // Buscar todos os pacientes
            console.log('🔍 BUSCANDO PACIENTES DA CLÍNICA');
            console.log('-'.repeat(40));
            
            const todosPacientes = await this.buscarPacientes();
            
            // Filtrar pacientes da clínica específica
            const pacientesClinica = todosPacientes.filter(p => {
                // Verificar por nome da clínica
                if (p.clinicaNome && p.clinicaNome.toUpperCase().includes(nomeClinica.toUpperCase())) {
                    return true;
                }
                
                // Verificar por leito (formato: 012.012-0007 para ENFERMARIA G)
                if (p.leito && p.leito.toUpperCase().includes(nomeClinica.toUpperCase())) {
                    return true;
                }
                
                // Verificar por clinicaLeito se existir
                if (p.clinicaLeito && p.clinicaLeito.toUpperCase().includes(nomeClinica.toUpperCase())) {
                    return true;
                }
                
                // Mapeamento específico para enfermarias
                const mapeamentoEnfermarias = {
                    'ENFERMARIA G': ['012.012', 'ENFERMARIA G'],
                    'ENFERMARIA A': ['008.008', 'ENFERMARIA A'],
                    'ENFERMARIA B': ['009.009', 'ENFERMARIA B'],
                    'ENFERMARIA C': ['010.010', 'ENFERMARIA C'],
                    'ENFERMARIA D': ['011.011', 'ENFERMARIA D'],
                    'ENFERMARIA H': ['013.013', 'ENFERMARIA H'],
                    'ENFERMARIA J': ['015.015', 'ENFERMARIA J'],
                    'ENFERMARIA K': ['016.016', 'ENFERMARIA K'],
                    'ENFERMARIA L': ['017.017', 'ENFERMARIA L'],
                    'ENFERMARIA M': ['018.018', 'ENFERMARIA M'],
                    'UTI': ['007.007', 'U T I'],
                    'CIP': ['002.002', 'C I P']
                };
                
                const padroes = mapeamentoEnfermarias[nomeClinica.toUpperCase()];
                if (padroes) {
                    return padroes.some(padrao => {
                        return (p.leito && p.leito.includes(padrao)) ||
                               (p.clinicaNome && p.clinicaNome.toUpperCase().includes(padrao.toUpperCase())) ||
                               (p.clinicaLeito && p.clinicaLeito.includes(padrao));
                    });
                }
                
                return false;
            });
            
            console.log(`📋 Encontrados ${pacientesClinica.length} pacientes na ${nomeClinica}\n`);
            
            if (pacientesClinica.length === 0) {
                const resultado = {
                    clinica: nomeClinica,
                    dataAnalise: new Date().toISOString(),
                    totalPacientes: 0,
                    pacientesAnalisados: 0,
                    sucessos: 0,
                    falhas: 0,
                    pacientesComHDA: 0,
                    pacientesComDiagnosticos: 0,
                    resultados: [],
                    resumo: 'Nenhum paciente encontrado na clínica especificada'
                };
                
                console.log('❌ Nenhum paciente encontrado na clínica especificada');
                return resultado;
            }
            
            const resultados = [];
            let sucessos = 0;
            let falhas = 0;
            
            // Analisar cada paciente
            for (let i = 0; i < pacientesClinica.length; i++) {
                const paciente = pacientesClinica[i];
                console.log(`\n📋 PACIENTE ${i+1}/${pacientesClinica.length} - Leito: ${paciente.clinicaLeito}`);
                console.log('-'.repeat(50));
                console.log(`• Prontuário: ${paciente.prontuario}`);
                console.log(`• Nome: ${paciente.nome}`);
                console.log(`• Leito: ${paciente.clinicaLeito}`);
                
                try {
                    console.log(`🔬 Extraindo dados clínicos...`);
                    const analise = await this.extrairDadosClinicosUltimaEvolucao(paciente.prontuario);
                    
                    if (analise) {
                        sucessos++;
                        console.log(`✅ Análise realizada:`);
                        console.log(`   • HDA: ${analise.hda ? 'Encontrada' : 'Não encontrada'}`);
                        console.log(`   • Hipóteses diagnósticas: ${analise.hipotesesDiagnosticas?.length || 0}`);
                        console.log(`   • Profissional: ${analise.profissionalResponsavel || 'N/A'}`);
                        console.log(`   • Data última evolução: ${analise.dataUltimaEvolucao || 'N/A'}`);
                        
                        if (analise.totalEvolucoesMedicas !== undefined) {
                            console.log(`   • Total evoluções médicas: ${analise.totalEvolucoesMedicas}`);
                        }
                        
                        resultados.push({
                            paciente: {
                                prontuario: paciente.prontuario,
                                nome: paciente.nome,
                                leito: paciente.clinicaLeito,
                                idade: paciente.idade,
                                sexo: paciente.sexo
                            },
                            analise: incluirDetalhes ? analise : {
                                hda: analise.hda ? 'Encontrada' : null,
                                hipotesesDiagnosticas: analise.hipotesesDiagnosticas?.length || 0,
                                profissionalResponsavel: analise.profissionalResponsavel,
                                dataUltimaEvolucao: analise.dataUltimaEvolucao,
                                totalEvolucoesMedicas: analise.totalEvolucoesMedicas
                            },
                            status: 'sucesso'
                        });
                    } else {
                        falhas++;
                        console.log(`❌ Falha na análise - nenhum dado extraído`);
                        resultados.push({
                            paciente: {
                                prontuario: paciente.prontuario,
                                nome: paciente.nome,
                                leito: paciente.clinicaLeito,
                                idade: paciente.idade,
                                sexo: paciente.sexo
                            },
                            analise: null,
                            erro: 'Falha na extração de dados clínicos',
                            status: 'falha'
                        });
                    }
                    
                } catch (error) {
                    falhas++;
                    console.log(`❌ Erro na análise: ${error.message}`);
                    resultados.push({
                        paciente: {
                            prontuario: paciente.prontuario,
                            nome: paciente.nome,
                            leito: paciente.clinicaLeito,
                            idade: paciente.idade,
                            sexo: paciente.sexo
                        },
                        analise: null,
                        erro: error.message,
                        status: 'erro'
                    });
                }
                
                // Pausa entre análises para evitar sobrecarga
                if (i < pacientesClinica.length - 1) {
                    console.log('⏳ Aguardando antes da próxima análise...');
                    await this.delay(2000);
                }
            }
            
            // Calcular estatísticas
            const pacientesComHDA = resultados.filter(r => 
                r.analise && (r.analise.hda || (typeof r.analise.hda === 'string' && r.analise.hda !== 'Não encontrada'))
            ).length;
            
            const pacientesComDiagnosticos = resultados.filter(r => 
                r.analise && r.analise.hipotesesDiagnosticas && 
                (Array.isArray(r.analise.hipotesesDiagnosticas) ? 
                    r.analise.hipotesesDiagnosticas.length > 0 : 
                    r.analise.hipotesesDiagnosticas > 0)
            ).length;
            
            // Montar relatório final
            const relatorio = {
                clinica: nomeClinica,
                dataAnalise: new Date().toISOString(),
                totalPacientes: pacientesClinica.length,
                pacientesAnalisados: resultados.length,
                sucessos: sucessos,
                falhas: falhas,
                pacientesComHDA: pacientesComHDA,
                pacientesComDiagnosticos: pacientesComDiagnosticos,
                taxaSucesso: ((sucessos / resultados.length) * 100).toFixed(1),
                resultados: resultados,
                resumo: `Análise de ${pacientesClinica.length} pacientes da ${nomeClinica}. ${sucessos} sucessos, ${falhas} falhas. ${pacientesComHDA} com HDA, ${pacientesComDiagnosticos} com diagnósticos.`
            };
            
            // Salvar arquivo se solicitado
            if (salvarArquivo) {
                try {
                    const fs = require('fs').promises;
                    const path = require('path');
                    const timestamp = new Date().toISOString();
                    const nomeArquivo = `analise-clinica-${nomeClinica.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;
                    const caminhoArquivo = path.join(diretorioSaida, nomeArquivo);
                    
                    // Garantir que o diretório existe
                    await fs.mkdir(diretorioSaida, { recursive: true });
                    
                    await fs.writeFile(caminhoArquivo, JSON.stringify(relatorio, null, 2));
                    relatorio.arquivoSalvo = nomeArquivo;
                    console.log(`💾 Relatório salvo: ${nomeArquivo}`);
                } catch (error) {
                    console.error(`❌ Erro ao salvar arquivo: ${error.message}`);
                }
            }
            
            // Exibir resumo
            console.log(`\n\n🏁 RESUMO DA ANÁLISE - ${nomeClinica.toUpperCase()}`);
            console.log('='.repeat(60));
            console.log(`📊 Total de pacientes: ${relatorio.totalPacientes}`);
            console.log(`✅ Análises bem-sucedidas: ${relatorio.sucessos} (${relatorio.taxaSucesso}%)`);
            console.log(`❌ Falhas: ${relatorio.falhas}`);
            console.log(`\n📋 DADOS CLÍNICOS EXTRAÍDOS:`);
            console.log(`   • Pacientes com HDA: ${relatorio.pacientesComHDA} (${((pacientesComHDA/sucessos)*100).toFixed(1)}% dos sucessos)`);
            console.log(`   • Pacientes com hipóteses diagnósticas: ${relatorio.pacientesComDiagnosticos} (${((pacientesComDiagnosticos/sucessos)*100).toFixed(1)}% dos sucessos)`);
            
            return relatorio;
            
        } catch (error) {
            console.error('❌ Erro durante análise da clínica:', error.message);
            throw error;
        }
    }

    /**
     * Método específico para analisar a Enfermaria G
     * @param {Object} opcoes - Opções para a análise (mesmas do método analisarClinica)
     * @returns {Promise<Object>} Relatório da análise da Enfermaria G
     */
    async analisarEnfermariaG(opcoes = {}) {
        return await this.analisarClinica('ENFERMARIA G', opcoes);
    }
        async analisarEnfermaria(enfermaria,opcoes = {}) {
        return await this.analisarClinica(enfermaria, opcoes);
    }
}

module.exports = HICDCrawler;
