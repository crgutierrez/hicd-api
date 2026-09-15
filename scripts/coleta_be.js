/**
 * Coleta os Boletins de Emergência (BE) de cada prontuário.
 *
 * O BE é a porta de entrada pela emergência e traz o que nenhum outro módulo dá:
 * motivo da entrada, CID do atendimento, classificação de risco (Manchester),
 * queixa da triagem e sinais vitais na admissão.
 *
 * Caminho no HICD:
 *   CONSPAC_OPEN com TIPOBUSCA=PRONT  → lista os números de BE do paciente
 *   CONSPAC_OPEN com TIPOBUSCA=BE     → abre um BE
 *   EvolucaoBe / TRIAGEM com TIPOBUSCA=BE → cabeçalho do atendimento e triagem
 *
 * Uso: node scripts/coleta_be.js --prontuarios 9702,36101 [--out output/epidemio]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const HICDCrawler = require('../hicd-crawler-refactored.js');

const arg = (nome, padrao) => {
    const i = process.argv.indexOf(`--${nome}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

const decode = (s) => s
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&acirc;/g, 'â')
    .replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô').replace(/&Ecirc;/g, 'Ê')
    .replace(/&Oacute;/g, 'Ó').replace(/&Atilde;/g, 'Ã').replace(/&Ccedil;/g, 'Ç')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&times;/g, '×');

const texto = (html) => decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' | ')).replace(/(\s*\|\s*)+/g, ' | ').trim();

/** Campo "Rótulo: | valor" do texto achatado. */
const campo = (t, rotulo) => {
    const m = t.match(new RegExp(`${rotulo}\\s*:?\\s*\\|\\s*([^|]{0,120})`, 'i'));
    return m ? m[1].trim() || null : null;
};

function parseCabecalhoBe(html) {
    const t = texto(html);
    return {
        motivo: campo(t, 'Motivo'),
        cid: campo(t, 'Cid'),
        cid1: campo(t, 'Cid1'),
        cid2: campo(t, 'Cid2'),
        entrada: campo(t, 'Entrada'),
        saida: campo(t, 'Saida'),
    };
}

/**
 * A triagem traz a classificação de risco do protocolo de Manchester. O HTML
 * lista as quatro cores como opções fixas; a cor efetiva vem depois de
 * "Classificação:", já no registro preenchido.
 */
function parseTriagem(html) {
    const t = texto(html);
    if (/Nenhum registro/i.test(t)) return null;
    const risco = t.match(/Classifica[çc][ãa]o\s*:\s*\|\s*(Vermelho|Amarelo|Verde|Azul)/i);
    const queixa = t.match(/Queixas?\s*:\s*([^|]{0,200}?)\s*(?:-\s*)?Classifica[çc][ãa]o/i);
    return {
        classificacaoRisco: risco ? risco[1] : null,
        queixa: queixa ? queixa[1].trim() : null,
        dataRegistro: campo(t, 'Data Registro'),
        profissional: campo(t, 'Profissional'),
        fc: campo(t, 'FC'),
        pressaoArterial: campo(t, 'Pressão Arterial'),
        peso: campo(t, 'Peso'),
        temperatura: campo(t, 'Temperatura'),
        spo2: campo(t, 'SPO2'),
        hgt: campo(t, 'HGT'),
        diabetico: campo(t, 'Diabético'),
        hipertenso: campo(t, 'Hipertenso'),
        alergico: campo(t, 'Alérgico'),
        doencasPreExistentes: campo(t, 'Doenças pré existentes'),
    };
}

(async () => {
    const prontuarios = arg('prontuarios', '').split(',').map(s => s.trim()).filter(Boolean);
    const destino = arg('out', 'output/epidemio');
    const limite = parseInt(arg('limite-bes', '0'), 10);  // 0 = todos
    if (!prontuarios.length) {
        console.error('Informe --prontuarios 9702,36101,...');
        process.exit(1);
    }
    fs.mkdirSync(destino, { recursive: true });

    const crawler = new HICDCrawler();
    await crawler.login();
    const hc = crawler.httpClient;
    const urls = hc.getUrls();
    const post = async (corpo) => {
        const r = await hc.post(urls.login, new URLSearchParams(corpo), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }
        });
        return String(r.data);
    };

    for (const pront of prontuarios) {
        const cad = await post({ Param: 'REGE', ParamModule: 'CONSPAC_OPEN', IdPac: pront, PACIENTE: pront, TIPOBUSCA: 'PRONT' });
        const numeros = [...new Set([...cad.matchAll(/getPacienteBE\("(\d+)"\)/g)].map(m => m[1]))];
        const alvos = limite > 0 ? numeros.slice(-limite) : numeros;

        const boletins = [];
        for (const be of alvos) {
            const base = { Param: 'REGE', IdPac: be, Filtro: '', edit: '0', param: '', mEvo: '0', filter: '', cpf: '', filtroTipo: '', TIPOBUSCA: 'BE' };
            let cabecalho = null, triagem = null;
            try { cabecalho = parseCabecalhoBe(await post({ ...base, ParamModule: 'EvolucaoBe' })); } catch (e) { cabecalho = { erro: e.message }; }
            try { triagem = parseTriagem(await post({ ...base, ParamModule: 'TRIAGEM' })); } catch (e) { triagem = { erro: e.message }; }
            boletins.push({ be, ...cabecalho, triagem });
        }

        const arquivo = path.join(destino, `be_${pront}.json`);
        fs.writeFileSync(arquivo, JSON.stringify({ prontuario: pront, totalBes: numeros.length, boletins }, null, 1));
        const comRisco = boletins.filter(b => b.triagem && b.triagem.classificacaoRisco).length;
        console.log(`${pront}: ${numeros.length} BEs (${alvos.length} lidos), ${comRisco} com classificação de risco -> ${arquivo}`);
    }
    process.exit(0);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
