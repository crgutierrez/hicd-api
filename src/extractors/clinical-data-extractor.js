const cheerio = require('cheerio');

/**
 * Extrator responsável por extrair e analisar dados clínicos das evoluções médicas
 */
class ClinicalDataExtractor {
    constructor() {
        this.debugMode = false;
    }

    /**
     * Habilita/desabilita modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Extrai dados clínicos da última evolução médica do paciente
     */
    async extrairDadosClinicosUltimaEvolucao(evolucoes) {
        try {
            if (!evolucoes || evolucoes.length === 0) {
                console.log('🔍 Nenhuma evolução encontrada para análise');
                return null;
            }

            console.log(`📋 Analisando ${evolucoes.length} evoluções para encontrar a última evolução médica...`);

            // Filtrar apenas evoluções médicas
            const evolucoesMedicas = evolucoes.filter(evolucao => this.isEvolucaoMedica(evolucao));
            
            if (evolucoesMedicas.length === 0) {
                console.log('❌ Nenhuma evolução médica encontrada');
                return {
                    hda: null,
                    hipotesesDiagnosticas: [],
                    profissionalResponsavel: null,
                    dataUltimaEvolucao: null,
                    totalEvolucoesMedicas: 0,
                    observacoes: 'Nenhuma evolução médica encontrada'
                };
            }

            // Ordenar por data (mais recente primeiro)
            evolucoesMedicas.sort((a, b) => {
                const dataA = this.parseDataEvolucao(a.data);
                const dataB = this.parseDataEvolucao(b.data);
                return dataB - dataA;
            });

            // Pegar a evolução médica mais recente
            const ultimaEvolucaoMedica = evolucoesMedicas[0];
            
            console.log(`📋 Analisando evolução médica de ${ultimaEvolucaoMedica.profissional || 'profissional não identificado'} por ${ultimaEvolucaoMedica.atividade || 'atividade não identificada'}`);
            console.log(`🏥 Atividade: ${ultimaEvolucaoMedica.atividade || 'N/A'}`);

            // Extrair dados clínicos do texto da evolução
            const dadosClinicos = this.extrairDadosClinicosTexto(ultimaEvolucaoMedica.conteudo);

            const resultado = {
                hda: dadosClinicos.hda,
                hipotesesDiagnosticas: dadosClinicos.hipotesesDiagnosticas,
                profissionalResponsavel: ultimaEvolucaoMedica.profissional,
                atividadeProfissional: ultimaEvolucaoMedica.atividade,
                dataUltimaEvolucao: ultimaEvolucaoMedica.data,
                totalEvolucoesMedicas: evolucoesMedicas.length,
                dadosExtras: dadosClinicos.dadosExtras,
                textoCompleto: this.debugMode ? ultimaEvolucaoMedica.conteudo : undefined
            };

            console.log(`✅ Dados clínicos extraídos de evolução médica:`);
            console.log(`- HDA: ${resultado.hda ? 'Encontrada' : 'Não encontrada'}`);
            console.log(`- Hipóteses diagnósticas: ${resultado.hipotesesDiagnosticas.length} encontradas`);
            console.log(`- Total de evoluções médicas: ${resultado.totalEvolucoesMedicas}`);

            return resultado;

        } catch (error) {
            console.error(`❌ Erro ao extrair dados clínicos:`, error.message);
            throw error;
        }
    }

    /**
     * Verifica se uma evolução é médica (feita por médico ou residente)
     */
    isEvolucaoMedica(evolucao) {
        if (!evolucao.atividade && !evolucao.profissional) {
            return false;
        }

        // Combinação dos campos para análise
        const textoAnalise = `${evolucao.atividade || ''} ${evolucao.profissional || ''}`.toLowerCase();

        // Padrões que indicam atividade médica
        const padroesMedicos = [
            'medico',
            'médico',
            'residente',
            'resident',
            'clinica medica',
            'clínica médica',
            'medicina',
            'clinico',
            'clínico',
            'dr.',
            'dra.',
            'doutor',
            'doutora'
        ];

        // Padrões que NÃO são atividades médicas (excluir)
        const padroesNaoMedicos = [
            'psicologo',
            'psicólogo',
            'enfermeiro',
            'enfermeira',
            'fisioterapeuta',
            'nutricionista',
            'farmaceutico',
            'farmacêutico',
            'assistente social',
            'fonoaudiologo',
            'fonoaudiólogo',
            'tecnico',
            'técnico',
            'auxiliar'
        ];

        // Primeiro verificar se NÃO é atividade médica
        const isNaoMedico = padroesNaoMedicos.some(padrao => textoAnalise.includes(padrao));
        if (isNaoMedico) {
            return false;
        }

        // Depois verificar se É atividade médica
        const isMedico = padroesMedicos.some(padrao => textoAnalise.includes(padrao));
        
        return isMedico;
    }

    /**
     * Converte string de data em objeto Date para comparação
     */
    parseDataEvolucao(dataStr) {
        try {
            if (!dataStr) return new Date(0);
            
            // Tentar diferentes formatos de data
            const formatosData = [
                /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
                /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,
                /(\d{2})\/(\d{2})\/(\d{4})/,
                /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
                /(\d{4})-(\d{2})-(\d{2})/
            ];

            for (const formato of formatosData) {
                const match = dataStr.match(formato);
                if (match) {
                    if (formato.source.includes('(\\d{4})-(\\d{2})-(\\d{2})')) {
                        // Formato ISO (YYYY-MM-DD)
                        return new Date(match[1], match[2] - 1, match[3], 
                                      match[4] || 0, match[5] || 0, match[6] || 0);
                    } else {
                        // Formato brasileiro (DD/MM/YYYY)
                        return new Date(match[3], match[2] - 1, match[1], 
                                      match[4] || 0, match[5] || 0, match[6] || 0);
                    }
                }
            }

            // Se não conseguir parsear, retornar data padrão
            return new Date(0);
            
        } catch (error) {
            console.error(`[PARSE DATA] Erro ao parsear data ${dataStr}:`, error.message);
            return new Date(0);
        }
    }

    /**
     * Extrai dados clínicos do texto da evolução médica
     */
    extrairDadosClinicosTexto(textoEvolucao) {
        try {
            if (!textoEvolucao) {
                return {
                    hipotesesDiagnosticas: [],
                    hda: null,
                    dadosExtras: {}
                };
            }

            // Remover tags HTML e normalizar texto
            const $ = cheerio.load(textoEvolucao);
            const textoLimpo = $.text().replace(/\s+/g, ' ').trim();

            console.log(`[EXTRAÇÃO CLÍNICA] Analisando texto de ${textoLimpo.length} caracteres`);

            const dadosClinicos = {
                hipotesesDiagnosticas: [],
                hda: null,
                dadosExtras: {}
            };

            // 1. Extrair HDA (História da Doença Atual)
            dadosClinicos.hda = this.extrairHDA(textoLimpo);

            // 2. Extrair Hipóteses Diagnósticas
            dadosClinicos.hipotesesDiagnosticas = this.extrairHipotesesDiagnosticas(textoLimpo);

            // 3. Extrair outros dados clínicos relevantes
            dadosClinicos.dadosExtras = this.extrairDadosExtras(textoLimpo);

            return dadosClinicos;

        } catch (error) {
            console.error(`[EXTRAÇÃO CLÍNICA] Erro ao extrair dados clínicos:`, error.message);
            return {
                hipotesesDiagnosticas: [],
                hda: null,
                dadosExtras: {}
            };
        }
    }

    /**
     * Extrai HDA do texto da evolução
     */
    extrairHDA(texto) {
        try {
            const padroesHDA = [
                /HDA[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /História da doença atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /História atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /Doença atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /Quadro atual[:\s]*([^\.]+(?:\.[^\.]*){0,5})/i,
                /Evolução[:\s]*([^\.]+(?:\.[^\.]*){0,3})/i
            ];

            for (const padrao of padroesHDA) {
                const match = padrao.exec(texto);
                if (match && match[1].trim().length > 20) {
                    const hda = match[1].trim();
                    console.log(`[HDA] Encontrada: ${hda.substring(0, 100)}...`);
                    return hda;
                }
            }

            // Se não encontrou com padrões específicos, tentar extrair do início do texto
            const linhas = texto.split(/[.!?]/).filter(l => l.trim().length > 30);
            if (linhas.length > 0) {
                const primeiraLinha = linhas[0].trim();
                if (primeiraLinha.length > 50) {
                    console.log(`[HDA] Extraída do início do texto: ${primeiraLinha.substring(0, 100)}...`);
                    return primeiraLinha;
                }
            }

            return null;

        } catch (error) {
            console.error(`[HDA] Erro ao extrair HDA:`, error.message);
            return null;
        }
    }

    /**
     * Extrai hipóteses diagnósticas do texto
     */
    extrairHipotesesDiagnosticas(texto) {
        try {
            const hipoteses = [];

            // Padrões para identificar hipóteses diagnósticas
            const padroesDiagnosticos = [
                /(?:hipótese|hipóteses|diagnóstico|diagnósticos|suspeita|suspeitas)[s]?\s*(?:diagnóstica[s]?)?[:\s]*([^\.]+)/gi,
                /(?:HD|Hd|hd)[:\s]*([^\.]+)/gi,
                /(?:DX|Dx|dx)[:\s]*([^\.]+)/gi,
                /(?:CID|cid)[:\s]*([A-Z]\d{2}[^\.]*)/gi,
                /(?:impressão diagnóstica|impressão clínica)[:\s]*([^\.]+)/gi
            ];

            let matchCount = 0;
            for (const padrao of padroesDiagnosticos) {
                let match;
                while ((match = padrao.exec(texto)) !== null && matchCount < 10) {
                    const hipotese = match[1].trim();
                    if (hipotese.length > 5 && !hipoteses.some(h => h.includes(hipotese.substring(0, 20)))) {
                        hipoteses.push(hipotese);
                        console.log(`[HIPÓTESE] Encontrada: ${hipotese.substring(0, 100)}${hipotese.length > 100 ? '...' : ''}`);
                        matchCount++;
                    }
                }
            }

            // Buscar por códigos CID específicos
            const padroesCID = /\b[A-Z]\d{2}(?:\.\d{1,2})?\b/g;
            let matchCID;
            while ((matchCID = padroesCID.exec(texto)) !== null) {
                const cid = matchCID[0];
                if (!hipoteses.some(h => h.includes(cid))) {
                    hipoteses.push(`CID: ${cid}`);
                    console.log(`[HIPÓTESE CID] Encontrada: ${cid}`);
                }
            }

            return hipoteses;

        } catch (error) {
            console.error(`[HIPÓTESES] Erro ao extrair hipóteses diagnósticas:`, error.message);
            return [];
        }
    }

    /**
     * Extrai dados extras da evolução (condutas, exames, etc.)
     */
    extrairDadosExtras(texto) {
        try {
            const dadosExtras = {};

            // Padrões para condutas
            const padraoCondutas = /(?:conduta|condutas|plano|planejamento)[:\s]*([^\.]+(?:\.[^\.]*){0,2})/gi;
            const matchConduta = padraoCondutas.exec(texto);
            if (matchConduta) {
                dadosExtras.condutas = matchConduta[1].trim();
            }

            // Padrões para exames
            const padraoExames = /(?:exame|exames|solicitar|solicitado)[:\s]*([^\.]+)/gi;
            const exames = [];
            let matchExame;
            while ((matchExame = padraoExames.exec(texto)) !== null && exames.length < 5) {
                const exame = matchExame[1].trim();
                if (exame.length > 10) {
                    exames.push(exame);
                }
            }
            if (exames.length > 0) {
                dadosExtras.exames = exames;
            }

            // Padrões para medicações
            const padraoMedicacoes = /(?:medicação|medicamentos|prescrição|prescrito)[:\s]*([^\.]+)/gi;
            const matchMedicacao = padraoMedicacoes.exec(texto);
            if (matchMedicacao) {
                dadosExtras.medicacoes = matchMedicacao[1].trim();
            }

            return dadosExtras;

        } catch (error) {
            console.error(`[DADOS EXTRAS] Erro ao extrair dados extras:`, error.message);
            return {};
        }
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

module.exports = ClinicalDataExtractor;
