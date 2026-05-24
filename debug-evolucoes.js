#!/usr/bin/env node
/**
 * debug-evolucoes.js
 *
 * Modos de uso:
 *   node debug-evolucoes.js <prontuario> [--usuario USUARIO --senha SENHA]
 *       Busca evoluções ao vivo no HICD e registra HTML bruto + relatório do parser.
 *       As credenciais podem vir do .env ou dos flags --usuario / --senha.
 *
 *   node debug-evolucoes.js --json <arquivo.json>
 *       Re-processa um JSON já salvo pelo crawler (evolucoes-UTI-*.json ou
 *       output/debug-evolucoes-ID/evolucoes.json) — sem conexão ao servidor.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const EvolucaoParser = require('./src/parsers/evolucao-parser');

// ─── argumentos ───────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const jsonIdx    = args.indexOf('--json');
const jsonFile   = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
const prontuario = args.find(a => /^\d+$/.test(a));

const usuarioIdx = args.indexOf('--usuario');
const senhaIdx   = args.indexOf('--senha');
const CLI_USER   = usuarioIdx !== -1 ? args[usuarioIdx + 1] : null;
const CLI_PASS   = senhaIdx   !== -1 ? args[senhaIdx   + 1] : null;

const USUARIO = CLI_USER || process.env.HICD_USERNAME;
const SENHA   = CLI_PASS || process.env.HICD_PASSWORD;

if (!prontuario && !jsonFile) {
    console.error('Uso:');
    console.error('  node debug-evolucoes.js <prontuario> [--usuario USER --senha PASS]');
    console.error('  node debug-evolucoes.js --json <arquivo.json>');
    process.exit(1);
}

if (!jsonFile && (!USUARIO || !SENHA)) {
    console.error('Credenciais obrigatorias. Passe --usuario e --senha ou defina HICD_USERNAME/HICD_PASSWORD no .env');
    process.exit(1);
}

// ─── diretório de saída ────────────────────────────────────────────────────────
const label  = prontuario || path.basename(jsonFile, '.json');
const outDir = path.join(__dirname, 'output', `debug-evolucoes-${label}`);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function salvar(nome, conteudo) {
    const p = path.join(outDir, nome);
    fs.writeFileSync(p, conteudo, 'utf8');
    return p;
}

// ─── seções esperadas no texto de descrição ───────────────────────────────────
const SECOES_MONITORADAS = [
    'Hipóteses Diagnósticas',
    'Diagnósticos anteriores',
    'Em uso',
    'Fez uso',
    'Dispositivos',
    'Conduta',
    'Pendências',
    'Exames Complementares',
    'Gasometria',
    'Controle 24h',
    'Controle 24 h',
    'BH 24h',
    'Evolução médica',
    'Exame Físico',
    'Diurese',
];

// ─── relatório ────────────────────────────────────────────────────────────────
function imprimirRelatorio(evolucoes, htmlCount) {
    const SEP1 = '='.repeat(70);
    const SEP2 = '-'.repeat(70);

    const total = evolucoes.length;
    if (total === 0) {
        console.log('\n[SEM EVOLUCOES] Nenhuma evolução para analisar.');
        return;
    }

    // ── preenchimento de campos ──────────────────────────────────────────────
    const campos = [
        'profissional', 'dataEvolucao', 'dataAtualizacao',
        'atividade', 'clinicaLeito', 'descricao', 'textoLimpo',
    ];
    const preenchidos = {};
    for (const c of campos) preenchidos[c] = 0;

    for (const e of evolucoes) {
        for (const c of campos) {
            if (e[c] && String(e[c]).trim()) preenchidos[c]++;
        }
    }

    console.log('\n' + SEP1);
    console.log('RELATORIO DO PARSER DE EVOLUCOES');
    console.log(SEP1);

    if (htmlCount !== undefined) {
        console.log(`\nHTML(s) salvos: ${htmlCount}`);
    }

    console.log(`\nPREENCHIMENTO DE CAMPOS (${total} evolucoes):`);
    for (const c of campos) {
        const n   = preenchidos[c];
        const pct = Math.round(n / total * 100);
        const bar = '#'.repeat(Math.round(pct / 5)).padEnd(20);
        const tag = n < total ? (n === 0 ? ' [VAZIO]' : ' [PARCIAL]') : ' [OK]';
        console.log(`  ${c.padEnd(20)} ${String(n).padStart(4)}/${total}  ${bar} ${pct}%${tag}`);
    }

    // ── seções encontradas no texto ─────────────────────────────────────────
    const secoesNoTexto = {};
    const secoesExtraidas = {};
    for (const s of SECOES_MONITORADAS) {
        secoesNoTexto[s]    = 0;
        secoesExtraidas[s]  = 0;
    }

    for (const e of evolucoes) {
        const textoLower = (e.descricao || '').toLowerCase();
        for (const s of SECOES_MONITORADAS) {
            const sLower = s.toLowerCase();
            if (textoLower.includes(sLower + ':')) secoesNoTexto[s]++;
        }
        // Verificar se dadosEstruturados tem o campo correspondente preenchido
        const d = e.dadosEstruturados || {};
        if ((d.hipotesesDiagnosticas || []).length > 0)  secoesExtraidas['Hipóteses Diagnósticas']++;
        if ((d.medicamentosEmUso     || []).length > 0)  secoesExtraidas['Em uso']++;
        if ((d.medicamentosAnteriores|| []).length > 0)  secoesExtraidas['Fez uso']++;
        if ((d.dispositivos          || []).length > 0)  secoesExtraidas['Dispositivos']++;
        if ((d.conduta               || []).length > 0)  secoesExtraidas['Conduta']++;
        if ((d.pendencias            || []).length > 0)  secoesExtraidas['Pendências']++;
        if ((d.diagnosticosAnteriores|| []).length > 0)  secoesExtraidas['Diagnósticos anteriores']++;
        // Campos string (não-array)
        if ((d.evolucaoMedica || '').trim())             secoesExtraidas['Evolução médica']++;
        if ((d.exameFisico    || '').trim())             secoesExtraidas['Exame Físico']++;
        if ((d.controle24h    || '').trim()) {
            secoesExtraidas['Controle 24h']++;
            secoesExtraidas['Controle 24 h']++;
        }
        if ((d.bh24h          || '').trim())             secoesExtraidas['BH 24h']++;
        if ((d.diurese        || '').trim())             secoesExtraidas['Diurese']++;
    }

    console.log(`\nSECOES NO TEXTO vs EXTRAIDAS:`);
    console.log(`  ${'Seção'.padEnd(28)} ${'No texto'.padStart(8)}   ${'Extraida'.padStart(8)}`);
    console.log('  ' + '-'.repeat(50));
    for (const s of SECOES_MONITORADAS) {
        const nt  = secoesNoTexto[s];
        const ext = secoesExtraidas[s];
        if (nt === 0) continue;
        const tag = ext < nt ? (ext === 0 ? ' [NAO EXTRAIDA]' : ' [PARCIAL]') : ' [OK]';
        console.log(`  ${s.padEnd(28)} ${String(nt).padStart(8)}   ${String(ext).padStart(8)}${tag}`);
    }

    // ── amostra de evoluções com campos problemáticos ────────────────────────
    console.log(`\n${SEP2}`);
    console.log('AMOSTRA (evolucoes com campos vazios):');

    const problemáticas = evolucoes.filter(e =>
        !e.clinicaLeito || !e.textoLimpo
    ).slice(0, 5);

    if (problemáticas.length === 0) {
        console.log('  (nenhum problema encontrado na amostra)');
    }
    for (const e of problemáticas) {
        console.log(`\n  [${e.dataEvolucao || '??'}] ${e.profissional || '??'}`);
        console.log(`    atividade    : ${e.atividade || '(vazio)'}`);
        console.log(`    clinicaLeito : ${e.clinicaLeito || '(VAZIO)'}`);
        console.log(`    textoLimpo   : ${e.textoLimpo ? e.textoLimpo.substring(0, 60) + '...' : '(VAZIO)'}`);
        const desc100 = (e.descricao || '').substring(0, 80);
        console.log(`    descricao    : ${desc100}...`);
        const d = e.dadosEstruturados || {};
        const secPreench = [];
        if ((d.hipotesesDiagnosticas||[]).length) secPreench.push('hipoteses');
        if ((d.medicamentosEmUso||[]).length)     secPreench.push('medicamentos');
        if ((d.dispositivos||[]).length)          secPreench.push('dispositivos');
        if ((d.conduta||[]).length)               secPreench.push('conduta');
        if (d.sinaisVitais && Object.values(d.sinaisVitais).some(Boolean)) secPreench.push('sinaisVitais');
        if (d.balanco && d.balanco.saldo)         secPreench.push('balanco');
        console.log(`    dadosEstruct : ${secPreench.join(', ') || '(vazio)'}`);
    }

    // ── resumo final ─────────────────────────────────────────────────────────
    console.log('\n' + SEP1);
    console.log('RESUMO FINAL');
    console.log(SEP1);
    console.log(`  Total de evolucoes     : ${total}`);
    console.log(`  Com clinicaLeito       : ${preenchidos.clinicaLeito} (${Math.round(preenchidos.clinicaLeito/total*100)}%)`);
    console.log(`  Com textoLimpo         : ${preenchidos.textoLimpo} (${Math.round(preenchidos.textoLimpo/total*100)}%)`);
    console.log(`  Com descricao          : ${preenchidos.descricao} (${Math.round(preenchidos.descricao/total*100)}%)`);
    const comDados = evolucoes.filter(e => {
        const d = e.dadosEstruturados || {};
        return Object.values(d).some(v => Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' && Object.values(v).some(Boolean));
    }).length;
    console.log(`  Com dadosEstruturados  : ${comDados} (${Math.round(comDados/total*100)}%)`);
    console.log(`\n  Arquivos em: ${outDir}`);
}

// ─── modo --json: re-analisar JSON já salvo ────────────────────────────────────
function modoJson(arquivo) {
    console.log(`\nDEBUG PARSER EVOLUCOES (modo --json): ${arquivo}`);
    console.log(`Saida em: ${outDir}\n`);

    const raw = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const parser = new EvolucaoParser();

    // Aceita: evolucoes-UTI-*.json (array de pacientes com { evolucoes: [...] })
    //         ou debug-evolucoes-*/evolucoes.json (array direto de evoluções)
    let evolucoes = [];
    if (Array.isArray(raw) && raw[0] && Array.isArray(raw[0].evolucoes)) {
        for (const p of raw) evolucoes.push(...(p.evolucoes || []));
        console.log(`${raw.length} pacientes, ${evolucoes.length} evolucoes carregadas\n`);
    } else if (Array.isArray(raw) && raw[0] && raw[0].dataEvolucao !== undefined) {
        evolucoes = raw;
        console.log(`${evolucoes.length} evolucoes carregadas (formato direto)\n`);
    } else {
        console.error('Formato de JSON nao reconhecido.');
        process.exit(1);
    }

    // Re-executar extrairDadosEstruturadosEvolucao sobre o texto de descricao
    const evolucoesProcesadas = evolucoes.map(e => {
        const texto = e.descricao || e.textoCompleto || '';
        const dadosEstruturados = texto
            ? parser.extrairDadosEstruturadosEvolucao(texto)
            : {};
        return {
            ...e,
            textoLimpo: texto,
            dadosEstruturados,
        };
    });

    salvar('evolucoes-reprocessadas.json', JSON.stringify(evolucoesProcesadas, null, 2));
    imprimirRelatorio(evolucoesProcesadas);
}

// ─── modo ao vivo: busca no servidor HICD ─────────────────────────────────────
async function modoAoVivo() {
    const HICDCrawler = require('./hicd-crawler-refactored');

    console.log(`\nDEBUG DE EVOLUCOES — prontuario ${prontuario}`);
    console.log(`Saida em: ${outDir}\n`);

    const crawler = new HICDCrawler(USUARIO, SENHA);

    console.log('Autenticando...');
    const loginResult = await crawler.login();
    if (!loginResult.success) {
        console.error('Falha no login:', loginResult.error);
        process.exit(1);
    }
    console.log('Login OK\n');

    // Interceptar HTTP POST para capturar HTML bruto das evoluções
    const htmlCapturado = {};
    const postOriginal = crawler.httpClient.post.bind(crawler.httpClient);
    crawler.httpClient.post = async function (url, data, opcoes) {
        const resp = await postOriginal(url, data, opcoes);
        const body = data instanceof URLSearchParams ? data.toString() : String(data);
        if (body.includes('ParamModule=Evo')) {
            const chave = `evo-${prontuario}`;
            htmlCapturado[chave] = resp.data;
        }
        return resp;
    };

    console.log(`Buscando evolucoes do paciente ${prontuario}...`);
    const evolucoes = await crawler.evolutionService.getEvolucoes(prontuario);
    console.log(`  ${evolucoes.length} evolucoes encontradas\n`);

    // Salvar HTML bruto capturado
    for (const [chave, html] of Object.entries(htmlCapturado)) {
        salvar(`${chave}.html`, html);
    }
    console.log(`${Object.keys(htmlCapturado).length} HTML(s) salvos\n`);

    salvar('evolucoes.json', JSON.stringify(evolucoes, null, 2));

    imprimirRelatorio(evolucoes, Object.keys(htmlCapturado).length);

    await crawler.logout();
}

// ─── main ─────────────────────────────────────────────────────────────────────
(async () => {
    if (jsonFile) {
        modoJson(jsonFile);
    } else {
        await modoAoVivo();
    }
})().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
