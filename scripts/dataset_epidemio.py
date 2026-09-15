#!/usr/bin/env python3
"""Monta o dataset bruto do levantamento epidemiológico a partir de output/epidemio/raw_*.json.

As variáveis demográficas, de internação e de desfecho são derivadas automaticamente.
As variáveis clínicas cardiológicas exigem leitura do laudo e estão em CLASSIFICACAO,
preenchidas manualmente a partir das evoluções da cardiopediatria.

Uso: python3 scripts/dataset_epidemio.py [--out output/epidemio]
"""
import argparse, csv, json, os, re
from collections import OrderedDict
from datetime import datetime

csv.field_size_limit(10 ** 9)
CSV_CARDIO = 'docs/DRA_VERA_HICD_2024_2025.csv'
# Classificação clínica lida manualmente dos laudos da cardiopediatria.
# Fica em CSV versionado (e não no código) para escalar além de algumas dezenas.
CSV_CLASSIFICACAO = 'docs/classificacao_cardiologica.csv'


# O nome do município vem do próprio cadastro (CONSPAC_OPEN); o código IBGE do
# SAME serve de chave estável. Não manter tabela IBGE escrita à mão: os códigos de
# Rondônia não seguem ordem alfabética e um palpite errado troca o município.

# Classificação clínica — leitura manual dos laudos de ecocardiodoppler da Dra. Vera.
# cardiopatia_congenita: Sim / Não
# classe: Acianogênica / Cianogênica / Não se aplica (Croti & Park)


def boletins_emergencia(base='output/epidemio'):
    """Boletins de Emergência por prontuário, ordenados por data de chegada.

    O BE marca a **chegada** à emergência; o módulo Inter marca a **internação**.
    A defasagem mediana entre os dois é de 48 minutos (p75 = 1,5 h), e 97% dos
    BEs têm uma internação correspondente em até 24 h.

    O BE é a única fonte de motivo da entrada, CID do atendimento e
    classificação de risco do protocolo de Manchester.
    """
    import glob
    saida = {}
    for caminho in glob.glob(os.path.join(base, 'be_*.json')):
        with open(caminho, encoding='utf-8') as fh:
            d = json.load(fh)
        bs = [b for b in d.get('boletins', []) if b.get('entrada')]
        bs.sort(key=lambda b: dt(b['entrada']) or datetime.min)
        saida[d['prontuario']] = bs
    return saida


def be_da_internacao(bes, entrada, tolerancia_horas=24):
    """O BE cuja chegada precede esta internação dentro da tolerância."""
    ent = dt(entrada)
    if not ent:
        return None
    candidatos = [b for b in bes
                  if dt(b['entrada']) and 0 <= (ent - dt(b['entrada'])).total_seconds() <= tolerancia_horas * 3600]
    return max(candidatos, key=lambda b: dt(b['entrada'])) if candidatos else None


def porta_entrada(caminho='output/epidemio/porta_entrada.csv'):
    """(prontuário, entrada) -> porta de entrada e trajetória, derivadas das evoluções.

    O módulo Inter registra **um** setor por internação, e ele é o setor de ALTA:
    bate com o último setor das evoluções em 67% dos casos e com o primeiro em
    só 22%. Para saber por onde o paciente entrou — e por onde passou — é preciso
    ler o clinicaLeito das evoluções.
    """
    if not os.path.exists(caminho):
        return {}
    with open(caminho, encoding='utf-8', newline='') as fh:
        return {(r['prontuario'], r['entrada']): r for r in csv.DictReader(fh)}


def passagem_por_uti(base='output/epidemio', anos=(2024, 2025)):
    """Prontuários com ao menos uma evolução registrada na UTI (código 007).

    Derivar isso do setor do Inter subestima em 3x: quem passa pela UTI e recebe
    alta da enfermaria aparece só com a enfermaria.
    """
    import glob
    saida = set()
    for caminho in glob.glob(os.path.join(base, 'raw_*.json')):
        with open(caminho, encoding='utf-8') as fh:
            d = json.load(fh)
        evs = d.get('evolucoes')
        if not isinstance(evs, list):
            continue
        for e in evs:
            m = re.match(r'(\d{2})/(\d{2})/(\d{4})', str(e.get('data') or ''))
            if m and int(m.group(3)) in anos and str(e.get('clinicaLeito') or '').startswith('007-'):
                saida.add(d['prontuario'])
                break
    return saida


def classificacao(caminho=CSV_CLASSIFICACAO):
    """prontuário -> classificação cardiológica revisada à mão."""
    with open(caminho, encoding='utf-8', newline='') as fh:
        return {r['prontuario']: r for r in csv.DictReader(fh)}


def datas_cardio(caminho=CSV_CARDIO):
    """Datas das avaliações da cardiopediatria por prontuário (fonte: CSV da Dra. Vera)."""
    por_pront = OrderedDict()
    with open(caminho, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            por_pront.setdefault(r['registro'], []).append(
                datetime.strptime(r['data_evo'], '%Y-%m-%d %H:%M:%S'))
    return {k: sorted(v) for k, v in por_pront.items()}


def catalogo_setores(caminho='output/epidemio/catalogo_setores.csv'):
    """nome do setor -> código. O catálogo vem de scripts/catalogo_setores.js."""
    if not os.path.exists(caminho):
        return {}
    por_nome = {}
    with open(caminho, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            por_nome[r['nome'].upper()] = r['codigo']
            if r.get('nome_no_censo'):
                por_nome[r['nome_no_censo'].upper()] = r['codigo']
    # As evoluções rotulam o código 019 como "HOSPITAL DIA"; o cadastro e o
    # módulo Inter chamam o mesmo código de "OBSERVACAO".
    por_nome.setdefault('HOSPITAL DIA', '019')
    return por_nome


def dt(s):
    """Data do HICD; devolve None para qualquer coisa que não seja data."""
    if not s:
        return None
    try:
        return datetime.strptime(str(s).strip()[:16], '%d/%m/%Y %H:%M')
    except ValueError:
        return None


def faixa_etaria(dias):
    if dias is None:
        return None
    anos = dias / 365.25
    if anos < 1:
        return '< 1 ano (lactente)'
    if anos < 2:
        return '1 |- 2 anos'
    if anos < 5:
        return '2 |- 5 anos'
    if anos < 10:
        return '5 |- 10 anos'
    return '10 anos ou mais'


def idade_legivel(dias):
    if dias is None:
        return None
    anos, resto = divmod(dias, 365)
    meses = resto // 30
    if anos:
        return f'{anos}a {meses}m'
    return f'{meses}m {resto % 30}d'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='output/epidemio')
    args = ap.parse_args()

    cardio = datas_cardio()
    setores = catalogo_setores()
    CLASSIFICACAO = classificacao()
    PORTAS = porta_entrada()
    UTI = passagem_por_uti()
    BES = boletins_emergencia()
    ordem = [p for p in cardio if p in CLASSIFICACAO]
    pacientes, internacoes = [], []

    for pront in ordem:
        d = json.load(open(f'{args.out}/raw_{pront}.json', encoding='utf-8'))
        cad = d['cadastro']['dadosBasicos']
        end = d['cadastro'].get('endereco', {})
        same = d.get('cadastroSame') or {}
        # Há prontuários com cadastro vazio nas duas fontes (registro inativo ou
        # mesclado). Sem data de nascimento não há idade nem faixa etária; o
        # paciente entra no dataset marcado, em vez de derrubar a execução.
        bruto = cad.get('dataNascimento') or same.get('dataNascimento')
        nasc = None
        if bruto:
            texto = str(bruto)
            if '/' in texto:
                nasc = datetime.strptime(texto[:10], '%d/%m/%Y')
            else:
                nasc = datetime.fromisoformat(texto.replace('Z', '+00:00')).replace(tzinfo=None)
        if nasc is None:
            pacientes.append(dict(
                prontuario=pront, nome=cad.get('nome'), sexo=same.get('sexo'),
                cadastro_indisponivel='Sim',
                total_evolucoes=d.get('totalEvolucoes'),
                falha_modulo_internacoes='Sim' if not isinstance(d.get('internacoes'), list) else 'Não',
                obito_em_qualquer_internacao='Sim' if d.get('obitoNoProntuario') else 'Não',
                data_obito_indice=(d.get('obitoNoProntuario') or {}).get('data'),
            ))
            continue

        # Todas as internações, com tempo de permanência
        # O módulo Inter devolve 500 em prontuários muito longos; nesses casos
        # o registro vem com {erro}, e o paciente entra sem dados de internação.
        brutas = d.get('internacoes')
        falha_inter = not isinstance(brutas, list)
        linhas = []
        bes = BES.get(pront, [])
        for i in (brutas if isinstance(brutas, list) else []):
            be = be_da_internacao(bes, i.get('entrada'))
            ent, sai = dt(i['entrada']), dt(i['saida'])
            permanencia = round((sai - ent).total_seconds() / 86400, 1) if ent and sai else None
            linhas.append(dict(
                prontuario=pront,
                setor_codigo=setores.get((i['setor'] or '').upper()),
                setor_alta=i['setor'],
                setor_entrada=(PORTAS.get((pront, i['entrada']), {}) or {}).get('setor_primeira_evolucao'),
                porta_de_entrada=(PORTAS.get((pront, i['entrada']), {}) or {}).get('porta_de_entrada'),
                n_setores_na_internacao=(PORTAS.get((pront, i['entrada']), {}) or {}).get('n_setores_na_internacao'),
                trajetoria_na_internacao=(PORTAS.get((pront, i['entrada']), {}) or {}).get('trajetoria_na_internacao'),
                setor=i['setor'], entrada=i['entrada'], saida=i['saida'],
                permanencia_dias=permanencia,
                be_numero=(be or {}).get('be'),
                be_chegada=(be or {}).get('entrada'),
                be_motivo=(be or {}).get('motivo'),
                be_cid=(be or {}).get('cid'),
                classificacao_risco=((be or {}).get('triagem') or {}).get('classificacaoRisco'),
                queixa_triagem=((be or {}).get('triagem') or {}).get('queixa'),
                horas_chegada_ate_internacao=(round((dt(i['entrada']) - dt(be['entrada'])).total_seconds() / 3600, 1)
                                              if be and dt(i.get('entrada')) and dt(be.get('entrada')) else None),
                desfecho=i.get('desfecho'),
                confianca_desfecho=i.get('confiancaDesfecho'),
                fonte_desfecho=i.get('fonteDesfecho'),
                data_obito=(i.get('obito') or {}).get('data'),
                tipo_documento_alta=i.get('tipoDocumentoAlta'),
                data_relatorio_alta=i.get('dataRelatorioAlta'),
                cid_entrada=i['cidEntrada'], cid_descricao=i['cidDescricao'],
                procedimento_entrada=i.get('procedimentoEntrada'),
                idade_na_entrada=idade_legivel((ent - nasc).days) if ent else None,
                ano=ent.year if ent else None,
                semestre=f'{ent.year}-S{1 if ent.month <= 6 else 2}' if ent else None,
                no_bienio='Sim' if ent and ent.year in (2024, 2025) else 'Não',
            ))
        linhas.sort(key=lambda x: dt(x['entrada']) or datetime.min)
        internacoes.extend(linhas)

        # Internação índice: a que contém a primeira avaliação da cardiopediatria.
        no_bienio = [l for l in linhas if l['no_bienio'] == 'Sim']
        primeira_cardio = cardio.get(pront, [None])[0]
        indice = None
        if primeira_cardio:
            for l in linhas:
                ent, sai = dt(l['entrada']), dt(l['saida'])
                if ent and sai and ent <= primeira_cardio <= sai:
                    indice = l
                    break
        indice = indice or (no_bienio[0] if no_bienio else (linhas[0] if linhas else None))

        ent_idx = dt(indice['entrada']) if indice else None
        dias_idade = (ent_idx - nasc).days if ent_idx else None
        c = CLASSIFICACAO[pront]

        pacientes.append(dict(
            prontuario=pront,
            nome=cad.get('nome'),
            sexo=cad.get('sexo'),
            data_nascimento=nasc.strftime('%d/%m/%Y'),
            idade_na_internacao_indice=idade_legivel(dias_idade),
            faixa_etaria=faixa_etaria(dias_idade),
            lactente_menor_1ano='Sim' if dias_idade is not None and dias_idade < 365 else 'Não',
            municipio=(end.get('municipio') or '').title() or None,
            municipio_ibge=same.get('municipioIbge'),
            bairro=same.get('bairro'),
            uf=same.get('uf') or end.get('estado'),
            cor_raca=same.get('racaCor') or 'Não informado',
            cor_raca_codigo=same.get('racaCorCodigo'),
            deficiencia=same.get('deficiencia'),
            nacionalidade=same.get('nacionalidade'),
            cns=same.get('cns'),
            setor_alta_indice=indice['setor'] if indice else None,
            setor_entrada_indice=indice.get('setor_entrada') if indice else None,
            porta_de_entrada_indice=indice.get('porta_de_entrada') if indice else None,
            be_motivo_indice=indice.get('be_motivo') if indice else None,
            classificacao_risco_indice=indice.get('classificacao_risco') if indice else None,
            queixa_triagem_indice=indice.get('queixa_triagem') if indice else None,
            trajetoria_indice=indice.get('trajetoria_na_internacao') if indice else None,
            setor_codigo_indice=indice.get('setor_codigo') if indice else None,
            setores_todos='; '.join(sorted({l['setor'] for l in no_bienio})),
            n_setores_distintos_bienio=len({l['setor'] for l in no_bienio}),
            # Pelas evoluções, não pelo setor do Inter — ver passagem_por_uti().
            passou_por_uti='Sim' if pront in UTI else 'Não',
            setores_alta_bienio=' → '.join(l['setor'] for l in no_bienio),
            cardiopatia_congenita=c['cardiopatia_congenita'],
            classe_croti_park=c['classe'],
            diagnostico_cardiologico=c['dx_cardio'],
            momento_do_diagnostico=c['momento_dx'],
            comorbidades=c['comorbidades'],
            cid_internacao_indice=f"{indice['cid_entrada']} {indice['cid_descricao']}" if indice else None,
            entrada_indice=indice['entrada'] if indice else None,
            saida_indice=indice['saida'] if indice else None,
            permanencia_indice_dias=indice['permanencia_dias'] if indice else None,
            internacoes_no_bienio=len(no_bienio),
            permanencia_total_bienio_dias=round(sum(l['permanencia_dias'] or 0 for l in no_bienio), 1),
            desfecho_indice=indice.get('desfecho') if indice else None,
            confianca_desfecho_indice=indice.get('confianca_desfecho') if indice else None,
            fonte_desfecho_indice=indice.get('fonte_desfecho') if indice else None,
            data_obito_indice=indice.get('data_obito') if indice else None,
            # O óbito também é procurado no prontuário inteiro: quando o módulo
            # Inter falha não há internação a que prender o desfecho, e sem isto
            # o paciente entraria como se não tivesse morrido.
            obito_em_qualquer_internacao=('Sim' if (any(l.get('desfecho') == 'Óbito' for l in linhas)
                                                    or d.get('obitoNoProntuario')) else 'Não'),
            cadastro_indisponivel='Não',
            falha_modulo_internacoes='Sim' if falha_inter else 'Não',
            data_1a_avaliacao_cardio=primeira_cardio.strftime('%d/%m/%Y') if primeira_cardio else None,
            avaliacoes_cardio=len(cardio.get(pront, [])),
            total_evolucoes=d.get('totalEvolucoes'),
        ))

    os.makedirs(args.out, exist_ok=True)
    for nome, dados in [('dataset_pacientes.csv', pacientes), ('dataset_internacoes.csv', internacoes)]:
        caminho = os.path.join(args.out, nome)
        colunas = list(max(dados, key=len).keys())
        with open(caminho, 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=colunas, extrasaction='ignore')
            w.writeheader()
            for linha in dados:
                w.writerow({c: linha.get(c, '') for c in colunas})
        print(f'{caminho}: {len(dados)} linhas')


if __name__ == '__main__':
    main()
