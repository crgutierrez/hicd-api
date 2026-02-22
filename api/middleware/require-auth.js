/**
 * Middleware que garante que o crawler está autenticado antes de processar a requisição.
 *
 * Fluxo:
 *   1. Se o crawler já está pronto → prossegue normalmente.
 *   2. Se não está pronto → tenta auto-login via header Authorization.
 *      O header deve conter o mesmo payload criptografado do endpoint POST /api/auth/login.
 *      Formato: Authorization: <base64(IV + AUTH_TAG + CIPHERTEXT)>
 *               Authorization: Bearer <base64(IV + AUTH_TAG + CIPHERTEXT)>
 *   3. Se o header não existir ou as credenciais forem inválidas → 401/503.
 */

const crypto = require('crypto');
const sharedCrawler = require('../shared-crawler');

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function decrypt(payloadBase64) {
    const hex = process.env.LOGIN_ENCRYPT_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('LOGIN_ENCRYPT_KEY não configurada');
    }

    const key = Buffer.from(hex, 'hex');
    const buf = Buffer.from(payloadBase64, 'base64');

    if (buf.length <= IV_LEN + TAG_LEN) {
        throw new Error('Payload muito curto');
    }

    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN + TAG_LEN);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function requireCrawler(req, res, next) {
    if (sharedCrawler.isReady()) {
        return next();
    }

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(503).json({
            success: false,
            error: 'Serviço não disponível',
            message: 'O sistema não está autenticado. Envie o header Authorization ou faça login via POST /api/auth/login'
        });
    }

    // Aceita "Bearer <payload>" ou o payload direto
    const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    let decrypted;
    try {
        decrypted = decrypt(raw);
    } catch {
        return res.status(401).json({
            success: false,
            error: 'Header inválido',
            message: 'Não foi possível descriptografar o header Authorization'
        });
    }

    const colonIndex = decrypted.indexOf(':');
    if (colonIndex === -1 || !decrypted.substring(0, colonIndex) || !decrypted.substring(colonIndex + 1)) {
        return res.status(401).json({
            success: false,
            error: 'Formato inválido',
            message: 'O header Authorization descriptografado deve ter o formato "login:senha"'
        });
    }

    const username = decrypted.substring(0, colonIndex);
    const password = decrypted.substring(colonIndex + 1);

    console.log(`[AUTH-MIDDLEWARE] Auto-login via Authorization header para o usuário: ${username}`);

    const result = await sharedCrawler.initCrawler(username, password);

    if (result.success) {
        return next();
    }

    return res.status(401).json({
        success: false,
        error: 'Falha na autenticação',
        message: result.message || 'Credenciais inválidas ou sistema HICD indisponível'
    });
}

module.exports = { requireCrawler };
