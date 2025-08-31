const HICDCrawler = require('../../hicd-crawler-refactored');
const { Paciente, Evolucao, Exame } = require('../models');

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
            const { prontuario, nome } = req.query;

            console.log(`Buscando paciente por prontuário: ${prontuario} / ${nome}`);
            if (!prontuario && !nome) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O parâmetro "prontuario ou nome" é obrigatório'
                });
            }

            const crawler = await this.initCrawler();

            console.log(`Buscando paciente por prontuário: ${prontuario} / ${nome}`);

            // Buscar cadastro do paciente (que funciona como busca por prontuário)
            if (prontuario) {
                const cadastroRaw = await crawler.getPacienteCadastro(prontuario);

                if (!cadastroRaw) {
                    return res.status(404).json({
                        success: false,
                        error: 'Paciente não encontrado',
                        message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                    });
                }

                // Converter para o modelo Paciente
                const paciente = Paciente.fromParserData(cadastroRaw, prontuario);

                if (!paciente || !paciente.isValid()) {
                    return res.status(422).json({
                        success: false,
                        error: 'Dados inválidos',
                        message: 'Os dados do paciente não puderam ser processados corretamente'
                    });
                }

                res.json({
                    success: true,
                    data: paciente.toCompleto(),
                    searchTerm: prontuario
                });
            } else {
                const pacientesRaw = await crawler.getPacientesClinica(0,'',nome);
                console.log(pacientesRaw);

                if (!pacientesRaw || pacientesRaw.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Paciente não encontrado',
                        message: `Paciente com nome "${nome}" não foi encontrado`
                    });
                }

              const pacientes = await Promise.all(pacientesRaw.map(async (p) => {
                const pac = await crawler.getPacienteCadastro(p.prontuario);
                const retorn =  Paciente.fromParserData(pac, p.prontuario);
                retorn.internacao.clinicaLeito = p.clinicaLeito
                return retorn;
              }));

                res.json({
                    success: true,
                    data: pacientes,
                    searchTerm: nome
                });
            }
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
            const cadastroRaw = await crawler.getPacienteCadastro(prontuario);

            if (!cadastroRaw) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                });
            }

            // Converter para o modelo Paciente
            const paciente = Paciente.fromParserData(cadastroRaw, prontuario);

            if (!paciente || !paciente.isValid()) {
                return res.status(422).json({
                    success: false,
                    error: 'Dados inválidos',
                    message: 'Os dados do paciente não puderam ser processados corretamente'
                });
            }

            res.json({
                success: true,
                data: paciente.toCompleto()
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
            const evolucoesRaw = await crawler.getEvolucoes(prontuario);

            if (!evolucoesRaw || evolucoesRaw.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Evoluções não encontradas',
                    message: `Nenhuma evolução médica encontrada para o prontuário "${prontuario}"`
                });
            }

            // Converter para o modelo Evolucao
            const evolucoes = evolucoesRaw
                .map(evolucaoRaw => Evolucao.fromParserData(evolucaoRaw))
                .filter(evolucao => evolucao && evolucao.isValid());

            if (evolucoes.length === 0) {
                return res.status(422).json({
                    success: false,
                    error: 'Dados inválidos',
                    message: 'As evoluções encontradas não puderam ser processadas corretamente'
                });
            }

            // Aplicar limite se especificado
            const limitNum = parseInt(limite);
            const evolucoesFiltradas = limitNum > 0 ? evolucoes.slice(0, limitNum) : evolucoes;

            // Formatar resultado baseado no parâmetro formato
            let resultado;

            if (formato === 'detalhado') {
                resultado = evolucoesFiltradas.map(evolucao => evolucao.toCompleto());
            } else if (formato === 'clinico') {
                resultado = evolucoesFiltradas.map(evolucao => evolucao.toDadosClinicos());
            } else {
                // formato === 'resumido' (padrão)
                resultado = evolucoesFiltradas.map(evolucao => evolucao.toResumo());
            }

            res.json({
                success: true,
                prontuario: prontuario,
                data: resultado,
                total: evolucoesRaw.length,
                exibindo: resultado.length,
                formato: formato,
                limite: limitNum > 0 ? limitNum : null,
                resumoGeral: {
                    medicamentosUnicos: Evolucao.extrairMedicamentosUnicos(evolucoes),
                    diagnosticosUnicos: Evolucao.extrairDiagnosticosUnicos(evolucoes)
                }
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
                const cadastroRaw = await crawler.getPacienteCadastro(prontuario);

                if (!cadastroRaw) {
                    return res.status(404).json({
                        success: false,
                        error: 'Paciente não encontrado',
                        message: `Paciente com prontuário "${prontuario}" não foi encontrado`
                    });
                }

                const paciente = Paciente.fromParserData(cadastroRaw, prontuario);

                // Buscar evoluções
                const evolucoesRaw = await crawler.getEvolucoes(prontuario);
                const evolucoes = evolucoesRaw ?
                    evolucoesRaw
                        .map(evolucaoRaw => Evolucao.fromParserData(evolucaoRaw))
                        .filter(evolucao => evolucao && evolucao.isValid()) :
                    [];

                // Buscar exames
                let exames = [];
                try {
                    const examesRaw = await crawler.getExames(prontuario);
                    if (examesRaw && examesRaw.length > 0) {
                        exames = examesRaw
                            .map(exameRaw => Exame.fromParserData(exameRaw))
                            .filter(exame => exame && exame.isValid());
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar exames: ${error.message}`);
                }

                // Extrair dados clínicos da última evolução
                let dadosClinicosUltimaEvolucao = null;
                if (evolucoes && evolucoes.length > 0) {
                    try {
                        const ultimaEvolucaoRaw = await crawler.extrairDadosClinicosUltimaEvolucao(prontuario);
                        if (ultimaEvolucaoRaw) {
                            dadosClinicosUltimaEvolucao = Evolucao.fromParserData(ultimaEvolucaoRaw);
                        }
                    } catch (error) {
                        console.warn(`Erro ao extrair dados clínicos do paciente ${prontuario}:`, error.message);
                    }
                }

                // Montar análise completa estruturada
                const analise = {
                    paciente: paciente ? paciente.toCompleto() : null,
                    evolucoes: {
                        total: evolucoes.length,
                        dados: evolucoes.map(evolucao => evolucao.toDadosClinicos()),
                        ultimaEvolucao: evolucoes.length > 0 ? evolucoes[0].toCompleto() : null,
                        dadosClinicosUltimaEvolucao: dadosClinicosUltimaEvolucao ?
                            dadosClinicosUltimaEvolucao.toDadosClinicos() : null,
                        resumoMedicamentos: Evolucao.extrairMedicamentosUnicos(evolucoes),
                        resumoDiagnosticos: Evolucao.extrairDiagnosticosUnicos(evolucoes)
                    },
                    exames: {
                        total: exames.length,
                        dados: exames.map(exame => exame.toResumo()),
                        agrupamentoPorTipo: Exame.agruparPorTipo(exames)
                    },
                    metadata: {
                        dataAnalise: new Date().toISOString(),
                        fonte: 'HICD',
                        versao: '1.0'
                    }
                };

                res.json({
                    success: true,
                    data: analise
                });
            } catch (error) {
                console.error('Erro específico na análise clínica:', error);

                // Retornar análise parcial mesmo com erro
                res.status(206).json({
                    success: false,
                    error: 'Análise parcial',
                    message: `Erro ao analisar paciente: ${error.message}`,
                    data: {
                        pacienteId: prontuario,
                        observacao: 'Análise não pôde ser completada',
                        erro: error.message,
                        metadata: {
                            dataAnalise: new Date().toISOString(),
                            fonte: 'HICD',
                            status: 'parcial'
                        }
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
            const { formato = 'resumido', incluirResultados = 'true' } = req.query;

            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }

            const crawler = await this.initCrawler();

            console.log(`Obtendo exames do paciente: ${prontuario}`);

            // Buscar exames básicos
            const examesRaw = await crawler.getExames(prontuario);

            if (!examesRaw || examesRaw.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Exames não encontrados',
                    message: `Nenhum exame encontrado para o prontuário "${prontuario}"`
                });
            }

            // Converter para o modelo Exame
            let exames = examesRaw
                .map(exameRaw => Exame.fromParserData(exameRaw))
                .filter(exame => exame && exame.isValid());

            if (exames.length === 0) {
                return res.status(422).json({
                    success: false,
                    error: 'Dados inválidos',
                    message: 'Os exames encontrados não puderam ser processados corretamente'
                });
            }

            // Se solicitado, buscar resultados completos
            if (incluirResultados === 'true') {
                try {
                    console.log(`Buscando resultados completos dos exames para paciente: ${prontuario}`);
                    const resultadosCompletos = await crawler.evolutionService.getResultadosExames(prontuario);

                    if (resultadosCompletos && resultadosCompletos.length > 0) {
                        // Atualizar exames com resultados
                        exames = resultadosCompletos.map(resultado =>
                            Exame.fromResultadosCompletos(resultado)
                        ).filter(exame => exame && exame.isValid());
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar resultados completos: ${error.message}`);
                    // Continuar com exames básicos mesmo se os resultados falharem
                }
            }

            // Formatar resultado baseado no parâmetro formato
            let resultado;
            let estatisticas = {};

            if (formato === 'resultados' && incluirResultados === 'true') {
                resultado = exames.map(exame => exame.toResultados());
                estatisticas = {
                    totalExames: exames.length,
                    examesComResultados: exames.filter(e => e.status.temResultados).length,
                    totalResultados: exames.reduce((sum, e) => sum + e.metadata.totalResultados, 0),
                    siglasUnicas: [...new Set(exames.flatMap(e => e.obterSiglasResultados()))],
                    agrupamentoPorTipo: Exame.agruparPorTipo(exames)
                };
            } else if (formato === 'detalhado') {
                resultado = exames.map(exame => exame.toCompleto());
                estatisticas = {
                    totalExames: exames.length,
                    examesComResultados: exames.filter(e => e.status.temResultados).length
                };
            } else {
                // formato === 'resumido' (padrão)
                resultado = exames.map(exame => exame.toResumo());
                estatisticas = {
                    totalExames: exames.length,
                    examesComResultados: exames.filter(e => e.status.temResultados).length
                };
            }

            res.json({
                success: true,
                prontuario: prontuario,
                data: resultado,
                formato: formato,
                incluirResultados: incluirResultados === 'true',
                estatisticas: estatisticas
            });
        } catch (error) {
            console.error('Erro ao obter exames do paciente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter exames do paciente',
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
            const pacienteRaw = await crawler.buscarPacientePorLeito(leito);

            if (!pacienteRaw) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: `Nenhum paciente encontrado no leito "${leito}"`
                });
            }

            // Converter para o modelo Paciente
            const paciente = Paciente.fromListData(pacienteRaw);

            if (!paciente || !paciente.isValid()) {
                return res.status(422).json({
                    success: false,
                    error: 'Dados inválidos',
                    message: 'Os dados do paciente não puderam ser processados corretamente'
                });
            }

            res.json({
                success: true,
                data: paciente.toResumo(),
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
