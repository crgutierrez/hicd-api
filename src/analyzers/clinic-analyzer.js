const fs = require('fs').promises;
const path = require('path');

/**
 * Analisador de clínicas - responsável pela análise completa de clínicas específicas
 */
class ClinicAnalyzer {
    constructor(patientService, evolutionService, clinicalExtractor) {
        this.patientService = patientService;
        this.evolutionService = evolutionService;
        this.clinicalExtractor = clinicalExtractor;
    }

    /**
     * Analisa todos os pacientes de uma clínica específica extraindo dados clínicos da última evolução médica
     */
    async analisarClinica(nomeClinica, opcoes = {}) {
        const {
            salvarArquivo = true,
            incluirDetalhes = true,
            diretorioSaida = 'output'
        } = opcoes;

        console.log(`🏥 ANÁLISE COMPLETA - ${nomeClinica.toUpperCase()}`);
        console.log('='.repeat(60));
        
        try {
            // Buscar todos os pacientes
            console.log('🔍 BUSCANDO PACIENTES DA CLÍNICA');
            console.log('-'.repeat(40));
            
            const todosPacientes = await this.patientService.buscarPacientes();
            
            // Filtrar pacientes da clínica específica
            const pacientesClinica = this.filtrarPacientesPorClinica(todosPacientes, nomeClinica);
            
            console.log(`📋 Encontrados ${pacientesClinica.length} pacientes na ${nomeClinica}\n`);
            
            if (pacientesClinica.length === 0) {
                const resultado = {
                    clinica: nomeClinica,
                    dataAnalise: new Date().toISOString(),
                    totalPacientes: 0,
                    pacientesAnalisados: 0,
                    sucessos: 0,
                    falhas: 0,
                    pacientesComHDA: 0,
                    pacientesComDiagnosticos: 0,
                    resultados: [],
                    resumo: 'Nenhum paciente encontrado na clínica especificada'
                };
                
                console.log('❌ Nenhum paciente encontrado na clínica especificada');
                return resultado;
            }
            
            const resultados = [];
            let sucessos = 0;
            let falhas = 0;
            
            // Analisar cada paciente
            for (let i = 0; i < pacientesClinica.length; i++) {
                const paciente = pacientesClinica[i];
                console.log(`\n📋 PACIENTE ${i+1}/${pacientesClinica.length} - Leito: ${paciente.clinicaLeito}`);
                console.log('-'.repeat(50));
                console.log(`• Prontuário: ${paciente.prontuario}`);
                console.log(`• Nome: ${paciente.nome}`);
                console.log(`• Leito: ${paciente.clinicaLeito}`);
                
                try {
                    console.log(`🔬 Extraindo dados clínicos...`);
                    const analise = await this.analisarPaciente(paciente.prontuario);
                    
                    if (analise) {
                        sucessos++;
                        this.logAnaliseSuccesso(analise);
                        
                        resultados.push({
                            paciente: this.extrairDadosPaciente(paciente),
                            analise: incluirDetalhes ? analise : this.resumirAnalise(analise),
                            status: 'sucesso'
                        });
                    } else {
                        falhas++;
                        console.log(`❌ Falha na análise - nenhum dado extraído`);
                        resultados.push({
                            paciente: this.extrairDadosPaciente(paciente),
                            analise: null,
                            erro: 'Falha na extração de dados clínicos',
                            status: 'falha'
                        });
                    }
                    
                } catch (error) {
                    falhas++;
                    console.log(`❌ Erro na análise: ${error.message}`);
                    resultados.push({
                        paciente: this.extrairDadosPaciente(paciente),
                        analise: null,
                        erro: error.message,
                        status: 'erro'
                    });
                }
                
                // Pausa entre análises para evitar sobrecarga
                if (i < pacientesClinica.length - 1) {
                    console.log('⏳ Aguardando antes da próxima análise...');
                    await this.delay(2000);
                }
            }
            
            // Gerar relatório
            const relatorio = this.gerarRelatorio(nomeClinica, pacientesClinica, resultados, sucessos, falhas);
            
            // Salvar arquivo se solicitado
            if (salvarArquivo) {
                await this.salvarRelatorio(relatorio, diretorioSaida);
            }
            
            // Exibir resumo
            this.exibirResumo(relatorio);
            
            return relatorio;
            
        } catch (error) {
            console.error('❌ Erro durante análise da clínica:', error.message);
            throw error;
        }
    }

    /**
     * Analisa um paciente específico
     */
    async analisarPaciente(prontuario) {
        try {
            const evolucoes = await this.evolutionService.getEvolucoes(prontuario);
            return await this.clinicalExtractor.extrairDadosClinicosUltimaEvolucao(evolucoes);
        } catch (error) {
            console.error(`❌ Erro ao analisar paciente ${prontuario}:`, error.message);
            return null;
        }
    }

    /**
     * Filtra pacientes por clínica específica
     */
    filtrarPacientesPorClinica(todosPacientes, nomeClinica) {
        return todosPacientes.filter(p => {
            // Verificar por nome da clínica
            if (p.clinicaNome && p.clinicaNome.toUpperCase().includes(nomeClinica.toUpperCase())) {
                return true;
            }
            
            // Verificar por leito (formato: 012.012-0007 para ENFERMARIA G)
            if (p.leito && p.leito.toUpperCase().includes(nomeClinica.toUpperCase())) {
                return true;
            }
            
            // Verificar por clinicaLeito se existir
            if (p.clinicaLeito && p.clinicaLeito.toUpperCase().includes(nomeClinica.toUpperCase())) {
                return true;
            }
            
            // Mapeamento específico para enfermarias
            const mapeamentoEnfermarias = {
                'ENFERMARIA G': ['012.012', 'ENFERMARIA G'],
                'ENFERMARIA A': ['008.008', 'ENFERMARIA A'],
                'ENFERMARIA B': ['009.009', 'ENFERMARIA B'],
                'ENFERMARIA C': ['010.010', 'ENFERMARIA C'],
                'ENFERMARIA D': ['011.011', 'ENFERMARIA D'],
                'ENFERMARIA H': ['013.013', 'ENFERMARIA H'],
                'ENFERMARIA J': ['015.015', 'ENFERMARIA J'],
                'ENFERMARIA K': ['016.016', 'ENFERMARIA K'],
                'ENFERMARIA L': ['017.017', 'ENFERMARIA L'],
                'ENFERMARIA M': ['018.018', 'ENFERMARIA M'],
                'UTI': ['007.007', 'U T I'],
                'CIP': ['002.002', 'C I P']
            };
            
            const padroes = mapeamentoEnfermarias[nomeClinica.toUpperCase()];
            if (padroes) {
                return padroes.some(padrao => {
                    return (p.leito && p.leito.includes(padrao)) ||
                           (p.clinicaNome && p.clinicaNome.toUpperCase().includes(padrao.toUpperCase())) ||
                           (p.clinicaLeito && p.clinicaLeito.includes(padrao));
                });
            }
            
            return false;
        });
    }

    /**
     * Extrai dados básicos do paciente
     */
    extrairDadosPaciente(paciente) {
        return {
            prontuario: paciente.prontuario,
            nome: paciente.nome,
            leito: paciente.clinicaLeito,
            idade: paciente.idade,
            sexo: paciente.sexo
        };
    }

    /**
     * Resume a análise para relatório simplificado
     */
    resumirAnalise(analise) {
        return {
            hda: analise.hda ? 'Encontrada' : null,
            hipotesesDiagnosticas: analise.hipotesesDiagnosticas?.length || 0,
            profissionalResponsavel: analise.profissionalResponsavel,
            dataUltimaEvolucao: analise.dataUltimaEvolucao,
            totalEvolucoesMedicas: analise.totalEvolucoesMedicas
        };
    }

    /**
     * Log de sucesso da análise
     */
    logAnaliseSuccesso(analise) {
        console.log(`✅ Análise realizada:`);
        console.log(`   • HDA: ${analise.hda ? 'Encontrada' : 'Não encontrada'}`);
        console.log(`   • Hipóteses diagnósticas: ${analise.hipotesesDiagnosticas?.length || 0}`);
        console.log(`   • Profissional: ${analise.profissionalResponsavel || 'N/A'}`);
        console.log(`   • Data última evolução: ${analise.dataUltimaEvolucao || 'N/A'}`);
        
        if (analise.totalEvolucoesMedicas !== undefined) {
            console.log(`   • Total evoluções médicas: ${analise.totalEvolucoesMedicas}`);
        }
    }

    /**
     * Gera relatório completo da análise
     */
    gerarRelatorio(nomeClinica, pacientesClinica, resultados, sucessos, falhas) {
        // Calcular estatísticas
        const pacientesComHDA = resultados.filter(r => 
            r.analise && (r.analise.hda || (typeof r.analise.hda === 'string' && r.analise.hda !== 'Não encontrada'))
        ).length;
        
        const pacientesComDiagnosticos = resultados.filter(r => 
            r.analise && r.analise.hipotesesDiagnosticas && 
            (Array.isArray(r.analise.hipotesesDiagnosticas) ? 
                r.analise.hipotesesDiagnosticas.length > 0 : 
                r.analise.hipotesesDiagnosticas > 0)
        ).length;
        
        return {
            clinica: nomeClinica,
            dataAnalise: new Date().toISOString(),
            totalPacientes: pacientesClinica.length,
            pacientesAnalisados: resultados.length,
            sucessos: sucessos,
            falhas: falhas,
            pacientesComHDA: pacientesComHDA,
            pacientesComDiagnosticos: pacientesComDiagnosticos,
            taxaSucesso: ((sucessos / resultados.length) * 100).toFixed(1),
            resultados: resultados,
            resumo: `Análise de ${pacientesClinica.length} pacientes da ${nomeClinica}. ${sucessos} sucessos, ${falhas} falhas. ${pacientesComHDA} com HDA, ${pacientesComDiagnosticos} com diagnósticos.`
        };
    }

    /**
     * Salva relatório em arquivo
     */
    async salvarRelatorio(relatorio, diretorioSaida) {
        try {
            const timestamp = new Date().toISOString();
            const nomeArquivo = `analise-clinica-${relatorio.clinica.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;
            const caminhoArquivo = path.join(diretorioSaida, nomeArquivo);
            
            // Garantir que o diretório existe
            await fs.mkdir(diretorioSaida, { recursive: true });
            
            await fs.writeFile(caminhoArquivo, JSON.stringify(relatorio, null, 2));
            relatorio.arquivoSalvo = nomeArquivo;
            console.log(`💾 Relatório salvo: ${nomeArquivo}`);
        } catch (error) {
            console.error(`❌ Erro ao salvar arquivo: ${error.message}`);
        }
    }

    /**
     * Exibe resumo da análise
     */
    exibirResumo(relatorio) {
        console.log(`\n\n🏁 RESUMO DA ANÁLISE - ${relatorio.clinica.toUpperCase()}`);
        console.log('='.repeat(60));
        console.log(`📊 Total de pacientes: ${relatorio.totalPacientes}`);
        console.log(`✅ Análises bem-sucedidas: ${relatorio.sucessos} (${relatorio.taxaSucesso}%)`);
        console.log(`❌ Falhas: ${relatorio.falhas}`);
        console.log(`\n📋 DADOS CLÍNICOS EXTRAÍDOS:`);
        console.log(`   • Pacientes com HDA: ${relatorio.pacientesComHDA} (${((relatorio.pacientesComHDA/relatorio.sucessos)*100).toFixed(1)}% dos sucessos)`);
        console.log(`   • Pacientes com hipóteses diagnósticas: ${relatorio.pacientesComDiagnosticos} (${((relatorio.pacientesComDiagnosticos/relatorio.sucessos)*100).toFixed(1)}% dos sucessos)`);
        
        // Mostrar relatório gerado
        console.log(`\n📊 RELATÓRIO GERADO:`);
        console.log('='.repeat(30));
        console.log(`• Clínica: ${relatorio.clinica}`);
        console.log(`• Total de pacientes: ${relatorio.totalPacientes}`);
        console.log(`• Sucessos: ${relatorio.sucessos}`);
        console.log(`• Falhas: ${relatorio.falhas}`);
        console.log(`• Taxa de sucesso: ${relatorio.taxaSucesso}%`);
        console.log(`• Pacientes com HDA: ${relatorio.pacientesComHDA}`);
        console.log(`• Pacientes com diagnósticos: ${relatorio.pacientesComDiagnosticos}`);
        if (relatorio.arquivoSalvo) {
            console.log(`• Arquivo salvo: ${relatorio.arquivoSalvo}`);
        }
        
        console.log(`\n📝 Resumo: ${relatorio.resumo}`);
        
        // Mostrar exemplos de resultados
        const sucessosComDados = relatorio.resultados.filter(r => r.status === 'sucesso' && r.analise);
        if (sucessosComDados.length > 0) {
            console.log(`\n🔍 EXEMPLOS DE RESULTADOS:`);
            console.log('-'.repeat(30));
            console.log(`\n✅ PACIENTES COM DADOS EXTRAÍDOS:\n`);
            
            sucessosComDados.slice(0, 3).forEach((resultado, index) => {
                console.log(`${index + 1}. ${resultado.paciente.nome} (${resultado.paciente.prontuario})`);
                console.log(`   Leito: ${resultado.paciente.leito}`);
                if (resultado.analise.hda) {
                    console.log(`   HDA: ${resultado.analise.hda.substring(0, 100)}...`);
                }
                if (resultado.analise.profissionalResponsavel) {
                    console.log(`   Profissional: ${resultado.analise.profissionalResponsavel}`);
                }
                if (resultado.analise.hipotesesDiagnosticas) {
                    const qtdDiagnosticos = Array.isArray(resultado.analise.hipotesesDiagnosticas) ? 
                        resultado.analise.hipotesesDiagnosticas.length : resultado.analise.hipotesesDiagnosticas;
                    console.log(`   Diagnósticos: ${qtdDiagnosticos}`);
                }
                console.log('');
            });
        }
    }

    /**
     * Método específico para analisar a Enfermaria G
     */
    async analisarEnfermariaG(opcoes = {}) {
        return await this.analisarClinica('ENFERMARIA G', opcoes);
    }

    /**
     * Método genérico para analisar qualquer enfermaria
     */
    async analisarEnfermaria(enfermaria, opcoes = {}) {
        return await this.analisarClinica(enfermaria, opcoes);
    }

    /**
     * Delay helper
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ClinicAnalyzer;
