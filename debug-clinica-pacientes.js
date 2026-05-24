/**
 * Debug de /api/clinicas/:id/pacientes
 *
 * Mostra:
 *   1. HTML bruto salvo em /tmp/debug-clinica-<id>-pacientes.html
 *   2. Estrutura bruta da tabela (cada TR e suas TDs)
 *   3. Resultado bruto do parser (parsePacientes)
 *   4. Resultado de Paciente.fromListData para cada paciente
 *   5. Campos null/vazios por paciente
 */
require('dotenv').config();
const fs = require('fs');
const cheerio = require('cheerio');
const HICDCrawler = require('./hicd-crawler-refactored');
const { Paciente } = require('./api/models');

const CLINICA_ID = process.argv[2] || '002';

(async () => {
    console.log(`\n=== DEBUG CLÍNICA ${CLINICA_ID} — PACIENTES ===\n`);

    // ── Login ─────────────────────────────────────────────────────────────────
    const crawler = new HICDCrawler(process.env.HICD_USERNAME, process.env.HICD_PASSWORD);
    process.stdout.write('[1/5] Fazendo login... ');
    const loginResult = await crawler.login();
    if (!loginResult.success) {
        console.error('\nFalha no login:', loginResult);
        process.exit(1);
    }
    console.log('OK\n');

    // ── Fetch HTML bruto ──────────────────────────────────────────────────────
    process.stdout.write('[2/5] Buscando HTML bruto da listagem... ');
    const urls = crawler.httpClient.getUrls();
    const params = new URLSearchParams({
        'Param': 'SIGHO',
        'ParamModule': '544',
        'idPai': 'Do581',
        'clinica': CLINICA_ID,
        'nome': '',
        'selRefClinica': '',
        'selOrderInter': ''
    });
    const response = await crawler.httpClient.post(urls.login, params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    const html = response.data;
    const htmlFile = `/tmp/debug-clinica-${CLINICA_ID}-pacientes.html`;
    fs.writeFileSync(htmlFile, html, 'utf8');
    console.log(`OK\n     HTML salvo em: ${htmlFile} (${html.length} chars)\n`);

    // ── Inspecionar tabela bruta ──────────────────────────────────────────────
    console.log('[3/5] Inspecionando estrutura da tabela HTML...\n');
    const $ = cheerio.load(html, { decodeEntities: true });
    const tabelas = $('table');
    console.log(`  Tabelas encontradas: ${tabelas.length}`);

    tabelas.each((tIdx, table) => {
        const rows = $(table).find('tr');
        if (rows.length === 0) return;
        console.log(`\n  Tabela ${tIdx} — ${rows.length} linha(s):`);

        rows.each((rIdx, row) => {
            const cells = $(row).find('th, td');
            if (cells.length === 0) return;
            const cellTexts = [];
            cells.each((_, cell) => {
                cellTexts.push(`"${$(cell).text().replace(/\s+/g, ' ').trim()}"`);
            });
            const tag = $(row).find('th').length ? 'HEADER' : `linha ${rIdx}`;
            console.log(`    [${tag}] ${cells.length} colunas: ${cellTexts.join(' | ')}`);
        });
    });

    // ── Resultado do parser ───────────────────────────────────────────────────
    console.log('\n[4/5] Resultado de parsePacientes (dados brutos do parser)...\n');
    const pacientesRaw = crawler.parser.parsePacientes(html, CLINICA_ID);
    console.log(`  Total extraído pelo parser: ${pacientesRaw.length} paciente(s)\n`);

    pacientesRaw.forEach((p, i) => {
        console.log(`  Paciente ${i + 1}:`);
        for (const [k, v] of Object.entries(p)) {
            const display = v === null || v === '' || v === undefined ? '\x1b[33mnull\x1b[0m' : `"${v}"`;
            console.log(`    ${k.padEnd(24)} → ${display}`);
        }
        console.log('');
    });

    // ── Modelo Paciente.fromListData ──────────────────────────────────────────
    console.log('[5/5] Resultado de Paciente.fromListData → toResumo...\n');

    let totalNulls = 0;
    pacientesRaw.forEach((raw, i) => {
        const paciente = Paciente.fromListData(raw);
        const resumo = paciente?.toResumo();
        if (!resumo) {
            console.log(`  Paciente ${i + 1}: fromListData retornou null`);
            return;
        }

        const nulls = [];
        function coletarNulls(obj, prefix = '') {
            for (const [k, v] of Object.entries(obj)) {
                const path = prefix ? `${prefix}.${k}` : k;
                if (v === null || v === '' || v === undefined) nulls.push(path);
                else if (typeof v === 'object' && !Array.isArray(v) && k !== 'metadata') {
                    coletarNulls(v, path);
                }
            }
        }
        coletarNulls(resumo);
        totalNulls += nulls.length;

        console.log(`  Paciente ${i + 1} — ${resumo.nome} (${resumo.prontuario}):`);
        console.log(`    leito: ${resumo.leito} | clinicaLeito: ${resumo.clinicaLeito}`);
        console.log(`    clinica: ${resumo.clinica ?? '\x1b[33mnull\x1b[0m'} | diasInternacao: ${resumo.diasInternacao ?? '\x1b[33mnull\x1b[0m'} | dataInternacao: ${resumo.dataInternacao ?? '\x1b[33mnull\x1b[0m'}`);
        console.log(`    idade: ${resumo.idade ?? '\x1b[33mnull\x1b[0m'} | sexo: ${resumo.sexo ?? '\x1b[33mnull\x1b[0m'}`);
        if (nulls.length > 0) {
            console.log(`    \x1b[33mCampos null: ${nulls.join(', ')}\x1b[0m`);
        }
        console.log('');
    });

    console.log(`=== RESUMO: ${pacientesRaw.length} pacientes, ${totalNulls} campos null no total ===\n`);
})();
