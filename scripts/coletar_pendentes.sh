#!/usr/bin/env bash
# Coleta os prontuários pendentes do estudo, em lotes, com retomada.
#
# Só entra na fila registro que o resolver_prontuarios.js confirmou (Lei 1):
# coleta que não confirma identidade é coleta falhada, não parcial.
#
# Uso: setsid nohup bash scripts/coletar_pendentes.sh > output/epidemio/coleta.log 2>&1 &
set -u
cd "$(dirname "$0")/.."
LOTE=${LOTE:-20}

while :; do
  PEND=$(python3 - <<'PY'
import json, glob, os
mapa=json.load(open('output/epidemio/registro_para_prontuario.json'))
def valido(p):
    f=f'output/epidemio/raw_{p}.json'
    if not os.path.exists(f): return False
    try: d=json.load(open(f))
    except Exception: return False
    return bool((d.get('cadastro') or {}).get('dadosBasicos',{}).get('nome'))
falta=[r for r,v in mapa.items() if v.get('resolvido') and not valido(r)]
print(','.join(falta))
PY
)
  if [ -z "$PEND" ]; then echo "=== FILA VAZIA — coleta completa ==="; break; fi
  TOTAL=$(echo "$PEND" | tr ',' '\n' | grep -c .)
  BATCH=$(echo "$PEND" | tr ',' '\n' | head -n "$LOTE" | paste -sd,)
  echo "=== $(date +%H:%M:%S) pendentes=$TOTAL — coletando lote de $(echo "$BATCH" | tr ',' '\n' | grep -c .) ==="
  timeout 1800 node scripts/coleta_epidemio.js --prontuarios "$BATCH" 2>&1 | grep -E "^[0-9]+: |Erro|erro" || true
done

echo "=== reprocessando desfecho e óbito pelo serviço (Lei 3) ==="
node scripts/reprocessar_desfecho.js --gravar 2>&1 | tail -12
echo "=== triagem sobre tudo que foi coletado ==="
python3 scripts/triagem_cardiopatia.py --coletados 2>&1 | tail -4
echo "=== classificação automática (só AUTO-NAO sem leitura manual) ==="
python3 scripts/classificar_auto.py 2>&1 | tail -4
echo "=== datasets ==="
python3 scripts/dataset_epidemio.py 2>&1 | tail -3
echo "=== FIM $(date +%F\ %H:%M:%S) ==="
