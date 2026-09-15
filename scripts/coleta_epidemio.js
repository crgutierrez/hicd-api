/**
 * Coleta os dados brutos do HICD para o levantamento epidemiológico.
 *
 * Para cada prontuário busca:
 *   - cadastro  (ParamModule=CONSPAC_OPEN) → sexo, nascimento, município
 *   - internações (ParamModule=Inter)      → setor, entrada, saída, CID de entrada
 *   - evoluções (via EvolutionService)     → hipóteses diagnósticas de todas as especialidades
 *
 * Uso: node scripts/coleta_epidemio.js --prontuarios 19764,9702,... [--out output/epidemio]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const HICDCrawler = require('../hicd-crawler-refactored.js');

const arg = (nome, padrao) => {
    const i = process.argv.indexOf(`--${nome}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

const semTags = (s) => s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' | ')
    .replace(/&nbsp;/g, ' ')
    .replace(/(\s*\|\s*)+/g, ' | ');

const decodeEnt = (s) => s
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&acirc;/g, 'â')
    .replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô').replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó')
    .replace(/&Atilde;/g, 'Ã').replace(/&Ccedil;/g, 'Ç').replace(/&amp;/g, '&');

/**
 * Cada internação começa em "Clínica:" e traz setor, entrada, saída e CID de entrada.
 */
function parseInternacoes(htmlBruto) {
    const txt = decodeEnt(semTags(htmlBruto));
    const re = /Cl[íi]nica:\s*\|\s*([^|]+?)\s*\|\s*Entrada:\s*\|\s*([^|]*?)\s*\|\s*Sa[íi]da:\s*\|\s*([^|]*?)\s*\|/g;
    const internacoes = [];
    let m;
    while ((m = re.exec(txt)) !== null) {
        const cauda = txt.slice(m.index, m.index + 900);
        const cid = cauda.match(/CID DE ENTRADA\s*\|\s*([A-Z]\d{2,4})\s*\|?\s*:?\s*([^|]*)/i);
        const proc = cauda.match(/PROCEDIMENTOS DE ENTRADA\s*\|\s*([^|]*?)\s*\|\s*:\s*([^|]*)/i);
        // Código "0" sem descrição = nenhum procedimento lançado na entrada.
        const procTexto = proc ? (proc[2] || '').trim() : '';
        // Internação em curso não tem valor depois de "Saída:", e o regex acaba
        // capturando o rótulo seguinte. Só vale o que tem forma de data.
        const soData = (v) => (/^\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2})?$/.test((v || '').trim())
            ? v.trim() : null);
        internacoes.push({
            setor: m[1].trim(),
            entrada: soData(m[2]),
            saida: soData(m[3]),
            cidEntrada: cid ? cid[1].trim() : null,
            cidDescricao: cid ? cid[2].trim() : null,
            procedimentoEntrada: procTexto || null,
            codigoProcedimentoEntrada: proc && proc[1].trim() !== '0' ? proc[1].trim() : null
        });
    }
    return internacoes;
}

/**
 * Relatórios de alta (ParamModule=RALTA). Cada registro é delimitado pelo input
 * oculto co_ralta e traz profissional, data do registro e o texto do resumo.
 */
function parseRelatoriosAlta(htmlBruto) {
    const limpo = htmlBruto.replace(/<script[\s\S]*?<\/script>/gi, '');
    if (/Nenhum registro encontrado/i.test(limpo)) return [];
    const blocos = limpo.split(/<input[^>]*name="co_ralta"[^>]*\/?>/).slice(1);
    return blocos.map(b => {
        const prof = b.match(/Profissional:<\/div>\s*<div[^>]*><b>([^<]*)<\/b>/);
        const data = b.match(/data_evo'>([^<]*)</);
        const texto = decodeEnt(b.replace(/<[^>]+>/g, ' '))
            .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        // Split pega o PRIMEIRO "Descrição:"; documentos que embutem um laudo têm
        // um segundo rótulo mais adiante, e o último segmento seria o trecho errado.
        const marca = texto.search(/Descri[çc][ãa]o:/);
        const corpo = (marca >= 0 ? texto.slice(marca).replace(/^Descri[çc][ãa]o:\s*/, '') : texto).trim();
        return {
            profissional: prof ? prof[1].trim() : null,
            dataRegistro: data ? data[1].trim() : null,
            tipoDocumento: tipoDocumento(corpo),
            texto
        };
    }).filter(r => r.dataRegistro);
}

/**
 * Desfecho inferido do texto do relatório. O HICD não tem campo estruturado de
 * motivo da saída, então a leitura é por padrão textual, nesta ordem:
 *   1. óbito (mais grave, tem precedência)
 *   2. alta explícita
 *   3. transferência EXTERNA — "transferido" sozinho não serve: os resumos
 *      descrevem trânsito interno (emergência → UTI → enfermaria) o tempo todo
 *   4. indeterminado — o módulo RALTA também guarda laudos e pareceres avulsos
 */
/**
 * O módulo RALTA guarda vários tipos de documento — resumo de alta, relatório de
 * transferência, laudo médico, encaminhamento ambulatorial. O título na primeira
 * linha da descrição é o sinal mais confiável do que o documento é.
 */
function tipoDocumento(corpo) {
    const cabeca = (corpo || '').slice(0, 120).toUpperCase();
    if (/TRANSFER[EÊ]NCIA/.test(cabeca)) return 'Relatório de transferência';
    if (/RESUMO DE ALTA|RELAT[ÓO]RIO DE ALTA|ALTA HOSPITALAR/.test(cabeca)) return 'Resumo de alta';
    if (/ENCAMINHAMENTO/.test(cabeca)) return 'Encaminhamento';
    if (/LAUDO/.test(cabeca)) return 'Laudo médico';
    if (/[óO]BITO/.test(cabeca)) return 'Declaração de óbito';
    return 'Outro / não identificado';
}

/**
 * Desfecho da internação. O HICD não tem campo estruturado de motivo da saída,
 * então o desfecho é inferido — primeiro pelo tipo do documento, depois pelo corpo.
 *
 * A ordem importa: "transferido" aparece o tempo todo descrevendo movimentação
 * INTERNA (emergência → UTI → enfermaria) ou a chegada do paciente de outro
 * serviço, dentro de resumos que terminam em alta. Por isso o corpo do texto só
 * decide transferência quando o título não resolveu.
 */
function inferirDesfecho(relatorio) {
    if (!relatorio || !relatorio.texto) return { desfecho: null, confianca: null };
    const t = relatorio.texto;
    const OBITO = /\b[óo]bito\b|faleceu|declara[çc][ãa]o de [óo]bito|evolui[u]? para [óo]bito|constatad[oa] [óo]bito/i;
    const ALTA = /data da alta|alta hospitalar|alta m[ée]dica|alta melhorad[ao]|recebe(u|r[áa])? alta|de alta para (casa|domic[íi]lio)|alta a pedido/i;

    // Óbito do próprio paciente vence tudo, mas o termo também aparece em
    // história familiar — exige proximidade de "paciente"/"evoluiu".
    if (/\b(paciente|lactente|crian[çc]a|rn)\b[^.]{0,120}[óo]bito|[óo]bito[^.]{0,80}\b(paciente|lactente|crian[çc]a)\b|evolui[u]? para [óo]bito|declara[çc][ãa]o de [óo]bito/i.test(t)) {
        return { desfecho: 'Óbito', confianca: 'alta' };
    }
    if (relatorio.tipoDocumento === 'Relatório de transferência') {
        return { desfecho: 'Transferência', confianca: 'alta' };
    }
    if (relatorio.tipoDocumento === 'Resumo de alta') {
        return { desfecho: 'Alta', confianca: 'alta' };
    }
    if (ALTA.test(t)) return { desfecho: 'Alta', confianca: 'média' };
    if (OBITO.test(t)) return { desfecho: 'Óbito a confirmar', confianca: 'baixa' };
    return { desfecho: 'Indeterminado', confianca: null };
}


// Tabelas de domínio do formulário de cadastro do SAME (SSAME/11).
const SEXO_SAME = { '1': 'M', '3': 'F' };
const RACA_COR_SAME = { '0': 'Não informado', '1': 'Branca', '2': 'Negra', '3': 'Parda', '4': 'Amarela', '5': 'Indígena' };
const DEFICIENCIA_SAME = {
    '0': 'Não informado', '000': 'Sem deficiência', '001': 'Auditiva', '002': 'Visual',
    '003': 'Física', '004': 'Intelectual', '005': 'Psicossocial', '006': 'Múltipla'
};
const NACIONALIDADE_SAME = { '10': 'Brasileiro', '20': 'Naturalizado brasileiro' };

/**
 * Cadastro do SAME — Param=SSAME&ParamModule=pesq_Pront_Reg&pront=<registro>.
 *
 * É a única fonte no HICD com raça/cor e deficiência; o cadastro do prontuário
 * (CONSPAC_OPEN) não traz esses campos. A resposta é uma linha só, com os campos
 * separados por "|", na ordem em que o formulário os consome.
 */
function parseCadastroSame(resposta) {
    const bruto = String(resposta || '').trim();
    if (!bruto || bruto === 'nao' || !bruto.includes('|')) return null;
    const a = bruto.split('|');
    const codigo = (v) => (v || '').trim();
    return {
        nome: codigo(a[0]),
        cns: codigo(a[1]),
        nomeSocial: codigo(a[4]) || null,
        sexoCodigo: codigo(a[5]),
        sexo: SEXO_SAME[codigo(a[5])] || null,
        racaCorCodigo: codigo(a[6]),
        racaCor: RACA_COR_SAME[codigo(a[6])] || null,
        etniaCodigo: codigo(a[7]) || null,
        deficienciaCodigo: codigo(a[8]),
        deficiencia: DEFICIENCIA_SAME[codigo(a[8])] || null,
        telefone: codigo(a[10]) || null,
        cep: codigo(a[11]) || null,
        uf: codigo(a[12]),
        municipioIbge: codigo(a[13]),
        logradouro: codigo(a[14]),
        numero: codigo(a[15]) || null,
        bairro: codigo(a[17]),
        nacionalidadeCodigo: codigo(a[18]),
        nacionalidade: NACIONALIDADE_SAME[codigo(a[18])] || codigo(a[18]),
        naturalidadeUf: codigo(a[19]) || null,
        cpf: codigo(a[20]) || null,
        dataNascimento: codigo(a[21]),
        nomeMae: codigo(a[25]) || null
    };
}

/**
 * Óbito constatado no texto das evoluções.
 *
 * É a fonte primária de mortalidade: quando o paciente morre ninguém escreve
 * resumo de alta, então o módulo RALTA fica vazio e o desfecho apareceria como
 * "sem relatório" — silenciando exatamente o desfecho mais importante.
 *
 * Só conta constatação. "Risco de óbito" e "risco iminente de óbito" aparecem em
 * pacientes graves que sobrevivem e não podem disparar o detector.
 */
const OBITO_CONSTATADO = new RegExp([
    'constato\\s+(?:o\\s+)?[óo]bito',
    'constatad[oa]\\s+(?:o\\s+)?[óo]bito',
    '[óo]bito\\s+(?:foi\\s+)?(?:declarado|constatado)',
    'declar(?:o|ado|ada)\\s+(?:a\\s+)?(?:hora\\s+do\\s+)?[óo]bito',
    'comunic(?:o|ado)\\s+(?:a\\s+)?hora\\s+do\\s+[óo]bito',
    'preencho\\s+(?:a\\s+)?(?:DO\\b|declara[çc][ãa]o\\s+de\\s+[óo]bito)',
    'evolui[u]?\\s+(?:para\\s+)?[óo]bito'
].join('|'), 'i');

function detectarObito(evolucoes, ent, sai) {
    if (!Array.isArray(evolucoes)) return null;
    const paraData = (s) => {
        const m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
        return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
    };
    const DOIS_DIAS = 2 * 86400 * 1000;
    for (const e of evolucoes) {
        const d = paraData(e.data);
        if (!d || !ent) continue;
        if (d < ent || (sai && d > new Date(sai.getTime() + DOIS_DIAS))) continue;
        const texto = e.descricao || '';
        if (!OBITO_CONSTATADO.test(texto)) continue;
        const m = texto.match(OBITO_CONSTATADO);
        const trecho = texto.slice(Math.max(0, m.index - 130), m.index + 170).replace(/\s+/g, ' ').trim();
        return { data: e.data, profissional: e.profissional, atividade: e.atividade, trecho };
    }
    return null;
}

/** Resumo de alta escrito como evolução, e não arquivado no RALTA. */
const ALTA_EM_EVOLUCAO = /resumo\s+de\s+alta\s+hospitalar|data\s+da\s+alta\s*:/i;

function detectarAltaEmEvolucao(evolucoes, ent, sai) {
    if (!Array.isArray(evolucoes) || !ent) return null;
    const paraData = (s) => {
        const m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
        return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
    };
    const DOIS_DIAS = 2 * 86400 * 1000;
    for (const e of evolucoes) {
        const d = paraData(e.data);
        if (!d || d < ent || (sai && d > new Date(sai.getTime() + DOIS_DIAS))) continue;
        if (ALTA_EM_EVOLUCAO.test(e.descricao || '')) return { data: e.data, profissional: e.profissional };
    }
    return null;
}

(async () => {
    const prontuarios = arg('prontuarios', '').split(',').map(s => s.trim()).filter(Boolean);
    const destino = arg('out', 'output/epidemio');
    if (!prontuarios.length) {
        console.error('Informe --prontuarios 19764,9702,...');
        process.exit(1);
    }
    fs.mkdirSync(destino, { recursive: true });

    const crawler = new HICDCrawler();
    await crawler.login();
    const hc = crawler.httpClient;
    const urls = hc.getUrls();

    const post = async (paramModule, idPac) => {
        const body = new URLSearchParams({
            Param: 'REGE', ParamModule: paramModule, IdPac: idPac,
            PACIENTE: idPac, cpf: '', TIPOBUSCA: 'PRONT', tipoBusca: 'PRONT',
            edit: '1', param: ''
        });
        const r = await hc.post(urls.login, body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }
        });
        return r.data;
    };

    for (const pront of prontuarios) {
        const registro = { prontuario: pront };

        try {
            registro.cadastro = await crawler.evolutionService.getPacienteCadastro(pront);
        } catch (e) { registro.cadastro = { erro: e.message }; }

        try {
            const body = new URLSearchParams({ Param: 'SSAME', ParamModule: 'pesq_Pront_Reg', pront });
            const r = await hc.post(urls.login, body, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }
            });
            registro.cadastroSame = parseCadastroSame(r.data);
        } catch (e) { registro.cadastroSame = { erro: e.message }; }

        try {
            registro.internacoes = parseInternacoes(await post('Inter', pront));
        } catch (e) { registro.internacoes = { erro: e.message }; }

        try {
            registro.relatoriosAlta = parseRelatoriosAlta(await post('RALTA', pront));
        } catch (e) { registro.relatoriosAlta = { erro: e.message }; }

        try {
            const evs = await crawler.getEvolucoes(pront);
            registro.totalEvolucoes = evs.length;
            registro.evolucoes = evs.map(e => ({
                data: e.dataEvolucao,
                profissional: e.profissional,
                atividade: e.atividade,
                clinicaLeito: e.clinicaLeito,
                hipoteses: (e.dadosEstruturados || {}).hipotesesDiagnosticas || [],
                anteriores: (e.dadosEstruturados || {}).diagnosticosAnteriores || [],
                descricao: e.descricao || ''
            }));
        } catch (e) { registro.evolucoes = { erro: e.message }; }

        // Desfecho de cada internação. Precisa das evoluções já carregadas, porque
        // o óbito só aparece lá — em óbito não se escreve resumo de alta, então o
        // RALTA fica vazio justamente no desfecho que mais importa.
        //
        // Ordem de precedência:
        //   1. óbito constatado em evolução  (o único desfecho que anula os demais)
        //   2. documento do RALTA            (resumo de alta / relatório de transferência)
        //   3. resumo de alta escrito como evolução
        //   4. sem informação
        // Óbito em nível de paciente — roda mesmo quando o módulo Inter falha.
        // Sem isto, um 500 do Inter apaga o óbito do paciente do levantamento.
        if (Array.isArray(registro.evolucoes)) {
            const obitoGeral = detectarObito(registro.evolucoes, new Date(1900, 0, 1), null);
            registro.obitoNoProntuario = obitoGeral;
        }

        if (Array.isArray(registro.internacoes)) {
            const paraData = (s) => {
                const m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
                return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
            };
            const DOIS_DIAS = 2 * 86400 * 1000;
            const relatorios = Array.isArray(registro.relatoriosAlta) ? registro.relatoriosAlta : [];
            const evolucoes = Array.isArray(registro.evolucoes) ? registro.evolucoes : [];

            for (const int of registro.internacoes) {
                const ent = paraData(int.entrada);
                const sai = paraData(int.saida);
                if (!ent) continue;

                // O resumo pode ser redigido dias antes da saída efetiva, então casar
                // pela data de saída perde registros; o critério é o intervalo.
                const dentro = relatorios.filter(r => {
                    const d = paraData(r.dataRegistro);
                    return d && d >= ent && (!sai || d <= new Date(sai.getTime() + DOIS_DIAS));
                });
                const rel = dentro.sort((a, b) => paraData(a.dataRegistro) - paraData(b.dataRegistro)).pop();
                const inferido = inferirDesfecho(rel);

                int.relatoriosNoPeriodo = dentro.length;
                int.temRelatorioAlta = Boolean(rel);
                int.dataRelatorioAlta = rel ? rel.dataRegistro : null;
                int.tipoDocumentoAlta = rel ? rel.tipoDocumento : null;
                int.profissionalAlta = rel ? rel.profissional : null;

                const obito = detectarObito(evolucoes, ent, sai);
                if (obito) {
                    int.desfecho = 'Óbito';
                    int.confiancaDesfecho = 'alta';
                    int.fonteDesfecho = 'Óbito constatado em evolução';
                    int.obito = obito;
                } else if (rel) {
                    int.desfecho = inferido.desfecho;
                    int.confiancaDesfecho = inferido.confianca;
                    int.fonteDesfecho = `RALTA: ${rel.tipoDocumento}`;
                } else {
                    const alta = detectarAltaEmEvolucao(evolucoes, ent, sai);
                    int.desfecho = alta ? 'Alta' : 'Sem informação';
                    int.confiancaDesfecho = alta ? 'média' : null;
                    int.fonteDesfecho = alta ? 'Resumo de alta escrito como evolução' : null;
                }
            }
        }

        const arquivo = path.join(destino, `raw_${pront}.json`);
        fs.writeFileSync(arquivo, JSON.stringify(registro, null, 1));
        const nInt = Array.isArray(registro.internacoes) ? registro.internacoes.length : '?';
        const nAlta = Array.isArray(registro.relatoriosAlta) ? registro.relatoriosAlta.length : '?';
        const raca = registro.cadastroSame && registro.cadastroSame.racaCor ? registro.cadastroSame.racaCor : '?';
        console.log(`${pront}: ${registro.totalEvolucoes || 0} evoluções, ${nInt} internações, ${nAlta} relatórios de alta, raça/cor: ${raca} -> ${arquivo}`);
    }
    process.exit(0);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
