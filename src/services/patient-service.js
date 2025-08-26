/**
 * Serviço para buscar e gerenciar dados de pacientes
 */
class PatientService {
    constructor(httpClient, parser) {
        this.httpClient = httpClient;
        this.parser = parser;
    }

    /**
     * Busca as clínicas disponíveis no sistema
     */
    async getClinicas() {
        console.log('[CLÍNICAS] Buscando clínicas disponíveis...');

        try {
            const urls = this.httpClient.getUrls();
            
            // Preparar dados da requisição para buscar clínicas
            const clinicasData = new URLSearchParams({
                'Param': 'SIGHO',
                'ParamModule': '2904'
            });

            // Fazer requisição para buscar clínicas
            const clinicasResponse = await this.httpClient.post(urls.login, clinicasData, {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://hicd-hospub.sesau.ro.gov.br',
                    'Referer': urls.index,
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Requested-With': 'XMLHttpRequest',
                    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Linux"'
                }
            });

            // Parse do HTML de resposta para extrair as clínicas
            const clinicas = this.parser.parseClinicas(clinicasResponse.data);
            
            console.log(`[CLÍNICAS] ✅ Encontradas ${clinicas.length} clínicas disponíveis`);
            
            // Log das clínicas encontradas
            if (clinicas.length > 0) {
                console.log('[CLÍNICAS] Lista de clínicas:');
                clinicas.forEach(clinica => {
                    console.log(`  • ${clinica.codigo}: ${clinica.nome}`);
                });
            }

            return clinicas;

        } catch (error) {
            console.error('[CLÍNICAS] Erro ao buscar clínicas:', error.message);
            throw error;
        }
    }

    /**
     * Busca todos os pacientes de todas as clínicas
     */
    async buscarPacientes() {
        console.log('[BUSCAR PACIENTES] Buscando todos os pacientes do sistema...');
        
        try {
            // Buscar todas as clínicas
            const clinicas = await this.getClinicas();
            const todosPacientes = [];

            if (clinicas.length === 0) {
                console.log('[BUSCAR PACIENTES] ❌ Nenhuma clínica encontrada');
                return [];
            }

            // Para cada clínica, buscar os pacientes
            for (let i = 0; i < clinicas.length; i++) {
                const clinica = clinicas[i];
                console.log(`[BUSCAR PACIENTES] Processando clínica ${i+1}/${clinicas.length}: ${clinica.nome}`);
                console.log(`[BUSCAR PACIENTES] Código da clínica: ${clinica.codigo}`);
                try {
                    const pacientes = await this.getPacientesClinica(clinica.codigo);
                    
                    // Adicionar informação da clínica a cada paciente
                    pacientes.forEach(p => {
                        p.clinicaCodigo = clinica.codigo;
                        p.clinicaNome = clinica.nome;
                    });
                    
                    todosPacientes.push(...pacientes);
                    console.log(`[BUSCAR PACIENTES] ${pacientes.length} pacientes encontrados na ${clinica.nome}`);
                    
                    // Delay entre requisições para evitar sobrecarga
                    if (i < clinicas.length - 1) {
                        await this.httpClient.delay(1500);
                    }
                    
                } catch (error) {
                    console.error(`[BUSCAR PACIENTES] Erro ao buscar pacientes da clínica ${clinica.nome}:`, error.message);
                    // Continuar com as outras clínicas mesmo se uma falhar
                    continue;
                }
            }

            console.log(`[BUSCAR PACIENTES] ✅ Total: ${todosPacientes.length} pacientes encontrados em ${clinicas.length} clínicas`);
            return todosPacientes;

        } catch (error) {
            console.error('[BUSCAR PACIENTES] Erro ao buscar pacientes:', error.message);
            throw error;
        }
    }

    /**
     * Busca pacientes de uma clínica específica
     */
    async getPacientesClinica(codigoClinica, referencia = '', filtroNome = '', ordem = '') {
        console.log(`[PACIENTES] Buscando pacientes da clínica ${codigoClinica}...`);

        try {
            const urls = this.httpClient.getUrls();
            
            // Preparar dados para busca de pacientes
            const pacientesData = new URLSearchParams({
                'Param': 'SIGHO',
                'ParamModule': '544',
                'idPai': 'Do581',
                'clinica': codigoClinica,
                'nome': filtroNome,
                'selRefClinica': referencia,
                'selOrderInter': ordem
            });

            console.log(`[PACIENTES] Parâmetros da busca: ${pacientesData.toString()}`);

            // Fazer requisição para buscar pacientes
            const pacientesResponse = await this.httpClient.post(urls.login, pacientesData, {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://hicd-hospub.sesau.ro.gov.br',
                    'Referer': urls.index,
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Requested-With': 'XMLHttpRequest',
                    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Linux"'
                }
            });

            console.log(`[PACIENTES] Resposta recebida - tamanho: ${pacientesResponse.data.length} caracteres`);

            // Parse do HTML de resposta para extrair os pacientes
            const pacientes = this.parser.parsePacientes(pacientesResponse.data, codigoClinica);

            console.log(`[PACIENTES] ✅ Encontrados ${pacientes.length} pacientes na clínica ${codigoClinica}`);
            
            // Log detalhado dos primeiros pacientes para debug
            if (pacientes.length > 0) {
                console.log('[PACIENTES] Primeiros pacientes encontrados:');
                pacientes.slice(0, 3).forEach((p, i) => {
                    console.log(`  ${i+1}. ${p.nome} - Prontuário: ${p.prontuario} - Leito: ${p.leito} - Dias: ${p.diasInternacao}`);
                });
            }

            return pacientes;

        } catch (error) {
            console.error(`[PACIENTES] Erro ao buscar pacientes da clínica ${codigoClinica}:`, error.message);
            
            // Log adicional para debug
            if (error.response) {
                console.error(`[PACIENTES] Status da resposta: ${error.response.status}`);
                console.error(`[PACIENTES] Dados da resposta: ${error.response.data?.substring(0, 200)}...`);
            }
            
            return [];
        }
    }

    /**
     * Busca pacientes por leito específico
     */
    async buscarPacientePorLeito(leitoDesejado) {
        console.log(`[BUSCA LEITO] Procurando paciente no leito ${leitoDesejado}...`);

        try {
            // Normalizar o formato do leito (ex: "G7" -> possíveis formatos do sistema)
            const leitoFormatado = this.formatarLeito(leitoDesejado);
            console.log(`[BUSCA LEITO] Formatos de busca: ${leitoFormatado.join(', ')}`);

            // Primeiro tentar buscar em todas as clínicas para encontrar o paciente
            const clinicas = await this.getClinicas();
            let pacientesEncontrados = [];

            for (const clinica of clinicas) {
                const pacientes = await this.getPacientesClinica(clinica.codigo);
                
                // Verificar se algum paciente está no leito desejado
                const pacientesNoLeito = pacientes.filter(p => {
                    return leitoFormatado.some(formato => this.compararLeitos(p.leito, formato));
                });
                
                if (pacientesNoLeito.length > 0) {
                    pacientesNoLeito.forEach(p => {
                        p.clinicaCodigo = clinica.codigo;
                        p.clinicaNome = clinica.nome;
                    });
                    pacientesEncontrados.push(...pacientesNoLeito);
                }
                
                await this.httpClient.delay(1000);
            }

            if (pacientesEncontrados.length === 0) {
                console.log(`[BUSCA LEITO] ❌ Nenhum paciente encontrado no leito ${leitoDesejado}`);
                return [];
            }

            console.log(`[BUSCA LEITO] ✅ Total: ${pacientesEncontrados.length} paciente(s) encontrado(s) no leito ${leitoDesejado}`);
            
            // Log detalhado dos pacientes encontrados
            pacientesEncontrados.forEach((paciente, index) => {
                console.log(`[BUSCA LEITO] Paciente ${index+1}: ${paciente.nome} (${paciente.prontuario}) - Clínica: ${paciente.clinicaNome} - Leito: ${paciente.leito}`);
            });

            return pacientesEncontrados;

        } catch (error) {
            console.error(`[BUSCA LEITO] Erro ao buscar paciente no leito ${leitoDesejado}:`, error.message);
            throw error;
        }
    }

    /**
     * Formatar leito para diferentes possibilidades do sistema
     */
    formatarLeito(leito) {
        const formatos = [];
        
        // Formato original
        formatos.push(leito);
        
        // Se for formato tipo "G7" (letra + número)
        const match = leito.match(/^([A-Z])(\d+)$/i);
        if (match) {
            const letra = match[1].toUpperCase();
            const numero = match[2];
            
            // Possíveis formatos baseados no que vi nos dados:
            // 012.012-0007 (ENFERMARIA G seria código 012)
            const codigoEnfermaria = this.getCodigoEnfermaria(letra);
            if (codigoEnfermaria) {
                formatos.push(`${codigoEnfermaria}.${codigoEnfermaria}-${numero.padStart(4, '0')}`);
                formatos.push(`${codigoEnfermaria}-${numero}`);
                formatos.push(`${letra}${numero}`);
            }
        }
        
        // Adicionar variações com zero padding
        if (/\d+$/.test(leito)) {
            const numero = leito.match(/(\d+)$/)[1];
            const prefixo = leito.replace(/\d+$/, '');
            formatos.push(`${prefixo}${numero.padStart(2, '0')}`);
            formatos.push(`${prefixo}${numero.padStart(3, '0')}`);
            formatos.push(`${prefixo}${numero.padStart(4, '0')}`);
        }

        return [...new Set(formatos)]; // Remove duplicatas
    }

    /**
     * Mapear letra da enfermaria para código do sistema
     */
    getCodigoEnfermaria(letra) {
        const mapeamento = {
            'A': '008', // ENFERMARIA A
            'B': '009', // ENFERMARIA B  
            'C': '010', // ENFERMARIA C
            'D': '011', // ENFERMARIA D
            'G': '012', // ENFERMARIA G
            'H': '013', // ENFERMARIA H
            'J': '015', // ENFERMARIA J
            'K': '016', // ENFERMARIA K
            'L': '017', // ENFERMARIA L
            'M': '018'  // ENFERMARIA M
        };
        
        return mapeamento[letra.toUpperCase()] || null;
    }

    /**
     * Comparar leitos de forma mais inteligente
     */
    compararLeitos(leitoSistema, leitoBusca) {
        if (!leitoSistema || !leitoBusca) return false;
        
        // Remover espaços e converter para maiúsculo
        const sistema = leitoSistema.replace(/\s+/g, '').toUpperCase();
        const busca = leitoBusca.replace(/\s+/g, '').toUpperCase();
        
        // Verificar se o leito de busca está contido no leito do sistema
        return sistema.includes(busca) || busca.includes(sistema);
    }
}

module.exports = PatientService;
