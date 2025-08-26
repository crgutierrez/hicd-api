/**
 * Service Worker para HICD System PWA
 * Versão: 1.0.0
 */

const CACHE_NAME = 'hicd-system-v1.0.0';
const STATIC_CACHE = 'hicd-static-v1.0.0';
const DYNAMIC_CACHE = 'hicd-dynamic-v1.0.0';

// Arquivos para cache estático
const STATIC_FILES = [
    '/frontend/',
    '/frontend/index.html',
    '/frontend/css/style.css',
    '/frontend/js/app.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// URLs da API para cache dinâmico
const API_ENDPOINTS = [
    '/api/health',
    '/api/clinicas',
    '/api/pacientes'
];

// Estratégias de cache
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    CACHE_ONLY: 'cache-only',
    NETWORK_ONLY: 'network-only',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activation complete');
                return self.clients.claim();
            })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não-GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorar requisições de extensões do browser
    if (request.url.startsWith('chrome-extension://') || 
        request.url.startsWith('moz-extension://')) {
        return;
    }
    
    // Estratégias baseadas no tipo de recurso
    if (isStaticAsset(request.url)) {
        event.respondWith(cacheFirstStrategy(request));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(networkFirstStrategy(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(networkFirstWithFallback(request));
    } else {
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

// Estratégia Cache First (para recursos estáticos)
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache First Strategy failed:', error);
        return new Response('Offline - Resource not available', { 
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Estratégia Network First (para dados da API)
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error.message);
        
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return createOfflineResponse(request);
    }
}

// Estratégia Network First com fallback para navegação
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.log('Navigation request failed, serving cached index');
        
        const cachedResponse = await caches.match('/frontend/index.html');
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return createOfflinePage();
    }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Buscar atualização em background
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch((error) => {
        console.error('Background fetch failed:', error);
    });
    
    // Retornar cache imediatamente se disponível, senão aguardar rede
    return cachedResponse || fetchPromise;
}

// Verificar se é um recurso estático
function isStaticAsset(url) {
    return url.includes('.css') || 
           url.includes('.js') || 
           url.includes('.woff') || 
           url.includes('.woff2') || 
           url.includes('.ttf') || 
           url.includes('.png') || 
           url.includes('.jpg') || 
           url.includes('.jpeg') || 
           url.includes('.gif') || 
           url.includes('.svg') ||
           url.includes('.ico');
}

// Verificar se é uma requisição da API
function isAPIRequest(url) {
    return url.includes('/api/');
}

// Verificar se é uma requisição de navegação
function isNavigationRequest(request) {
    return request.mode === 'navigate' || 
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Criar resposta offline para dados
function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    if (url.pathname.includes('/api/clinicas')) {
        return new Response(JSON.stringify({
            message: 'Dados offline não disponíveis',
            offline: true,
            data: []
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (url.pathname.includes('/api/pacientes')) {
        return new Response(JSON.stringify({
            message: 'Dados offline não disponíveis',
            offline: true,
            data: [],
            pacientes: []
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(JSON.stringify({
        error: 'Offline - Dados não disponíveis',
        offline: true
    }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Criar página offline
function createOfflinePage() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HICD System - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                }
                .offline-container {
                    max-width: 400px;
                    padding: 2rem;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    margin-bottom: 1rem;
                    font-size: 2rem;
                }
                p {
                    margin-bottom: 2rem;
                    opacity: 0.9;
                    line-height: 1.6;
                }
                .retry-btn {
                    background: rgba(255,255,255,0.2);
                    border: 2px solid white;
                    color: white;
                    padding: 0.75rem 2rem;
                    border-radius: 50px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                }
                .retry-btn:hover {
                    background: white;
                    color: #667eea;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📡</div>
                <h1>Você está offline</h1>
                <p>Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.</p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Tentar Novamente
                </button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
    });
}

// Sincronização em background
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered');
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Executar sincronização em background
async function doBackgroundSync() {
    try {
        // Implementar lógica de sincronização
        console.log('Service Worker: Performing background sync');
        
        // Exemplo: sincronizar dados pendentes
        await syncPendingData();
        
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Sincronizar dados pendentes
async function syncPendingData() {
    // Implementar sincronização de dados offline quando necessário
    console.log('Service Worker: Syncing pending data');
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    let notificationData = {
        title: 'HICD System',
        body: 'Nova notificação disponível',
        icon: '/frontend/icons/icon-192x192.png',
        badge: '/frontend/icons/icon-72x72.png',
        tag: 'hicd-notification',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'Ver',
                icon: '/frontend/icons/icon-72x72.png'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ]
    };
    
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = { ...notificationData, ...payload };
        } catch (error) {
            console.error('Error parsing push payload:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/frontend/')
        );
    }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_CLEAR') {
        event.waitUntil(clearCaches());
    }
});

// Limpar caches
async function clearCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Service Worker: All caches cleared');
    } catch (error) {
        console.error('Service Worker: Error clearing caches', error);
    }
}

// Logs de depuração
console.log('Service Worker: Script loaded');
