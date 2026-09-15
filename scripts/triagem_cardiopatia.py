#!/usr/bin/env python3
"""Triagem automática para o levantamento de cardiopatias.

Varre DUAS fontes por prontuário:
  1. evoluções da cardiopediatria (CSV da Dra. Vera) — laudos e pareceres
  2. hipóteses diagnósticas de todas as especialidades (raw_<pront>.json)

A segunda fonte importa: há cardiopatia registrada nas hipóteses da pediatria que
não aparece no texto da cardio (o 38089, FOP + canal arterial, é o caso que
obrigou a incluí-la).

Grupos:
  AUTO-NAO  — nenhum termo de cardiopatia em nenhuma das fontes. Classificação
              automática como "sem cardiopatia".
  REVISAR   — algum termo apareceu; precisa de leitura humana.

A regra é deliberadamente conservadora — qualquer sinal manda para revisão, e o
custo são falsos positivos (casos que vão para leitura e se revelam normais).

Uso: python3 scripts/triagem_cardiopatia.py [--n 200] [--out output/epidemio/triagem.csv]
"""
import argparse, csv, html, json, os, re
from collections import OrderedDict

csv.field_size_limit(10 ** 9)
CSV_CARDIO = 'docs/DRA_VERA_HICD_2024_2025.csv'

# Termos que indicam cardiopatia congênita ou achado estrutural/condução relevante.
# Fronteira de palavra que respeita acentuação: \b não serve porque [a-z] do
# lookbehind não cobre "Á", e "FARMÁCIA" passaria a casar com a sigla CIA.
L = 'a-zà-öø-ÿA-ZÀ-ÖØ-Þ'
NB = f'(?<![{L}])'   # não precedido de letra
NA = f'(?![{L}])'    # não seguido de letra

TERMOS = OrderedDict([
    ('forame oval',      rf'forame\s+oval|{NB}fop{NA}'),
    ('CIA',              rf'comunica[çc][ãa]o\s+interatrial|{NB}cia{NA}|ostium\s+(secundum|primum)'),
    ('CIV',              rf'comunica[çc][ãa]o\s+interventricular|{NB}civ{NA}'),
    ('canal arterial',   rf'canal\s+arterial|{NB}pca{NA}|ductus'),
    ('Fallot',           r'fallot|tetralogia'),
    ('transposição',     rf'transposi[çc][ãa]o\s+das\s+grandes|{NB}tga{NA}|jatene|rashkind'),
    ('atresia',          r'atresia'),
    ('coarctação',       r'coarcta[çc][ãa]o'),
    ('estenose valvar',  r'estenose\s+(pulmonar|a[óo]rtica|mitral|tric[úu]spide|infundibulo|subva|valvar)'),
    ('hipoplasia',       r'hipoplasi|hipopl[áa]sic'),
    ('valva bicúspide',  r'bic[úu]spide|bivalvular'),
    ('Ebstein',          r'ebstein'),
    ('drenagem anômala', r'drenagem\s+an[óo]mala|conex[ãa]o\s+venosa\s+an[óo]mala'),
    ('ventrículo único', r'ventr[íi]culo\s+[úu]nico|univentricular|glenn|fontan|blalock'),
    ('truncus',          r'truncus|tronco\s+arterioso'),
    ('dextrocardia',     r'dextrocardia|situs\s+inversus|levocardia\s+com'),
    ('BAV / bloqueio',   rf'{NB}bavt?{NA}|bloqueio\s+(atrioventricular|de\s+ramo|av)|{NB}br[de]{NA}|dist[úu]rbio\s+de\s+condu'),
    ('anomalia coronar', r'ponte\s+mioc[áa]rdica|aneurisma\s+de\s+coron|origem\s+an[óo]mala|f[íi]stula\s+coron|coron[áa]ria\s+\w*\s*z\s*score'),
    ('arritmia',         rf'arritmi|wolff|{NB}wpw{NA}|qt\s+long|extrass[íi]stol|flutter|fibrila[çc][ãa]o\s+atrial'),
    ('miocardiopatia',   r'miocardiopati|miocardite|cardiomiopati|n[ãa]o\s+compactado'),
    ('hipertensão pulm', rf'hipertens[ãa]o\s+pulmonar|{NB}hp{NA}\s'),
    ('cardiopatia (gen)',r'cardiopatia\s+cong[êe]nita|cardiopata'),
    ('Kawasaki',         r'kawasaki'),
    ('colateral aórtica',r'colateral\s+em\s+aorta|art[ée]ria\s+colateral'),
])

# Linhas do laudo padrão que descrevem normalidade e não podem disparar termo.
RUIDO_NORMAL = re.compile(
    r'^(coron[áa]rias|valva\s+\w+|septo\s+inter\w+|conex[ãa]o|jun[çc][ãa]o|situs|ventr[íi]culo|'
    r'[áa]trio|via\s+de\s+sa[íi]da|art[ée]ria\s+pulmonar|aorta|arco|peric[áa]rdi|drenagem)'
    r'\s*:?\s*(normal|integro|[íi]ntegro|dimens[õo]es|sem\s+altera|de\s+implanta|tip|concordante|s[óo]litus|calibre|desce)',
    re.I)

CONCLUSAO_NORMAL = re.compile(r'dentro\s+do\s+padr[ãa]o\s+da?\s+normalidade|exame\s+normal|sem\s+altera[çc][õo]es', re.I)


def limpar(t):
    t = re.sub(r'<br\s*/?>', '\n', t, flags=re.I)
    t = re.sub(r'<[^>]+>', '', t)
    return html.unescape(t).replace('\xa0', ' ')


def hipoteses_do_hicd(pront, base='output/epidemio'):
    """Hipóteses e diagnósticos anteriores de todas as especialidades."""
    caminho = os.path.join(base, f'raw_{pront}.json')
    if not os.path.exists(caminho):
        return []
    with open(caminho, encoding='utf-8') as fh:
        d = json.load(fh)
    evs = d.get('evolucoes')
    if not isinstance(evs, list):
        return []
    saida = []
    for e in evs:
        saida.extend(str(x) for x in (e.get('hipoteses') or []))
        saida.extend(str(x) for x in (e.get('anteriores') or []))
    return saida


def carregar_cardio(caminho=CSV_CARDIO):
    por_pront = OrderedDict()
    with open(caminho, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            por_pront.setdefault(r['registro'], []).append(r)
    return por_pront


def triar(evolucoes, hipoteses=()):
    """Devolve (grupo, termos_encontrados, conclusoes)."""
    conclusoes, achados = [], OrderedDict()
    for e in sorted(evolucoes, key=lambda x: x['data_evo']):
        texto = limpar(e['descricao'])
        for linha in texto.split('\n'):
            linha = linha.strip()
            if not linha:
                continue
            if re.match(r'conclus[ãa]o\s*:', linha, re.I):
                conclusoes.append(re.sub(r'^conclus[ãa]o\s*:\s*', '', linha, flags=re.I).strip())
            # linhas de laudo normal não contam como achado
            if RUIDO_NORMAL.match(linha):
                continue
            for rotulo, padrao in TERMOS.items():
                if re.search(padrao, linha, re.I):
                    achados.setdefault(rotulo, linha[:150])

    for h in hipoteses:
        linha = re.sub(r'\s+', ' ', h).strip()
        if not linha or RUIDO_NORMAL.match(linha):
            continue
        for rotulo, padrao in TERMOS.items():
            if re.search(padrao, linha, re.I):
                achados.setdefault(f'{rotulo} (HD)', linha[:150])

    # Ausência de qualquer termo, nas duas fontes, é o sinal de "sem cardiopatia".
    # A conclusão normal do laudo é confirmação adicional, não requisito — muitos
    # pareceres da cardio são notas curtas, sem laudo formal.
    return ('REVISAR' if achados else 'AUTO-NAO'), achados, conclusoes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=200)
    ap.add_argument('--out', default='output/epidemio/triagem.csv')
    args = ap.parse_args()

    cardio = carregar_cardio()
    alvos = list(cardio)[:args.n]
    linhas = []
    for pront in alvos:
        grupo, achados, conclusoes = triar(cardio[pront], hipoteses_do_hicd(pront))
        linhas.append(dict(
            prontuario=pront,
            grupo=grupo,
            n_evolucoes_cardio=len(cardio[pront]),
            termos='; '.join(achados.keys()),
            conclusoes=' | '.join(dict.fromkeys(conclusoes))[:400],
            laudo_todo_normal=('Sim' if conclusoes and all(CONCLUSAO_NORMAL.search(c) for c in conclusoes)
                               else ('Não' if conclusoes else 'sem laudo formal')),
            evidencia=' || '.join(f'{k}: {v}' for k, v in list(achados.items())[:4]),
        ))

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0].keys()))
        w.writeheader()
        w.writerows(linhas)

    from collections import Counter
    c = Counter(l['grupo'] for l in linhas)
    print(f'{len(linhas)} prontuários -> {args.out}')
    for g, q in c.most_common():
        print(f'  {g:10s} {q:4d}  ({round(100*q/len(linhas))}%)')


if __name__ == '__main__':
    main()
