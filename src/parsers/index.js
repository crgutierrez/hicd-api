/**
 * Índice dos parsers do HICD
 * Facilita importação e uso dos parsers especializados
 */

// Parser principal (compatível com versão anterior)
const HICDParser = require('./hicd-parser');

// Parsers especializados
const BaseParser = require('./base-parser');
const ClinicaParser = require('./clinica-parser');
const PacienteParser = require('./paciente-parser');
const ExamesParser = require('./exames-parser');
const EvolucaoParser = require('./evolucao-parser');
const ProntuarioParser = require('./prontuario-parser');

module.exports = {
    // Parser principal (uso recomendado)
    HICDParser,
    
    // Parsers especializados (para uso avançado)
    BaseParser,
    ClinicaParser,
    PacienteParser,
    ExamesParser,
    EvolucaoParser,
    ProntuarioParser,
    
    // Factory methods para facilitar criação
    createHICDParser: () => new HICDParser(),
    createClinicaParser: () => new ClinicaParser(),
    createPacienteParser: () => new PacienteParser(),
    createExamesParser: () => new ExamesParser(),
    createEvolucaoParser: () => new EvolucaoParser(),
    createProntuarioParser: () => new ProntuarioParser(),
    
    // Constantes úteis
    TIPOS_EXAMES: {
        LABORATORIAL: 'laboratorial',
        MICROBIOLOGIA: 'microbiologia',
        IMAGEM: 'imagem',
        GASOMETRIA: 'gasometria',
        SOLICITACAO: 'solicitacao',
        GERAL: 'geral'
    },
    
    TIPOS_EVOLUCAO: {
        EVOLUCAO: 'evolucao',
        CONSULTA: 'consulta',
        INTERNACAO: 'internacao',
        CIRURGIA: 'cirurgia',
        EXAME: 'exame',
        ALTA: 'alta',
        TRANSFERENCIA: 'transferencia'
    },
    
    STATUS_EVOLUCAO: {
        RASCUNHO: 'rascunho',
        FINALIZADA: 'finalizada',
        REVISAO: 'revisao',
        CANCELADA: 'cancelada'
    }
};

// Backward compatibility
module.exports.default = HICDParser;
