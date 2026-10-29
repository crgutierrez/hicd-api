#!/usr/bin/env python3
"""Acrescenta classificações lidas à mão ao docs/classificacao_cardiologica.csv.

Lê um JSON {prontuario: {cardiopatia_congenita, classe, dx_cardio, momento_dx,
comorbidades}} e grava com origem_classificacao='manual'. Nunca sobrescreve
linha existente sem --forcar.
"""
import argparse, csv, io, json, sys
csv.field_size_limit(10 ** 9)
CSV = 'docs/classificacao_cardiologica.csv'

ap = argparse.ArgumentParser()
ap.add_argument('entrada')
ap.add_argument('--forcar', action='store_true')
a = ap.parse_args()

novos = json.load(open(a.entrada, encoding='utf-8'))
rows = list(csv.DictReader(open(CSV, encoding='utf-8')))
campos = list(rows[0].keys())
existe = {r['prontuario'] for r in rows}

add = pulou = 0
for p, v in novos.items():
    if p in existe and not a.forcar:
        print(f'  já existe, pulei: {p}'); pulou += 1; continue
    linha = {c: '' for c in campos}
    linha.update(prontuario=p,
                 cardiopatia_congenita=v['cardiopatia_congenita'],
                 classe=v.get('classe', ''),
                 dx_cardio=v.get('dx_cardio', ''),
                 momento_dx=v.get('momento_dx', ''),
                 comorbidades=v.get('comorbidades', ''),
                 origem_classificacao='manual')
    if p in existe:
        for r in rows:
            if r['prontuario'] == p: r.update(linha)
    else:
        rows.append(linha)
    add += 1

buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=campos)
w.writeheader(); w.writerows(rows)
open(CSV, 'w', encoding='utf-8').write(buf.getvalue())
import collections
c = collections.Counter(r['cardiopatia_congenita'] for r in rows)
print(f'{add} gravados, {pulou} pulados | total {len(rows)}')
print('  ', dict(c))
