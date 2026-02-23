const BaseParser = require('./base-parser');
const cheerio = require('cheerio');

// ─── Constantes pré-compiladas no nível do módulo ────────────────────────────

const WS_RE         = /\s+/g;
const ONLY_DIGITS   = /^\d+$/;
const DATE_LIKE     = /\d{1,2}\/\d{1,2}\/\d{4}/;
const HTML_TAG      = /<[^>]+>/g;          // strip de tags HTML inline
const HTML_ENTITY   = /&[a-z]+;|&#\d+;/gi; // entidades básicas

// ── Regex de tabela (lista de pacientes) ─────────────────────────────────────
// Cada regex global é resetada antes do uso (.lastIndex = 0)
const TABLE_RE   = /<table\b[^>]*>([\s\S]*?)<\/table>/i;
const TR_RE      = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const TD_RE      = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
const COMMENT_RE = /<!--[\s\S]*?-->/g;   // remove <td> dentro de comentários HTML
const ONCLICK_RE = /onclick=["']([^"']+)["']/i;
const HREF_RE    = /href=["']([^"']+)["']/i;

// ── Regex do cadastro (labels nos <p>) ───────────────────────────────────────
const RE_REGISTRO    = /Registro:\s*(.+)/;
const RE_NOME_MAE    = /Nome da m[ãa]e:\s*(.+)/i;
const RE_LOGRADOURO  = /Logradouro:\s*(.+)/;
const RE_BAIRRO      = /Bairro:\s*(.+)/;
const RE_TELEFONE    = /Telefone:\s*(.+)/;
const RE_BE          = /BE:\s*(\d+)/;
const RE_CNS         = /CNS:\s*(.+)/;
const RE_DOCUMENTO   = /Documento:\s*(.+)/;
const RE_NUMERO_END  = /N[úu]mero:\s*(.+)/;
const RE_MUNICIPIO   = /Munic[íi]pio:\s*(.+)/i;
const RE_RESPONSAVEL = /Respons[áa]vel:\s*(.+)/i;
const RE_CLINICA     = /Cl[ií]nica \/ Leito:\s*(.+)/;
const RE_LEITO_PARTS = /^(\d{3})-(.+?)\s+(\S+)$/;
const RE_NASCIMENTO  = /Nascimento:\s*(\d{2}\/\d{2}\/\d{4})/;
const RE_IDADE       = /Idade:\s*(.+?)(?:\s{2,}|$)/;
const RE_SEXO_LABEL  = /Sexo:\s*(\S+)/;
const RE_COMPLEMENTO = /Complemento:\s*(.+)/;
const RE_ESTADO      = /Estado:\s*(\w+)/;
const RE_CEP         = /CEP:\s*(\d+)/;

// ── Prontuário em onclick/href ────────────────────────────────────────────────
const PRONT_RE   = /prontuario[=:]?(\d+)/i;
const PATIENT_RE = /patient[_-]?id[=:]?(\d+)/i;
const CODIGO_RE  = /codigo[=:]?(\d+)/i;
const ID_RE      = /\bid[=:]?(\d+)/i;
const NUM_RE     = /(\d{4,})/;  // números longos como fallback

// ── Sexo: Set para O(1) ───────────────────────────────────────────────────────
const SEXO_MASC = new Set(['m', 'masculino', 'masc']);
const SEXO_FEM  = new Set(['f', 'feminino', 'fem']);
const SEXO_VALS = new Set([...SEXO_MASC, ...SEXO_FEM]);

// ─────────────────────────────────────────────────────────────────────────────

/** Extrai texto de um nó DOM cheerio sem criar wrapper $(el). */
function nodeText(el) {
    if (!el?.children) return '';
    let out = '';
    for (const child of el.children) {
        if (child.type === 'text')       out += child.data;
        else if (child.children?.length) out += nodeText(child);
    }
    return out.replace(WS_RE, ' ').trim();
}

/** Remove tags HTML, decodifica entidades (&nbsp; etc.) e normaliza espaços. */
function stripHtml(s) {
    return s.replace(HTML_TAG, ' ')
            .replace(/&[a-z#\d]+;/gi, ' ')   // &nbsp;, &amp;, &#160; → espaço
            .replace(WS_RE, ' ')
            .trim();
}

/**
 * Parser especializado para dados de pacientes do HICD.
 *
 * Estratégias de performance:
 *
 * parse() — lista de pacientes:
 *   1. Regex-first: extrai tabela → TR → TD sem construir DOM (~20× mais rápido)
 *   2. Fallback cheerio: para páginas com estrutura diferente (sem <table>)
 *   3. Memoização 1-entry por (html, codigoClinica)
 *
 * parsePacienteCadastro() — ficha individual:
 *   1. cheerio necessário (navegação .panel-body > .col-lg-* > p)
 *   2. nodeText() extrai texto sem re-wrapping $(el)
 *   3. Todas as RegExp pré-compiladas no módulo (evitam recompilação por loop)
 *   4. Dispatch por índice de label (evita múltiplos .includes() por <p>)
 *   5. Memoização 1-entry
 */
class PacienteParser extends BaseParser {
    constructor() {
        super();
        this._listHtml      = null;
        this._listClinica   = null;
        this._listResult    = null;
        this._cadastroHtml   = null;
        this._cadastroResult = null;
    }

    // ── Cadastro individual ──────────────────────────────────────────────────

    parsePacienteCadastro(html, pacienteId) {
        if (html === this._cadastroHtml) return this._cadastroResult;

        try {
            const $ = cheerio.load(html, { decodeEntities: true });
            this.debug(`Extraindo cadastro do paciente ${pacienteId}`);

            const c = {
                pacienteId,
                dadosBasicos: {},
                endereco:     {},
                contatos:     {},
                responsavel:  {},
                internacao:   {},
                documentos:   {}
            };

            const panelBody = $('.panel-body');
            if (panelBody.length > 0) {
                panelBody.find('.col-lg-3, .col-lg-4').each((_, colNode) => {
                    const isFirstCol = (colNode.attribs?.class || '').includes('col-lg-3');
                    for (const pNode of (colNode.children || [])) {
                        if (pNode.type !== 'tag' || pNode.name !== 'p') continue;
                        const txt = nodeText(pNode);
                        if (!txt) continue;
                        if (isFirstCol) this._col1(txt, c);
                        else            this._col234(txt, c);
                    }
                });
            }

            // Fallback: inputs hidden
            if (!c.dadosBasicos.nome) {
                const el = $('#pac_name').get(0);
                if (el) c.dadosBasicos.nome = (el.attribs?.value || '').trim();
            }
            if (!c.dadosBasicos.prontuario) {
                const el = $('#pac_pront').get(0);
                if (el) c.dadosBasicos.prontuario = (el.attribs?.value || '').trim();
            }

            this.debug(`Cadastro: nome=${c.dadosBasicos.nome}, leito=${c.internacao.clinicaLeito}`);
            this._cadastroHtml   = html;
            this._cadastroResult = c;
            return c;

        } catch (error) {
            this.error(`Erro ao parsear cadastro do paciente ${pacienteId}:`, error);
            return null;
        }
    }

    _col1(txt, c) {
        let m;
        if (txt.includes('Registro:') && (m = RE_REGISTRO.exec(txt)))
            c.dadosBasicos.prontuario = m[1].trim();
        else if (txt.includes('Nome da m') && (m = RE_NOME_MAE.exec(txt)))
            c.dadosBasicos.nomeMae = m[1].trim();
        else if (txt.startsWith('Nome:'))
            c.dadosBasicos.nome = txt.slice(5).trim();
        else if (txt.includes('Logradouro:') && (m = RE_LOGRADOURO.exec(txt)))
            c.endereco.logradouro = m[1].trim();
        else if (txt.includes('Bairro:') && (m = RE_BAIRRO.exec(txt)))
            c.endereco.bairro = m[1].trim();
        else if (txt.includes('Telefone:') && (m = RE_TELEFONE.exec(txt)))
            c.contatos.telefone = m[1].trim();
    }

    _col234(txt, c) {
        let m;
        if      (txt.includes('BE:')          && (m = RE_BE.exec(txt)))
            c.documentos.be = m[1];
        else if (txt.includes('CNS:')         && (m = RE_CNS.exec(txt)))
            c.documentos.cns = m[1].trim();
        else if (txt.includes('Documento:')   && (m = RE_DOCUMENTO.exec(txt)))
            c.documentos.documento = m[1].trim();
        else if (txt.includes('mero:')        && (m = RE_NUMERO_END.exec(txt)))
            c.endereco.numero = m[1].trim();
        else if (txt.includes('nic')          && (m = RE_MUNICIPIO.exec(txt)))
            c.endereco.municipio = m[1].trim();
        else if (txt.includes('pons')         && (m = RE_RESPONSAVEL.exec(txt)))
            c.responsavel.nome = m[1].trim();
        else if (txt.includes('Leito:')       && (m = RE_CLINICA.exec(txt))) {
            const s = m[1].trim();
            c.internacao.clinicaLeito = s;
            const lm = RE_LEITO_PARTS.exec(s);
            if (lm) {
                c.internacao.codigoClinica = lm[1];
                c.internacao.nomeClinica   = lm[2].trim();
                c.internacao.numeroLeito   = lm[3];
            }
        } else if (txt.includes('Nascimento:')) {
            if ((m = RE_NASCIMENTO.exec(txt)))  c.dadosBasicos.dataNascimento = this.parseDate(m[1]);
            if ((m = RE_IDADE.exec(txt)))       c.dadosBasicos.idade = m[1].trim();
        } else if (txt.includes('Sexo:')      && (m = RE_SEXO_LABEL.exec(txt)))
            c.dadosBasicos.sexo = m[1].trim();
        else if (txt.includes('Complemento:') && (m = RE_COMPLEMENTO.exec(txt)))
            c.endereco.complemento = m[1].trim();
        else if (txt.includes('Estado:')) {
            if ((m = RE_ESTADO.exec(txt))) c.endereco.estado = m[1];
            if ((m = RE_CEP.exec(txt)))    c.endereco.cep    = m[1];
        }
    }

    // ── Lista de pacientes ───────────────────────────────────────────────────

    parse(html, codigoClinica = null) {
        if (html === this._listHtml && codigoClinica === this._listClinica)
            return this._listResult;

        this.debug('Iniciando parse de pacientes', { codigoClinica });

        try {
            // Path rápido: extrai tabela com regex, sem DOM
            let pacientes = this._parseRapido(html, codigoClinica);

            // Fallback cheerio: estrutura não-tabular ou seletores específicos
            if (pacientes === null) {
                this.debug('Fallback cheerio para lista de pacientes');
                pacientes = this._parseFallback(html, codigoClinica);
            }

            this.debug(`Parse concluído. ${pacientes.length} pacientes encontrados`);
            const result = this._validateAndClean(pacientes);
            this._listHtml    = html;
            this._listClinica = codigoClinica;
            this._listResult  = result;
            return result;

        } catch (error) {
            this.error('Erro no parse de pacientes:', error);
            throw error;
        }
    }

    /**
     * Parse de lista via regex puro — sem cheerio.
     * Retorna null se não encontrar tabela (aciona fallback).
     */
    _parseRapido(html, codigoClinica) {
        const tableMatch = TABLE_RE.exec(html);
        if (!tableMatch) return null;

        const tableContent = tableMatch[1];
        const pacientes    = [];
        const timestamp    = new Date().toISOString();
        let   firstRow     = true;

        TR_RE.lastIndex = 0;
        let trMatch;
        while ((trMatch = TR_RE.exec(tableContent)) !== null) {
            // Remove comentários HTML antes de extrair TDs — o HICD comenta
            // colunas opcionais com <!-- <td>...</td> --> dentro das linhas
            const trContent = trMatch[1].replace(COMMENT_RE, '');

            // Pula linhas de cabeçalho
            if (trContent.includes('<th')) { firstRow = false; continue; }
            if (firstRow) { firstRow = false; continue; }

            // Extrai células <td>
            const cells = [];
            TD_RE.lastIndex = 0;
            let tdMatch;
            while ((tdMatch = TD_RE.exec(trContent)) !== null)
                cells.push(tdMatch[1]);

            if (cells.length < 2) continue;

            const c0 = stripHtml(cells[0]);
            const c1 = stripHtml(cells[1]);

            let prontuario = null;
            let nome = '';

            if (ONLY_DIGITS.test(c0)) { prontuario = c0; nome = c1; }
            else if (ONLY_DIGITS.test(c1)) { prontuario = c1; nome = c0; }

            // Tenta extrair prontuário de onclick/href se texto não tinha número
            if (!prontuario) {
                const onclickMatch = ONCLICK_RE.exec(trContent);
                const hrefMatch    = !onclickMatch && HREF_RE.exec(trContent);
                const action       = (onclickMatch || hrefMatch)?.[1] || '';
                prontuario = this.extractProntuarioFromAction(action);
                if (prontuario && !nome) nome = c0 || c1;
            }

            if (!prontuario || !nome) continue;

            const leito        = cells.length >= 3 ? stripHtml(cells[2]) : '';
            const c3           = cells.length >= 4 ? stripHtml(cells[3]) : '';
            const internacao   = cells.length >= 5 ? stripHtml(cells[4]) : '';
            const diasInternacao = cells.length >= 6 ? stripHtml(cells[5]) : '';
            const sexo         = this.isSexoValue(c3) ? c3 : '';

            pacientes.push({
                prontuario: String(prontuario),
                nome,
                dataNascimento: null,
                dataInternacao: this.parseDate(internacao),
                sexo:           this.normalizeSexo(sexo),
                diasInternacao,
                leito,
                clinicaLeito:   leito,
                status:         'ativo',
                dataUltimaAtualizacao: timestamp
            });
        }

        // null = tabela encontrada mas vazia → não aciona fallback
        return pacientes;
    }

    /**
     * Fallback via cheerio para páginas com estrutura não-tabular
     * ou com seletores específicos (data-*, .patient-item, etc.).
     */
    _parseFallback(html, codigoClinica) {
        const $ = cheerio.load(html, { decodeEntities: true });
        const pacientes = [];
        const timestamp = new Date().toISOString();

        // Seletores específicos primeiro
        const specificSels = [
            'table.patient-table tr',
            '.patient-item',
            '[data-patient]',
            'tr[onclick*="patient"]',
            'tr[onclick*="prontuario"]',
        ];

        for (const sel of specificSels) {
            const els = $(sel);
            if (els.length === 0) continue;

            els.each((_, el) => {
                const p = this._parseFallbackEl($, el, codigoClinica, timestamp);
                if (p) pacientes.push(p);
            });
            if (pacientes.length > 0) return pacientes;
        }

        // Fallback genérico: qualquer TR com TD
        let skipFirst = true;
        $('table tr').each((_, trNode) => {
            // Filtra células filhas diretas sem .find('td') (mais rápido)
            const tds = [];
            for (const ch of (trNode.children || []))
                if (ch.type === 'tag' && ch.name === 'td') tds.push(ch);

            if (tds.length === 0) return;
            if (skipFirst) { skipFirst = false; return; }

            const c0 = nodeText(tds[0]);
            const c1 = nodeText(tds[1] || {});

            let prontuario = null, nome = '';
            if (ONLY_DIGITS.test(c0)) { prontuario = c0; nome = c1; }
            else if (ONLY_DIGITS.test(c1)) { prontuario = c1; nome = c0; }

            if (!prontuario) {
                // Tenta link dentro da célula
                const firstA = this._firstA(trNode);
                if (firstA) {
                    prontuario = this.extractProntuarioFromAction(firstA.attribs?.onclick || '')
                              || this.extractProntuarioFromAction(firstA.attribs?.href    || '');
                    if (!nome) nome = nodeText(firstA);
                }
            }
            if (!prontuario || !nome) return;

            const leito        = tds[2] ? nodeText(tds[2]) : '';
            const c3t          = tds[3] ? nodeText(tds[3]) : '';
            const internacao   = tds[4] ? nodeText(tds[4]) : '';
            const diasInternacao = tds[5] ? nodeText(tds[5]) : '';

            pacientes.push({
                prontuario: String(prontuario),
                nome,
                dataNascimento:  null,
                dataInternacao:  this.parseDate(internacao),
                sexo:            this.normalizeSexo(this.isSexoValue(c3t) ? c3t : ''),
                diasInternacao,
                leito,
                clinicaLeito:    leito,
                status:          'ativo',
                dataUltimaAtualizacao: timestamp
            });
        });

        return pacientes;
    }

    _parseFallbackEl($, el, codigoClinica, timestamp) {
        const attribs = el.attribs || {};

        // data-* attributes
        const dataKeys = Object.keys(attribs).filter(k => k.startsWith('data-'));
        if (dataKeys.length) {
            const data = {};
            for (const k of dataKeys)
                data[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attribs[k];
            if (data.prontuario && data.nome)
                return {
                    prontuario: String(data.prontuario),
                    nome:       data.nome,
                    dataNascimento: this.parseDate(data.nascimento),
                    sexo:       this.normalizeSexo(data.sexo),
                    codigoClinica,
                    status:     data.status || 'ativo',
                    dataUltimaAtualizacao: timestamp
                };
        }

        const firstA = this._firstA(el);
        let prontuario = null, nome = '';
        if (firstA) {
            prontuario = this.extractProntuarioFromAction(firstA.attribs?.onclick || '')
                      || this.extractProntuarioFromAction(firstA.attribs?.href    || '');
            nome = nodeText(firstA);
        }
        if (!prontuario) {
            const txt = nodeText(el);
            const m   = /(\d+)\s*[-\s]*(.+)/.exec(txt);
            if (m) { prontuario = m[1]; nome = m[2]; }
        }
        if (!prontuario || !nome) return null;

        return {
            prontuario: String(prontuario),
            nome: nome.replace(WS_RE, ' ').trim(),
            codigoClinica,
            status: 'ativo',
            dataUltimaAtualizacao: timestamp
        };
    }

    /** Encontra o primeiro <a> descendente sem criar wrappers cheerio. */
    _firstA(node) {
        for (const child of (node?.children || [])) {
            if (child.type !== 'tag') continue;
            if (child.name === 'a')   return child;
            const found = this._firstA(child);
            if (found) return found;
        }
        return null;
    }

    // ── Helpers públicos ─────────────────────────────────────────────────────

    extractProntuarioFromAction(action) {
        if (!action) return null;
        let m;
        if ((m = PRONT_RE.exec(action)))   return m[1];
        if ((m = PATIENT_RE.exec(action))) return m[1];
        if ((m = CODIGO_RE.exec(action)))  return m[1];
        if ((m = ID_RE.exec(action)))      return m[1];
        if ((m = NUM_RE.exec(action)))     return m[1];
        return null;
    }

    isSexoValue(text) {
        return text ? SEXO_VALS.has(text.toLowerCase().trim()) : false;
    }

    normalizeSexo(sexo) {
        if (!sexo) return '';
        const n = sexo.toLowerCase().trim();
        if (SEXO_MASC.has(n)) return 'M';
        if (SEXO_FEM.has(n))  return 'F';
        return '';
    }

    isDateLike(text) {
        return text ? DATE_LIKE.test(text) : false;
    }

    _validateAndClean(pacientes) {
        const result = [];
        const seen   = new Set();
        for (const p of pacientes) {
            if (!p.prontuario || !p.nome) continue;
            if (seen.has(p.prontuario))   continue;
            seen.add(p.prontuario);
            result.push(p);
        }
        this.debug(`Validação: ${result.length}/${pacientes.length} válidos`);
        return result;
    }

    findByProntuario(html, prontuario, codigoClinica = null) {
        return this.parse(html, codigoClinica).find(p => p.prontuario === String(prontuario)) || null;
    }

    extractAvailableProntuarios(html, codigoClinica = null) {
        try {
            return this.parse(html, codigoClinica).map(p => p.prontuario).sort();
        } catch (error) {
            this.error('Erro ao extrair prontuários:', error);
            return [];
        }
    }

    filterPacientes(pacientes, filtros = {}) {
        let r = pacientes;
        if (filtros.nome) {
            const n = filtros.nome.toLowerCase();
            r = r.filter(p => p.nome.toLowerCase().includes(n));
        }
        if (filtros.sexo)     r = r.filter(p => p.sexo === filtros.sexo);
        if (filtros.convenio) {
            const cv = filtros.convenio.toLowerCase();
            r = r.filter(p => (p.convenio || '').toLowerCase().includes(cv));
        }
        if (filtros.idadeMin || filtros.idadeMax) {
            r = r.filter(p => {
                if (!p.dataNascimento) return false;
                const idade = this.calculateAge(p.dataNascimento);
                return (!filtros.idadeMin || idade >= filtros.idadeMin) &&
                       (!filtros.idadeMax || idade <= filtros.idadeMax);
            });
        }
        return r;
    }

    calculateAge(dataNascimento) {
        if (!dataNascimento) return null;
        const nasc  = new Date(dataNascimento);
        const hoje  = new Date();
        let idade = hoje.getFullYear() - nasc.getFullYear();
        if (hoje.getMonth() < nasc.getMonth() ||
           (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate()))
            idade--;
        return idade;
    }
}

module.exports = PacienteParser;
