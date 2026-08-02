/**
 * Testes do override de host por requisição (4 itens):
 *  1. Middleware lê header e valida contra allowlist
 *  2. Multi-tenant de crawler (Map por host)
 *  3. config.forHost(host) / resolveHost(host)
 *  4. Cache namespaced por host
 *
 * Runner: node --test (Node >= 18). Sem dependências externas.
 */
const { test } = require('node:test');
const assert = require('node:assert');

// Allowlist controlada por env — definida antes de carregar o config
process.env.HICD_HOST = 'hicd-hospub.sesau.ro.gov.br';
process.env.HICD_HOST_ALLOWLIST = 'hicd-hospub.sesau.ro.gov.br,hb-hospub.sesau.ro.gov.br';

const config = require('../config');
const cache = require('../api/utils/cache');
const sharedCrawler = require('../api/shared-crawler');

// ============ Item 3: config.forHost / resolveHost ============

test('config.forHost deriva origin/URLs a partir do host', () => {
    const cfg = config.forHost('hb-hospub.sesau.ro.gov.br');
    assert.strictEqual(cfg.host, 'hb-hospub.sesau.ro.gov.br');
    assert.strictEqual(cfg.origin, 'https://hb-hospub.sesau.ro.gov.br');
    assert.strictEqual(cfg.auth.origin, 'https://hb-hospub.sesau.ro.gov.br');
    assert.strictEqual(cfg.auth.loginUrl, 'https://hb-hospub.sesau.ro.gov.br/prontuario/frontend/controller/controller.php');
    assert.strictEqual(cfg.auth.indexUrl, 'https://hb-hospub.sesau.ro.gov.br/prontuario/frontend/index.php');
    assert.strictEqual(cfg.auth.baseUrl, 'https://hb-hospub.sesau.ro.gov.br/prontuario/frontend');
});

test('config.forHost preserva a config estática (network/extraction)', () => {
    const cfg = config.forHost('hb-hospub.sesau.ro.gov.br');
    assert.ok(cfg.network && typeof cfg.network.timeout === 'number');
    assert.ok(Array.isArray(cfg.validation.errorIndicators));
});

test('config.forHost sem host usa o host padrão', () => {
    const cfg = config.forHost();
    assert.strictEqual(cfg.host, config.host);
});

test('resolveHost normaliza (trim/lowercase) hosts válidos', () => {
    assert.strictEqual(config.resolveHost('  HB-Hospub.Sesau.RO.gov.br '), 'hb-hospub.sesau.ro.gov.br');
});

test('resolveHost vazio/undefined retorna host padrão', () => {
    assert.strictEqual(config.resolveHost(), config.host);
    assert.strictEqual(config.resolveHost(''), config.host);
});

test('resolveHost rejeita host fora da allowlist (anti-SSRF)', () => {
    assert.throws(() => config.resolveHost('evil.example.com'), /INVALID_HOST|não permitido|allowlist/i);
});

test('HOST_ALLOWLIST contém os dois hosts conhecidos', () => {
    assert.ok(config.HOST_ALLOWLIST.includes('hicd-hospub.sesau.ro.gov.br'));
    assert.ok(config.HOST_ALLOWLIST.includes('hb-hospub.sesau.ro.gov.br'));
});

// ============ Item 4: cache namespaced por host ============

test('cache.generateKey difere por host', () => {
    const kA = cache.generateKey('evolucoes', '123', { limite: 5 }, 'hicd-hospub.sesau.ro.gov.br');
    const kB = cache.generateKey('evolucoes', '123', { limite: 5 }, 'hb-hospub.sesau.ro.gov.br');
    assert.notStrictEqual(kA, kB);
});

test('cache.generateKey sem host = comportamento legado', () => {
    const k = cache.generateKey('evolucoes', '123', { limite: 5 });
    assert.strictEqual(k, 'evolucoes:123:limite:5');
});

test('cache namespaced: dados de um host não vazam para o outro', () => {
    const kA = cache.generateKey('exames', '999', {}, 'hicd-hospub.sesau.ro.gov.br');
    const kB = cache.generateKey('exames', '999', {}, 'hb-hospub.sesau.ro.gov.br');
    cache.set(kA, { valor: 'A' });
    assert.strictEqual(cache.get(kB), null);
    assert.deepStrictEqual(cache.get(kA), { valor: 'A' });
    cache.delete(kA);
});

test('invalidateType continua funcionando com host no key', () => {
    const k = cache.generateKey('prescricoes', '55', {}, 'hb-hospub.sesau.ro.gov.br');
    cache.set(k, { x: 1 });
    const n = cache.invalidateType('prescricoes');
    assert.ok(n >= 1);
    assert.strictEqual(cache.get(k), null);
});

// ============ Item 2: multi-tenant crawler ============

test('shared-crawler mantém instância separada por host', async () => {
    // injeta um factory fake para não bater na rede
    const criados = [];
    sharedCrawler.__setCrawlerFactory((username, password, cfg) => {
        const inst = { username, host: cfg.host, login: async () => ({ success: true }) };
        criados.push(inst);
        return inst;
    });

    const h1 = 'hicd-hospub.sesau.ro.gov.br';
    const h2 = 'hb-hospub.sesau.ro.gov.br';

    await sharedCrawler.initCrawler('user1', 'pass1', h1);
    await sharedCrawler.initCrawler('user2', 'pass2', h2);

    assert.strictEqual(sharedCrawler.isReady(h1), true);
    assert.strictEqual(sharedCrawler.isReady(h2), true);
    assert.strictEqual(sharedCrawler.getCrawler(h1).host, h1);
    assert.strictEqual(sharedCrawler.getCrawler(h2).host, h2);
    assert.notStrictEqual(sharedCrawler.getCrawler(h1), sharedCrawler.getCrawler(h2));
});

test('shared-crawler.getCrawler sem host usa o host padrão', async () => {
    sharedCrawler.__setCrawlerFactory((username, password, cfg) => ({
        username, host: cfg.host, login: async () => ({ success: true })
    }));
    await sharedCrawler.initCrawler('u', 'p'); // sem host → default
    assert.strictEqual(sharedCrawler.isReady(), true);
    assert.strictEqual(sharedCrawler.getCrawler().host, config.host);
});

test('shared-crawler.getCrawler lança se host não inicializado', () => {
    sharedCrawler.__reset && sharedCrawler.__reset();
    assert.throws(() => sharedCrawler.getCrawler('hb-hospub.sesau.ro.gov.br'), /não inicializado|inicializado/i);
});
