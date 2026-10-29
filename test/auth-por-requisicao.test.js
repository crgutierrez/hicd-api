/**
 * Testes da autenticação por requisição e do login leniente.
 *
 * Contexto (2026-10-29): no servidor exposto, depois do primeiro login qualquer
 * requisição sem token lia o censo de pacientes — o middleware só olhava o
 * Authorization enquanto o crawler não estava pronto. E o HB aceitou como
 * sucesso um login com usuário inexistente (HTTP 200 + alert), deixando a
 * sessão aberta com clínicas/prescrições funcionando e 0 evoluções.
 *
 * Cobre:
 *  1. requireCrawler exige token mesmo com sessão ativa
 *  2. mesmo token reusa a sessão sem novo login
 *  3. token com credencial diferente faz login; falha não derruba a sessão boa
 *  4. extrairErroLogin / isUsuarioNaoLogado
 *  5. auth-service recusa a resposta de login com alert()
 *  6. evolution-service propaga "Usuario nao esta logado" em vez de devolver []
 *
 * Runner: node --test (Node >= 18). Sem dependências externas nem rede.
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

process.env.HICD_HOST = 'hicd-hospub.sesau.ro.gov.br';
process.env.HICD_HOST_ALLOWLIST = 'hicd-hospub.sesau.ro.gov.br,hb-hospub.sesau.ro.gov.br';
process.env.LOGIN_ENCRYPT_KEY = crypto.randomBytes(32).toString('hex');

const sharedCrawler = require('../api/shared-crawler');
const { requireCrawler } = require('../api/middleware/require-auth');
const { extrairErroLogin, isUsuarioNaoLogado } = require('../src/core/session');
const HICDAuthService = require('../src/services/auth-service');
const EvolutionService = require('../src/services/evolution-service');

const HB = 'hb-hospub.sesau.ro.gov.br';

function token(texto) {
    const key = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
    const iv = crypto.randomBytes(12);
    const ci = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([ci.update(texto, 'utf8'), ci.final()]);
    return Buffer.concat([iv, ci.getAuthTag(), enc]).toString('base64');
}

function fakeRes() {
    return {
        statusCode: 200,
        body: null,
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; return this; }
    };
}

async function chamar(headers) {
    const req = { headers };
    const res = fakeRes();
    let passou = false;
    await requireCrawler(req, res, () => { passou = true; });
    return { passou, res };
}

// Crawler fake: só "cristiano sousa:certa" loga.
let logins;
beforeEach(() => {
    sharedCrawler.__reset();
    logins = [];
    sharedCrawler.__setCrawlerFactory((username, password, cfg) => ({
        username,
        host: cfg.host,
        login: async () => {
            logins.push(username);
            return username === 'cristiano sousa' && password === 'certa'
                ? { success: true }
                : { success: false, message: 'HICD recusou o login' };
        }
    }));
});

// ============ Item 1: token exigido sempre ============

test('requireCrawler devolve 401 sem token mesmo com sessão ativa', async () => {
    await sharedCrawler.initCrawler('cristiano sousa', 'certa', HB);
    assert.strictEqual(sharedCrawler.isReady(HB), true);

    const { passou, res } = await chamar({ 'x-hicd-host': HB });
    assert.strictEqual(passou, false);
    assert.strictEqual(res.statusCode, 401);
});

test('requireCrawler devolve 401 com token que não decifra', async () => {
    await sharedCrawler.initCrawler('cristiano sousa', 'certa', HB);
    const { passou, res } = await chamar({ 'x-hicd-host': HB, authorization: 'lixo' });
    assert.strictEqual(passou, false);
    assert.strictEqual(res.statusCode, 401);
});

// ============ Item 2: mesmo token reusa a sessão ============

test('mesmo token reusa a sessão sem novo login', async () => {
    const t = token('cristiano sousa:certa');
    const a = await chamar({ 'x-hicd-host': HB, authorization: t });
    const b = await chamar({ 'x-hicd-host': HB, authorization: `Bearer ${t}` });
    assert.strictEqual(a.passou, true);
    assert.strictEqual(b.passou, true);
    assert.deepStrictEqual(logins, ['cristiano sousa']);
});

// ============ Item 3: credencial diferente ============

test('token com senha errada → 401 e a sessão boa continua', async () => {
    await sharedCrawler.initCrawler('cristiano sousa', 'certa', HB);
    const { passou, res } = await chamar({ 'x-hicd-host': HB, authorization: token('cristiano sousa:errada') });
    assert.strictEqual(passou, false);
    assert.strictEqual(res.statusCode, 401);

    // Regressão: initCrawler apagava a instância antes de tentar o login.
    assert.strictEqual(sharedCrawler.isReady(HB), true);
    assert.strictEqual(sharedCrawler.matches(HB, 'cristiano sousa', 'certa'), true);
});

test('token de outro usuário válido não reusa a sessão alheia', async () => {
    await sharedCrawler.initCrawler('cristiano sousa', 'certa', HB);
    assert.strictEqual(sharedCrawler.matches(HB, 'cristiano', 'certa'), false);
    assert.strictEqual(sharedCrawler.matches(HB, 'cristiano sousa', 'outra'), false);
});

test('sessão é por host: token certo no HB não vale para o HICD sem login', async () => {
    await sharedCrawler.initCrawler('cristiano sousa', 'certa', HB);
    assert.strictEqual(sharedCrawler.matches('hicd-hospub.sesau.ro.gov.br', 'cristiano sousa', 'certa'), false);
});

// ============ Item 4: detectores ============

test('extrairErroLogin lê o alert de usuário inexistente', () => {
    const html = "<script>alert('Usuario Nao Existe (cristiano)!');window.location='';</script>";
    assert.match(extrairErroLogin(html), /Usuario Nao Existe \(cristiano\)/);
});

test('extrairErroLogin não acusa o redirecionamento de sucesso', () => {
    assert.strictEqual(extrairErroLogin("<script>window.location='';</script>"), null);
    assert.strictEqual(extrairErroLogin(''), null);
    assert.strictEqual(extrairErroLogin(undefined), null);
});

test('isUsuarioNaoLogado reconhece a resposta de 25 bytes do REGE', () => {
    assert.strictEqual(isUsuarioNaoLogado('Usuario nao esta logado'), true);
    assert.strictEqual(isUsuarioNaoLogado('<div class="row">Profissional: X</div>'), false);
});

// ============ Item 5: auth-service ============

function fakeHttpClient(respostaLogin) {
    return {
        origin: 'https://hb-hospub.sesau.ro.gov.br',
        cookies: [],
        getUrls: () => ({ index: 'idx', login: 'ctrl' }),
        get: async () => ({ status: 200, headers: {}, data: '' }),
        post: async () => ({ status: 200, headers: {}, data: respostaLogin }),
        updateCookies() {},
        setCookies() {}
    };
}

test('attemptLogin recusa HTTP 200 com alert de usuário inexistente', async () => {
    const svc = new HICDAuthService(
        fakeHttpClient("<script>alert('Usuario Nao Existe (cristiano)!')</script>"), 'cristiano', 'x');
    const r = await svc.attemptLogin();
    assert.strictEqual(r.success, false);
    assert.match(r.message, /Usuario Nao Existe/);
});

test('attemptLogin aceita o redirecionamento de sucesso', async () => {
    const svc = new HICDAuthService(
        fakeHttpClient("<script>window.location='';</script>"), 'cristiano sousa', 'x');
    const r = await svc.attemptLogin();
    assert.strictEqual(r.success, true);
});

// ============ Item 6: evolution-service ============

test('getEvolucoes lança HICD_USUARIO_NAO_LOGADO em vez de devolver []', async () => {
    const http = {
        getUrls: () => ({ login: 'ctrl' }),
        post: async () => ({ data: 'Usuario nao esta logado' })
    };
    const parser = { parseEvolucoes: () => [] };
    const svc = new EvolutionService(http, parser);
    await assert.rejects(svc.getEvolucoes('581004'), { code: 'HICD_USUARIO_NAO_LOGADO' });
});

test('getEvolucoes continua devolvendo [] para paciente realmente sem evolução', async () => {
    const http = {
        getUrls: () => ({ login: 'ctrl' }),
        post: async () => ({ data: '<html></html>' })
    };
    const svc = new EvolutionService(http, { parseEvolucoes: () => [] });
    assert.deepStrictEqual(await svc.getEvolucoes('1'), []);
});
