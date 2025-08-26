# API HICD - Sistema de Prontuário Eletrônico

API REST para acessar dados do sistema HICD (Sistema de Prontuário Eletrônico) de forma programática.

## 🚀 Início Rápido

### Instalação
```bash
npm install
```

### Iniciar a API
```bash
# Modo produção
npm run api

# Modo desenvolvimento (com auto-reload)
npm run api-dev
```

A API estará disponível em: `http://localhost:3000`

### Testar a API
```bash
# Executar exemplo de uso
node exemplo-api.js

# Verificar saúde da API
curl http://localhost:3000/api/health
```

## 📋 Endpoints Disponíveis

### Informações da API

#### GET `/`
Informações gerais da API e lista de endpoints
```bash
curl http://localhost:3000/
```

#### GET `/api/health`
Verificação de saúde da API
```bash
curl http://localhost:3000/api/health
```

#### GET `/api/docs`
Documentação completa da API
```bash
curl http://localhost:3000/api/docs
```

### Clínicas

#### GET `/api/clinicas`
Lista todas as clínicas disponíveis
```bash
curl http://localhost:3000/api/clinicas
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "015",
      "nome": "ENFERMARIA J",
      "codigo": "015",
      "totalPacientes": 0
    }
  ],
  "total": 1,
  "cache": {
    "lastUpdate": "2025-08-06T10:00:00.000Z",
    "nextUpdate": "2025-08-06T10:05:00.000Z"
  }
}
```

#### GET `/api/clinicas/search?nome=<nome>`
Busca clínicas por nome
```bash
curl "http://localhost:3000/api/clinicas/search?nome=ENFERMARIA"
```

#### GET `/api/clinicas/:id`
Obtém detalhes de uma clínica específica
```bash
curl http://localhost:3000/api/clinicas/015
```

#### GET `/api/clinicas/:id/pacientes`
Lista pacientes de uma clínica específica
```bash
curl http://localhost:3000/api/clinicas/ENFERMARIA%20J/pacientes
```

**Parâmetros opcionais:**
- `incluirDetalhes=true` - Inclui detalhes completos de cada paciente

```bash
curl "http://localhost:3000/api/clinicas/ENFERMARIA%20J/pacientes?incluirDetalhes=true"
```

#### GET `/api/clinicas/:id/stats`
Obtém estatísticas completas de uma clínica
```bash
curl http://localhost:3000/api/clinicas/ENFERMARIA%20J/stats
```

### Pacientes

#### GET `/api/pacientes/search?prontuario=<numero>`
Busca paciente por prontuário
```bash
curl "http://localhost:3000/api/pacientes/search?prontuario=40562"
```

#### GET `/api/pacientes/search-leito?leito=<numero>`
Busca paciente por leito
```bash
curl "http://localhost:3000/api/pacientes/search-leito?leito=0-015.015-0001"
```

#### GET `/api/pacientes/:prontuario`
Obtém detalhes completos de um paciente
```bash
curl http://localhost:3000/api/pacientes/40562
```

#### GET `/api/pacientes/:prontuario/evolucoes`
Lista evoluções médicas de um paciente
```bash
curl http://localhost:3000/api/pacientes/40562/evolucoes
```

**Parâmetros opcionais:**
- `limite=<numero>` - Limita o número de evoluções retornadas
- `formato=<tipo>` - Formato da resposta (`resumido`, `detalhado`)

```bash
curl "http://localhost:3000/api/pacientes/40562/evolucoes?limite=5&formato=resumido"
```

#### GET `/api/pacientes/:prontuario/analise`
Obtém análise clínica completa de um paciente
```bash
curl http://localhost:3000/api/pacientes/40562/analise
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações da API
PORT=3000
HOST=localhost

# Configurações do HICD (opcionais)
HICD_USERNAME=seu_usuario
HICD_PASSWORD=sua_senha

# Autenticação da API (opcional)
API_USERNAME=admin
API_PASSWORD=senha_secreta
```

### Rate Limiting

A API tem rate limiting padrão:
- **100 requisições por minuto** por IP
- Headers de resposta incluem informações sobre o limite

### Cache

- **Clínicas**: Cache de 5 minutos
- **Pacientes**: Sem cache (dados em tempo real)

## 📊 Formatos de Resposta

### Resposta de Sucesso
```json
{
  "success": true,
  "data": { ... },
  "total": 1,
  "timestamp": "2025-08-06T10:00:00.000Z"
}
```

### Resposta de Erro
```json
{
  "success": false,
  "error": "Tipo do erro",
  "message": "Descrição detalhada do erro",
  "timestamp": "2025-08-06T10:00:00.000Z"
}
```

### Códigos de Status HTTP

- `200` - Sucesso
- `400` - Erro de parâmetros/validação
- `401` - Não autorizado
- `404` - Recurso não encontrado
- `429` - Limite de requisições excedido
- `500` - Erro interno do servidor

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
api/
├── controllers/          # Lógica de negócio
│   ├── clinicas.js      # Controller de clínicas
│   └── pacientes.js     # Controller de pacientes
├── routes/              # Definição das rotas
│   ├── clinicas.js      # Rotas de clínicas
│   └── pacientes.js     # Rotas de pacientes
├── middleware/          # Middlewares personalizados
│   └── auth.js          # Autenticação e rate limiting
└── server.js            # Configuração do servidor Express
```

### Scripts Disponíveis
```bash
# Iniciar API em produção
npm run api

# Iniciar API em desenvolvimento
npm run api-dev

# Executar exemplo de uso
node exemplo-api.js

# Outras funcionalidades do crawler
npm run clinicas        # Listar clínicas via terminal
npm run examples        # Executar exemplos do crawler
```

### Adicionando Novos Endpoints

1. **Controller**: Adicione a lógica em `api/controllers/`
2. **Rota**: Defina a rota em `api/routes/`
3. **Teste**: Teste o endpoint com curl ou exemplo

### Logs

A API registra automaticamente:
- Todas as requisições HTTP
- Erros e exceções
- Status de autenticação
- Estatísticas de rate limiting

## 🔒 Segurança

### Recomendações para Produção

1. **HTTPS**: Configure SSL/TLS
2. **Autenticação**: Implemente JWT ou Basic Auth
3. **Rate Limiting**: Ajuste limites conforme necessário
4. **CORS**: Configure origens permitidas
5. **Logs**: Configure logging para arquivos
6. **Monitoramento**: Implemente health checks

### Exemplo de Configuração de Produção

```javascript
// Para habilitar autenticação básica
const { basicAuth } = require('./api/middleware/auth');
app.use('/api', basicAuth);
```

## 📚 Exemplos de Uso

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Listar clínicas
const clinicas = await api.get('/clinicas');
console.log(clinicas.data);

// Buscar paciente
const paciente = await api.get('/pacientes/40562');
console.log(paciente.data);
```

### Python
```python
import requests

base_url = 'http://localhost:3000/api'

# Listar clínicas
response = requests.get(f'{base_url}/clinicas')
clinicas = response.json()

# Buscar paciente
response = requests.get(f'{base_url}/pacientes/40562')
paciente = response.json()
```

### curl
```bash
# Buscar todas as clínicas
curl -X GET http://localhost:3000/api/clinicas

# Buscar pacientes de uma clínica
curl -X GET "http://localhost:3000/api/clinicas/ENFERMARIA%20J/pacientes"

# Obter análise de um paciente
curl -X GET http://localhost:3000/api/pacientes/40562/analise
```

## 🐛 Solução de Problemas

### API não inicia
```bash
# Verificar dependências
npm install

# Verificar porta
netstat -tlnp | grep :3000

# Verificar logs
npm run api 2>&1 | tee api.log
```

### Erro de autenticação HICD
- Verifique as credenciais em `.env` ou `config.js`
- Execute `npm run check` para validar configuração

### Timeout em requisições
- Aumente o timeout no cliente HTTP
- Verifique a performance do sistema HICD

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs da API
2. Execute `node exemplo-api.js` para teste
3. Consulte a documentação em `/api/docs`

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.
