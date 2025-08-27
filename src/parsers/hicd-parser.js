const cheerio = require('cheerio');

/**
 * Parser responsável por extrair dados das páginas HTML do sistema HICD
 */
class HICDParser {
    constructor() {
        this.debugMode = true;
    }

    /**
     * Habilita/desabilita modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Extrai lista de clínicas do HTML
     */
    parseClinicas(html) {
        try {
            const $ = cheerio.load(html);
            const clinicas = [];

            $('#clinica option').each((i, element) => {
                const codigo = $(element).val();
                const nome = $(element).text().trim();

                if (codigo && nome && codigo !== '0') {
                    clinicas.push({
                        codigo: codigo,
                        nome: nome
                    });
                }
            });

            return clinicas;
        } catch (error) {
            console.error('[PARSER] Erro ao extrair clínicas:', error.message);
            return [];
        }
    }

    /**
     * Extrai lista de pacientes do HTML
     */
    parsePacientes(html, codigoClinica) {
        try {
            const $ = cheerio.load(html);
            const pacientes = [];

            // Extrair dados dos pacientes da tabela
            $('table.hoverTable tbody tr, table.bordasimples tbody tr, table tr').each((i, element) => {
                const colunas = $(element).find('td');
                console.log(`Processando linha ${i + 1} com ${colunas.length} colunas`);

                if (colunas.length >= 3) {
                    const nome = $(colunas[0]).text().trim();
                    const prontuario = $(colunas[1]).text().trim();
                    const leito = $(colunas[2]).text().trim();

                    // Verificar se é uma linha válida de paciente
                    if (nome && prontuario && leito &&
                        !nome.includes('Nome') &&
                        !prontuario.includes('Prontuário') &&
                        /^\d+$/.test(prontuario)) {

                        // Extrair dias de internação (se disponível)
                        let diasInternacao = 0;
                        const diasText = $(colunas[4])?.text().trim();
                        if (diasText && /^\d+$/.test(diasText)) {
                            diasInternacao = parseInt(diasText);
                        }
                        const diasInternado = $(colunas[5])?.text().trim() || '0';

                        const paciente = {
                            nome: nome,
                            prontuario: prontuario,
                            leito: leito,
                            clinicaLeito: `${codigoClinica}-${leito}`,
                            diasInternacao: diasInternado,
                            codigoClinica: codigoClinica
                        };

                        // Adicionar informações extras se disponíveis
                        if (colunas.length > 4) {
                            const idade = $(colunas[4])?.text().trim();
                            const sexo = $(colunas[5])?.text().trim();

                            if (idade) paciente.idade = idade;
                            if (sexo) paciente.sexo = sexo;
                        }

                        pacientes.push(paciente);

                        if (this.debugMode) {
                            console.log(`[PACIENTES] Paciente encontrado: ${nome} (${prontuario}) - Leito: ${leito}`);
                        }
                    }
                }
            });

            // Se não encontrou na estrutura principal, tentar outras estruturas
            if (pacientes.length === 0) {
                $('.paciente-item, .patient-row, tr').each((i, element) => {
                    const textoElemento = $(element).text();
                    const matchPaciente = textoElemento.match(/([^(]+)\s*\((\d+)\).*?([A-Z0-9.-]+)/);

                    if (matchPaciente) {
                        const nome = matchPaciente[1].trim();
                        const prontuario = matchPaciente[2];
                        const leito = matchPaciente[3];

                        pacientes.push({
                            nome: nome,
                            prontuario: prontuario,
                            leito: leito,
                            clinicaLeito: `${codigoClinica}-${leito}`,
                            diasInternacao: 0,
                            codigoClinica: codigoClinica
                        });

                        if (this.debugMode) {
                            console.log(`[PACIENTES] Paciente encontrado (estrutura alternativa): ${nome} (${prontuario}) - Leito: ${leito}`);
                        }
                    }
                });
            }

            return pacientes;
        } catch (error) {
            console.error('[PARSER] Erro ao extrair pacientes:', error.message);
            return [];
        }
    }

    /**
     * Extrai informações de cadastro do paciente
     */
    parsePacienteCadastro(html, pacienteId) {
        try {
            const $ = cheerio.load(html);

            console.log(`[PARSER] Extraindo cadastro do paciente ${pacienteId}...`);
            console.log('=====================================');
            console.log('html:', html); // Log inicial do HTML para debug
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
     * Extrai evoluções do paciente - Versão atualizada para nova estrutura HTML
     */
    parseEvolucoes(html, pacienteId) {
        console.log(`[PARSER] Extraindo evoluções do paciente ${pacienteId}...`);

        try {
            const $ = cheerio.load(html);
            const evolucoes = [];

            // Buscar por estrutura específica do areaHistEvol
            $('#areaHistEvol').each((index, areaElement) => {
                const evolucoesDetalhadas = this.parseEvolucaoDetalhada($, areaElement, pacienteId, index);
                if (evolucoesDetalhadas) {
                    evolucoes.push(...evolucoesDetalhadas);
                }
            });

            // Se não encontrou na estrutura específica, usar o método anterior
            if (evolucoes.length === 0) {
                return this.parseEvolucoesFallback($, pacienteId);
            }

            console.log(`[PARSER] ✅ ${evolucoes.length} evoluções extraídas para o paciente ${pacienteId}`);
            return evolucoes;

        } catch (error) {
            console.error(`[PARSER] Erro ao extrair evoluções do paciente ${pacienteId}:`, error.message);
            return [];
        }
    }

    retornaEvolucaoDetalhada($, row) {
        var retorno = {};
        const cols = row.find('[class*="col-lg-"]');
        if (cols.length >= 2) {
            cols.each((j, colElement) => {
                const col = $(colElement);
                const texto = col.text().trim();

                if (texto.includes('Descrição:')) {
                    const nextCol = cols.eq(j + 1);

                    if (nextCol.length) {
                        const textoHtml = nextCol.html();
                        const textoLimpo = this.limparTextoEvolucao(textoHtml);
                        retorno = this.extrairDadosEstruturadosEvolucao(textoLimpo);

                    }
                }
            });
        }
        return retorno;
    }

    retornaCampo($, textoPesquisa, row) {
        var retorno = '';
        const cols = row.find('[class*="col-lg-"]');
        if (cols.length >= 2) {
            cols.each((j, colElement) => {
                const col = $(colElement);
                const texto = col.text().trim();

                if (texto.includes(textoPesquisa)) {
                    const nextCol = cols.eq(j + 1);

                    if (nextCol.length) {
                        if (textoPesquisa === 'Descrição:') {
                            const textoHtml = nextCol.html();
                            const textoLimpo = this.limparTextoEvolucao(textoHtml);


                            retorno = textoLimpo;
                            //this.extrairResumoEvolucao(textoLimpo);

                            // Extrair dados estruturados da evolução
                            const dadosEstruturados = this.extrairDadosEstruturadosEvolucao(textoLimpo);
                        } else {
                            retorno = this.limparTextoSimples(nextCol.text());
                        }

                    }
                }
            });
        }
        return retorno;
    }

    /**
     * Parse detalhado da estrutura de evolução específica
     */
    parseEvolucaoDetalhada($, areaElement, pacienteId, index) {
        var retornos = [];
        try {
            const area = $(areaElement);
            

            // Extrair informações das linhas de dados
            const rows = area.find('.row');
            console.log(`Evolução - Encontradas ${area.find('.row').length} linhas de dados`);
            for (var linha = 0; linha < rows.length; linha = linha + 5) {
                const evolucao = {
                id: `${pacienteId}_${index}`,
                pacienteId: pacienteId,
                profissional: '',
                dataEvolucao: '',
                dataAtualizacao: '',
                atividade: '',
                subAtividade: '',
                clinicaLeito: '',
                descricao: '',
                textoCompleto: ''
            };
                const row = rows.eq(linha);
                const rowDois = rows.eq(linha + 1)
                const rowTres = rows.eq(linha + 2);
                const rowQuatro = rows.eq(linha + 3);
                evolucao.profissional = this.retornaCampo($, 'Profissional:', row);
                evolucao.dataEvolucao = this.retornaCampo($, 'Data Evolução:', row);
                evolucao.atividade = this.retornaCampo($, 'Atividade:', rowDois);
                evolucao.dataAtualizacao = this.retornaCampo($, 'Data de Atualização:', rowDois);
                evolucao.clinicaLeito = this.retornaCampo($, 'Clínica/Leito:', rowTres);
                evolucao.descricao = this.retornaCampo($, 'Descrição:', rowQuatro);
                evolucao.textoCompleto = evolucao.descricao;
                evolucao.dadosEstruturados = this.retornaEvolucaoDetalhada($, rowQuatro);

                // console.log('Profissional: ', profissional);
                // console.log('Data Evolução: ', dataEvolucao);
                // console.log('Atividade: ', atividade);
                // console.log('Data de Atualização: ', dataAtualizacao);
                // console.log('Clínica/Leito: ', clinicaLeito);
                // console.log('Descrição: ', this.retornaCampo($, 'Descrição:', rowQuatro));
            
            if (evolucao.dataEvolucao || evolucao.profissional || evolucao.textoCompleto) {
                retornos.push(evolucao);
            }

            }

          console.log(`Evolução - Total de evoluções processadas: ${retornos.length}`);
            return retornos;

        } catch (error) {
            console.error(`[PARSER] Erro ao processar evolução ${index}:`, error.message);
            return null;
        }
    }

    /**
     * Método fallback para estruturas antigas
     */
    parseEvolucoesFallback($, pacienteId) {
        const evolucoes = [];

        // Buscar por diferentes estruturas de evolução
        $('.evolucao-item, .evolucao, table tr').each((i, element) => {
            const data = $(element).find('.data, .data-evolucao, td:first').text().trim();
            const profissional = $(element).find('.profissional, .responsavel, td:nth-child(2)').text().trim();
            const conteudo = $(element).find('.conteudo, .texto, td:last').html() || $(element).find('.conteudo, .texto, td:last').text();

            if (data && conteudo) {
                const evolucao = {
                    id: `${pacienteId}_${i}`,
                    data: data,
                    profissional: profissional || 'Não informado',
                    conteudo: conteudo.trim(),
                    pacienteId: pacienteId
                };

                // Extrair atividade se disponível
                const atividade = $(element).find('.atividade, td:nth-child(3)').text().trim();
                if (atividade) {
                    evolucao.atividade = atividade;
                }

                evolucoes.push(evolucao);
            }
        });

        return evolucoes;
    }

    /**
     * Limpa texto simples removendo espaços desnecessários
     */
    limparTextoSimples(texto) {
        if (!texto) return '';
        return texto.trim().replace(/\s+/g, ' ');
    }

    /**
     * Limpa e formata texto de evolução
     */
    limparTextoEvolucao(textoHtml) {
        if (!textoHtml) return '';

        return textoHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&ccedil;/g, 'ç')
            .replace(/&atilde;/g, 'ã')
            .replace(/&eacute;/g, 'é')
            .replace(/&iacute;/g, 'í')
            .replace(/&oacute;/g, 'ó')
            .replace(/&uacute;/g, 'ú')
            .replace(/&aacute;/g, 'á')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extrai resumo da evolução (primeiras linhas significativas)
     */
    extrairResumoEvolucao(textoCompleto) {
        if (!textoCompleto) return '';

        const linhas = textoCompleto.split('\n');
        const linhasSignificativas = linhas
            .filter(linha => linha.trim().length > 10)
            .slice(0, 3);

        return linhasSignificativas.join(' ').substring(0, 200);
    }

    /**
     * Extrai dados estruturados do texto da evolução
     */
    extrairDadosEstruturadosEvolucao(texto) {
        const dados = {
            hipotesesDiagnosticas: [],
            medicamentos: [],
            exames: [],
            sinaisVitais: {},
            procedimentos: []
        };

        try {
            // Extrair hipóteses diagnósticas - versão melhorada
            const hipotesesMatch = texto.match(/Hipóteses diagnósticas:\s*([\s\S]*?)(?:\s*Em uso:|\s*Fez uso:|\s*Dispositivos:|\s*Exames|$)/i);
            if (hipotesesMatch) {
                const hipotesesTexto = hipotesesMatch[1].trim();
                const hipoteses = hipotesesTexto
                    .split(/\n|(?=[A-Z][a-z].*(?:fetal|convulsiva|neonatal|tardia))/g)
                    .map(h => h.trim())
                    .filter(h => h.length > 0 && !h.match(/^(Em uso|Fez uso|Dispositivos|Exames):/i))
                    .filter(h => h.length > 5); // Filtrar textos muito curtos
                dados.hipotesesDiagnosticas = hipoteses;
            }

            // Extrair medicamentos em uso - versão melhorada
            const medicamentosMatch = texto.match(/Em uso:\s*([\s\S]*?)(?:\s*Fez uso:|\s*Dispositivos:|\s*Exames|$)/i);
            if (medicamentosMatch) {
                const medicamentosTexto = medicamentosMatch[1].trim();
                const medicamentos = medicamentosTexto
                    .split(/\n|(?=[A-Z][a-z].*(?:mg|mcg|\(\d+\)))/g)
                    .map(m => m.trim())
                    .filter(m => m.length > 0 && !m.match(/^(Fez uso|Dispositivos|Exames):/i))
                    .filter(m => m.length > 3); // Filtrar textos muito curtos
                dados.medicamentos = medicamentos;
            }

            // Extrair medicamentos que fez uso
            const medicamentosAnterioresMatch = texto.match(/Fez uso:\s*([\s\S]*?)(?:\s*Dispositivos:|\s*Exames|\s*Culturas:|\s*Pareceres:|$)/i);
            if (medicamentosAnterioresMatch) {
                const medicamentosAnteriores = medicamentosAnterioresMatch[1]
                    .split('\n')
                    .map(m => m.trim())
                    .filter(m => m.length > 0 && !m.match(/^(Dispositivos|Exames|Culturas|Pareceres):/i));
                dados.medicamentosAnteriores = medicamentosAnteriores;
            }

            // Extrair exames laboratoriais - versão melhorada
            const examesMatch = texto.match(/Exames laboratoriais:\s*([\s\S]*?)(?:\s*Exames de imagem:|\s*Culturas:|\s*Pareceres:|$)/i);
            if (examesMatch) {
                const examesTexto = examesMatch[1].trim();
                const exames = examesTexto
                    .split(/\n|(?=\[[0-9\/]+\])/g)
                    .map(e => e.trim())
                    .filter(e => e.length > 0 && !e.match(/^(Exames de imagem|Culturas|Pareceres):/i))
                    .filter(e => e.length > 3); // Filtrar textos muito curtos
                dados.exames = exames;
            }

            // Extrair dispositivos/procedimentos
            const dispositivosMatch = texto.match(/Dispositivos:([\s\S]*?)(?:\n\nExames|\nExames|\n\nCulturas:|\nCulturas:|$)/i);
            if (dispositivosMatch) {
                const dispositivos = dispositivosMatch[1]
                    .split('\n')
                    .map(d => d.trim())
                    .filter(d => d.length > 0 && !d.match(/^(Exames|Culturas):/i));
                dados.procedimentos = dispositivos;
            }

            // Extrair peso - versão melhorada com diferentes formatos
            const pesoMatches = [
                texto.match(/Peso[^:]*:\s*([0-9.,]+\s*kg)/i),
                texto.match(/Peso\s+[^:]*\s*([0-9.,]+kg)/i),
                texto.match(/([0-9.,]+kg)/i)
            ];

            for (const pesoMatch of pesoMatches) {
                if (pesoMatch) {
                    dados.sinaisVitais.peso = pesoMatch[1];
                    break;
                }
            }

            // Extrair outros sinais vitais se presentes
            const sinaisMatch = texto.match(/PAM:\s*([0-9\-\s]+mmHg)/i);
            if (sinaisMatch) {
                dados.sinaisVitais.pressao = sinaisMatch[1].trim();
            }

            const fcMatch = texto.match(/FC:\s*([0-9\-\s]+bpm)/i);
            if (fcMatch) {
                dados.sinaisVitais.frequenciaCardiaca = fcMatch[1].trim();
            }

            const frMatch = texto.match(/FR:\s*([0-9\-\s]+irpm)/i);
            if (frMatch) {
                dados.sinaisVitais.frequenciaRespiratoria = frMatch[1].trim();
            }

            const tempMatch = texto.match(/T(?:ax)?:\s*([0-9.,\-\s]+°C)/i);
            if (tempMatch) {
                dados.sinaisVitais.temperatura = tempMatch[1].trim();
            }

            const satMatch = texto.match(/Sat:\s*([0-9\-\s]+%)/i);
            if (satMatch) {
                dados.sinaisVitais.saturacao = satMatch[1].trim();
            }

        } catch (error) {
            console.warn('[PARSER] Erro ao extrair dados estruturados:', error.message);
        }

        return dados;
    }

    /**
     * Extrai informações dos exames do paciente
     */
    parseExames(html, pacienteId) {
        console.log(`[PARSER] Extraindo exames do paciente ${pacienteId}...`);
        
        try {
            const $ = cheerio.load(html);
            const exames = [];

            // Buscar todas as seções de fieldset que contêm exames
            $('fieldset').each((index, fieldsetElement) => {
                const fieldset = $(fieldsetElement);
                const legend = fieldset.find('legend').text().trim();
                
                // Verificar se é uma seção de informações ou exames
                if (legend === 'Informações:') {
                    const exame = this.parseExameInformacoes($, fieldset, pacienteId, index);
                    if (exame) {
                        // Buscar a seção de exames correspondente (próximo fieldset)
                        const examesFieldset = fieldset.next('fieldset');
                        if (examesFieldset.length > 0) {
                            const listaExames = this.parseListaExames($, examesFieldset);
                            exame.exames = listaExames.exames;
                            exame.requisicaoId = listaExames.requisicaoId;
                            exame.linha = listaExames.linha;
                        }
                        exames.push(exame);
                    }
                }
            });

            console.log(`[PARSER] ✅ ${exames.length} requisições de exames extraídas para o paciente ${pacienteId}`);
            return exames;

        } catch (error) {
            console.error(`[PARSER] Erro ao extrair exames do paciente ${pacienteId}:`, error.message);
            return [];
        }
    }

    /**
     * Parse das informações da requisição de exame
     */
    parseExameInformacoes($, fieldset, pacienteId, index) {
        try {
            const exame = {
                id: `${pacienteId}_exam_${index}`,
                pacienteId: pacienteId,
                nome: '',
                data: '',
                hora: '',
                requisicao: '',
                clinica: '',
                medico: '',
                unidadeSaude: '',
                exames: []
            };

            // Extrair informações da tabela
            fieldset.find('table tr').each((i, rowElement) => {
                const row = $(rowElement);
                const cells = row.find('td');
                
                if (cells.length >= 2) {
                    const label = cells.eq(0).text().trim();
                    const value = cells.eq(1).text().trim();
                    
                    switch (label) {
                        case 'Nome:':
                            exame.nome = value;
                            break;
                        case 'Data:':
                            exame.data = value;
                            break;
                        case 'Hora:':
                            exame.hora = value;
                            break;
                        case 'Requisição:':
                            exame.requisicao = value;
                            break;
                        case 'Clínica:':
                            exame.clinica = value;
                            break;
                        case 'Médico:':
                            exame.medico = value;
                            break;
                        case 'Unidade de Saúde:':
                            exame.unidadeSaude = value;
                            break;
                    }
                }
            });

            // Verificar se tem dados mínimos
            if (exame.nome || exame.requisicao) {
                return exame;
            }

            return null;

        } catch (error) {
            console.error(`[PARSER] Erro ao processar informações do exame ${index}:`, error.message);
            return null;
        }
    }

    /**
     * Parse da lista de exames dentro de uma requisição
     */
    parseListaExames($, fieldset) {
        try {
            const resultado = {
                exames: [],
                requisicaoId: '',
                linha: ''
            };

            // Extrair requisição e linha do onclick do botão imprimir
            const imprimirLink = fieldset.find('a[onclick*="imprimirEvo"]');
            if (imprimirLink.length > 0) {
                const onclickText = imprimirLink.attr('onclick');
                const match = onclickText.match(/imprimirEvo\('([^']+)','([^']+)'\)/);
                if (match) {
                    resultado.requisicaoId = match[1];
                    resultado.linha = match[2];
                }
            }

            // Extrair lista de exames
            fieldset.find('a[onclick*="selecionaEx"]').each((i, linkElement) => {
                const link = $(linkElement);
                const onclickText = link.attr('onclick');
                const codigoMatch = onclickText.match(/selecionaEx\('([^']+)'\)/);
                
                if (codigoMatch) {
                    const codigoExame = codigoMatch[1];
                    const nomeExame = link.text().trim();
                    
                    resultado.exames.push({
                        codigo: codigoExame,
                        nome: nomeExame
                    });
                }
            });

            return resultado;

        } catch (error) {
            console.error('[PARSER] Erro ao processar lista de exames:', error.message);
            return { exames: [], requisicaoId: '', linha: '' };
        }
    }

    /**
     * Gera URL de impressão dos exames baseado na lista de códigos
     */
    gerarUrlImpressaoExames(requisicaoId, linha, exames, coPaciente = '', tipoBusca = '') {
        try {
            // Gerar query string no formato idPrint_linha=CODIGO para cada exame
            const queryParts = exames.map(exame => `idPrint_${linha}=${exame.codigo}`);
            const queryString = queryParts.join('&');
            
            // Codificar em Base64 conforme o código original
            const param = Buffer.from(queryString).toString('base64');
            const coPaciente64 = Buffer.from(coPaciente).toString('base64');
            const tipoBusca64 = Buffer.from(tipoBusca).toString('base64');
            
            // Gerar URL completa
            const baseUrl = 'https://hicd-hospub.sesau.ro.gov.br/prontuario/generator/sadt/app/exame.php';
            const urlParams = new URLSearchParams({
                'requisicao': requisicaoId,
                'param': param,
                'co_paciente': coPaciente64,
                'TIPOBUSCA': tipoBusca64,
                'co_area': ''
            });
            
            const urlCompleta = `${baseUrl}?${urlParams.toString()}`;
            
            console.log(`[PARSER] URL de impressão gerada para requisição ${requisicaoId}:`);
            console.log(`[PARSER] Query String: ${queryString}`);
            console.log(`[PARSER] Param (Base64): ${param}`);
            console.log(`[PARSER] URL: ${urlCompleta}`);
            
            return {
                url: urlCompleta,
                queryString: queryString,
                param: param,
                requisicaoId: requisicaoId,
                linha: linha,
                totalExames: exames.length
            };

        } catch (error) {
            console.error('[PARSER] Erro ao gerar URL de impressão:', error.message);
            return null;
        }
    }

    /**
     * Gera URLs de impressão para todas as requisições de exames
     */
    gerarUrlsImpressao(requisicoes, coPaciente = '', tipoBusca = '') {
        const urls = [];
        
        for (const requisicao of requisicoes) {
            if (requisicao.exames && requisicao.exames.length > 0) {
                const urlInfo = this.gerarUrlImpressaoExames(
                    requisicao.requisicaoId || requisicao.requisicao,
                    requisicao.linha,
                    requisicao.exames,
                    coPaciente,
                    tipoBusca
                );
                
                if (urlInfo) {
                    urls.push({
                        ...urlInfo,
                        requisicao: requisicao.requisicao,
                        data: requisicao.data,
                        hora: requisicao.hora,
                        medico: requisicao.medico,
                        clinica: requisicao.clinica
                    });
                }
            }
        }
        
        return urls;
    }

    /**
     * Parse dos resultados dos exames a partir do HTML da URL de impressão
     */
    parseResultadosExames(html, requisicaoId) {
        console.log(`[PARSER] Extraindo resultados dos exames da requisição ${requisicaoId}...`);
        
        try {
            const $ = cheerio.load(html);
            const resultados = [];

            // Buscar tabelas que contêm os resultados dos exames
            $('table').each((tableIndex, tableElement) => {
                const table = $(tableElement);
                
                // Procurar por linhas que contêm resultados de exames
                table.find('tr').each((rowIndex, rowElement) => {
                    const row = $(rowElement);
                    const cells = row.find('td');
                    
                    if (cells.length >= 3) {
                        // Tentar diferentes estruturas de tabela
                        const possibleStructures = [
                            // Estrutura 1: Sigla | Descrição | Valor | Referência
                            {
                                siglaIndex: 0,
                                valorIndex: 2,
                                referenciaIndex: 3
                            },
                            // Estrutura 2: Descrição | Valor | Referência
                            {
                                siglaIndex: 0,
                                valorIndex: 1,
                                referenciaIndex: 2
                            },
                            // Estrutura 3: Sigla | Valor
                            {
                                siglaIndex: 0,
                                valorIndex: 1,
                                referenciaIndex: -1
                            }
                        ];

                        for (const structure of possibleStructures) {
                            const siglaText = cells.eq(structure.siglaIndex).text().trim();
                            const valorText = cells.eq(structure.valorIndex).text().trim();
                            const referenciaText = structure.referenciaIndex >= 0 
                                ? cells.eq(structure.referenciaIndex).text().trim() 
                                : '';

                            // Verificar se parece ser um resultado de exame válido
                            if (this.isValidExameResult(siglaText, valorText)) {
                                const resultado = {
                                    requisicaoId: requisicaoId,
                                    sigla: siglaText,
                                    valor: valorText,
                                    referencia: referenciaText,
                                    unidade: this.extrairUnidade(valorText),
                                    valorNumerico: this.extrairValorNumerico(valorText),
                                    status: this.determinarStatusExame(valorText, referenciaText)
                                };
                                
                                resultados.push(resultado);
                                break; // Sair do loop de estruturas se encontrou uma válida
                            }
                        }
                    }
                });
            });

            // Parse específico para conteúdo de texto estruturado (hemogramas, etc.)
            const resultadosTexto = this.parseResultadosTexto($, requisicaoId);
            resultados.push(...resultadosTexto);

            // Se não encontrou na estrutura de tabela, tentar outras estruturas
            if (resultados.length === 0) {
                resultados.push(...this.parseResultadosExamesAlternativo($, requisicaoId));
            }

            console.log(`[PARSER] ✅ ${resultados.length} resultados de exames extraídos da requisição ${requisicaoId}`);
            
            // Log dos primeiros resultados para debug
            if (resultados.length > 0) {
                console.log(`[PARSER] Primeiros resultados encontrados:`);
                resultados.slice(0, 3).forEach((resultado, index) => {
                    console.log(`  ${index + 1}. ${resultado.sigla}: ${resultado.valor} (${resultado.unidade || 'sem unidade'})`);
                });
            }

            return resultados;

        } catch (error) {
            console.error(`[PARSER] Erro ao extrair resultados dos exames da requisição ${requisicaoId}:`, error.message);
            return [];
        }
    }

    /**
     * Parse específico para resultados em formato de texto estruturado
     */
    parseResultadosTexto($, requisicaoId) {
        const resultados = [];
        
        try {
            // Buscar todo o texto do documento
            const textoCompleto = $('body').text();
            
            // Padrões para extrair resultados específicos
            const padroes = [
                // Hematócrito: valor % VR: referência
                /Hematocrito[^>]*>\s*([0-9.,]+)\s*%\s*VR:\s*([^;\n]+)/gi,
                // Hemoglobina: valor g/dl VR: referência  
                /Hemoglobina[^>]*>\s*([0-9.,]+)\s*g\/dl\s*VR:\s*([^;\n]+)/gi,
                // Hemácias: valor milh/mm3 VR: referência
                /Hemacia[^>]*>\s*([0-9.,]+)\s*milh\/mm3\s*VR:\s*([^;\n]+)/gi,
                // Leucócitos: valor /mm3 VR: referência
                /Leucocitos[^>]*>\s*([0-9.,]+)\s*\/mm3\s*VR:\s*([^;\n]+)/gi,
                // Plaquetas: valor /mm3 VR: referência
                /Plaquetas[^>]*>\s*([0-9.,]+)\s*\/mm3\s*VR:\s*([^;\n]+)/gi,
                // VCM: valor f1 VR: referência
                /Vol\.\s*Corpusc\.\s*medio[^>]*>\s*([0-9.,]+)\s*f1\s*VR:\s*([^;\n]+)/gi,
                // HCM: valor pg VR: referência
                /Hemog\.\s*corp\.\s*media[^>]*>\s*([0-9.,]+)\s*pg\s*VR:\s*([^;\n]+)/gi,
                // CHCM: valor % VR: referência
                /Concent\.\s*hemoglob\.[^>]*>\s*([0-9.,]+)\s*%\s*VR:\s*([^;\n]+)/gi,
                // RDW: valor %
                /RDW[^>]*>\s*([0-9.,]+)\s*%/gi,
                // TTPA: valor Seg.
                /TTPA[^>]*>\s*([0-9.,]+)\s*Seg\./gi,
                // Ratio: valor
                /Ratio[^>]*>\s*([0-9.,]+)/gi,
                // Pool Normal: valor Seg.
                /Pool\s*Normal[^>]*>\s*([0-9.,]+)\s*Seg\./gi,
                // Plasma do Paciente: valor Seg.
                /Plasma\s*do\s*Paciente[^>]*>\s*([0-9.,]+)\s*Seg\./gi,
                // Atividade: valor %
                /Atividade[^>]*>\s*([0-9.,]+)\s*%/gi,
                // RNI: valor
                /RNI[^>]*>\s*([0-9.,]+)/gi,
                // Segmentados (VR): valor %
                /Segmentados[^>]*\(\s*V\s*R\s*\)[^>]*>\s*([0-9.,]+)\s*%\s*VR:\s*([^;\n]+)/gi,
                // Linfócitos (VR): valor %
                /Linfocitos[^>]*\(\s*V\s*R\s*\)[^>]*>\s*([0-9.,]+)\s*%\s*VR:\s*([^;\n]+)/gi,
                // Monócitos (VR): valor %
                /Monocitos[^>]*\(\s*V\s*R\s*\)[^>]*>\s*([0-9.,]+)\s*%\s*VR:\s*([^;\n]+)/gi,
                // Bastões (VR): valor %
                /Bastoes[^>]*\(\s*V\s*R\s*\)[^>]*>\s*([0-9.,]+)\s*%\s*VR:\s*([^;\n]+)/gi,
            ];
            
            // Mapeamento de nomes para siglas
            const mapeamentoSiglas = {
                'Hematocrito': 'HTO',
                'Hemoglobina': 'HGB', 
                'Hemacia': 'RBC',
                'Leucocitos': 'WBC',
                'Plaquetas': 'PLT',
                'Vol. Corpusc. medio': 'VCM',
                'Hemog. corp. media': 'HCM',
                'Concent. hemoglob.': 'CHCM',
                'RDW': 'RDW',
                'TTPA': 'TTPA',
                'Ratio': 'RATIO',
                'Pool Normal': 'POOL_NORMAL',
                'Plasma do Paciente': 'PLASMA_PAC',
                'Atividade': 'ATIVIDADE',
                'RNI': 'RNI',
                'Segmentados': 'SEGM_VR',
                'Linfocitos': 'LINF_VR',
                'Monocitos': 'MONO_VR',
                'Bastoes': 'BAST_VR'
            };
            
            padroes.forEach((padrao, index) => {
                let match;
                while ((match = padrao.exec(textoCompleto)) !== null) {
                    const valor = match[1];
                    const referencia = match[2] || '';
                    
                    // Determinar sigla baseada no padrão
                    let sigla = '';
                    const textoAnterior = textoCompleto.substring(Math.max(0, match.index - 50), match.index);
                    
                    for (const [nome, siglaMap] of Object.entries(mapeamentoSiglas)) {
                        if (textoAnterior.includes(nome) || match[0].includes(nome)) {
                            sigla = siglaMap;
                            break;
                        }
                    }
                    
                    if (!sigla) {
                        // Tentar extrair sigla do contexto
                        const siglaMatch = textoAnterior.match(/([A-Z]{2,5})[^A-Za-z]*$/);
                        if (siglaMatch) {
                            sigla = siglaMatch[1];
                        } else {
                            sigla = `EX_${index}_${resultados.length}`;
                        }
                    }
                    
                    resultados.push({
                        requisicaoId: requisicaoId,
                        sigla: sigla,
                        valor: valor,
                        referencia: referencia.trim(),
                        unidade: this.extrairUnidade(match[0]),
                        valorNumerico: this.extrairValorNumerico(valor),
                        status: this.determinarStatusExame(valor, referencia)
                    });
                }
            });
            
        } catch (error) {
            console.warn('[PARSER] Erro no parse de resultados texto:', error.message);
        }
        
        return resultados;
    }

    /**
     * Verifica se o texto parece ser um resultado de exame válido
     */
    isValidExameResult(sigla, valor) {
        if (!sigla || !valor) return false;
        
        // Pular cabeçalhos de tabela
        if (sigla.toLowerCase().includes('exame') || 
            sigla.toLowerCase().includes('resultado') ||
            sigla.toLowerCase().includes('referência') ||
            valor.toLowerCase().includes('valor') ||
            valor.toLowerCase().includes('resultado')) {
            return false;
        }

        // Verificar se tem pelo menos 2 caracteres na sigla
        if (sigla.length < 2) return false;

        // Verificar se o valor tem conteúdo significativo
        if (valor.length < 1) return false;

        // Sigla deve parecer com código de exame (letras, números, alguns símbolos)
        if (!/^[A-Za-z0-9\-_\.\s]+$/.test(sigla)) return false;

        return true;
    }

    /**
     * Extrai a unidade de medida do valor do exame
     */
    extrairUnidade(valorTexto) {
        if (!valorTexto) return '';
        
        // Padrões comuns de unidades
        const unidadeMatch = valorTexto.match(/([a-zA-Z\/\%\²\³]+)$/);
        if (unidadeMatch) {
            return unidadeMatch[1];
        }

        // Unidades comuns no meio do texto
        const unidadesComuns = ['mg/dL', 'g/dL', 'mEq/L', 'UI/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mmol/L', 'x10³/µL', '/µL', '%'];
        for (const unidade of unidadesComuns) {
            if (valorTexto.includes(unidade)) {
                return unidade;
            }
        }

        return '';
    }

    /**
     * Extrai valor numérico do texto do resultado
     */
    extrairValorNumerico(valorTexto) {
        if (!valorTexto) return null;
        
        // Remover unidades e caracteres especiais, manter apenas números e vírgulas/pontos
        const numeroLimpo = valorTexto.replace(/[^0-9.,\-]/g, '');
        
        if (numeroLimpo) {
            // Converter vírgula para ponto e parsear
            const numero = parseFloat(numeroLimpo.replace(',', '.'));
            return !isNaN(numero) ? numero : null;
        }
        
        return null;
    }

    /**
     * Determina o status do exame baseado no valor e referência
     */
    determinarStatusExame(valor, referencia) {
        // Por enquanto retorna 'normal', mas pode ser expandido
        // para comparar com valores de referência
        if (!referencia) return 'sem_referencia';
        
        // TODO: Implementar lógica de comparação com valores de referência
        return 'normal';
    }

    /**
     * Parse alternativo para estruturas diferentes de resultados de exames
     */
    parseResultadosExamesAlternativo($, requisicaoId) {
        const resultados = [];
        
        try {
            // Buscar por padrões de texto que indiquem resultados
            $('div, p, span').each((index, element) => {
                const texto = $(element).text().trim();
                
                // Padrão: SIGLA: VALOR
                const match = texto.match(/^([A-Z0-9\-_]+):\s*(.+)$/i);
                if (match) {
                    const sigla = match[1].trim();
                    const valor = match[2].trim();
                    
                    if (this.isValidExameResult(sigla, valor)) {
                        resultados.push({
                            requisicaoId: requisicaoId,
                            sigla: sigla,
                            valor: valor,
                            referencia: '',
                            unidade: this.extrairUnidade(valor),
                            valorNumerico: this.extrairValorNumerico(valor),
                            status: 'normal'
                        });
                    }
                }
            });

        } catch (error) {
            console.warn('[PARSER] Erro no parse alternativo de resultados:', error.message);
        }

        return resultados;
    }
}

module.exports = HICDParser;
