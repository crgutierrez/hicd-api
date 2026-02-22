/**
 * Sistema de Passagem de Plantão - HICD
 * Módulo principal com navegação por etapas e validação de evolução diária
 */

class PassagemPlantao {
    constructor() {
        // Detectar baseUrl automaticamente
        const currentUrl = window.location.href;
        if (currentUrl.includes('localhost:3000')) {
            this.baseUrl = 'http://localhost:3000/api';
        } else if (currentUrl.includes('127.0.0.1:3000')) {
            this.baseUrl = 'http://127.0.0.1:3000/api';
        } else {
            this.baseUrl = 'http://localhost:3000/api';
        }

        console.log('BaseURL detectada:', this.baseUrl);

        this.currentStep = 1;
        this.selectedClinica = null;
        this.selectedPaciente = null;
        this.settings = {
            showDiagnosticos: true,
            showMedicamentos: true,
            showSinaisVitais: true,
            showExames: true,
            periodo: '24h'
        };

        // Definir método log imediatamente para evitar erros
        this.log = function (message, data = null) {
            const timestamp = new Date().toLocaleTimeString();
            if (data) {
                console.log(`[${timestamp}] ${message}`, data);
            } else {
                console.log(`[${timestamp}] ${message}`);
            }
        };

        this.init();
    }

    init() {
        console.log('Inicializando PassagemPlantao...');

        // Garantir que o método log existe
        if (typeof this.log !== 'function') {
            console.warn('Método log não encontrado, definindo...');
            this.log = function (message, data = null) {
                const timestamp = new Date().toLocaleTimeString();
                if (data) {
                    console.log(`[${timestamp}] ${message}`, data);
                } else {
                    console.log(`[${timestamp}] ${message}`);
                }
            };
        }

        this.bindEvents();
        this.updateDateTime();

        // Aguardar um pouco antes de carregar os dados
        setTimeout(() => {
            console.log('Carregando step 1...');
            this.loadStep1();
        }, 500);

        // Atualizar data/hora a cada minuto
        setInterval(() => this.updateDateTime(), 60000);

        // Esconder loading após carregamento inicial
        setTimeout(() => {
            this.hideLoading();
        }, 2000);
    }

    bindEvents() {
        // Navegação entre etapas
        $('#backToClinicaBtn').on('click', () => this.goToStep(1));
        $('#backToPacienteBtn').on('click', () => this.goToStep(2));

        // Busca de clínicas
        $('#clinicaSearchBtn').on('click', () => this.searchClinicas());
        $('#clinicaSearchInput').on('keypress', (e) => {
            if (e.which === 13) this.searchClinicas();
        });
        $('#refreshClinicasBtn').on('click', () => this.loadClinicas());

        // Filtros de pacientes
        $('#pacienteSearchInput').on('keyup', () => this.filterPacientes());
        $('#statusFilter').on('change', () => this.filterPacientes());

        // Configurações
        $('#settingsBtn').on('click', () => this.showSettings());
        $('#saveSettings').on('click', () => this.saveSettings());

        // Impressão
        $('#printPlantaoBtn').on('click', () => this.printPlantao());

        // Monitorar conexão
        this.monitorConnection();
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const dateTimeString = now.toLocaleDateString('pt-BR', options).replace(',', ' -');
        $('#currentDateTime').text(dateTimeString);
        $('#relatorioDataHora').text(dateTimeString);
        $('#plantaoAtualData').text(now.toLocaleDateString('pt-BR'));
    }

    showLoading() {
        $('#loadingScreen').removeClass('d-none').show();
    }

    hideLoading() {
        $('#loadingScreen').fadeOut(300);
    }

    showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert">
                <div class="toast-header">
                    <i class="bi bi-${this.getToastIcon(type)} text-${type} me-2"></i>
                    <strong class="me-auto">Sistema HICD</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `;

        $('#toastContainer').append(toastHtml);
        const toastElement = new bootstrap.Toast(document.getElementById(toastId));
        toastElement.show();

        // Remove o toast após ser fechado
        setTimeout(() => {
            $(`#${toastId}`).remove();
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle-fill',
            'error': 'exclamation-triangle-fill',
            'warning': 'exclamation-triangle-fill',
            'info': 'info-circle-fill'
        };
        return icons[type] || 'info-circle-fill';
    }

    // ==========================================
    // NAVEGAÇÃO ENTRE ETAPAS
    // ==========================================

    goToStep(step) {
        $('.step-section').removeClass('active');

        switch (step) {
            case 1:
                $('#step1-clinica').addClass('active');
                this.currentStep = 1;
                this.loadStep1();
                break;
            case 2:
                if (!this.selectedClinica) {
                    this.showToast('Selecione uma clínica primeiro', 'warning');
                    return;
                }
                $('#step2-paciente').addClass('active');
                this.currentStep = 2;
                this.loadStep2();
                break;
            case 3:
                if (!this.selectedPaciente) {
                    this.showToast('Selecione um paciente primeiro', 'warning');
                    return;
                }
                $('#step3-plantao').addClass('active');
                this.currentStep = 3;
                this.loadStep3();
                break;
        }
    }

    // ==========================================
    // ETAPA 1: SELEÇÃO DE CLÍNICA
    // ==========================================

    async loadStep1() {
        console.log('LoadStep1 chamado');
        await this.loadClinicas();
    }

    // Método para testar conexão (debug)
    async testarConexao() {
        try {
            this.log('=== TESTE DE CONEXÃO ===');
            const response = await fetch(`${this.baseUrl}/clinicas`);
            this.log(`Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                this.log(`Conexão OK! Recebidas ${data.data?.length || 0} clínicas`);
                return true;
            } else {
                this.log(`Erro de conexão: ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log(`Erro de rede: ${error.message}`);
            return false;
        }
    }

    async loadClinicas() {
        try {
            this.log('=== CARREGANDO CLÍNICAS ===');
            this.log(`URL: ${this.baseUrl}/clinicas`);

            // Primeiro teste se a API está respondendo
            const response = await fetch(`${this.baseUrl}/clinicas`);

            this.log(`Status da resposta: ${response.status}`);
            this.log(`Response OK: ${response.ok}`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Dados completos recebidos:', JSON.stringify(data, null, 2));

            // Verificar se temos dados
            if (!data || !data.data) {
                throw new Error('Estrutura de dados inválida - data.data não encontrado');
            }

            const clinicas = data.data;
            this.log(`Clínicas extraídas: ${clinicas.length} itens`);

            if (clinicas.length === 0) {
                this.log('ATENÇÃO: Nenhuma clínica encontrada nos dados!');
                $('#clinicas-grid').html('<div class="alert alert-warning">Nenhuma clínica encontrada</div>');
                return;
            }

            this.renderClinicas(clinicas);
            this.log('=== CLÍNICAS CARREGADAS COM SUCESSO ===');

        } catch (error) {
            this.log('=== ERRO AO CARREGAR CLÍNICAS ===');
            this.log(`Erro: ${error.message}`);
            this.log(`Stack: ${error.stack}`);

            $('#clinicas-grid').html(`
                <div class="alert alert-danger">
                    <h6>Erro ao carregar clínicas</h6>
                    <p><strong>Detalhes:</strong> ${error.message}</p>
                    <p><strong>Verifique:</strong></p>
                    <ul>
                        <li>Se o servidor está rodando em <code>localhost:3000</code></li>
                        <li>Se a URL da API está correta</li>
                        <li>Se não há problemas de CORS</li>
                    </ul>
                    <button class="btn btn-sm btn-outline-primary" onclick="passagemPlantao.loadClinicas()">
                        <i class="bi bi-arrow-clockwise"></i> Tentar Novamente
                    </button>
                </div>
            `);
        }
    }

    renderClinicas(clinicas) {
        const container = $('#clinicasList');
        console.log('Renderizando clínicas:', clinicas);

        if (!clinicas || clinicas.length === 0) {
            container.html(`
                <div class="text-center py-4">
                    <i class="bi bi-building text-muted display-4"></i>
                    <p class="mt-2 text-muted">Nenhuma clínica encontrada</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="window.passagemPlantao.loadClinicas()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Recarregar
                    </button>
                </div>
            `);
            return;
        }

        const clinicasHtml = clinicas.map(clinica => `
            <div class="clinica-card" data-clinica='${JSON.stringify(clinica)}'>
                <div class="clinica-icon">
                    <i class="bi bi-building"></i>
                </div>
                <div class="clinica-name">${clinica.nome || 'Nome não disponível'}</div>
                <div class="clinica-code">Código: ${clinica.codigo || 'N/A'}</div>
                <div class="clinica-stats">
                    <div class="clinica-stat">
                        <div class="stat-number">${clinica.totalPacientes || 0}</div>
                        <div class="stat-label">Pacientes</div>
                    </div>
                    <div class="clinica-stat">
                        <div class="stat-number">${clinica.leitosOcupados || 0}</div>
                        <div class="stat-label">Leitos</div>
                    </div>
                </div>
            </div>
        `).join('');

        container.html(clinicasHtml);
        console.log('Clínicas renderizadas com sucesso');

        // Evento de clique nas clínicas
        $('.clinica-card').on('click', (e) => {
            $('.clinica-card').removeClass('selected');
            $(e.currentTarget).addClass('selected');

            const clinicaData = JSON.parse($(e.currentTarget).attr('data-clinica'));
            this.selectClinica(clinicaData);
        });
    }

    selectClinica(clinica) {
        this.selectedClinica = clinica;
        this.showToast(`Clínica selecionada: ${clinica.nome}`, 'success');

        // Aguardar um pouco e ir para próxima etapa
        setTimeout(() => {
            this.goToStep(2);
        }, 1000);
    }

    searchClinicas() {
        const searchTerm = $('#clinicaSearchInput').val().toLowerCase();

        $('.clinica-card').each(function () {
            const clinicaData = JSON.parse($(this).attr('data-clinica'));
            const clinicaText = `${clinicaData.nome} ${clinicaData.codigo}`.toLowerCase();

            if (clinicaText.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    // ==========================================
    // ETAPA 2: SELEÇÃO DE PACIENTE
    // ==========================================

    async loadStep2() {
        $('#selectedClinicaName').text(this.selectedClinica.nome);
        await this.loadPacientes();
    }

    // Método para mostrar informações da clínica selecionada (debug)
    showSelectedClinica() {
        this.log('=== CLÍNICA SELECIONADA ===');
        if (this.selectedClinica) {
            this.log(`ID: ${this.selectedClinica.id}`);
            this.log(`Nome: ${this.selectedClinica.nome}`);
            this.log(`Código: ${this.selectedClinica.codigo}`);
            this.log(`Total Pacientes: ${this.selectedClinica.totalPacientes}`);

            this.showToast(`Clínica: ${this.selectedClinica.nome} (${this.selectedClinica.codigo})`, 'info');
        } else {
            this.log('Nenhuma clínica selecionada!');
            this.showToast('Nenhuma clínica selecionada', 'warning');
        }
    }

    async loadPacientes() {
        try {
            this.log('=== CARREGANDO PACIENTES ===');
            this.log(`Clínica selecionada: ${this.selectedClinica?.codigo} - ${this.selectedClinica?.nome}`);

            const url = `${this.baseUrl}/clinicas/${this.selectedClinica.codigo}/pacientes`;
            this.log(`URL: ${url}`);

            const response = await fetch(url);
            this.log(`Status da resposta: ${response.status}`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            this.log('Dados completos recebidos:', JSON.stringify(data, null, 2));

            // Verificar estrutura dos dados
            const pacientes = data.data || data.pacientes || [];
            this.log(`Total de pacientes encontrados: ${pacientes.length}`);

            if (pacientes.length === 0) {
                this.log('ATENÇÃO: Nenhum paciente encontrado para esta clínica!');
                $('#pacientesList').html('<div class="alert alert-info">Nenhum paciente encontrado para esta clínica</div>');
                return;
            }

            await this.loadEvolucoesPacientes(pacientes);
            this.log('=== PACIENTES CARREGADOS COM SUCESSO ===');

        } catch (error) {
            this.log('=== ERRO AO CARREGAR PACIENTES ===');
            this.log(`Erro: ${error.message}`);
            this.log(`Stack: ${error.stack}`);

            this.showToast('Erro ao carregar pacientes: ' + error.message, 'error');
            $('#pacientesList').html(`
                <div class="alert alert-danger">
                    <h6>Erro ao carregar pacientes</h6>
                    <p><strong>Detalhes:</strong> ${error.message}</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="passagemPlantao.loadPacientes()">
                        <i class="bi bi-arrow-clockwise"></i> Tentar Novamente
                    </button>
                </div>
            `);
        }
    }

    async loadEvolucoesPacientes(pacientes) {
        this.log('=== CARREGANDO EVOLUÇÕES DOS PACIENTES ===');
        this.log(`Processando ${pacientes.length} pacientes`);

        const pacientesComEvolucao = [];

        for (let i = 0; i < pacientes.length; i++) {
            const paciente = pacientes[i];
            this.log(`Processando paciente ${i + 1}/${pacientes.length}: ${paciente.nome} (${paciente.prontuario})`);

            try {
                // Verificar se tem evolução diária
                const evolucaoUrl = `${this.baseUrl}/pacientes/${paciente.prontuario}/evolucoes?formato=detalhado`;
                this.log(`URL evolução: ${evolucaoUrl}`);

                const evolucaoResponse = await fetch(evolucaoUrl);
                this.log(`Status evolução: ${evolucaoResponse.status}`);

                if (evolucaoResponse.ok) {
                    const evolucaoData = await evolucaoResponse.json();
                    this.log(`Dados evolução:`, evolucaoData);

                    const temEvolucaoDiaria = this.verificarEvolucaoDiaria(evolucaoData.data || []);
                    this.log(`Tem evolução diária: ${temEvolucaoDiaria}`);

                    pacientesComEvolucao.push({
                        ...paciente,
                        evolucaoDiaria: temEvolucaoDiaria
                    });
                } else {
                    this.log(`Erro ao carregar evolução: ${evolucaoResponse.status}`);
                    pacientesComEvolucao.push({
                        ...paciente,
                        evolucaoDiaria: false
                    });
                }
            } catch (error) {
                this.log(`Erro ao carregar evolução para paciente ${paciente.prontuario}:`, error);
                pacientesComEvolucao.push({
                    ...paciente,
                    evolucaoDiaria: false
                });
            }
        }

        this.log(`Total de pacientes processados: ${pacientesComEvolucao.length}`);
        this.renderPacientes(pacientesComEvolucao);
        this.updatePacientesStats(pacientesComEvolucao);
        this.log('=== EVOLUÇÕES PROCESSADAS ===');
    }
    // Método 2: Usando replace para converter o formato
    convertDateString(dateString) {
        // Converter de DD/MM/YYYY HH:MM:SS para YYYY-MM-DD HH:MM:SS
        const converted = dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1');
        return new Date(converted);
    }
    encontrarEvolucaoCompleta(data) {
       

        return data.filter(evolucao => {
            console.log('Verificando evolução:', evolucao);
            const metadata = evolucao.metadata;
            return metadata &&
                metadata.temDiagnostico === true &&
                metadata.temMedicamentos === true;
        });
    }
    verificarEvolucaoDiaria(evolucoes) {
        if (!evolucoes || evolucoes.length === 0) return false;
        console.log(`Evoluções encontradas: ${evolucoes.length}`);
        const evolucaoRecente = evolucoes[0];
        const hoje = new Date();
        this.log('Data Evolucao :', evolucaoRecente.dataEvolucao);
        const evolucaoData = this.convertDateString(evolucaoRecente.dataEvolucao);

        // Verificar se é do dia atual (últimas 24 horas)
        const diffHours = (hoje - evolucaoData) / (1000 * 60 * 60);
        if (diffHours > 48) return false;
        const evolucaoCompleta = this.encontrarEvolucaoCompleta(evolucoes);
        console.log('Evolucao Completa :', evolucaoCompleta);

        // Verificar se tem todos os metadados necessários
        const indicadores = evolucaoCompleta.metadata;
        console.log('Indicadores da evolução:', indicadores);
        return indicadores &&
            indicadores.temDiagnostico &&
            indicadores.temMedicamentos;
        //&& 
        //  indicadores.temSinaisVitais;
    }

    renderPacientes(pacientes) {
        this.log('=== RENDERIZANDO PACIENTES ===');
        this.log(`Pacientes recebidos: ${pacientes ? pacientes.length : 'null/undefined'}`);

        const container = $('#pacientesList');
        this.log(`Container encontrado: ${container.length > 0 ? 'SIM' : 'NÃO'}`);

        if (!pacientes || pacientes.length === 0) {
            this.log('Nenhum paciente para renderizar - mostrando mensagem vazia');
            container.html(`
                <div class="text-center py-4">
                    <i class="bi bi-people text-muted display-4"></i>
                    <p class="mt-2 text-muted">Nenhum paciente encontrado nesta clínica</p>
                </div>
            `);
            return;
        }

        this.log('Gerando HTML dos pacientes...');
        const pacientesHtml = pacientes.map((paciente, index) => {
            this.log(`Paciente ${index + 1}: ${paciente.nome} (${paciente.prontuario})`);
            return `
                <div class="paciente-card" data-paciente='${JSON.stringify(paciente)}'>
                    <div class="paciente-header">
                        <div>
                            <div class="paciente-name">${paciente.nome}</div>
                            <div class="paciente-prontuario">Prontuário: ${paciente.prontuario}</div>
                        </div>
                        <div class="evolucao-badge ${paciente.evolucaoDiaria ? 'completa' : 'incompleta'}">
                            <i class="bi bi-${paciente.evolucaoDiaria ? 'check-circle' : 'exclamation-triangle'}"></i>
                            ${paciente.evolucaoDiaria ? 'Evolução Completa' : 'Evolução Incompleta'}
                        </div>
                    </div>
                    
                    <div class="paciente-info">
                        <div class="paciente-info-item">
                            <div class="label">Leito:</div>
                            <div class="value">${paciente.leito || 'N/A'}</div>
                        </div>
                        <div class="paciente-info-item">
                            <div class="label">Idade:</div>
                            <div class="value">${paciente.idade || 'N/A'}</div>
                        </div>
                        <div class="paciente-info-item">
                            <div class="label">Convênio:</div>
                            <div class="value">${paciente.convenio || 'N/A'}</div>
                        </div>
                        <div class="paciente-info-item">
                            <div class="label">Internação:</div>
                            <div class="value">${this.formatDate(paciente.dataInternacao)}</div>
                        </div>
                    </div>
                    
                    <div class="paciente-indicators">
                        <div class="indicator ${paciente.evolucaoDiaria ? 'positive' : 'negative'}">
                            <i class="bi bi-file-medical me-1"></i>
                            Evolução
                        </div>
                        ${paciente.examePendente ? '<div class="indicator negative"><i class="bi bi-clipboard2-pulse me-1"></i>Exame Pendente</div>' : ''}
                        ${paciente.medicamentoCritico ? '<div class="indicator negative"><i class="bi bi-capsule me-1"></i>Med. Crítico</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.log(`HTML gerado (${pacientesHtml.length} caracteres)`);
        this.log('Inserindo HTML no container...');
        container.html(pacientesHtml);

        this.log('Configurando eventos de clique...');
        // Evento de clique nos pacientes
        $('.paciente-card').on('click', (e) => {
            $('.paciente-card').removeClass('selected');
            $(e.currentTarget).addClass('selected');

            const pacienteData = JSON.parse($(e.currentTarget).attr('data-paciente'));
            this.selectPaciente(pacienteData);
        });

        this.log('=== PACIENTES RENDERIZADOS ===');
    }

    selectPaciente(paciente) {
        this.selectedPaciente = paciente;

        if (!paciente.evolucaoDiaria) {
            this.showToast('Atenção: Este paciente não possui evolução diária completa', 'warning');
        }

        this.showToast(`Paciente selecionado: ${paciente.nome}`, 'success');

        // Aguardar um pouco e ir para próxima etapa
        setTimeout(() => {
            this.goToStep(3);
        }, 1000);
    }

    updatePacientesStats(pacientes) {
        const total = pacientes.length;
        const comEvolucao = pacientes.filter(p => p.evolucaoDiaria).length;
        const semEvolucao = total - comEvolucao;
        const leitosOcupados = pacientes.filter(p => p.leito).length;

        $('#totalPacientes').text(total);
        $('#comEvolucaoDiaria').text(comEvolucao);
        $('#semEvolucaoDiaria').text(semEvolucao);
        $('#leitos').text(leitosOcupados);

        $('#pacientesStats').show();
    }

    filterPacientes() {
        const searchTerm = $('#pacienteSearchInput').val().toLowerCase();
        const statusFilter = $('#statusFilter').val();

        $('.paciente-card').each(function () {
            const pacienteData = JSON.parse($(this).attr('data-paciente'));
            const pacienteText = `${pacienteData.nome} ${pacienteData.prontuario}`.toLowerCase();

            let show = true;

            // Filtro por texto
            if (searchTerm && !pacienteText.includes(searchTerm)) {
                show = false;
            }

            // Filtro por status (simplificado)
            if (statusFilter) {
                switch (statusFilter) {
                    case 'internado':
                        show = show && pacienteData.leito;
                        break;
                    case 'critico':
                        show = show && pacienteData.medicamentoCritico;
                        break;
                }
            }

            $(this).toggle(show);
        });
    }

    // ==========================================
    // ETAPA 3: PASSAGEM DE PLANTÃO
    // ==========================================

    async loadStep3() {
        this.showLoading();

        try {
            // Carregar dados do paciente
            await this.loadPacienteDetails();

            // Carregar evolução
            await this.loadEvolucao();

            // Carregar exames
           // await this.loadExames();

            this.hideLoading();

        } catch (error) {
            console.error('Erro ao carregar passagem de plantão:', error);
            this.showToast('Erro ao carregar dados da passagem de plantão', 'error');
            this.hideLoading();
        }
    }

    async loadPacienteDetails() {
        // Preencher cabeçalho
        $('#pacienteNome').text(this.selectedPaciente.nome);
        $('#pacienteProntuario').text(this.selectedPaciente.prontuario);
        $('#pacienteLeito').text(this.selectedPaciente.leito || 'N/A');
        $('#pacienteClinica').text(this.selectedClinica.nome);
        $('#pacienteDataInternacao').text(this.formatDate(this.selectedPaciente.dataInternacao));
        $('#pacienteConvenio').text(this.selectedPaciente.convenio || 'N/A');
        $('#pacienteMedico').text(this.selectedPaciente.medicoResponsavel || 'N/A');

        // Status da evolução
        const statusEl = $('#evolucaoStatus');
        if (this.selectedPaciente.evolucaoDiaria) {
            statusEl.removeClass('alert-warning').addClass('alert-success');
            statusEl.html('<i class="bi bi-check-circle me-1"></i><strong>Evolução Diária Completa</strong>');
        } else {
            statusEl.removeClass('alert-success').addClass('alert-warning');
            statusEl.html('<i class="bi bi-exclamation-triangle me-1"></i><strong>Evolução Diária Incompleta</strong>');
        }
    }

    async loadEvolucao() {
        try {
            const response = await fetch(`${this.baseUrl}/pacientes/${this.selectedPaciente.prontuario}/evolucoes?limite=1&formato=completo`);
            if (!response.ok) throw new Error('Erro ao carregar evolução');

            const data = await response.json();

            if (data.evolucoes && data.evolucoes.length > 0) {
                const evolucao = data.evolucoes[0];
                this.renderEvolucaoData(evolucao);
            } else {
                this.renderNoData(['#diagnosticosContent', '#medicamentosContent', '#sinaisVitaisContent', '#evolucaoContent', '#observacoesContent']);
            }

        } catch (error) {
            console.error('Erro ao carregar evolução:', error);
            this.renderError(['#diagnosticosContent', '#medicamentosContent', '#sinaisVitaisContent', '#evolucaoContent', '#observacoesContent'], 'Erro ao carregar evolução');
        }
    }

    renderEvolucaoData(evolucao) {
        // Diagnósticos
        this.renderDiagnosticos(evolucao.dadosClinicosEstruturados?.hipotesesDiagnosticas || []);

        // Medicamentos
        this.renderMedicamentos(evolucao.dadosClinicosEstruturados?.medicamentos || []);

        // Sinais Vitais
        this.renderSinaisVitais(evolucao.dadosClinicosEstruturados?.sinaisVitais || {});

        // Evolução
        this.renderEvolucaoTexto(evolucao);

        // Observações
        this.renderObservacoes(evolucao);
    }

    renderDiagnosticos(diagnosticos) {
        const container = $('#diagnosticosContent');

        if (!diagnosticos || diagnosticos.length === 0) {
            container.html('<p class="text-muted">Nenhum diagnóstico encontrado na evolução.</p>');
            return;
        }

        const diagnosticosHtml = diagnosticos.map((diag, index) => `
            <div class="diagnostico-item ${index === 0 ? 'diagnostico-principal' : 'diagnostico-secundario'}">
                <strong>${index === 0 ? 'Principal:' : 'Secundário:'}</strong> ${diag}
            </div>
        `).join('');

        container.html(diagnosticosHtml);
    }

    renderMedicamentos(medicamentos) {
        const container = $('#medicamentosContent');

        if (!medicamentos || medicamentos.length === 0) {
            container.html('<p class="text-muted">Nenhum medicamento encontrado na evolução.</p>');
            return;
        }

        const medicamentosHtml = medicamentos.map(med => `
            <div class="medicamento-item">
                <div>
                    <div class="medicamento-nome">${med}</div>
                    <div class="medicamento-dose">Conforme prescrição médica</div>
                </div>
                <div class="medicamento-horario">Em uso</div>
            </div>
        `).join('');

        container.html(medicamentosHtml);
    }

    renderSinaisVitais(sinaisVitais) {
        const container = $('#sinaisVitaisContent');

        if (!sinaisVitais || Object.keys(sinaisVitais).length === 0) {
            container.html('<p class="text-muted">Nenhum sinal vital encontrado na evolução.</p>');
            return;
        }

        const sinaisHtml = Object.entries(sinaisVitais).map(([key, value]) => `
            <div class="sinal-vital-item">
                <div class="sinal-vital-valor">${value}</div>
                <div class="sinal-vital-label">${this.getSinalVitalLabel(key)}</div>
                <div class="sinal-vital-horario">Último registro</div>
            </div>
        `).join('');

        container.html(`<div class="sinais-vitais-grid">${sinaisHtml}</div>`);
    }

    getSinalVitalLabel(key) {
        const labels = {
            'temperatura': 'Temperatura',
            'pressao': 'Pressão Arterial',
            'pulso': 'Pulso',
            'freq_respiratoria': 'Freq. Respiratória',
            'saturacao': 'Saturação O2',
            'peso': 'Peso',
            'altura': 'Altura'
        };
        return labels[key] || key;
    }

    renderEvolucaoTexto(evolucao) {
        const container = $('#evolucaoContent');

        const evolucaoHtml = `
            <div class="evolucao-meta">
                <strong>Data:</strong> ${this.formatDateTime(evolucao.dataEvolucao)} | 
                <strong>Profissional:</strong> ${evolucao.profissional || 'N/A'}
            </div>
            <div class="evolucao-texto">
                ${evolucao.conteudo?.textoCompleto || 'Texto da evolução não disponível.'}
            </div>
        `;

        container.html(evolucaoHtml);
    }

    renderObservacoes(evolucao) {
        const container = $('#observacoesContent');

        // Gerar observações baseadas nos dados
        const observacoes = [];

        if (!evolucao.metadata?.temDiagnostico) {
            observacoes.push({
                tipo: 'Atenção',
                texto: 'Evolução sem diagnóstico claro documentado.'
            });
        }

        if (!evolucao.metadata?.temMedicamentos) {
            observacoes.push({
                tipo: 'Cuidado',
                texto: 'Nenhum medicamento documentado na evolução.'
            });
        }

        if (!evolucao.metadata?.temSinaisVitais) {
            observacoes.push({
                tipo: 'Importante',
                texto: 'Sinais vitais não documentados na evolução.'
            });
        }

        if (observacoes.length === 0) {
            observacoes.push({
                tipo: 'OK',
                texto: 'Evolução médica completa com todos os dados necessários.'
            });
        }

        const observacoesHtml = observacoes.map(obs => `
            <div class="observacao-item">
                <div class="observacao-tipo">${obs.tipo}</div>
                <div class="observacao-texto">${obs.texto}</div>
            </div>
        `).join('');

        container.html(observacoesHtml);
    }

    async loadExames() {
        try {
            const response = await fetch(`${this.baseUrl}/pacientes/${this.selectedPaciente.prontuario}/exames?formato=resumo`);
            if (!response.ok) throw new Error('Erro ao carregar exames');

            const data = await response.json();
            this.renderExames(data.exames || []);

        } catch (error) {
            console.error('Erro ao carregar exames:', error);
            this.renderError('#examesContent', 'Erro ao carregar exames');
        }
    }

    renderExames(exames) {
        const container = $('#examesContent');

        if (!exames || exames.length === 0) {
            container.html('<p class="text-muted">Nenhum exame recente encontrado.</p>');
            return;
        }

        // Pegar apenas os 5 exames mais recentes
        const examensRecentes = exames.slice(0, 5);

        const examesHtml = examensRecentes.map(exame => `
            <div class="exame-item">
                <div class="exame-nome">${exame.requisicao || 'Exame'} - ${exame.dataExame || ''}</div>
                <div class="exame-resultado">
                    ${exame.exames ? exame.exames.slice(0, 3).map(e => e.nome).join(', ') : 'Dados do exame'}
                </div>
                <div class="exame-data">${this.formatDateTime(exame.dataExame)}</div>
            </div>
        `).join('');

        container.html(examesHtml);
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================

    renderError(selectors, message) {
        const errorHtml = `
            <div class="text-center py-4">
                <i class="bi bi-exclamation-triangle text-danger display-4 mb-3"></i>
                <p class="text-danger"><strong>Erro:</strong> ${message}</p>
                <button class="btn btn-outline-primary btn-sm" onclick="window.passagemPlantao.loadClinicas()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Tentar Novamente
                </button>
            </div>
        `;

        if (Array.isArray(selectors)) {
            selectors.forEach(selector => $(selector).html(errorHtml));
        } else {
            $(selectors).html(errorHtml);
        }
    }

    renderNoData(selectors) {
        const noDataHtml = `<p class="text-muted"><i class="bi bi-info-circle me-1"></i>Nenhum dado disponível.</p>`;

        if (Array.isArray(selectors)) {
            selectors.forEach(selector => $(selector).html(noDataHtml));
        } else {
            $(selectors).html(noDataHtml);
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('pt-BR');
        } catch {
            return dateString;
        }
    }

    // ==========================================
    // CONFIGURAÇÕES E FUNCIONALIDADES EXTRAS
    // ==========================================

    showSettings() {
        const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
        modal.show();
    }

    saveSettings() {
        this.settings.showDiagnosticos = $('#showDiagnosticos').prop('checked');
        this.settings.showMedicamentos = $('#showMedicamentos').prop('checked');
        this.settings.showSinaisVitais = $('#showSinaisVitais').prop('checked');
        this.settings.showExames = $('#showExames').prop('checked');
        this.settings.periodo = $('#periodoConfig').val();

        // Aplicar configurações
        this.applySettings();

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        modal.hide();

        this.showToast('Configurações salvas', 'success');
    }

    applySettings() {
        // Mostrar/esconder seções baseado nas configurações
        $('.section-card').each(function () {
            const sectionId = $(this).find('.section-content').attr('id');
            let show = true;

            switch (sectionId) {
                case 'diagnosticosContent':
                    show = this.settings.showDiagnosticos;
                    break;
                case 'medicamentosContent':
                    show = this.settings.showMedicamentos;
                    break;
                case 'sinaisVitaisContent':
                    show = this.settings.showSinaisVitais;
                    break;
                case 'examesContent':
                    show = this.settings.showExames;
                    break;
            }

            $(this).toggle(show);
        }.bind(this));
    }

    printPlantao() {
        // Esconder elementos não necessários para impressão
        $('.btn, .loading-placeholder').addClass('d-print-none');

        // Configurar página para impressão
        window.print();

        // Restaurar elementos após impressão
        setTimeout(() => {
            $('.btn, .loading-placeholder').removeClass('d-print-none');
        }, 1000);
    }

    monitorConnection() {
        const updateStatus = (online) => {
            const statusEl = $('#connectionStatus');
            if (online) {
                statusEl.removeClass('bg-danger').addClass('bg-success');
                statusEl.html('<i class="bi bi-wifi"></i> Online');
            } else {
                statusEl.removeClass('bg-success').addClass('bg-danger');
                statusEl.html('<i class="bi bi-wifi-off"></i> Offline');
            }
        };

        // Verificar conexão inicial
        updateStatus(navigator.onLine);

        // Monitorar mudanças de conexão
        window.addEventListener('online', () => updateStatus(true));
        window.addEventListener('offline', () => updateStatus(false));
    }
}

// Inicializar quando o documento estiver pronto
$(document).ready(() => {
    window.passagemPlantao = new PassagemPlantao();
});