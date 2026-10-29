/**
 * Testes do mapeamento de colunas da lista de pacientes por clínica.
 *
 * Contexto (2026-10-29): no Hospital de Base a lista tem uma coluna "Clínica"
 * antes do Leito. Lida por posição, `leito` vinha "UTI - NEONATAL", o leito
 * real ia para `cid` e a data de internação para `diasInternacao` — e a busca
 * por leito não achava ninguém no HB. O parser passou a ler pelo cabeçalho.
 *
 * Estrutura igual à do HTML real; nomes e prontuários fictícios.
 *
 * Runner: node --test (Node >= 18). Sem dependências externas nem rede.
 */
const { test } = require('node:test');
const assert = require('node:assert');

const PacienteParser = require('../src/parsers/paciente-parser');

// HICD: cabeçalho em <td> na primeira linha, acentos como entidade HTML.
const HICD = `<table class="table">
<tr><td>Nome</td><td>Prontu&aacute;rio</td><td>Leito</td><td>CID</td>
<td>Data Interna&ccedil;&atilde;o</td><td>Dias Internados</td><td>Registro Eletr&ocirc;nico</td><td>Obs</td><td>Kanban</td></tr>
<tr><td>FULANA DE TAL</td><td>11111</td><td>007.007-0001</td><td></td><td>25/10/2026 16:33</td><td>4</td><td></td><td></td><td></td></tr>
<tr><td>BELTRANO DA SILVA</td><td>22222</td><td>007.007-0003</td><td>EPILEPSIA</td><td>25/10/2026 11:33</td><td>4</td><td></td><td></td><td></td></tr>
</table>`;

// HB: cabeçalho em <thead><th>, com a coluna "Clínica" antes do Leito.
const HB = `<table class="table">
<thead><tr><th>
  Nome
</th><th>Prontuário</th><th>Clínica</th><th>Leito</th><th>CID</th>
<th class="center">
  Data Internação
</th><th class="center">Dias Internados</th><th class="center">Registro Eletrônico</th><th class="center">Obs.</th><th class="center">Kanban</th></tr></thead>
<tr><td>RN DE FULANA</td><td>33333</td><td>UTI - NEONATAL</td><td>008.046-0018</td><td></td><td>29/10/2026 10:44</td><td>0</td><td></td><td></td><td></td></tr>
<tr><td>RN DE CICLANA</td><td>44444</td><td>UTI - NEONATAL</td><td>008.046-0003</td><td>P07.1</td><td>28/10/2026 06:05</td><td>1</td><td></td><td></td><td></td></tr>
</table>`;

const parse = (html, clinica) => new PacienteParser().parse(html, clinica);

test('HB: leito vem da coluna "Leito", não da "Clínica"', () => {
    const [p] = parse(HB, '008');
    assert.strictEqual(p.prontuario, '33333');
    assert.strictEqual(p.leito, '008.046-0018');
    assert.strictEqual(p.clinicaLeito, '008.046-0018');
    assert.strictEqual(p.leitoNumero, '18');
    assert.strictEqual(p.clinicaNome, 'UTI - NEONATAL');
});

test('HB: CID, data de internação e dias nas colunas certas', () => {
    const [a, b] = parse(HB, '008');
    assert.strictEqual(a.cid, null);
    assert.strictEqual(b.cid, 'P07.1');
    assert.strictEqual(a.diasInternacao, '0');
    assert.ok(a.dataInternacao, 'dataInternacao não pode ficar vazia');
    assert.match(String(a.dataInternacao), /2026-10-29/);
});

test('HICD: layout sem "Clínica" continua igual', () => {
    const [a, b] = parse(HICD, '007');
    assert.strictEqual(a.leito, '007.007-0001');
    assert.strictEqual(a.leitoNumero, '1');
    assert.strictEqual(a.clinicaNome, null);
    assert.strictEqual(b.cid, 'EPILEPSIA');
    assert.strictEqual(b.diasInternacao, '4');
    assert.match(String(b.dataInternacao), /2026-10-25/);
});

test('sem cabeçalho reconhecível cai na leitura por posição', () => {
    const html = `<table>
<tr><td>x</td><td>y</td></tr>
<tr><td>FULANO</td><td>55555</td><td>012.012-0007</td><td>M</td><td>01/10/2026 08:00</td><td>28</td></tr>
</table>`;
    const [p] = parse(html, '012');
    assert.strictEqual(p.leito, '012.012-0007');
    assert.strictEqual(p.leitoNumero, '7');
    assert.strictEqual(p.diasInternacao, '28');
});

test('leito fora do padrão de código não ganha leitoNumero', () => {
    const html = HICD.replace('007.007-0001', 'G7');
    const [p] = parse(html, '007');
    assert.strictEqual(p.leito, 'G7');
    assert.strictEqual(p.leitoNumero, null);
});
