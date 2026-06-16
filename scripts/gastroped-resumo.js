#!/usr/bin/env node
require('dotenv').config();
const crypto = require('crypto');
const https = require('http');

const BASE = 'http://localhost:3000';
const PRONTUARIOS = [44826, 45136, 46798, 46863, 44787, 46659, 46953, 47012];
const GASTRO_RE = /WELLITON|JOANA\s+MAIA|GASTROPED|GASTROPEDIATRIA/i;

function getToken() {
  const k = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const ci = crypto.createCipheriv('aes-256-gcm', k, iv);
  const e = Buffer.concat([ci.update(`${process.env.HICD_USERNAME}:${process.env.HICD_PASSWORD}`, 'utf8'), ci.final()]);
  return Buffer.concat([iv, ci.getAuthTag(), e]).toString('base64');
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const req = https.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { Authorization: token } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function parseDate(s) {
  if (!s) return null;
  // "25/05/2026" or "2026-05-25T..."
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return new Date(s);
}

async function processPaciente(pront, token) {
  const [evRes, exRes] = await Promise.all([
    get(`/api/pacientes/${pront}/evolucoes?formato=detalhado&limite=100`, token),
    get(`/api/pacientes/${pront}/exames?formato=detalhado&incluirResultados=true`, token),
  ]);

  const evs = evRes.data || [];
  const exames = exRes.data || [];

  // Find last gastroped evolution
  const gastroEvs = evs.filter(e => {
    const prof = e.profissional || '';
    const atv = e.atividade || '';
    const desc = e.descricao || '';
    return GASTRO_RE.test(prof) || GASTRO_RE.test(atv) || GASTRO_RE.test(desc);
  });

  if (!gastroEvs.length) return null;

  const lastEv = gastroEvs[0];
  const lastEvDate = parseDate(lastEv.dataEvolucao);

  // Filter exams from lastEvDate to today
  const examesFiltrados = exames.filter(ex => {
    const d = parseDate(ex.data);
    return d && lastEvDate && d >= lastEvDate;
  });

  // Get patient name
  let nome = `Prontuário ${pront}`;
  try {
    const pRes = await get(`/api/pacientes/${pront}`, token);
    nome = pRes.data?.dadosBasicos?.nome || nome;
    const intern = pRes.data?.internacao || {};
    const leito = intern.numeroLeito || '';
    const clinica = intern.nomeClinica || '';
    nome = `${nome} — ${clinica} leito ${leito}`;
  } catch(_) {}

  return { pront, nome, lastEv, examesFiltrados };
}

function formatExames(exames) {
  if (!exames.length) return '  (nenhum exame neste período)';
  const lines = [];
  for (const ex of exames) {
    lines.push(`  📋 ${ex.data} ${ex.hora || ''} — ${ex.medico || ''}`);
    for (const r of (ex.resultados || [])) {
      if (r.status === 'bloco_textual') {
        // Extract key values from text blocks
        const val = r.valor.substring(0, 200);
        lines.push(`    ${r.sigla}: ${val}`);
      } else {
        const ind = r.analise?.indicador || '';
        const ref = r.referencia ? ` (VR: ${r.referencia})` : '';
        lines.push(`    ${r.sigla}: ${r.valor} ${r.unidade || ''}${ref} ${ind}`);
      }
    }
  }
  return lines.join('\n');
}

async function main() {
  const token = getToken();
  const results = [];

  for (const pront of PRONTUARIOS) {
    process.stderr.write(`Buscando ${pront}...\n`);
    try {
      const r = await processPaciente(pront, token);
      if (r) results.push(r);
    } catch(e) {
      process.stderr.write(`Erro ${pront}: ${e.message}\n`);
    }
  }

  for (const r of results) {
    const ev = r.lastEv;
    const block = [
      `👤 ${r.nome}`,
      `📅 Última evolução Gastroped: ${ev.dataEvolucao} — ${ev.profissional}`,
      ``,
      `📝 EVOLUÇÃO (literal):`,
      ev.descricao || '(sem texto)',
      ``,
      `🧪 EXAMES desde ${ev.dataEvolucao}:`,
      formatExames(r.examesFiltrados),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    console.log(JSON.stringify({ pront: r.pront, nome: r.nome, block }));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
