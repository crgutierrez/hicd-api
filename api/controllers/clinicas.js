const HICDCrawler = require('../../hicd-crawler-refactored');
const { Paciente } = require('../models');

class ClinicasController {
    constructor() {
        this.crawler = null;
        this.clinicasCache = null;
        this.cacheTimeout = 10 * 60 * 1000; // 5 minutos
        this.lastCacheUpdate = null;
    }

    // Inicializar o crawler (lazy loading)
    async initCrawler() {
        if (!this.crawler) {
            this.crawler = new HICDCrawler();
            await this.crawler.login();
        }
        return this.crawler;
    }

    // Verificar se o cache é válido
    isCacheValid() {
        return this.clinicasCache && 
               this.lastCacheUpdate && 
               (Date.now() - this.lastCacheUpdate) < this.cacheTimeout;
    }

    // Atualizar cache de clínicas
    async updateClinicasCache() {
        try {
            const crawler = await this.initCrawler();
            const clinicas = await crawler.getClinicas();
            
            this.clinicasCache = clinicas.map(clinica => ({
                id: clinica.id || clinica.codigo,
                nome: clinica.nome,
                codigo: clinica.codigo,
                totalPacientes: 0 // Será atualizado quando necessário
            }));
            
            this.lastCacheUpdate = Date.now();
            return this.clinicasCache;
        } catch (error) {
            console.error('Erro ao atualizar cache de clínicas:', error);
            throw error;
        }
    }

    // Listar todas as clínicas
    async listarClinicas(req, res) {
        try {
            let clinicas;
            
            if (this.isCacheValid()) {
                clinicas = this.clinicasCache;
            } else {
                clinicas = await this.updateClinicasCache();
            }

            res.json({
                success: true,
                data: clinicas,
                total: clinicas.length,
                cache: {
                    lastUpdate: new Date(this.lastCacheUpdate).toISOString(),
                    nextUpdate: new Date(this.lastCacheUpdate + this.cacheTimeout).toISOString()
                }
            });
        } catch (error) {
            console.error('Erro ao listar clínicas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar clínicas',
                message: error.message
            });
        }
    }

    // Buscar clínicas por nome
    async buscarClinicas(req, res) {
        try {
            const { nome } = req.query;
            
            if (!nome) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O parâmetro "nome" é obrigatório'
                });
            }

            let clinicas;
            
            if (this.isCacheValid()) {
                clinicas = this.clinicasCache;
            } else {
                clinicas = await this.updateClinicasCache();
            }

            // Filtrar clínicas pelo nome
            const termoBusca = nome.toLowerCase();
            const clinicasEncontradas = clinicas.filter(clinica => 
                clinica.nome.toLowerCase().includes(termoBusca)
            );

            res.json({
                success: true,
                data: clinicasEncontradas,
                total: clinicasEncontradas.length,
                searchTerm: nome,
                totalClinicas: clinicas.length
            });
        } catch (error) {
            console.error('Erro ao buscar clínicas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar clínicas',
                message: error.message
            });
        }
    }

    // Listar pacientes de uma clínica
    async listarPacientesClinica(req, res) {
        try {
            const { id } = req.params;
            const { formato = 'resumido' } = req.query;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O ID da clínica é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            // Buscar clínica para verificar se existe
            let clinicas;
            if (this.isCacheValid()) {
                clinicas = this.clinicasCache;
            } else {
                clinicas = await this.updateClinicasCache();
            }

            const clinica = clinicas.find(c => c.id === id || c.codigo === id || c.nome === id);
            
            if (!clinica) {
                return res.status(404).json({
                    success: false,
                    error: 'Clínica não encontrada',
                    message: `Clínica com ID "${id}" não foi encontrada`
                });
            }

            // Buscar pacientes da clínica
            console.log(`\n🏥 Listando pacientes da clínica: ${clinica.id}`);
            console.log(`Buscando pacientes da clínica: ${clinica.nome}`);
            const pacientesData = await crawler.getPacientesClinica(id);

            // Converter para objetos Paciente
            const pacientes = [];
            for (const pacienteData of pacientesData) {
                try {
                    let paciente;
                    
                    if (formato === 'resumido') {
                        // Para formato resumido, usar apenas dados da lista
                        paciente = Paciente.fromListData(pacienteData);
                    } else {
                        // Para formato completo/detalhado, buscar dados completos
                        const dadosCompletos = await crawler.getPacienteCadastro(pacienteData.prontuario);
                        paciente = Paciente.fromParserData(dadosCompletos);
                    }
                    
                    pacientes.push(paciente);
                } catch (error) {
                    console.warn(`Erro ao processar paciente ${pacienteData.prontuario}:`, error.message);
                    // Criar objeto com dados básicos em caso de erro
                    pacientes.push({
                        prontuario: pacienteData.prontuario,
                        nome: pacienteData.nome || 'N/A',
                        erro: `Erro ao processar: ${error.message}`
                    });
                }
            }

            // Aplicar formato de saída
            let dadosFormatados;
            switch (formato) {
                case 'completo':
                    dadosFormatados = pacientes.map(p => p.toCompleto ? p.toCompleto() : p);
                    break;
                case 'detalhado':
                    dadosFormatados = pacientes.map(p => p.toDetalhado ? p.toDetalhado() : p);
                    break;
                default: // resumido
                    dadosFormatados = pacientes.map(p => p.toResumo ? p.toResumo() : p);
            }

            res.json({
                success: true,
                clinica: {
                    id: clinica.id,
                    nome: clinica.nome,
                    codigo: clinica.codigo
                },
                data: dadosFormatados,
                total: dadosFormatados.length,
                formato: formato,
                metadata: {
                    timestamp: new Date().toISOString(),
                    fonte: 'HICD',
                    versao: '1.0'
                }
            });
        } catch (error) {
            console.error('Erro ao listar pacientes da clínica:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar pacientes da clínica',
                message: error.message
            });
        }
    }

    // Obter estatísticas de uma clínica
    async obterEstatisticasClinica(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetro obrigatório',
                    message: 'O ID da clínica é obrigatório'
                });
            }

            const crawler = await this.initCrawler();
            
            // Buscar clínica
            let clinicas;
            if (this.isCacheValid()) {
                clinicas = this.clinicasCache;
            } else {
                clinicas = await this.updateClinicasCache();
            }

            const clinica = clinicas.find(c => c.id === id || c.codigo === id || c.nome === id);
            
            if (!clinica) {
                return res.status(404).json({
                    success: false,
                    error: 'Clínica não encontrada',
                    message: `Clínica com ID "${id}" não foi encontrada`
                });
            }

            // Analisar clínica completa
            console.log(`Analisando clínica: ${clinica.nome}`);
            const analise = await crawler.analisarClinica(clinica.nome);

            res.json({
                success: true,
                clinica: {
                    id: clinica.id,
                    nome: clinica.nome,
                    codigo: clinica.codigo
                },
                estatisticas: {
                    totalPacientes: analise.totalPacientes,
                    pacientesAnalisados: analise.pacientesAnalisados,
                    sucessos: analise.sucessos,
                    falhas: analise.falhas,
                    pacientesComHDA: analise.pacientesComHDA,
                    pacientesComDiagnosticos: analise.pacientesComDiagnosticos,
                    taxaSucesso: analise.taxaSucesso,
                    dataAnalise: analise.dataAnalise
                },
                resumo: analise.resumo
            });
        } catch (error) {
            console.error('Erro ao obter estatísticas da clínica:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter estatísticas da clínica',
                message: error.message
            });
        }
    }
}

module.exports = new ClinicasController();
