const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes');

// Middleware para validação de prontuário
const validateProntuario = (req, res, next) => {
    const { prontuario } = req.params;
    if (!prontuario || prontuario.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Parâmetro inválido',
            message: 'Prontuário é obrigatório e não pode estar vazio'
        });
    }
    next();
};

// GET /api/pacientes/search?prontuario=<numero> - Buscar paciente por prontuário
router.get('/search', async (req, res) => {
    await pacientesController.buscarPaciente(req, res);
});

// GET /api/pacientes/search-leito?leito=<numero> - Buscar paciente por leito
router.get('/search-leito', async (req, res) => {
    await pacientesController.buscarPacientePorLeito(req, res);
});

// GET /api/pacientes/:prontuario - Obter detalhes completos de um paciente
router.get('/:prontuario', validateProntuario, async (req, res) => {
    await pacientesController.obterDetalhesPaciente(req, res);
});

// GET /api/pacientes/:prontuario/evolucoes - Listar evoluções médicas de um paciente
router.get('/:prontuario/evolucoes', validateProntuario, async (req, res) => {
    await pacientesController.obterEvolucoesPaciente(req, res);
});

// GET /api/pacientes/:prontuario/analise - Obter análise clínica completa de um paciente
router.get('/:prontuario/analise', validateProntuario, async (req, res) => {
    await pacientesController.obterAnaliseClinica(req, res);
});

router.get('/:prontuario/exames', validateProntuario, async (req, res) => {
    await pacientesController.obterExamesPaciente(req, res);
});

module.exports = router;
