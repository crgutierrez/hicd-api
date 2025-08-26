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
                'tipoBusca':  'PRONT'
            });
 
            const response = await this.httpClient.post(urls.login, evolucaoData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

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
}

module.exports = EvolutionService;
