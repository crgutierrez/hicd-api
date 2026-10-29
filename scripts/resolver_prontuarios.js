#!/usr/bin/env node
/**
 * Resolve o `registro` do CSV da Dra. Vera para o prontuário do HICD.
 *
 * Existe por causa da Lei 1 do estudo: a coluna-chave do
 * `docs/DRA_VERA_HICD_2024_2025.csv` chama-se `registro`, e passá-la direto
 * para a coleta é o que produziu o paciente fantasma 21640 — o módulo de
 * evoluções aceita o número, devolve 750 evoluções, e grava um raw_*.json sem
 * cadastro nenhum. Coleta que não confirma identidade é coleta falhada.
 *
 * A confirmação é `CONSPAC_OPEN` devolver um cadastro **com nome**. Não existe
 * TIPOBUSCA=REG (testado); os valores válidos são PRONT e BE.
 *
 * Uso:
 *   node scripts/resolver_prontuarios.js                 # todos os registros do CSV
 *   node scripts/resolver_prontuarios.js --registros A,B  # lista explícita
 *   node scripts/resolver_prontuarios.js --so-faltantes   # pula os já resolvidos
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const HICDCrawler = require('../hicd-crawler-refactored.js');

const CSV = 'docs/DRA_VERA_HICD_2024_2025.csv';
const SAIDA = 'output/epidemio/registro_para_prontuario.json';

const arg = (nome, padrao) => {
    const i = process.argv.indexOf(`--${nome}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};
const tem = (nome) => process.argv.includes(`--${nome}`);

function registrosDoCsv() {
    const txt = fs.readFileSync(CSV, 'utf8');
    const vistos = new Set();
    // A primeira coluna é sempre "registro", entre aspas.
    for (const linha of txt.split('\n').slice(1)) {
        const m = linha.match(/^"?(\d+)"?,/);
        if (m) vistos.add(m[1]);
    }
    return [...vistos];
}

(async () => {
    const crawler = new HICDCrawler();
    await crawler.login();

    let mapa = {};
    if (fs.existsSync(SAIDA)) mapa = JSON.parse(fs.readFileSync(SAIDA, 'utf8'));

    let alvos = arg('registros', '') ? arg('registros', '').split(',').map(s => s.trim()).filter(Boolean)
                                     : registrosDoCsv();
    if (tem('so-faltantes')) alvos = alvos.filter(r => !mapa[r]);

    console.log(`resolvendo ${alvos.length} registros (${Object.keys(mapa).length} já em cache)`);
    let ok = 0, falhou = 0;

    for (const reg of alvos) {
        try {
            const cad = await crawler.getPacienteCadastro(reg);
            const db = (cad && cad.dadosBasicos) || {};
            if (db.nome) {
                mapa[reg] = {
                    prontuario: String(db.prontuario || reg),
                    nome: db.nome,
                    nascimento: db.dataNascimento || null,
                    sexo: db.sexo || null,
                    resolvido: true,
                };
                ok++;
            } else {
                mapa[reg] = { prontuario: null, nome: null, resolvido: false,
                              motivo: 'CONSPAC_OPEN devolveu cadastro sem nome' };
                falhou++;
                console.log(`  NÃO RESOLVIDO  registro=${reg}`);
            }
        } catch (e) {
            mapa[reg] = { prontuario: null, nome: null, resolvido: false, motivo: e.message };
            falhou++;
            console.log(`  ERRO  registro=${reg}: ${e.message}`);
        }
        if ((ok + falhou) % 25 === 0) {
            fs.writeFileSync(SAIDA, JSON.stringify(mapa, null, 1), 'utf8');
            console.log(`  ... ${ok + falhou}/${alvos.length}  (ok=${ok} falhou=${falhou})`);
        }
    }

    fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
    fs.writeFileSync(SAIDA, JSON.stringify(mapa, null, 1), 'utf8');

    const naoResolvidos = Object.entries(mapa).filter(([, v]) => !v.resolvido).map(([k]) => k);
    const divergentes = Object.entries(mapa).filter(([k, v]) => v.resolvido && v.prontuario !== k);
    console.log(`\nresolvidos ${ok} | falharam ${falhou}`);
    console.log(`NÃO RESOLVIDOS (${naoResolvidos.length}): ${naoResolvidos.join(', ')}`);
    console.log(`registro != prontuario (${divergentes.length}): ${divergentes.map(([k, v]) => `${k}->${v.prontuario}`).join(', ')}`);
    console.log(`\n-> ${SAIDA}`);
    process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
