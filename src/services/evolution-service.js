/**
 * Serviço para buscar e gerenciar evoluções médicas
 */
class EvolutionService {
    constructor(httpClient, parser) {
        this.httpClient = httpClient;
        this.parser = parser;
    }

    /**
     * Busca informações de cadastro do paciente
     */
    async getPacienteCadastro(pacienteId, tipoBusca = 'PRONT') {
        try {
            const urls = this.httpClient.getUrls();

            const cadastroData = new URLSearchParams({
                'Param': 'REGE',
                'ParamModule': 'CONSPAC_OPEN',
                'TIPOBUSCA': tipoBusca,
                'PACIENTE': pacienteId
            });
            console.log(`📋 Buscando cadastro do paciente ${pacienteId}...`);
            console.log('Params:', cadastroData.toString());

            const response = await this.httpClient.post(urls.login, cadastroData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            return this.parser.parsePacienteCadastro(response.data, pacienteId);

        } catch (error) {
            console.error(`[CADASTRO] Erro ao buscar cadastro do paciente ${pacienteId}:`, error.message);
            return null;
        }
    }

    /**
     * Busca evoluções de internação do paciente
     */
    async getEvolucoes(pacienteId, filtros = {}) {
        try {
            console.log(`📋 Buscando evoluções do paciente ${pacienteId}...`);

            const urls = this.httpClient.getUrls();

            // O HICD expõe dois módulos para o mesmo histórico:
            //   Evo      → trunca em exatamente 400 evoluções (teto do controller.php)
            //   Evolucao → devolve o histórico completo
            // Usamos Evolucao e só caímos no Evo se ele não render nada.
            const buscar = async (paramModule) => {
                const evolucaoData = new URLSearchParams({
                    'Param': 'REGE',
                    'ParamModule': paramModule,
                    'IdPac': pacienteId,
                    'cpf': filtros.cpf || '74413201272',
                    'filtro': filtros.filtro || '',
                    'tipoBusca': 'PRONT',
                    // O módulo Evolucao lê TIPOBUSCA em maiúsculo (é o que o
                    // getRegeMenu do front-end do HICD envia); sem isso devolve vazio.
                    'TIPOBUSCA': 'PRONT'
                });

                const response = await this.httpClient.post(urls.login, evolucaoData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                console.log(`[EVOLUCOES] Resposta de ${paramModule} - tamanho: ${response.data.length} caracteres`);
                return this.parser.parseEvolucoes(response.data, pacienteId);
            };

            let evolucoes = await buscar('Evolucao');

            if (!evolucoes || evolucoes.length === 0) {
                console.log(`[EVOLUCOES] Módulo Evolucao não retornou registros; tentando Evo...`);
                evolucoes = await buscar('Evo');
            }

            // Remover duplicatas e mesclar evoluções similares
            // const evolucoesUnicas = this.removerDuplicatasEvolucoes(evolucoes);

            // //console.log(`✅ ${evolucoesUnicas.length} evoluções únicas extraídas para o paciente ${pacienteId}`);
            // if (evolucoes.length > evolucoesUnicas.length) {
            //     console.log(`[EVOLUCOES] Removidas ${evolucoesUnicas.length - evolucoes.length} duplicações`);
            // }

            return evolucoes;

        } catch (error) {
            console.error(`[EVOLUCOES] Erro ao buscar evoluções do paciente ${pacienteId}:`, error.message);
            return [];
        }
    }

    /**
     * Remove duplicatas de evoluções e mescla conteúdos similares
     */
    removerDuplicatasEvolucoes(evolucoes) {
        if (!evolucoes || evolucoes.length === 0) {
            return [];
        }

        const evolucoesUnicas = [];
        const chavesMapeadas = new Set();

        for (const evolucao of evolucoes) {
            // Criar chave única baseada em data, profissional e primeiras palavras do conteúdo
            const conteudoChave = evolucao.conteudo ?
                evolucao.conteudo.substring(0, 100).replace(/\s+/g, ' ').trim() : '';
            const chave = `${evolucao.data}_${evolucao.profissional}_${conteudoChave}`;

            if (!chavesMapeadas.has(chave)) {
                chavesMapeadas.add(chave);
                evolucoesUnicas.push(evolucao);

                if (evolucao.id) {
                    console.log(`[EVOLUCOES] Dados mesclados para evolução ID ${evolucao.id}`);
                }
            }
        }

        return evolucoesUnicas;
    }

    /**
     * Escolhe o melhor conteúdo entre duas opções durante mesclagem
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
     * Busca exames laboratoriais do paciente
     */
    async getExames(pacienteId, filtros = {}) {
        try {
            console.log(`🧪 Buscando exames do paciente ${pacienteId}...`);

            const urls = this.httpClient.getUrls();

            console.log(urls)

            const exameData = new URLSearchParams({
                'Param': 'REGE',
                'ParamModule': 'Exames',
                'IdPac': pacienteId,
                'Filtro': filtros.filtro || '',
                'edit': '',
                'param': '',
                'mEvo': 'undefined',
                'filter': 'undefined',
                'cpf': filtros.cpf || '74413201272',
                'filtroTipo': 'undefined',
                'TIPOBUSCA': 'PRONT'
            });

            console.log(`[EXAMES] Parâmetros da busca: ${exameData.toString()}`);

            const response = await this.httpClient.post(urls.login, exameData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            console.log(response.data)

            console.log(`[EXAMES] Resposta recebida - tamanho: ${response.data.length} caracteres`);
            console.log(this.parser);
            const exames = this.parser.parseExames(response.data, pacienteId);


            console.log(`✅ ${exames.length} requisições de exames encontradas para o paciente ${pacienteId}`);

            // Log detalhado dos primeiros exames encontrados
            if (exames.length > 0) {
                console.log(`[EXAMES] Primeiras requisições encontradas:`);
                exames.slice(0, 3).forEach((exame, index) => {
                    console.log(`  ${index + 1}. Requisição: ${exame.requisicao} - Data: ${exame.data} ${exame.hora} - Médico: ${exame.medico} - ${exame.exames.length} exames`);
                });
            }

            return exames;

        } catch (error) {
            console.error(`[EXAMES] Erro ao buscar exames do paciente ${pacienteId}:`, error.message);
            return [];
        }
    }

    /**
     * Busca resultados completos dos exames do paciente.
     * @param {string} pacienteId
     * @param {object} filtros
     * @param {Array|null} examesPreCarregados - lista já buscada pelo caller para evitar dupla requisição
     */
    async getResultadosExames(pacienteId, filtros = {}, examesPreCarregados = null) {
        try {
            console.log(`🔬 Buscando resultados completos dos exames do paciente ${pacienteId}...`);

            // Reutilizar lista já buscada pelo caller quando disponível, evitando requisição duplicada
            const exames = examesPreCarregados ?? await this.getExames(pacienteId, filtros);

            if (exames.length === 0) {
                console.log(`[RESULTADOS] Nenhum exame encontrado para o paciente ${pacienteId}`);
                return [];
            }

            // Gerar URLs de impressão para os exames
            const urls = this.parser.gerarUrlsImpressao(exames, pacienteId, 'PRONT');

            if (urls.length === 0) {
                console.log(`[RESULTADOS] Nenhuma URL de impressão gerada para o paciente ${pacienteId}`);
                return [];
            }

            const CONCURRENCIA = parseInt(process.env.EXAM_BATCH_SIZE) || 5;
            const STAGGER_MS = parseInt(process.env.EXAM_BATCH_DELAY_MS) || 100;
            const REQUEST_TIMEOUT_MS = parseInt(process.env.EXAM_REQUEST_TIMEOUT_MS) || 15000;

            console.log(`[RESULTADOS] ${urls.length} URLs — pool de ${CONCURRENCIA} conexões, stagger ${STAGGER_MS}ms`);

            const resultadosCompletos = [];

            // Busca+parse de UMA requisição de exame. Retorna o objeto de
            // resultado ou null (sem laudos / aguardando).
            const processarUrl = async (urlInfo, globalIndex) => {
                console.log(`[RESULTADOS] Processando ${globalIndex + 1}/${urls.length} - Requisição: ${urlInfo.requisicao}`);

                const response = await this.httpClient.get(urlInfo.url, {
                    timeout: REQUEST_TIMEOUT_MS,
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5,en-US;q=0.3',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0'
                    }
                });

                const resultados = this.parser.parseResultadosExames(response.data, urlInfo.requisicao);

                if (!resultados.length) {
                    console.log(`[RESULTADOS] ⚠️ Nenhum resultado na requisição ${urlInfo.requisicao}`);
                    return null;
                }

                console.log(`[RESULTADOS] ✅ ${resultados.length} resultados extraídos da requisição ${urlInfo.requisicao}`);
                return {
                    ...urlInfo,
                    resultados,
                    totalResultados: resultados.length,
                    dataProcessamento: new Date().toISOString()
                };
            };

            // Pool deslizante: em vez de batches com barreira (onde a request mais
            // lenta do lote ociosa os demais slots), mantém sempre CONCURRENCIA
            // requisições em voo — cada worker puxa o próximo índice ao terminar.
            let cursor = 0;
            const worker = async () => {
                while (true) {
                    const index = cursor++;
                    if (index >= urls.length) break;

                    // Stagger só no arranque: espalha a rajada inicial sem
                    // penalizar o restante do processamento.
                    if (STAGGER_MS > 0 && index < CONCURRENCIA && index > 0) {
                        await new Promise(resolve => setTimeout(resolve, STAGGER_MS * index));
                    }

                    try {
                        const value = await processarUrl(urls[index], index);
                        if (value !== null) resultadosCompletos.push(value);
                    } catch (err) {
                        console.error(`[RESULTADOS] Falha na requisição ${urls[index]?.requisicao}:`, err?.message);
                    }
                }
            };

            await Promise.all(
                Array.from({ length: Math.min(CONCURRENCIA, urls.length) }, () => worker())
            );

            const totalResultados = resultadosCompletos.reduce((sum, exame) => sum + exame.totalResultados, 0);
            console.log(`[RESULTADOS] ✅ Concluído: ${resultadosCompletos.length} requisições com ${totalResultados} resultados`);

            return resultadosCompletos;

        } catch (error) {
            console.error(`[RESULTADOS] Erro ao buscar resultados dos exames do paciente ${pacienteId}:`, error.message);
            return [];
        }
    }
}

module.exports = EvolutionService;
