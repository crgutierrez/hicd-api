/**
 * Testes do cabeçalho da prescrição (imprime.php, layout novo).
 *
 * Contexto (2026-10-29): `peso` e `dataPrescricao` vinham vazios em toda
 * prescrição. O HTML traz os dois — "PESO: 21.6 Kg/g" (ponto decimal, que o
 * regex [\d,]+ não aceitava) e "PRESCRIÇÃO MÉDICA registrada em: DD/MM/AAAA HH:MM"
 * (o regex procurava "válida para", que só existe no layout antigo).
 *
 * Trecho com a mesma estrutura do HTML real; nome e números fictícios.
 *
 * Runner: node --test (Node >= 18). Sem dependências externas nem rede.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const cheerio = require('cheerio');

const PrescricaoParser = require('../src/parsers/prescricao-parser');

const LAYOUT_NOVO = `<html><body><table>
<tr><td>Hospital Infantil Cosme e damião</td>
<td><span class="titulo-prescricao"><b>
    PRESCRI&Ccedil;&Atilde;O
    M&Eacute;DICA
    registrada em:
                        28/10/2026 09:56
</b></span></td></tr>
<tr><td class="paciente-linha"><b>NOME:</b> FULANA DE TAL <b>REG/BE:</b> 12345</td></tr>
<tr><td class="paciente-linha"><b>CNS:</b> 898000000000000</td>
<td colspan="2" class="paciente-linha">
    <b>PESO:</b>
                            21.6
                            Kg/g
    &nbsp;&nbsp;
    <b>ALT:</b>
                            Cm
    &nbsp;&nbsp;
    <b>SC:</b>
                            Sc
</td></tr>
</table>
<span class="assinatura-registro">Prescrição registrada em: 28/10/2026 09:56</span>
</body></html>`;

function cabecalho(html) {
    const parser = new PrescricaoParser();
    const detalhes = {};
    parser.extrairCabecalhoPrescricao(cheerio.load(html), detalhes);
    return detalhes.cabecalho;
}

test('layout novo: dataPrescricao vem do "registrada em", com hora', () => {
    const c = cabecalho(LAYOUT_NOVO);
    assert.strictEqual(c.dataPrescricao, '28/10/2026 09:56');
    assert.strictEqual(c.validaPara, '');
});

test('layout novo: peso com ponto decimal e unidade como veio', () => {
    const c = cabecalho(LAYOUT_NOVO);
    assert.strictEqual(c.peso, '21.6 Kg/g');
    assert.strictEqual(c.pesoValor, '21.6');
    assert.strictEqual(c.pesoUnidade, 'Kg/g');
});

test('layout novo: ALT e SC sem valor ficam vazios (não capturam a unidade)', () => {
    const c = cabecalho(LAYOUT_NOVO);
    assert.strictEqual(c.altura, '');
    assert.strictEqual(c.superficieCorporal, '');
});

test('ALT e SC preenchidos são lidos', () => {
    const html = LAYOUT_NOVO
        .replace('<b>ALT:</b>\n                            Cm', '<b>ALT:</b> 112 Cm')
        .replace('<b>SC:</b>\n                            Sc', '<b>SC:</b> 0.82 Sc');
    const c = cabecalho(html);
    assert.strictEqual(c.altura, '112');
    assert.strictEqual(c.superficieCorporal, '0.82');
});

test('layout antigo: "válida para" e peso com vírgula continuam funcionando', () => {
    const html = '<html><body>Hospital X PRESCRIÇÃO válida para 08/09/2025 NOME: FULANO REGISTRO/BE: 1 PESO: 12,5 Kg</body></html>';
    const c = cabecalho(html);
    assert.strictEqual(c.dataPrescricao, '08/09/2025');
    assert.strictEqual(c.validaPara, '08/09/2025');
    assert.strictEqual(c.peso, '12,5 Kg');
    assert.strictEqual(c.pesoUnidade, 'Kg');
});

test('sem PESO no HTML → campos vazios, sem quebrar', () => {
    const c = cabecalho('<html><body>NOME: FULANO REG/BE: 1</body></html>');
    assert.strictEqual(c.peso, '');
    assert.strictEqual(c.pesoValor, '');
    assert.strictEqual(c.dataPrescricao, '');
});
