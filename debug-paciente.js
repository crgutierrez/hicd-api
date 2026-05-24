/**
 * Debug de /api/pacientes/:prontuario
 *
 * Mostra:
 *   1. HTML bruto recebido do HICD (salvo em /tmp/debug-paciente-<pront>.html)
 *   2. Todos os <p> encontrados nas colunas .panel-body
 *   3. Resultado bruto do parser (parsePacienteCadastro)
 *   4. Resultado final do modelo Paciente.fromParserData
 *   5. Campos que ficaram null
 */
require('dotenv').config();
const fs = require('fs');
const cheerio = require('cheerio');
const HICDCrawler = require('./hicd-crawler-refactored');
const { Paciente } = require('./api/models');

const PRONTUARIO = process.argv[2] || '45390';

(async () => {
    console.log(`\n=== DEBUG PACIENTE ${PRONTUARIO} ===\n`);

    // ── Login ─────────────────────────────────────────────────────────────────
    const crawler = new HICDCrawler(process.env.HICD_USERNAME, process.env.HICD_PASSWORD);
    console.log('[1/5] Fazendo login...');
    const loginResult = await crawler.login();
    if (!loginResult.success) {
        console.error('Falha no login:', loginResult);
        process.exit(1);
    }
    console.log('     OK\n');

    // ── Fetch bruto via HTTP (mesmo flow do evolutionService) ─────────────────
    console.log('[2/5] Buscando HTML bruto do cadastro...');
    const urls = crawler.httpClient.getUrls();
    const params = new URLSearchParams({
        'Param': 'REGE',
        'ParamModule': 'CONSPAC_OPEN',
        'TIPOBUSCA': 'PRONT',
        'PACIENTE': PRONTUARIO
    });
    const response = await crawler.httpClient.post(urls.login, params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    const html = response.data;
    const htmlFile = `/tmp/debug-paciente-${PRONTUARIO}.html`;
    fs.writeFileSync(htmlFile, html, 'utf8');
    console.log(`     HTML salvo em: ${htmlFile} (${html.length} chars)\n`);

    // ── Inspecionar <p> no panel-body ─────────────────────────────────────────
    console.log('[3/5] Inspecionando <p> no .panel-body...\n');
    const $ = cheerio.load(html, { decodeEntities: true });
    const panelBody = $('.panel-body');
    if (panelBody.length === 0) {
        console.log('     AVISO: .panel-body não encontrado no HTML!');
    } else {
        let colIdx = 0;
        panelBody.find('.col-lg-3, .col-lg-4').each((_, col) => {
            const isFirst = (col.attribs?.class || '').includes('col-lg-3');
            console.log(`  Coluna ${++colIdx} (${isFirst ? 'col-lg-3 — lado esquerdo' : 'col-lg-4 — lado direito'}):`);
            $(col).find('p').each((i, p) => {
                const txt = $(p).text().replace(/\s+/g, ' ').trim();
                if (txt) console.log(`    [p${i}] "${txt}"`);
            });
            console.log('');
        });
    }

    // ── Resultado do parser ───────────────────────────────────────────────────
    console.log('[4/5] Resultado do parsePacienteCadastro...\n');
    const parserData = crawler.parser.parsePacienteCadastro(html, PRONTUARIO);
    console.log('  dadosBasicos:  ', JSON.stringify(parserData?.dadosBasicos, null, 2).replace(/\n/g, '\n  '));
    console.log('  documentos:    ', JSON.stringify(parserData?.documentos, null, 2).replace(/\n/g, '\n  '));
    console.log('  endereco:      ', JSON.stringify(parserData?.endereco, null, 2).replace(/\n/g, '\n  '));
    console.log('  contatos:      ', JSON.stringify(parserData?.contatos, null, 2).replace(/\n/g, '\n  '));
    console.log('  responsavel:   ', JSON.stringify(parserData?.responsavel, null, 2).replace(/\n/g, '\n  '));
    console.log('  internacao:    ', JSON.stringify(parserData?.internacao, null, 2).replace(/\n/g, '\n  '));
    console.log('');

    // ── Modelo Paciente ───────────────────────────────────────────────────────
    console.log('[5/5] Resultado de Paciente.fromParserData...\n');
    const paciente = Paciente.fromParserData(parserData, PRONTUARIO);
    const completo = paciente?.toCompleto();
    console.log(JSON.stringify(completo, null, 2));

    // ── Campos null ───────────────────────────────────────────────────────────
    console.log('\n=== CAMPOS NULL / VAZIOS ===\n');
    function listarNulls(obj, prefix = '') {
        for (const [k, v] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${k}` : k;
            if (v === null || v === '' || v === undefined) {
                console.log(`  ${path}: null`);
            } else if (typeof v === 'object' && !Array.isArray(v)) {
                listarNulls(v, path);
            }
        }
    }
    if (completo) listarNulls(completo);
})();
