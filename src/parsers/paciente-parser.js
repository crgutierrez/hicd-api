const BaseParser = require('./base-parser');
const Paciente = require('../../api/models/Paciente');
const cheerio = require('cheerio');
/**
 * Parser especializado para dados de pacientes do HICD
 */
class PacienteParser extends BaseParser {
    constructor() {
        super();
        this.debug('PacienteParser inicializado');
    }
        /**
         * Extrai informações de cadastro do paciente
         */
        parsePacienteCadastro(html, pacienteId) {
            try {
                const $ = cheerio.load(html);
    
                console.log(`[PARSER] Extraindo cadastro do paciente ${pacienteId}...`);
                console.log('=====================================');
                // console.log('html:', html); // Log inicial do HTML para debug
                const cadastro = {
                    pacienteId: pacienteId,
                    dadosBasicos: {},
                    endereco: {},
                    contatos: {},
                    responsavel: {},
                    internacao: {},
                    documentos: {}
                };
    
    
                // Buscar no painel de informações do paciente
                const panelBody = $('.panel-body');
    
                if (panelBody.length > 0) {
                    // Extrair dados da primeira coluna (col-lg-3)
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
    
                    // Extrair dados da segunda coluna (col-lg-4)
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
    
                    // Extrair dados da terceira coluna (col-lg-4)
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
    
                // Também extrair dados dos inputs hidden se disponíveis
                const inputNome = $('#pac_name').val();
                const inputProntuario = $('#pac_pront').val();
    
                if (inputNome && !cadastro.dadosBasicos.nome) {
                    cadastro.dadosBasicos.nome = inputNome.trim();
                }
    
                if (inputProntuario && !cadastro.dadosBasicos.prontuario) {
                    cadastro.dadosBasicos.prontuario = inputProntuario.trim();
                }
    
                // Log dos dados extraídos para debug
                if (this.debugMode) {
                    console.log(`[PARSER] Cadastro extraído para paciente ${pacienteId}:`);
                    console.log('- Nome:', cadastro.dadosBasicos.nome);
                    console.log('- Prontuário:', cadastro.dadosBasicos.prontuario);
                    console.log('- Clínica/Leito:', cadastro.internacao.clinicaLeito);
                    console.log('- Telefone:', cadastro.contatos.telefone);
                    console.log('- Município:', cadastro.endereco.municipio);
                }
    
    
    
                return cadastro;
    
            } catch (error) {
                console.error(`[PARSER] Erro ao parsear cadastro do paciente ${pacienteId}:`, error.message);
                return null;
            }
        }
    

    /**
     * Parse principal para extrair dados de pacientes
     */
    parse(html, codigoClinica = null) {
        this.debug('Iniciando parse de pacientes', { codigoClinica });

        try {
            const $ = this.loadHTML(html);
            const pacientes = [];

            // Procura por diferentes padrões de estrutura de pacientes
            const pacienteSelectors = [
                'table.patient-table tr',
                '.patient-item',
                '[data-patient]',
                'tr[onclick*="patient"]',
                'tr[onclick*="prontuario"]',
                'table tr:has(td)'
            ];

            let foundPacientes = false;

            for (const selector of pacienteSelectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    this.debug(`Encontrados ${elements.length} elementos com seletor: ${selector}`);

                    elements.each((index, element) => {
                        const paciente = this.parsePacienteElement($, $(element), codigoClinica);
                        if (paciente) {
                            pacientes.push(paciente);
                        }
                    });

                    if (pacientes.length > 0) {
                        foundPacientes = true;
                        break;
                    }
                }
            }

            if (!foundPacientes) {
                this.debug('Tentando parse genérico de tabela');
                const rows = $('table tr').slice(1); // Pula cabeçalho

                rows.each((index, row) => {
                    const paciente = this.parsePacienteRow($, $(row), codigoClinica);
                    if (paciente) {
                        pacientes.push(paciente);
                    }
                });
            }

            this.debug(`Parse concluído. ${pacientes.length} pacientes encontrados`);
            return this.validateAndCleanPacientes(pacientes);

        } catch (error) {
            this.error('Erro no parse de pacientes:', error);
            throw error;
        }
    }

    /**
     * Parse de elemento específico de paciente
     */
    parsePacienteElement($, element, codigoClinica) {
        try {
            const dataAttribs = this.extractDataAttributes(element);

            // Tenta extrair dados de atributos data-*
            if (dataAttribs.prontuario && dataAttribs.nome) {
                return this.createPacienteFromData(dataAttribs, codigoClinica);
            }

            // Parse baseado no conteúdo do elemento
            const texto = this.extractText(element);
            const links = element.find('a');

            let prontuario = null;
            let nome = '';

            // Extrai prontuário do onclick ou href
            if (links.length > 0) {
                const onclick = links.first().attr('onclick') || '';
                const href = links.first().attr('href') || '';

                prontuario = this.extractProntuarioFromAction(onclick) || this.extractProntuarioFromAction(href);
                nome = this.extractText(links.first());
            }

            // Fallback para texto direto
            if (!prontuario && texto) {
                const match = texto.match(/(\d+)\s*[-\s]*(.+)/);
                if (match) {
                    prontuario = match[1];
                    nome = match[2];
                }
            }

            if (prontuario && nome) {
                return this.createPacienteObject(prontuario, nome, element, $, codigoClinica);
            }

            return null;

        } catch (error) {
            this.error('Erro ao processar elemento de paciente:', error);
            return null;
        }
    }

    /**
     * Parse de linha de tabela de paciente
     */
    parsePacienteRow($, row, codigoClinica) {
        try {
            const cells = row.find('td');
            if (cells.length === 0) return null;

            let prontuario = null;
            let nome = '';
            let internacao = '';
            let sexo = '';
            let leito = '';
            let telefone = '';
            let diasInternacao = '';

            // Estratégia baseada no número de colunas
            if (cells.length >= 2) {
                // Primeira célula geralmente é prontuário ou nome
                const primeiraCelula = this.extractText(cells.eq(0));
                const segundaCelula = this.extractText(cells.eq(1));

                // Verifica se primeira célula é numérica (prontuário)
                if (/^\d+$/.test(primeiraCelula)) {
                    prontuario = primeiraCelula;
                    nome = segundaCelula;
                } else {
                    // Pode ser nome na primeira e prontuário na segunda
                    nome = primeiraCelula;
                    if (/^\d+$/.test(segundaCelula)) {
                        prontuario = segundaCelula;
                    }
                }

                // Células adicionais
                if (cells.length >= 3) {
                    const terceiraCelula = this.extractText(cells.eq(2));
                    leito = terceiraCelula;

                }

                if (cells.length >= 4) {
                    const quartaCelula = this.extractText(cells.eq(3));
                    if (this.isSexoValue(quartaCelula)) {
                        sexo = quartaCelula;
                    } else if (this.isDateLike(quartaCelula)) {
                        nascimento = quartaCelula;
                    }
                }

                if (cells.length >= 5) {
                    internacao = this.extractText(cells.eq(4));
                }

                if (cells.length >= 6) {
                    diasInternacao = this.extractText(cells.eq(5));
                }
            }

            // Tenta extrair prontuário de links ou ações
            if (!prontuario) {
                const links = row.find('a');
                if (links.length > 0) {
                    const onclick = links.first().attr('onclick') || '';
                    const href = links.first().attr('href') || '';
                    prontuario = this.extractProntuarioFromAction(onclick) || this.extractProntuarioFromAction(href);

                    if (!nome) {
                        nome = this.extractText(links.first());
                    }
                }
            }
            console.log("Prontuario:", prontuario, "Nome:", nome, "Internacao:", internacao, "Sexo:", sexo, "Leito:", leito, "Dias Internacao:", diasInternacao);

            if (prontuario && nome) {
                return {
                    prontuario: String(prontuario),
                    nome: nome,
                    dataInternacao: this.parseDate(internacao),
                    sexo: this.normalizeSexo(sexo),
                    diasInternacao: diasInternacao,
                    clinica: leito,
                    status: 'ativo',
                    dataUltimaAtualizacao: this.getCurrentTimestamp()
                };
            }

            return null;

        } catch (error) {
            this.error('Erro ao processar linha de paciente:', error);
            return null;
        }
    }

    /**
     * Extrai prontuário de ações onclick ou href
     */
    extractProntuarioFromAction(action) {
        if (!action) return null;

        const patterns = [
            /prontuario[=:]?(\d+)/i,
            /patient[_-]?id[=:]?(\d+)/i,
            /codigo[=:]?(\d+)/i,
            /id[=:]?(\d+)/i,
            /(\d+)/
        ];

        for (const pattern of patterns) {
            const match = action.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Cria objeto de paciente a partir de data attributes
     */
    createPacienteFromData(data, codigoClinica) {
        return {
            prontuario: String(data.prontuario),
            nome: data.nome,
            dataNascimento: this.parseDate(data.nascimento),
            sexo: this.normalizeSexo(data.sexo),
            endereco: data.endereco || '',
            telefone: data.telefone || '',
            email: data.email || '',
            convenio: data.convenio || '',
            codigoClinica: codigoClinica,
            status: data.status || 'ativo',
            dataUltimaAtualizacao: this.getCurrentTimestamp()
        };
    }

    /**
     * Cria objeto de paciente com dados completos
     */
    createPacienteObject(prontuario, nome, element, $, codigoClinica) {
        const dados = {
            prontuario: String(prontuario),
            nome: this.cleanText(nome),
            dataNascimento: null,
            sexo: '',
            endereco: '',
            telefone: '',
            email: '',
            convenio: '',
            codigoClinica: codigoClinica,
            status: 'ativo',
            dataUltimaAtualizacao: this.getCurrentTimestamp()
        };

        // Tenta extrair informações adicionais do contexto
        const textoCompleto = this.extractText(element);

        // Busca padrões de data de nascimento
        const nascimentoMatch = textoCompleto.match(/nasc[imento]*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (nascimentoMatch) {
            dados.dataNascimento = this.parseDate(nascimentoMatch[1]);
        }

        // Busca padrões de sexo
        const sexoMatch = textoCompleto.match(/sexo[:\s]*(m|f|masculino|feminino)/i);
        if (sexoMatch) {
            dados.sexo = this.normalizeSexo(sexoMatch[1]);
        }

        // Busca padrões de telefone
        const telefoneMatch = textoCompleto.match(/tel[efone]*[:\s]*([0-9\s\-\(\)]+)/i);
        if (telefoneMatch) {
            dados.telefone = this.cleanText(telefoneMatch[1]);
        }

        // Busca padrões de convênio
        const convenioMatch = textoCompleto.match(/conv[ênio]*[:\s]*([^,\n]+)/i);
        if (convenioMatch) {
            dados.convenio = this.cleanText(convenioMatch[1]);
        }

        return dados;
    }

    /**
     * Verifica se uma string parece uma data
     */
    isDateLike(text) {
        if (!text) return false;
        return /\d{1,2}\/\d{1,2}\/\d{4}/.test(text);
    }

    /**
     * Verifica se uma string é um valor de sexo válido
     */
    isSexoValue(text) {
        if (!text) return false;
        const normalizado = text.toLowerCase().trim();
        return ['m', 'f', 'masculino', 'feminino', 'masc', 'fem'].includes(normalizado);
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
     * Valida e limpa lista de pacientes
     */
    validateAndCleanPacientes(pacientes) {
        const pacientesValidos = [];
        const prontuariosVistos = new Set();

        for (const paciente of pacientes) {
            // Valida campos obrigatórios
            if (!this.validateRequired(paciente, ['prontuario', 'nome'])) {
                this.debug('Paciente inválido (campos obrigatórios):', paciente);
                continue;
            }

            // Remove duplicatas por prontuário
            if (prontuariosVistos.has(paciente.prontuario)) {
                this.debug('Paciente duplicado ignorado:', paciente.prontuario);
                continue;
            }

            prontuariosVistos.add(paciente.prontuario);
            pacientesValidos.push(paciente);
        }

        this.debug(`Validação concluída: ${pacientesValidos.length}/${pacientes.length} pacientes válidos`);
        return pacientesValidos;
    }

    /**
     * Busca paciente específico por prontuário
     */
    findByProntuario(html, prontuario, codigoClinica = null) {
        const pacientes = this.parse(html, codigoClinica);
        return pacientes.find(p => p.prontuario === String(prontuario)) || null;
    }

    /**
     * Extrai lista de prontuários disponíveis
     */
    extractAvailableProntuarios(html, codigoClinica = null) {
        try {
            const pacientes = this.parse(html, codigoClinica);
            return pacientes.map(p => p.prontuario).sort();
        } catch (error) {
            this.error('Erro ao extrair prontuários:', error);
            return [];
        }
    }

    /**
     * Filtra pacientes por critérios
     */
    filterPacientes(pacientes, filtros = {}) {
        let resultado = [...pacientes];

        if (filtros.nome) {
            const nomeFilter = filtros.nome.toLowerCase();
            resultado = resultado.filter(p =>
                p.nome.toLowerCase().includes(nomeFilter)
            );
        }

        if (filtros.sexo) {
            resultado = resultado.filter(p => p.sexo === filtros.sexo);
        }

        if (filtros.convenio) {
            const convenioFilter = filtros.convenio.toLowerCase();
            resultado = resultado.filter(p =>
                p.convenio.toLowerCase().includes(convenioFilter)
            );
        }

        if (filtros.idadeMin || filtros.idadeMax) {
            resultado = resultado.filter(p => {
                if (!p.dataNascimento) return false;

                const idade = this.calculateAge(p.dataNascimento);
                const dentroIdadeMin = !filtros.idadeMin || idade >= filtros.idadeMin;
                const dentroIdadeMax = !filtros.idadeMax || idade <= filtros.idadeMax;

                return dentroIdadeMin && dentroIdadeMax;
            });
        }

        return resultado;
    }

    /**
     * Calcula idade a partir da data de nascimento
     */
    calculateAge(dataNascimento) {
        if (!dataNascimento) return null;

        const nascimento = new Date(dataNascimento);
        const hoje = new Date();

        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mesAtual = hoje.getMonth();
        const mesNascimento = nascimento.getMonth();

        if (mesAtual < mesNascimento ||
            (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }

        return idade;
    }
}

module.exports = PacienteParser;
