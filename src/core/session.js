/**
 * Detecção de sessão HICD expirada.
 *
 * Quando o cookie de sessão morre no servidor HICD, as requisições de dados
 * (Param=SIGHO, Evo, Exames, Prescricao...) deixam de retornar o HTML esperado
 * e passam a devolver a página inicial/anônima de login. O parser não encontra
 * os dados e retorna vazio silenciosamente (HTTP 200 com data: []).
 *
 * Este módulo reconhece essa página para que o http-client possa disparar um
 * re-login automático em vez de entregar dados vazios.
 *
 * O sinal principal ("ANONYMOUS") é o mesmo que o auth-service já usa em
 * verifyLogin() como indicador de NÃO-autenticado.
 */

// Página anônima/deslogada do HICD sempre carrega o marcador "ANONYMOUS"
// (MAIÚSCULO) — o mesmo que verifyLogin() checa via body.text().includes('ANONYMOUS').
// IMPORTANTE: case-SENSITIVE de propósito. Com a flag /i, o regex casava o
// atributo `crossorigin="anonymous"` das tags <script> do jQuery presentes em
// TODA página de impressão de exame — falso-positivo que disparava re-login
// desnecessário em 100% dos laudos. O atributo é sempre minúsculo; o marcador
// real é sempre MAIÚSCULO, então exigir o case elimina a colisão.
const ANONYMOUS_RE = /ANONYMOUS/;

// Quando o PHPSESSID expira, o controller.php responde HTTP 200 com uma pequena
// página de aviso — SEM "ANONYMOUS" e SEM form de login. Capturada em produção:
//   <h2>Sess&atilde;o Expirada!</h2> ... <div ...>Login expirado!</div>
// O ã vem como entidade HTML (&atilde;), por isso o regex tolera ambas as formas.
const SESSAO_EXPIRADA_RE = /Sess(?:ã|&atilde;)o\s+Expirada|Login\s+expirado/i;

// Fallback: formulário de login (campos user+pass do controller.php).
const LOGIN_FORM_RE = /Param["']?\s*[:=]\s*["']?LOGIN/i;

/**
 * Indica se o HTML recebido é a página de sessão expirada/login do HICD.
 * @param {*} data - corpo da resposta (só strings HTML são avaliadas).
 * @returns {boolean}
 */
function isSessionExpiredHtml(data) {
    if (typeof data !== 'string' || data.length === 0) return false;
    if (ANONYMOUS_RE.test(data)) return true;
    if (SESSAO_EXPIRADA_RE.test(data)) return true;
    // Login form só conta se NÃO houver o <select> de clínicas nem grade de dados,
    // para evitar falso-positivo em páginas que citem "LOGIN" legitimamente.
    if (LOGIN_FORM_RE.test(data) && !/<select\b/i.test(data)) return true;
    return false;
}

/**
 * Cria um erro tipado de sessão expirada (code = 'SESSION_EXPIRED').
 * @param {string} [message]
 * @returns {Error}
 */
function sessionExpiredError(message = 'Sessão HICD expirada e não pôde ser renovada') {
    const err = new Error(message);
    err.code = 'SESSION_EXPIRED';
    return err;
}

// Login recusado: o controller.php responde HTTP 200 com um alert() em vez do
// redirecionamento de sucesso (`<script>window.location='';</script>`).
// Capturado no HB: alert('Usuario Nao Existe (cristiano)!...').
const LOGIN_ALERT_RE = /alert\s*\(\s*(['"])([\s\S]*?)\1\s*\)/i;

/**
 * Extrai a mensagem de erro de uma resposta de login recusada.
 * @param {*} data - corpo da resposta do POST de login.
 * @returns {string|null} a mensagem do alert(), ou null se não houver recusa.
 */
function extrairErroLogin(data) {
    if (typeof data !== 'string') return null;
    const m = data.match(LOGIN_ALERT_RE);
    return m ? (m[2].trim() || 'login recusado pelo HICD') : null;
}

// Com login leniente (usuário inexistente mas cookie de sessão válido), clínicas
// e prescrições respondem, e o módulo de evoluções (Param=REGE) devolve só isto
// (25 bytes). Sem o detector o parser lê 0 evoluções e o paciente parece vazio.
const USUARIO_NAO_LOGADO_RE = /Usu[aá]rio\s+n[aã]o\s+est[aá]\s+logado/i;

/**
 * Indica se a resposta é o aviso "Usuario nao esta logado" do HICD.
 * @param {*} data
 * @returns {boolean}
 */
function isUsuarioNaoLogado(data) {
    return typeof data === 'string' && USUARIO_NAO_LOGADO_RE.test(data);
}

/**
 * Erro tipado para "Usuario nao esta logado" (code = 'HICD_USUARIO_NAO_LOGADO').
 * @returns {Error}
 */
function usuarioNaoLogadoError() {
    const err = new Error('HICD respondeu "Usuario nao esta logado": a sessão foi aberta com usuário inválido');
    err.code = 'HICD_USUARIO_NAO_LOGADO';
    return err;
}

module.exports = {
    isSessionExpiredHtml,
    sessionExpiredError,
    extrairErroLogin,
    isUsuarioNaoLogado,
    usuarioNaoLogadoError
};
