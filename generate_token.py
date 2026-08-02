#!/usr/bin/env python3
"""
Gera o token de autorização da API HICD a partir do .env.

Formato (idêntico ao one-liner Node do CLAUDE.md):
    base64( iv[12] + authTag[16] + ciphertext )  usando AES-256-GCM

A chave vem de LOGIN_ENCRYPT_KEY (32 bytes em hex = 64 chars).
O texto cifrado é "usuario:senha".

Uso:
    python generate_token.py                 # usa HICD_USERNAME/HICD_PASSWORD do .env
    python generate_token.py USER SENHA      # sobrescreve usuario/senha

Requer: pip install cryptography
"""
import os
import sys
import base64

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def carregar_env(caminho=".env"):
    """Carrega pares KEY=VALUE do .env sem dependência externa (python-dotenv opcional)."""
    env = {}
    if not os.path.exists(caminho):
        return env
    with open(caminho, "r", encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            env[chave.strip()] = valor.strip().strip('"').strip("'")
    return env


def gerar_token(chave_hex, usuario, senha):
    key = bytes.fromhex(chave_hex)
    if len(key) != 32:
        raise ValueError(
            f"LOGIN_ENCRYPT_KEY deve ter 32 bytes (64 hex chars); tem {len(key)} bytes."
        )
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    texto = f"{usuario}:{senha}".encode("utf-8")
    # cryptography devolve ciphertext + tag (16 bytes) concatenados
    ct_mais_tag = aesgcm.encrypt(iv, texto, None)
    ciphertext, tag = ct_mais_tag[:-16], ct_mais_tag[-16:]
    # Node monta como: iv + tag + ciphertext
    return base64.b64encode(iv + tag + ciphertext).decode("ascii")


def main():
    env = carregar_env()
    # variáveis de ambiente reais têm precedência sobre o .env
    chave = os.environ.get("LOGIN_ENCRYPT_KEY") or env.get("LOGIN_ENCRYPT_KEY")
    if not chave:
        sys.exit("Erro: LOGIN_ENCRYPT_KEY ausente no .env e no ambiente.")

    if len(sys.argv) >= 3:
        usuario, senha = sys.argv[1], sys.argv[2]
    else:
        usuario = os.environ.get("HICD_USERNAME") or env.get("HICD_USERNAME")
        senha = os.environ.get("HICD_PASSWORD") or env.get("HICD_PASSWORD")
        if not usuario or not senha:
            sys.exit(
                "Erro: informe usuario e senha como argumentos ou defina "
                "HICD_USERNAME/HICD_PASSWORD no .env."
            )

    print(gerar_token(chave, usuario, senha))


if __name__ == "__main__":
    main()
