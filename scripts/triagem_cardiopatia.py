#!/usr/bin/env python3
"""Triagem automática para o levantamento de cardiopatias.

Varre TRÊS fontes por prontuário:
  1. **todas** as evoluções com `atividade = CARDIOLOGISTA` do raw_<pront>.json —
     de qualquer cardiologista, não só da Dra. Vera
  2. as evoluções do CSV da Dra. Vera (marco amostral), como rede de segurança
     para prontuários ainda não coletados
  3. hipóteses diagnósticas de todas as especialidades (raw_<pront>.json)

A fonte 1 foi acrescentada em 14/09/2026 e é a correção mais importante deste
script. Antes ele lia **só o CSV da Dra. Vera** — o marco amostral — e por isso
era cego para cardiopatia acompanhada por outra cardiologista. Perdeu a CIV
operada do prontuário 34990 (CIV de via de entrada com extensão subaórtica,
corrigida em 31/08/2023, com Síndrome de Down): o diagnóstico está nas 20
evoluções da Dra. Luciana Nina, que não existem no CSV, e a nota da Dra. Vera
dizia só "pacth no septo interventricular".

A fonte 3 importa porque há cardiopatia registrada nas hipóteses da pediatria que
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
    # Cardiopatia CORRIGIDA continua sendo cardiopatia. Sem estes termos, um
    # paciente operado cuja única menção é "pacth no septo interventricular"
    # (34990) sai como "sem cardiopatia". O "pacth" trocado é do prontuário.
    ('cardiopatia operada', rf'{NB}pa(?:tc|ct)h{NA}[^.\n]{{0,60}}(?:septo|interventricular|interatrial|v[íi]a\s+de)|'
                            rf'(?:septo|interventricular|interatrial|v[íi]a\s+de\s+(?:entrada|sa[íi]da))[^.\n]{{0,60}}{NB}pa(?:tc|ct)h{NA}|'
                            rf'{NB}pot{NA}\s+(?:ci[va]|corre|tardio)|p[óo]s[\s-]?operat[óo]rio\s+(?:tardio\s+)?de\s+(?:corre|ci[va]|troca|pr[óo]tese|ventriculoplastia)|'
                            rf'ventriculoplastia|atri?os+eptoplastia|valvoplastia|anel\s+redutor|'
                            rf'pr[óo]tese\s+(?:valvar|mitral|a[óo]rtica|biol[óo]gica|tric[úu]spide)|'
                            rf'corre[çc][ãa]o\s+(?:cir[úu]rgica\s+)?(?:de\s+)?cardiopatia|cirurgia\s+card[íi]aca'),
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


MARCO = 'output/epidemio/marco_amostral.json'


def carregar_marco(caminho=MARCO):
    """Marco amostral AMPLIADO: CSV da Dra. Vera + varredura de todos os cardiologistas.

    O CSV dela cobre ~99% de quem foi avaliado pela cardiologia no biênio, mas
    não 100%: a varredura dos 6.127 internados fora do marco achou 6 pacientes
    com avaliação em 2024-2025 (5 só da Dra. Luciana Nina, 1 da própria Dra.
    Vera ausente do export). Chavear o pipeline só no CSV os deixava de fora
    mesmo depois de coletados.
    """
    if os.path.exists(caminho):
        with open(caminho, encoding='utf-8') as fh:
            m = json.load(fh)
        return OrderedDict(
            (k, [{'data_evo': d, 'descricao': '', 'profissional': '', 'fonte': 'marco'}
                 for d in v.get('datas', [])])
            for k, v in m.items())
    return carregar_cardio()


def carregar_cardio(caminho=CSV_CARDIO):
    """Marco amostral original: evoluções da Dra. Vera, na ordem em que o CSV as traz."""
    por_pront = OrderedDict()
    with open(caminho, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            por_pront.setdefault(r['registro'], []).append(
                {'data_evo': r['data_evo'], 'descricao': r['descricao'],
                 'profissional': r.get('profissional', ''), 'fonte': 'CSV'})
    return por_pront


def _para_iso(data_br):
    """`14/09/2026 08:30:00` -> `2026-09-14 08:30:00`, para ordenar junto com o CSV."""
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})[ T]?(.*)', str(data_br or ''))
    return f'{m.group(3)}-{m.group(2)}-{m.group(1)} {m.group(4)}'.strip() if m else str(data_br or '')


def evolucoes_de_cardiologista(pront, base='output/epidemio'):
    """TODAS as evoluções com `atividade = CARDIOLOGISTA` do prontuário.

    Não filtra por profissional: é justamente o que o script fazia de errado.
    """
    caminho = os.path.join(base, f'raw_{pront}.json')
    if not os.path.exists(caminho):
        return []
    with open(caminho, encoding='utf-8') as fh:
        d = json.load(fh)
    evs = d.get('evolucoes')
    if not isinstance(evs, list):
        return []
    return [{'data_evo': _para_iso(e.get('data') or e.get('dataEvolucao')),
             'descricao': e.get('descricao') or '',
             'profissional': (e.get('profissional') or '').strip(),
             'fonte': 'prontuario'}
            for e in evs
            if re.search(r'CARDIOLOG', e.get('atividade') or '', re.I)]


def fontes_do_prontuario(pront, do_csv=()):
    """Une prontuário + CSV, sem contar a mesma evolução duas vezes.

    O CSV é redundante quando o prontuário foi coletado, mas continua sendo a
    única fonte para quem ainda não foi — e o marco amostral pode trazer texto
    que o parser do HICD cortou.
    """
    unidas, vistos = [], set()
    for e in list(evolucoes_de_cardiologista(pront)) + list(do_csv):
        chave = (e['data_evo'][:16], limpar(e['descricao'])[:200].strip())
        if chave in vistos:
            continue
        vistos.add(chave)
        unidas.append(e)
    return unidas


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
            # Linhas de laudo normal não contam como achado — mas descartar a
            # LINHA INTEIRA perdia o achado que vem DEPOIS da cláusula normal,
            # na mesma linha. O laudo do HICD escreve assim o tempo todo:
            #   "Artéria Pulmonar: Normal e ramos confluentes. Canal arterial amplo de 7.2mm"
            #   "Septo Interatrial: Íntegro. FOP 3,3 mm."
            #   "Situs: Sólitus e dextrocardia."
            # Eram 13 prontuários com termo escondido atrás do "Normal", entre eles
            # um canal arterial de 7,2 mm e uma dextrocardia. Agora a cláusula
            # normal é removida e o RESTO da linha continua sendo procurado.
            m_normal = RUIDO_NORMAL.match(linha)
            alvo = linha[m_normal.end():] if m_normal else linha
            if not alvo.strip():
                continue
            for rotulo, padrao in TERMOS.items():
                if re.search(padrao, alvo, re.I):
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
    ap.add_argument('--n', type=int, default=200,
                    help='quantos prontuários do início do CSV triar')
    ap.add_argument('--prontuarios', default='',
                    help='lista explícita, separada por vírgula; ignora --n')
    ap.add_argument('--coletados', action='store_true',
                    help='triar todos os prontuários já coletados em output/epidemio')
    ap.add_argument('--out', default='output/epidemio/triagem.csv')
    args = ap.parse_args()

    cardio = carregar_marco()
    if args.prontuarios:
        alvos = [p.strip() for p in args.prontuarios.split(',') if p.strip() in cardio]
    elif args.coletados:
        import glob
        coletados = {os.path.basename(f)[4:-5] for f in glob.glob('output/epidemio/raw_*.json')}
        alvos = [p for p in cardio if p in coletados]
    else:
        alvos = list(cardio)[:args.n]
    linhas = []
    for pront in alvos:
        fontes = fontes_do_prontuario(pront, cardio.get(pront, ()))
        grupo, achados, conclusoes = triar(fontes, hipoteses_do_hicd(pront))
        outros = sorted({e['profissional'] for e in fontes
                         if e['profissional'] and 'VERA JOANA' not in e['profissional'].upper()})
        linhas.append(dict(
            prontuario=pront,
            grupo=grupo,
            n_evolucoes_cardio=len(fontes),
            outros_cardiologistas='; '.join(outros),
            termos='; '.join(achados.keys()),
            conclusoes=' | '.join(dict.fromkeys(conclusoes))[:400],
            laudo_todo_normal=('Sim' if conclusoes and all(CONCLUSAO_NORMAL.search(c) for c in conclusoes)
                               else ('Não' if conclusoes else 'sem laudo formal')),
            evidencia=' || '.join(f'{k}: {v}' for k, v in list(achados.items())[:4]),
        ))

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    # Preserva a triagem já feita: o arquivo acumula, prontuário a prontuário.
    if os.path.exists(args.out):
        with open(args.out, encoding='utf-8', newline='') as fh:
            anteriores = {r['prontuario']: r for r in csv.DictReader(fh)}
        novos = {l['prontuario'] for l in linhas}
        linhas = [r for p, r in anteriores.items() if p not in novos] + linhas

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
