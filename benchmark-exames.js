/**
 * Benchmark de performance do pipeline de exames
 * Testa cada etapa separadamente para identificar gargalos
 */
require('dotenv').config();
const HICDCrawler = require('./hicd-crawler-refactored');

const PRONTUARIO = process.argv[2] || '26052';

async function medir(label, fn) {
    const t0 = Date.now();
    try {
        const resultado = await fn();
        const ms = Date.now() - t0;
        console.log(`✅ [${ms}ms] ${label}`);
        return { ok: true, resultado, ms };
    } catch (err) {
        const ms = Date.now() - t0;
        console.log(`❌ [${ms}ms] ${label} — ERRO: ${err.message}`);
        return { ok: false, erro: err.message, ms };
    }
}

(async () => {
    console.log(`\n=== BENCHMARK DE EXAMES — Prontuário ${PRONTUARIO} ===\n`);

    // Login
    const r0 = await medir('Login', async () => {
        const crawler = new HICDCrawler(process.env.HICD_USERNAME, process.env.HICD_PASSWORD);
        await crawler.login();
        return crawler;
    });
    if (!r0.ok) { process.exit(1); }
    const crawler = r0.resultado;

    // Etapa 1: buscar lista de requisições (método rápido)
    const r1 = await medir(`evolutionService.getExames('${PRONTUARIO}') — lista de requisições`, async () => {
        const exames = await crawler.evolutionService.getExames(PRONTUARIO);
        console.log(`   → ${exames.length} requisições encontradas`);
        if (exames.length > 0) {
            console.log(`   → Exemplo: req ${exames[0].requisicao}, ${exames[0].exames?.length} exames, data ${exames[0].data}`);
        }
        return exames;
    });
    if (!r1.ok) { process.exit(1); }
    const requisicoes = r1.resultado;

    if (requisicoes.length === 0) {
        console.log('\n⚠️  Nenhuma requisição encontrada. Encerrando benchmark.');
        process.exit(0);
    }

    // Etapa 2: gerar URLs de impressão
    const r2 = await medir('parser.gerarUrlsImpressao() — geração de URLs', () => {
        const urls = crawler.parser.gerarUrlsImpressao(requisicoes, PRONTUARIO, 'PRONT');
        console.log(`   → ${urls.length} URLs geradas`);
        if (urls.length > 0) {
            console.log(`   → Exemplo URL: ${urls[0].url?.substring(0, 80)}...`);
        }
        return Promise.resolve(urls);
    });
    if (!r2.ok) { process.exit(1); }
    const urls = r2.resultado;

    if (urls.length === 0) {
        console.log('\n⚠️  Nenhuma URL gerada. Encerrando benchmark.');
        process.exit(0);
    }

    // Etapa 3: buscar e parsear UMA requisição (amostra)
    const r3 = await medir(`Fetch + parse de 1 requisição (${urls[0].requisicao})`, async () => {
        const response = await crawler.httpClient.get(urls[0].url, {
            timeout: 20000,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.8',
            }
        });
        const resultados = crawler.parser.parseResultadosExames(response.data, urls[0].requisicao);
        console.log(`   → ${resultados.length} resultados extraídos`);
        return resultados;
    });

    // Etapa 4: projeção para N requisições
    console.log('\n=== PROJEÇÃO DE PERFORMANCE ===\n');
    const BATCH_SIZE = parseInt(process.env.EXAM_BATCH_SIZE) || 5;
    const DELAY_MS = parseInt(process.env.EXAM_BATCH_DELAY_MS) || 100;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);
    const tempoUmaReq = r3.ok ? r3.ms : 5000; // fallback 5s se falhou
    const tempoEstimadoTotal = (totalBatches * tempoUmaReq) + ((totalBatches - 1) * DELAY_MS);

    console.log(`Configuração atual:`);
    console.log(`  BATCH_SIZE: ${BATCH_SIZE}`);
    console.log(`  DELAY_ENTRE_BATCHES: ${DELAY_MS}ms`);
    console.log(`  Total requisições: ${urls.length}`);
    console.log(`  Total batches: ${totalBatches}`);
    console.log(`  Tempo por requisição (medido): ~${tempoUmaReq}ms`);
    console.log(`  Tempo estimado total: ~${(tempoEstimadoTotal / 1000).toFixed(1)}s`);
    console.log('');

    // Sugestões de otimização
    console.log('=== RESUMO E RECOMENDAÇÕES ===\n');
    console.log(`Etapa 1 (lista de requisições): ${r1.ms}ms`);
    console.log(`Etapa 2 (gerar URLs):           ${r2.ms}ms`);
    console.log(`Etapa 3 (1 requisição completa): ${r3.ok ? r3.ms + 'ms' : 'FALHOU'}`);
    console.log(`Projeção total (${urls.length} requisições): ~${(tempoEstimadoTotal / 1000).toFixed(0)}s`);
    console.log('');
    console.log('BUG IDENTIFICADO:');
    console.log('  crawler.getExames() chama evolutionService.getResultadosExames() (N+1 pesado)');
    console.log('  Deveria chamar evolutionService.getExames() (lista rápida)');
    console.log('  O controller já faz a separação correta — só o método wrapper estava errado.');
    console.log('');
    if (tempoEstimadoTotal > 30000) {
        console.log('RECOMENDAÇÕES DE PERFORMANCE:');
        console.log(`  - Aumentar BATCH_SIZE (atual: ${BATCH_SIZE}) para reduzir nº de delays`);
        console.log(`  - Reduzir DELAY_ENTRE_BATCHES_MS (atual: ${DELAY_MS}ms)`);
        console.log(`  - Adicionar limite máximo de requisições por chamada`);
        console.log(`  - Implementar streaming/lazy loading de resultados`);
    } else {
        console.log('Performance dentro do esperado com a configuração atual.');
    }
})();
