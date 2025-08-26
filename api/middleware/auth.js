// Middleware para autenticação básica (opcional)
const basicAuth = (req, res, next) => {
    // Por enquanto, deixaremos sem autenticação
    // Em produção, você pode implementar JWT ou Basic Auth aqui
    
    const authHeader = req.headers.authorization;
    
    // Se não há header de autorização, prosseguir sem autenticação
    if (!authHeader) {
        console.log('Acesso sem autenticação - permitido em desenvolvimento');
        return next();
    }
    
    // Implementar autenticação básica se necessário
    try {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
        const username = credentials[0];
        const password = credentials[1];
        
        // Verificar credenciais (implementar conforme necessário)
        if (username === process.env.API_USERNAME && password === process.env.API_PASSWORD) {
            req.user = { username };
            next();
        } else {
            res.status(401).json({
                success: false,
                error: 'Não autorizado',
                message: 'Credenciais inválidas'
            });
        }
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Não autorizado',
            message: 'Header de autorização inválido'
        });
    }
};

// Middleware para rate limiting básico
const rateLimit = () => {
    const requests = new Map();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 100; // máximo 100 requests por minuto
    
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }
        
        const clientRequests = requests.get(clientId);
        
        // Remover requests antigas
        const validRequests = clientRequests.filter(timestamp => now - timestamp < windowMs);
        
        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Muitas requisições',
                message: `Limite de ${maxRequests} requisições por minuto excedido`,
                retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
            });
        }
        
        validRequests.push(now);
        requests.set(clientId, validRequests);
        
        // Limpar cache de requests antigos periodicamente
        if (Math.random() < 0.01) {
            for (const [id, reqs] of requests.entries()) {
                const validReqs = reqs.filter(timestamp => now - timestamp < windowMs);
                if (validReqs.length === 0) {
                    requests.delete(id);
                } else {
                    requests.set(id, validReqs);
                }
            }
        }
        
        next();
    };
};

// Middleware para logging de requisições
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        };
        
        console.log(`[API] ${logData.method} ${logData.url} - ${logData.statusCode} - ${logData.duration}`);
    });
    
    next();
};

// Middleware para validação de headers
const validateHeaders = (req, res, next) => {
    // Verificar Content-Type para requests POST/PUT
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({
                success: false,
                error: 'Header inválido',
                message: 'Content-Type deve ser application/json'
            });
        }
    }
    
    next();
};

module.exports = {
    basicAuth,
    rateLimit,
    requestLogger,
    validateHeaders
};
