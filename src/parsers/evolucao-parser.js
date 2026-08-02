const BaseParser = require('./base-parser');
const HICDParser = require('./hicd-parser-original');
const cheerio = require('cheerio');
/**
 * Parser para evoluções de pacientes do sistema HICD.
 * Refatorado a partir da lógica do hicd-parser-original.js.
 */
class EvolucaoParser extends BaseParser {
    constructor() {

        super();
        this.originalParser = new HICDParser();
        this.debug('EvolucaoParser (refatorado) inicializado');
    }

    /**
     * Parse principal para extrair a lista de evoluções de um paciente.
     * Lógica baseada em `parseEvolucoes` de `hicd-parser-original.js`.
     */
    parse(html, prontuario = null) {
        this.debug(`Iniciando parse de evoluções para prontuário: ${prontuario}`);
        try {
            const $ = cheerio.load(html);
            const evolucoes = [];

            // const cabecalho = this.extrairCabecalhoEvolucao($);
            // this.debug('Cabeçalho extraído:', cabecalho);

            // Estratégia 1: Buscar pela nova estrutura com #areaHistEvol
            $('#areaHistEvol').each((index, areaElement) => {
                const evolucoesDetalhadamente = this.parseEvolucaoDetalhada($, areaElement, prontuario, index);
                if (evolucoesDetalhadamente && evolucoesDetalhadamente.length > 0) {
                    evolucoes.push(...evolucoesDetalhadamente);
                }
            });

            // // Se não encontrou na estrutura específica, usar o método anterior
            // if (evolucoes.length === 0) {
            //     return this.parseEvolucoesFallback($, prontuario);
            // }

            console.log(`[PARSER] ✅ ${evolucoes.length} evoluções extraídas para o paciente ${prontuario}`);

            return evolucoes;


        } catch (error) {
            this.error('Erro no parse de evoluções:', error);
            return [];
        }
    }

    /**
     * Parse detalhado da nova estrutura de evolução.
     * Lógica estritamente baseada em `parseEvolucaoDetalhada` de `hicd-parser-original.js`.
     */
    parseEvolucaoDetalhada($, areaElement, prontuario, index) {
        const evolucoes = [];
        try {
            const area = $(areaElement);
            const rows = area.find('.row');
            this.debug(`Encontradas ${rows.length} linhas de dados na área de evolução ${index}`);

            // O parser original itera em blocos de 5 linhas. Vamos replicar essa lógica.
            for (let i = 0; i < rows.length; i += 5) {
                const evolucao = {};
                evolucao.prontuario = prontuario;

                const row = rows.eq(i);


                const cabecalhoRow = rows.eq(i);
                const rowDois = rows.eq(i + 1)
                const rowTres = rows.eq(i + 2);
                const rowQuatro = rows.eq(i + 3);U
                const textoRow = rows.eq(i + 1);
                const assinaturaRow = rows.eq(i + 2);
                // As linhas i+3 e i+4 são geralmente divisores ou em branco no layout original.

                // Extrai todos os campos da primeira linha do bloco
                evolucao.profissional    = this.extrairCampoDaLinha($, cabecalhoRow, 'Profissional:');
                evolucao.dataEvolucao   = this.extrairCampoDaLinha($, cabecalhoRow, 'Data Evolução:');
                evolucao.atividade      = this.extrairCampoDaLinha($, rowDois, 'Atividade:');
                evolucao.dataAtualizacao= this.extrairCampoDaLinha($, rowDois, 'Data de Atualização:');
                evolucao.clinicaLeito   = this.extrairCampoDaLinha($, rowTres, 'Clínica/Leito:');
                evolucao.descricao      = this.extrairCampoDaLinha($, rowQuatro, 'Descrição:');
                evolucao.textoCompleto  = evolucao.descricao;

                // Se não encontrou data, provavelmente não é um registro válido, então pulamos.
                if (!evolucao.dataEvolucao) {
                    continue;
                }

                // textoLimpo: o texto já vem limpo de extrairCampoDaLinha; apenas copiar.
                evolucao.textoLimpo = evolucao.descricao;
                evolucao.resumo     = this.extrairResumoEvolucao(evolucao.descricao);

                // dadosEstruturados: extrair diretamente do texto da descrição.
                evolucao.dadosEstruturados = this.extrairDadosEstruturadosEvolucao(evolucao.descricao);
                // dadosEstruturados já foi extraído do HTML por retornaEvolucaoDetalhada (linha 91)

               
                evolucoes.push(evolucao);
            }
            this.debug(`Total de ${evolucoes.length} evoluções detalhadas processadas na área ${index}.`);
            return evolucoes;

        } catch (error) {
            this.error(`Erro ao processar evolução detalhada ${index}:`, error);
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

    /**
     * Normaliza string para comparação flexível: remove acentos, colapsa espaços/barras.
     * Permite casar "Clinica / Leito:" com "Clínica/Leito:" e vice-versa.
     */
    _normalizarLabel(s) {
        return s
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
            .replace(/\s*\/\s*/g, '/')                          // "a / b" → "a/b"
            .replace(/\s+/g, ' ')
            .replace(/\bde\s+/g, '')                            // "data de atualizacao" → "data atualizacao"
            .trim();
    }

    /**
     * Helper para extrair o valor de um campo em uma linha de dados.
     * A comparação é normalizada (sem acentos, sem espaços extras, sem "de" articular)
     * para resistir a variações de grafia no HTML do HICD.
     */
    extrairCampoDaLinha($, row, textoPesquisa) {
        const buscaNorm = this._normalizarLabel(textoPesquisa);
        const isDescricao = this._normalizarLabel(textoPesquisa).includes('descricao');

        let retorno = '';
        const cols = row.find('[class*="col-lg-"]');
        if (cols.length >= 2) {
            cols.each((j, colElement) => {
                const col = $(colElement);
                const textoNorm = this._normalizarLabel(col.text().trim());

                if (textoNorm.includes(buscaNorm)) {
                    const nextCol = cols.eq(j + 1);
                    if (nextCol.length) {
                        if (isDescricao) {
                            retorno = this.limparTextoEvolucao(nextCol.html());
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
     * Extrai o cabeçalho com informações do paciente.
     */
    extrairCabecalhoEvolucao($) {
        const cabecalho = {};
        const cabecalhoText = $('body').text();
        const extract = (regex) => (cabecalhoText.match(regex) || [])[1] || '';

        cabecalho.pacienteNome = extract(/Nome:\s*([^\n]+)/);
        cabecalho.prontuario = extract(/Prontuário:\s*(\d+)/);

        return cabecalho;
    }

    /**
     * Extrai os detalhes de uma única entrada de evolução a partir de sua tabela.
     */
    extrairDetalhesEvolucao($, $table) {
        const evolucao = {
            data: '',
            hora: '',
            profissional: '',
            conselho: '',
            registroConselho: '',
            texto: '',
            dataCompleta: null
        };

        try {
            const linhas = $table.find('tr');

            // A primeira linha contém data, hora e profissional
            const primeiraLinha = $(linhas[0]).text().trim();
            const matchDataHora = primeiraLinha.match(/(\d{2}\/\d{2}\/\d{4})\s*às\s*(\d{2}:\d{2})/);
            if (matchDataHora) {
                evolucao.data = matchDataHora[1];
                evolucao.hora = matchDataHora[2];
                // Formata a data para ordenação
                const [dia, mes, ano] = evolucao.data.split('/');
                evolucao.dataCompleta = new Date(`${ano}-${mes}-${dia}T${evolucao.hora}:00`);
            }

            const matchProfissional = primeiraLinha.match(/Profissional:\s*(.+)/);
            if (matchProfissional) {
                evolucao.profissional = matchProfissional[1].trim();
            }

            // A segunda linha geralmente contém o texto da evolução
            if (linhas.length > 1) {
                const textoEvolucao = $(linhas[1]).find('td').text().trim();
                evolucao.texto = textoEvolucao;
            }

            // A terceira linha (se existir) contém a assinatura e o registro do conselho
            if (linhas.length > 2) {
                const assinaturaTexto = $(linhas[2]).text().trim();
                const matchConselho = assinaturaTexto.match(/(CRM|COREM|COREN|CREFITO|CRF|CRN|CRO|CRP|CRESS)\s*-\s*([A-Z]{2})\s*([\d\.\-\/]+)/);
                if (matchConselho) {
                    evolucao.conselho = matchConselho[1];
                    evolucao.registroConselho = `${matchConselho[1]}-${matchConselho[2]} ${matchConselho[3]}`;
                }
            }

        } catch (error) {
            this.error('Erro ao extrair detalhes de uma evolução específica:', error);
        }

        return evolucao;
    }

    // =================================================================
    // MÉTODOS ADICIONADOS A PARTIR DO HICD-PARSER-ORIGINAL
    // =================================================================

    /**
     * Limpa texto simples removendo espaços desnecessários
     */
    limparTextoSimples(texto) {
        if (!texto) return '';
        return texto.trim().replace(/\s+/g, ' ');
    }

    /**
     * Limpa e formata texto de evolução preservando quebras de linha.
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
            .replace(/[^\S\n]+/g, ' ')      // colapsa espaços/tabs mas preserva \n
            .replace(/^ +/gm, '')           // remove espaços no início de cada linha
            .replace(/\n{3,}/g, '\n\n')     // limita linhas em branco consecutivas a uma
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
        if (!texto) return {};

        const dados = {
            identificacao: this.parseSecaoIdentificacao(texto),
            hipotesesDiagnosticas: this.parseHipotesesDiagnosticas(texto),
            diagnosticosAnteriores: this.parseSecaoSimples(texto, 'Diagnósticos anteriores'),
            medicamentosEmUso: this.parseMedicamentosEmUso(texto),
            medicamentosAnteriores: this.parseSecaoSimples(texto, 'Fez uso'),
            dispositivos: this.parseSecaoSimples(texto, 'Dispositivos'),
            examesComplementares: this.parseSecaoExames(texto),
            gasometrias: this.parseSecaoGasometria(texto),
            historico: {
                queixaPrincipal: this.extrairValor(texto, /QP:\s*”([^”]+)”/),
                hda: this.extrairValor(texto, /HDA:\s*([\s\S]*?)(?=HPP:|Admissão emergência:)/),
                hpp: this.extrairValor(texto, /HPP:\s*([\s\S]*?)(?=HO:|Admissão emergência:)/),
                historiaObstetrica: this.extrairValor(texto, /HO:\s*([\s\S]*?)(?=HF:)/),
                historiaFamiliar: this.extrairValor(texto, /HF:\s*([\s\S]*?)(?=HSE:)/),
                historiaSocioeconomica: this.extrairValor(texto, /HSE:\s*([\s\S]*?)(?=Admissão emergência:)/),
            },
            admissaoEmergencia: this.extrairValor(texto, /Admissão emergência:\s*([\s\S]*?)(?=Admissão UTIP:)/i),
            admissaoUTIP: this.extrairValor(texto, /Admissão UTIP:\s*([\s\S]*?)(?=Evolução médica:)/i),
            evolucaoMedica: this.extrairValor(texto, /Evolução médica:\s*([\s\S]*?)(?=Controle 24 h:|Controle 24h:|Exame F[íi]sico:|AO EXAME|Conduta:)/i),
            controle24h: this.extrairValor(texto, /Controle 24 h?:\s*([\s\S]*?)(?=Exame F[íi]sico:|AO EXAME|Diurese:|BH 24 h?:|Conduta:)/i),
            diurese: this.extrairValor(texto, /Diurese:\s*([\s\S]*?)(?=BH 24 h?:|Balan[çc]o h[íi]drico:|Exame F[íi]sico:|AO EXAME|Conduta:|$)/i),
            bh24h: this.extrairValor(texto, /BH 24 h?:\s*([\s\S]*?)(?=Exame F[íi]sico:|AO EXAME|Conduta:|$)/i),
            exameFisico: this.extrairValor(texto, /(?:Exame F[íi]sico|AO EXAME\s+F[IÍ]SICO):\s*([\s\S]*?)(?=Conduta:|Pend[êe]ncias:|Medicaç|$)/i),
            conduta: this.parseSecaoSimples(texto, 'Conduta'),
            pendencias: this.parseSecaoSimples(texto, 'Pendências'),
        };

        return dados;
    }

    /**
     * Extrai um valor único de uma seção usando regex.
     */
    extrairValor(texto, regex) {
        const match = texto.match(regex);
        return match && match[1] ? match[1].trim() : '';
    }

    /**
     * Extrai hipóteses diagnósticas com suporte a variantes sem dois pontos:
     * "Hipóteses Diagnósticas:", "Hipóteses Diagnósticas Atuais", etc.
     */
    parseHipotesesDiagnosticas(texto) {
        // Regex flexível: aceita colon ou nova linha imediata como delimitador de início
        const match = texto.match(
            /Hip[oó]teses?\s+Diagn[oó]stic[ao]s?(?:[^\S\n]+\w+)*:?[^\S\n]*\n([\s\S]*?)(?=Medicaç|Em uso|Fez [Uu]so|Dispositivos|Conduta:|Exame\s+F[íi]sico|AO EXAME|Evolu[çc][aã]o\s+m[eé]dica|Pend[êe]ncias:|$)/i
        );
        if (!match || !match[1]) return [];
        return match[1].trim()
            .split(/[\n\r]+/)
            .map(item => item.replace(/^[\d]+\.\s*|^[-•·]\s*/, '').trim())
            .filter(item => item.length > 3);
    }

    /**
     * Extrai medicamentos em uso com suporte a variantes:
     * "Em uso:", "Medicações em Uso:", "Medicações em uso:"
     */
    parseMedicamentosEmUso(texto) {
        const match = texto.match(
            /(?:Medica[çc][oõ]es\s+)?[Ee]m\s+[Uu]so:\s*([\s\S]*?)(?=Fez\s+[Uu]so:|Dispositivos:|Conduta:|Exame\s+F[íi]sico|AO EXAME|Pend[êe]ncias:|$)/i
        );
        if (!match || !match[1]) return [];
        return match[1].trim()
            .split(/[\n\r]+/)
            .map(item => item.replace(/^[-•·]\s*/, '').trim())
            .filter(item => item.length > 2);
    }

    /**
     * Parse de seções que contêm listas simples de itens.
     */
    parseSecaoSimples(texto, tituloSecao) {
        // Usa as seções conhecidas do HICD como delimitadores de fim de seção.
        // Evita falsos positivos de lookahead genérico com textos clínicos.
        const SECOES_DELIMITADORAS = [
            'Hipóteses Diagnósticas', 'Hipóteses diagnósticas',
            'Diagnósticos anteriores',
            'Em uso', 'Medicações em Uso', 'Medicações em uso',
            'Fez uso', 'Fez Uso', 'Dispositivos', 'Conduta', 'Pendências',
            'Exames Complementares', 'Gasometria',
            'Controle 24h', 'Controle 24 h', 'BH 24h', 'BH 24 h',
            'Diurese', 'Balanço hídrico',
            'Evolução médica', 'Exame Físico', 'AO EXAME FISICO',
            'Nome', 'Identificação',
            'HDA', 'HPP', 'HF', 'HSE', 'Admissão emergência', 'Admissão UTIP',
            // Subseções comuns em evoluções cirúrgicas / UTI
            'Hemoderivados', 'Culturas', 'Procedimentos', 'Pareceres',
            'Diagnóstico Pré-Operatório', 'Diagnóstico Pós-Operatório',
        ];

        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const lookahead = SECOES_DELIMITADORAS
            .filter(s => s !== tituloSecao)
            .map(esc)
            .join('|');

        const regex = new RegExp(
            `${esc(tituloSecao)}:\\s*([\\s\\S]*?)(?=(?:${lookahead}):|$)`,
            'i'
        );

        const match = texto.match(regex);
        if (!match || !match[1]) return [];

        return match[1]
            .trim()
            .split(/[\n\r]+/)
            .map(item => item.replace(/^[-•]\s*/, '').trim())
            .filter(item => item.length > 0);
    }

    /**
     * Parse da seção de identificação do paciente.
     */
    parseSecaoIdentificacao(texto) {
        const identificacao = {};
        const linhas = texto.substring(0, texto.indexOf('Hipóteses Diagnósticas')).split('\n');
        linhas.forEach(linha => {
            const partes = linha.split(':');
            if (partes.length > 1) {
                const chave = partes[0].trim();
                const valor = partes.slice(1).join(':').trim();
                if (chave === 'Nome') identificacao.nome = valor;
                if (chave === 'DN') identificacao.dataNascimento = valor;
                if (chave === 'Idade') identificacao.idade = valor;
                if (chave === 'Peso Atual') identificacao.peso = valor;
                if (chave === 'Procedência') identificacao.procedencia = valor;
                if (chave === 'Acompanhante') identificacao.acompanhante = valor;
                if (chave === 'DIH') identificacao.dih = valor;
            }
        });
        return identificacao;
    }

    /**
     * Parse da seção de exames complementares.
     */
    parseSecaoExames(texto) {
        const regex = /Exames Complementares:([\s\S]*?)(?=Gasometria|Conduta:|$)/i;
        const match = texto.match(regex);
        if (!match || !match[1]) return [];

        const textoExames = match[1];
        const examesPorData = textoExames.split(/(?=\d{2}\/\d{2}\/)/);

        return examesPorData.map(bloco => {
            const matchData = bloco.match(/(\d{2}\/\d{2}\/\d{2,4}):\s*([\s\S]*)/);
            if (matchData) {
                return {
                    data: matchData[1].trim(),
                    resultados: matchData[2].trim().replace(/\n/g, ' ')
                };
            }
            return null;
        }).filter(exame => exame && exame.resultados);
    }

    /**
     * Parse da seção de gasometria.
     */
    parseSecaoGasometria(texto) {
        const regex = /Gasometria([\s\S]*?)(?=QP:|HDA:|$)/i;
        const match = texto.match(regex);
        if (!match || !match[1]) return [];

        return match[1]
            .trim()
            .split('\n')
            .map(linha => linha.trim())
            .filter(linha => linha.length > 10 && linha.includes('pH'));
    }

    /**
     * Extrai pareceres de especialidade do texto de uma evolução.
     * Identifica trechos iniciados por "PARECER" ou "Parecer de" e retorna
     * uma lista com especialidade, profissional e texto do parecer.
     * TODO: implementar extração completa baseada na estrutura real do HICD.
     */
    parsePareceres(textoEvolucao, contexto = {}) {
        if (!textoEvolucao) return [];

        const pareceres = [];
        const regex = /Parecer(?:\s+de)?\s+([^:\n]+):\s*([\s\S]*?)(?=Parecer(?:\s+de)?|$)/gi;
        let match;

        while ((match = regex.exec(textoEvolucao)) !== null) {
            pareceres.push({
                especialidade: match[1].trim(),
                texto: match[2].trim(),
                paciente: contexto.paciente || null,
                dataEvolucao: contexto.dataEvolucao || null,
                profissional: contexto.profissional || null,
            });
        }

        return pareceres;
    }

    /**
     * Processa exames em formato estruturado baseado na saída do hicd-parser
     */
    processarExamesEstruturados(examesRaw) {
        return this.originalParser.processarExamesEstruturados(examesRaw);
    }

    /**
     * Analisa e estrutura diferentes tipos de exame
     */
    analisarTipoExame(textoExame) {
        return this.originalParser.analisarTipoExame(textoExame);
    }

    /**
     * Extrai valores específicos de gasometria
     */
    extrairValoresGasometria(textoGasometria) {
        return this.originalParser.extrairValoresGasometria(textoGasometria);
    }
}

module.exports = EvolucaoParser;
