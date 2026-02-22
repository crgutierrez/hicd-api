/**
 * Exemplos práticos de uso dos novos parsers HICD
 * Demonstra como usar os recursos avançados
 */

const HICDParser = require('./hicd-parser');
const { TIPOS_EXAMES, TIPOS_EVOLUCAO } = require('./index');

// ============================================
// EXEMPLO 1: USO BÁSICO (COMPATÍVEL)
// ============================================

async function exemploBasico() {
    console.log('📝 Exemplo 1: Uso básico (compatível com versão anterior)\n');
    
    const parser = new HICDParser();
    
    // Simular HTML de clínicas
    const htmlClinicas = `
        <table class="clinic-table">
            <tr><td>001</td><td>Hospital Central</td></tr>
            <tr><td>002</td><td>Clínica Norte</td></tr>
        </table>
    `;
    
    // Parse tradicional
    const clinicas = parser.parseClinicas(htmlClinicas);
    console.log('Clínicas encontradas:', clinicas.length);
    
    // Parse de pacientes
    const htmlPacientes = `
        <table>
            <tr><td>12345</td><td>João Silva</td><td>15/03/1980</td></tr>
            <tr><td>67890</td><td>Maria Santos</td><td>22/07/1975</td></tr>
        </table>
    `;
    
    const pacientes = parser.parsePacientes(htmlPacientes, '001');
    console.log('Pacientes encontrados:', pacientes.length);
}

// ============================================
// EXEMPLO 2: PARSE AUTOMÁTICO
// ============================================

async function exemploParseAutomatico() {
    console.log('\n📝 Exemplo 2: Parse automático\n');
    
    const parser = new HICDParser();
    
    const htmlMisto = `
        <div>
            <h2>Lista de Clínicas</h2>
            <table class="clinic-table">
                <tr><td>001</td><td>Hospital Central</td></tr>
            </table>
        </div>
    `;
    
    // Parse automático detecta o tipo
    const resultado = parser.parseAuto(htmlMisto);
    console.log('Tipo detectado:', resultado.tipo);
    console.log('Dados encontrados:', resultado.dados.length, 'itens');
    
    // Estatísticas
    const stats = parser.getParseStats(resultado);
    console.log('Estatísticas:', stats);
}

// ============================================
// EXEMPLO 3: FILTROS AVANÇADOS
// ============================================

async function exemploFiltros() {
    console.log('\n📝 Exemplo 3: Filtros avançados\n');
    
    const parser = new HICDParser();
    
    // Dados de exemplo
    const pacientes = [
        {
            prontuario: '12345',
            nome: 'João Silva',
            dataNascimento: '1980-03-15T00:00:00.000Z',
            sexo: 'M',
            convenio: 'Unimed'
        },
        {
            prontuario: '67890',
            nome: 'Maria Santos',
            dataNascimento: '1975-07-22T00:00:00.000Z',
            sexo: 'F',
            convenio: 'Bradesco'
        },
        {
            prontuario: '11111',
            nome: 'Ana Silva',
            dataNascimento: '1990-01-10T00:00:00.000Z',
            sexo: 'F',
            convenio: 'Unimed'
        }
    ];
    
    // Filtro por sexo
    const mulheres = parser.filterPacientes(pacientes, { sexo: 'F' });
    console.log('Pacientes do sexo feminino:', mulheres.length);
    
    // Filtro por convênio
    const unimed = parser.filterPacientes(pacientes, { convenio: 'Unimed' });
    console.log('Pacientes Unimed:', unimed.length);
    
    // Filtro por nome
    const silvas = parser.filterPacientes(pacientes, { nome: 'Silva' });
    console.log('Pacientes com sobrenome Silva:', silvas.length);
    
    // Filtro por idade
    const adultos = parser.filterPacientes(pacientes, { 
        idadeMin: 30, 
        idadeMax: 50 
    });
    console.log('Pacientes entre 30 e 50 anos:', adultos.length);
}

// ============================================
// EXEMPLO 4: EXAMES COM AGRUPAMENTO
// ============================================

async function exemploExames() {
    console.log('\n📝 Exemplo 4: Exames com agrupamento\n');
    
    const parser = new HICDParser();
    
    // Dados de exemplo
    const exames = [
        {
            codigo: '001',
            nome: 'Hemograma Completo',
            tipo: TIPOS_EXAMES.LABORATORIAL,
            data: '2024-01-15T00:00:00.000Z',
            resultado: 'Normal'
        },
        {
            codigo: '002',
            nome: 'Raio-X Tórax',
            tipo: TIPOS_EXAMES.IMAGEM,
            data: '2024-01-20T00:00:00.000Z',
            resultado: 'Sem alterações'
        },
        {
            codigo: '003',
            nome: 'Cultura de Urina',
            tipo: TIPOS_EXAMES.MICROBIOLOGIA,
            data: '2024-01-25T00:00:00.000Z',
            resultado: 'Negativa'
        },
        {
            codigo: '004',
            nome: 'Glicemia',
            tipo: TIPOS_EXAMES.LABORATORIAL,
            data: '2024-02-01T00:00:00.000Z',
            resultado: '95 mg/dL'
        }
    ];
    
    // Agrupamento por tipo
    const agrupados = parser.groupExamesByTipo(exames);
    console.log('Exames agrupados por tipo:');
    Object.entries(agrupados).forEach(([tipo, lista]) => {
        console.log(`  ${tipo}: ${lista.length} exames`);
    });
    
    // Filtro por tipo
    const laboratoriais = parser.filterExamesByTipo(exames, TIPOS_EXAMES.LABORATORIAL);
    console.log('\nExames laboratoriais:', laboratoriais.length);
    
    // Filtro por período
    const janeiro = parser.filterExamesByPeriodo(exames, '2024-01-01', '2024-01-31');
    console.log('Exames de janeiro:', janeiro.length);
    
    // Busca por termo
    const hemogramas = parser.searchExames(exames, 'hemograma');
    console.log('Exames contendo "hemograma":', hemogramas.length);
}

// ============================================
// EXEMPLO 5: EVOLUÇÕES MÉDICAS
// ============================================

async function exemploEvolucoes() {
    console.log('\n📝 Exemplo 5: Evoluções médicas\n');
    
    const parser = new HICDParser();
    
    // Dados de exemplo
    const evolucoes = [
        {
            id: '001',
            data: '2024-01-15T10:00:00.000Z',
            profissional: 'Dr. João Silva',
            tipo: TIPOS_EVOLUCAO.CONSULTA,
            descricao: 'Paciente apresenta melhora do quadro'
        },
        {
            id: '002',
            data: '2024-01-16T14:30:00.000Z',
            profissional: 'Dra. Maria Santos',
            tipo: TIPOS_EVOLUCAO.EVOLUCAO,
            descricao: 'Evolução favorável, sem intercorrências'
        },
        {
            id: '003',
            data: '2024-01-17T09:15:00.000Z',
            profissional: 'Dr. João Silva',
            tipo: TIPOS_EVOLUCAO.INTERNACAO,
            descricao: 'Paciente internado para observação'
        }
    ];
    
    // Filtro por profissional
    const evolucoesDrJoao = parser.filterEvolucoesByProfissional(evolucoes, 'Dr. João Silva');
    console.log('Evoluções do Dr. João Silva:', evolucoesDrJoao.length);
    
    // Filtro por tipo
    const consultas = parser.filterEvolucoesByTipo(evolucoes, TIPOS_EVOLUCAO.CONSULTA);
    console.log('Consultas:', consultas.length);
    
    // Agrupamento por data
    const agrupadas = parser.groupEvolucoesByDate(evolucoes);
    console.log('Evoluções agrupadas por data:');
    Object.entries(agrupadas).forEach(([data, lista]) => {
        console.log(`  ${data}: ${lista.length} evoluções`);
    });
    
    // Profissionais únicos
    const profissionais = parser.getUniqueProfissionais(evolucoes);
    console.log('Profissionais únicos:', profissionais);
    
    // Busca por termo
    const melhorias = parser.searchEvolucoes(evolucoes, 'melhora');
    console.log('Evoluções mencionando "melhora":', melhorias.length);
}

// ============================================
// EXEMPLO 6: PARSERS ESPECIALIZADOS
// ============================================

async function exemploParserEspecializado() {
    console.log('\n📝 Exemplo 6: Uso de parsers especializados\n');
    
    const { ClinicaParser, PacienteParser, ExamesParser } = require('./index');
    
    // Parser especializado de clínicas
    const clinicaParser = new ClinicaParser();
    const htmlClinicas = '<table><tr><td>001</td><td>Hospital Central</td></tr></table>';
    
    const clinicas = clinicaParser.parse(htmlClinicas);
    console.log('Clínicas encontradas:', clinicas.length);
    
    // Busca específica
    const clinica001 = clinicaParser.findByCode(htmlClinicas, '001');
    console.log('Clínica 001:', clinica001?.nome);
    
    // Códigos disponíveis
    const codigos = clinicaParser.extractAvailableCodes(htmlClinicas);
    console.log('Códigos disponíveis:', codigos);
    
    // Parser especializado de pacientes
    const pacienteParser = new PacienteParser();
    pacienteParser.setDebugMode(false); // Desabilita debug para este parser
    
    const htmlPacientes = '<table><tr><td>12345</td><td>João Silva</td></tr></table>';
    const pacientes = pacienteParser.parse(htmlPacientes, '001');
    console.log('Pacientes encontrados:', pacientes.length);
}

// ============================================
// EXEMPLO 7: TRATAMENTO DE ERROS
// ============================================

async function exemploTratamentoErros() {
    console.log('\n📝 Exemplo 7: Tratamento de erros\n');
    
    const parser = new HICDParser();
    
    try {
        // HTML inválido
        parser.validateHTML('');
    } catch (error) {
        console.log('Erro capturado (HTML vazio):', error.message);
    }
    
    try {
        // HTML null
        parser.validateHTML(null);
    } catch (error) {
        console.log('Erro capturado (HTML null):', error.message);
    }
    
    try {
        // Parse com HTML válido
        parser.validateHTML('<html><body>Conteúdo válido</body></html>');
        console.log('✅ HTML válido passou na validação');
    } catch (error) {
        console.log('Erro inesperado:', error.message);
    }
}

// ============================================
// EXEMPLO 8: MODO DEBUG
// ============================================

async function exemploDebug() {
    console.log('\n📝 Exemplo 8: Modo debug\n');
    
    const parser = new HICDParser();
    
    const html = '<table><tr><td>001</td><td>Teste</td></tr></table>';
    
    // Parse com debug
    console.log('🔍 Com debug habilitado:');
    const resultado = parser.debugParse(html);
    
    console.log('\n🔇 Com debug desabilitado:');
    parser.setDebugMode(false);
    parser.parseAuto(html);
}

// ============================================
// EXECUÇÃO DOS EXEMPLOS
// ============================================

async function executarExemplos() {
    console.log('🚀 EXEMPLOS DOS NOVOS PARSERS HICD');
    console.log('=====================================\n');
    
    await exemploBasico();
    await exemploParseAutomatico();
    await exemploFiltros();
    await exemploExames();
    await exemploEvolucoes();
    await exemploParserEspecializado();
    await exemploTratamentoErros();
    await exemploDebug();
    
    console.log('\n✅ Todos os exemplos executados com sucesso!');
    console.log('\nPara mais informações, consulte o arquivo README.md');
}

// Executa se chamado diretamente
if (require.main === module) {
    executarExemplos().catch(console.error);
}

module.exports = {
    exemploBasico,
    exemploParseAutomatico,
    exemploFiltros,
    exemploExames,
    exemploEvolucoes,
    exemploParserEspecializado,
    exemploTratamentoErros,
    exemploDebug
};
