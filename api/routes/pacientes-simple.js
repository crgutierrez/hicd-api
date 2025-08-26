const express = require('express');
const router = express.Router();

// Rotas simples para teste
router.get('/search', (req, res) => {
    const { prontuario } = req.query;
    res.json({
        success: true,
        message: 'Busca de pacientes funcionando',
        searchTerm: prontuario || null,
        timestamp: new Date().toISOString()
    });
});

router.get('/search-leito', (req, res) => {
    const { leito } = req.query;
    res.json({
        success: true,
        message: 'Busca por leito funcionando',
        leito: leito || null,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
