/**
 * Controller de autenticação.
 *
 * Fluxo:
 *   1. Cliente envia { payload: "<base64>" } no body.
 *   2. O payload é descriptografado com AES-256-GCM usando LOGIN_ENCRYPT_KEY.
 *   3. O texto resultante deve ter o formato "login:senha".
 *   4. O crawler é inicializado com essas credenciais.
 *   5. Retorna sucesso ou falha.
 *
 * Formato do payload (base64 de buffer binário):
 *   [ IV (12 bytes) | AUTH_TAG (16 bytes) | CIPHERTEXT (N bytes) ]
 *
 * Gerar uma chave válida:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Definir no .env:
 *   LOGIN_ENCRYPT_KEY=<64 caracteres hex>
 */

const crypto = require('crypto');
const sharedCrawler = require('../shared-crawler');

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey() {
    const hex = process.env.LOGIN_ENCRYPT_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('LOGIN_ENCRYPT_KEY não configurada ou inválida (deve ter 64 caracteres hex)');
    }
    return Buffer.from(hex, 'hex');
}

function decrypt(payloadBase64) {
    const key = getKey();
    const buf = Buffer.from(payloadBase64, 'base64');

    if (buf.length <= IV_LEN + TAG_LEN) {
        throw new Error('Payload criptografado muito curto');
    }

    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN + TAG_LEN);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

class AuthController {
    async login(req, res) {
        try {
            const { payload } = req.body;

            if (!payload || typeof payload !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Payload obrigatório',
                    message: 'O campo "payload" com a string criptografada é obrigatório'
                });
            }

            let decrypted;
            try {
                decrypted = decrypt(payload);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Falha na descriptografia',
                    message: 'Não foi possível descriptografar o payload. Verifique a chave e o formato.'
                });
            }

            const colonIndex = decrypted.indexOf(':');
            if (colonIndex === -1) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato inválido',
                    message: 'O payload descriptografado deve ter o formato "login:senha"'
                });
            }

            const username = decrypted.substring(0, colonIndex);
            const password = decrypted.substring(colonIndex + 1);

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Credenciais inválidas',
                    message: 'Login e senha não podem estar vazios'
                });
            }

            console.log(`[AUTH] Iniciando crawler para o usuário: ${username}`);

            const result = await sharedCrawler.initCrawler(username, password);

            if (result.success) {
                return res.json({
                    success: true,
                    message: 'Login realizado com sucesso'
                });
            }

            return res.status(401).json({
                success: false,
                error: 'Falha na autenticação',
                message: result.message || 'Credenciais inválidas ou sistema HICD indisponível'
            });

        } catch (error) {
            console.error('[AUTH] Erro no login:', error.message);
            res.status(500).json({
                success: false,
                error: 'Erro interno',
                message: error.message
            });
        }
    }

    status(req, res) {
        res.json({
            success: true,
            authenticated: sharedCrawler.isReady()
        });
    }
}

module.exports = new AuthController();
