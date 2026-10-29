#!/usr/bin/env node
/**
 * Reaplica `resolverDesfecho()` sobre os raw_*.json já coletados.
 *
 * Existe pelo mesmo motivo do `reprocessar_obito.py`: os textos das evoluções
 * já estão em disco e só a regra mudou — refazer a coleta no HICD levaria horas
 * e sobrecarregaria o servidor à toa.
 *
 * **Substitui o `reprocessar_obito.py`**, que reescreveu a regex de óbito em
 * Python. As duas cópias divergiram de verdade: quando `OBITO_CONSTATADO`
 * ganhou "óbito confirmado", rodar o script Python depois deste apagou o óbito
 * recém-detectado da 38183. Aqui a regra vem do serviço — a mesma que a API usa.
 *
 * Recalcula tanto o desfecho de cada internação quanto o `obitoNoProntuario`.
 *
 * Uso:
 *   node scripts/reprocessar_desfecho.js            # simulação, não grava
 *   node scripts/reprocessar_desfecho.js --gravar   # grava nos raw_*.json
 */
const fs = require('fs');
const path = require('path');
const InternacaoService = require('../src/services/internacao-service');

const BASE = process.env.EPIDEMIO_DIR || 'output/epidemio';
const GRAVAR = process.argv.includes('--gravar');

const servico = new InternacaoService(null);

const arquivos = fs.readdirSync(BASE)
    .filter(f => /^raw_\d+\.json$/.test(f))
    .sort();

const antes = {};
const depois = {};
const mudancas = [];
const obitosNovos = [];
let comInternacoes = 0;

for (const nome of arquivos) {
    const caminho = path.join(BASE, nome);
    const dados = JSON.parse(fs.readFileSync(caminho, 'utf8'));
    const internacoes = dados.internacoes;
    if (!Array.isArray(internacoes)) continue;  // prontuário com HTTP 500 no Inter
    comInternacoes++;

    const relatorios = Array.isArray(dados.relatoriosAlta) ? dados.relatoriosAlta : [];
    const evolucoes = Array.isArray(dados.evolucoes) ? dados.evolucoes : [];
    let alterou = false;

    // Óbito no nível do prontuário: quando o módulo Inter devolve 500 não há
    // internação a que prender o desfecho, e o óbito sumiria do levantamento.
    const obitoProntuario = servico.detectarObito(evolucoes);
    if (JSON.stringify(obitoProntuario) !== JSON.stringify(dados.obitoNoProntuario)) {
        alterou = true;
        if (obitoProntuario && !dados.obitoNoProntuario) obitosNovos.push(dados.prontuario);
    }
    dados.obitoNoProntuario = obitoProntuario;

    for (const i of internacoes) {
        const anterior = i.desfecho || 'Sem informação';
        antes[anterior] = (antes[anterior] || 0) + 1;

        const r = servico.resolverDesfecho(i, relatorios, evolucoes);
        depois[r.desfecho] = (depois[r.desfecho] || 0) + 1;

        if (r.desfecho !== anterior || r.fonte !== i.fonteDesfecho) {
            alterou = true;
            mudancas.push({
                prontuario: dados.prontuario,
                nome: dados.cadastro?.dadosBasicos?.nome || '',
                entrada: i.entrada,
                saida: i.saida,
                setor: i.setor,
                de: anterior,
                para: r.desfecho,
                fonte: r.fonte,
            });
        }
        i.desfecho = r.desfecho;
        i.confiancaDesfecho = r.confianca;
        i.fonteDesfecho = r.fonte;
    }

    if (alterou && GRAVAR) {
        fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
    }
}

const total = Object.values(antes).reduce((a, b) => a + b, 0);
const pct = n => `${(100 * n / total).toFixed(1)}%`;
const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])].sort();

console.log(`${comInternacoes} prontuários com internações · ${total} internações\n`);
console.log('desfecho'.padEnd(18) + 'antes'.padStart(12) + 'depois'.padStart(12));
for (const k of chaves) {
    const a = antes[k] || 0, d = depois[k] || 0;
    console.log(k.padEnd(18) + `${a} (${pct(a)})`.padStart(12) + `${d} (${pct(d)})`.padStart(12));
}
console.log(`\n${mudancas.length} internações mudaram de desfecho.`);
if (obitosNovos.length) {
    console.log(`${obitosNovos.length} óbito(s) novo(s) no nível do prontuário: ${obitosNovos.join(', ')}`);
}

fs.writeFileSync(path.join(BASE, 'mudancas_desfecho.json'),
    JSON.stringify(mudancas, null, 2), 'utf8');
console.log(`Detalhe em ${path.join(BASE, 'mudancas_desfecho.json')}`);
console.log(GRAVAR ? '\nraw_*.json REGRAVADOS.' : '\nSimulação — nada gravado. Use --gravar.');
