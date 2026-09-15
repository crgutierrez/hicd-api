#!/usr/bin/env python3
"""Reaplica a detecção de óbito sobre os raw_*.json já coletados.

Existe para corrigir a detecção sem refazer a coleta inteira no HICD — os textos
das evoluções já estão em disco, e só a regra mudou.

Dois bugs que motivaram este script:
  1. "PREENCHO DOCUMENTOS" casava com o padrão "preencho DO" (sem fronteira de
     palavra), marcando óbito em paciente vivo.
  2. O óbito só era procurado dentro do laço das internações; quando o módulo
     Inter falhava (HTTP 500), o paciente nunca era avaliado e o óbito sumia.

Uso: python3 scripts/reprocessar_obito.py [--out output/epidemio]
"""
import argparse, glob, json, os, re

# Constatação de óbito — nunca risco. "risco de óbito" e "risco iminente de
# óbito" aparecem em pacientes graves que sobrevivem.
OBITO_CONSTATADO = re.compile('|'.join([
    # "constato", "constatado", "constatada" e o erro de digitação "constatato"
    # (que apareceu de verdade: "Constatato óbito às 15:10h").
    r'constat\w*\s+(?:o\s+)?[óo]bito',
    r'[óo]bito\s+(?:foi\s+)?(?:declarado|constatado)',
    r'declar(?:o|ou|ado|ada)\s+(?:a\s+)?(?:hora\s+do\s+)?[óo]bito',
    r'declara[çc][ãa]o\s+de\s+[óo]bito',
    r'protocolo\s+de\s+[óo]bito',
    r'hora\s+do\s+[óo]bito',
    r'evolui[u]?\s+(?:para\s+)?[óo]bito',
]), re.I)

# "risco de óbito" e "risco iminente de óbito" aparecem o tempo todo em paciente
# grave que sobrevive — nunca contam como constatação.
RISCO = re.compile(r'risco\s+(?:iminente\s+)?(?:de\s+)?[óo]bito|chances?\s+de\s+[óo]bito|possibilidade\s+de\s+[óo]bito', re.I)

# Óbito de terceiro (mãe, irmão) não é desfecho do paciente.
TERCEIRO = re.compile(r'\b(m[ãa]e|genitora|pai|genitor|irm[ãa]os?|av[óo]s?|tios?|familiar|primo)\b[^.]{0,60}[óo]bito', re.I)


def data(txt):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})(?:\s+(\d{2}):(\d{2}))?', str(txt or ''))
    return (m.group(3), m.group(2), m.group(1), m.group(4) or '00', m.group(5) or '00') if m else None


def achar_obito(evolucoes, ini=None, fim=None):
    for e in sorted(evolucoes, key=lambda x: data(x.get('data')) or ('0',) * 5):
        d = data(e.get('data'))
        if not d:
            continue
        if ini and d < ini:
            continue
        if fim and d > fim:
            continue
        texto = e.get('descricao') or ''
        m = None
        for cand in OBITO_CONSTATADO.finditer(texto):
            volta = texto[max(0, cand.start() - 60):cand.end()]
            if RISCO.search(volta):
                continue
            m = cand
            break
        if not m:
            continue
        janela = texto[max(0, m.start() - 160):m.start() + 180]
        if TERCEIRO.search(janela) and not re.search(r'\b(paciente|lactente|crian[çc]a|menor|rn)\b', janela, re.I):
            continue
        return {
            'data': e.get('data'), 'profissional': e.get('profissional'),
            'atividade': e.get('atividade'),
            'trecho': re.sub(r'\s+', ' ', janela).strip(),
        }
    return None


def mais_dias(d, n):
    from datetime import datetime, timedelta
    x = datetime(int(d[0]), int(d[1]), int(d[2])) + timedelta(days=n)
    return (f'{x.year:04d}', f'{x.month:02d}', f'{x.day:02d}', '23', '59')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='output/epidemio')
    args = ap.parse_args()

    mudou = corrigidos = adicionados = 0
    for caminho in sorted(glob.glob(os.path.join(args.out, 'raw_*.json'))):
        with open(caminho, encoding='utf-8') as fh:
            d = json.load(fh)
        evs = d.get('evolucoes')
        if not isinstance(evs, list):
            continue
        antes = any(i.get('desfecho') == 'Óbito'
                    for i in (d.get('internacoes') if isinstance(d.get('internacoes'), list) else []))

        # nível do paciente — independe do módulo Inter
        d['obitoNoProntuario'] = achar_obito(evs)

        # nível da internação
        for i in (d.get('internacoes') if isinstance(d.get('internacoes'), list) else []):
            ent, sai = data(i.get('entrada')), data(i.get('saida'))
            if not ent:
                continue
            o = achar_obito(evs, ent, mais_dias(sai, 2) if sai else None)
            if o:
                i.update(desfecho='Óbito', confiancaDesfecho='alta',
                         fonteDesfecho='Óbito constatado em evolução', obito=o)
            elif i.get('desfecho') == 'Óbito':
                # marcado antes pela regra com bug; devolve ao que o RALTA disser
                i.pop('obito', None)
                i['desfecho'] = ('Alta' if i.get('tipoDocumentoAlta') == 'Resumo de alta'
                                 else ('Sem informação' if not i.get('temRelatorioAlta') else 'Indeterminado'))
                i['fonteDesfecho'] = (f"RALTA: {i.get('tipoDocumentoAlta')}" if i.get('temRelatorioAlta') else None)
                i['confiancaDesfecho'] = 'alta' if i['desfecho'] == 'Alta' else None

        depois = any(i.get('desfecho') == 'Óbito'
                     for i in (d.get('internacoes') if isinstance(d.get('internacoes'), list) else []))
        if antes != depois:
            mudou += 1
            print(f"  {d['prontuario']}: óbito {antes} -> {depois}")
            corrigidos += 1 if antes and not depois else 0
            adicionados += 1 if depois and not antes else 0
        if d['obitoNoProntuario'] and not depois:
            print(f"  {d['prontuario']}: óbito no prontuário SEM internação correspondente "
                  f"({d['obitoNoProntuario']['data']})")

        with open(caminho, 'w', encoding='utf-8') as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1)

    print(f'internações alteradas: {mudou} (removidos {corrigidos}, acrescentados {adicionados})')


if __name__ == '__main__':
    main()
