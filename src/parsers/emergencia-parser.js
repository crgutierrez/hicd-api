const BaseParser = require('./base-parser');

/**
 * Parser do Boletim de Emergência (BE).
 *
 * O BE é a porta de entrada pela emergência e a única fonte, no HICD, de motivo
 * da entrada, CID do atendimento e classificação de risco do protocolo de
 * Manchester.
 *
 * O BE marca a **chegada**; o módulo Inter marca a **internação**. A defasagem
 * mediana entre os dois é de 48 minutos (p75 = 1,5 h), e 97% dos BEs têm uma
 * internação correspondente em até 24 h.
 */
class EmergenciaParser extends BaseParser {

    _decode(s) {
        return String(s || '')
            .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
            .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&atilde;/g, 'ã')
            .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&acirc;/g, 'â')
            .replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô').replace(/&Ecirc;/g, 'Ê')
            .replace(/&Oacute;/g, 'Ó').replace(/&Atilde;/g, 'Ã').replace(/&Ccedil;/g, 'Ç')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&times;/g, '×');
    }

    _achatar(html) {
        return this._decode(String(html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' | '))
            .replace(/(\s*\|\s*)+/g, ' | ').trim();
    }

    _campo(t, rotulo) {
        const m = t.match(new RegExp(`${rotulo}\\s*:?\\s*\\|\\s*([^|]{0,120})`, 'i'));
        return m ? (m[1].trim() || null) : null;
    }

    /** Números de BE do paciente, lidos do cadastro (CONSPAC_OPEN, TIPOBUSCA=PRONT). */
    parseListaBes(html) {
        return [...new Set([...String(html || '').matchAll(/getPacienteBE\("(\d+)"\)/g)].map(m => m[1]))];
    }

    /** Cabeçalho do atendimento (ParamModule=EvolucaoBe, TIPOBUSCA=BE). */
    parseCabecalho(html) {
        try {
            const t = this._achatar(html);
            return {
                motivo: this._campo(t, 'Motivo'),
                cid: this._campo(t, 'Cid'),
                cid1: this._campo(t, 'Cid1'),
                cid2: this._campo(t, 'Cid2'),
                chegada: this._campo(t, 'Entrada'),
                saida: this._campo(t, 'Saida'),
            };
        } catch (error) {
            this.error('Erro no parse do cabeçalho do BE:', error);
            return null;
        }
    }

    /**
     * Triagem (ParamModule=TRIAGEM, TIPOBUSCA=BE).
     *
     * O HTML lista as quatro cores do Manchester como opções fixas do
     * formulário; a cor efetiva é a que vem depois de "Classificação:", já no
     * registro preenchido. Quando a triagem não foi feita o módulo responde
     * "Nenhum registro encontrado" — e isso é o caso em 87% dos BEs.
     */
    parseTriagem(html) {
        try {
            const t = this._achatar(html);
            if (/Nenhum registro/i.test(t)) return null;
            const risco = t.match(/Classifica[çc][ãa]o\s*:\s*\|\s*(Vermelho|Amarelo|Verde|Azul)/i);
            const queixa = t.match(/Queixas?\s*:\s*([^|]{0,200}?)\s*(?:-\s*)?Classifica[çc][ãa]o/i);
            return {
                classificacaoRisco: risco ? risco[1] : null,
                queixa: queixa ? queixa[1].trim() : null,
                dataRegistro: this._campo(t, 'Data Registro'),
                profissional: this._campo(t, 'Profissional'),
                fc: this._campo(t, 'FC'),
                pressaoArterial: this._campo(t, 'Pressão Arterial'),
                peso: this._campo(t, 'Peso'),
                temperatura: this._campo(t, 'Temperatura'),
                spo2: this._campo(t, 'SPO2'),
                hgt: this._campo(t, 'HGT'),
                diabetico: this._campo(t, 'Diabético'),
                hipertenso: this._campo(t, 'Hipertenso'),
                alergico: this._campo(t, 'Alérgico'),
                doencasPreExistentes: this._campo(t, 'Doenças pré existentes'),
            };
        } catch (error) {
            this.error('Erro no parse da triagem:', error);
            return null;
        }
    }
}

module.exports = EmergenciaParser;
