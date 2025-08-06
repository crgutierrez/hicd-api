/**
 * Arquivo de configuração para o HICD Crawler
 * 
 * Este arquivo contém configurações avançadas que podem ser
 * modificadas sem alterar o código principal do crawler.
 */

module.exports = {
    // Configurações de autenticação
    auth: {
        // URLs do sistema
        baseUrl: 'https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend',
        loginUrl: 'https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/controller/controller.php',
        indexUrl: 'https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/index.php',
        
        // Parâmetros do payload de login
        loginParams: {
            paramField: 'Param',
            paramValue: 'LOGIN',
            userField: 'user',
            passField: 'pass',
            sessionField: 'session',
            sessionValue: 'undefined'
        }
    },

    // Configurações de rede e requisições
    network: {
        // Timeout para requisições (em ms)
        timeout: 30000,
        
        // Delay entre requisições (em ms)
        requestDelay: 1000,
        
        // Número máximo de tentativas
        maxRetries: 3,
        
        // Delay extra em caso de erro (em ms)
        errorDelay: 3000,
        
        // Headers personalizados
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    },

    // Configurações de extração de dados
    extraction: {
        // Seletores CSS para encontrar dados específicos
        selectors: {
            // Seletores para identificar se o usuário está logado
            loginIndicators: [
                'body:contains("Sair")',
                'body:contains("Logout")',
                '.user-name',
                '.logout-button'
            ],
            
            // Seletores para encontrar links de prontuários
            dataLinks: [
                'a[href*="prontuario"]',
                'a[href*="paciente"]',
                'a[href*="consulta"]',
                '.data-link',
                '.prontuario-link'
            ],
            
            // Seletores para extrair dados de páginas específicas
            pageData: {
                title: 'title, h1, .page-title',
                patientName: '.patient-name, .nome-paciente, #patient-name',
                patientId: '.patient-id, .id-paciente, #patient-id',
                date: '.date, .data, .timestamp',
                records: '.record, .registro, .entry'
            }
        },
        
        // Campos a serem extraídos de cada página
        fields: [
            'url',
            'timestamp',
            'title',
            'patientName',
            'patientId',
            'date',
            'content'
        ],
        
        // Filtros para dados extraídos
        filters: {
            // Filtrar apenas registros com título
            requireTitle: true,
            
            // Filtrar apenas registros recentes (dias)
            maxAge: null,
            
            // Palavras-chave que devem estar presentes
            requiredKeywords: [],
            
            // Palavras-chave que devem ser excluídas
            excludeKeywords: ['teste', 'exemplo']
        }
    },

    // Configurações de saída
    output: {
        // Diretório de saída
        directory: './output',
        
        // Formatos de arquivo suportados
        formats: ['json', 'csv'],
        
        // Prefixo para nomes de arquivos
        filePrefix: 'hicd-data',
        
        // Incluir timestamp nos nomes dos arquivos
        includeTimestamp: true,
        
        // Configurações específicas para JSON
        json: {
            // Espaçamento para formatação
            indent: 2,
            
            // Incluir metadados no arquivo
            includeMetadata: true
        },
        
        // Configurações específicas para CSV
        csv: {
            // Separador de campos
            delimiter: ',',
            
            // Caractere de escape
            escape: '"',
            
            // Incluir cabeçalhos
            headers: true
        }
    },

    // Configurações de logging
    logging: {
        // Nível de log (debug, info, warn, error)
        level: 'info',
        
        // Incluir timestamps nos logs
        timestamps: true,
        
        // Cores nos logs
        colors: true,
        
        // Salvar logs em arquivo
        saveToFile: true,
        
        // Arquivo de log
        logFile: './output/crawler.log'
    },

    // Configurações de validação
    validation: {
        // Validar URLs antes de acessar
        validateUrls: true,
        
        // Verificar se a página carregou completamente
        checkPageLoad: true,
        
        // Tamanho mínimo esperado para uma página válida (bytes)
        minPageSize: 1000,
        
        // Palavras que indicam erro na página
        errorIndicators: [
            'erro',
            'error',
            'não encontrado',
            'not found',
            'acesso negado',
            'access denied'
        ]
    },

    // Configurações específicas do sistema HICD
    hicd: {
        // Bug conhecido: primeira requisição sempre falha
        firstRequestAlwaysFails: true,
        
        // Delay extra após primeira tentativa de login (ms)
        postFirstAttemptDelay: 2000,
        
        // Indicadores específicos de login bem-sucedido
        loginSuccessIndicators: [
            'OK',
            'sucesso',
            'success'
        ],
        
        // Indicadores de que o usuário não está mais como ANONYMOUS
        notAnonymousIndicators: [
            '!ANONYMOUS'
        ]
    }
};
