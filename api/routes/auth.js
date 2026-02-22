const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// POST /api/auth/login - Inicializa o crawler com credenciais criptografadas
router.post('/login', async (req, res) => {
    await authController.login(req, res);
});

// GET /api/auth/status - Verifica se o crawler está autenticado
router.get('/status', (req, res) => {
    authController.status(req, res);
});

module.exports = router;
