#!/usr/bin/env python3
"""Imprime um lote do digesto, comprimindo o boilerplate do laudo de eco.

O laudo padrão tem ~15 linhas que descrevem normalidade ("Situs: Sólitus e
levocardia", "Conexão venosa pulmonar: Normal", "Valva Mitral: sem alterações
morfológicas"). Elas não decidem classificação e consomem a maior parte do
texto. Aqui são suprimidas, preservando o que foge do normal.

Uso: ver_lote.py INICIO FIM
"""
import json, re, sys

NORMAL = re.compile(
    r'^(situs|conex[ãa]o\s+venosa\s+\w+|[áa]trio\s+(direito|esquerdo)|septo\s+inter\w+|'
    r'jun[çc][ãa]o\s+\w+[\w-]*|valva\s+\w+|ventr[íi]culo\s+\w+|via\s+de\s+sa[íi]da\s+\w+|'
    r'art[ée]ria\s+pulmonar|aorta|arco\s+a[óo]rtico|coron[áa]rias|peric[áa]rdio|'
    r'prematuridade|sexo|peso|altura|s[íi]ndrome|procedência|indica[çc][ãa]o|antecedentes)'
    r'\s*:?\s*'
    r'(s[óo]litus|normal|integro|[íi]ntegro|dimens[õo]es\s+preservadas|sem\s+altera|'
    r'de\s+implanta|tipo\s+biventricular|concordante|calibre|desce\s+[àa]|sem\s+derrame|'
    r'preservad|tric[úu]spide\s+sem)', re.I)


def compacta(t):
    # tira o cabeçalho de identificação e as linhas de normalidade do laudo
    t = re.sub(r'LAUDO DE ECOCARDIO\w*\s*PEDI[ÁA]TRICO', '[LAUDO]', t, flags=re.I)
    t = re.sub(r'(NOME|REG|DN|IDADE|PORTO VELHO)\s*:?\s*[^,;]{0,40}', '', t, count=6, flags=re.I)
    partes = [p.strip() for p in re.split(r'(?<=[.;])\s+|\s{2,}', t) if p.strip()]
    mantidas = [p for p in partes if not NORMAL.match(p)]
    return re.sub(r'\s+', ' ', ' '.join(mantidas))


d = json.load(open('output/epidemio/digesto_pendentes.json'))
ks = list(d)
a, b = int(sys.argv[1]), int(sys.argv[2])
for k in ks[a:b]:
    v = d[k]
    print(f"\n{'='*88}\n### {k} | {v['nome']} | {v['sexo']} | nasc {v['nascimento']}")
    if v['conclusoes']:
        print("CONCL:", ' || '.join(v['conclusoes'])[:300])
    if v['hipoteses']:
        print("HIPOT:", ' ; '.join(v['hipoteses'])[:260])
    for n in v['notas_cardio']:
        print(f"  [{n['data']} {n['prof'][:22]}] {compacta(n['texto'])[:430]}")
