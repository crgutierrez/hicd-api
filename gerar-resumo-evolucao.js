#!/usr/bin/env node
/**
 * gerar-resumo-evolucao.js
 *
 * Recebe evoluções médicas (JSON da API HICD ou texto livre) e grava/atualiza
 * nota estruturada em vault/hicd-bot/Pacientes/<nome> - <prontuario>.md
 *
 * Uso:
 *   node gerar-resumo-evolucao.js --prontuario 26052 [--token TOKEN] [--api http://localhost:3000]
 *   echo '<json>' | node gerar-resumo-evolucao.js
 *   node gerar-resumo-evolucao.js <arquivo.json>
 *   node gerar-resumo-evolucao.js --texto <arquivo.txt>
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── Constantes ──────────────────────────────────────────────────────────────

const VAULT_DIR = path.join(__dirname, 'vault', 'hicd-bot', 'Pacientes');

const PALAVRAS_PENDENCIA = [
    'aguardo', 'aguardando', 'pendente', 'solicitado', 'programado',
    'a avaliar', 'encaminhado para', 'aguardo resultado', 'a realizar',
    'marcado para', 'para agendar', 'em aberto', 'agendado para',
    'solicitamos', 'solicitei', 'aguardar', 'resultado pendente',
    'ainda sem resultado', 'sem resultado', 'em andamento',
];

const PALAVRAS_EXAME = [
    'hemograma', 'cultura', 'hemocultura', 'urina', 'urocultura',
    'resultado', 'exame', 'laboratorial', 'laboratoriais', 'radiografia',
    'raio-x', 'rx ', 'tomografia', 'tc ', 'ressonância', 'rnm', 'ultrassom',
    'ecografia', 'ecocardiograma', 'eco ', 'pcr', 'proteína c reativa',
    'biopsia', 'biópsia', 'anatomopatológico', 'swab', 'sorologias',
    'coagulograma', 'gasometria', 'eletrólitos', 'função renal', 'creatinina',
    'ureia', 'transaminases', 'enzimas', 'imagem',
];

const PALAVRAS_AVALIACAO = [
    'parecer', 'interconsulta', 'avaliação', 'avaliado por', 'retorno',
    'especialidade', 'especialista', 'cirurgia', 'oncologia', 'cardiologia',
    'neurologia', 'nefrologia', 'infectologia', 'pneumologia', 'hematologia',
    'endocrinologia', 'reumatologia', 'gastroenterologia', 'ortopedia',
    'urologia', 'oftalmologia', 'otorrinolaringologia', 'fisioterapia',
    'nutrição', 'psicologia', 'assistência social', 'fonoaudiologia',
    'dentista', 'odontologia', 'geriatria', 'pediatria', 'neonatologia',
];

const PALAVRAS_PROCEDIMENTO = [
    'cirurgia', 'procedimento', 'punção', 'cateterismo', 'cateter',
    'acesso venoso', 'passagem de', 'coleta', 'transfusão', 'hemoderivado',
    'diálise', 'hemodiálise', 'ventilação', 'intubação', 'traqueostomia',
    'gastrostomia', 'sondagem', 'sonda', 'dreno', 'drenagem', 'biópsia',
    'biopsia', 'transferência', 'alta', 'internação', 'intervenção',
];

// ─── Utilitários de data ─────────────────────────────────────────────────────

function parseDateBR(str) {
    if (!str) return null;
    const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function soData(str) {
    if (!str) return str;
    const m = String(str).match(/(\d{2}\/\d{2}\/\d{4})/);
    return m ? m[1] : str;
}

function calcularDiasInternado(dataEntrada, dataReferencia) {
    const entrada = parseDateBR(dataEntrada);
    const referencia = parseDateBR(dataReferencia);
    if (!entrada || !referencia) return 'não calculável com os dados fornecidos';
    const diff = Math.floor((referencia - entrada) / 86400000);
    if (diff < 0) return 'não calculável com os dados fornecidos';
    return `${diff} dia${diff !== 1 ? 's' : ''}`;
}

function dataHoje() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ─── Seleção da evolução mais recente ────────────────────────────────────────

function maisRecente(evolucoes) {
    if (!evolucoes || evolucoes.length === 0) return null;
    return evolucoes.slice().sort((a, b) => {
        const da = parseDateBR(a.dataEvolucao || a.dataReferencia);
        const db = parseDateBR(b.dataEvolucao || b.dataReferencia);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
    })[0];
}

// ─── Extração de campos da evolução ─────────────────────────────────────────

function extrairHipoteses(evolucao) {
    const dados = evolucao.dadosClinicosEstruturados || evolucao.dadosEstruturados || {};

    if (dados.hipotesesDiagnosticas && dados.hipotesesDiagnosticas.length > 0) {
        return dados.hipotesesDiagnosticas;
    }

    // Fallback: extrair do texto via regex
    const texto = evolucao.textoCompleto || evolucao.descricao || evolucao.conteudo?.textoCompleto || '';
    const regexes = [
        /hipóteses?\s+diagnósticas?[^:]*:\s*([\s\S]*?)(?=\n\s*\n|\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ►▶\*#]|$)/i,
        /hipóteses?\s+diagnósticas?\s+atuais?[^:\n]*[\n:]([\s\S]*?)(?=\n\s*\n|\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ►▶\*#]|$)/i,
        /►\s*hipóteses?[^:]*:([\s\S]*?)(?=\n\s*\n|►|\n[A-Z]{3}|$)/i,
    ];

    for (const re of regexes) {
        const m = texto.match(re);
        if (m) {
            return m[1].trim()
                .split(/\n/)
                .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
                .filter(Boolean);
        }
    }

    return [];
}

function extrairMedicacoes(evolucao) {
    const dados = evolucao.dadosClinicosEstruturados || evolucao.dadosEstruturados || {};

    if (dados.medicamentos?.length > 0) return dados.medicamentos;
    if (dados.medicamentosEmUso?.length > 0) return dados.medicamentosEmUso;

    const texto = evolucao.textoCompleto || evolucao.descricao || evolucao.conteudo?.textoCompleto || '';
    const re = /(?:em uso|medicações? em uso|medicamentos? em uso)[^:]*:\s*([\s\S]*?)(?=\n\s*\n|►|\nfez uso|\nconduta|\n[A-ZÁÉÍÓÚ]{4}|$)/i;
    const m = texto.match(re);
    if (m) {
        return m[1].trim()
            .split(/\n/)
            .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
            .filter(Boolean);
    }

    return [];
}

function extrairConduta(evolucao) {
    const dados = evolucao.dadosClinicosEstruturados || evolucao.dadosEstruturados || {};

    if (dados.conduta) return Array.isArray(dados.conduta) ? dados.conduta.join('\n') : String(dados.conduta).trim();

    const texto = evolucao.textoCompleto || evolucao.descricao || evolucao.conteudo?.textoCompleto || '';
    const re = /(?:►\s*)?conduta[^:]*:\s*([\s\S]*?)(?=\n\s*\n|►|\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}[^a-z]|$)/i;
    const m = texto.match(re);
    if (m) return m[1].trim();

    return '';
}

// ─── Classificação de pendências ─────────────────────────────────────────────

function classificarPendencia(frase) {
    const f = frase.toLowerCase();

    if (PALAVRAS_EXAME.some(p => f.includes(p))) return 'exames';
    if (PALAVRAS_PROCEDIMENTO.some(p => f.includes(p))) return 'procedimentos';
    if (PALAVRAS_AVALIACAO.some(p => f.includes(p))) return 'avaliacoes';
    return 'outras';
}

function extrairPendencias(evolucoes) {
    const pendencias = { exames: [], avaliacoes: [], procedimentos: [], outras: [] };
    const vistas = new Set();

    const textos = evolucoes.map(e =>
        e.textoCompleto || e.descricao || e.conteudo?.textoCompleto || ''
    );

    for (const texto of textos) {
        // 1. Seção "Pendências:" explícita
        const secRe = /pendências?[^:]*:\s*([\s\S]*?)(?=\n\s*\n|►|\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ►]{4,}:|$)/i;
        const secMatch = texto.match(secRe);
        if (secMatch) {
            secMatch[1].trim().split(/\n/).forEach(linha => {
                const item = linha.replace(/^[-•*\d.)\s]+/, '').trim();
                if (item && !vistas.has(item.toLowerCase())) {
                    vistas.add(item.toLowerCase());
                    const cat = classificarPendencia(item);
                    pendencias[cat].push(item);
                }
            });
        }

        // 2. Busca por palavras-gatilho em todas as linhas
        texto.split(/\n/).forEach(linha => {
            const linhaNorm = linha.toLowerCase();
            if (PALAVRAS_PENDENCIA.some(p => linhaNorm.includes(p))) {
                const item = linha.replace(/^[-•*\d.)\s]+/, '').trim();
                if (item.length > 10 && !vistas.has(item.toLowerCase())) {
                    vistas.add(item.toLowerCase());
                    const cat = classificarPendencia(item);
                    pendencias[cat].push(item);
                }
            }
        });
    }

    return pendencias;
}

// ─── Verificação de links no vault ──────────────────────────────────────────

function buscarLinksVault(nome) {
    const links = [];
    const candidatos = [
        { arquivo: `Análise de hipóteses - ${nome}.md`, link: `[[Análise de hipóteses - ${nome}]]` },
        { arquivo: `Análise de exames - ${nome}.md`, link: `[[Análise de exames - ${nome}]]` },
        { arquivo: `Resumo evolutivo - ${nome}.md`, link: `[[Resumo evolutivo - ${nome}]]` },
    ];

    // Busca também no diretório raiz do vault
    const vaultRaiz = path.join(__dirname, 'vault', 'hicd-bot');

    for (const c of candidatos) {
        const caminhos = [
            path.join(VAULT_DIR, c.arquivo),
            path.join(vaultRaiz, c.arquivo),
        ];
        if (caminhos.some(p => fs.existsSync(p))) {
            links.push(c.link);
        }
    }

    return links;
}

// ─── Renderização do template ─────────────────────────────────────────────────

function renderizarNota({ nome, prontuario, leito, hipotesePrincipal, dataEntrada, diasInternado,
    dataUltimaEvolucao, infoEvolucoes, hipoteses, medicacoes, conduta, pendencias, links, hoje, notaExistente }) {

    const fmtLista = (items, fallback = 'não referido') =>
        items && items.length > 0
            ? items.map(i => `- ${i}`).join('\n')
            : `- ${fallback}`;

    const fmtPendenciaCat = (items, cat) => {
        if (!items || items.length === 0) {
            const msgs = {
                exames: 'Nenhum exame pendente identificado.',
                avaliacoes: 'Nenhuma avaliação/parecer pendente identificado.',
                procedimentos: 'Nenhum procedimento pendente identificado.',
                outras: 'Não há outras pendências descritas na última evolução.',
            };
            return msgs[cat] || 'não referido';
        }
        return items.map(i => `- ${i}`).join('\n');
    };

    const linksSection = links.length > 0
        ? links.map(l => `- ${l}`).join('\n')
        : 'Não foram encontradas análises relacionadas no vault.';

    // Preservar histórico de atualizações se a nota já existir
    let historico = `- ${hoje} — Nota criada com base na evolução de ${dataUltimaEvolucao}.`;
    if (notaExistente) {
        const m = notaExistente.match(/## Histórico de atualizações\s*\n([\s\S]*)$/);
        if (m) {
            const linhasAnteriores = m[1].trim();
            historico = `${linhasAnteriores}\n- ${hoje} — Nota atualizada com base na evolução de ${dataUltimaEvolucao}.`;
        }
    }

    return `# ${nome} — Resumo de Evolução

## Folha de rosto

| Campo | Informação |
|---|---|
| Nome | ${nome} |
| Prontuário | ${prontuario} |
| Leito | ${leito || 'não referido'} |
| Hipótese diagnóstica principal | ${hipotesePrincipal || 'não referido'} |
| Data de entrada | ${dataEntrada || 'não referido'} |
| Dias internado | ${diasInternado} |
| Última atualização | ${dataUltimaEvolucao || 'não referido'} |

---

## Resumo do último dia de evolução

Data da evolução analisada: ${dataUltimaEvolucao || 'não referido'}${infoEvolucoes ? ` (${infoEvolucoes})` : ''}

### Hipóteses diagnósticas

${fmtLista(hipoteses, 'não referido')}

### Medicações em uso

${fmtLista(medicacoes, 'não referido')}

### Última conduta

${conduta || 'Conduta não referida na última evolução.'}

### Pendências

#### Exames

${fmtPendenciaCat(pendencias.exames, 'exames')}

#### Avaliações / pareceres

${fmtPendenciaCat(pendencias.avaliacoes, 'avaliacoes')}

#### Procedimentos / intervenções

${fmtPendenciaCat(pendencias.procedimentos, 'procedimentos')}

#### Outras pendências

${fmtPendenciaCat(pendencias.outras, 'outras')}

---

## Links de análise

${linksSection}

---

## Histórico de atualizações

${historico}
`;
}

// ─── Processamento de entrada JSON ──────────────────────────────────────────

function processarJSON(dados) {
    // Suporta várias formas de resposta da API
    let nome = null, prontuario = null, dataEntrada = null;
    let evolucoes = [];

    // Formato: { paciente: {...}, evolucoes: [...] }  (endpoint /analise ou /evolucoes)
    if (dados.paciente) {
        nome = dados.paciente.nome || dados.paciente.nomePaciente;
        prontuario = dados.paciente.prontuario || dados.paciente.pacienteId;
        dataEntrada = dados.paciente.dataInternacao;
    }

    // Formato: { data: { paciente: {...}, evolucoes: [...] } }  (resposta padrão da API)
    if (dados.data) {
        const d = dados.data;
        if (d.paciente) {
            nome = nome || d.paciente.nome || d.paciente.nomePaciente;
            prontuario = prontuario || d.paciente.prontuario || d.paciente.pacienteId;
            dataEntrada = dataEntrada || d.paciente.dataInternacao;
        }
        if (d.evolucoes) evolucoes = d.evolucoes;
        if (d.ultimaEvolucao) evolucoes = [d.ultimaEvolucao];
        if (d.ultimoDia) evolucoes = Array.isArray(d.ultimoDia) ? d.ultimoDia : [d.ultimoDia];
        if (d.nome) { nome = nome || d.nome; prontuario = prontuario || d.prontuario; dataEntrada = dataEntrada || d.dataInternacao; }
    }

    // Formato: array direto de evoluções
    if (Array.isArray(dados)) {
        evolucoes = dados;
    }

    // Formato: { success, prontuario, data: [...] }  (endpoint /evolucoes direto)
    if (!evolucoes.length && dados.success !== undefined && Array.isArray(dados.data)) {
        evolucoes = dados.data;
        prontuario = prontuario || dados.prontuario;
    }

    // Formato: array em dados.evolucoes
    if (!evolucoes.length && Array.isArray(dados.evolucoes)) evolucoes = dados.evolucoes;
    if (!evolucoes.length && Array.isArray(dados.ultimoDia)) evolucoes = dados.ultimoDia;

    // Formato: evolução única
    if (!evolucoes.length && (dados.dataEvolucao || dados.descricao || dados.textoCompleto)) {
        evolucoes = [dados];
    }

    // Tenta extrair nome/prontuário da própria evolução
    if (!nome && evolucoes.length > 0) {
        nome = evolucoes[0].nomePaciente || evolucoes[0].nome;
        prontuario = prontuario || evolucoes[0].pacienteId || evolucoes[0].prontuario;
    }

    if (!nome || !prontuario) {
        throw new Error('Não foi possível identificar nome e prontuário nos dados fornecidos.\n' +
            'Formatos suportados: { paciente, evolucoes }, { data: { paciente, evolucoes } }, array de evoluções.');
    }

    return { nome: String(nome).trim().toUpperCase(), prontuario: String(prontuario).trim(), dataEntrada, evolucoes };
}

// ─── Processamento de texto livre ────────────────────────────────────────────

function processarTextoLivre(texto) {
    const extrair = (re) => { const m = texto.match(re); return m ? m[1].trim() : null; };

    const nome = extrair(/(?:paciente|nome)[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]+?)(?:\n|,|prontuário|pront)/i)
        || extrair(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,})+)/m);

    const prontuario = extrair(/pront[uú]ário[:\s#]+(\d+)/i)
        || extrair(/prontu[aá]rio[:\s]*(\d+)/i)
        || extrair(/n[uú]mero[:\s]+(\d+)/i);

    const dataEntrada = extrair(/(?:data\s+de\s+internação|data\s+internação|dih)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    const clinicaLeito = extrair(/clinica\s*\/\s*leito[:\s]+([^\n]+)/i)
        || extrair(/leito[:\s]+([^\n]+)/i);
    const dataEvolucao = extrair(/data\s+(?:da\s+)?evolução[:\s]+(\d{2}\/\d{2}\/\d{4})/i)
        || extrair(/(\d{2}\/\d{2}\/\d{4})/);

    const evolucao = {
        dataEvolucao,
        clinicaLeito,
        textoCompleto: texto,
        dadosClinicosEstruturados: {},
    };

    return {
        nome: (nome || 'PACIENTE NÃO IDENTIFICADO').toUpperCase(),
        prontuario: prontuario || '000000',
        dataEntrada,
        evolucoes: [evolucao],
    };
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

function gerarResumo(dados) {
    const { nome, prontuario, dataEntrada, evolucoes } = dados;

    const evolucaoRef = maisRecente(evolucoes);
    if (!evolucaoRef) throw new Error('Nenhuma evolução encontrada nos dados.');

    const dataUltimaEvolucao = soData(evolucaoRef.dataEvolucao || evolucaoRef.dataReferencia) || 'não referido';
    const leito = evolucaoRef.clinicaLeito || null;

    const diasInternado = calcularDiasInternado(dataEntrada, dataUltimaEvolucao);

    // Considera apenas evoluções do mesmo dia da mais recente para pendências
    const evolucoesDoDia = evolucoes.filter(e =>
        soData(e.dataEvolucao || e.dataReferencia) === dataUltimaEvolucao
    );
    const evolucoesPendencia = evolucoesDoDia.length > 0 ? evolucoesDoDia : [evolucaoRef];

    const hipoteses = extrairHipoteses(evolucaoRef);
    const medicacoes = extrairMedicacoes(evolucaoRef);
    const conduta = extrairConduta(evolucaoRef);
    const pendencias = extrairPendencias(evolucoesPendencia);
    const links = buscarLinksVault(nome);

    const infoEvolucoes = evolucoesDoDia.length > 1
        ? `${evolucoesDoDia.length} evoluções registradas`
        : null;

    // Verificar nota existente
    const nomeArquivo = `${nome} - ${prontuario}.md`;
    const caminhoNota = path.join(VAULT_DIR, nomeArquivo);
    let notaExistente = null;
    if (fs.existsSync(caminhoNota)) {
        notaExistente = fs.readFileSync(caminhoNota, 'utf8');
    }

    const conteudo = renderizarNota({
        nome,
        prontuario,
        leito,
        hipotesePrincipal: hipoteses[0] || null,
        dataEntrada,
        diasInternado,
        dataUltimaEvolucao,
        infoEvolucoes,
        hipoteses,
        medicacoes,
        conduta,
        pendencias,
        links,
        hoje: dataHoje(),
        notaExistente,
    });

    // Criar diretório se não existir
    if (!fs.existsSync(VAULT_DIR)) {
        fs.mkdirSync(VAULT_DIR, { recursive: true });
    }

    fs.writeFileSync(caminhoNota, conteudo, 'utf8');

    return { caminhoNota, nome, prontuario, notaExistente: !!notaExistente };
}

// ─── Fetch HTTP ───────────────────────────────────────────────────────────────

function fetchJSON(url, token) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const opts = { headers: { Authorization: token } };
        lib.get(url, opts, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error(`Resposta inválida de ${url}: ${body.slice(0, 200)}`)); }
            });
        }).on('error', reject);
    });
}

async function buscarDadosAPI(prontuario, token, apiBase) {
    console.log(`Buscando dados do prontuário ${prontuario}...`);
    const [resPaciente, resEvolucoes] = await Promise.all([
        fetchJSON(`${apiBase}/api/pacientes/${prontuario}`, token),
        fetchJSON(`${apiBase}/api/pacientes/${prontuario}/evolucoes?formato=detalhado&limite=10`, token),
    ]);

    if (!resPaciente.success) throw new Error(`Paciente não encontrado: ${JSON.stringify(resPaciente)}`);
    if (!resEvolucoes.success) throw new Error(`Erro ao buscar evoluções: ${JSON.stringify(resEvolucoes)}`);

    const p = resPaciente.data;
    return {
        nome: p.dadosBasicos?.nome || p.nome || 'NÃO IDENTIFICADO',
        prontuario: String(prontuario),
        dataEntrada: p.internacao?.dataInternacao || null,
        evolucoes: resEvolucoes.data || [],
    };
}

// ─── Leitura de entrada ───────────────────────────────────────────────────────

function lerEntrada(args) {
    // Argumento posicional sem flags
    const flagless = args.filter(a => !a.startsWith('--'));
    if (flagless.length > 0 && args[0] !== '--texto') {
        const arquivo = flagless[0];
        if (!fs.existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);
        return { conteudo: fs.readFileSync(arquivo, 'utf8'), modoTexto: false };
    }

    if (args[0] === '--texto' && args[1]) {
        const arquivo = args[1];
        if (!fs.existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);
        return { conteudo: fs.readFileSync(arquivo, 'utf8'), modoTexto: true };
    }

    // stdin
    return { conteudo: fs.readFileSync('/dev/stdin', 'utf8'), modoTexto: false };
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--prontuario' && argv[i + 1]) { args.prontuario = argv[++i]; }
        else if (argv[i] === '--token' && argv[i + 1]) { args.token = argv[++i]; }
        else if (argv[i] === '--api' && argv[i + 1]) { args.api = argv[++i]; }
        else if (argv[i] === '--texto' && argv[i + 1]) { args.texto = argv[++i]; }
        else if (!argv[i].startsWith('--')) { args.arquivo = argv[i]; }
    }
    return args;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const argv = process.argv.slice(2);

    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(`
Uso: node gerar-resumo-evolucao.js [opções] [arquivo]

  --prontuario N     Busca dados direto da API (recomendado)
  --token TOKEN      Token de autorização (padrão: gera do .env)
  --api URL          Base da API (padrão: http://localhost:3000)
  <arquivo>          JSON da API HICD ou texto livre
  --texto <arquivo>  Forçar interpretação como texto livre
  (sem argumentos)   Lê JSON do stdin

Exemplos:
  node gerar-resumo-evolucao.js --prontuario 26052
  node gerar-resumo-evolucao.js --prontuario 26052 --token "TOKEN"
  node gerar-resumo-evolucao.js evolucoes.json
  curl .../evolucoes | node gerar-resumo-evolucao.js
`);
        process.exit(0);
    }

    const args = parseArgs(argv);
    const apiBase = args.api || 'http://localhost:3000';

    let dadosExtraidos;

    // Modo --prontuario: busca tudo da API automaticamente
    if (args.prontuario) {
        let token = args.token;
        if (!token) {
            // Gerar token do .env
            try {
                const crypto = require('crypto');
                const key = Buffer.from(process.env.LOGIN_ENCRYPT_KEY, 'hex');
                const iv = crypto.randomBytes(12);
                const ci = crypto.createCipheriv('aes-256-gcm', key, iv);
                const enc = Buffer.concat([ci.update(`${process.env.HICD_USERNAME}:${process.env.HICD_PASSWORD}`, 'utf8'), ci.final()]);
                token = Buffer.concat([iv, ci.getAuthTag(), enc]).toString('base64');
            } catch (e) {
                console.error('Não foi possível gerar token do .env:', e.message);
                console.error('Passe --token TOKEN manualmente.');
                process.exit(1);
            }
        }
        try {
            dadosExtraidos = await buscarDadosAPI(args.prontuario, token, apiBase);
        } catch (e) {
            console.error('Erro ao buscar dados da API:', e.message);
            process.exit(1);
        }
    } else {
        // Modo arquivo/stdin
        let conteudo, modoTexto = !!args.texto;
        try {
            if (args.texto) {
                if (!fs.existsSync(args.texto)) throw new Error(`Arquivo não encontrado: ${args.texto}`);
                conteudo = fs.readFileSync(args.texto, 'utf8');
            } else if (args.arquivo) {
                if (!fs.existsSync(args.arquivo)) throw new Error(`Arquivo não encontrado: ${args.arquivo}`);
                conteudo = fs.readFileSync(args.arquivo, 'utf8');
            } else {
                conteudo = fs.readFileSync('/dev/stdin', 'utf8');
            }
        } catch (e) {
            console.error('Erro ao ler entrada:', e.message);
            process.exit(1);
        }

        try {
            if (modoTexto) {
                dadosExtraidos = processarTextoLivre(conteudo);
            } else {
                try {
                    const json = JSON.parse(conteudo);
                    dadosExtraidos = processarJSON(json);
                } catch {
                    dadosExtraidos = processarTextoLivre(conteudo);
                }
            }
        } catch (e) {
            console.error('Erro ao processar dados:', e.message);
            process.exit(1);
        }
    }

    try {
        const { caminhoNota, nome, prontuario, notaExistente } = gerarResumo(dadosExtraidos);
        const acao = notaExistente ? 'atualizada' : 'criada';
        console.log(`Nota ${acao}: ${caminhoNota}`);
        console.log(`Paciente: ${nome} (prontuário ${prontuario})`);
    } catch (e) {
        console.error('Erro ao gerar nota:', e.message);
        process.exit(1);
    }
}

main().catch(e => { console.error(e.message); process.exit(1); });
