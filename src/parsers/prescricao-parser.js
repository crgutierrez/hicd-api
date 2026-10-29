const BaseParser = require('./base-parser');
const cheerio = require('cheerio');

/**
 * Parser para prescrições médicas do sistema HICD, refatorado a partir do hicd-parser-original.js
 * para uma estrutura de classe, mantendo a lógica de extração original.
 */
class PrescricaoParser extends BaseParser {
    constructor() {
        super();
        this.debug('PrescricaoParser (refatorado) inicializado');
    }

    /**
     * Parse principal para a lista de prescrições.
     */
    parse(html, prontuario = null) {
        this.debug(`Iniciando parse de lista de prescrições para prontuário: ${prontuario}`);
        try {
            const $ = this.loadHTML(html);
            return this.parsePrescricoesList($, prontuario);
        } catch (error) {
            this.error('Erro no parse da lista de prescrições:', error);
            return [];
        }
    }

    /**
     * Extrai a lista de prescrições do HTML.
     */
    parsePrescricoesList($, prontuario) {
        const prescricoes = [];
        $('table.linhas_impressao_med tr').each((index, element) => {
            if (index === 0) return; // Pular cabeçalho

            const colunas = $(element).find('td');
            if (colunas.length >= 7) {
                const onclickAttr = $(colunas).find('input[type="button"]').attr('onclick');
                const idMatch = onclickAttr ? onclickAttr.match(/id_prescricao=(\d+)/) : null;
                if (idMatch) {
                    prescricoes.push({
                        id: idMatch[1],
                        codigo: $(colunas[0]).text().trim(),
                        dataHora: $(colunas[1]).text().trim(),
                        pacienteNome: $(colunas[2]).text().trim(),
                        registro: $(colunas[3]).text().trim(),
                        internacao: $(colunas[4]).text().trim(),
                        enfLeito: $(colunas[5]).text().trim(),
                        clinica: $(colunas[6]).text().trim(),
                        prontuario: prontuario,
                    });
                }
            }
        });
        this.debug(`✅ ${prescricoes.length} prescrições extraídas para o prontuário ${prontuario}`);
        return prescricoes;
    }

    /**
     * Parse dos detalhes de uma prescrição específica.
     */
    parsePrescricaoDetalhes(html, idPrescricao) {
        this.debug(`Extraindo detalhes da prescrição ${idPrescricao}`);
        const detalhes = {
            id: idPrescricao,
            cabecalho: {},
            medicamentos: [],
            dietas: [],
            observacoes: [],
            assinaturas: [],
            dataHoraImpressao: null
        };

        try {
            const $ = this.loadHTML(html);
            this.extrairCabecalhoPrescricao($, detalhes);

            // Layout novo do HICD: tudo numa única <table class="tabela-prescricao">
            // com linhas <tr class="header-secao"> delimitando as seções.
            // Layout antigo: uma <table border="1"> por seção. Mantido como fallback.
            const tabelaNova = $('table.tabela-prescricao').first();
            if (tabelaNova.length) {
                this.extrairSecoesLayoutNovo($, tabelaNova, detalhes);
            } else {
                this.extrairMedicamentosPrescricao($, detalhes);
                this.extrairDietas($, detalhes);
            }

            this.extrairObservacoesPrescricao($, detalhes);
            this.extrairAssinaturasPrescricao($, detalhes);
            this.extrairDataImpressaoPrescricao($, detalhes);
        } catch (error) {
            this.error(`Erro ao extrair detalhes da prescrição ${idPrescricao}:`, error);
        }
        return detalhes;
    }

    /**
     * Layout novo: varre a `table.tabela-prescricao` mantendo a seção corrente
     * (ditada pelas linhas `tr.header-secao`) e despacha cada linha de dados
     * (1ª coluna = "N-", 2ª coluna = conteúdo) para o coletor certo. Reusa
     * `extrairDadosMedicamento`/`extrairDadosMedicamentoNaoPadronizado`, que
     * continuam válidos — o texto de cada medicamento preserva o separador
     * `,\xa0\xa0` casado por `\s{2,}`.
     */
    extrairSecoesLayoutNovo($, tabela, detalhes) {
        let secao = null;
        tabela.find('tr').each((_, row) => {
            const $row = $(row);
            if ($row.hasClass('header-secao')) {
                const t = $row.text();
                if (/N[ÃA]O\s+PADRONIZAD|SEM\s+ESTOQUE|N\.?\s*P\.?/i.test(t)) secao = 'med_np';
                else if (/MEDICA[ÇC][ÃA]O/i.test(t)) secao = 'med_pad';
                else if (/DIETAS?/i.test(t)) secao = 'dieta';
                else if (/CUIDADOS\s+GERAIS/i.test(t)) secao = 'cuidado';
                else secao = null;
                return;
            }
            if (!secao) return;

            const colunas = $row.find('td');
            if (colunas.length < 2) return;
            const num = $(colunas[0]).text().trim();
            if (!/^\d+\s*-?$/.test(num)) return;
            const texto = $(colunas[1]).text().trim();
            if (!texto) return;
            const numero = num.replace(/\D/g, '');

            if (secao === 'med_pad') {
                const medicamento = this.extrairDadosMedicamento(texto);
                if (medicamento.nome) {
                    medicamento.naoPadronizado = false;
                    detalhes.medicamentos.push(medicamento);
                }
            } else if (secao === 'med_np') {
                const medicamento = this.extrairDadosMedicamentoNaoPadronizado(texto);
                if (medicamento.nome) {
                    medicamento.naoPadronizado = true;
                    detalhes.medicamentos.push(medicamento);
                }
            } else if (secao === 'dieta') {
                detalhes.dietas.push({ numero, descricao: texto });
            } else if (secao === 'cuidado') {
                detalhes.observacoes.push({ tipo: 'Cuidado Geral', descricao: `${numero} - ${texto}` });
            }
        });
    }

    extrairCabecalhoPrescricao($, detalhes) {
        const cabecalhoText = $('body').text();
        const extract = (regex) => (cabecalhoText.match(regex) || [])[1] || '';

        // Regexes aceitam os dois layouts: antigo ("REGISTRO/BE:", "INTERNADO EM:")
        // e novo ("REG/BE:", "INTERNADO:").
        detalhes.cabecalho = {
            pacienteNome: (extract(/NOME\s*:\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.\s]*?)\s+REG(?:ISTRO)?\/BE\s*:/i)
                || extract(/NOME\s*:\s*([A-Z\s]+)/)).trim(),
            registro: extract(/REG(?:ISTRO)?\/BE\s*:\s*(\d+)/i),
            prontuario: extract(/REG(?:ISTRO)?\/BE\s*:\s*(\d+)/i),
            leito: extract(/LEITO:\s*(\d+)/i),
            dataNascimento: extract(/DT\.?\s*NASC:\s*(\d{2}\/\d{2}\/\d{4})/i),
            idade: (extract(/IDADE:\s*(.+?)\s*-\s*CNS\s*:/i) || extract(/IDADE:\s*([^-\n]+)/i)).trim(),
            cns: extract(/CNS:\s*(\d+)/i),
            dataInternacao: extract(/INTERNADO(?:\s+EM)?\s*:\s*(\d{2}\/\d{2}\/\d{4})/i),
            clinica: (extract(/CL[IÍ]NICA\/SETOR:\s*(.+?)\s*-\s*LEITO\s*:/i)
                || extract(/CLINICA\/SETOR:\s*([^-]+?)(?:\s*-|$)/i)).trim(),
            // Layout novo: "PRESCRIÇÃO MÉDICA registrada em: 28/10/2026 09:56".
            // Layout antigo: "válida para 08/09/2025" (só a data).
            dataPrescricao: extract(/registrada\s+em\s*:\s*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/i)
                || extract(/válida\s+para\s*(\d{2}\/\d{2}\/\d{4})/i),
            validaPara: extract(/válida\s+para\s*(\d{2}\/\d{2}\/\d{4})/i),
            hospital: (extract(/(Hospital[^\n]*?)\s+PRESCRI[ÇC]/i)
                || ($('font:contains("Hospital")').first().text() || '')).trim(),
        };

        // "PESO: 21.6 Kg/g  ALT: Cm  SC: Sc" — o layout novo usa PONTO decimal
        // (o regex antigo, [\d,]+, só aceitava vírgula e deixava o peso vazio) e a
        // unidade "Kg/g" serve a kg e a gramas, então ela é guardada como veio, sem
        // conversão. ALT/SC vêm só com a unidade quando não preenchidos.
        const peso = cabecalhoText.match(/PESO\s*:\s*([\d.,]+)\s*(Kg\/g|Kg|g)?/i);
        Object.assign(detalhes.cabecalho, {
            peso: peso ? [peso[1], peso[2]].filter(Boolean).join(' ') : '',
            pesoValor: peso ? peso[1] : '',
            pesoUnidade: peso && peso[2] ? peso[2] : '',
            altura: extract(/ALT\s*:\s*([\d.,]+)/i),
            superficieCorporal: extract(/\bSC\s*:\s*([\d.,]+)/i),
        });

        // Normaliza espaços não-quebráveis e quebras de linha internas.
        for (const k of Object.keys(detalhes.cabecalho)) {
            detalhes.cabecalho[k] = String(detalhes.cabecalho[k]).replace(/\s+/g, ' ').trim();
        }
    }

    extrairMedicamentosPrescricao($, detalhes) {
        $('table[border="1"]').each((index, table) => {
            const prevText = $(table).prev().text();
            const isPadronizado = prevText.includes('Medicação') && prevText.includes('LEGENDA');
            const isNaoPadronizado = prevText.includes('não padronizada') || prevText.includes('sem estoque');

            if (isPadronizado || isNaoPadronizado) {
                $(table).find('tr').each((rowIndex, row) => {
                    const colunas = $(row).find('td');
                    if (colunas.length >= 2 && $(colunas[0]).text().trim().match(/^\d+-?$/)) {
                        const textoMedicamento = $(colunas[1]).text().trim();
                        const medicamento = isPadronizado 
                            ? this.extrairDadosMedicamento(textoMedicamento)
                            : this.extrairDadosMedicamentoNaoPadronizado(textoMedicamento);
                        
                        if (medicamento.nome) {
                            medicamento.naoPadronizado = isNaoPadronizado;
                            detalhes.medicamentos.push(medicamento);
                        }
                    }
                });
            }
        });
    }

    /**
     * Extrai os campos de um medicamento padronizado a partir do texto do HICD.
     *
     * Formato (após o "[nome]"):
     *   (dose),  (apresentação),  posologia,  via,  intervalo,  observação,  dia /
     *
     * - Os DOIS primeiros campos, quando presentes, vêm entre parênteses:
     *   1º () = dose (dose diária), 2º () = apresentação. Podem faltar (0, 1 ou 2 ().
     * - O delimitador entre campos é vírgula + 2+ espaços (o HICD usa `\xa0\xa0`).
     *   Vírgula decimal ("2,5") e vírgula interna ("Manha, tarde") usam 1 espaço e
     *   NÃO são separadores.
     * - O último segmento é "dia / justificativa" (ex.: "4 /"); dia = parte antes da "/".
     */
    /**
     * Heurística: distingue uma diluição/apresentação (ex.: "2G + 20 ML AD",
     * "40mg+10ml diluente", "meio comprimido + 5ml AD") de uma dose diária
     * (ex.: "2MG/KG/DIA", "10 MG/KG/DOSE", "(23)"). Usada quando há um único campo
     * antes da posologia e ele NÃO vem entre parênteses.
     */
    _pareceApresentacao(s) {
        return /diluente|\bAD\b|comprimido/i.test(s) || /\+\s*\d+\s*(ML|MG)\b/i.test(s);
    }

    extrairDadosMedicamento(textoMedicamento) {
        const medicamento = { textoMedicamento };
        const matchNome = textoMedicamento.match(/\[\s*([^\]]+)\]/);
        medicamento.nome = matchNome ? matchNome[1].trim() : '';

        // Remove o "[nome]" do início; o restante contém os campos separados por
        // vírgula + 2+ espaços (o HICD usa `\xa0\xa0`). Tira vírgula/espaço residual
        // no fim de cada segmento (algumas prescrições não têm contador de folha).
        const restante = textoMedicamento.replace(/^\s*\[[^\]]*\]/, '').trim();
        const segs = restante.split(/,\s{2,}/)
            .map(s => s.replace(/,+\s*$/, '').trim())
            .filter(s => s !== '');

        // dia = último segmento SÓ se for um contador de folha ("N /", "N/", "N").
        // (Na UTIp há sempre "N /"; algumas enfermarias omitem — aí não engolir o intervalo.)
        let dia = '';
        if (segs.length && /^\d+\s*\/?\s*$/.test(segs[segs.length - 1])) {
            dia = segs.pop().replace(/[^\d]/g, '');
        }

        let dose = '', apresentacao = '', posologia = '', via = '', intervalo = '', observacao = '';

        // Âncora robusta: o intervalo é o campo com "Horas"/"Livre" — a via vem logo
        // antes; a observação, logo depois; posologia é o último campo antes da via; e
        // dose/apresentação ficam antes dela (a apresentação nem sempre vem entre
        // parênteses — UTIp usa (), enfermarias escrevem a diluição sem parênteses).
        const intervaloIdx = segs.findIndex(s => /\bHoras\b|Livre/i.test(s));
        if (intervaloIdx >= 1) {
            intervalo   = segs[intervaloIdx];
            via         = segs[intervaloIdx - 1];
            observacao  = segs.slice(intervaloIdx + 1).join(', ').trim();
            const antesVia = segs.slice(0, intervaloIdx - 1);
            posologia = antesVia.length ? antesVia[antesVia.length - 1] : '';
            const primeiros = antesVia.slice(0, -1); // candidatos a dose/apresentação
            if (primeiros.length >= 2) {
                dose         = primeiros[0];
                apresentacao = primeiros.slice(1).join(', ');
            } else if (primeiros.length === 1) {
                // Um único campo antes da posologia: é dose OU apresentação.
                if (this._pareceApresentacao(primeiros[0])) apresentacao = primeiros[0];
                else dose = primeiros[0];
            }
        } else {
            // Fallback posicional (sem "Horas" reconhecível): 1º/2º () = dose/apres.
            const arr = [...segs];
            if (arr[0] && /^\(.*\)$/.test(arr[0])) dose = arr.shift();
            if (arr[0] && /^\(.*\)$/.test(arr[0])) apresentacao = arr.shift();
            posologia  = arr.shift() || '';
            via        = arr.shift() || '';
            intervalo  = arr.shift() || '';
            observacao = arr.join(', ');
        }

        // Remove os parênteses envolventes de dose/apresentação, quando houver.
        dose         = dose.replace(/^\((.*)\)$/, '$1').trim();
        apresentacao = apresentacao.replace(/^\((.*)\)$/, '$1').trim();

        Object.assign(medicamento, { dose, apresentacao, posologia, via, intervalo, observacao, dia });

        // Normaliza espaços não-quebráveis internos e limpa placeholders ".".
        for (const k of ['dose', 'apresentacao', 'posologia', 'via', 'intervalo', 'observacao', 'dia']) {
            medicamento[k] = String(medicamento[k]).replace(/\s+/g, ' ').trim();
            if (medicamento[k] === '.') medicamento[k] = '';
        }
        return medicamento;
    }

    /**
     * Medicamento NÃO padronizado (texto livre, sem os parênteses de dose/apresentação).
     * Estrutura best-effort: nome | posologia | via | intervalo | dia | "."
     * Mantém o mesmo conjunto de campos do padronizado (dose/apresentação ficam vazios).
     * O campo `textoMedicamento` continua sendo a fonte de verdade.
     */
    extrairDadosMedicamentoNaoPadronizado(textoMedicamento) {
        const partes = textoMedicamento.split(/\s{2,}/).map(s => s.trim()).filter(s => s !== '');
        const medicamento = {
            textoMedicamento,
            nome:        partes[0] || '',
            dose:        '',
            apresentacao: '',
            posologia:   partes[1] || '',
            via:         partes[2] || '',
            intervalo:   partes[3] || '',
            dia:         partes[4] || '',
            observacao:  partes.slice(5).join(' ') || '',
        };
        for (const k of ['posologia', 'via', 'intervalo', 'observacao', 'dia']) {
            medicamento[k] = medicamento[k].replace(/\s+/g, ' ').trim();
            if (medicamento[k] === '.') medicamento[k] = '';
        }
        return medicamento;
    }

    extrairDietas($, detalhes) {
        $('label.valorV3:contains("Dietas")').parent().find('table').first().find('tr').each((i, row) => {
            const colunas = $(row).find('td');
            if (colunas.length >= 2 && $(colunas[0]).text().trim().match(/^\d+-?$/)) {
                const descricao = $(colunas[1]).text().trim();
                detalhes.dietas.push({
                    numero: $(colunas[0]).text().trim().replace('-', ''),
                    descricao: descricao
                });
            }
        });
    }

    extrairObservacoesPrescricao($, detalhes) {
        // Cuidados Gerais
        $('label.valorV3:contains("CUIDADOS GERAIS")').parent().find('table').first().find('tr').each((i, row) => {
            const texto = $(row).find('label.valorV3').text().trim();
            if (texto.match(/^\d+\s*-\s*.+/)) {
                detalhes.observacoes.push({ tipo: 'Cuidado Geral', descricao: texto });
            }
        });

        // Diagnóstico e campos relacionados
        const diagElem = $('font:contains("DIAGNÓSTICO:")').parent();
        if (diagElem.length > 0) {
            const texto = diagElem.text();
            const extract = (regex, tipo) => {
                const match = texto.match(regex);
                if (match && match[1].trim()) {
                    detalhes.observacoes.push({ tipo: tipo, descricao: match[1].trim() });
                }
            };
            extract(/DIAGNÓSTICO:\s*([^T]*?)(?:THT:|$)/, 'Diagnóstico');
            extract(/THT:\s*([^M]*?)(?:MED:|$)/, 'THT');
            extract(/MED:\s*([^H]*?)(?:HV:|$)/, 'MED');
            extract(/HV:\s*([^D]*?)(?:DIETA:|$)/, 'HV');
            extract(/DIETA:\s*([^V]*?)(?:VM:|$)/, 'DIETA');
            extract(/VM:\s*([^$]*)/, 'VM');
        }

        // Outras observações
        const extractSimple = (selector, tipo, replaceStr) => {
            const elem = $(selector).parent();
            if (elem.length > 0) {
                const texto = elem.text().replace(replaceStr, '').trim();
                if (texto) detalhes.observacoes.push({ tipo: tipo, descricao: texto });
            }
        };
        // Seletor por filter para evitar dependência de encoding do caractere ã
        $('label.valorV3').filter((_, el) => /SEDA[Çç][ÃA]O/i.test($(el).text())).first().parent().each((_, elem) => {
            const texto = $(elem).text().replace(/SEDA[Çç][ÃA]O:/i, '').trim();
            if (texto) detalhes.observacoes.push({ tipo: 'Sedação', descricao: texto });
        });
        extractSimple('label.valorV3:contains("VENOSA:")', 'Terapia Venosa', 'VENOSA:');
        extractSimple('b:contains("NECESSIDADE DE:")', 'Necessidade', 'NECESSIDADE DE:');
    }

    extrairAssinaturasPrescricao($, detalhes) {
        // Layout novo: <tr class="assinatura-row"> "PROFISSIONAL PRESCRITOR: NOME CRM: N".
        // Layout antigo: <b>MÉDICO:</b> ... CRM: ...
        const texto = $('body').text();
        if (texto.includes('PROFISSIONAL PRESCRITOR') || texto.includes('MÉDICO:') || texto.includes('MEDICO:')) {
            const matchMedico = texto.match(/PROFISSIONAL\s+PRESCRITOR:\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.\s]+?)\s+CRM\s*:/i)
                || texto.match(/M[ÉE]DICO:\s*([^C]+?)(?:CRM:|$)/i);
            const matchCRM = texto.match(/CRM[:\s]*([A-Z0-9\/-]+)/i);
            const matchData = texto.match(/DATA:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);

            if (matchMedico) {
                const assinatura = {
                    tipo: 'medico',
                    nome: matchMedico[1].trim(),
                    funcao: 'Médico Responsável',
                    crm: matchCRM ? matchCRM[1].trim() : '',
                };
                detalhes.assinaturas.push(assinatura);
                detalhes.cabecalho.medico = assinatura.nome;
                detalhes.cabecalho.crm = assinatura.crm;
            }
            if (matchData) {
                detalhes.cabecalho.dataAssinatura = matchData[1].trim();
            }
        }
    }

    extrairDataImpressaoPrescricao($, detalhes) {
        const dataElem = $('b:contains("DATA:")').parent();
        if (dataElem.length > 0) {
            const match = dataElem.text().match(/DATA:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
            if (match) {
                detalhes.dataHoraImpressao = match[1];
            }
        }
    }
}

module.exports = PrescricaoParser;
