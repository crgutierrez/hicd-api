/**
 * Índice dos modelos de dados da API HICD
 */

const Paciente = require('./Paciente');
const Evolucao = require('./Evolucao');
const { Exame, ResultadoExame } = require('./Exame');

module.exports = {
    Paciente,
    Evolucao,
    Exame,
    ResultadoExame
};
