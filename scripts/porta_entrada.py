#!/usr/bin/env python3
"""Deriva a PORTA DE ENTRADA de cada internação a partir das evoluções.

Por que não usar só o módulo Inter: ele registra **um** setor por internação,
mas 56% das internações passam por dois ou mais setores segundo as evoluções.
O setor do Inter costuma ser onde o paciente ficou, não por onde entrou.

A data de entrada, essa sim, vem do Inter — é mais confiável que a DIH escrita
nas evoluções, que tem erro de ano (divergências de exatamente 365/366 dias) e
cabeçalho copiado de internação anterior.

Escreve `output/epidemio/porta_entrada.csv`.

Uso: python3 scripts/porta_entrada.py [--out output/epidemio]
"""
import argparse, csv, glob, json, os, re
from collections import Counter
from datetime import datetime

# Setores que funcionam como porta de entrada do hospital.
PORTAS = {
    '001': 'Emergência', '002': 'CIP', '003': 'UIR', '004': 'UIR', '005': 'UIR',
    '019': 'Observação / Hospital Dia', '020': 'Sala de procedimento',
}


def dt(s):
    try:
        return datetime.strptime(str(s).strip()[:16], '%d/%m/%Y %H:%M')
    except (ValueError, TypeError):
        return None


def codigo_e_nome(clinica_leito):
    m = re.match(r'^(\d{3})-(.+)$', (clinica_leito or '').strip())
    return (m.group(1), m.group(2).strip()) if m else (None, None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='output/epidemio')
    args = ap.parse_args()

    linhas = []
    for caminho in sorted(glob.glob(os.path.join(args.out, 'raw_*.json'))):
        with open(caminho, encoding='utf-8') as fh:
            d = json.load(fh)
        evs, ints = d.get('evolucoes'), d.get('internacoes')
        if not isinstance(evs, list) or not isinstance(ints, list):
            continue

        for i in ints:
            ent, sai = dt(i.get('entrada')), dt(i.get('saida'))
            if not ent:
                continue
            dentro = sorted(
                (e for e in evs if dt(e.get('data')) and ent <= dt(e['data']) <= (sai or datetime(2100, 1, 1))),
                key=lambda e: dt(e['data']))

            setores = [codigo_e_nome(e.get('clinicaLeito')) for e in dentro]
            setores = [s for s in setores if s[0]]
            primeiro = setores[0] if setores else (None, None)
            distintos = list(dict.fromkeys(s[0] for s in setores))

            linhas.append(dict(
                prontuario=d['prontuario'],
                entrada=i.get('entrada'),
                saida=i.get('saida'),
                setor_inter=i.get('setor'),
                setor_codigo_inter=None,
                setor_primeira_evolucao=primeiro[1],
                codigo_primeira_evolucao=primeiro[0],
                porta_de_entrada=PORTAS.get(primeiro[0], 'Direto em enfermaria/UTI' if primeiro[0] else 'Indeterminado'),
                entrou_pela_emergencia='Sim' if primeiro[0] in ('001', '002') else ('Não' if primeiro[0] else ''),
                n_setores_na_internacao=len(distintos),
                trajetoria_na_internacao=' → '.join(
                    dict.fromkeys(s[1] for s in setores)),
                horas_ate_1a_evolucao=(round((dt(dentro[0]['data']) - ent).total_seconds() / 3600, 1)
                                       if dentro else None),
                n_evolucoes_na_internacao=len(dentro),
            ))

    caminho = os.path.join(args.out, 'porta_entrada.csv')
    cols = list(linhas[0].keys())
    with open(caminho, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(linhas)

    com = [l for l in linhas if l['codigo_primeira_evolucao']]
    print(f'{len(linhas)} internações -> {caminho}')
    print(f'  com evolução no período: {len(com)} ({round(100*len(com)/len(linhas))}%)')
    print('  PORTA DE ENTRADA:')
    for k, v in Counter(l['porta_de_entrada'] for l in com).most_common():
        print(f'    {k:30s} {v:4d} ({round(100*v/len(com))}%)')
    print('  SETORES POR INTERNAÇÃO:')
    for k, v in sorted(Counter(l['n_setores_na_internacao'] for l in com).items()):
        print(f'    {k} setor(es): {v}')
    div = sum(1 for l in com if l['setor_primeira_evolucao'] and l['setor_inter']
              and l['setor_primeira_evolucao'].upper() != l['setor_inter'].upper())
    print(f'  setor do Inter ≠ setor de entrada real: {div} ({round(100*div/len(com))}%)')


if __name__ == '__main__':
    main()
