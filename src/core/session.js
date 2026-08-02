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

// Página anônima/deslogada do HICD sempre carrega o marcador "ANONYMOUS".
const ANONYMOUS_RE = /ANONYMOUS/i;

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

module.exports = { isSessionExpiredHtml, sessionExpiredError };
