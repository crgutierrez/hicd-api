const express = require('express');
const router = express.Router();
const clinicasController = require('../controllers/clinicas');
const { requireCrawler } = require('../middleware/require-auth');

router.use(requireCrawler);

// Middleware para validação de parâmetros
const validateClinicaId = (req, res, next) => {
    const { id } = req.params;
    if (!id || id.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Parâmetro inválido',
            message: 'ID da clínica é obrigatório e não pode estar vazio'
        });
    }
    next();
};

// GET /api/clinicas - Listar todas as clínicas
router.get('/', async (req, res) => {
    await clinicasController.listarClinicas(req, res);
});

// GET /api/clinicas/search?nome=<nome> - Buscar clínicas por nome
router.get('/search', async (req, res) => {
    await clinicasController.buscarClinicas(req, res);
});

// GET /api/clinicas/:id/pacientes - Listar pacientes de uma clínica
router.get('/:id/pacientes', validateClinicaId, async (req, res) => {
    await clinicasController.listarPacientesClinica(req, res);
});

// GET /api/clinicas/:id/stats - Obter estatísticas de uma clínica
router.get('/:id/stats', validateClinicaId, async (req, res) => {
    await clinicasController.obterEstatisticasClinica(req, res);
});

// GET /api/clinicas/:id - Obter detalhes de uma clínica específica (deve ser a última rota com parâmetro)
router.get('/:id', validateClinicaId, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se a clínica existe no cache
        if (clinicasController.isCacheValid()) {
            const clinica = clinicasController.clinicasCache.find(c => 
                c.id === id || c.codigo === id || c.nome === id
            );
            
            if (clinica) {
                return res.json({
                    success: true,
                    data: clinica
                });
            }
        }
        
        // Se não está no cache, atualizar e buscar
        const clinicas = await clinicasController.updateClinicasCache();
        const clinica = clinicas.find(c => 
            c.id === id || c.codigo === id || c.nome === id
        );
        
        if (!clinica) {
            return res.status(404).json({
                success: false,
                error: 'Clínica não encontrada',
                message: `Clínica com ID "${id}" não foi encontrada`
            });
        }
        
        res.json({
            success: true,
            data: clinica
        });
    } catch (error) {
        console.error('Erro ao obter detalhes da clínica:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter detalhes da clínica',
            message: error.message
        });
    }
});

// Nova rota para buscar pareceres
router.get('/:idClinica/pareceres', (req, res) => clinicasController.buscarPareceres(req, res));

module.exports = router;
