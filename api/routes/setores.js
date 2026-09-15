const express = require('express');
const router = express.Router();
const { requireCrawler } = require('../middleware/require-auth');
const sharedCrawler = require('../shared-crawler');
const cache = require('../utils/cache');

router.use(requireCrawler);

/**
 * GET /api/setores — catálogo completo de setores do hospital.
 *
 * Diferente de /api/clinicas, que devolve o **censo vivo** (só setores com
 * paciente internado no momento). O catálogo tem 29 setores contra 25 do censo;
 * as UIR 1, 2 e 3 só aparecem aqui, e são setores em uso.
 *
 * A posição na lista é o próprio código: o primeiro nome é o 001.
 */
router.get('/', async (req, res) => {
    try {
        const crawler = await sharedCrawler.getCrawler(req.hicdHost);
        const cacheKey = cache.generateKey('setores', 'catalogo', {}, req.hicdHost);
        const setores = await cache.getOrSet(cacheKey, () => crawler.getCatalogoSetores());
        res.json({
            success: true,
            total: setores.length,
            data: setores,
            observacao: 'Catálogo completo. /api/clinicas devolve apenas o censo vivo, sem as UIR.',
        });
    } catch (error) {
        console.error('Erro ao obter catálogo de setores:', error);
        res.status(500).json({ success: false, error: 'Erro ao obter catálogo de setores', message: error.message });
    }
});

module.exports = router;
