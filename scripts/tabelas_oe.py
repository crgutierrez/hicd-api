#!/usr/bin/env python3
"""Tabelas dos objetivos específicos, SEMPRE com a coluna de sensibilidade do FOP.

Decisões do orientando, 20/09/2026:
  1. FOP isolado FICA no numerador — mas toda tabela carrega a coluna
     "sem FOP isolado". Park (2016), referência do protocolo, trata o forame
     oval pérvio como variante da normalidade; a divergência é deliberada e
     precisa aparecer em cada número, não só numa nota de rodapé.
  2. "Referida, não confirmada" é categoria própria: sai do numerador E do
     denominador de casos, reportada à parte.
  3. Denominador do arquivo de prescrições = todos os registros válidos (6.737).

Uso: python3 scripts/tabelas_oe.py
"""
import csv, collections, re, statistics

csv.field_size_limit(10 ** 9)
P = list(csv.DictReader(open('output/epidemio/dataset_pacientes.csv', encoding='utf-8')))
I = list(csv.DictReader(open('output/epidemio/dataset_internacoes.csv', encoding='utf-8')))

FOP = re.compile(r'forame oval|\bFOP\b', re.I)
OUTRAS = re.compile(
    r'\bCIV\b|interventricular|\bCIA\b|interatrial|canal arterial|ductus|fallot|coarcta|'
    r'estenose|atresia|hipoplasi|ebstein|drenagem an|bloqueio|condu[çc]|coron|transposi|'
    r'displasia|dextrocardia|situs|glenn|fontan|triatriatum|arritmia|taquicardia|'
    r'n[ãa]o compact|malposi|veia cava superior esquerda|artéria pulmonar', re.I)


# Marcador explícito posto à mão na leitura do prontuário. A regex sozinha erra
# nos dois sentidos: "comunicação interatrial tipo fossa oval" É um FOP e casa
# com OUTRAS; um eco neonatal que descreve CIA + canal arterial e no controle
# mostra só FOP fica preso ao primeiro laudo. Quem leu decide; a regex é fallback.
MARCA_FOP = re.compile(r'\[FOP isolado\]', re.I)
MARCA_NAO_FOP = re.compile(r'\[n[ãa]o-FOP\]', re.I)


def fop_isolado(p):
    d = p['diagnostico_cardiologico']
    if MARCA_FOP.search(d):
        return True
    if MARCA_NAO_FOP.search(d):
        return False
    return bool(FOP.search(d)) and not OUTRAS.search(d)


CONG = [p for p in P if p['cardiopatia_congenita'].startswith('Sim')]
REFERIDA = [p for p in P if p['cardiopatia_congenita'].startswith('Referida')]
SEM_FOP = [p for p in CONG if not fop_isolado(p)]
# O denominador de casos exclui os "referida, não confirmada".
BASE = [p for p in P if not p['cardiopatia_congenita'].startswith('Referida')]


def linha(rot, a, b, da, db):
    print(f"  {rot:40} {a:4d} ({a/da:5.1%})   {b:4d} ({b/db:5.1%})")


def bloco(titulo, chave, ordem=None):
    print(f"\n--- {titulo}")
    print(f"  {'':40} {'COM FOP isolado':>14}   {'SEM FOP isolado':>14}")
    ca, cb = collections.Counter(map(chave, CONG)), collections.Counter(map(chave, SEM_FOP))
    for k in (ordem or [k for k, _ in ca.most_common()]):
        linha(str(k)[:40], ca.get(k, 0), cb.get(k, 0), len(CONG), len(SEM_FOP))


print("=" * 74)
print("PREVALÊNCIA NA AMOSTRA")
print(f"  base de casos (exclui 'referida, não confirmada'): {len(BASE)}")
print(f"  COM FOP isolado : {len(CONG)}/{len(BASE)} = {len(CONG)/len(BASE):.1%}")
print(f"  SEM FOP isolado : {len(SEM_FOP)}/{len(BASE)} = {len(SEM_FOP)/len(BASE):.1%}")
print(f"  FOP isolado     : {len(CONG)-len(SEM_FOP)} casos ({(len(CONG)-len(SEM_FOP))/len(CONG):.1%} das congênitas)")
print(f"  referida, não confirmada (grupo à parte): {len(REFERIDA)}")

bloco("OE1 — Sexo", lambda p: p['sexo'] or '(sem)')
bloco("OE1 — Faixa etária", lambda p: p['faixa_etaria'] or '(sem)')
bloco("OE1 — Classe (Croti & Park)", lambda p: (p['classe_croti_park'] or '(sem)').split(' (')[0])
bloco("OE1 — Passou por UTI", lambda p: p['passou_por_uti'] or '(sem)')
bloco("OE2 — Momento do diagnóstico",
      lambda p: 'Precoce' if p['momento_do_diagnostico'].lower().startswith('precoce')
      else ('Tardio' if p['momento_do_diagnostico'].lower().startswith('tardio') else 'outro'))
bloco("OE2 — Desfecho da internação-índice", lambda p: p['desfecho_indice'] or '(sem)')

print("\n--- OE2 — Mortalidade")
oc = sum(1 for p in CONG if p['obito_em_qualquer_internacao'] == 'Sim')
os_ = sum(1 for p in SEM_FOP if p['obito_em_qualquer_internacao'] == 'Sim')
cong_ids = {p['prontuario'] for p in CONG}
od = sum(1 for p in BASE if p['prontuario'] not in cong_ids and p['obito_em_qualquer_internacao'] == 'Sim')
print(f"  congênitas COM FOP isolado : {oc}/{len(CONG)} = {oc/len(CONG):.1%}")
print(f"  congênitas SEM FOP isolado : {os_}/{len(SEM_FOP)} = {os_/len(SEM_FOP):.1%}")
print(f"  demais                     : {od}/{len(BASE)-len(CONG)} = {od/(len(BASE)-len(CONG)):.1%}")


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


print("\n--- OE2 — Permanência por internação, biênio (registros corrompidos já excluídos)")
semfop_ids = {p['prontuario'] for p in SEM_FOP}
for rot, ids in [('congênitas COM FOP isolado', cong_ids), ('congênitas SEM FOP isolado', semfop_ids),
                 ('demais', {p['prontuario'] for p in BASE} - cong_ids)]:
    v = sorted(x for i in I if i['no_bienio'] == 'Sim' and i['prontuario'] in ids
               and (x := num(i['permanencia_dias'])) is not None)
    if v:
        print(f"  {rot:28} n={len(v):4d}  mediana={statistics.median(v):5.1f}  "
              f"média={statistics.mean(v):5.1f}  p75={v[int(len(v)*.75)]:5.1f}  máx={v[-1]:6.1f}")

print("\n--- OE3 — Internações de congênitos por semestre (biênio)")
print(f"  {'':10} {'COM FOP isolado':>16} {'SEM FOP isolado':>16}")
sa = collections.Counter(i['semestre'] for i in I if i['no_bienio'] == 'Sim' and i['prontuario'] in cong_ids)
sb = collections.Counter(i['semestre'] for i in I if i['no_bienio'] == 'Sim' and i['prontuario'] in semfop_ids)
for s in sorted(sa):
    print(f"  {s:10} {sa[s]:16d} {sb.get(s, 0):16d}")
print("\n  > Normalize pela taxa mensal de parecer antes de interpretar (erro M20).")
