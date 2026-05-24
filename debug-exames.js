#!/usr/bin/env node
/**
 * debug-exames.js
 *
 * Modos de uso:
 *   node debug-exames.js <prontuario> [--usuario USUARIO --senha SENHA]
 *       Busca exames ao vivo no HICD e registra HTML bruto + relatório do parser.
 *       As credenciais podem vir do .env (HICD_USERNAME / HICD_PASSWORD) ou dos flags.
 *
 *   node debug-exames.js --json <arquivo.json>
 *       Roda apenas o parser sobre um JSON já salvo (sem conexão ao servidor).
 *       Aceita output/debug-exames-<id>/resultados.json
 *       ou output/evolucoes-UTI-*.json.
 *
 *   --raw-only   Salva HTML e JSON mas não imprime o relatório detalhado.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const ExamesParser = require('./src/parsers/exames-parser');

// ─── argumentos ───────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const rawOnly    = args.includes('--raw-only');
const jsonIdx    = args.indexOf('--json');
const jsonFile   = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
const prontuario = args.find(a => /^\d+$/.test(a));

const usuarioIdx = args.indexOf('--usuario');
const senhaIdx   = args.indexOf('--senha');
const CLI_USER   = usuarioIdx !== -1 ? args[usuarioIdx + 1] : null;
const CLI_PASS   = senhaIdx   !== -1 ? args[senhaIdx   + 1] : null;

// Credenciais: flag CLI > .env
const USUARIO = CLI_USER || process.env.HICD_USERNAME;
const SENHA   = CLI_PASS || process.env.HICD_PASSWORD;

if (!prontuario && !jsonFile) {
    console.error('Uso:');
    console.error('  node debug-exames.js <prontuario> [--usuario USER --senha PASS]');
    console.error('  node debug-exames.js --json <arquivo.json>');
    process.exit(1);
}

if (!jsonFile && (!USUARIO || !SENHA)) {
    console.error('Credenciais obrigatorias. Passe --usuario e --senha ou defina HICD_USERNAME/HICD_PASSWORD no .env');
    process.exit(1);
}

// ─── diretório de saída ────────────────────────────────────────────────────────
const label  = prontuario || path.basename(jsonFile, '.json');
const outDir = path.join(__dirname, 'output', `debug-exames-${label}`);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ─── helpers ──────────────────────────────────────────────────────────────────
function salvar(nome, conteudo) {
    const p = path.join(outDir, nome);
    fs.writeFileSync(p, conteudo, 'utf8');
    return p;
}

function resumoTexto(txt, maxLinhas = 6) {
    const linhas = txt.split('\n').filter(l => l.trim());
    const trunc  = linhas.slice(0, maxLinhas);
    if (linhas.length > maxLinhas) trunc.push(`  ... (+${linhas.length - maxLinhas} linhas)`);
    return trunc.join('\n');
}

// ─── parser instrumentado ─────────────────────────────────────────────────────
/**
 * Cria um ExamesParser com `expandirBlocoTextual` substituído para
 * registrar qual detector disparou (ou não) em cada bloco.
 */
function criarParserDebug(log) {
    const parser  = new ExamesParser();
    const original = parser.expandirBlocoTextual.bind(parser);

    parser.expandirBlocoTextual = function (resultado) {
        const texto = (resultado.valor || '').trim();

        if (!texto.includes('\n')) return original(resultado);   // linha única → sem interceptação

        const titulo = texto.split('\n')[0].trim();
        const itens  = original(resultado);

        if (itens === null) {
            log.blocosSemExpansao.push({ sigla: resultado.sigla, titulo, texto });
        } else {
            log.blocosExpandidos.push({
                sigla:   resultado.sigla,
                titulo,
                metodo:  detectarMetodo(titulo),
                itens:   itens.length,
                siglas:  itens.map(i => i.sigla)
            });
        }

        return itens;
    };

    return parser;
}

function detectarMetodo(titulo) {
    if (/^HEMOGRAMA\b/i.test(titulo))                            return 'parseHemograma';
    if (/^PROTEINAS\s+TOTAIS\b/i.test(titulo))                   return 'parseProteinasTotais';
    if (/^BILIRRUBINAS?\b/i.test(titulo))                        return 'parseBilirrubinas';
    if (/^(?:TEMPO\s+DE\s+(?:ATIVIDADE\s+DE\s+)?PROTROMBINA|TAP)\b/i.test(titulo)) return 'parseTAP';
    if (/^(?:TEMPO\s+DE\s+TROMBOPLASTINA|TTPA)\b/i.test(titulo)) return 'parseTTPA';
    return 'fallback-generico';
}

// ─── interceptar httpClient.get para salvar HTML bruto ───────────────────────
function instrumentarHttpClient(httpClient, htmlCapturado) {
    const getOriginal = httpClient.get.bind(httpClient);
    httpClient.get = async function (url, opcoes) {
        const resp = await getOriginal(url, opcoes);
        // Salvar apenas páginas de exames
        if (url.includes('exame.php')) {
            const req = new URL(url).searchParams.get('requisicao') || 'unknown';
            htmlCapturado[req] = resp.data;
        }
        return resp;
    };
}

// ─── relatório ────────────────────────────────────────────────────────────────
function imprimirRelatorio(resultados, log) {
    const SEP1 = '='.repeat(70);
    const SEP2 = '-'.repeat(70);

    console.log('\n' + SEP1);
    console.log('RELATORIO DO PARSER');
    console.log(SEP1);

    // blocos expandidos
    console.log(`\nBLOCOS MULTI-LINHA EXPANDIDOS (${log.blocosExpandidos.length}):`);
    for (const b of log.blocosExpandidos) {
        console.log(`\n  [${b.sigla}] "${b.titulo}"`);
        console.log(`       metodo : ${b.metodo}`);
        console.log(`       itens  : ${b.itens} -> ${b.siglas.join(', ')}`);
    }

    // blocos sem expansão
    console.log(`\nBLOCOS MULTI-LINHA SEM EXPANSAO (${log.blocosSemExpansao.length}):`);
    if (log.blocosSemExpansao.length === 0) {
        console.log('  nenhum');
    }
    for (const b of log.blocosSemExpansao) {
        console.log(`\n  [${b.sigla}] titulo: "${b.titulo}"`);
        console.log('  primeiras linhas:');
        console.log(resumoTexto(b.texto).replace(/^/gm, '    '));
    }

    // itens por requisição
    console.log('\n' + SEP2);
    console.log('ITENS EXTRAIDOS POR REQUISICAO:');
    for (const req of resultados) {
        const ok   = req.resultados && req.resultados.length > 0;
        const flag = ok ? '[OK]' : '[--]';
        console.log(`\n  ${flag} [${req.requisicaoId}] ${req.data || ''} — ${req.totalResultados ?? 0} itens`);
        if (ok) {
            for (const r of req.resultados) {
                const multiLinha = (r.valor || '').includes('\n');
                const tag        = multiLinha ? '[BRUTO]' : '       ';
                const num        = r.valorNumerico != null ? r.valorNumerico : '---';
                const valExibir  = String(r.valor).split('\n')[0].slice(0, 38);
                console.log(`    ${tag} ${r.sigla.padEnd(16)} ${valExibir.padEnd(40)} num=${num}`);
            }
        }
    }

    // resumo
    const totalItens  = resultados.reduce((s, r) => s + (r.resultados?.length ?? 0), 0);
    const itensBrutos = resultados.reduce((s, r) => s + (r.resultados?.filter(x => (x.valor||'').includes('\n')).length ?? 0), 0);
    const itensNum    = resultados.reduce((s, r) => s + (r.resultados?.filter(x => x.valorNumerico != null).length ?? 0), 0);

    console.log('\n' + SEP1);
    console.log('RESUMO FINAL');
    console.log(SEP1);
    console.log(`  Requisicoes processadas : ${resultados.length}`);
    console.log(`  Total de itens          : ${totalItens}`);
    console.log(`  Com valorNumerico       : ${itensNum} (${totalItens ? Math.round(itensNum/totalItens*100) : 0}%)`);
    console.log(`  Ainda texto bruto       : ${itensBrutos}`);
    console.log(`  Blocos expandidos       : ${log.blocosExpandidos.length}`);
    console.log(`  Blocos sem expansao     : ${log.blocosSemExpansao.length}`);
    console.log(`\n  Arquivos em: ${outDir}`);
}

// ─── modo --json: re-parsear JSON já salvo ────────────────────────────────────
function modoJson(arquivo) {
    console.log(`\nDEBUG PARSER (modo --json): ${arquivo}`);
    console.log(`Saida em: ${outDir}\n`);

    const raw = JSON.parse(fs.readFileSync(arquivo, 'utf8'));

    // Aceita tanto resultados.json quanto evolucoes-UTI-*.json
    // evolucoes-UTI: array de pacientes com { exames: [...] }
    // resultados.json: array de requisições com { resultados: [...] }
    let requisicoes = [];
    if (Array.isArray(raw) && raw[0]?.exames) {
        // formato evolucoes-UTI-*.json
        for (const p of raw) {
            if (p.exames) requisicoes.push(...p.exames);
        }
    } else if (Array.isArray(raw) && raw[0]?.resultados !== undefined) {
        requisicoes = raw;
    } else {
        console.error('Formato de JSON nao reconhecido.');
        process.exit(1);
    }

    console.log(`${requisicoes.length} requisicoes carregadas do JSON\n`);

    const log      = { blocosExpandidos: [], blocosSemExpansao: [] };
    const parser   = criarParserDebug(log);

    const SIGLA_BRUTA_PARA_CANONICA = new Map([
        ['TTPA',        'TTPA_TEMPO'],
        ['RATIO',       'TTPA_RATIO'],
        ['POOL_NORMAL', 'TAP_CTRL'],
        ['PLASMA_PAC',  'TAP_TEMPO'],
        ['ATIVIDADE',   'TAP_ATIV'],
        ['RNI',         'INR'],
    ]);

    // Re-parsear cada resultado bruto passando pelo expandirBlocoTextual + deduplicação
    const resultadosReprocessados = requisicoes.map(req => {
        if (!req.resultados || req.resultados.length === 0) return req;

        const resultadosFinais  = [];
        const objetosExpandidos = new Set();
        const siglasExpandidas  = new Set();

        for (const resultado of req.resultados) {
            const expandidos = parser.expandirBlocoTextual(resultado);
            if (expandidos && expandidos.length > 0) {
                resultadosFinais.push(...expandidos);
                expandidos.forEach(e => { objetosExpandidos.add(e); siglasExpandidas.add(e.sigla); });
            } else {
                resultadosFinais.push(resultado);
            }
        }

        const semDuplicatas = resultadosFinais.filter(r => {
            if (objetosExpandidos.has(r)) return true;
            if ((r.valor || '').includes('\n')) return true;
            if (siglasExpandidas.has(r.sigla)) return false;
            const canonica = SIGLA_BRUTA_PARA_CANONICA.get(r.sigla);
            return !(canonica && siglasExpandidas.has(canonica));
        });

        return { ...req, resultados: semDuplicatas, totalResultados: semDuplicatas.length };
    });

    salvar('resultados-reprocessados.json', JSON.stringify(resultadosReprocessados, null, 2));

    if (!rawOnly) imprimirRelatorio(resultadosReprocessados, log);
}

// ─── modo ao vivo: busca no servidor HICD ─────────────────────────────────────
async function modoAoVivo() {
    const HICDCrawler = require('./hicd-crawler-refactored');

    console.log(`\nDEBUG DE EXAMES — prontuario ${prontuario}`);
    console.log(`Saida em: ${outDir}\n`);

    const crawler = new HICDCrawler(USUARIO, SENHA);

    console.log('Autenticando...');
    const loginResult = await crawler.login();
    if (!loginResult.success) {
        console.error('Falha no login:', loginResult.error);
        process.exit(1);
    }
    console.log('Login OK\n');

    // interceptar HTTP para capturar HTML bruto
    const htmlCapturado = {};
    instrumentarHttpClient(crawler.httpClient, htmlCapturado);

    // substituir parser por versão debug
    const log = { blocosExpandidos: [], blocosSemExpansao: [] };
    const parserDebug = criarParserDebug(log);
    crawler.parser.examesParser     = parserDebug;
    crawler.evolutionService.parser = crawler.parser;

    // buscar lista de requisições
    console.log(`Buscando lista de requisicoes do paciente ${prontuario}...`);
    const requisicoes = await crawler.evolutionService.getExames(prontuario);
    console.log(`  ${requisicoes.length} requisicoes encontradas\n`);

    if (requisicoes.length === 0) {
        console.error('Nenhuma requisicao encontrada. Verifique o prontuario ou sessao.');
        await crawler.logout();
        process.exit(1);
    }

    salvar('requisicoes.json', JSON.stringify(requisicoes, null, 2));

    // buscar resultados
    console.log('Buscando resultados de cada requisicao...');
    const resultados = await crawler.evolutionService.getResultadosExames(prontuario, {}, requisicoes);
    console.log(`  ${resultados.length} requisicoes com resultados\n`);

    salvar('resultados.json', JSON.stringify(resultados, null, 2));

    // salvar HTML bruto
    for (const [req, html] of Object.entries(htmlCapturado)) {
        salvar(`html-${req}.html`, html);
    }
    console.log(`${Object.keys(htmlCapturado).length} HTML(s) brutos salvos\n`);

    if (!rawOnly) imprimirRelatorio(resultados, log);

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
