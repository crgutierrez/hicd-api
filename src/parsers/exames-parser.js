const BaseParser = require('./base-parser');
const cheerio = require('cheerio');

/**
 * Parser para exames laboratoriais e de imagem do sistema HICD.
 * Refatorado a partir da lógica do hicd-parser-original.js.
 */
class ExamesParser extends BaseParser {
    constructor() {
        super();
        this.debug('ExamesParser (refatorado) inicializado');
    }

    /**
     * Parse principal para extrair a lista de requisições de exames.
     */
    parse(html, prontuario = null) {
        this.debug(`Iniciando parse da lista de exames para prontuário: ${prontuario}`);
        try {
            const $ = cheerio.load(html);
            const exames = [];

            // Buscar todas as seções de fieldset que contêm exames
            $('fieldset').each((index, fieldsetElement) => {
               
                const fieldset = $(fieldsetElement);
                const legend = fieldset.find('legend').text().trim();
                
                // Verificar se é uma seção de informações ou exames
                if (legend === 'Informações:') {
                    const exame = this.parseExameInformacoes($, fieldset, prontuario, index);
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

            console.log(`[PARSER] ✅ ${exames.length} requisições de exames extraídas para o paciente ${prontuario}`);
            return exames;

        } catch (error) {
            console.error(`[PARSER] Erro ao extrair exames do paciente ${prontuario}:`, error.message);
            return [];
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
            
            // console.log(`[PARSER] URL de impressão gerada para requisição ${requisicaoId}:`);
            // console.log(`[PARSER] Query String: ${queryString}`);
            // console.log(`[PARSER] Param (Base64): ${param}`);
            // console.log(`[PARSER] URL: ${urlCompleta}`);
            
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

            // Se a tabela não produziu resultados, tentar parse de texto e estrutura alternativa
            if (resultados.length === 0) {
                const resultadosTexto = this.parseResultadosTexto($, requisicaoId);
                resultados.push(...resultadosTexto);
            }

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


    /**
     * Parse dos detalhes de uma requisição de exame.
     */
    parseExameDetalhes(html, idRequisicao) {
        this.debug(`Extraindo detalhes da requisição de exame ${idRequisicao}`);
        const detalhes = {
            id: idRequisicao,
            cabecalho: {},
            resultados: [],
        };

        try {
            const $ = this.loadHTML(html);

            detalhes.cabecalho = this.extrairCabecalhoExame($);

            // Itera sobre cada tabela de resultado de exame
            $('table[width="100%"][border="0"][cellspacing="1"][cellpadding="1"]').each((index, table) => {
                const $table = $(table);
                const nomeExame = $table.find('td.sub_titulo').text().trim();

                if (nomeExame) {
                    const exame = {
                        nome: nomeExame,
                        itens: []
                    };

                    $table.find('tr').slice(1).each((i, row) => { // Pula a linha do título
                        const colunas = $(row).find('td');
                        if (colunas.length >= 4) {
                            const item = {
                                item: $(colunas[0]).text().trim(),
                                resultado: $(colunas[1]).text().trim(),
                                unidade: $(colunas[2]).text().trim(),
                                referencia: $(colunas[3]).text().trim(),
                                status: this.determinarStatusResultado($(colunas[1]))
                            };
                            if (item.item) { // Adiciona apenas se houver um nome para o item
                                exame.itens.push(item);
                            }
                        }
                    });

                    if (exame.itens.length > 0) {
                        detalhes.resultados.push(exame);
                    }
                }
            });

            this.debug(`✅ ${detalhes.resultados.length} grupos de resultados extraídos para a requisição ${idRequisicao}`);

        } catch (error) {
            this.error(`Erro ao extrair detalhes do exame ${idRequisicao}:`, error);
        }

        return detalhes;
    }

    /**
     * Extrai o cabeçalho da página de detalhes do exame.
     */
    extrairCabecalhoExame($) {
        const cabecalho = {};
        const textoCabecalho = $('body').text();
        const extract = (regex) => (textoCabecalho.match(regex) || [])[1] || '';

        cabecalho.pacienteNome = extract(/Paciente\s*:\s*([^\n]+)/);
        cabecalho.prontuario = extract(/Prontuário\s*:\s*(\d+)/);
        cabecalho.dataNascimento = extract(/Dt.Nasc.\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
        cabecalho.idade = extract(/Idade\s*:\s*([^\n]+)/);
        cabecalho.sexo = extract(/Sexo\s*:\s*([^\n]+)/);
        cabecalho.medico = extract(/Médico\s*:\s*([^\n]+)/);
        cabecalho.dataRequisicao = extract(/Data\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
        cabecalho.requisicao = extract(/Requisição\s*:\s*(\d+)/);

        return cabecalho;
    }

    /**
     * Determina o status de um resultado (Normal, Alterado) com base na cor da fonte.
     */
    determinarStatusResultado($td) {
        const fontElement = $td.find('font');
        if (fontElement.length > 0) {
            const color = fontElement.attr('color');
            if (color && color.toLowerCase() === '#ff0000') {
                return 'Alterado';
            }
        }
        return 'Normal';
    }

    /**
     * Extrai um parâmetro de uma URL.
     */
    extrairParametroUrl(url, parametro) {
        if (!url) return null;
        const urlObj = new URL(url, 'http://localhost'); // Base URL é necessária se a URL for relativa
        return urlObj.searchParams.get(parametro);
    }
}

module.exports = ExamesParser;
