/**
 * Testes da auto-cura de sessão HICD expirada.
 *
 * Contexto: a sessão do HICD morre no servidor "depois de um tempo". Antes deste
 * mecanismo, o crawler seguia achando que estava logado (isReady eterno), as
 * requisições retornavam a página anônima e o parser devolvia [] com HTTP 200.
 *
 * Cobre:
 *  1. isSessionExpiredHtml — detecção da página anônima vs. página de dados
 *  2. http-client — sessão viva passa direto
 *  3. http-client — expira → onSessionExpired() (re-login) → retenta 1x → recupera
 *  4. http-client — expiração persistente → lança erro tipado SESSION_EXPIRED (sem loop)
 *  5. http-client — authPhase ativo (login em curso) não dispara detecção
 *
 * Runner: node --test (Node >= 18). Sem dependências externas nem rede.
 */
const { test } = require('node:test');
const assert = require('node:assert');

const { isSessionExpiredHtml, sessionExpiredError } = require('../src/core/session');
const HICDHttpClient = require('../src/core/http-client');

const ANON = '<html><body>Sessão: ANONYMOUS</body></html>';
const DADOS = '<select id="clinica"><option value="007">U T I</option></select>';

// Página real servida pelo controller.php quando o PHPSESSID expira (HTTP 200).
// Capturada em produção: NÃO contém "ANONYMOUS" nem form "Param=LOGIN" — só o
// aviso "Sessão Expirada!" / "Login expirado!" (com o ã como entidade HTML).
const SESSAO_EXPIRADA = `<html lang="en"><head><title>TITLE_APP</title></head>
<body style="text-align:center;">
  <div class="alert alert-danger">
    <h2>Sess&atilde;o Expirada!</h2>
    <a href="http://hicd-hospub.sesau.ro.gov.br/index.php" class="alert-link">Clique aqui para Reiniciar</a>
    <div id="show_erro" style="display:none;">Login expirado!</div>
  </div>
</body></html>`;

// ============ Item 1: detector ============

test('isSessionExpiredHtml reconhece a página anônima', () => {
    assert.strictEqual(isSessionExpiredHtml(ANON), true);
});

test('isSessionExpiredHtml reconhece a página "Sessão Expirada!" (PHPSESSID morto)', () => {
    // Regressão: essa página não tem "ANONYMOUS" nem "Param=LOGIN", então antes
    // passava batido e o endpoint de clínicas devolvia 0 resultados sem re-login.
    assert.strictEqual(isSessionExpiredHtml(SESSAO_EXPIRADA), true);
});

test('isSessionExpiredHtml ignora página de dados e entradas não-string', () => {
    assert.strictEqual(isSessionExpiredHtml(DADOS), false);
    assert.strictEqual(isSessionExpiredHtml(''), false);
    assert.strictEqual(isSessionExpiredHtml(null), false);
    assert.strictEqual(isSessionExpiredHtml({}), false);
});

test('sessionExpiredError carrega code SESSION_EXPIRED', () => {
    assert.strictEqual(sessionExpiredError().code, 'SESSION_EXPIRED');
});

// ============ Itens 2-5: http-client ============

test('sessão viva: resposta passa sem interferência', async () => {
    const c = new HICDHttpClient();
    c.client = { post: async () => ({ data: DADOS }), get: async () => ({ data: DADOS }) };
    const r = await c.post('u', {});
    assert.match(r.data, /<select/);
});

test('sessão expirada: auto-cura via re-login e retenta uma vez', async () => {
    const c = new HICDHttpClient();
    let expirada = true;
    let loginChamado = 0;
    c.client = { post: async () => ({ data: expirada ? ANON : DADOS }), get: async () => ({ data: DADOS }) };
    c.onSessionExpired = async () => { loginChamado++; expirada = false; };

    const r = await c.post('u', {});
    assert.strictEqual(loginChamado, 1, 'login deve ser refeito exatamente uma vez');
    assert.match(r.data, /<select/, 'após o re-login deve recuperar os dados');
});

test('expiração persistente: lança SESSION_EXPIRED sem loop', async () => {
    const c = new HICDHttpClient();
    let loginChamado = 0;
    c.client = { post: async () => ({ data: ANON }), get: async () => ({ data: ANON }) };
    c.onSessionExpired = async () => { loginChamado++; /* login não resolve */ };

    await assert.rejects(() => c.post('u', {}), (e) => e.code === 'SESSION_EXPIRED');
    assert.strictEqual(loginChamado, 1, 'deve tentar re-login só uma vez (guarda anti-loop)');
});

test('sem handler onSessionExpired: expiração lança erro tipado direto', async () => {
    const c = new HICDHttpClient();
    c.client = { post: async () => ({ data: ANON }), get: async () => ({ data: ANON }) };
    await assert.rejects(() => c.post('u', {}), (e) => e.code === 'SESSION_EXPIRED');
});

test('authPhase ativo (login em curso): não dispara detecção', async () => {
    const c = new HICDHttpClient();
    c.authPhase = true;
    c.client = { post: async () => ({ data: ANON }), get: async () => ({ data: ANON }) };
    const r = await c.post('u', {});
    assert.strictEqual(r.data, ANON, 'durante o login a página anônima é normal e não deve lançar');
});
