/**
 * Catálogo de setores de internação do HICD.
 *
 * Duas fontes, que não coincidem:
 *   SIINF/237 (Atendimento Hospitalar) → cadastro completo, na ordem dos códigos
 *   getClinicas()                      → censo vivo, só setores com paciente no momento
 *
 * Uso: node scripts/catalogo_setores.js [--out output/epidemio]
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
    .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

(async () => {
    const destino = arg('out', 'output/epidemio');
    fs.mkdirSync(destino, { recursive: true });

    const crawler = new HICDCrawler();
    await crawler.login();
    const hc = crawler.httpClient;
    const urls = hc.getUrls();

    // Cadastro completo: a posição na lista é o próprio código (001, 002, ...).
    const body = new URLSearchParams({ Param: 'SIINF', ParamModule: '237' });
    const r = await hc.post(urls.login, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }
    });
    const nomes = [...r.data.matchAll(/align="left"><b>([^<]+)<\/b>/g)]
        .map(m => decode(m[1]).trim())
        .filter(Boolean);

    // Censo vivo: só o que tem paciente internado agora.
    const censo = await crawler.getClinicas();
    const noCenso = new Map((censo || []).map(c => [c.codigo, c.nome]));

    const setores = nomes.map((nome, i) => {
        const codigo = String(i + 1).padStart(3, '0');
        return {
            codigo,
            nome,
            nome_no_censo: noCenso.get(codigo) || null,
            no_censo_atual: noCenso.has(codigo),
            divergencia_de_nome: noCenso.has(codigo) && noCenso.get(codigo) !== nome
        };
    });

    const arquivo = path.join(destino, 'catalogo_setores.csv');
    const cols = ['codigo', 'nome', 'nome_no_censo', 'no_censo_atual', 'divergencia_de_nome'];
    fs.writeFileSync(arquivo, [
        cols.join(','),
        ...setores.map(s => cols.map(c => JSON.stringify(s[c] ?? '')).join(','))
    ].join('\n') + '\n');

    const fora = setores.filter(s => !s.no_censo_atual);
    const diverg = setores.filter(s => s.divergencia_de_nome);
    console.log(`${setores.length} setores no cadastro (SIINF/237); ${noCenso.size} no censo vivo -> ${arquivo}`);
    if (fora.length) console.log('Fora do censo:', fora.map(s => `${s.codigo} ${s.nome}`).join(' | '));
    if (diverg.length) console.log('Divergência de nome:', diverg.map(s => `${s.codigo} "${s.nome}" vs censo "${s.nome_no_censo}"`).join(' | '));
    process.exit(0);
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
