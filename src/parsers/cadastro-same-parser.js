const BaseParser = require('./base-parser');

/**
 * Parser do cadastro do SAME (Param=SSAME&ParamModule=pesq_Pront_Reg).
 *
 * É a única fonte no HICD com **raça/cor**, **deficiência** e **código IBGE do
 * município** — o cadastro do prontuário (CONSPAC_OPEN) não traz esses campos.
 *
 * A resposta é uma linha única com 27 campos separados por "|", na ordem em que
 * o formulário do SAME os consome.
 *
 * Aviso de cobertura: na amostra de 200 prontuários, 79% estavam com raça/cor
 * "não informado" — o campo é marcado como obrigatório no formulário mas aceita
 * ficar em branco.
 */
const SEXO = { '1': 'M', '3': 'F' };
const RACA_COR = { '0': 'Não informado', '1': 'Branca', '2': 'Negra', '3': 'Parda', '4': 'Amarela', '5': 'Indígena' };
const DEFICIENCIA = {
    '0': 'Não informado', '000': 'Sem deficiência', '001': 'Auditiva', '002': 'Visual',
    '003': 'Física', '004': 'Intelectual', '005': 'Psicossocial', '006': 'Múltipla',
};
const NACIONALIDADE = { '10': 'Brasileiro', '20': 'Naturalizado brasileiro' };

class CadastroSameParser extends BaseParser {

    parse(resposta) {
        const bruto = String(resposta || '').trim();
        if (!bruto || bruto === 'nao' || !bruto.includes('|')) {
            this.debug('cadastro do SAME vazio ou paciente não encontrado');
            return null;
        }
        const a = bruto.split('|');
        const v = (i) => (a[i] || '').trim();
        return {
            nome: v(0),
            cns: v(1),
            nomeSocial: v(4) || null,
            sexoCodigo: v(5),
            sexo: SEXO[v(5)] || null,
            racaCorCodigo: v(6),
            racaCor: RACA_COR[v(6)] || null,
            etniaCodigo: v(7) || null,
            deficienciaCodigo: v(8),
            deficiencia: DEFICIENCIA[v(8)] || null,
            telefone: v(10) || null,
            cep: v(11) || null,
            uf: v(12),
            municipioIbge: v(13),
            logradouro: v(14),
            numero: v(15) || null,
            bairro: v(17),
            nacionalidadeCodigo: v(18),
            nacionalidade: NACIONALIDADE[v(18)] || v(18),
            naturalidadeUf: v(19) || null,
            cpf: v(20) || null,
            dataNascimento: v(21),
            nomeMae: v(25) || null,
        };
    }
}

module.exports = CadastroSameParser;
module.exports.TABELAS = { SEXO, RACA_COR, DEFICIENCIA, NACIONALIDADE };
