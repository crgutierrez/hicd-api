#!/usr/bin/env node
/**
 * Gera o payload criptografado para uso no endpoint POST /api/auth/login.
 *
 * Uso:
 *   node payload.js                      → criptografa "login:senha" (padrão)
 *   node payload.js usuario minhaSenha   → criptografa "usuario:minhaSenha"
 *
 * O payload gerado deve ser enviado no campo "payload" do body JSON.
 */

require('dotenv').config();
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const KEY_HEX = process.env.LOGIN_ENCRYPT_KEY;

if (!KEY_HEX || KEY_HEX.length !== 64) {
    console.error('Erro: LOGIN_ENCRYPT_KEY não configurada ou inválida no .env (deve ter 64 chars hex).');
    process.exit(1);
}

const key = Buffer.from(KEY_HEX, 'hex');

// Credenciais: argumentos da linha de comando ou padrão
const username = process.argv[2] || 'login';
const password = process.argv[3] || 'senha';
const plaintext = `${username}:${password}`;

// Criptografar
const iv = crypto.randomBytes(IV_LEN);
const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

// Formato: IV (12 bytes) | AUTH_TAG (16 bytes) | CIPHERTEXT
const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');

console.log('\n--- PAYLOAD GERADO ---');
console.log(`Texto original  : ${plaintext}`);
console.log(`Payload (base64): ${payload}`);
console.log('\nExemplo de uso com curl:');
console.log(`curl -s -X POST http://localhost:3000/api/auth/login \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"payload":"${payload}"}'`);
