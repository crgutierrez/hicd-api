/**
 * Índice dos modelos de dados da API HICD
 */

const Paciente = require('./Paciente');
const Evolucao = require('./Evolucao');
const { Exame, ResultadoExame } = require('./Exame');
const { Prescricao, MedicamentoPrescrito, ObservacaoPrescricao, DietaPrescrita } = require('./Prescricao');

module.exports = {
    Paciente,
    Evolucao,
    Exame,
    ResultadoExame,
    Prescricao,
    MedicamentoPrescrito,
    ObservacaoPrescricao,
    DietaPrescrita
};
