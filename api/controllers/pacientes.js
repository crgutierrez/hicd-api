const HICDCrawler = require('../../hicd-crawler-refactored');

class PacientesController {
    constructor() {
        this.crawler = null;
    }

    // Inicializar o crawler (lazy loading)
    async initCrawler() {
        if (!this.crawler) {
            this.crawler = new HICDCrawler();
            await this.crawler.login();
        }
        return this.crawler;
    }

    // Buscar paciente por prontuário
    async buscarPaciente(req, res) {
        try {
            const { prontuario } = req.query;
            
            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O parâmetro "prontuario" é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            console.log(`Buscando paciente por prontuário: ${prontuario}`);
            
            // Buscar cadastro do paciente (que funciona como busca por prontuário)
            const cadastro = await crawler.getPacienteCadastro(prontuario);

            if (!cadastro) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                });
            }

            res.json({
                success: true,
                data: {
                    prontuario: prontuario,
                    ...cadastro
                },
                searchTerm: prontuario
            });
        } catch (error) {
            console.error('Erro ao buscar paciente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar paciente',
                message: error.message
            });
        }
    }

    // Obter detalhes completos de um paciente
    async obterDetalhesPaciente(req, res) {
        try {
            const { prontuario } = req.params;
            
            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            console.log(`Obtendo detalhes do paciente: ${prontuario}`);
            
            // Buscar cadastro do paciente
            const cadastro = await crawler.getPacienteCadastro(prontuario);
            
            if (!cadastro) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                });
            }

            res.json({
                success: true,
                data: {
                    prontuario: prontuario,
                    cadastro: cadastro,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Erro ao obter detalhes do paciente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter detalhes do paciente',
                message: error.message
            });
        }
    }

    // Obter evoluções médicas de um paciente
    async obterEvolucoesPaciente(req, res) {
        try {
            const { prontuario } = req.params;
            const { limite = 10, formato = 'resumido' } = req.query;
            
            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            console.log(`Obtendo evoluções do paciente: ${prontuario}`);
            
            // Buscar evoluções do paciente
            const evolucoes = await crawler.getEvolucoes(prontuario);
            
            if (!evolucoes || evolucoes.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Evoluções não encontradas',
                    message: `Nenhuma evolução médica encontrada para o prontuário "${prontuario}"`
                });
            }

            // Aplicar limite se especificado
            const limitNum = parseInt(limite);
            const evolucoesFiltradas = limitNum > 0 ? evolucoes.slice(0, limitNum) : evolucoes;

            // Formatar resultado baseado no parâmetro formato
            let resultado = evolucoesFiltradas;
            
            if (formato === 'detalhado') {
                // Incluir análise clínica de cada evolução
                resultado = evolucoesFiltradas.map(evolucao => ({
                    ...evolucao,
                    analiseClinica: {
                        temHDA: evolucao.textoCompleto && evolucao.textoCompleto.includes('HDA'),
                        temDiagnostico: evolucao.textoCompleto && (
                            evolucao.textoCompleto.includes('DIAGNÓSTICO') || 
                            evolucao.textoCompleto.includes('HIPÓTESE')
                        ),
                        tamanhoTexto: evolucao.textoCompleto ? evolucao.textoCompleto.length : 0
                    }
                }));
            } else if (formato === 'resumido') {
                // Apenas informações essenciais
                resultado = evolucoesFiltradas.map(evolucao => ({
                    id: evolucao.id,
                    dataEvolucao: evolucao.dataEvolucao,
                    profissional: evolucao.profissional,
                    atividade: evolucao.atividade,
                    resumo: evolucao.textoCompleto ? 
                        evolucao.textoCompleto.substring(0, 200) + (evolucao.textoCompleto.length > 200 ? '...' : '') : 
                        null
                }));
            }

            res.json({
                success: true,
                prontuario: prontuario,
                data: resultado,
                total: evolucoes.length,
                exibindo: resultado.length,
                formato: formato,
                limite: limitNum > 0 ? limitNum : null
            });
        } catch (error) {
            console.error('Erro ao obter evoluções do paciente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter evoluções do paciente',
                message: error.message
            });
        }
    }

    // Obter análise clínica completa de um paciente
    async obterAnaliseClinica(req, res) {
        try {
            const { prontuario } = req.params;
            
            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            console.log(`Analisando clinicamente o paciente: ${prontuario}`);
            
            try {
                // Buscar dados básicos do paciente
                const cadastro = await crawler.getPacienteCadastro(prontuario);
                
                if (!cadastro) {
                    return res.status(404).json({
                        success: false,
                        error: 'Paciente não encontrado',
                        message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                    });
                }

                // Buscar evoluções
                const evolucoes = await crawler.getEvolucoes(prontuario);
                
                // Extrair dados clínicos da última evolução
                let dadosClinicosUltimaEvolucao = null;
                if (evolucoes && evolucoes.length > 0) {
                    try {
                        dadosClinicosUltimaEvolucao = await crawler.extrairDadosClinicosUltimaEvolucao(prontuario);
                    } catch (error) {
                        console.warn(`Erro ao extrair dados clínicos do paciente ${prontuario}:`, error.message);
                    }
                }

                // Montar análise completa
                const analise = {
                    pacienteId: prontuario,
                    cadastro: cadastro,
                    totalEvolucoesMedicas: evolucoes ? evolucoes.length : 0,
                    ultimaEvolucao: evolucoes && evolucoes.length > 0 ? evolucoes[0] : null,
                    dadosClinicosUltimaEvolucao: dadosClinicosUltimaEvolucao,
                    evolucoes: evolucoes || [],
                    timestamp: new Date().toISOString()
                };

                res.json({
                    success: true,
                    data: analise
                });
            } catch (error) {
                console.error('Erro específico na análise clínica:', error);
                
                // Retornar análise parcial mesmo com erro
                res.json({
                    success: false,
                    error: 'Análise parcial',
                    message: `Erro ao analisar paciente: ${error.message}`,
                    data: {
                        pacienteId: prontuario,
                        observacao: 'Análise não pôde ser completada',
                        erro: error.message,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao obter análise clínica:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter análise clínica',
                message: error.message
            });
        }
    }


    // Obter Exames de um paciente
    async obterExamesPaciente(req, res) {
        try {
            const { prontuario } = req.params;
            
            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            console.log(`Obtendo detalhes do paciente: ${prontuario}`);
            
            // Buscar cadastro do paciente
            const cadastro = await crawler.getPacienteCadastro(prontuario);
            
            if (!cadastro) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                });
            }
            // Buscar Exames
                const exames = await crawler.getExames(prontuario);
                

            res.json({
                success: true,
                data: {
                    prontuario: prontuario,
                    cadastro: cadastro,
                    exames: exames || [],
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Erro ao obter detalhes do paciente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter detalhes do paciente',
                message: error.message
            });
        }
    }


    // Buscar paciente por leito
    async buscarPacientePorLeito(req, res) {
        try {
            const { leito } = req.query;
            
            if (!leito) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O parâmetro "leito" é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            console.log(`Buscando paciente por leito: ${leito}`);
            const paciente = await crawler.buscarPacientePorLeito(leito);

            if (!paciente) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: `Nenhum paciente encontrado no leito "${leito}"`
                });
            }

            res.json({
                success: true,
                data: paciente,
                leito: leito
            });
        } catch (error) {
            console.error('Erro ao buscar paciente por leito:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar paciente por leito',
                message: error.message
            });
        }
    }
}

module.exports = new PacientesController();
