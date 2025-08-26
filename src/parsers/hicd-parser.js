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
                const evolucao = this.parseEvolucaoDetalhada($, areaElement, pacienteId, index);
                if (evolucao) {
                    evolucoes.push(evolucao);
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

    /**
     * Parse detalhado da estrutura de evolução específica
     */
    parseEvolucaoDetalhada($, areaElement, pacienteId, index) {
        try {
            const area = $(areaElement);
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

            // Extrair informações das linhas de dados
            area.find('.row').each((i, rowElement) => {
                const row = $(rowElement);
                const cols = row.find('[class*="col-lg-"]');
                
                if (cols.length >= 2) {
                    cols.each((j, colElement) => {
                        const col = $(colElement);
                        const texto = col.text().trim();
                        
                        // Profissional
                        if (texto.includes('Profissional:')) {
                            const nextCol = cols.eq(j + 1);
                            if (nextCol.length) {
                                evolucao.profissional = this.limparTextoSimples(nextCol.text());
                            }
                        }
                        
                        // Data Evolução
                        if (texto.includes('Data Evolução:')) {
                            const nextCol = cols.eq(j + 1);
                            if (nextCol.length) {
                                evolucao.dataEvolucao = this.limparTextoSimples(nextCol.text());
                            }
                        }
                        
                        // Atividade
                        if (texto.includes('Atividade:')) {
                            const nextCol = cols.eq(j + 1);
                            if (nextCol.length) {
                                const atividadeTexto = nextCol.text();
                                
                                // Extrair atividade principal
                                const atividadeMatch = atividadeTexto.match(/^([^S]+)/);
                                if (atividadeMatch) {
                                    evolucao.atividade = this.limparTextoSimples(atividadeMatch[1]);
                                }
                                
                                // Extrair sub-atividade
                                const subAtividadeMatch = atividadeTexto.match(/Sub-Atividade:\s*(.+)/);
                                if (subAtividadeMatch) {
                                    evolucao.subAtividade = this.limparTextoSimples(subAtividadeMatch[1]);
                                }
                            }
                        }
                        
                        // Data Atualização
                        if (texto.includes('Data Atualização:')) {
                            const nextCol = cols.eq(j + 1);
                            if (nextCol.length) {
                                evolucao.dataAtualizacao = this.limparTextoSimples(nextCol.text());
                            }
                        }
                        
                        // Clínica/Leito
                        if (texto.includes('Clinica / Leito:')) {
                            const nextCol = cols.eq(j + 1);
                            if (nextCol.length) {
                                evolucao.clinicaLeito = this.limparTextoSimples(nextCol.text());
                            }
                        }
                    });
                }
            });

            // Extrair descrição/texto da evolução
            const panelBody = area.find('.panel-body');
            if (panelBody.length > 0) {
                const textDiv = panelBody.find('[id$="txtView"]');
                if (textDiv.length > 0) {
                    // Extrair texto completo preservando quebras de linha
                    const textoHtml = textDiv.html();
                    const textoLimpo = this.limparTextoEvolucao(textoHtml);
                    
                    evolucao.textoCompleto = textoLimpo;
                    evolucao.descricao = this.extrairResumoEvolucao(textoLimpo);
                    
                    // Extrair dados estruturados da evolução
                    const dadosEstruturados = this.extrairDadosEstruturadosEvolucao(textoLimpo);
                    evolucao.dadosEstruturados = dadosEstruturados;
                }
            }

            // Só retornar se tiver dados mínimos
            if (evolucao.dataEvolucao || evolucao.profissional || evolucao.textoCompleto) {
                return evolucao;
            }

            return null;

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
}

module.exports = HICDParser;
