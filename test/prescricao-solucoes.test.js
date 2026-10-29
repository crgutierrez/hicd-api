/**
 * Testes da hidratação venosa e da sedação estruturadas na prescrição.
 *
 * Contexto (2026-10-29): as linhas "Hidratação:" e "Sedação:" da seção
 * MEDICAÇÃO eram lidas como medicamento comum — o nome saía do primeiro
 * "[...]" do texto ("42,7- 40,6", "3") e os componentes ficavam só no texto
 * bruto. A sedação ainda reaparecia em `observacoes`. Textos no formato real
 * do HB, sem dados de paciente.
 *
 * Runner: node --test (Node >= 18). Sem dependências externas nem rede.
 */
const { test } = require('node:test');
const assert = require('node:assert');

const PrescricaoParser = require('../src/parsers/prescricao-parser');

const HV_PARAMS_NO_TOPO = `Hidratação: TH: 40 [42,7- 40,6 ]  | TIG: 3  (5 GG) [14,2]  | NA [3]  | K [0]  | CA [000]

Periodo: 24/24 horas;
SG 5% ---------------- 34 ML
GH 50% --------------- 6,7 ML
NaCl 10% ----------- 2 ML
KCL10% --------------  0 ML
Gluc Ca 10% ------ 0ML

VT:  46,8 ML - CORRER EV EM 1,7ML/H EM BIC`;

const HV_PARAMS_NO_FIM = `Hidratação: PESO: 870 g; HV PARA 24 HORAS

SG5% ------------------------ 60,5 ML
GH50% ---------------------- 6,5 ML
(300) GLUC CA 10% ----- 2,6 ML

TH: 80 (69,6 - 67); TIG 5 [9,3]
VOLUME TOTAL: 69,6 ML - VAZÃO: 2,9 ML/H`;

const SEDACAO = `Sedação: Periodo: 24/24 horas;
SG 5% ------------------ 3ML
[3] Fentanil --------- 1,8 ML

TOTAL: 4,8 ML , CORRER 0,2 ML/H  EV`;

const p = new PrescricaoParser();

test('hidratação: parâmetros, período, componentes e vazão', () => {
    const s = p.extrairSolucao(HV_PARAMS_NO_TOPO);
    assert.strictEqual(s.tipo, 'hidratacao');
    assert.strictEqual(s.periodo, '24/24 horas');
    assert.deepStrictEqual(s.parametros, { TH: '40 [42,7- 40,6 ]', TIG: '3 (5 GG) [14,2]', NA: '[3]', K: '[0]', CA: '[000]' });
    assert.strictEqual(s.componentes.length, 5);
    assert.deepStrictEqual(s.componentes[1], { nome: 'GH 50%', dose: '', volume: '6,7', unidade: 'ML' });
    assert.deepStrictEqual(s.componentes[4], { nome: 'Gluc Ca 10%', dose: '', volume: '0', unidade: 'ML' });
    assert.strictEqual(s.volumeTotal, '46,8');
    assert.strictEqual(s.vazao, '1,7');
    assert.strictEqual(s.vazaoUnidade, 'ML/H');
});

test('hidratação: dose entre parênteses e parâmetros depois dos componentes', () => {
    const s = p.extrairSolucao(HV_PARAMS_NO_FIM);
    assert.strictEqual(s.periodo, '24 HORAS');
    assert.strictEqual(s.parametros.PESO, '870 g');
    assert.strictEqual(s.parametros.TH, '80 (69,6 - 67)');
    assert.strictEqual(s.parametros.TIG, '5 [9,3]');
    assert.deepStrictEqual(s.componentes[2], { nome: 'GLUC CA 10%', dose: '300', volume: '2,6', unidade: 'ML' });
    assert.strictEqual(s.volumeTotal, '69,6');
    assert.strictEqual(s.vazao, '2,9');
});

test('sedação: componente com ":" no nome e poucos traços', () => {
    const s = p.extrairSolucao('Sedação: Periodo: 24/24 horas;\n[3] Fentanil --------- 1,8 ML\n[0,3] MidazolAM: ---1,8 ML\n\nTOTAL: 7,2 ML , CORRER 0,3 ML/H  EV');
    assert.deepStrictEqual(s.componentes[1], { nome: 'MidazolAM', dose: '0,3', volume: '1,8', unidade: 'ML' });
    assert.strictEqual(s.vazao, '0,3');
});

test('sedação: dose entre colchetes, total e vazão', () => {
    const s = p.extrairSolucao(SEDACAO);
    assert.strictEqual(s.tipo, 'sedacao');
    assert.deepStrictEqual(s.componentes, [
        { nome: 'SG 5%', dose: '', volume: '3', unidade: 'ML' },
        { nome: 'Fentanil', dose: '3', volume: '1,8', unidade: 'ML' },
    ]);
    assert.strictEqual(s.volumeTotal, '4,8');
    assert.strictEqual(s.vazao, '0,2');
    assert.deepStrictEqual(s.parametros, {});
});

function prescricaoLayoutNovo(linhasMedicacao) {
    const linhas = linhasMedicacao.map(([n, txt, hor]) =>
        `<tr><td class='col-numero'><label class='valorV3'><b>${n}-</b></label></td>` +
        `<td class='col-descricao'><label class='valorV3'>${txt.replace(/\n/g, '<br>\n')}</label></td>` +
        `<td class='col-separador'></td><td class='col-horario'><label class='valorV3'><b>${n}</b>-${hor}</label></td></tr>`
    ).join('');
    return `<html><body><table class="tabela-prescricao">
<tr class='header-secao'><td colspan='3'><label class='valorV3'><b>MEDICA&Ccedil;&Atilde;O: LEGENDA</b></label></td><td></td></tr>
${linhas}
<tr class='header-secao'><td colspan='3'><label class='valorV3'><b>CUIDADOS GERAIS</b></label></td><td></td></tr>
<tr><td class='col-numero'><label class='valorV3'><b>1-</b></label></td><td class='col-descricao'><label class='valorV3'>ROTINA DE PESAGEM</label></td><td></td><td></td></tr>
</table></body></html>`;
}

test('prescrição: soluções vão para hidratacao/sedacao, com nome certo em medicamentos', () => {
    const html = prescricaoLayoutNovo([
        ['1', '[CITRATO DE CAFEINA SOL. INJ. 20MG/ML - 1ML]&nbsp;&nbsp;10MG/KG/D,&nbsp;&nbsp;EV,&nbsp;&nbsp;24/24&nbsp;Horas,&nbsp;&nbsp;3&nbsp;/&nbsp;', ''],
        ['2', `<b>Hidratação:</b> ${HV_PARAMS_NO_TOPO.replace(/^Hidratação: /, '')}`, 'CONTÍNUA'],
        ['3', `<b>Sedação:</b> ${SEDACAO.replace(/^Sedação: /, '')}`, 'CONTINUA'],
    ]);
    const d = p.parsePrescricaoDetalhes(html, 'x');

    assert.strictEqual(d.hidratacao.length, 1);
    assert.strictEqual(d.hidratacao[0].numero, '2');
    assert.strictEqual(d.hidratacao[0].horario, 'CONTÍNUA');
    assert.strictEqual(d.sedacao.length, 1);
    assert.strictEqual(d.sedacao[0].componentes[1].nome, 'Fentanil');

    const nomes = d.medicamentos.map(m => m.nome);
    assert.deepStrictEqual(nomes, ['CITRATO DE CAFEINA SOL. INJ. 20MG/ML - 1ML', 'Hidratação venosa', 'Sedação']);
    assert.strictEqual(d.medicamentos[1].tipo, 'hidratacao');
});

test('prescrição: sedação não reaparece em observacoes', () => {
    const html = prescricaoLayoutNovo([['1', `<b>Sedação:</b> ${SEDACAO.replace(/^Sedação: /, '')}`, 'CONTINUA']]);
    const d = p.parsePrescricaoDetalhes(html, 'x');
    assert.deepStrictEqual(d.observacoes.filter(o => o.tipo === 'Sedação'), []);
});

test('prescrição: "Hidratação:" em branco é ignorada (formulário vazio)', () => {
    const html = prescricaoLayoutNovo([['1', '<b>Hidratação:</b> ', 'CONTÍNUA']]);
    const d = p.parsePrescricaoDetalhes(html, 'x');
    assert.strictEqual(d.hidratacao.length, 0);
    assert.strictEqual(d.medicamentos.length, 0);
});
