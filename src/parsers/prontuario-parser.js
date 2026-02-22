const BaseParser = require('./base-parser');

/**
 * Parser especializado para dados de prontuários do HICD
 */
class ProntuarioParser extends BaseParser {
    constructor() {
        super();
        this.debug('ProntuarioParser inicializado');
    }

    /**
     * Parse principal para extrair dados de prontuário (conforme parser original)
     */
    parse(html, prontuario = null) {
        this.debug('Iniciando parse de prontuário', { prontuario });
        
        try {
            const $ = this.loadHTML(html);
            
            // Estrutura conforme parser original
            const cadastro = {
                pacienteId: prontuario,
                dadosBasicos: {},
                endereco: {},
                contatos: {},
                responsavel: {},
                internacao: {},
                documentos: {}
            };

            // Parse usando estrutura HICD específica (.panel-body)
            const panelBody = $('.panel-body');
            
            if (panelBody.length > 0) {
                this.extractFromPrimeiraColuna($, panelBody, cadastro);
                this.extractFromSegundaColuna($, panelBody, cadastro);
                this.extractFromTerceiraColuna($, panelBody, cadastro);
            }

            // Extrair dados dos inputs hidden se disponíveis (conforme original)
            this.extractFromHiddenInputs($, cadastro);

            this.debug('Parse de prontuário concluído');
            return this.validateAndCleanCadastro(cadastro);

        } catch (error) {
            this.error('Erro no parse de prontuário:', error);
            throw error;
        }
    }

    /**
     * Extrai dados da primeira coluna (col-lg-3) - conforme parser original
     */
    extractFromPrimeiraColuna($, panelBody, cadastro) {
        const primeiraColuna = panelBody.find('.col-lg-3');
        if (primeiraColuna.length > 0) {
            const textos = primeiraColuna.find('p');

            textos.each((i, elemento) => {
                const texto = $(elemento).text().trim();

                // Registro/Prontuário
                if (texto.includes('Registro:')) {
                    const registro = texto.replace('Registro:', '').trim();
                    cadastro.dadosBasicos.prontuario = registro;
                }

                // Nome do paciente
                if (texto.includes('Nome:') && !texto.includes('Nome da mãe:')) {
                    const nome = texto.replace('Nome:', '').trim();
                    cadastro.dadosBasicos.nome = nome;
                }

                // Nome da mãe
                if (texto.includes('Nome da mãe:')) {
                    const nomeMae = texto.replace('Nome da mãe:', '').trim();
                    cadastro.dadosBasicos.nomeMae = nomeMae;
                }

                // Logradouro
                if (texto.includes('Logradouro:')) {
                    const logradouro = texto.replace('Logradouro:', '').trim();
                    cadastro.endereco.logradouro = logradouro;
                }

                // Bairro
                if (texto.includes('Bairro:')) {
                    const bairro = texto.replace('Bairro:', '').trim();
                    cadastro.endereco.bairro = bairro;
                }

                // Telefone
                if (texto.includes('Telefone:')) {
                    const telefone = texto.replace('Telefone:', '').trim();
                    cadastro.contatos.telefone = telefone;
                }
            });
        }
    }

    /**
     * Extrai dados da segunda coluna (col-lg-4 first) - conforme parser original
     */
    extractFromSegundaColuna($, panelBody, cadastro) {
        const segundaColuna = panelBody.find('.col-lg-4').first();
        if (segundaColuna.length > 0) {
            const textos = segundaColuna.find('p');

            textos.each((i, elemento) => {
                const texto = $(elemento).text().trim();

                // BE (Boletim de Emergência)
                if (texto.includes('BE:')) {
                    const beMatch = texto.match(/BE:\s*(\d+)/);
                    if (beMatch) {
                        cadastro.documentos.be = beMatch[1];
                    }
                }

                // CNS (Cartão Nacional de Saúde)
                if (texto.includes('CNS:')) {
                    const cns = texto.replace('CNS:', '').trim();
                    cadastro.documentos.cns = cns;
                }

                // Documento
                if (texto.includes('Documento:')) {
                    const documento = texto.replace('Documento:', '').trim();
                    cadastro.documentos.documento = documento;
                }

                // Número (endereço)
                if (texto.includes('Número:')) {
                    const numero = texto.replace('Número:', '').trim();
                    cadastro.endereco.numero = numero;
                }

                // Município
                if (texto.includes('Município:')) {
                    const municipio = texto.replace('Município:', '').trim();
                    cadastro.endereco.municipio = municipio;
                }

                // Responsável
                if (texto.includes('Responsável:')) {
                    const responsavel = texto.replace('Responsável:', '').trim();
                    cadastro.responsavel.nome = responsavel;
                }
            });
        }
    }

    /**
     * Extrai dados da terceira coluna (col-lg-4 last) - conforme parser original
     */
    extractFromTerceiraColuna($, panelBody, cadastro) {
        const terceiraColuna = panelBody.find('.col-lg-4').last();
        if (terceiraColuna.length > 0) {
            const textos = terceiraColuna.find('p');

            textos.each((i, elemento) => {
                const texto = $(elemento).text().trim();

                // Clínica/Leito
                if (texto.includes('Clinica / Leito:')) {
                    const clinicaLeitoMatch = texto.match(/Clinica \/ Leito:\s*(.+)/);
                    if (clinicaLeitoMatch) {
                        cadastro.internacao.clinicaLeito = clinicaLeitoMatch[1].trim();

                        // Extrair código da clínica e leito separadamente
                        const leitoMatch = clinicaLeitoMatch[1].match(/(\d{3})-(.+?)\s+(\d+)/);
                        if (leitoMatch) {
                            cadastro.internacao.codigoClinica = leitoMatch[1];
                            cadastro.internacao.nomeClinica = leitoMatch[2].trim();
                            cadastro.internacao.numeroLeito = leitoMatch[3];
                        }
                    }
                }

                // Nascimento e Idade
                if (texto.includes('Nascimento:')) {
                    const nascimentoMatch = texto.match(/Nascimento:\s*(\d{2}\/\d{2}\/\d{4})/);
                    if (nascimentoMatch) {
                        cadastro.dadosBasicos.dataNascimento = nascimentoMatch[1];
                    }

                    const idadeMatch = texto.match(/Idade:\s*(.+?)(?:\s|$)/);
                    if (idadeMatch) {
                        cadastro.dadosBasicos.idade = idadeMatch[1].trim();
                    }
                }

                // Sexo
                if (texto.includes('Sexo:')) {
                    const sexo = texto.replace('Sexo:', '').trim();
                    cadastro.dadosBasicos.sexo = sexo;
                }

                // Complemento (endereço)
                if (texto.includes('Complemento:')) {
                    const complemento = texto.replace('Complemento:', '').trim();
                    cadastro.endereco.complemento = complemento;
                }

                // Estado e CEP
                if (texto.includes('Estado:')) {
                    const estadoMatch = texto.match(/Estado:\s*(\w+)/);
                    if (estadoMatch) {
                        cadastro.endereco.estado = estadoMatch[1];
                    }

                    const cepMatch = texto.match(/CEP:\s*(\d+)/);
                    if (cepMatch) {
                        cadastro.endereco.cep = cepMatch[1];
                    }
                }
            });
        }
    }

    /**
     * Extrai dados dos inputs hidden - conforme parser original
     */
    extractFromHiddenInputs($, cadastro) {
        const inputNome = $('#pac_name').val();
        const inputProntuario = $('#pac_pront').val();

        if (inputNome && !cadastro.dadosBasicos.nome) {
            cadastro.dadosBasicos.nome = inputNome.trim();
        }

        if (inputProntuario && !cadastro.dadosBasicos.prontuario) {
            cadastro.dadosBasicos.prontuario = inputProntuario.trim();
        }
    }

    /**
     * Valida e limpa dados do cadastro - conforme parser original
     */
    validateAndCleanCadastro(cadastro) {
        // Log dos dados extraídos para debug (conforme original)
        if (this.debugMode) {
            this.debug(`Cadastro extraído para paciente ${cadastro.pacienteId}:`);
            this.debug('- Nome:', cadastro.dadosBasicos.nome);
            this.debug('- Prontuário:', cadastro.dadosBasicos.prontuario);
            this.debug('- Clínica/Leito:', cadastro.internacao.clinicaLeito);
            this.debug('- Telefone:', cadastro.contatos.telefone);
            this.debug('- Município:', cadastro.endereco.municipio);
        }

        return cadastro;
    }

    /**
     * Extrai resumo do cadastro do paciente
     */
    extractResumo(cadastro) {
        return {
            pacienteId: cadastro.pacienteId,
            nome: cadastro.dadosBasicos?.nome || '',
            prontuario: cadastro.dadosBasicos?.prontuario || '',
            clinicaLeito: cadastro.internacao?.clinicaLeito || '',
            telefone: cadastro.contatos?.telefone || '',
            municipio: cadastro.endereco?.municipio || '',
            dataNascimento: cadastro.dadosBasicos?.dataNascimento || null,
            sexo: cadastro.dadosBasicos?.sexo || ''
        };
    }

    /**
     * Parse das consultas
     */
    parseConsultas($) {
        const consultas = [];

        try {
            const selectors = [
                '.consulta-item',
                '.consultas tr',
                '[data-consulta]'
            ];

            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((index, element) => {
                        const consulta = this.parseConsultaElement($, $(element));
                        if (consulta) {
                            consultas.push(consulta);
                        }
                    });
                    if (consultas.length > 0) break;
                }
            }

        } catch (error) {
            this.error('Erro ao processar consultas:', error);
        }

        return consultas;
    }

    /**
     * Parse de elemento de consulta
     */
    parseConsultaElement($, element) {
        const texto = this.extractText(element);
        const consulta = {
            id: this.generateId(),
            data: null,
            profissional: '',
            especialidade: '',
            motivo: '',
            observacoes: ''
        };

        // Data da consulta
        const dataMatch = texto.match(/(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{1,2})?)/);
        if (dataMatch) {
            consulta.data = this.parseDate(dataMatch[1]);
        }

        // Profissional
        const profissionalMatch = texto.match(/Dr\.?\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|$|[,\.])/i);
        if (profissionalMatch) {
            consulta.profissional = this.cleanText(profissionalMatch[1]);
        }

        // Especialidade
        const especialidadeMatch = texto.match(/especialidade[:\s]*([^,\n]+)/i);
        if (especialidadeMatch) {
            consulta.especialidade = this.cleanText(especialidadeMatch[1]);
        }

        return consulta.data ? consulta : null;
    }

    /**
     * Parse dos diagnósticos
     */
    parseDiagnosticos($) {
        const diagnosticos = [];

        try {
            const selectors = [
                '.diagnostico-item',
                '.diagnosticos li',
                '[data-diagnostico]'
            ];

            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((index, element) => {
                        const diagnostico = this.parseDiagnosticoElement($, $(element));
                        if (diagnostico) {
                            diagnosticos.push(diagnostico);
                        }
                    });
                    if (diagnosticos.length > 0) break;
                }
            }

        } catch (error) {
            this.error('Erro ao processar diagnósticos:', error);
        }

        return diagnosticos;
    }

    /**
     * Parse de elemento de diagnóstico
     */
    parseDiagnosticoElement($, element) {
        const texto = this.extractText(element);
        if (!texto) return null;

        const diagnostico = {
            id: this.generateId(),
            codigo: '',
            descricao: texto,
            data: null,
            profissional: '',
            status: 'ativo'
        };

        // CID
        const cidMatch = texto.match(/([A-Z]\d{2}\.?\d?)/);
        if (cidMatch) {
            diagnostico.codigo = cidMatch[1];
        }

        // Data
        const dataMatch = texto.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dataMatch) {
            diagnostico.data = this.parseDate(dataMatch[1]);
        }

        return diagnostico;
    }

    /**
     * Parse dos medicamentos
     */
    parseMedicamentos($) {
        const medicamentos = [];

        try {
            const selectors = [
                '.medicamento-item',
                '.medicamentos li',
                '[data-medicamento]'
            ];

            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((index, element) => {
                        const medicamento = this.parseMedicamentoElement($, $(element));
                        if (medicamento) {
                            medicamentos.push(medicamento);
                        }
                    });
                    if (medicamentos.length > 0) break;
                }
            }

        } catch (error) {
            this.error('Erro ao processar medicamentos:', error);
        }

        return medicamentos;
    }

    /**
     * Parse de elemento de medicamento
     */
    parseMedicamentoElement($, element) {
        const texto = this.extractText(element);
        if (!texto) return null;

        const medicamento = {
            id: this.generateId(),
            nome: '',
            dosagem: '',
            frequencia: '',
            dataInicio: null,
            dataFim: null,
            observacoes: ''
        };

        // Nome do medicamento (primeira parte antes de dosagem)
        const nomeMatch = texto.match(/^([A-Za-zÀ-ÿ\s]+?)(?:\s+\d|\s+mg|\s+ml|$)/);
        if (nomeMatch) {
            medicamento.nome = this.cleanText(nomeMatch[1]);
        }

        // Dosagem
        const dosagemMatch = texto.match(/(\d+\s*(?:mg|ml|g|l|mcg|ui))/i);
        if (dosagemMatch) {
            medicamento.dosagem = dosagemMatch[1];
        }

        // Frequência
        const frequenciaMatch = texto.match(/(\d+x?\s*(?:ao\s+dia|por\s+dia|vezes|hora))/i);
        if (frequenciaMatch) {
            medicamento.frequencia = frequenciaMatch[1];
        }

        return medicamento.nome ? medicamento : null;
    }

    /**
     * Parse das alergias
     */
    parseAlergias($) {
        const alergias = [];

        try {
            const selectors = [
                '.alergia-item',
                '.alergias li',
                '[data-alergia]'
            ];

            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((index, element) => {
                        const alergia = this.parseAlergiaElement($, $(element));
                        if (alergia) {
                            alergias.push(alergia);
                        }
                    });
                    if (alergias.length > 0) break;
                }
            }

        } catch (error) {
            this.error('Erro ao processar alergias:', error);
        }

        return alergias;
    }

    /**
     * Parse de elemento de alergia
     */
    parseAlergiaElement($, element) {
        const texto = this.extractText(element);
        if (!texto) return null;

        return {
            id: this.generateId(),
            substancia: texto,
            severidade: '',
            observacoes: ''
        };
    }

    /**
     * Parse do histórico familiar
     */
    parseHistoricoFamiliar($) {
        const historico = [];

        try {
            const selectors = [
                '.historico-item',
                '.historico-familiar li',
                '[data-historico]'
            ];

            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((index, element) => {
                        const item = this.parseHistoricoElement($, $(element));
                        if (item) {
                            historico.push(item);
                        }
                    });
                    if (historico.length > 0) break;
                }
            }

        } catch (error) {
            this.error('Erro ao processar histórico familiar:', error);
        }

        return historico;
    }

    /**
     * Parse de elemento do histórico familiar
     */
    parseHistoricoElement($, element) {
        const texto = this.extractText(element);
        if (!texto) return null;

        return {
            id: this.generateId(),
            parentesco: '',
            condicao: texto,
            observacoes: ''
        };
    }

    /**
     * Parse das observações gerais
     */
    parseObservacoes($) {
        try {
            const selectors = [
                '.observacoes',
                '.notas-gerais',
                '#observacoes'
            ];

            for (const selector of selectors) {
                const element = $(selector);
                if (element.length > 0) {
                    return this.extractText(element);
                }
            }

        } catch (error) {
            this.error('Erro ao processar observações:', error);
        }

        return '';
    }

    /**
     * Normaliza valor de sexo
     */
    normalizeSexo(sexo) {
        if (!sexo) return '';
        
        const normalizado = sexo.toLowerCase().trim();
        if (['m', 'masculino', 'masc'].includes(normalizado)) {
            return 'M';
        } else if (['f', 'feminino', 'fem'].includes(normalizado)) {
            return 'F';
        }
        return '';
    }

    /**
     * Valida e limpa dados do prontuário
     */
    validateAndCleanProntuario(prontuario) {
        // Valida campos obrigatórios
        if (!prontuario.prontuario) {
            this.error('Prontuário inválido: número do prontuário não informado');
            return null;
        }

        // Ordena listas por data
        if (prontuario.internacoes.length > 0) {
            prontuario.internacoes.sort((a, b) => new Date(b.dataEntrada) - new Date(a.dataEntrada));
        }

        if (prontuario.consultas.length > 0) {
            prontuario.consultas.sort((a, b) => new Date(b.data) - new Date(a.data));
        }

        return prontuario;
    }

    /**
     * Extrai resumo do prontuário
     */
    extractResumo(prontuario) {
        return {
            prontuario: prontuario.prontuario,
            paciente: prontuario.dadosPaciente?.nome || '',
            totalInternacoes: prontuario.internacoes.length,
            totalConsultas: prontuario.consultas.length,
            totalDiagnosticos: prontuario.diagnosticos.length,
            totalMedicamentos: prontuario.medicamentos.length,
            ultimaAtualizacao: prontuario.dataUltimaAtualizacao
        };
    }
}

module.exports = ProntuarioParser;
