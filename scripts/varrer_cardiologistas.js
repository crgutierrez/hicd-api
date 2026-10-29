#!/usr/bin/env node
/**
 * Amplia o marco amostral: varre a população internada procurando QUALQUER
 * evolução com `atividade = CARDIOLOGISTA`, não só as da Dra. Vera.
 *
 * Por que força bruta: o HICD não tem consulta global de evoluções por
 * profissional ou especialidade. O módulo `SIADT/5599` ("Produção
 * Profissionais") filtra por CPF e por área de **SADT** (laboratório, imagem,
 * ECG) — não cobre evolução clínica. Sondado e descartado em 17/09/2026.
 *
 * Busca só as evoluções (sem cadastro, internações, SAME ou BE), o que torna
 * cada paciente muito mais barato que a coleta completa.
 *
 * Uso: setsid nohup node scripts/varrer_cardiologistas.js > output/epidemio/varredura.log 2>&1 &
 */
require('dotenv').config();
const fs = require('fs');
const HICDCrawler = require('../hicd-crawler-refactored.js');

const SAIDA = 'output/epidemio/varredura_cardio.json';
const PRESC = 'docs/prescricoes_fev2024_dez2025.csv';
const CSV_VERA = 'docs/DRA_VERA_HICD_2024_2025.csv';

function alvos() {
    const jaNoMarco = new Set(
        fs.readFileSync(CSV_VERA, 'utf8').split('\n').slice(1)
          .map(l => (l.match(/^"?(\d+)"?,/) || [])[1]).filter(Boolean));
    const vistos = new Set();
    for (const linha of fs.readFileSync(PRESC, 'utf8').split('\n').slice(1)) {
        const c = linha.split(';');
        if (c.length < 6) continue;
        const reg = (c[5] || '').trim();
        if (/^\d+$/.test(reg) && !jaNoMarco.has(reg)) vistos.add(reg);
    }
    return [...vistos];
}

(async () => {
    const crawler = new HICDCrawler();
    await crawler.login();

    let achados = {};
    if (fs.existsSync(SAIDA)) achados = JSON.parse(fs.readFileSync(SAIDA, 'utf8'));

    const fila = alvos().filter(r => !(r in achados));
    console.log(`varrendo ${fila.length} pacientes fora do marco (${Object.keys(achados).length} em cache)`);

    let n = 0, comCardio = 0;
    for (const reg of fila) {
        try {
            const evs = await crawler.getEvolucoes(reg);
            const cardio = (Array.isArray(evs) ? evs : []).filter(
                e => /CARDIOLOG/i.test(e.atividade || ''));
            if (cardio.length) {
                const profs = [...new Set(cardio.map(e => (e.profissional || '').trim()))];
                achados[reg] = { n: cardio.length, profissionais: profs,
                                 datas: cardio.map(e => e.data).filter(Boolean).slice(0, 40) };
                comCardio++;
                console.log(`  ACHOU ${reg}: ${cardio.length} evo — ${profs.join(' / ')}`);
            } else {
                achados[reg] = { n: 0 };
            }
        } catch (e) {
            achados[reg] = { erro: e.message };
        }
        if (++n % 50 === 0) {
            fs.writeFileSync(SAIDA, JSON.stringify(achados), 'utf8');
            console.log(`  ... ${n}/${fila.length} — com cardiologista: ${comCardio}`);
        }
    }
    fs.writeFileSync(SAIDA, JSON.stringify(achados), 'utf8');
    const positivos = Object.entries(achados).filter(([, v]) => v.n > 0);
    console.log(`\nFIM — ${positivos.length} pacientes FORA do marco têm evolução de cardiologista`);
    const porProf = {};
    for (const [, v] of positivos) for (const p of (v.profissionais || [])) porProf[p] = (porProf[p] || 0) + 1;
    for (const [p, c] of Object.entries(porProf).sort((a, b) => b[1] - a[1])) console.log(`   ${c}  ${p}`);
    process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
