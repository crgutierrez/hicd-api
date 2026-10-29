#!/usr/bin/env node
/**
 * Mede a lacuna REAL do marco amostral (erro M1).
 *
 * A varredura por `atividade = CARDIOLOGISTA` (varrer_cardiologistas.js) achou
 * só 6 pacientes novos no biênio — ou seja, o marco captura ~99% de quem foi
 * AVALIADO pela cardiologia. Mas ela é cega, por construção, para a lacuna que
 * importa: **cardiopata que nunca recebeu parecer no período**. Uma criança com
 * CIV conhecida internada por pneumonia não gera evolução de cardiologista
 * nenhuma, e some do estudo.
 *
 * Este script varre os mesmos pacientes procurando TERMO de cardiopatia em
 * QUALQUER evolução, de qualquer profissional — inclusive laudo externo
 * transcrito em nota da pediatria (ex.: "PO canal arterial (Ji-Paraná)").
 *
 * Uso: setsid nohup node scripts/varrer_termos_cardio.js > output/epidemio/termos.log 2>&1 &
 */
require('dotenv').config();
const fs = require('fs');
const HICDCrawler = require('../hicd-crawler-refactored.js');

const SAIDA = 'output/epidemio/varredura_termos.json';
const PRESC = 'docs/prescricoes_fev2024_dez2025.csv';
const CSV_VERA = 'docs/DRA_VERA_HICD_2024_2025.csv';
const L = 'a-zà-öø-ÿA-ZÀ-ÖØ-Þ';
const NB = `(?<![${L}])`, NA = `(?![${L}])`;

// Só termos ESTRUTURAIS de cardiopatia congênita. Deliberadamente estreito:
// aqui o custo de falso positivo é leitura humana desperdiçada.
const TERMOS = [
    ['CIV', `comunica[çc][ãa]o\\s+interventricular|${NB}civ${NA}`],
    ['CIA', `comunica[çc][ãa]o\\s+interatrial|${NB}cia${NA}|ostium\\s+(secundum|primum)`],
    // `PCA` sozinho NAO serve: no laboratorio do HICD "PCA" e PROCALCITONINA,
    // nao persistencia do canal arterial. Aparece como "PCA 0,36" no meio de
    // uma lista de exames e respondeu por 75% dos achados deste termo na
    // primeira varredura (53 de 71). Exige-se que nao venha seguido de numero.
    // E ha uma SEGUNDA sigla homonima: na historia obstetrica, `G3PCA0` e a
    // formula Gesta-Para-Cesarea-Aborto. Dai o lookbehind (?<![G]\\d).
    ['canal arterial', `canal\\s+arterial|ductus\\s+arterioso|(?<![G]\\d)${NB}pca${NA}(?!\\s*[:=]?\\s*\\d)`],
    ['Fallot', `fallot|tetralogia`],
    ['transposição', `transposi[çc][ãa]o\\s+das\\s+grandes|${NB}tga${NA}|jatene`],
    ['atresia', `atresia\\s+(tric[úu]spide|pulmonar|a[óo]rtica|mitral)`],
    ['coarctação', `coarcta[çc][ãa]o`],
    ['hipoplasia', `hipoplasia\\s+d[oe]\\s+(cora[çc][ãa]o|ventr[íi]culo|ao?rta)|${NB}shce${NA}`],
    ['ventrículo único', `ventr[íi]culo\\s+[úu]nico|univentricular|${NB}glenn${NA}|${NB}fontan${NA}|${NB}blalock${NA}`],
    ['Ebstein', `ebstein`],
    ['drenagem anômala', `drenagem\\s+an[óo]mala|conex[ãa]o\\s+venosa\\s+an[óo]mala`],
    ['truncus', `truncus|tronco\\s+arterioso`],
    ['cardiopatia congênita', `cardiopatia\\s+cong[êe]nita|cardiopata\\s+cong`],
    ['cardiopatia operada', `${NB}pa(?:tc|ct)h${NA}[^.\\n]{0,50}(?:septo|interventricular|interatrial)|ventriculoplastia|atriosseptoplastia|${NB}pot${NA}\\s+ci[va]`],
];
const RE = TERMOS.map(([r, p]) => [r, new RegExp(p, 'i')]);
// Ruído conhecido: "CIA" em FARMÁCIA já é tratado pela fronteira acentuada;
// "CIV" de citomegalovírus e Fontan de FONTANELA precisam de exclusão: sem a fronteira acentuada,
// `fontan` casa com "fontanela", presente no exame neurológico de todo
// lactente — foram 10 falsos positivos nos primeiros 150 pacientes.
// "Ebstein Baar" é Epstein-Barr com a grafia trocada — aparece assim no painel
// sorológico do HICD e casava com a anomalia de Ebstein.
const RUIDO = /citomegalov|CIV\s*Ig[GM]|fontanela|e[bp]stein[\s-]?ba+r|farm[áa]cia/i;

function limpo(t) {
    // Hífen de quebra de linha: o HICD parte palavras no fim da linha e
    // "SEM RESISTÊN-\nCIA" passava a casar com o termo `CIA`. A fronteira
    // acentuada não ajuda — o hífen É uma fronteira. Remendar antes de casar.
    return String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
        .replace(/([a-zà-öø-ÿA-ZÀ-ÖØ-Þ])-\s*\n\s*([a-zà-öø-ÿA-ZÀ-ÖØ-Þ])/g, '$1$2');
}
function noBienio(d) {
    const m = String(d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m && (m[3] === '2024' || m[3] === '2025');
}

function alvos() {
    const marco = new Set(fs.readFileSync(CSV_VERA, 'utf8').split('\n').slice(1)
        .map(l => (l.match(/^"?(\d+)"?,/) || [])[1]).filter(Boolean));
    const v = new Set();
    for (const linha of fs.readFileSync(PRESC, 'utf8').split('\n').slice(1)) {
        const c = linha.split(';');
        if (c.length < 6) continue;
        const reg = (c[5] || '').trim();
        if (/^\d+$/.test(reg) && !marco.has(reg)) v.add(reg);
    }
    return [...v];
}

(async () => {
    const crawler = new HICDCrawler();
    await crawler.login();
    let res = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, 'utf8')) : {};
    const fila = alvos().filter(r => !(r in res));
    console.log(`varrendo ${fila.length} pacientes por TERMO de cardiopatia`);
    let n = 0, achou = 0;
    for (const reg of fila) {
        try {
            const evs = await crawler.getEvolucoes(reg);
            const arr = Array.isArray(evs) ? evs : (evs && evs.evolucoes) || [];
            const hits = {};
            for (const e of arr) {
                if (!noBienio(e.dataEvolucao || e.data)) continue;
                const t = limpo(e.descricao);
                for (const [rot, re] of RE) {
                    if (hits[rot]) continue;
                    const m = re.exec(t);
                    if (!m) continue;
                    const jan = t.slice(Math.max(0, m.index - 80), m.index + 120);
                    if (RUIDO.test(jan)) continue;
                    hits[rot] = jan.replace(/\s+/g, ' ').trim().slice(0, 160);
                }
            }
            if (Object.keys(hits).length) {
                res[reg] = { termos: Object.keys(hits), evidencia: hits };
                achou++;
                console.log(`  ACHOU ${reg}: ${Object.keys(hits).join(', ')}`);
            } else res[reg] = { termos: [] };
        } catch (e) { res[reg] = { erro: e.message }; }
        if (++n % 100 === 0) {
            fs.writeFileSync(SAIDA, JSON.stringify(res), 'utf8');
            console.log(`  ... ${n}/${fila.length} — com termo: ${achou}`);
        }
    }
    fs.writeFileSync(SAIDA, JSON.stringify(res), 'utf8');
    const pos = Object.entries(res).filter(([, v]) => (v.termos || []).length);
    console.log(`\nFIM — ${pos.length} pacientes FORA do marco com termo de cardiopatia no biênio`);
    process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
