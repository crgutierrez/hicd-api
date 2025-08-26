/**
 * HICD System - Frontend JavaScript
 * Sistema de gerenciamento de clínicas e pacientes
 * Versão: 1.0.0
 */

class HICDApp {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.currentClinica = null;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.isOnline = navigator.onLine;
        this.cache = new Map();
        this.loadingTimeout = null;
        
        this.init();
    }

    // Inicialização da aplicação
    init() {
        this.bindEvents();
        this.setupPWA();
        this.setupOfflineDetection();
        this.setupLoadingScreen();
        this.loadDashboard();
        this.checkServerConnection();
        
        // Mostrar dashboard inicial
        this.showSection('dashboard');
    }

    // Configurar eventos
    bindEvents() {
        // Navegação
        $(document).on('click', '.nav-link', (e) => {
            e.preventDefault();
            const section = $(e.target).data('section');
            console.log('Clique na navegação detectado:', section);
            if (section) {
                this.showSection(section);
                this.updateNavigation(section);
            } else {
                console.error('data-section não encontrado no elemento:', e.target);
            }
        });

        // Quick actions
        $(document).on('click', '.quick-nav', (e) => {
            e.preventDefault();
            const section = $(e.target).closest('.quick-nav').data('section');
            if (section) {
                this.showSection(section);
                this.updateNavigation(section);
            }
        });

        // Clínicas
        $(document).on('click', '.clinica-card', (e) => {
            const clinicaId = $(e.currentTarget).data('clinica-id');
            this.selectClinica(clinicaId);
        });

        $(document).on('click', '.btn-ver-pacientes', (e) => {
            e.stopPropagation();
            const clinicaId = $(e.target).closest('.clinica-card').data('clinica-id');
            this.viewPacientesClinica(clinicaId);
        });

        // Pacientes
        $(document).on('click', '.btn-ver-detalhes', (e) => {
            const pacienteId = $(e.target).data('paciente-id');
            console.log('Ver detalhes do paciente:', pacienteId);
            this.viewPacienteDetails(pacienteId);
        });

        // Busca
        $('#searchInput').on('input', this.debounce((e) => {
            this.searchPacientes($(e.target).val());
        }, 500));

        $('#searchForm').on('submit', (e) => {
            e.preventDefault();
            this.performAdvancedSearch();
        });

        // Paginação
        $(document).on('click', '.pagination-btn', (e) => {
            e.preventDefault();
            const page = $(e.target).data('page');
            if (page && page !== this.currentPage) {
                this.currentPage = page;
                this.loadPacientes();
            }
        });

        // Atualização manual
        $('#refreshData').on('click', () => {
            this.refreshAllData();
        });

        // Exportar dados
        $('#exportData').on('click', () => {
            this.exportData();
        });

        // Limpar filtros
        $('#clearFilters').on('click', () => {
            this.clearFilters();
        });

        // Reset de busca
        $('#searchInput').on('keyup', (e) => {
            if (e.key === 'Escape') {
                $(e.target).val('');
                this.clearSearch();
            }
        });

        // Botões específicos de clínicas
        $('#refreshClinicas').on('click', () => {
            this.loadClinicas();
        });

        $('#limparFiltroClinicas').on('click', () => {
            $('#clinicaSearchInput').val('');
            this.loadClinicas();
        });

        $('#clinicaSearchBtn').on('click', () => {
            const query = $('#clinicaSearchInput').val().trim();
            this.searchClinicas(query);
        });

        $('#clinicaSearchInput').on('input', this.debounce((e) => {
            const query = $(e.target).val().trim();
            if (query === '') {
                this.loadClinicas();
            } else {
                this.searchClinicas(query);
            }
        }, 300));

        // Eventos específicos da seção de pacientes
        $('#clinicaSelect').on('change', (e) => {
            const clinicaId = $(e.target).val();
            if (clinicaId) {
                this.currentClinica = clinicaId;
                $('#loadPacientesBtn, #statsClinicaBtn').prop('disabled', false);
            } else {
                this.currentClinica = null;
                $('#loadPacientesBtn, #statsClinicaBtn').prop('disabled', true);
            }
        });

        $('#loadPacientesBtn').on('click', () => {
            this.currentPage = 1;
            this.loadPacientes();
        });

        $('#statsClinicaBtn').on('click', () => {
            if (this.currentClinica) {
                this.showClinicaStats(this.currentClinica);
            }
        });
    }

    // Configurar PWA
    setupPWA() {
        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registrado:', registration);
                })
                .catch((error) => {
                    console.log('Erro ao registrar Service Worker:', error);
                });
        }

        // Install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton();
        });

        // Install button
        $('#installApp').on('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('Install prompt result:', outcome);
                deferredPrompt = null;
                $('#installApp').hide();
            }
        });
    }

    // Configurar detecção offline
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.hideOfflineIndicator();
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
            this.showOfflineIndicator();
        });

        this.updateConnectionStatus();
    }

    // Configurar tela de carregamento
    setupLoadingScreen() {
        this.loadingTimeout = setTimeout(() => {
            this.hideLoadingScreen();
        }, 2000);
    }

    // Ocultar tela de carregamento
    hideLoadingScreen() {
        $('.loading-screen').addClass('fade-out');
        setTimeout(() => {
            $('.loading-screen').remove();
        }, 300);
    }

    // Mostrar seção
    showSection(sectionId) {
        console.log('showSection chamado para:', sectionId);
        $('.content-section').removeClass('active');
        $(`#${sectionId}`).addClass('active');
        console.log('Seção ativada:', sectionId, 'Elemento encontrado:', $(`#${sectionId}`).length > 0);

        // Carregar dados específicos da seção
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'clinicas':
                console.log('Carregando dados das clínicas...');
                this.loadClinicas();
                break;
            case 'pacientes':
                this.loadClinicasForPacientesSection();
                this.loadPacientes();
                break;
            case 'busca':
                this.setupAdvancedSearch();
                break;
        }
    }

    // Atualizar navegação
    updateNavigation(activeSection) {
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-section="${activeSection}"]`).addClass('active');
    }

    // Carregar dashboard
    async loadDashboard() {
        try {
            this.showLoading('#dashboard');
            
            const [clinicasResponse, pacientesResponse] = await Promise.all([
                this.apiCall('/clinicas'),
                this.apiCall('/pacientes')
            ]);

            const clinicas = clinicasResponse.data || clinicasResponse;
            const pacientes = pacientesResponse.data || pacientesResponse;

            this.updateDashboardStats(clinicas, pacientes);
            this.updateRecentActivity();
            this.updateQuickSearch();
            
        } catch (error) {
            this.showError('Erro ao carregar dashboard', error);
        } finally {
            this.hideLoading('#dashboard');
        }
    }

    // Atualizar estatísticas do dashboard
    updateDashboardStats(clinicas, pacientes) {
        const totalClinicas = clinicas.length;
        const totalPacientes = pacientes.length;
        const pacientesAtivos = pacientes.filter(p => p.status === 'ativo').length;
        const mediaPacientesPorClinica = Math.round(totalPacientes / totalClinicas);

        $('#totalClinicas').text(totalClinicas);
        $('#totalPacientes').text(totalPacientes);
        $('#pacientesAtivos').text(pacientesAtivos);
        $('#mediaPacientes').text(mediaPacientesPorClinica);
    }

    // Atualizar atividade recente
    updateRecentActivity() {
        const activities = [
            { 
                icon: 'fas fa-user-plus', 
                text: 'Novo paciente cadastrado na Clínica Central',
                time: '2 minutos atrás',
                type: 'success'
            },
            { 
                icon: 'fas fa-edit', 
                text: 'Dados atualizados para João Silva',
                time: '15 minutos atrás',
                type: 'info'
            },
            { 
                icon: 'fas fa-hospital', 
                text: 'Nova clínica adicionada ao sistema',
                time: '1 hora atrás',
                type: 'primary'
            },
            { 
                icon: 'fas fa-search', 
                text: 'Busca realizada por CPF 123.456.789-00',
                time: '2 horas atrás',
                type: 'warning'
            }
        ];

        const activityHtml = activities.map(activity => `
            <div class="activity-item">
                <div class="d-flex align-items-center">
                    <div class="activity-icon me-3">
                        <i class="${activity.icon} text-${activity.type}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="activity-text">${activity.text}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            </div>
        `).join('');

        $('.activity-timeline').html(activityHtml);
    }

    // Configurar busca rápida
    updateQuickSearch() {
        $('#quickSearchForm').off('submit').on('submit', (e) => {
            e.preventDefault();
            const query = $('#quickSearchInput').val().trim();
            if (query) {
                this.quickSearch(query);
            }
        });
    }

    // Busca rápida
    async quickSearch(query) {
        try {
            this.showLoading('#quickSearchResults');
            
            // Buscar todos os pacientes
            const todosPacientes = await this.apiCall('/pacientes');
            
            // Filtrar resultados
            const results = todosPacientes.filter(paciente => {
                const searchTerm = query.toLowerCase();
                return (
                    paciente.nome.toLowerCase().includes(searchTerm) ||
                    paciente.cpf.includes(query) ||
                    (paciente.clinica && paciente.clinica.toLowerCase().includes(searchTerm))
                );
            });
            
            this.displayQuickSearchResults(results);
            
        } catch (error) {
            this.showError('Erro na busca rápida', error);
            $('#quickSearchResults').html('<p class="text-danger">Erro ao realizar busca</p>');
        } finally {
            this.hideLoading('#quickSearchResults');
        }
    }

    // Exibir resultados da busca rápida
    displayQuickSearchResults(results) {
        if (results.length === 0) {
            $('#quickSearchResults').html('<p class="text-muted">Nenhum resultado encontrado.</p>');
            return;
        }

        const resultsHtml = results.slice(0, 5).map(paciente => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                    <strong>${paciente.nome}</strong><br>
                    <small class="text-muted">CPF: ${paciente.cpf} | ${paciente.clinica}</small>
                </div>
                <button class="btn btn-sm btn-outline-primary btn-ver-detalhes" 
                        data-paciente-id="${paciente.prontuario}">
                    Ver
                </button>
            </div>
        `).join('');

        $('#quickSearchResults').html(resultsHtml);
    }

    // Carregar clínicas
    async loadClinicas() {
        try {
            this.showLoading('#clinicas');
            
            const response = await this.apiCall('/clinicas');
            const clinicas = response.data || response; // Suporte para diferentes formatos de resposta
            
            // Enriquecer dados das clínicas com estatísticas de pacientes
            const clinicasComStats = await Promise.all(
                clinicas.map(async (clinica) => {
                    try {
                        const pacientesResponse = await this.apiCall(`/clinicas/${clinica.id}/pacientes`);
                        const pacientes = pacientesResponse.data || pacientesResponse;
                        return {
                            ...clinica,
                            totalPacientes: pacientes.length,
                            pacientesAtivos: pacientes.filter(p => p.status === 'ativo').length
                        };
                    } catch (error) {
                        console.warn(`Erro ao carregar pacientes da clínica ${clinica.id}:`, error);
                        return {
                            ...clinica,
                            totalPacientes: 0,
                            pacientesAtivos: 0
                        };
                    }
                })
            );
            
            this.displayClinicas(clinicasComStats);
            
        } catch (error) {
            this.showError('Erro ao carregar clínicas', error);
        } finally {
            this.hideLoading('#clinicas');
        }
    }

    // Buscar clínicas
    async searchClinicas(query) {
        if (!query.trim()) {
            this.loadClinicas();
            return;
        }

        try {
            this.showLoading('#clinicas');
            
            const response = await this.apiCall('/clinicas');
            const todasClinicas = response.data || response;
            
            // Filtrar clínicas localmente
            const results = todasClinicas.filter(clinica => {
                const searchTerm = query.toLowerCase();
                return (
                    clinica.nome.toLowerCase().includes(searchTerm) ||
                    clinica.codigo.toLowerCase().includes(searchTerm) ||
                    clinica.id.toLowerCase().includes(searchTerm)
                );
            });
            
            // Enriquecer com dados de pacientes
            const clinicasComStats = await Promise.all(
                results.map(async (clinica) => {
                    try {
                        const pacientesResponse = await this.apiCall(`/clinicas/${clinica.id}/pacientes`);
                        const pacientes = pacientesResponse.data || pacientesResponse;
                        return {
                            ...clinica,
                            totalPacientes: pacientes.length,
                            pacientesAtivos: pacientes.filter(p => p.status === 'ativo').length
                        };
                    } catch (error) {
                        return {
                            ...clinica,
                            totalPacientes: 0,
                            pacientesAtivos: 0
                        };
                    }
                })
            );
            
            this.displayClinicas(clinicasComStats);
            
            // Atualizar título com resultados da busca
            const titleElement = document.querySelector('#clinicas .page-title');
            if (titleElement) {
                titleElement.innerHTML = `<i class="bi bi-building text-primary me-2"></i>Clínicas - "${query}" (${results.length} encontradas)`;
            }
            
        } catch (error) {
            this.showError('Erro na busca de clínicas', error);
        } finally {
            this.hideLoading('#clinicas');
        }
    }

    // Exibir clínicas
    displayClinicas(clinicas) {
        const clinicasHtml = clinicas.map(clinica => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card clinica-card h-100" data-clinica-id="${clinica.id}">
                    <div class="clinica-header">
                        <i class="clinica-icon fas fa-hospital"></i>
                        <div class="clinica-name">${clinica.nome}</div>
                        <div class="clinica-code">Código: ${clinica.codigo}</div>
                    </div>
                    <div class="clinica-body">
                        <div class="clinica-stats">
                            <div class="text-center">
                                <strong>${clinica.totalPacientes || 0}</strong><br>
                                <small class="text-muted">Pacientes</small>
                            </div>
                            <div class="text-center">
                                <strong>${clinica.pacientesAtivos || 0}</strong><br>
                                <small class="text-muted">Ativos</small>
                            </div>
                        </div>
                        <div class="clinica-actions">
                            <button class="btn btn-primary btn-sm btn-clinica btn-ver-pacientes">
                                <i class="fas fa-users me-1"></i> Ver Pacientes
                            </button>
                            <button class="btn btn-outline-info btn-sm btn-clinica">
                                <i class="fas fa-info-circle me-1"></i> Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        $('#clinicasGrid').html(clinicasHtml);
    }

    // Selecionar clínica
    selectClinica(clinicaId) {
        $('.clinica-card').removeClass('selected');
        $(`.clinica-card[data-clinica-id="${clinicaId}"]`).addClass('selected');
        this.currentClinica = clinicaId;
    }

    // Ver pacientes da clínica
    viewPacientesClinica(clinicaId) {
        this.currentClinica = clinicaId;
        this.showSection('pacientes');
        this.updateNavigation('pacientes');
        this.loadPacientes();
    }

    // Carregar pacientes
    async loadPacientes() {
        try {
            this.showLoading('#pacientes');
            
            let response;
            console.log('Carregando pacientes para a clínica:', this.currentClinica);
            if (this.currentClinica) {
                // Usar endpoint específico para pacientes de uma clínica
                response = await this.apiCall(`/clinicas/${this.currentClinica}/pacientes`);
            } else {
                // Buscar todos os pacientes (não existe endpoint direto, precisamos buscar de todas as clínicas)
                const clinicasResponse = await this.apiCall('/clinicas');
                const clinicas = clinicasResponse.data || clinicasResponse;
                
                const todosPacientes = [];
                for (const clinica of clinicas) {
                    try {
                        const pacientesClinica = await this.apiCall(`/clinicas/${clinica.id}/pacientes`);
                        const pacientes = pacientesClinica.data || pacientesClinica;
                        
                        // Adicionar informação da clínica a cada paciente
                        pacientes.forEach(paciente => {
                            paciente.clinica_id = clinica.id;
                            paciente.clinica = clinica.nome;
                        });
                        
                        todosPacientes.push(...pacientes);
                    } catch (error) {
                        console.warn(`Erro ao carregar pacientes da clínica ${clinica.id}:`, error);
                    }
                }
                
                response = { data: todosPacientes };
            }
            console.log('Pacientes carregados:', response);
            const pacientes = response.data || response;
            
            // Simular paginação no frontend (já que a API retorna todos)
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedPacientes = pacientes.slice(startIndex, endIndex);
            const totalPages = Math.ceil(pacientes.length / this.pageSize);
            
            this.displayPacientes(paginatedPacientes);
            this.updatePagination(totalPages, this.currentPage);
            
            // Atualizar contadores
            this.updatePacientesCounter(pacientes.length, this.currentClinica);
            
        } catch (error) {
            this.showError('Erro ao carregar pacientes', error);
        } finally {
            this.hideLoading('#pacientes');
        }
    }

    // Atualizar contadores de pacientes
    updatePacientesCounter(total, clinicaId) {
        const titleElement = document.querySelector('#pacientes .page-title');
        if (titleElement) {
            if (clinicaId) {
                // Buscar nome da clínica
                this.apiCall('/clinicas').then(response => {
                    const clinicas = response.data || response;
                    const clinica = clinicas.find(c => c.id == clinicaId);
                    const clinicaName = clinica ? clinica.nome : 'Clínica Selecionada';
                    titleElement.textContent = `Pacientes - ${clinicaName} (${total})`;
                }).catch(error => {
                    console.error('Erro ao buscar nome da clínica:', error);
                    titleElement.textContent = `Pacientes - Clínica Selecionada (${total})`;
                });
            } else {
                titleElement.textContent = `Todos os Pacientes (${total})`;
            }
        }
    }

    // Exibir pacientes
    displayPacientes(pacientes) {
        console.log('Exibindo pacientes:', pacientes);
        if (!pacientes || pacientes.length === 0) {
            $('#pacientesList').html(`
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nenhum paciente encontrado</h5>
                    <p class="text-muted">Tente ajustar os filtros de busca.</p>
                </div>
            `);
            return;
        }

        const pacientesHtml = `
            <div class="table-responsive pacientes-table">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>CPF</th>
                            <th>Clínica</th>
                            <th>Status</th>
                            <th>Última Consulta</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pacientes.map(paciente => `
                            <tr>
                                <td data-label="Paciente">
                                    <div class="patient-name">${paciente.nome}</div>
                                    <div class="patient-info">
                                        <i class="fas fa-calendar me-1"></i> ${this.formatDate(paciente.detalhes.dadosBasicos.dataNascimento)}
                                        <i class="fas fa-phone ms-2 me-1"></i> ${paciente.detalhes.contatos.telefone || 'N/A'}
                                    </div>
                                </td>
                                <td data-label="CPF">${paciente.detalhes.dadosBasicos.cpf || 'N/A'}</td>
                                <td data-label="Clínica">${paciente.leito || 'N/A'}</td>
                                <td data-label="Status">
                                    <span class="badge badge-status ${this.getStatusClass(paciente.status)}">
                                        ${paciente.diasInternado || 'N/A'}
                                    </span>
                                </td>
                                <td data-label="Última Consulta">${this.formatDate(paciente.ultimaConsulta)}</td>
                                <td data-label="Ações">
                                    <button class="btn btn-sm btn-primary btn-ver-detalhes" 
                                            data-paciente-id="${paciente.prontuario}">
                                        <i class="fas fa-eye me-1"></i> Ver
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
                           
        $('#pacientesTable').html(pacientesHtml);
    }

    // Atualizar paginação
    updatePagination(totalPages, currentPage) {
        this.totalPages = totalPages;
        this.currentPage = currentPage;

        if (totalPages <= 1) {
            $('#paginationContainer').hide();
            return;
        }

        let paginationHtml = '<nav><ul class="pagination justify-content-center">';
        
        // Botão anterior
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        paginationHtml += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link pagination-btn" data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            const active = i === currentPage ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${active}">
                    <a class="page-link pagination-btn" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Botão próximo
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        paginationHtml += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link pagination-btn" data-page="${currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationHtml += '</ul></nav>';
        
        $('#paginationContainer').html(paginationHtml).show();
    }

    // Ver detalhes do paciente
    async viewPacienteDetails(pacienteId) {
        try {
            this.showLoading('#patientModal .modal-body');
            
            const paciente = await this.apiCall(`/pacientes/${pacienteId}`);
            console.log('Detalhes do paciente:', paciente);
            this.displayPacienteDetails(paciente);
            
            const modal = new bootstrap.Modal(document.getElementById('patientModal'));
            modal.show();
            
        } catch (error) {
            this.showError('Erro ao carregar detalhes do paciente', error);
        } finally {
            this.hideLoading('#patientModal .modal-body');
        }
    }

    // Exibir detalhes do paciente
    displayPacienteDetails(paciente) {
        const detailsHtml = `
            <div class="patient-detail-card">
                <div class="patient-detail-header">
                    <div class="d-flex align-items-center">
                        <div class="patient-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <h4 class="mb-1">${paciente.nome}</h4>
                            <p class="mb-0 opacity-75">CPF: ${paciente.cpf}</p>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="detail-row">
                                <div class="detail-label">Data de Nascimento</div>
                                <div class="detail-value">${this.formatDate(paciente.dataNascimento)}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Telefone</div>
                                <div class="detail-value">${paciente.telefone || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Email</div>
                                <div class="detail-value">${paciente.email || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Endereço</div>
                                <div class="detail-value">${paciente.endereco || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="detail-row">
                                <div class="detail-label">Clínica</div>
                                <div class="detail-value">${paciente.clinica}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Status</div>
                                <div class="detail-value">
                                    <span class="badge ${this.getStatusClass(paciente.status)}">
                                        ${paciente.status || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Última Consulta</div>
                                <div class="detail-value">${this.formatDate(paciente.ultimaConsulta)}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Observações</div>
                                <div class="detail-value">${paciente.observacoes || 'Nenhuma observação'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#patientModalBody').html(detailsHtml);
        $('#pacienteModalLabel').text(`Detalhes - ${paciente.nome}`);
    }

    // Buscar pacientes
    async searchPacientes(query) {
        if (!query.trim()) {
            this.currentPage = 1;
            this.loadPacientes();
            return;
        }

        try {
            this.showLoading('#pacientes');
            
            // Buscar todos os pacientes primeiro
            const todosPacientes = await this.apiCall('/pacientes');
            
            // Filtrar localmente
            const results = todosPacientes.filter(paciente => {
                const searchTerm = query.toLowerCase();
                return (
                    paciente.nome.toLowerCase().includes(searchTerm) ||
                    paciente.cpf.includes(query) ||
                    (paciente.clinica && paciente.clinica.toLowerCase().includes(searchTerm)) ||
                    (paciente.telefone && paciente.telefone.includes(query))
                );
            });
            
            // Paginar resultados
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedResults = results.slice(startIndex, endIndex);
            const totalPages = Math.ceil(results.length / this.pageSize);
            
            this.displayPacientes(paginatedResults);
            this.updatePagination(totalPages, this.currentPage);
            
            // Atualizar título com resultados da busca
            const titleElement = document.querySelector('#pacientes .page-title');
            if (titleElement) {
                titleElement.textContent = `Busca: "${query}" (${results.length} encontrados)`;
            }
            
        } catch (error) {
            this.showError('Erro na busca', error);
        } finally {
            this.hideLoading('#pacientes');
        }
    }

    // Configurar busca avançada
    setupAdvancedSearch() {
        // Carregar clínicas para o select
        this.loadClinicasForSearch();
    }

    // Carregar clínicas para busca
    async loadClinicasForSearch() {
        try {
            const response = await this.apiCall('/clinicas');
            const clinicas = response.data || response;
            const options = clinicas.map(clinica => 
                `<option value="${clinica.id}">${clinica.nome}</option>`
            ).join('');
            
            $('#searchClinica').html('<option value="">Todas as clínicas</option>' + options);
        } catch (error) {
            console.error('Erro ao carregar clínicas para busca:', error);
        }
    }

    // Carregar clínicas para seção de pacientes
    async loadClinicasForPacientesSection() {
        try {
            const response = await this.apiCall('/clinicas');
            const clinicas = response.data || response;
            const options = clinicas.map(clinica => 
                `<option value="${clinica.id}">${clinica.nome}</option>`
            ).join('');
            
            $('#clinicaSelect').html('<option value="">Todas as clínicas</option>' + options);
            
            // Se há uma clínica selecionada, manter a seleção
            if (this.currentClinica) {
                $('#clinicaSelect').val(this.currentClinica);
                $('#loadPacientesBtn, #statsClinicaBtn').prop('disabled', false);
            } else {
                $('#loadPacientesBtn, #statsClinicaBtn').prop('disabled', true);
            }
        } catch (error) {
            console.error('Erro ao carregar clínicas para seção de pacientes:', error);
            $('#clinicaSelect').html('<option value="">Erro ao carregar clínicas</option>');
        }
    }

    // Executar busca avançada
    async performAdvancedSearch() {
        const formData = new FormData(document.getElementById('searchForm'));
        const filters = {};

        // Coletar todos os filtros
        for (let [key, value] of formData.entries()) {
            if (value.trim()) {
                filters[key] = value.trim();
            }
        }

        try {
            this.showLoading('#searchResults');
            
            // Buscar todos os pacientes
            const todosPacientes = await this.apiCall('/pacientes');
            
            // Aplicar filtros
            const results = todosPacientes.filter(paciente => {
                let matches = true;
                
                // Filtrar por nome
                if (filters.nome) {
                    matches = matches && paciente.nome.toLowerCase().includes(filters.nome.toLowerCase());
                }
                
                // Filtrar por CPF
                if (filters.cpf) {
                    matches = matches && paciente.cpf.includes(filters.cpf);
                }
                
                // Filtrar por clínica
                if (filters.clinica) {
                    matches = matches && paciente.clinica_id == filters.clinica;
                }
                
                // Filtrar por telefone
                if (filters.telefone) {
                    matches = matches && paciente.telefone && paciente.telefone.includes(filters.telefone);
                }
                
                // Filtrar por status
                if (filters.status) {
                    matches = matches && paciente.status === filters.status;
                }
                
                // Filtrar por data de nascimento
                if (filters.dataNascimento) {
                    matches = matches && paciente.data_nascimento === filters.dataNascimento;
                }
                
                return matches;
            });
            
            this.displaySearchResults(results);
            
        } catch (error) {
            this.showError('Erro na busca avançada', error);
        } finally {
            this.hideLoading('#searchResults');
        }
    }

    // Exibir resultados da busca
    displaySearchResults(results) {
        if (results.length === 0) {
            $('#searchResults').html(`
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nenhum resultado encontrado</h5>
                    <p class="text-muted">Tente ajustar os critérios de busca.</p>
                </div>
            `);
            return;
        }

        const resultsHtml = `
            <div class="mb-3">
                <h6>Resultados da Busca (${results.length} encontrados)</h6>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>CPF</th>
                            <th>Clínica</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(paciente => `
                            <tr>
                                <td>${paciente.nome}</td>
                                <td>${paciente.cpf}</td>
                                <td>${paciente.clinica}</td>
                                <td>
                                    <span class="badge ${this.getStatusClass(paciente.status)}">
                                        ${paciente.status || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary btn-ver-detalhes" 
                                            data-paciente-id="${paciente.id}">
                                        <i class="fas fa-eye me-1"></i> Ver Detalhes
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        $('#searchResults').html(resultsHtml);
    }

    // Limpar filtros
    clearFilters() {
        this.currentClinica = null;
        this.currentPage = 1;
        $('#searchInput').val('');
        $('.clinica-card').removeClass('selected');
        
        // Resetar título
        const titleElement = document.querySelector('#pacientes .page-title');
        if (titleElement) {
            titleElement.textContent = 'Gerenciamento de Pacientes';
        }
        
        this.loadPacientes();
        this.showToast('Filtros limpos', 'info');
    }

    // Mostrar estatísticas da clínica
    async showClinicaStats(clinicaId) {
        try {
            this.showLoading('#pacientes');
            
            const [clinicaResponse, pacientesResponse] = await Promise.all([
                this.apiCall('/clinicas'),
                this.apiCall(`/clinicas/${clinicaId}/pacientes`)
            ]);
            
            const clinicas = clinicaResponse.data || clinicaResponse;
            const pacientes = pacientesResponse.data || pacientesResponse;
            const clinica = clinicas.find(c => c.id == clinicaId);
            
            if (!clinica) {
                this.showToast('Clínica não encontrada', 'error');
                return;
            }
            
            const stats = {
                totalPacientes: pacientes.length,
                pacientesAtivos: pacientes.filter(p => p.status === 'ativo').length,
                pacientesInativos: pacientes.filter(p => p.status === 'inativo').length,
                ultimosRegistros: pacientes.slice(-5).reverse()
            };
            
            const statsHtml = `
                <div class="alert alert-info">
                    <h5><i class="bi bi-graph-up me-2"></i>Estatísticas - ${clinica.nome}</h5>
                    <div class="row mt-3">
                        <div class="col-md-3">
                            <div class="text-center">
                                <h4 class="text-primary">${stats.totalPacientes}</h4>
                                <small>Total de Pacientes</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <h4 class="text-success">${stats.pacientesAtivos}</h4>
                                <small>Pacientes Ativos</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <h4 class="text-secondary">${stats.pacientesInativos}</h4>
                                <small>Pacientes Inativos</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <h4 class="text-info">${stats.ultimosRegistros.length}</h4>
                                <small>Últimos Registros</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Inserir estatísticas antes da lista de pacientes
            $('#pacientesList').before(statsHtml);
            
            this.showToast(`Estatísticas carregadas para ${clinica.nome}`, 'success');
            
        } catch (error) {
            this.showError('Erro ao carregar estatísticas', error);
        } finally {
            this.hideLoading('#pacientes');
        }
    }

    // Limpar busca
    clearSearch() {
        this.currentPage = 1;
        const titleElement = document.querySelector('#pacientes .page-title');
        if (titleElement) {
            if (this.currentClinica) {
                this.updatePacientesCounter(0, this.currentClinica);
            } else {
                titleElement.textContent = 'Gerenciamento de Pacientes';
            }
        }
        this.loadPacientes();
    }

    // Atualizar todos os dados
    async refreshAllData() {
        try {
            this.showToast('Atualizando dados...', 'info');
            this.cache.clear();
            
            await this.loadDashboard();
            
            const currentSection = $('.content-section.active').attr('id');
            if (currentSection === 'clinicas') {
                await this.loadClinicas();
            } else if (currentSection === 'pacientes') {
                await this.loadPacientes();
            }
            
            this.showToast('Dados atualizados com sucesso!', 'success');
        } catch (error) {
            this.showToast('Erro ao atualizar dados', 'error');
        }
    }

    // Exportar dados
    async exportData() {
        try {
            const response = await fetch(`${this.apiUrl}/export`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `hicd-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                this.showToast('Dados exportados com sucesso!', 'success');
            } else {
                throw new Error('Erro ao exportar dados');
            }
        } catch (error) {
            this.showToast('Erro ao exportar dados', 'error');
        }
    }

    // Verificar conexão com servidor
    async checkServerConnection() {
        try {
            await this.apiCall('/health');
            this.updateConnectionStatus(true);
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    // Atualizar status de conexão
    updateConnectionStatus(serverOnline = null) {
        const status = $('#connectionStatus');
        
        if (serverOnline === false || !this.isOnline) {
            status.removeClass('badge-success').addClass('badge-danger')
                  .html('<i class="fas fa-times-circle me-1"></i> Offline');
        } else {
            status.removeClass('badge-danger').addClass('badge-success')
                  .html('<i class="fas fa-check-circle me-1"></i> Online');
        }
    }

    // Mostrar indicador offline
    showOfflineIndicator() {
        if (!$('.offline-indicator').length) {
            $('body').prepend(`
                <div class="offline-indicator text-center">
                    <i class="fas fa-wifi me-2"></i>
                    Você está offline. Algumas funcionalidades podem estar limitadas.
                </div>
            `);
        }
    }

    // Ocultar indicador offline
    hideOfflineIndicator() {
        $('.offline-indicator').remove();
    }

    // Sincronizar dados offline
    async syncOfflineData() {
        // Implementar sincronização de dados offline quando necessário
        console.log('Sincronizando dados offline...');
    }

    // Mostrar botão de instalação
    showInstallButton() {
        $('#installApp').show();
    }

    // Chamada para API
    async apiCall(endpoint, options = {}) {
        const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
        
        // Verificar cache para requisições GET
        if (!options.method || options.method === 'GET') {
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
        }

        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Armazenar em cache para requisições GET
        if (!options.method || options.method === 'GET') {
            this.cache.set(cacheKey, data);
            // Limpar cache após 5 minutos
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        }

        return data;
    }

    // Utilitários
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return 'Data inválida';
        }
    }

    getStatusClass(status) {
        const statusMap = {
            'ativo': 'bg-success',
            'inativo': 'bg-secondary',
            'suspenso': 'bg-warning',
            'bloqueado': 'bg-danger'
        };
        
        return statusMap[status?.toLowerCase()] || 'bg-secondary';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // UI Helpers
    showLoading(selector) {
        $(selector).addClass('loading');
    }

    hideLoading(selector) {
        $(selector).removeClass('loading');
    }

    showToast(message, type = 'info') {
        const toastId = `toast_${Date.now()}`;
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert">
                <div class="toast-header">
                    <i class="fas ${iconMap[type]} me-2 text-${type}"></i>
                    <strong class="me-auto">HICD System</strong>
                    <small>agora</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        $('#toastContainer').append(toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            $(toastElement).remove();
        });
    }

    showError(title, error) {
        console.error(title, error);
        this.showToast(`${title}: ${error.message}`, 'error');
    }
}

// Inicializar aplicação quando DOM estiver pronto
$(document).ready(() => {
    window.hicdApp = new HICDApp();
});

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registrado: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW falhou: ', registrationError);
            });
    });
}
