const express = require('express');
const cache = require('../utils/cache');

const router = express.Router();

/**
 * @swagger
 * /cache/stats:
 *   get:
 *     summary: Obter estatísticas do cache
 *     description: Retorna informações sobre o estado atual do cache em memória
 *     tags:
 *       - Cache
 *     responses:
 *       200:
 *         description: Estatísticas do cache obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: number
 *                       description: Total de itens no cache
 *                     validItems:
 *                       type: number
 *                       description: Itens válidos (não expirados)
 *                     expiredItems:
 *                       type: number
 *                       description: Itens expirados
 *                     estimatedSizeKB:
 *                       type: number
 *                       description: Tamanho estimado em KB
 *                     defaultTTLMinutes:
 *                       type: number
 *                       description: TTL padrão em minutos
 */
router.get('/stats', (req, res) => {
    try {
        const stats = cache.getStats();
        
        res.json({
            success: true,
            data: stats,
            message: 'Estatísticas do cache obtidas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas do cache:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter estatísticas do cache',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /cache/clear:
 *   delete:
 *     summary: Limpar todo o cache
 *     description: Remove todos os itens armazenados no cache
 *     tags:
 *       - Cache
 *     responses:
 *       200:
 *         description: Cache limpo com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete('/clear', (req, res) => {
    try {
        cache.clear();
        
        res.json({
            success: true,
            message: 'Cache limpo com sucesso'
        });
    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao limpar cache',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /cache/invalidate/patient/{prontuario}:
 *   delete:
 *     summary: Invalidar cache de um paciente
 *     description: Remove todos os itens do cache relacionados a um paciente específico
 *     tags:
 *       - Cache
 *     parameters:
 *       - in: path
 *         name: prontuario
 *         required: true
 *         schema:
 *           type: string
 *         description: Prontuário do paciente
 *     responses:
 *       200:
 *         description: Cache do paciente invalidado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invalidatedCount:
 *                       type: number
 *                       description: Número de itens removidos do cache
 *                 message:
 *                   type: string
 */
router.delete('/invalidate/patient/:prontuario', (req, res) => {
    try {
        const { prontuario } = req.params;
        
        if (!prontuario) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetro obrigatório',
                message: 'O prontuário é obrigatório'
            });
        }

        const invalidatedCount = cache.invalidatePatient(prontuario);
        
        res.json({
            success: true,
            data: {
                prontuario,
                invalidatedCount
            },
            message: `Cache do paciente ${prontuario} invalidado com sucesso`
        });
    } catch (error) {
        console.error('Erro ao invalidar cache do paciente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao invalidar cache do paciente',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /cache/invalidate/type/{type}:
 *   delete:
 *     summary: Invalidar cache por tipo
 *     description: Remove todos os itens do cache de um tipo específico (exames, evolucoes, prontuarios, prescricoes)
 *     tags:
 *       - Cache
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [exames, evolucoes, prontuarios, prescricoes]
 *         description: Tipo de dados para invalidar
 *     responses:
 *       200:
 *         description: Cache do tipo invalidado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invalidatedCount:
 *                       type: number
 *                       description: Número de itens removidos do cache
 *                 message:
 *                   type: string
 */
router.delete('/invalidate/type/:type', (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['exames', 'evolucoes', 'prontuarios', 'prescricoes'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo inválido',
                message: `Tipo deve ser um dos seguintes: ${validTypes.join(', ')}`
            });
        }

        const invalidatedCount = cache.invalidateType(type);
        
        res.json({
            success: true,
            data: {
                type,
                invalidatedCount
            },
            message: `Cache do tipo "${type}" invalidado com sucesso`
        });
    } catch (error) {
        console.error('Erro ao invalidar cache por tipo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao invalidar cache por tipo',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /cache/clean:
 *   post:
 *     summary: Limpar itens expirados
 *     description: Remove apenas os itens expirados do cache, mantendo os válidos
 *     tags:
 *       - Cache
 *     responses:
 *       200:
 *         description: Itens expirados removidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/clean', (req, res) => {
    try {
        cache.cleanExpired();
        
        res.json({
            success: true,
            message: 'Itens expirados removidos com sucesso'
        });
    } catch (error) {
        console.error('Erro ao limpar itens expirados:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao limpar itens expirados',
            message: error.message
        });
    }
});

module.exports = router;
