#!/usr/bin/env python3
"""Vista de leitura dos achados da varredura por termo.

Estes pacientes, em sua maioria, NÃO têm evolução de cardiologista — é
justamente por isso que escaparam do marco amostral. A evidência vem do
trecho que disparou o termo na varredura, somado às hipóteses diagnósticas.

Uso: ver_54.py INICIO FIM
"""
import json, sys
lim = json.load(open('output/epidemio/varredura_termos_limpa.json'))
dig = json.load(open('output/epidemio/digesto_54.json'))
ks = [k for k in open('output/epidemio/alvos_varredura.txt').read().split(',')]
a, b = int(sys.argv[1]), int(sys.argv[2])
for k in ks[a:b]:
    v = dig.get(k, {})
    print(f"\n{'='*86}\n### {k} | {v.get('nome')} | {v.get('sexo')} | nasc {v.get('nascimento')} | {v.get('n_evolucoes')} evo")
    print("  TERMOS:", ', '.join(lim[k]['termos']))
    for t, e in lim[k]['evidencia'].items():
        print(f"    [{t}] {e[:200]}")
    if v.get('hipoteses'):
        print("  HIPOT:", ' ; '.join(v['hipoteses'])[:300])
    for n in v.get('notas_cardio', [])[:2]:
        print(f"  [CARDIO {n['data']} {n['prof'][:20]}] {n['texto'][:350]}")
