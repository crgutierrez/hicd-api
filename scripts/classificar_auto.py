#!/usr/bin/env python3
"""Gera as classificações automáticas do grupo AUTO-NAO da triagem.

Só toca em prontuários que a triagem marcou como AUTO-NAO e que ainda não têm
classificação manual — nunca sobrescreve leitura humana. A coluna
`origem_classificacao` registra a procedência de cada linha.

Uso: python3 scripts/classificar_auto.py [--triagem ...] [--saida docs/classificacao_cardiologica.csv]
"""
import argparse, csv, html, json, os, re
from collections import OrderedDict

csv.field_size_limit(10 ** 9)
CSV_CARDIO = 'docs/DRA_VERA_HICD_2024_2025.csv'
COLUNAS = ['prontuario', 'cardiopatia_congenita', 'classe', 'dx_cardio',
           'momento_dx', 'comorbidades', 'origem_classificacao']

# Linhas que o campo hipotesesDiagnosticas absorve mas não são diagnósticos.
NAO_DIAGNOSTICO = re.compile(
    r'^(#|►|\d+\s*[-–)]|\W*$)|'
    r'^(em uso|fez uso|medicamentos?|terap[êe]utica|aporte|dieta|conduta|evolu|hist[óo]ria|queixa|'
    r'exame|sinais vitais|hip[óo]teses|diagn[óo]sticos? (anteriores|pr[ée]vios)|identifica|admiss|'
    r'peso|pa[:s]|fc[:]|fr[:]|tax|sat|spo|braden|risco de|realiza|solicit|grat|obs[:.]|nega|'
    r'laborator|imagem|exames?|controle|par[âa]metros|prescri|receit|alta |encaminh|aguard)',
    re.I)


def limpar(t):
    t = re.sub(r'<br\s*/?>', '\n', t, flags=re.I)
    t = re.sub(r'<[^>]+>', '', t)
    return html.unescape(t).replace('\xa0', ' ')


def resumo_cardio(evolucoes):
    """Conclusões de ecocardiograma, deduplicadas."""
    conclusoes = []
    for e in sorted(evolucoes, key=lambda x: x['data_evo']):
        for linha in limpar(e['descricao']).split('\n'):
            linha = linha.strip()
            if re.match(r'conclus[ãa]o\s*:', linha, re.I):
                conclusoes.append(re.sub(r'^conclus[ãa]o\s*:\s*', '', linha, flags=re.I).strip(' .'))
    return list(dict.fromkeys(conclusoes))


def comorbidades_auto(pront, base='output/epidemio', limite=12):
    """Hipóteses mais frequentes, com o ruído estrutural do campo filtrado."""
    caminho = os.path.join(base, f'raw_{pront}.json')
    if not os.path.exists(caminho):
        return ''
    with open(caminho, encoding='utf-8') as fh:
        d = json.load(fh)
    evs = d.get('evolucoes')
    if not isinstance(evs, list):
        return ''
    contagem = OrderedDict()
    for e in evs:
        for it in (e.get('hipoteses') or []) + (e.get('anteriores') or []):
            t = re.sub(r'\s+', ' ', re.sub(r'^[\-\*•\s]+', '', str(it))).strip(' .;:')
            if not (5 <= len(t) <= 110) or NAO_DIAGNOSTICO.match(t):
                continue
            chave = t.upper()
            contagem.setdefault(chave, [t, 0])
            contagem[chave][1] += 1
    top = sorted(contagem.values(), key=lambda x: -x[1])[:limite]
    return '; '.join(t for t, _ in top)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--triagem', default='output/epidemio/triagem.csv')
    ap.add_argument('--saida', default='docs/classificacao_cardiologica.csv')
    args = ap.parse_args()

    with open(args.triagem, encoding='utf-8', newline='') as fh:
        triagem = {r['prontuario']: r for r in csv.DictReader(fh)}

    existentes = OrderedDict()
    if os.path.exists(args.saida):
        with open(args.saida, encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                r.setdefault('origem_classificacao', 'manual')
                existentes[r['prontuario']] = r

    cardio = OrderedDict()
    with open(CSV_CARDIO, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            cardio.setdefault(r['registro'], []).append(r)

    novos = 0
    for pront, t in triagem.items():
        if t['grupo'] != 'AUTO-NAO' or pront in existentes:
            continue
        conclusoes = resumo_cardio(cardio.get(pront, []))
        if conclusoes:
            dx = ('Sem cardiopatia congênita. Conclusão do ecocardiograma: '
                  + ' / '.join(conclusoes))
        else:
            dx = ('Sem cardiopatia congênita. Parecer da cardiopediatria sem laudo formal de '
                  'ecocardiograma e sem qualquer achado estrutural, de condução ou coronariano '
                  'registrado nas evoluções')
        existentes[pront] = dict(
            prontuario=pront,
            cardiopatia_congenita='Não',
            classe='Não se aplica',
            dx_cardio=dx,
            momento_dx='Não se aplica — nenhum achado cardiológico documentado',
            comorbidades=comorbidades_auto(pront),
            origem_classificacao='auto (triagem)',
        )
        novos += 1

    with open(args.saida, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=COLUNAS)
        w.writeheader()
        for r in existentes.values():
            w.writerow({c: r.get(c, '') for c in COLUNAS})

    from collections import Counter
    c = Counter(r.get('origem_classificacao', 'manual') for r in existentes.values())
    print(f'{novos} classificações automáticas acrescentadas; total {len(existentes)}')
    for k, v in c.most_common():
        print(f'  {k:16s} {v}')
    faltam = [p for p, t in triagem.items() if t['grupo'] == 'REVISAR' and p not in existentes]
    print(f'aguardando revisão manual: {len(faltam)}')


if __name__ == '__main__':
    main()
