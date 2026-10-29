#!/usr/bin/env bash
# Coleta os prontuários achados pela varredura por termo (decisão de 20/09/2026:
# ler os 54 e manter a palavra "totalidade" no §1.6.2 do protocolo).
set -u
cd "$(dirname "$0")/.."
while :; do
  PEND=$(python3 - <<'PY'
import json, os
alvos=open('output/epidemio/alvos_varredura.txt').read().split(',')
def ok(p):
    f=f'output/epidemio/raw_{p}.json'
    if not os.path.exists(f): return False
    try: d=json.load(open(f))
    except Exception: return False
    return bool((d.get('cadastro') or {}).get('dadosBasicos',{}).get('nome'))
print(','.join(p for p in alvos if not ok(p)))
PY
)
  [ -z "$PEND" ] && { echo "=== FILA VAZIA ==="; break; }
  N=$(echo "$PEND" | tr ',' '\n' | grep -c .)
  B=$(echo "$PEND" | tr ',' '\n' | head -15 | paste -sd,)
  echo "=== $(date +%H:%M:%S) pendentes=$N ==="
  timeout 1500 node scripts/coleta_epidemio.js --prontuarios "$B" 2>&1 | grep -E "^[0-9]+: " || true
done
echo "=== FIM $(date +%H:%M:%S) ==="
