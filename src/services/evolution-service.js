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

            const evolucaoData = new URLSearchParams({
                'Param': 'REGE',
                'ParamModule': 'Evo',
                'IdPac': pacienteId,
                'cpf': filtros.cpf || '74413201272',
                'filtro': filtros.filtro || '',
                'tipoBusca': 'PRONT'
            });

            const response = await this.httpClient.post(urls.login, evolucaoData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            console.log(`[EVOLUCOES] Resposta recebida - tamanho: ${response.data.length} caracteres`);
            const evolucoes = this.parser.parseEvolucoes(response.data, pacienteId);

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

            console.log(`[RESULTADOS] ${urls.length} URLs de impressão geradas. Buscando resultados em paralelo...`);

            const BATCH_SIZE = 3;
            const DELAY_ENTRE_BATCHES_MS = 300;
            const resultadosCompletos = [];

            // Processar em batches para paralelizar sem sobrecarregar o servidor
            for (let i = 0; i < urls.length; i += BATCH_SIZE) {
                const batch = urls.slice(i, i + BATCH_SIZE);

                const batchResults = await Promise.all(batch.map(async (urlInfo, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    try {
                        console.log(`[RESULTADOS] Processando ${globalIndex + 1}/${urls.length} - Requisição: ${urlInfo.requisicao}`);

                        const response = await this.httpClient.get(urlInfo.url, {
                            headers: {
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.5,en-US;q=0.3',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0'
                            }
                        });

                        const resultados = this.parser.parseResultadosExames(response.data, urlInfo.requisicao);

                        if (resultados.length > 0) {
                            console.log(`[RESULTADOS] ✅ ${resultados.length} resultados extraídos da requisição ${urlInfo.requisicao}`);
                            return {
                                ...urlInfo,
                                resultados,
                                totalResultados: resultados.length,
                                dataProcessamento: new Date().toISOString()
                            };
                        }

                        console.log(`[RESULTADOS] ⚠️ Nenhum resultado na requisição ${urlInfo.requisicao}`);
                        return null;

                    } catch (error) {
                        console.error(`[RESULTADOS] Erro ao processar requisição ${urlInfo.requisicao}:`, error.message);
                        return null;
                    }
                }));

                resultadosCompletos.push(...batchResults.filter(Boolean));

                // Delay apenas entre batches, não entre cada requisição individual
                if (i + BATCH_SIZE < urls.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_BATCHES_MS));
                }
            }

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
