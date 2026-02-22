/**
 * Sistema de Cache em Memória
 * Cache com TTL (Time To Live) para otimizar consultas ao HICD
 */

class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.pending = new Map(); // evita execução duplicada em cache miss simultâneo
        this.defaultTTL = 10 * 60 * 1000; // 10 minutos em milissegundos

        // Limpar cache expirado a cada 5 minutos
        setInterval(() => {
            this.cleanExpired();
        }, 5 * 60 * 1000);
    }

    /**
     * Gera chave única para o cache
     * @param {string} type - Tipo de consulta (exames, evolucoes, prontuarios, prescricoes)
     * @param {string} prontuario - Prontuário do paciente
     * @param {object} params - Parâmetros adicionais
     * @returns {string} Chave única
     */
    generateKey(type, prontuario, params = {}) {
        const paramsStr = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        
        return `${type}:${prontuario}${paramsStr ? ':' + paramsStr : ''}`;
    }

    /**
     * Armazena dados no cache
     * @param {string} key - Chave do cache
     * @param {any} data - Dados a serem armazenados
     * @param {number} ttl - Tempo de vida em milissegundos (opcional)
     */
    set(key, data, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl;
        
        this.cache.set(key, {
            data,
            expiresAt,
            createdAt: Date.now()
        });

        console.log(`📦 Cache SET: ${key} (TTL: ${ttl/1000}s)`);
    }

    /**
     * Recupera dados do cache
     * @param {string} key - Chave do cache
     * @returns {any|null} Dados armazenados ou null se não encontrado/expirado
     */
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            console.log(`❌ Cache MISS: ${key}`);
            return null;
        }

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            console.log(`⏰ Cache EXPIRED: ${key}`);
            return null;
        }

        const ageSeconds = Math.round((Date.now() - item.createdAt) / 1000);
        console.log(`✅ Cache HIT: ${key} (idade: ${ageSeconds}s)`);
        return item.data;
    }

    /**
     * Remove item específico do cache
     * @param {string} key - Chave do cache
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`🗑️ Cache DELETE: ${key}`);
        }
        return deleted;
    }

    /**
     * Limpa todos os itens expirados
     */
    cleanExpired() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cache limpo: ${cleanedCount} itens expirados removidos`);
        }
    }

    /**
     * Limpa todo o cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗑️ Cache limpo completamente: ${size} itens removidos`);
    }

    /**
     * Invalida cache de um paciente específico
     * @param {string} prontuario - Prontuário do paciente
     */
    invalidatePatient(prontuario) {
        let invalidatedCount = 0;
        
        for (const key of this.cache.keys()) {
            if (key.includes(`:${prontuario}`)) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }

        if (invalidatedCount > 0) {
            console.log(`🔄 Cache invalidado para paciente ${prontuario}: ${invalidatedCount} itens`);
        }
        
        return invalidatedCount;
    }

    /**
     * Invalida cache por tipo
     * @param {string} type - Tipo de consulta
     */
    invalidateType(type) {
        let invalidatedCount = 0;
        
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${type}:`)) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }

        if (invalidatedCount > 0) {
            console.log(`🔄 Cache invalidado para tipo ${type}: ${invalidatedCount} itens`);
        }
        
        return invalidatedCount;
    }

    /**
     * Obtém estatísticas do cache
     */
    getStats() {
        const now = Date.now();
        let validItems = 0;
        let expiredItems = 0;
        let totalSize = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                expiredItems++;
            } else {
                validItems++;
            }
            
            // Estimativa grosseira do tamanho
            totalSize += JSON.stringify(item.data).length;
        }

        return {
            totalItems: this.cache.size,
            validItems,
            expiredItems,
            estimatedSizeKB: Math.round(totalSize / 1024),
            defaultTTLMinutes: this.defaultTTL / (60 * 1000)
        };
    }

    /**
     * Wrapper para função com cache automático
     * @param {string} cacheKey - Chave do cache
     * @param {Function} asyncFunction - Função assíncrona a ser executada
     * @param {number} ttl - TTL personalizado (opcional)
     */
    async getOrSet(cacheKey, asyncFunction, ttl = this.defaultTTL) {
        // Tentar buscar no cache primeiro
        const cached = this.get(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Se já há uma busca em andamento para esta chave, aguardar o resultado dela
        if (this.pending.has(cacheKey)) {
            return this.pending.get(cacheKey);
        }

        // Registrar a promise pendente antes de executar para bloquear chamadas concorrentes
        const promise = asyncFunction()
            .then(data => {
                this.set(cacheKey, data, ttl);
                this.pending.delete(cacheKey);
                return data;
            })
            .catch(error => {
                this.pending.delete(cacheKey);
                throw error;
            });

        this.pending.set(cacheKey, promise);
        return promise;
    }
}

// Instância única do cache
const cache = new MemoryCache();

module.exports = cache;
