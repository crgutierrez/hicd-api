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
                if (/^informa[çc][oõ]e?s?\s*:/i.test(legend)) {
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

            // ─── Estratégia 0 (prioritária): <table class="table1"> com <tr id="SIGLA"> ───
            // Estrutura nativa do exame.php do HICD: sigla no atributo id da linha,
            // conteúdo do laudo na 2ª célula.  A 3ª célula é sempre um div de gráfico vazio.
            const tabelaPrincipal = $('table.table1');
            if (tabelaPrincipal.length > 0) {
                tabelaPrincipal.find('tr[id]').each((i, row) => {
                    const $row  = $(row);
                    const sigla = ($row.attr('id') || '').trim();
                    if (!sigla) return;

                    const cells = $row.find('td');
                    if (cells.length < 2) return;

                    const textoConteudo = cells.eq(1).text();
                    if (!textoConteudo.trim()) return;
                    if (/AGUARDANDO\s+RESULTADO\s+DO\s+EXAME/i.test(textoConteudo)) return;

                    // Resultado simples: linha "Resultado---------------> VALOR UNIDADE [VR: REF]"
                    const matchResultado = textoConteudo.match(
                        /Resultado-+>\s*([\d,]+)\s+([\w\/%µ.]+)/i
                    );
                    if (matchResultado) {
                        const valor   = matchResultado[1];
                        const unidade = matchResultado[2].trim();

                        // Referência: inline na mesma linha após "VR:" …
                        let referencia = '';
                        const matchVRInline = textoConteudo.match(
                            /Resultado-+>.*?VR\s*:\s*([^\n]+)/i
                        );
                        if (matchVRInline) {
                            referencia = matchVRInline[1].trim();
                        } else {
                            // … ou em linha separada "V.R     : REF" / "VR: REF"
                            const matchVRLinha = textoConteudo.match(
                                /V\.?\s*R\.?\s*:\s*([^\n]+)/i
                            );
                            if (matchVRLinha) referencia = matchVRLinha[1].trim();
                        }

                        resultados.push({
                            requisicaoId,
                            sigla,
                            valor,
                            unidade,
                            referencia,
                            valorNumerico: this.extrairValorNumerico(valor),
                            status: this.determinarStatusExame(valor, referencia)
                        });
                    } else {
                        // Bloco complexo (hemograma, coagulograma...): armazenar texto bruto.
                        // expandirBlocoTextual o processará na etapa seguinte.
                        const valorBruto = textoConteudo.trim();
                        if (valorBruto.includes('\n')) {
                            resultados.push({
                                requisicaoId,
                                sigla,
                                valor:         valorBruto,
                                unidade:       '',
                                referencia:    '',
                                valorNumerico: null,
                                status:        'bloco_textual'
                            });
                        }
                    }
                });
            }

            // ─── Estratégias de fallback (somente quando table.table1 não está presente) ───
            if (resultados.length === 0) {
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
            }

            if (resultados.length === 0) {
                const resultadosTexto = this.parseResultadosTexto($, requisicaoId);
                resultados.push(...resultadosTexto);
            }

            if (resultados.length === 0) {
                resultados.push(...this.parseResultadosExamesAlternativo($, requisicaoId));
            }

            // Expandir blocos textuais conhecidos (HPL, PFR, BFR, TAP, TTPA...)
            // Usa identidade de objeto para distinguir itens expandidos (novos) dos
            // pré-existentes, permitindo remover duplicatas sem afetar os novos itens.
            const resultadosFinais  = [];
            const objetosExpandidos = new Set();   // referências dos itens vindos de expansão
            const siglasExpandidas  = new Set();   // siglas produzidas pelas expansões

            for (const resultado of resultados) {
                const expandidos = this.expandirBlocoTextual(resultado);
                if (expandidos && expandidos.length > 0) {
                    resultadosFinais.push(...expandidos);
                    expandidos.forEach(e => {
                        objetosExpandidos.add(e);
                        siglasExpandidas.add(e.sigla);
                    });
                } else {
                    resultadosFinais.push(resultado);
                }
            }

            // Mapa de siglas "brutas" extraídas por tabela → sigla canônica do bloco expandido.
            // Cobre casos onde o parser de tabela usa nomes curtos (TTPA, RATIO) enquanto
            // o parser de bloco produz nomes com prefixo (TTPA_TEMPO, TTPA_RATIO).
            const SIGLA_BRUTA_PARA_CANONICA = new Map([
                ['TTPA',        'TTPA_TEMPO'],
                ['RATIO',       'TTPA_RATIO'],
                ['POOL_NORMAL', 'TAP_CTRL'],
                ['PLASMA_PAC',  'TAP_TEMPO'],
                ['ATIVIDADE',   'TAP_ATIV'],
                ['RNI',         'INR'],
            ]);

            // Remover pré-existentes absorvidos por blocos expandidos.
            // Itens que VIERAM da expansão são sempre mantidos.
            const semDuplicatas = resultadosFinais.filter(r => {
                if (objetosExpandidos.has(r)) return true;         // item produzido por expansão
                if ((r.valor || '').includes('\n')) return true;   // bloco multi-linha — manter
                if (siglasExpandidas.has(r.sigla)) return false;   // sigla exata absorvida
                const canonica = SIGLA_BRUTA_PARA_CANONICA.get(r.sigla);
                return !(canonica && siglasExpandidas.has(canonica)); // sigla bruta absorvida
            });

            console.log(`[PARSER] ✅ ${semDuplicatas.length} resultados extraídos da requisição ${requisicaoId}`);

            return semDuplicatas;

        } catch (error) {
            console.error(`[PARSER] Erro ao extrair resultados dos exames da requisição ${requisicaoId}:`, error.message);
            return [];
        }
    }

    /**
     * Parse de resultados em formato de texto estruturado.
     * Usa cheerio para percorrer o DOM — não opera sobre texto plano,
     * pois regex com sintaxe HTML ([^>]*>) nunca casam em texto extraído.
     */
    parseResultadosTexto($, requisicaoId) {
        const resultados = [];

        try {
            // Estratégia 1: linhas de tabela com "VR:" em alguma célula
            // Estrutura típica do HICD: | Nome do exame | Valor Unidade VR: Ref |
            $('tr').each((i, row) => {
                const cells = $(row).find('td');
                if (cells.length < 2) return;

                const textos = cells.map((j, td) => $(td).text().trim()).get();

                // Localiza a célula que contém "VR:" ou "V.R     :" (valor de referência)
                const vrIndex = textos.findIndex(t => /\bVR\s*:|V\.?\s*R\.?\s*:/i.test(t));
                if (vrIndex < 0) return;

                const textoVR = textos[vrIndex];

                // Extrai valor, unidade e referência da célula com VR:
                const matchVR = textoVR.match(/([0-9.,]+)\s*([^\s]*)\s+VR\s*:\s*(.+)/i);
                if (!matchVR) return;

                // O nome/sigla vem da primeira célula diferente da célula com VR:
                const sigla = textos.find((t, idx) => idx !== vrIndex && t.length > 0) || '';
                if (!sigla || !this.isValidExameResult(sigla, matchVR[1])) return;

                resultados.push({
                    requisicaoId,
                    sigla,
                    valor: matchVR[1],
                    unidade: matchVR[2] || '',
                    referencia: matchVR[3].trim(),
                    valorNumerico: this.extrairValorNumerico(matchVR[1]),
                    status: this.determinarStatusExame(matchVR[1], matchVR[3])
                });
            });

            // Estratégia 2: elementos inline com padrão "Nome: Valor Unidade VR: Ref"
            // Cobre layouts onde os dados ficam em <p>, <div> ou <span> únicos
            $('p, div, span, td').each((i, el) => {
                const texto = $(el).text().trim();

                const match = texto.match(/^(.+?)\s*:\s*([0-9.,]+)\s*([^\s]*)\s+VR\s*:\s*(.+)$/i);
                if (!match) return;

                const sigla = match[1].trim();
                if (!this.isValidExameResult(sigla, match[2])) return;

                // Evitar duplicatas já capturadas pela estratégia 1
                const jaExiste = resultados.some(
                    r => r.sigla === sigla && r.valor === match[2]
                );
                if (jaExiste) return;

                resultados.push({
                    requisicaoId,
                    sigla,
                    valor: match[2],
                    unidade: match[3] || '',
                    referencia: match[4].trim(),
                    valorNumerico: this.extrairValorNumerico(match[2]),
                    status: this.determinarStatusExame(match[2], match[4])
                });
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
     * Extrai valor numérico do texto, tratando formato brasileiro:
     *   vírgula = separador decimal, ponto = separador de milhar.
     * Exemplos: "31,90" → 31.9 | "12.230" → 12230 | "7.963,80" → 7963.8
     */
    extrairValorNumerico(valorTexto) {
        if (!valorTexto) return null;

        let s = valorTexto.replace(/[^0-9.,-]/g, '').trim();
        if (!s) return null;

        if (s.includes(',')) {
            // Vírgula presente = separador decimal; ponto é milhar → remover pontos
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (/\.\d{3}$/.test(s)) {
            // Ponto seguido de exatamente 3 dígitos no final = separador de milhar
            s = s.replace(/\./g, '');
        }

        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }

    /**
     * Extrai intervalo numérico de uma string de referência.
     * Suporta os formatos usados pelo HICD:
     *   "12,0 - 16,0"              → { min: 12.0, max: 16.0 }
     *   "40,00 a 54,00"            → { min: 40.0, max: 54.0 }
     *   "M 40,00 a 54,00 F 37,..."  → primeiro intervalo encontrado
     *   "< 5,0" / "Até 5,0"        → { min: null, max: 5.0 }
     *   "> 60"  / "Acima de 60"    → { min: 60.0, max: null }
     * Retorna null quando não é possível extrair valores numéricos.
     */
    parsearIntervaloReferencia(referencia) {
        if (!referencia || !referencia.trim()) return null;

        const toNum = (s) => {
            if (!s) return null;
            // vírgula = decimal, ponto = milhar
            let n = s.replace(/\./g, '').replace(',', '.');
            const v = parseFloat(n);
            return isNaN(v) ? null : v;
        };

        // Padrão: dois números separados por " - ", " – " ou " a " (PT)
        const rangeMatch = referencia.match(
            /(\d[\d.]*,?\d*)\s*(?:-+|–|a\b)\s*(\d[\d.]*,?\d*)/i
        );
        if (rangeMatch) {
            const min = toNum(rangeMatch[1]);
            const max = toNum(rangeMatch[2]);
            if (min !== null && max !== null) return { min, max };
        }

        // Padrão: "< N" ou "Até N" ou "≤ N"
        const maxMatch = referencia.match(
            /(?:[<≤]|[Aa]t[eé]\s+)\s*(\d[\d.]*,?\d*)/
        );
        if (maxMatch) {
            const max = toNum(maxMatch[1]);
            if (max !== null) return { min: null, max };
        }

        // Padrão: "> N" ou "Acima de N" ou "≥ N"
        const minMatch = referencia.match(
            /(?:[>≥]|[Aa]cima\s+de\s+)\s*(\d[\d.]*,?\d*)/
        );
        if (minMatch) {
            const min = toNum(minMatch[1]);
            if (min !== null) return { min, max: null };
        }

        return null;
    }

    /**
     * Determina o status do exame comparando o valor com o intervalo de referência.
     * Retorna: 'normal' | 'alto' | 'baixo' | 'sem_referencia'
     */
    determinarStatusExame(valorTexto, referencia) {
        if (!referencia || !referencia.trim()) return 'sem_referencia';

        const valorNum = this.extrairValorNumerico(valorTexto);
        if (valorNum === null) return 'sem_referencia';

        const intervalo = this.parsearIntervaloReferencia(referencia);
        if (!intervalo) return 'sem_referencia';

        if (intervalo.min !== null && valorNum < intervalo.min) return 'baixo';
        if (intervalo.max !== null && valorNum > intervalo.max) return 'alto';
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
     * Filtra exames pelo tipo/nome dos itens solicitados ou clínica.
     */
    filterByTipo(exames, tipo) {
        if (!tipo || !Array.isArray(exames)) return exames || [];
        const termo = tipo.toLowerCase();
        return exames.filter(exame =>
            (exame.clinica && exame.clinica.toLowerCase().includes(termo)) ||
            (exame.exames && exame.exames.some(e => e.nome && e.nome.toLowerCase().includes(termo)))
        );
    }

    /**
     * Filtra exames pelo intervalo de datas (formato DD/MM/YYYY).
     */
    filterByPeriodo(exames, dataInicio, dataFim) {
        if (!Array.isArray(exames)) return [];
        return exames.filter(exame => {
            if (!exame.data) return false;
            const [d, m, y] = exame.data.split('/');
            const dataExame = new Date(`${y}-${m}-${d}`);
            if (dataInicio && dataExame < new Date(dataInicio)) return false;
            if (dataFim && dataExame > new Date(dataFim)) return false;
            return true;
        });
    }

    /**
     * Agrupa exames por clínica solicitante.
     */
    groupByTipo(exames) {
        if (!Array.isArray(exames)) return {};
        return exames.reduce((grupos, exame) => {
            const chave = exame.clinica || 'Outros';
            if (!grupos[chave]) grupos[chave] = [];
            grupos[chave].push(exame);
            return grupos;
        }, {});
    }

    /**
     * Extrai os nomes únicos de exames disponíveis no HTML.
     */
    extractAvailableTypes(html) {
        try {
            const $ = cheerio.load(html);
            const tipos = new Set();
            $('a[onclick*="selecionaEx"]').each((i, el) => {
                const nome = $(el).text().trim();
                if (nome) tipos.add(nome);
            });
            return [...tipos].sort();
        } catch (error) {
            console.warn('[PARSER] Erro ao extrair tipos de exames:', error.message);
            return [];
        }
    }

    /**
     * Busca exames cujos campos contenham o termo informado.
     */
    search(exames, termo) {
        if (!termo || !Array.isArray(exames)) return exames || [];
        const t = termo.toLowerCase();
        return exames.filter(exame =>
            (exame.medico && exame.medico.toLowerCase().includes(t)) ||
            (exame.clinica && exame.clinica.toLowerCase().includes(t)) ||
            (exame.requisicao && exame.requisicao.includes(t)) ||
            (exame.exames && exame.exames.some(e => e.nome && e.nome.toLowerCase().includes(t)))
        );
    }

    // ──────────────────────────────────────────────────────────────
    // PARSE DE LAUDOS TEXTUAIS ESTRUTURADOS (HPL, PFR, ...)
    // ──────────────────────────────────────────────────────────────

    /**
     * Tabela de siglas para nomes normalizados de itens de laudo.
     * Chave: nome em minúsculas após normalização.
     */
    _siglaDeLaudo(nomeNormalizado) {
        const SIGLAS = {
            // Eritrograma
            'hematocrito':                   'HTO',
            'hemoglobina':                   'HGB',
            'hemacia':                       'RBC',
            'vol. corpusc. medio (vcm)':     'VCM',
            'hemog. corp. media (hcm)':      'HCM',
            'concent. hemoglob. (chcm)':     'CHCM',
            'rdw':                           'RDW',
            // Leucograma
            'leucocitos':                    'WBC',
            'blastos (vr)':                  'BLAST_VR',
            'blastos (va)':                  'BLAST_VA',
            'basofilos (vr)':               'BASO_VR',
            'basofilos (va)':               'BASO_VA',
            'eosinofilos (vr)':             'EOSI_VR',
            'eosinofilos (va)':             'EOSI_VA',
            'mielocitos (vr)':              'MIEL_VR',
            'mielocitos (va)':              'MIEL_VA',
            'metamielocitos (vr)':          'META_VR',
            'metamielocitos (va)':          'META_VA',
            'bastoes (vr)':                 'BAST_VR',
            'bastoes (va)':                 'BAST_VA',
            'segmentados (vr)':             'SEGM_VR',
            'segmentados (va)':             'SEGM_VA',
            'linfocitos (vr)':              'LINF_VR',
            'linfocitos (va)':              'LINF_VA',
            'monocitos (vr)':               'MONO_VR',
            'monocitos (va)':               'MONO_VA',
            'plaquetas':                    'PLT',
            // Proteínas Totais e Frações
            'proteinas totais':             'PROT_TOT',
            'albumina serica':              'ALBUMINA',
            'globulinas':                   'GLOB',
            // Bilirrubinas (inclui typo real do HICD: "BILIRRUTINA")
            'bilirrubina total':            'BT',
            'bilirrutina total':            'BT',
            'bilirrubina direta':           'BD',
            'bilirrubina indireta':         'BI',
            // Coagulação — TAP
            'pool normal':                  'TAP_CTRL',
            'plasma do paciente':           'TAP_TEMPO',
            'atividade':                    'TAP_ATIV',
            'inr':                          'INR',
            'rni':                          'INR',
            // Coagulação — TTPA
            'ttpa':                         'TTPA_TEMPO',
            'ratio (r)':                    'TTPA_RATIO',
        };
        return SIGLAS[nomeNormalizado.toLowerCase()] || null;
    }

    /**
     * Normaliza o nome bruto de um item de laudo:
     * remove dashes/seta no final, normaliza "(V R)"/"(V A)" e espaços.
     */
    normalizarNomeLaudo(nomeRaw) {
        return nomeRaw
            .replace(/-+>?\s*$/, '')               // remove "------>" no final
            .replace(/\(\s*V\s*R\s*\)/g, '(VR)')   // "( V R )" → "(VR)"
            .replace(/\(\s*V\s*A\s*\)/g, '(VA)')   // "( V A )" → "(VA)"
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Faz o parse de uma única linha de laudo no formato:
     *   Nome[---]>   VALOR   UNIT   [VR: REF]
     *   Nome (VR)    VALOR   UNIT   [VR: REF]
     *
     * Retorna null se a linha não contiver um valor numérico válido.
     */
    parseLinhaDeLaudo(linha, requisicaoId) {
        const l = linha.trim();
        if (!l) return null;

        // Exige: nome, >= 2 espaços, valor começando com dígito,
        // unidade opcional, referência opcional após "VR:" ou "V. referencia:"
        const match = l.match(
            /^(.+?)\s{2,}([0-9][\d.,]*)\s*(?:(\S+)\s*)?(?:(?:VR|V\.\s*referencia)\s*:?\s*(.+?))?$/
        );
        if (!match) return null;

        const nome = this.normalizarNomeLaudo(match[1]);
        if (!nome) return null;

        const valorStr    = match[2];
        const unidade     = (match[3] || '').trim();
        const referencia  = (match[4] || '').trim();
        const sigla       = this._siglaDeLaudo(nome) || nome.toUpperCase().replace(/\s+/g, '_').slice(0, 12);
        const valorNumerico = this.extrairValorNumerico(valorStr);

        return {
            requisicaoId,
            sigla,
            nome,
            valor: valorStr,
            unidade,
            referencia,
            valorNumerico,
            status: this.determinarStatusExame(valorStr, referencia)
        };
    }

    /**
     * Parse do Hemograma Completo (HPL) — cada item vira uma entrada individual.
     */
    parseHemograma(texto, requisicaoId) {
        const itens = [];
        for (const linha of texto.split('\n')) {
            const item = this.parseLinhaDeLaudo(linha, requisicaoId);
            if (item) itens.push(item);
        }
        return itens;
    }

    /**
     * Parse de Proteínas Totais e Frações (PFR) — cada item vira uma entrada individual.
     */
    parseProteinasTotais(texto, requisicaoId) {
        const itens = [];
        for (const linha of texto.split('\n')) {
            const item = this.parseLinhaDeLaudo(linha, requisicaoId);
            if (item) itens.push(item);
        }
        return itens;
    }

    /**
     * Parse de Bilirrubinas Totais e Frações (BT, BD, BI) — cada item vira uma entrada individual.
     */
    parseBilirrubinas(texto, requisicaoId) {
        const itens = [];
        for (const linha of texto.split('\n')) {
            const item = this.parseLinhaDeLaudo(linha, requisicaoId);
            if (item) itens.push(item);
        }
        return itens;
    }

    /**
     * Parse do TAP (Tempo de Atividade de Protrombina) — cada item vira uma entrada individual.
     * Adiciona prefixo TAP_ nas siglas para evitar colisão com campos do TTPA.
     * Exceção: INR permanece sem prefixo por ser uma sigla universal.
     */
    parseTAP(texto, requisicaoId) {
        // Siglas que já vêm corretas do mapa (prefixo embutido ou universais)
        const NAO_PREFIXAR = new Set(['INR', 'TAP_CTRL', 'TAP_TEMPO', 'TAP_ATIV']);
        const itens = [];
        for (const linha of texto.split('\n')) {
            const item = this.parseLinhaDeLaudo(linha, requisicaoId);
            if (!item) continue;
            if (!NAO_PREFIXAR.has(item.sigla)) {
                item.sigla = `TAP_${item.sigla}`;
            }
            itens.push(item);
        }
        return itens;
    }

    /**
     * Parse do TTPA (Tempo de Tromboplastina Parcial Ativada) — cada item vira uma entrada individual.
     * Adiciona prefixo TTPA_ nas siglas para evitar colisão com campos do TAP.
     */
    parseTTPA(texto, requisicaoId) {
        // Siglas que já vêm corretas do mapa (prefixo embutido)
        const NAO_PREFIXAR = new Set(['TTPA_TEMPO', 'TTPA_RATIO']);
        const itens = [];
        for (const linha of texto.split('\n')) {
            const item = this.parseLinhaDeLaudo(linha, requisicaoId);
            if (!item) continue;
            if (!NAO_PREFIXAR.has(item.sigla)) {
                item.sigla = `TTPA_${item.sigla}`;
            }
            itens.push(item);
        }
        return itens;
    }

    /**
     * Detecta se um resultado é um bloco de texto estruturado (HPL, PFR)
     * e o expande em itens individuais.
     * Retorna array expandido ou null se não for um bloco reconhecido.
     */
    expandirBlocoTextual(resultado) {
        const texto = (resultado.valor || '').trim();
        if (!texto.includes('\n')) return null;

        const titulo = texto.split('\n')[0].trim();

        if (/^HEMOGRAMA\b/i.test(titulo)) {
            return this.parseHemograma(texto, resultado.requisicaoId);
        }

        if (/^PROTEINAS\s+TOTAIS\b/i.test(titulo)) {
            return this.parseProteinasTotais(texto, resultado.requisicaoId);
        }

        if (/^BILIRRUBINAS?\b/i.test(titulo)) {
            return this.parseBilirrubinas(texto, resultado.requisicaoId);
        }

        // "TEMPO DE PROTROMBINA ( TAP )" ou "TEMPO DE ATIVIDADE DE PROTROMBINA" ou início "TAP"
        if (/^(?:TEMPO\s+DE\s+(?:ATIVIDADE\s+DE\s+)?PROTROMBINA|TAP)\b/i.test(titulo)) {
            return this.parseTAP(texto, resultado.requisicaoId);
        }

        // "TEMPO DE TROMBOPLASTINA (TTPA)", "TEMPO TROMBOPLASTINA ATIVADA", "TTPA"
        if (/^(?:TEMPO\s+(?:DE\s+)?TROMBOPLASTINA|TTPA)\b/i.test(titulo)) {
            return this.parseTTPA(texto, resultado.requisicaoId);
        }

        // Fallback genérico: bloco multi-linha não reconhecido —
        // tenta parsear cada linha individualmente e retorna os itens encontrados.
        // Se nenhuma linha tiver valor numérico válido, mantém o resultado original (null).
        const itensFallback = [];
        for (const linha of texto.split('\n')) {
            const item = this.parseLinhaDeLaudo(linha, resultado.requisicaoId);
            if (item) itensFallback.push(item);
        }
        return itensFallback.length > 0 ? itensFallback : null;
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
