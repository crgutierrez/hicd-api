/**
 * Utilitários para o HICD Crawler
 * 
 * Funções auxiliares para processamento de dados,
 * validação e operações comuns.
 */

const fs = require('fs').promises;
const path = require('path');

class HICDUtils {
    /**
     * Valida se uma URL é válida
     */
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Limpa e normaliza texto extraído
     */
    static cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/\s+/g, ' ')  // Múltiplos espaços para um
            .replace(/\n+/g, ' ')  // Quebras de linha para espaço
            .trim()                // Remove espaços das extremidades
            .replace(/[^\w\s\-.,!?]/g, ''); // Remove caracteres especiais
    }

    /**
     * Valida se os dados extraídos são válidos
     */
    static validateExtractedData(data) {
        const errors = [];
        
        if (!Array.isArray(data)) {
            errors.push('Dados devem ser um array');
            return { isValid: false, errors };
        }

        data.forEach((item, index) => {
            if (!item.url) {
                errors.push(`Item ${index}: URL é obrigatória`);
            }
            
            if (!item.timestamp) {
                errors.push(`Item ${index}: Timestamp é obrigatório`);
            }
            
            if (item.url && !this.isValidUrl(item.url)) {
                errors.push(`Item ${index}: URL inválida - ${item.url}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            totalItems: data.length,
            validItems: data.length - errors.length
        };
    }

    /**
     * Filtra dados baseado em critérios
     */
    static filterData(data, filters = {}) {
        let filtered = [...data];

        // Filtrar por idade máxima (dias)
        if (filters.maxAge) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() - filters.maxAge);
            
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= maxDate;
            });
        }

        // Filtrar por palavras-chave obrigatórias
        if (filters.requiredKeywords && filters.requiredKeywords.length > 0) {
            filtered = filtered.filter(item => {
                const searchText = (item.title + ' ' + item.content).toLowerCase();
                return filters.requiredKeywords.some(keyword => 
                    searchText.includes(keyword.toLowerCase())
                );
            });
        }

        // Excluir palavras-chave
        if (filters.excludeKeywords && filters.excludeKeywords.length > 0) {
            filtered = filtered.filter(item => {
                const searchText = (item.title + ' ' + item.content).toLowerCase();
                return !filters.excludeKeywords.some(keyword => 
                    searchText.includes(keyword.toLowerCase())
                );
            });
        }

        // Filtrar apenas itens com título
        if (filters.requireTitle) {
            filtered = filtered.filter(item => item.title && item.title.trim());
        }

        return filtered;
    }

    /**
     * Gera estatísticas dos dados extraídos
     */
    static generateStats(data) {
        const stats = {
            totalRecords: data.length,
            recordsWithTitle: data.filter(item => item.title).length,
            recordsWithContent: data.filter(item => item.content).length,
            uniqueUrls: new Set(data.map(item => item.url)).size,
            dateRange: {
                oldest: null,
                newest: null
            },
            avgContentLength: 0,
            commonWords: {}
        };

        if (data.length === 0) return stats;

        // Calcular range de datas
        const dates = data
            .map(item => new Date(item.timestamp))
            .filter(date => !isNaN(date));
        
        if (dates.length > 0) {
            stats.dateRange.oldest = new Date(Math.min(...dates));
            stats.dateRange.newest = new Date(Math.max(...dates));
        }

        // Calcular comprimento médio do conteúdo
        const contentLengths = data
            .filter(item => item.content)
            .map(item => item.content.length);
        
        if (contentLengths.length > 0) {
            stats.avgContentLength = Math.round(
                contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length
            );
        }

        // Palavras mais comuns
        const allText = data
            .map(item => (item.title + ' ' + item.content).toLowerCase())
            .join(' ');
        
        const words = allText
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !/\d/.test(word)); // Excluir palavras com números

        words.forEach(word => {
            stats.commonWords[word] = (stats.commonWords[word] || 0) + 1;
        });

        // Top 10 palavras mais comuns
        stats.topWords = Object.entries(stats.commonWords)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        delete stats.commonWords; // Remove para não poluir a saída

        return stats;
    }

    /**
     * Converte dados para diferentes formatos
     */
    static convertData(data, format) {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                return this.convertToCSV(data);
            
            case 'xml':
                return this.convertToXML(data);
            
            default:
                throw new Error(`Formato não suportado: ${format}`);
        }
    }

    /**
     * Converte array de objetos para CSV
     */
    static convertToCSV(data, delimiter = ',') {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(delimiter);
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                let value = row[header] || '';
                
                // Converter objetos para string
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                
                // Escapar valores que contêm o delimitador ou aspas
                if (value.toString().includes(delimiter) || value.toString().includes('"')) {
                    value = `"${value.toString().replace(/"/g, '""')}"`;
                }
                
                return value;
            }).join(delimiter);
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Converte array de objetos para XML
     */
    static convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
        
        data.forEach((item, index) => {
            xml += `  <record id="${index}">\n`;
            
            Object.entries(item).forEach(([key, value]) => {
                const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '_');
                const cleanValue = this.escapeXML(value);
                xml += `    <${cleanKey}>${cleanValue}</${cleanKey}>\n`;
            });
            
            xml += '  </record>\n';
        });
        
        xml += '</data>';
        return xml;
    }

    /**
     * Escapa caracteres especiais para XML
     */
    static escapeXML(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Salva dados com backup automático
     */
    static async saveWithBackup(data, filePath) {
        try {
            // Verificar se o arquivo já existe
            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            
            if (exists) {
                // Criar backup
                const backupPath = filePath.replace(/(\.[^.]+)$/, '.backup$1');
                await fs.copyFile(filePath, backupPath);
                console.log(`[BACKUP] Backup criado: ${backupPath}`);
            }
            
            // Salvar novo arquivo
            await fs.writeFile(filePath, data, 'utf8');
            console.log(`[SAVE] Arquivo salvo: ${filePath}`);
            
        } catch (error) {
            console.error(`[ERROR] Erro ao salvar arquivo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cria estrutura de diretórios se não existir
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`[DIR] Diretório criado: ${dirPath}`);
        }
    }

    /**
     * Gera nome de arquivo com timestamp
     */
    static generateFileName(prefix, extension, includeTimestamp = true) {
        const timestamp = includeTimestamp 
            ? new Date().toISOString().replace(/[:.]/g, '-')
            : '';
        
        const parts = [prefix, timestamp].filter(Boolean);
        return `${parts.join('-')}.${extension}`;
    }

    /**
     * Calcula hash de dados para detectar mudanças
     */
    static calculateHash(data) {
        const crypto = require('crypto');
        const string = JSON.stringify(data);
        return crypto.createHash('md5').update(string).digest('hex');
    }

    /**
     * Compara dois conjuntos de dados e encontra diferenças
     */
    static compareData(oldData, newData) {
        const oldUrls = new Set(oldData.map(item => item.url));
        const newUrls = new Set(newData.map(item => item.url));
        
        const added = newData.filter(item => !oldUrls.has(item.url));
        const removed = oldData.filter(item => !newUrls.has(item.url));
        const common = newData.filter(item => oldUrls.has(item.url));
        
        return {
            added: added.length,
            removed: removed.length,
            common: common.length,
            total: newData.length,
            changes: {
                addedItems: added,
                removedItems: removed
            }
        };
    }

    /**
     * Formata bytes em unidades legíveis
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Formata duração em milissegundos
     */
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

module.exports = HICDUtils;
