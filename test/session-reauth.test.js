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

// Página de laudo VÁLIDA que carrega jQuery com crossorigin="anonymous".
// Regressão: com o regex /ANONYMOUS/i, o "anonymous" (minúsculo) do atributo
// casava e marcava TODA página de exame como sessão expirada → re-login em 100%
// dos laudos. O marcador real é MAIÚSCULO; o detector agora é case-sensitive.
const LAUDO_COM_CROSSORIGIN = `<html><body>
  <table class="table1"><tr id="HB"><td>Hemoglobina</td><td>Resultado--------> 12,3 g/dL</td></tr></table>
  <script src="jquery-3.6.0.js" crossorigin="anonymous"></script>
</body></html>`;

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

test('isSessionExpiredHtml NÃO confunde crossorigin="anonymous" com sessão expirada', () => {
    // Regressão: /ANONYMOUS/i casava o atributo minúsculo do jQuery presente em
    // toda página de laudo, disparando re-login desnecessário em 100% dos exames.
    assert.strictEqual(isSessionExpiredHtml(LAUDO_COM_CROSSORIGIN), false);
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

test('single-flight: N requisições concorrentes expiradas disparam UM só re-login', async () => {
    // Sob concorrência (pool de exames), várias respostas anônimas chegam quase
    // juntas. Sem guarda, cada uma chamaria login() → PHPSESSIDs conflitantes.
    // O single-flight garante um único re-login compartilhado.
    const c = new HICDHttpClient();
    let expirada = true;
    let loginChamado = 0;
    c.client = {
        get: async () => ({ data: expirada ? ANON : DADOS }),
        post: async () => ({ data: expirada ? ANON : DADOS })
    };
    c.onSessionExpired = async () => {
        loginChamado++;
        await new Promise(r => setTimeout(r, 20)); // login leva um tempo
        expirada = false;
    };

    const resultados = await Promise.all([
        c.get('u'), c.get('u'), c.get('u'), c.get('u'), c.get('u')
    ]);
    assert.strictEqual(loginChamado, 1, 'apenas um re-login para todas as concorrentes');
    for (const r of resultados) assert.match(r.data, /<select/, 'todas recuperam os dados');
});

test('authPhase ativo (login em curso): não dispara detecção', async () => {
    const c = new HICDHttpClient();
    c.authPhase = true;
    c.client = { post: async () => ({ data: ANON }), get: async () => ({ data: ANON }) };
    const r = await c.post('u', {});
    assert.strictEqual(r.data, ANON, 'durante o login a página anônima é normal e não deve lançar');
});
