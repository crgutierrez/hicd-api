# Stack Tecnológica

## Backend / Crawler

| Tecnologia | Versão | Uso |
|---|---|---|
| **Node.js** | >= 14.0.0 | Runtime principal |
| **Axios** | ^1.6.0 | HTTP client; mantém cookies de sessão do HICD |
| **Cheerio** | ^1.1.2 | Parsing de HTML (jQuery-like, server-side) |
| **Express** | ^4.18.2 | Framework da REST API |
| **Helmet** | ^8.1.0 | Headers de segurança HTTP |
| **Morgan** | ^1.10.1 | Logging de requisições HTTP |
| **cors** | ^2.8.5 | CORS para o frontend Angular |
| **dotenv** | ^16.3.1 | Variáveis de ambiente |
| **swagger-jsdoc** | ^6.2.8 | Geração de spec OpenAPI |
| **swagger-ui-express** | ^5.0.1 | UI de documentação da API |
| **crypto** (nativo) | Node built-in | AES-256-GCM para tokens de auth |

## Dev

| Tecnologia | Uso |
|---|---|
| **nodemon** ^3.0.1 | Auto-reload em desenvolvimento |

## Frontend (WIP)

| Tecnologia | Notas |
|---|---|
| **Angular** | SPA em `hicd-frontend/` |
| **PrimeNG** | Componentes de UI |

## Sem banco de dados

O projeto não usa banco de dados próprio. Todo estado é efêmero (cache in-memory) ou vem do servidor HICD externo.
