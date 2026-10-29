const InternacaoParser = require('../parsers/internacao-parser');
const EmergenciaParser = require('../parsers/emergencia-parser');
const CadastroSameParser = require('../parsers/cadastro-same-parser');

/**
 * Constatação de óbito no texto das evoluções.
 *
 * É a **única** fonte de mortalidade no HICD: quando o paciente morre ninguém
 * escreve resumo de alta, então o módulo RALTA fica vazio justamente nos óbitos.
 * Derivar desfecho da presença de resumo de alta reporta mortalidade zero.
 *
 * O padrão tolera variação de grafia ("constatato" aparece de verdade nos
 * prontuários) e exige constatação: "risco de óbito" e "risco iminente de óbito"
 * aparecem o tempo todo em paciente grave que sobrevive.
 */
const OBITO_CONSTATADO = new RegExp([
    'constat\\w*\\s+(?:o\\s+)?[óo]bito',
    // "Obito confirmado 11h32" — o verbo varia; "confirmado" faltava e escondeu
    // um óbito real de UTI (38183), com a saída do Inter no minuto exato.
    '[óo]bito\\s+(?:foi\\s+)?(?:declarado|constatado|confirmado|atestado)',
    'confirm(?:o|ou|ado|ada)\\s+(?:o\\s+)?[óo]bito',
    'declar(?:o|ou|ado|ada)\\s+(?:a\\s+)?(?:hora\\s+do\\s+)?[óo]bito',
    'declara[çc][ãa]o\\s+de\\s+[óo]bito',
    // "Emito atestado de óbito" é o registro do ato, não menção genérica.
    '(?:emit\\w+|assin\\w+|preenc\\w+|fornec\\w+)\\s+(?:o\\s+|a\\s+)?(?:atestado|declara[çc][ãa]o)\\s+de\\s+[óo]bito',
    'atestado\\s+de\\s+[óo]bito',
    'protocolo\\s+de\\s+[óo]bito',
    'hora\\s+do\\s+[óo]bito',
    'evolui[u]?\\s+(?:para\\s+)?[óo]bito',
].join('|'), 'i');

const RISCO_DE_OBITO = /risco\s+(?:iminente\s+)?(?:de\s+)?[óo]bito|chances?\s+de\s+[óo]bito|possibilidade\s+de\s+[óo]bito/i;

/** Óbito de terceiro (mãe, irmão) não é desfecho do paciente. */
const OBITO_DE_TERCEIRO = /\b(m[ãa]e|genitora|pai|genitor|irm[ãa]os?|av[óo]s?|tios?|familiar|primo)\b[^.]{0,60}[óo]bito/i;

const paraData = (s) => {
    const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
};

/**
 * Fronteira de palavra que inclui acentuadas. `\b` não serve: em "FARMÁCIA" o
 * `\b` enxerga fronteira antes de "CIA" porque `\w` é ASCII.
 */
const L = 'a-zà-öø-ÿA-ZÀ-ÖØ-Þ';

/**
 * Alta da **especialidade**, não do hospital. Precisa ser removida do texto
 * antes de procurar alta hospitalar: a cardiopediatria escreve "ALTA
 * CARDIOLÓGICA" no primeiro parecer e o paciente segue internado semanas.
 */
const ESPECIALIDADES = `cardio|neuro|nefro|reumato|gastro|pneumo|endocrino|hemato|infecto|` +
    `cirurgia|ortopedia|psicologia|fisioterapia|nutri[çc][ãa]o|fonoaudiologia|dermato|urolog`;

const ALTA_DE_ESPECIALIDADE = new RegExp([
    `alta\\s+(?:cardiol[óo]gica|neurol[óo]gica|cir[úu]rgica|ortop[ée]dica|psicol[óo]gica|` +
        `nutricional|fonoaudiol[óo]gica|fisioterap[êe]utica|da\\s+especialidade|` +
        `(?:d[ao]|pel[ao])\\s+(?:${ESPECIALIDADES})\\w*)`,
    // "Neuropediatria- alta médica": o nome da especialidade vem antes, com traço.
    `(?:${ESPECIALIDADES})\\w*\\s*[-–—:]\\s*alta\\s+m[ée]dica`,
    // Alta de uma equipe passando o paciente para outra: segue internado.
    `alta\\s+(?:d[ao]|pel[ao])\\s+\\w+[\\s,]*aos?\\s+cuidados\\s+d`,
].join('|'), 'gi');

/**
 * Alta negada, apenas aguardada, ou de outra internação.
 *
 * "aguarda alta hospitalar" é expectativa, não desfecho; e o pretérito
 * "recebeu alta" quase sempre está na história pregressa — pegou "recebeu alta
 * da UTI do SAMAR há 5 dias da admissão" como se fosse a alta desta internação.
 */
const ALTA_NEGADA = new RegExp(
    `(?:sem\\s+(?:condi[çc][õo]es|crit[ée]rios)\\s+(?:de|para)\\s+alta|` +
    `(?:n[ãa]o|nega)\\s+(?:est[áa]\\s+|tem\\s+|houve\\s+)?(?:de\\s+)?alta|` +
    `contraindicad[ao]\\s+alta|alta\\s+(?:n[ãa]o|suspensa|cancelada)|` +
    `aguarda(?:ndo|r)?\\s+(?:a\\s+)?alta|recebe[ud]\\s+alta)`,
    'gi');

/**
 * Alta hospitalar declarada na evolução. O HICD não obriga resumo de alta: em
 * metade das internações o desfecho é uma linha solta na última evolução —
 * às vezes o texto inteiro dela é "ALTA MEDICA".
 */
const ALTA_HOSPITALAR = new RegExp([
    `(?<![${L}])alta\\s+(?:m[ée]dica|hospitalar|melhorad[ao])(?![${L}])`,
    `conduta\\s*:?\\s*-?\\s*alta(?![${L}])`,
    `(?<![${L}])alta\\s+(?:d[ao]|pel[ao])\\s+pediatria(?![${L}])`,
    `(?<![${L}])(?:recebe|receber[áa]|obt[ée]m)\\s+alta(?![${L}])`,
    `(?<![${L}])sugiro\\s+alta(?![${L}])`,
    `(?<![${L}])alta\\s+a\\s+pedido(?![${L}])`,
].join('|'), 'i');

/**
 * Transferência para **fora** do hospital. Deliberadamente restrita: "TFD"
 * sozinho não serve — "dará entrada no TFD e poderá receber alta e aguardar
 * TFD em domicílio" é alta, não transferência. E "transferido para a UTI" é
 * movimentação interna, coberta por `derivarPercurso`.
 *
 * Só entram formas **substantivas** ("transferência para o hospital X") e o
 * transporte aéreo. O particípio "transferida para o Hospital Bom Pastor" foi
 * retirado de propósito: é a forma da narrativa de chegada na HDA, que o
 * prontuário recopia todo dia — marcou transferência num paciente que veio
 * transferido de outro município e recebeu alta daqui (36170). Perde-se
 * recall; num levantamento de desfecho, inventar transferência é pior.
 */
const TRANSFERENCIA_EXTERNA = new RegExp([
    `UTI\\s+a[ée]rea`,
    `transporte\\s+a[ée]reo`,
    `remo[çc][ãa]o\\s+a[ée]rea`,
    `transfer[êe]ncia\\s+(?:externa|inter\\s*-?\\s*hospitalar|para\\s+(?:o\\s+|outr[ao]\\s+)?(?:hospital|munic[íi]pio|servi[çc]o))`,
].join('|'), 'i');

/**
 * Serviço de internações, desfecho e porta de entrada.
 *
 * Reúne quatro módulos do HICD que o crawler não cobria:
 *   Inter                     internações (setor de alta, entrada, saída, CID)
 *   RALTA                     relatórios de alta, transferência e laudos
 *   SIINF/237                 catálogo completo de setores
 *   SSAME/pesq_Pront_Reg      cadastro com raça/cor, deficiência e IBGE
 */
class InternacaoService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.parser = new InternacaoParser();
        this.emergenciaParser = new EmergenciaParser();
        this.sameParser = new CadastroSameParser();
    }

    async _post(corpo) {
        const urls = this.httpClient.getUrls();
        const r = await this.httpClient.post(urls.login, new URLSearchParams(corpo), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }
        });
        return String(r.data);
    }

    /**
     * Internações do paciente.
     *
     * O módulo devolve HTTP 500 em prontuários muito longos (embute as evoluções
     * dentro de cada internação). Em vez de propagar o erro, devolvemos a falha
     * marcada — o paciente ainda tem demografia, evoluções e relatórios úteis.
     */
    async getInternacoes(pacienteId) {
        try {
            const html = await this._post({
                Param: 'REGE', ParamModule: 'Inter', IdPac: pacienteId,
                cpf: '', TIPOBUSCA: 'PRONT', tipoBusca: 'PRONT', edit: '1', param: ''
            });
            return { internacoes: this.parser.parseInternacoes(html), erro: null };
        } catch (error) {
            console.error(`[INTERNACOES] Falha no módulo Inter para ${pacienteId}:`, error.message);
            return { internacoes: [], erro: error.message };
        }
    }

    /** Relatórios do módulo RALTA (alta, transferência, laudo, encaminhamento). */
    async getRelatoriosAlta(pacienteId) {
        try {
            const html = await this._post({
                Param: 'REGE', ParamModule: 'RALTA', IdPac: pacienteId, Filtro: '0',
                edit: '', param: '', mEvo: 'undefined', filter: '', cpf: '',
                filtroTipo: 'undefined', TIPOBUSCA: 'PRONT'
            });
            return this.parser.parseRelatoriosAlta(html);
        } catch (error) {
            console.error(`[RALTA] Erro para ${pacienteId}:`, error.message);
            return [];
        }
    }

    /** Catálogo completo de setores — 29 no HICD, contra 25 no censo vivo. */
    async getCatalogoSetores() {
        try {
            return this.parser.parseCatalogoSetores(await this._post({ Param: 'SIINF', ParamModule: '237' }));
        } catch (error) {
            console.error('[SETORES] Erro:', error.message);
            return [];
        }
    }

    /** Cadastro do SAME — raça/cor, deficiência, CNS e código IBGE do município. */
    async getCadastroSame(pacienteId) {
        try {
            return this.sameParser.parse(await this._post({
                Param: 'SSAME', ParamModule: 'pesq_Pront_Reg', pront: pacienteId
            }));
        } catch (error) {
            console.error(`[SAME] Erro para ${pacienteId}:`, error.message);
            return null;
        }
    }

    /** Boletins de Emergência do paciente, do mais antigo ao mais recente. */
    async getBoletinsEmergencia(pacienteId, { limite = 0 } = {}) {
        try {
            const cadastro = await this._post({
                Param: 'REGE', ParamModule: 'CONSPAC_OPEN', IdPac: pacienteId,
                PACIENTE: pacienteId, TIPOBUSCA: 'PRONT'
            });
            const numeros = this.emergenciaParser.parseListaBes(cadastro);
            const alvos = limite > 0 ? numeros.slice(-limite) : numeros;

            const boletins = [];
            for (const be of alvos) {
                const base = {
                    Param: 'REGE', IdPac: be, Filtro: '', edit: '0', param: '',
                    mEvo: '0', filter: '', cpf: '', filtroTipo: '', TIPOBUSCA: 'BE'
                };
                const cabecalho = this.emergenciaParser.parseCabecalho(
                    await this._post({ ...base, ParamModule: 'EvolucaoBe' }));
                const triagem = this.emergenciaParser.parseTriagem(
                    await this._post({ ...base, ParamModule: 'TRIAGEM' }));
                boletins.push({ be, ...cabecalho, triagem });
            }
            return { totalBes: numeros.length, boletins };
        } catch (error) {
            console.error(`[BE] Erro para ${pacienteId}:`, error.message);
            return { totalBes: 0, boletins: [], erro: error.message };
        }
    }

    /**
     * Óbito constatado nas evoluções, opcionalmente restrito a um intervalo.
     * Sem intervalo, procura no prontuário inteiro — necessário porque quando o
     * módulo Inter falha não há internação a que prender o desfecho.
     */
    detectarObito(evolucoes, inicio = null, fim = null) {
        if (!Array.isArray(evolucoes)) return null;
        const ordenadas = [...evolucoes].sort(
            (a, b) => (paraData(a.dataEvolucao || a.data) || 0) - (paraData(b.dataEvolucao || b.data) || 0));

        for (const e of ordenadas) {
            const d = paraData(e.dataEvolucao || e.data);
            if (!d) continue;
            if (inicio && d < inicio) continue;
            if (fim && d > fim) continue;

            const texto = e.descricao || e.conteudo?.textoCompleto || '';
            for (const m of texto.matchAll(new RegExp(OBITO_CONSTATADO.source, 'gi'))) {
                const antes = texto.slice(Math.max(0, m.index - 60), m.index + m[0].length);
                if (RISCO_DE_OBITO.test(antes)) continue;
                const janela = texto.slice(Math.max(0, m.index - 160), m.index + 180);
                if (OBITO_DE_TERCEIRO.test(janela) && !/\b(paciente|lactente|crian[çc]a|menor|rn)\b/i.test(janela)) continue;
                return {
                    data: e.dataEvolucao || e.data,
                    profissional: e.profissional,
                    atividade: e.atividade,
                    trecho: janela.replace(/\s+/g, ' ').trim(),
                };
            }
        }
        return null;
    }

    /**
     * Desfecho de uma internação, com precedência explícita:
     *   1. óbito constatado em evolução        (anula os demais)
     *   2. documento do RALTA                  (classificado pelo título)
     *   3. resumo de alta escrito como evolução
     *   4. desfecho declarado nas evoluções do último dia
     *   5. sem informação
     *
     * O passo 4 existe porque o RALTA cobre pouco: em 40% das internações não há
     * documento nenhum, e em metade dessas a alta está escrita na última
     * evolução — às vezes o texto inteiro dela é "ALTA MEDICA". Ele vale
     * `confianca: 'média'`; quem precisar de desfecho auditado filtra por
     * `confianca === 'alta'`.
     *
     * "Transferido" no corpo do texto quase nunca é o desfecho: descreve
     * movimentação interna (emergência → UTI → enfermaria) dentro de um resumo
     * que termina em alta. Fora do título "Relatório de transferência", só
     * contam marcas de saída do hospital (UTI aérea, transporte aéreo).
     */
    resolverDesfecho(internacao, relatorios = [], evolucoes = []) {
        const ent = paraData(internacao.entrada);
        const sai = paraData(internacao.saida);
        if (!ent) return { desfecho: 'Sem informação', confianca: null, fonte: null };

        const DOIS_DIAS = 2 * 86400 * 1000;
        const limite = sai ? new Date(sai.getTime() + DOIS_DIAS) : null;

        const obito = this.detectarObito(evolucoes, ent, limite);
        if (obito) return { desfecho: 'Óbito', confianca: 'alta', fonte: 'Óbito constatado em evolução', obito };

        // O resumo pode ser redigido dias antes da saída efetiva; casar pela data
        // de saída perde registros, então o critério é o intervalo.
        const dentro = relatorios.filter(r => {
            const d = paraData(r.dataRegistro);
            return d && d >= ent && (!limite || d <= limite);
        }).sort((a, b) => paraData(a.dataRegistro) - paraData(b.dataRegistro));
        const rel = dentro[dentro.length - 1];

        if (rel) {
            if (rel.tipoDocumento === 'Relatório de transferência') {
                return { desfecho: 'Transferência', confianca: 'alta', fonte: `RALTA: ${rel.tipoDocumento}` };
            }
            if (rel.tipoDocumento === 'Resumo de alta') {
                return { desfecho: 'Alta', confianca: 'alta', fonte: `RALTA: ${rel.tipoDocumento}` };
            }
            if (/data da alta|alta hospitalar|alta m[ée]dica|alta melhorad[ao]|recebe(u|r[áa])? alta/i.test(rel.texto)) {
                return { desfecho: 'Alta', confianca: 'média', fonte: `RALTA: ${rel.tipoDocumento}` };
            }
            return { desfecho: 'Indeterminado', confianca: null, fonte: `RALTA: ${rel.tipoDocumento}` };
        }

        // O resumo de alta às vezes é escrito como evolução, e não arquivado.
        const naEvolucao = evolucoes.some(e => {
            const d = paraData(e.dataEvolucao || e.data);
            return d && d >= ent && (!limite || d <= limite)
                && /resumo\s+de\s+alta\s+hospitalar|data\s+da\s+alta\s*:/i.test(e.descricao || '');
        });
        if (naEvolucao) {
            return { desfecho: 'Alta', confianca: 'média', fonte: 'Resumo de alta escrito como evolução' };
        }

        // Último recurso: o desfecho declarado nas evoluções do fim da internação.
        // Só o último dia entra — "recebeu alta" na história pregressa é de outra
        // internação, e o texto da admissão é copiado inteiro todo dia.
        const texto = this._textoDoFimDaInternacao(evolucoes, ent, limite);
        if (texto) {
            if (TRANSFERENCIA_EXTERNA.test(texto)) {
                return { desfecho: 'Transferência', confianca: 'média', fonte: 'Transferência declarada na evolução final' };
            }
            const limpo = texto.replace(ALTA_DE_ESPECIALIDADE, ' ').replace(ALTA_NEGADA, ' ');
            if (ALTA_HOSPITALAR.test(limpo)) {
                return { desfecho: 'Alta', confianca: 'média', fonte: 'Alta declarada na evolução final' };
            }
        }
        return { desfecho: 'Sem informação', confianca: null, fonte: null };
    }

    /**
     * Texto das evoluções do último dia da internação.
     *
     * A janela é o dia da última evolução registrada, não a data de saída do
     * `Inter`: a alta costuma ser escrita horas depois da saída (e a saída às
     * vezes é lançada antes da última visita).
     */
    _textoDoFimDaInternacao(evolucoes, ent, limite, maximo = 6) {
        const UM_DIA = 86400 * 1000;
        const dentro = evolucoes
            .map(e => ({ d: paraData(e.dataEvolucao || e.data), e }))
            .filter(x => x.d && x.d >= ent && (!limite || x.d <= limite))
            .sort((a, b) => a.d - b.d);
        if (!dentro.length) return '';

        const fim = dentro[dentro.length - 1].d;
        return dentro
            .filter(x => fim - x.d <= UM_DIA)
            .slice(-maximo)
            .map(x => [x.e.descricao, ...(Array.isArray(x.e.hipoteses) ? x.e.hipoteses : [])].join('\n'))
            .join('\n');
    }

    /**
     * Porta de entrada e movimentação entre setores, derivadas das evoluções.
     *
     * O `setorAlta` do módulo Inter não serve para isto: é o setor de **alta**.
     */
    derivarPercurso(internacao, evolucoes = []) {
        const ent = paraData(internacao.entrada);
        const sai = paraData(internacao.saida);
        if (!ent) return null;

        const dentro = evolucoes
            .filter(e => {
                const d = paraData(e.dataEvolucao || e.data);
                return d && d >= ent && (!sai || d <= sai);
            })
            .sort((a, b) => paraData(a.dataEvolucao || a.data) - paraData(b.dataEvolucao || b.data));

        const setores = dentro
            .map(e => (String(e.clinicaLeito || '').match(/^(\d{3})-(.+)$/) || []).slice(1))
            .filter(s => s.length === 2);
        if (!setores.length) return null;

        const PORTAS = {
            '001': 'Emergência', '002': 'CIP', '003': 'UIR', '004': 'UIR', '005': 'UIR',
            '019': 'Observação / Hospital Dia', '020': 'Sala de procedimento',
        };
        const [codigo, nome] = setores[0];
        const trajetoria = [...new Set(setores.map(s => s[1]))];
        return {
            setorEntrada: nome,
            codigoSetorEntrada: codigo,
            portaDeEntrada: PORTAS[codigo] || 'Direto em enfermaria/UTI',
            entrouPelaEmergencia: ['001', '002'].includes(codigo),
            nSetores: new Set(setores.map(s => s[0])).size,
            trajetoria,
            horasAtePrimeiraEvolucao: Math.round(
                (paraData(dentro[0].dataEvolucao || dentro[0].data) - ent) / 36000) / 100,
        };
    }
}

module.exports = InternacaoService;
