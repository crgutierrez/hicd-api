#!/usr/bin/env python3
"""Extrai, de cada prontuário pendente, só o que decide a classificação.

Leitura à mão de 189 prontuários é inviável se cada um tiver 200 evoluções com
o texto da admissão recopiado todo dia. Este script reduz cada prontuário a:
  - conclusões de ecocardiograma (deduplicadas)
  - evoluções de cardiologista, deduplicadas pelo início do texto
  - hipóteses diagnósticas com termo cardiológico

Uso: python3 scripts/digesto_pendentes.py [--lista output/epidemio/pendentes.txt]
"""
import argparse, csv, glob, html, json, os, re, sys
from collections import OrderedDict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from triagem_cardiopatia import fontes_do_prontuario, limpar, TERMOS

csv.field_size_limit(10 ** 9)


def conclusoes(texto):
    out = []
    for linha in texto.split('\n'):
        linha = linha.strip()
        if re.match(r'conclus[ãa]o\s*:', linha, re.I):
            out.append(re.sub(r'^conclus[ãa]o\s*:\s*', '', linha, flags=re.I).strip(' .'))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lista', default='output/epidemio/pendentes.txt')
    ap.add_argument('--out', default='output/epidemio/digesto_pendentes.json')
    args = ap.parse_args()

    alvos = [l.strip() for l in open(args.lista) if l.strip()]
    saida = OrderedDict()
    for p in alvos:
        caminho = f'output/epidemio/raw_{p}.json'
        if not os.path.exists(caminho):
            continue
        d = json.load(open(caminho, encoding='utf-8'))
        cad = (d.get('cadastro') or {}).get('dadosBasicos') or {}
        fontes = fontes_do_prontuario(p)
        concl, notas, vistos = [], [], set()
        for e in sorted(fontes, key=lambda x: x['data_evo']):
            t = limpar(e['descricao'])
            concl.extend(conclusoes(t))
            chave = re.sub(r'\s+', ' ', t)[:110]
            if chave in vistos:
                continue
            vistos.add(chave)
            notas.append({'data': e['data_evo'][:10],
                          'prof': (e['profissional'] or '').strip()[:32],
                          'texto': re.sub(r'\s+', ' ', t)[:1100]})
        # hipóteses com termo cardiológico
        hips = []
        for e in (d.get('evolucoes') or []):
            for h in (e.get('hipoteses') or []) + (e.get('anteriores') or []):
                h = re.sub(r'\s+', ' ', str(h)).strip()
                if 8 <= len(h) <= 140 and any(re.search(pat, h, re.I) for pat in TERMOS.values()):
                    if h not in hips:
                        hips.append(h)
        saida[p] = {
            'nome': cad.get('nome'), 'sexo': cad.get('sexo'),
            'nascimento': str(cad.get('dataNascimento'))[:10],
            'conclusoes': list(dict.fromkeys(concl))[:8],
            'notas_cardio': notas[:6],
            'hipoteses': hips[:14],
            'n_evolucoes': len(d.get('evolucoes') or []),
        }
    json.dump(saida, open(args.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(saida)} prontuários -> {args.out}')


if __name__ == '__main__':
    main()
