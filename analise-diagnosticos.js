#!/usr/bin/env node

require('dotenv').config();
const crypto = require('crypto');
const http = require('http');

const API_BASE = 'http://localhost:3000';
const OLLAMA_URL = 'http://85.31.61.1:32768';
const OLLAMA_MODEL = 'llama3:latest';
const CLINICA_ID = process.argv[2] || '001';

// Gera o token de autorização AES-256-GCM
function gerarAuthToken() {
  const key = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const ci = crypto.createCipheriv('aes-256-gcm', key, iv);
  const usuario = `${process.env.HICD_USERNAME}:${process.env.HICD_PASSWORD}`;
  const encrypted = Buffer.concat([ci.update(usuario, 'utf8'), ci.final()]);
  const tag = ci.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// Requisição HTTP genérica retornando Promise com JSON
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.setTimeout(60000, () => {
      req.destroy(new Error('Timeout na requisição: ' + url));
    });

    req.end();
  });
}

// Requisição para o Ollama (pode demorar — timeout de 5 min)
function ollamaGenerate(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    });

    const urlObj = new URL(OLLAMA_URL);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ response: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(300000, () => {
      req.destroy(new Error('Timeout Ollama'));
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  const authToken = gerarAuthToken();
  const authHeaders = { Authorization: authToken };

  console.log(`\n=== Buscando pacientes da clínica ${CLINICA_ID} ===\n`);

  // 1. Busca lista de pacientes
  const resPacientes = await request(
    `${API_BASE}/api/clinicas/${CLINICA_ID}/pacientes`,
    { headers: authHeaders }
  );

  if (!resPacientes.success) {
    console.error('Erro ao buscar pacientes:', resPacientes);
    process.exit(1);
  }

  const pacientes = resPacientes.data || resPacientes.pacientes || [];
  console.log(`Encontrados ${pacientes.length} pacientes.\n`);

  // 2. Para cada paciente, busca evoluções e consulta o Ollama
  for (const paciente of pacientes) {
    const prontuario = paciente.prontuario || paciente.codigo || paciente.id;
    const nome = paciente.nome || paciente.name || '(sem nome)';

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Paciente: ${nome} | Prontuário: ${prontuario}`);
    console.log(`${'─'.repeat(60)}`);

    // Busca evoluções
    let evolucoes = [];
    try {
      const resEvo = await request(
        `${API_BASE}/api/pacientes/${prontuario}/evolucoes?formato=detalhado`,
        { headers: authHeaders }
      );

      if (resEvo.success) {
        evolucoes = resEvo.data || resEvo.evolucoes || [];
        console.log(`  ${evolucoes.length} evoluções encontradas.`);
      } else {
        console.warn(`  Aviso: ${resEvo.message || 'Erro ao buscar evoluções'}`);
      }
    } catch (err) {
      console.warn(`  Erro ao buscar evoluções: ${err.message}`);
    }

    if (evolucoes.length === 0) {
      console.log('  Sem evoluções. Pulando...');
      continue;
    }

    // Serializa evoluções para o prompt
    const textoEvolucoes = evolucoes
      .slice(0, 10) // limita para não estourar o contexto do modelo
      .map((e, i) => {
        const data = e.dataEvolucao || e.data || '';
        const profissional = e.profissional || '';
        const texto = e.descricao || e.textoLimpo || e.texto || JSON.stringify(e);
        return `[Evolução ${i + 1}] ${data} — ${profissional}\n${texto}`;
      })
      .join('\n\n');

    const prompt =
      `A seguir estão as evoluções clínicas do paciente ${nome} (prontuário ${prontuario}):\n\n` +
      `${textoEvolucoes}\n\n` +
      `A partir dessa lista de evoluções, recupere a ultima evolução médica e indique as hipoteses diagnósticas do paciente.`;

    console.log(`  Consultando Ollama (${OLLAMA_MODEL})...`);

    try {
      const ollamaRes = await ollamaGenerate(prompt);
      const resposta = ollamaRes.response || '(sem resposta)';
      console.log(`\n  Resposta do Ollama:\n`);
      console.log(resposta.split('\n').map(l => '  ' + l).join('\n'));
    } catch (err) {
      console.error(`  Erro Ollama: ${err.message}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Análise concluída.');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
