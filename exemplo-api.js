#!/usr/bin/env node

/**
 * Exemplo de uso da API HICD
 * 
 * Este arquivo demonstra como usar a API REST para:
 * 1. Listar clínicas
 * 2. Buscar pacientes por clínica
 * 3. Obter informações de um paciente específico
 */

const axios = require('axios');

// Configuração da API
const API_BASE_URL = 'http://localhost:3000/api';

// Cliente HTTP configurado
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Função utilitária para fazer requests com tratamento de erro
async function makeRequest(url, description) {
    try {
        console.log(`\n🔄 ${description}...`);
        console.log(`📡 GET ${API_BASE_URL}${url}`);
        
        const response = await api.get(url);
        console.log(`✅ Sucesso! Status: ${response.status}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Erro: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Dados:`, error.response.data);
        }
        return null;
    }
}

// Função principal de demonstração
async function demonstrarAPI() {
    console.log('🚀 Demonstração da API HICD');
    console.log('=' .repeat(50));

    // 1. Verificar saúde da API
    const health = await makeRequest('/health', 'Verificando saúde da API');
    if (!health) {
        console.log('❌ API não está respondendo. Certifique-se de que está rodando com: npm run api');
        return;
    }
    console.log('📊 Status da API:', health);

    // 2. Listar todas as clínicas
    const clinicas = await makeRequest('/clinicas', 'Listando todas as clínicas');
    if (clinicas && clinicas.success) {
        console.log(`📋 Encontradas ${clinicas.total} clínicas:`);
        clinicas.data.slice(0, 5).forEach((clinica, index) => {
            console.log(`   ${index + 1}. ${clinica.nome} (ID: ${clinica.id})`);
        });
        if (clinicas.total > 5) {
            console.log(`   ... e mais ${clinicas.total - 5} clínicas`);
        }
    }

    // 3. Buscar clínica específica
    const termoBusca = 'ENFERMARIA';
    const buscaClinicas = await makeRequest(
        `/clinicas/search?nome=${encodeURIComponent(termoBusca)}`, 
        `Buscando clínicas com o termo "${termoBusca}"`
    );
    if (buscaClinicas && buscaClinicas.success && buscaClinicas.data.length > 0) {
        console.log(`🔍 Encontradas ${buscaClinicas.total} clínicas:`);
        buscaClinicas.data.forEach((clinica, index) => {
            console.log(`   ${index + 1}. ${clinica.nome}`);
        });

        // 4. Listar pacientes da primeira clínica encontrada
        const primeiraClinica = buscaClinicas.data[0];
        const pacientesClinica = await makeRequest(
            `/clinicas/${encodeURIComponent(primeiraClinica.nome)}/pacientes`,
            `Listando pacientes da clínica "${primeiraClinica.nome}"`
        );
        
        if (pacientesClinica && pacientesClinica.success) {
            console.log(`👥 Encontrados ${pacientesClinica.total} pacientes na clínica "${primeiraClinica.nome}":`);
            pacientesClinica.data.slice(0, 3).forEach((paciente, index) => {
                console.log(`   ${index + 1}. ${paciente.nome} (Prontuário: ${paciente.prontuario}, Leito: ${paciente.leito})`);
            });
            
            if (pacientesClinica.total > 3) {
                console.log(`   ... e mais ${pacientesClinica.total - 3} pacientes`);
            }

            // 5. Obter detalhes de um paciente específico
            if (pacientesClinica.data.length > 0) {
                const primeiroPaciente = pacientesClinica.data[0];
                const detalhesPaciente = await makeRequest(
                    `/pacientes/${primeiroPaciente.prontuario}`,
                    `Obtendo detalhes do paciente ${primeiroPaciente.nome} (${primeiroPaciente.prontuario})`
                );
                
                if (detalhesPaciente && detalhesPaciente.success) {
                    console.log(`👤 Detalhes do paciente:`);
                    console.log(`   Nome: ${primeiroPaciente.nome}`);
                    console.log(`   Prontuário: ${primeiroPaciente.prontuario}`);
                    console.log(`   Leito: ${primeiroPaciente.leito}`);
                }

                // 6. Obter evoluções médicas do paciente
                const evolucoesPaciente = await makeRequest(
                    `/pacientes/${primeiroPaciente.prontuario}/evolucoes?limite=3&formato=resumido`,
                    `Obtendo evoluções médicas do paciente ${primeiroPaciente.prontuario}`
                );
                
                if (evolucoesPaciente && evolucoesPaciente.success) {
                    console.log(`📄 Evoluções médicas (${evolucoesPaciente.exibindo}/${evolucoesPaciente.total}):`);
                    evolucoesPaciente.data.forEach((evolucao, index) => {
                        console.log(`   ${index + 1}. Data: ${evolucao.data || 'N/A'}, Profissional: ${evolucao.profissional}`);
                        if (evolucao.resumo) {
                            console.log(`      Resumo: ${evolucao.resumo.substring(0, 100)}...`);
                        }
                    });
                }

                // 7. Obter análise clínica completa
                const analiseClinica = await makeRequest(
                    `/pacientes/${primeiroPaciente.prontuario}/analise`,
                    `Obtendo análise clínica completa do paciente ${primeiroPaciente.prontuario}`
                );
                
                if (analiseClinica && analiseClinica.success) {
                    const analise = analiseClinica.data;
                    console.log(`🏥 Análise clínica:`);
                    console.log(`   Total de evoluções: ${analise.totalEvolucoesMedicas}`);
                    if (analise.ultimaEvolucao) {
                        console.log(`   Última evolução: ${analise.ultimaEvolucao.profissional} (${analise.ultimaEvolucao.atividade})`);
                    }
                    if (analise.dadosClinicosUltimaEvolucao) {
                        const dados = analise.dadosClinicosUltimaEvolucao;
                        console.log(`   HDA: ${dados.hda ? 'Presente' : 'Ausente'}`);
                        console.log(`   Hipóteses diagnósticas: ${dados.hipotesesDiagnosticas ? dados.hipotesesDiagnosticas.length : 0}`);
                    }
                }
            }
        }
    }

    // 8. Demonstrar busca por leito
    const leito = '0-015.015-0001';
    const pacientePorLeito = await makeRequest(
        `/pacientes/search-leito?leito=${encodeURIComponent(leito)}`,
        `Buscando paciente no leito "${leito}"`
    );
    
    if (pacientePorLeito && pacientePorLeito.success) {
        console.log(`🛏️ Paciente encontrado no leito "${leito}":`);
        console.log(`   Nome: ${pacientePorLeito.data.nome}`);
        console.log(`   Prontuário: ${pacientePorLeito.data.prontuario}`);
    }

    console.log('\n🎉 Demonstração concluída!');
    console.log('\n📚 Para mais informações, acesse:');
    console.log(`   Documentação: ${API_BASE_URL.replace('/api', '')}/api/docs`);
    console.log(`   Health check: ${API_BASE_URL}/health`);
}

// Executar demonstração se o arquivo for chamado diretamente
if (require.main === module) {
    demonstrarAPI().catch(error => {
        console.error('❌ Erro na demonstração:', error.message);
        process.exit(1);
    });
}

module.exports = { demonstrarAPI };
