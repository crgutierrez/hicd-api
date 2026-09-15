const BaseParser = require('./base-parser');

/**
 * Parser das internações (ParamModule=Inter) e dos relatórios de alta
 * (ParamModule=RALTA) do HICD.
 *
 * Dois pontos que valem saber antes de usar estes dados:
 *
 * 1. O campo `setor` do módulo Inter é o setor de **alta**, não o de entrada —
 *    bate com o último setor das evoluções em 67% dos casos e com o primeiro em
 *    22%. Para a porta de entrada e a movimentação interna é preciso ler o
 *    `clinicaLeito` das evoluções (56% das internações passam por 2+ setores).
 *
 * 2. O módulo Inter devolve HTTP 500 em prontuários muito longos (ele embute as
 *    evoluções dentro de cada internação e a resposta estoura). Ocorre em ~1%
 *    dos prontuários.
 */
class InternacaoParser extends BaseParser {

    /** Entidades HTML que o HICD usa nestes módulos. */
    _decode(s) {
        return String(s || '')
            .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
            .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&atilde;/g, 'ã')
            .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&acirc;/g, 'â')
            .replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô').replace(/&Aacute;/g, 'Á')
            .replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó')
            .replace(/&Atilde;/g, 'Ã').replace(/&Ccedil;/g, 'Ç').replace(/&Ecirc;/g, 'Ê')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    }

    /** Achata o HTML em texto com "|" separando as células, preservando a ordem. */
    _achatar(html) {
        return this._decode(String(html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' | '))
            .replace(/(\s*\|\s*)+/g, ' | ');
    }

    /** Só aceita o que tem forma de data — internação em curso não tem saída, e
     *  sem esta guarda o regex captura o rótulo seguinte como se fosse data. */
    _soData(v) {
        const t = String(v || '').trim();
        return /^\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2})?$/.test(t) ? t : null;
    }

    /**
     * Internações do paciente. Cada bloco começa em "Clínica:" e traz setor,
     * entrada, saída, CID de entrada e procedimento de entrada.
     */
    parseInternacoes(html) {
        try {
            const txt = this._achatar(html);
            const re = /Cl[íi]nica:\s*\|\s*([^|]+?)\s*\|\s*Entrada:\s*\|\s*([^|]*?)\s*\|\s*Sa[íi]da:\s*\|\s*([^|]*?)\s*\|/g;
            const internacoes = [];
            let m;
            while ((m = re.exec(txt)) !== null) {
                const cauda = txt.slice(m.index, m.index + 900);
                const cid = cauda.match(/CID DE ENTRADA\s*\|\s*([A-Z]\d{2,4})\s*\|?\s*:?\s*([^|]*)/i);
                const proc = cauda.match(/PROCEDIMENTOS DE ENTRADA\s*\|\s*([^|]*?)\s*\|\s*:\s*([^|]*)/i);
                const procTexto = proc ? (proc[2] || '').trim() : '';
                internacoes.push({
                    setorAlta: m[1].trim(),
                    entrada: this._soData(m[2]),
                    saida: this._soData(m[3]),
                    cidEntrada: cid ? cid[1].trim() : null,
                    cidDescricao: cid ? cid[2].trim() : null,
                    procedimentoEntrada: procTexto || null,
                    codigoProcedimentoEntrada: proc && proc[1].trim() !== '0' ? proc[1].trim() : null,
                });
            }
            this.debug(`${internacoes.length} internações extraídas`);
            return internacoes;
        } catch (error) {
            this.error('Erro no parse de internações:', error);
            return [];
        }
    }

    /**
     * Relatórios do módulo RALTA. Cada registro é delimitado pelo input oculto
     * co_ralta. O módulo guarda mais que resumos de alta: laudos médicos,
     * encaminhamentos ambulatoriais e relatórios de transferência também.
     */
    parseRelatoriosAlta(html) {
        try {
            const limpo = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
            if (/Nenhum registro encontrado/i.test(limpo)) return [];
            const blocos = limpo.split(/<input[^>]*name="co_ralta"[^>]*\/?>/).slice(1);
            return blocos.map(b => {
                const prof = b.match(/Profissional:<\/div>\s*<div[^>]*><b>([^<]*)<\/b>/);
                const data = b.match(/data_evo'>([^<]*)</);
                const texto = this._decode(b.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
                // O primeiro "Descrição:" é o do documento; alguns embutem um
                // laudo com um segundo rótulo mais adiante.
                const marca = texto.search(/Descri[çc][ãa]o:/);
                const corpo = (marca >= 0 ? texto.slice(marca).replace(/^Descri[çc][ãa]o:\s*/, '') : texto).trim();
                return {
                    profissional: prof ? prof[1].trim() : null,
                    dataRegistro: data ? data[1].trim() : null,
                    tipoDocumento: this.tipoDocumento(corpo),
                    texto,
                };
            }).filter(r => r.dataRegistro);
        } catch (error) {
            this.error('Erro no parse de relatórios de alta:', error);
            return [];
        }
    }

    /** O título na primeira linha é o sinal mais confiável do que o documento é. */
    tipoDocumento(corpo) {
        const cabeca = String(corpo || '').slice(0, 120).toUpperCase();
        if (/TRANSFER[EÊ]NCIA/.test(cabeca)) return 'Relatório de transferência';
        if (/RESUMO DE ALTA|RELAT[ÓO]RIO DE ALTA|ALTA HOSPITALAR/.test(cabeca)) return 'Resumo de alta';
        if (/ENCAMINHAMENTO/.test(cabeca)) return 'Encaminhamento';
        if (/LAUDO/.test(cabeca)) return 'Laudo médico';
        if (/[óO]BITO/.test(cabeca)) return 'Declaração de óbito';
        return 'Outro / não identificado';
    }

    /**
     * Catálogo de setores (Param=SIINF&ParamModule=237). A posição na lista é o
     * próprio código: o primeiro nome é o setor 001, o segundo é o 002 e assim
     * por diante.
     *
     * Use este catálogo, e não o censo de `getClinicas()`: o censo só devolve
     * setores com paciente internado no momento e omite as UIR 1, 2 e 3.
     */
    parseCatalogoSetores(html) {
        try {
            const nomes = [...String(html || '').matchAll(/align="left"><b>([^<]+)<\/b>/g)]
                .map(m => this._decode(m[1]).trim())
                .filter(Boolean);
            return nomes.map((nome, i) => ({ codigo: String(i + 1).padStart(3, '0'), nome }));
        } catch (error) {
            this.error('Erro no parse do catálogo de setores:', error);
            return [];
        }
    }
}

module.exports = InternacaoParser;
