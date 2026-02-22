const { Paciente, Evolucao, Exame } = require('../models');
const cache = require('../utils/cache');
const sharedCrawler = require('../shared-crawler');

class PacientesController {
    initCrawler() {
        return sharedCrawler.getCrawler();
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
                const pacientesRaw = await crawler.getPacientesClinica(0, '', nome);
                console.log(pacientesRaw);

                if (!pacientesRaw || pacientesRaw.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Paciente não encontrado',
                        message: `Paciente com nome "${nome}" não foi encontrado`
                    });
                }

                const BATCH_SIZE = 5;
                const pacientes = [];
                for (let i = 0; i < pacientesRaw.length; i += BATCH_SIZE) {
                    const batch = pacientesRaw.slice(i, i + BATCH_SIZE);
                    const batchResults = await Promise.all(batch.map(async (p) => {
                        const pac = await crawler.getPacienteCadastro(p.prontuario);
                        const retorn = Paciente.fromParserData(pac, p.prontuario);
                        retorn.internacao.clinicaLeito = p.clinicaLeito;
                        return retorn;
                    }));
                    pacientes.push(...batchResults);
                }

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

            const cacheKey = cache.generateKey('cadastro', prontuario);

            const dadosCompletos = await cache.getOrSet(cacheKey, async () => {
                console.log(`Obtendo detalhes do paciente: ${prontuario}`);

                const cadastroRaw = await crawler.getPacienteCadastro(prontuario);

                if (!cadastroRaw) {
                    throw new Error(`CADASTRO_NAO_ENCONTRADO:Paciente com prontuário "${prontuario}" não foi encontrado`);
                }

                const paciente = Paciente.fromParserData(cadastroRaw, prontuario);

                if (!paciente || !paciente.isValid()) {
                    throw new Error(`CADASTRO_INVALIDO:Os dados do paciente não puderam ser processados corretamente`);
                }

                return paciente.toCompleto();
            });

            res.json({
                success: true,
                data: dadosCompletos
            });
        } catch (error) {
            if (error.message.startsWith('CADASTRO_NAO_ENCONTRADO:')) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: error.message.replace('CADASTRO_NAO_ENCONTRADO:', '')
                });
            }

            if (error.message.startsWith('CADASTRO_INVALIDO:')) {
                return res.status(422).json({
                    success: false,
                    error: 'Dados inválidos',
                    message: error.message.replace('CADASTRO_INVALIDO:', '')
                });
            }

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
            const { limite = 1000, formato = 'detalhado' } = req.query;

            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }

            const crawler = await this.initCrawler();

            // Gerar chave do cache
            const cacheKey = cache.generateKey('evolucoes', prontuario, { limite, formato });

            // Tentar buscar no cache primeiro
            const resultadoCache = await cache.getOrSet(cacheKey, async () => {
                console.log(`Obtendo evoluções do paciente: ${prontuario}`);

                // Buscar evoluções do paciente
                const evolucoesRaw = await crawler.getEvolucoes(prontuario);


                if (!evolucoesRaw || evolucoesRaw.length === 0) {
                    throw new Error(`Nenhuma evolução médica encontrada para o prontuário "${prontuario}"`);
                }

                // Converter para o modelo Evolucao
                const evolucoes = evolucoesRaw
                    .map(evolucaoRaw => Evolucao.fromParserData(evolucaoRaw));
                //   .filter(evolucao => evolucao && evolucao.isValid());

                if (evolucoes.length === 0) {
                    throw new Error('As evoluções encontradas não puderam ser processadas corretamente');
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

                return {
                    data: resultado,
                    total: evolucoesRaw.length,
                    exibindo: resultado.length,
                    resumoGeral: {
                        medicamentosUnicos: Evolucao.extrairMedicamentosUnicos(evolucoes),
                        diagnosticosUnicos: Evolucao.extrairDiagnosticosUnicos(evolucoes)
                    }
                };
            });

            res.json({
                success: true,
                prontuario: prontuario,
                data: resultadoCache.data,
                total: resultadoCache.total,
                exibindo: resultadoCache.exibindo,
                formato: formato,
                limite: parseInt(limite) > 0 ? parseInt(limite) : null,
                resumoGeral: resultadoCache.resumoGeral
            });
        } catch (error) {
            console.error('Erro ao obter evoluções do paciente:', error);

            if (error.message.includes('encontrada') || error.message.includes('processadas')) {
                return res.status(404).json({
                    success: false,
                    error: 'Evoluções não encontradas',
                    message: error.message
                });
            }

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

            const cacheKey = cache.generateKey('analise', prontuario);

            const analise = await cache.getOrSet(cacheKey, async () => {
                console.log(`Analisando clinicamente o paciente: ${prontuario}`);

                // Buscar cadastro, evoluções e exames em paralelo (são independentes entre si)
                const [cadastroRaw, evolucoesRaw, examesRaw] = await Promise.all([
                    crawler.getPacienteCadastro(prontuario),
                    crawler.getEvolucoes(prontuario),
                    crawler.getExames(prontuario).catch(err => {
                        console.warn(`Erro ao buscar exames: ${err.message}`);
                        return [];
                    })
                ]);

                if (!cadastroRaw) {
                    throw new Error(`ANALISE_NAO_ENCONTRADA:Paciente com prontuário "${prontuario}" não foi encontrado`);
                }

                const paciente = Paciente.fromParserData(cadastroRaw, prontuario);

                const evolucoes = evolucoesRaw ?
                    evolucoesRaw
                        .map(evolucaoRaw => Evolucao.fromParserData(evolucaoRaw))
                        .filter(evolucao => evolucao && evolucao.isValid()) :
                    [];

                let exames = [];
                if (examesRaw && examesRaw.length > 0) {
                    exames = examesRaw
                        .map(exameRaw => Exame.fromParserData(exameRaw))
                        .filter(exame => exame && exame.isValid());
                }

                // Reutilizar evoluções já buscadas — evita segunda requisição ao HICD
                let dadosClinicosUltimaEvolucao = null;
                if (evolucoesRaw && evolucoesRaw.length > 0) {
                    try {
                        dadosClinicosUltimaEvolucao = await crawler.clinicalExtractor
                            .extrairDadosClinicosUltimaEvolucao(evolucoesRaw);
                    } catch (err) {
                        console.warn(`Erro ao extrair dados clínicos do paciente ${prontuario}:`, err.message);
                    }
                }

                return {
                    paciente: paciente ? paciente.toCompleto() : null,
                    evolucoes: {
                        total: evolucoes.length,
                        dados: evolucoes.map(evolucao => evolucao.toDadosClinicos()),
                        ultimaEvolucao: evolucoes.length > 0 ? evolucoes[0].toCompleto() : null,
                        dadosClinicosUltimaEvolucao: dadosClinicosUltimaEvolucao || null,
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
            });

            res.json({ success: true, data: analise });
        } catch (error) {
            if (error.message.startsWith('ANALISE_NAO_ENCONTRADA:')) {
                return res.status(404).json({
                    success: false,
                    error: 'Paciente não encontrado',
                    message: error.message.replace('ANALISE_NAO_ENCONTRADA:', '')
                });
            }

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
            const { formato = 'detalhado', incluirResultados = 'true' } = req.query;

            if (!prontuario) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O prontuário é obrigatório'
                });
            }


            console.log(`Obtendo exames do paciente: ${prontuario}`);

           const crawler = await this.initCrawler();


            // Gerar chave do cache
            const cacheKey = cache.generateKey('exames', prontuario, { formato, incluirResultados });

            // Tentar buscar no cache primeiro
            const resultadoCache = await cache.getOrSet(cacheKey, async () => {
                console.log(`Obtendo exames do paciente: ${prontuario}`);

                // Buscar exames básicos
                   const examesRaw = await crawler.getExames(prontuario);
                

                if (!examesRaw || examesRaw.length === 0) {
                    throw new Error(`EXAMES_NAO_ENCONTRADOS:Nenhum exame encontrado para o prontuário "${prontuario}"`);
                }

                // Converter para o modelo Exame
                let exames = examesRaw
                    .map(exameRaw => Exame.fromParserData(exameRaw));

                if (exames.length === 0) {
                    throw new Error(`EXAMES_INVALIDOS:Os exames encontrados não puderam ser processados corretamente`);
                }

                // Se solicitado, buscar resultados completos
                if (incluirResultados === 'true') {
                    try {
                        console.log(`Buscando resultados completos dos exames para paciente: ${prontuario}`);
                        const resultadosCompletos = await crawler.evolutionService.getResultadosExames(prontuario, {}, examesRaw);

                        if (resultadosCompletos && resultadosCompletos.length > 0) {
                            // Atualizar exames com resultados
                            exames = resultadosCompletos.map(resultado =>
                                Exame.fromResultadosCompletos(resultado)
                            )
                            //.filter(exame => exame && exame.isValid());
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
                return {
                    data: resultado,
                    estatisticas: estatisticas
                };

            });

            res.json({
                success: true,
                prontuario: prontuario,
                data: resultadoCache.data,
                formato: formato,
                incluirResultados: incluirResultados === 'true',
                estatisticas: resultadoCache.estatisticas
            });
        } catch (error) {
            console.error('Erro ao obter exames do paciente:', error);

            if (error.message.startsWith('EXAMES_NAO_ENCONTRADOS:')) {
                return res.status(404).json({
                    success: false,
                    error: 'Exames não encontrados',
                    message: error.message.replace('EXAMES_NAO_ENCONTRADOS:', '')
                });
            }

            if (error.message.startsWith('EXAMES_INVALIDOS:')) {
                return res.status(422).json({
                    success: false,
                    error: 'Dados inválidos',
                    message: error.message.replace('EXAMES_INVALIDOS:', '')
                });
            }

            res.status(500).json({
                success: false,
                error: 'Erro ao obter exames do paciente',
                message: error.message
            });
        }
    }

    async obterPrescricaoPaciente(req, res) {
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

            const cacheKey = cache.generateKey('prescricoes', prontuario);

            const prescricoes = await cache.getOrSet(cacheKey, async () => {
                console.log(`Obtendo prescrição do paciente: ${prontuario}`);

                const dados = await crawler.getPrescricoesPaciente(prontuario);

                if (!dados || dados.length === 0) {
                    throw new Error(`PRESCRICOES_NAO_ENCONTRADAS:Nenhuma prescrição encontrada para o prontuário "${prontuario}"`);
                }

                return dados;
            });

            res.json({
                success: true,
                prontuario: prontuario,
                data: prescricoes,
            });
        } catch (error) {
            if (error.message.startsWith('PRESCRICOES_NAO_ENCONTRADAS:')) {
                return res.status(404).json({
                    success: false,
                    error: 'Prescrições não encontradas',
                    message: error.message.replace('PRESCRICOES_NAO_ENCONTRADAS:', '')
                });
            }

            console.error('Erro ao obter prescrições do paciente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter prescrições do paciente',
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
