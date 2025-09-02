/**
 * Teste do modelo de Prescrição
 * Valida a criação e funcionamento dos models de prescrições
 */

const { Prescricao, MedicamentoPrescrito, ObservacaoPrescricao, DietaPrescrita } = require('./api/models/Prescricao');
const fs = require('fs');

async function testarModelPrescricao() {
    console.log('🧪 TESTE DO MODEL DE PRESCRIÇÃO');
    console.log('='.repeat(50));
    
    try {
        // Carregar dados de exemplo do parser
        let dadosParser;
        try {
            const dadosJson = await fs.promises.readFile('./test_parser_resultado.json', 'utf8');
            dadosParser = JSON.parse(dadosJson);
        } catch (error) {
            console.log('⚠️ Usando dados simulados (arquivo de teste não encontrado)');
            dadosParser = criarDadosSimulados();
        }
        
        // Simular dados da lista de prescrições
        const dadosLista = {
            id: "789123",
            codigo: "PM001",
            dataHora: "31/08/2025 09:29",
            pacienteNome: "SARA SILVA MOPES",
            registro: "40380",
            internacao: "INT001",
            enfLeito: "ENF-LEITO-01",
            clinica: "U T I",
            prontuario: "40380"
        };
        
        console.log('📄 Criando prescrição a partir dos dados do parser...');
        
        // Criar prescrição usando o método fromParserData
        const prescricao = Prescricao.fromParserData(dadosParser, dadosLista);
        
        if (!prescricao) {
            throw new Error('Falha ao criar prescrição a partir dos dados do parser');
        }
        
        console.log('✅ Prescrição criada com sucesso!');
        
        // Testar métodos da prescrição
        console.log('\n📊 DADOS DA PRESCRIÇÃO:');
        console.log('='.repeat(30));
        
        console.log('📋 Informações Básicas:');
        console.log(`   • ID: ${prescricao.id}`);
        console.log(`   • Código: ${prescricao.codigo}`);
        console.log(`   • Data/Hora: ${prescricao.dataHora}`);
        console.log(`   • Válida para: ${prescricao.validaPara}`);
        
        console.log('\n👤 Dados do Paciente:');
        console.log(`   • Nome: ${prescricao.paciente.nome}`);
        console.log(`   • Prontuário: ${prescricao.paciente.prontuario}`);
        console.log(`   • Idade: ${prescricao.paciente.idade}`);
        console.log(`   • Leito: ${prescricao.paciente.leito}`);
        console.log(`   • Peso: ${prescricao.paciente.peso}`);
        
        console.log('\n🏥 Dados da Internação:');
        console.log(`   • Clínica: ${prescricao.internacao.clinica}`);
        console.log(`   • Hospital: ${prescricao.internacao.hospital}`);
        
        console.log('\n👨‍⚕️ Dados do Médico:');
        console.log(`   • Nome: ${prescricao.medico.nome}`);
        console.log(`   • CRM: ${prescricao.medico.crm}`);
        console.log(`   • Data Assinatura: ${prescricao.medico.dataAssinatura}`);
        
        // Testar métodos de consulta
        console.log('\n🔍 TESTANDO MÉTODOS DE CONSULTA:');
        console.log('='.repeat(35));
        
        // Buscar medicamentos
        const medicamentosBuscados = prescricao.buscarMedicamento('MEROPENEM');
        console.log(`📊 Busca por 'MEROPENEM': ${medicamentosBuscados.length} resultado(s)`);
        
        // Agrupar observações
        const observacoesAgrupadas = prescricao.agruparObservacoesPorTipo();
        console.log(`📊 Observações por tipo: ${Object.keys(observacoesAgrupadas).length} tipo(s)`);
        Object.entries(observacoesAgrupadas).forEach(([tipo, lista]) => {
            console.log(`   • ${tipo}: ${lista.length} observação(ões)`);
        });
        
        // Medicamentos não padronizados
        const medicamentosNP = prescricao.obterMedicamentosNaoPadronizados();
        console.log(`📊 Medicamentos não padronizados: ${medicamentosNP.length}`);
        
        // Testar validação
        console.log(`📊 Prescrição válida: ${prescricao.isValid() ? 'Sim' : 'Não'}`);
        
        // Testar diferentes formatos de saída
        console.log('\n📤 TESTANDO FORMATOS DE SAÍDA:');
        console.log('='.repeat(30));
        
        const resumo = prescricao.toResumo();
        console.log(`✅ Resumo gerado - ${resumo.resumo.totalMedicamentos} medicamentos`);
        
        const completo = prescricao.toCompleto();
        console.log(`✅ Dados completos gerados - ${completo.medicamentos.length} medicamentos detalhados`);
        
        const medicamentos = prescricao.toMedicamentos();
        console.log(`✅ Relatório de medicamentos gerado - ${medicamentos.resumoEstatistico.vias.length} vias diferentes`);
        
        const cuidados = prescricao.toCuidados();
        console.log(`✅ Relatório de cuidados gerado - ${cuidados.resumoEstatistico.tiposObservacoes} tipos de observações`);
        
        // Testar models individuais
        console.log('\n🧩 TESTANDO MODELS INDIVIDUAIS:');
        console.log('='.repeat(35));
        
        // Teste MedicamentoPrescrito
        const medicamento = new MedicamentoPrescrito({
            nome: 'TESTE MEDICAMENTO 500MG',
            dose: '500mg',
            via: 'VO',
            intervalo: '8/8h',
            observacao: 'Após refeições'
        });
        console.log(`✅ MedicamentoPrescrito: ${medicamento.isValid() ? 'Válido' : 'Inválido'}`);
        
        // Teste ObservacaoPrescricao
        const observacao = new ObservacaoPrescricao({
            tipo: 'Cuidado Especial',
            descricao: 'Monitorar sinais vitais de 4/4h',
            prioridade: 'alta'
        });
        console.log(`✅ ObservacaoPrescricao: ${observacao.isValid() ? 'Válida' : 'Inválida'}`);
        
        // Teste DietaPrescrita
        const dieta = new DietaPrescrita({
            numero: '1',
            descricao: 'Dieta enteral via sonda',
            tipo: 'enteral'
        });
        console.log(`✅ DietaPrescrita: ${dieta.isValid() ? 'Válida' : 'Inválida'}`);
        
        // Salvar exemplo de saída JSON
        const exemploSaida = {
            resumo: prescricao.toResumo(),
            completo: prescricao.toCompleto(),
            medicamentos: prescricao.toMedicamentos(),
            cuidados: prescricao.toCuidados()
        };
        
        await fs.promises.writeFile('./test_model_prescricao_resultado.json', JSON.stringify(exemploSaida, null, 2), 'utf8');
        console.log('\n💾 Exemplo de saída salvo em: ./test_model_prescricao_resultado.json');
        
        // Estatísticas finais
        console.log('\n📈 ESTATÍSTICAS FINAIS:');
        console.log('='.repeat(25));
        console.log(`📊 Total de medicamentos: ${prescricao.metadata.totalMedicamentos}`);
        console.log(`📊 Total de dietas: ${prescricao.metadata.totalDietas}`);
        console.log(`📊 Total de observações: ${prescricao.metadata.totalObservacoes}`);
        console.log(`📊 Total de assinaturas: ${prescricao.metadata.totalAssinaturas}`);
        
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        return true;
        
    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        console.error(error.stack);
        return false;
    }
}

function criarDadosSimulados() {
    return {
        id: "TEST_123",
        cabecalho: {
            pacienteNome: "PACIENTE TESTE",
            registro: "40380",
            prontuario: "40380",
            leito: "0070005",
            dataNascimento: "02/06/2025",
            idade: "2 meses",
            peso: "4,330 Kg",
            dataInternacao: "13/07/2025",
            clinica: "U T I",
            dataPrescricao: "31/08/2025",
            hospital: "Hospital Teste",
            medico: "DR. TESTE MEDICO",
            crm: "12345",
            dataAssinatura: "31/08/2025 09:29"
        },
        medicamentos: [
            {
                nome: "DIPIRONA 500MG",
                dose: "500mg",
                via: "VO",
                intervalo: "6/6h",
                observacao: "Se dor ou febre"
            },
            {
                nome: "OMEPRAZOL 20MG",
                dose: "20mg",
                via: "VO",
                intervalo: "24/24h",
                observacao: "Em jejum"
            }
        ],
        dietas: [
            {
                numero: "1",
                descricao: "Dieta geral"
            }
        ],
        observacoes: [
            {
                tipo: "Cuidado Geral",
                descricao: "Monitorar sinais vitais"
            },
            {
                tipo: "Cuidado Especial",
                descricao: "Observar reações adversas"
            }
        ],
        assinaturas: ["DR. TESTE MEDICO", "CRM 12345"]
    };
}

// Executar teste
if (require.main === module) {
    testarModelPrescricao().then(sucesso => {
        if (sucesso) {
            console.log('\n🎉 Model de Prescrição funcionando corretamente!');
            process.exit(0);
        } else {
            console.log('\n💥 Falha no teste do model!');
            process.exit(1);
        }
    });
}

module.exports = { testarModelPrescricao };
