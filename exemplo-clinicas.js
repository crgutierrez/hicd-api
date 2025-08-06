/**
 * Exemplo específico para buscar clínicas e pacientes do sistema HICD
 * 
 * Este arquivo demonstra como usar as novas funcionalidades para
 * extrair dados de clínicas e pacientes internados.
 */

const HICDCrawler = require('./hicd-crawler');

async function exemploClinicasPacientes() {
    console.log('🏥 Exemplo: Buscar Clínicas e Pacientes');
    console.log('=====================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // 1. Fazer login
        await crawler.login();
        
        // 2. Buscar todas as clínicas disponíveis
        console.log('\n📋 Buscando clínicas disponíveis...');
        const clinicas = await crawler.getClinicas();
        
        console.log(`\n✅ Encontradas ${clinicas.length} clínicas:`);
        clinicas.forEach((clinica, index) => {
            console.log(`${index + 1}. [${clinica.codigo}] ${clinica.nome}`);
        });
        
        // 3. Buscar pacientes de uma clínica específica (exemplo: primeira clínica)
        if (clinicas.length > 0) {
            const clinicaExemplo = clinicas[0];
            console.log(`\n👥 Buscando pacientes da clínica: ${clinicaExemplo.nome}`);
            
            const pacientes = await crawler.getPacientesClinica(clinicaExemplo.codigo);
            
            if (pacientes.length > 0) {
                console.log(`\n✅ Encontrados ${pacientes.length} pacientes:`);
                pacientes.forEach((paciente, index) => {
                    console.log(`${index + 1}. ${paciente.nome} - Leito: ${paciente.leito} - Prontuário: ${paciente.prontuario}`);
                });
            } else {
                console.log('❌ Nenhum paciente encontrado nesta clínica');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await crawler.logout();
    }
}

async function exemploTodasClinicas() {
    console.log('🏥 Exemplo: Buscar Pacientes de Todas as Clínicas');
    console.log('================================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // 1. Fazer login
        await crawler.login();
        
        // 2. Extrair dados de todas as clínicas (método principal)
        const todosPacientes = await crawler.extractData();
        
        console.log(`\n✅ Total de pacientes extraídos: ${todosPacientes.length}`);
        
        // 3. Agrupar por clínica
        const pacientesPorClinica = {};
        todosPacientes.forEach(paciente => {
            const clinica = paciente.clinicaNome;
            if (!pacientesPorClinica[clinica]) {
                pacientesPorClinica[clinica] = [];
            }
            pacientesPorClinica[clinica].push(paciente);
        });
        
        console.log('\n📊 Resumo por clínica:');
        Object.entries(pacientesPorClinica).forEach(([clinica, pacientes]) => {
            console.log(`• ${clinica}: ${pacientes.length} pacientes`);
        });
        
        // 4. Salvar dados
        await crawler.saveData(todosPacientes, 'json');
        await crawler.saveData(todosPacientes, 'csv');
        
        console.log('\n💾 Dados salvos com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await crawler.logout();
    }
}

async function exemploClinicaEspecifica() {
    console.log('🎯 Exemplo: Buscar Pacientes de Clínica Específica');
    console.log('=================================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // 1. Fazer login
        await crawler.login();
        
        // 2. Buscar clínicas
        const clinicas = await crawler.getClinicas();
        
        // 3. Escolher uma clínica específica (exemplo: UTI)
        const utiClinica = clinicas.find(c => 
            c.nome.toLowerCase().includes('uti') || 
            c.nome.toLowerCase().includes('u t i')
        );
        
        if (utiClinica) {
            console.log(`\n🏥 Foco na clínica: ${utiClinica.nome}`);
            
            // Buscar pacientes com diferentes filtros
            console.log('\n1. Todos os pacientes da UTI:');
            const todosPacientesUTI = await crawler.getPacientesClinica(utiClinica.codigo);
            console.log(`   Encontrados: ${todosPacientesUTI.length} pacientes`);
            
            // Buscar com filtro de nome (exemplo)
            console.log('\n2. Pacientes com filtro de nome "Silva":');
            const pacientesSilva = await crawler.getPacientesClinica(utiClinica.codigo, '', 'Silva');
            console.log(`   Encontrados: ${pacientesSilva.length} pacientes`);
            
            // Buscar ordenado por nome
            console.log('\n3. Pacientes ordenados por nome:');
            const pacientesOrdenados = await crawler.getPacientesClinica(utiClinica.codigo, '', '', 'N');
            console.log(`   Encontrados: ${pacientesOrdenados.length} pacientes`);
            
            // Mostrar detalhes dos primeiros 5 pacientes
            if (todosPacientesUTI.length > 0) {
                console.log('\n👥 Primeiros pacientes da UTI:');
                todosPacientesUTI.slice(0, 5).forEach((paciente, index) => {
                    console.log(`${index + 1}. ${paciente.nome}`);
                    console.log(`   Leito: ${paciente.leito}`);
                    console.log(`   Prontuário: ${paciente.prontuario}`);
                    console.log(`   Data Internação: ${paciente.dataInternacao}\n`);
                });
            }
            
        } else {
            console.log('❌ Clínica UTI não encontrada');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await crawler.logout();
    }
}

async function exemploMonitoramentoClinicas() {
    console.log('📈 Exemplo: Monitoramento de Clínicas');
    console.log('====================================');
    
    const crawler = new HICDCrawler();
    
    try {
        // 1. Fazer login
        await crawler.login();
        
        // 2. Buscar dados atuais
        const dadosAtuais = await crawler.extractData();
        
        // 3. Gerar relatório de ocupação
        const relatorioOcupacao = {};
        
        dadosAtuais.forEach(paciente => {
            const clinica = paciente.clinicaNome;
            if (!relatorioOcupacao[clinica]) {
                relatorioOcupacao[clinica] = {
                    total: 0,
                    pacientes: [],
                    leitosOcupados: new Set()
                };
            }
            
            relatorioOcupacao[clinica].total++;
            relatorioOcupacao[clinica].pacientes.push(paciente.nome);
            
            if (paciente.leito) {
                relatorioOcupacao[clinica].leitosOcupados.add(paciente.leito);
            }
        });
        
        console.log('\n📊 Relatório de Ocupação:');
        console.log('========================');
        
        Object.entries(relatorioOcupacao).forEach(([clinica, dados]) => {
            console.log(`\n🏥 ${clinica}:`);
            console.log(`   👥 Pacientes: ${dados.total}`);
            console.log(`   🛏️ Leitos ocupados: ${dados.leitosOcupados.size}`);
            
            if (dados.total > 10) {
                console.log('   🔴 Alta ocupação');
            } else if (dados.total > 5) {
                console.log('   🟡 Ocupação média');
            } else {
                console.log('   🟢 Baixa ocupação');
            }
        });
        
        // 4. Salvar relatório detalhado
        const relatorio = {
            timestamp: new Date().toISOString(),
            totalPacientes: dadosAtuais.length,
            totalClinicas: Object.keys(relatorioOcupacao).length,
            ocupacaoPorClinica: relatorioOcupacao,
            pacientesDetalhados: dadosAtuais
        };
        
        await crawler.saveData([relatorio], 'json');
        console.log('\n💾 Relatório de monitoramento salvo!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await crawler.logout();
    }
}

// Menu de exemplos
async function main() {
    const exemplos = [
        { name: 'Buscar Clínicas e Pacientes (Básico)', fn: exemploClinicasPacientes },
        { name: 'Extrair Todas as Clínicas', fn: exemploTodasClinicas },
        { name: 'Clínica Específica (UTI)', fn: exemploClinicaEspecifica },
        { name: 'Monitoramento de Ocupação', fn: exemploMonitoramentoClinicas }
    ];
    
    console.log('🏥 Exemplos Específicos - Clínicas HICD');
    console.log('======================================');
    console.log('Exemplos disponíveis:');
    
    exemplos.forEach((exemplo, index) => {
        console.log(`${index + 1}. ${exemplo.name}`);
    });
    
    // Para este exemplo, executar o primeiro (básico)
    console.log(`\n📋 Executando: ${exemplos[0].name}`);
    await exemplos[0].fn();
}

// Executar apenas se este arquivo for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    exemploClinicasPacientes,
    exemploTodasClinicas,
    exemploClinicaEspecifica,
    exemploMonitoramentoClinicas
};
