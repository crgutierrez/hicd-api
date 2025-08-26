const express = require('express');
const router = express.Router();

// Rotas simples para teste
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Rota de clínicas funcionando',
        timestamp: new Date().toISOString()
    });
});

router.get('/search', (req, res) => {
    const { nome } = req.query;
    res.json({
        success: true,
        message: 'Busca de clínicas funcionando',
        searchTerm: nome || null,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
